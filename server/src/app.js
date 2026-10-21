import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import { db, getSettings, uniqueId } from './db.js';
import { cookieName, cookieOptions, requireAdmin, setSession } from './auth.js';
import { dataDir, portalUrl, production, projectRoot } from './config.js';
import { decodeCsv, csvSafe } from './csv.js';
import { createCertificatePdf, uploadedToPdf } from './pdf.js';
import { generateCertificatePdf } from './certificateGenerator.js';
import { trim, validatePesilat, validDate } from './validation.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', production ? 1 : false);
app.use(helmet({contentSecurityPolicy: production ? undefined : false}));
app.use(express.json({limit:'100kb'}));
app.use(cookieParser());
// Mutating requests from a web page must originate from our own frontend.
app.use('/api', (req,res,next)=>{
 if (['POST','PUT','PATCH','DELETE'].includes(req.method) && req.get('origin')) {
  const allowed = new Set([portalUrl, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4000', 'http://127.0.0.1:4000']);
  if (!allowed.has(req.get('origin'))) return res.status(403).json({error:'Origin tidak dibenarkan.'});
 }
 next();
});
const authLimit = rateLimit({windowMs:15*60*1000,limit:12,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Terlalu banyak percubaan. Cuba semula dalam 15 minit.'}});
const searchLimit = rateLimit({windowMs:60*1000,limit:35,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Terlalu banyak carian. Cuba semula sebentar lagi.'}});
const upload = multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:1}});
const today = () => new Date().toISOString().slice(0,10);
const fail = (res,message,status=400) => res.status(status).json({error:message});
const cleanId = v => Number.isSafeInteger(Number(v)) && Number(v) > 0 ? Number(v) : null;

app.get('/api/health', (_req,res)=>res.json({status:'ok',service:'ProSijil'}));
app.post('/api/auth/login',authLimit,async(req,res)=>{
 const username=trim(req.body?.username,80), password=String(req.body?.password??'');
 const admin = db.prepare('SELECT * FROM admin_users WHERE username=?').get(username);
 if (!admin || !bcrypt.compareSync(password,admin.password_hash)) return fail(res,'Username atau kata laluan tidak betul.',401);
 setSession(res,admin);
 return res.json({user:{id:admin.id,username:admin.username}});
});
app.get('/api/auth/me',requireAdmin,(req,res)=>res.json({user:req.admin}));
app.post('/api/auth/logout',(_req,res)=>{res.clearCookie(cookieName,{...cookieOptions,maxAge:undefined});res.json({success:true});});
app.post('/api/auth/password',requireAdmin,(req,res)=>{
 const current=String(req.body.current_password??''), next=String(req.body.new_password??'');
 const admin=db.prepare('SELECT password_hash FROM admin_users WHERE id=?').get(req.admin.id);
 if (!bcrypt.compareSync(current,admin.password_hash)) return fail(res,'Kata laluan semasa tidak tepat.',403);
 if (next.length < 12 || next.length > 128) return fail(res,'Kata laluan baharu mestilah 12–128 aksara.');
 db.prepare('UPDATE admin_users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(next,12),req.admin.id);
 res.clearCookie(cookieName,{...cookieOptions,maxAge:undefined});return res.json({success:true});
});

app.get('/api/public/stats',(_req,res)=>{
 const total=db.prepare('SELECT count(*) AS n FROM sijil').get().n;
 res.json({certificates:total});
});
app.get('/api/public/search',searchLimit,(req,res)=>{
 const q=trim(req.query.q,160).replace(/\s+/g,' ');
 if (q.length < 3) return fail(res,'Masukkan nama penuh atau ID (minima 3 aksara).');
 // Exact match prevents automated partial-name lookups of minors.
 const records=db.prepare('SELECT id,nama_penuh,no_kp_atau_id,peringkat,cawangan,tarikh_daftar FROM pesilat WHERE nama_penuh=? COLLATE NOCASE OR no_kp_atau_id=? COLLATE NOCASE LIMIT 15').all(q,q);
 const result=records.map(student=>{
   const certificates=db.prepare('SELECT id,nama_sijil,tarikh_isu,public_token FROM sijil WHERE pesilat_id=? ORDER BY tarikh_isu DESC,id DESC').all(student.id);
   return {id:student.id,nama_penuh:student.nama_penuh,no_kp_atau_id:student.no_kp_atau_id,tarikh_daftar:student.tarikh_daftar,peringkat:student.peringkat,cawangan:student.cawangan,certificates};
 });
 res.setHeader('Cache-Control','no-store');
 res.json({results:result});
});
function readCertificate(token) {
 const certificate=db.prepare(`SELECT s.*,p.nama_penuh,p.no_kp_atau_id,p.peringkat,p.cawangan,p.tarikh_daftar FROM sijil s JOIN pesilat p ON p.id=s.pesilat_id WHERE s.public_token=?`).get(token);
 return certificate;
}
app.get('/api/public/verify/:token',searchLimit,(req,res)=>{
 const row=readCertificate(req.params.token);
 if(!row)return fail(res,'Sijil tidak ditemui atau tidak lagi sah.',404);
 return res.json({valid:true,certificate:{id:row.id,nama_sijil:row.nama_sijil,tarikh_isu:row.tarikh_isu,nama_penuh:row.nama_penuh,no_kp_atau_id:row.no_kp_atau_id,peringkat:row.peringkat,cawangan:row.cawangan,tarikh_daftar:row.tarikh_daftar}});
});
app.get('/api/public/certificates/:token/download',searchLimit,(req,res,next)=>{
 try {
 const row=readCertificate(req.params.token);
 if(!row)return fail(res,'Sijil tidak ditemui.',404);
 const student={nama_penuh:row.nama_penuh,peringkat:row.peringkat,cawangan:row.cawangan};
 if(row.jenis==='generated')return createCertificatePdf(res,student,row,getSettings(),req.query.preview!=='1');
 if(!row.file_path || !fs.existsSync(row.file_path))return fail(res,'Fail sijil tidak tersedia.',404);
 return uploadedToPdf(res,row,student,req.query.preview!=='1');
 }catch(e){next(e);}
});

app.get('/api/admin/dashboard',requireAdmin,(_req,res)=>{
 const pesilat=db.prepare('SELECT count(*) AS n FROM pesilat').get().n;
 const sijil=db.prepare('SELECT count(*) AS n FROM sijil').get().n;
 const branches=db.prepare('SELECT count(DISTINCT cawangan) AS n FROM pesilat').get().n;
 const byLevel=db.prepare('SELECT peringkat as name,count(*) as total FROM pesilat GROUP BY peringkat ORDER BY total DESC LIMIT 7').all();
 const byBranch=db.prepare('SELECT cawangan as name,count(*) as total FROM pesilat GROUP BY cawangan ORDER BY total DESC LIMIT 6').all();
 const recent=db.prepare('SELECT s.id,s.nama_sijil,s.tarikh_isu,p.nama_penuh,p.cawangan FROM sijil s JOIN pesilat p ON s.pesilat_id=p.id ORDER BY s.id DESC LIMIT 6').all();
 res.json({pesilat,sijil,branches,byLevel,byBranch,recent});
});
app.get('/api/admin/students',requireAdmin,(req,res)=>{
 const q=trim(req.query.q,160),branch=trim(req.query.branch,160),level=trim(req.query.level,90);
 const page=Math.max(1,Math.min(9999,Number(req.query.page)||1));
 const limit=Math.max(1,Math.min(10000,Number(req.query.limit)||20));
 const where=[];const p=[];
 if(q){where.push('(p.nama_penuh LIKE ? OR p.no_kp_atau_id LIKE ?)');p.push(`%${q}%`,`%${q}%`);}
 if(branch){where.push('p.cawangan=?');p.push(branch);}
 if(level){
  const cleanLevel=level.replace(/^ujian\s+/i,'');
  where.push('(p.peringkat=? OR p.peringkat=? OR p.peringkat=? COLLATE NOCASE)');
  p.push(level,cleanLevel,'Ujian '+cleanLevel);
 }
 const w=where.length?' WHERE '+where.join(' AND '):'';
 const total=db.prepare('SELECT count(*) as n FROM pesilat p'+w).get(...p).n;
 const rows=db.prepare('SELECT p.*,(SELECT count(*) FROM sijil s WHERE s.pesilat_id=p.id) as sijil_count FROM pesilat p'+w+' ORDER BY p.id DESC LIMIT ? OFFSET ?').all(...p,limit,(page-1)*limit);
 const levels=db.prepare('SELECT DISTINCT peringkat FROM pesilat ORDER BY peringkat').all().map(x=>x.peringkat);
 const branches=db.prepare('SELECT DISTINCT cawangan FROM pesilat ORDER BY cawangan').all().map(x=>x.cawangan);
 res.json({rows,total,page,pages:Math.max(1,Math.ceil(total/limit)),levels,branches});
});
app.post('/api/admin/students',requireAdmin,(req,res)=>{
 try{
 const values=validatePesilat(req.body||{});
 values.no_kp_atau_id=values.no_kp_atau_id||uniqueId();
 const result=db.prepare('INSERT INTO pesilat (nama_penuh,no_kp_atau_id,peringkat,cawangan,tarikh_daftar) VALUES (@nama_penuh,@no_kp_atau_id,@peringkat,@cawangan,@tarikh_daftar)').run(values);
 res.status(201).json({id:Number(result.lastInsertRowid),...values});
 }catch(e){return fail(res,e.message.includes('UNIQUE')?'Nombor KP/ID sudah digunakan.':e.message);}
});
app.put('/api/admin/students/:id',requireAdmin,(req,res)=>{
 const id=cleanId(req.params.id);if(!id)return fail(res,'ID pesilat tidak sah.');
 const before=db.prepare('SELECT * FROM pesilat WHERE id=?').get(id);if(!before)return fail(res,'Pesilat tidak ditemui.',404);
 try{
 const values=validatePesilat({...before,...req.body});
 values.no_kp_atau_id=values.no_kp_atau_id||before.no_kp_atau_id;
 db.prepare('UPDATE pesilat SET nama_penuh=@nama_penuh,no_kp_atau_id=@no_kp_atau_id,peringkat=@peringkat,cawangan=@cawangan,tarikh_daftar=@tarikh_daftar,updated_at=datetime(\'now\') WHERE id=@id').run({...values,id});
 res.json({id,...values});
 }catch(e){return fail(res,e.message.includes('UNIQUE')?'Nombor KP/ID sudah digunakan.':e.message);}
});
app.delete('/api/admin/students/:id',requireAdmin,(req,res)=>{
 const id=cleanId(req.params.id);if(!id)return fail(res,'ID tidak sah.');
 const certs=db.prepare('SELECT file_path FROM sijil WHERE pesilat_id=?').all(id);
 const result=db.prepare('DELETE FROM pesilat WHERE id=?').run(id);
 if(!result.changes)return fail(res,'Pesilat tidak ditemui.',404);
 for(const c of certs) if(c.file_path)fs.rmSync(c.file_path,{force:true});
 res.json({success:true});
});
app.get('/api/admin/students/:id/certificates',requireAdmin,(req,res)=>{
 const id=cleanId(req.params.id);if(!id)return fail(res,'ID pesilat tidak sah.');
 const student=db.prepare('SELECT id,nama_penuh,no_kp_atau_id,peringkat,cawangan,tarikh_daftar FROM pesilat WHERE id=?').get(id);
 if(!student)return fail(res,'Pesilat tidak ditemui.',404);
 const rows=db.prepare('SELECT id,pesilat_id,nama_sijil,tarikh_isu,jenis,file_type,public_token,created_at FROM sijil WHERE pesilat_id=? ORDER BY tarikh_isu DESC,id DESC').all(id);
 res.json({student,certificates:rows});
});
app.get('/api/admin/students/export',requireAdmin,(_req,res)=>{
 const rows=db.prepare('SELECT nama_penuh,no_kp_atau_id,peringkat,cawangan,tarikh_daftar FROM pesilat ORDER BY cawangan,nama_penuh').all();
 const cols=['nama_penuh','no_kp_atau_id','peringkat','cawangan','tarikh_daftar'];
 const csv='\uFEFF'+cols.join(',')+'\r\n'+rows.map(r=>cols.map(k=>csvSafe(r[k])).join(',')).join('\r\n');
 res.setHeader('Content-Disposition','attachment; filename="prosijil-pesilat.csv"');res.type('text/csv; charset=utf-8').send(csv);
});
app.post('/api/admin/students/import',requireAdmin,upload.single('file'),(req,res)=>{
 if(!req.file)return fail(res,'Sila pilih fail CSV.');
 if(!req.file.originalname.toLowerCase().endsWith('.csv'))return fail(res,'Format fail mestilah .csv.');
 try{
 const rows=decodeCsv(req.file.buffer);
 let inserted=0,skipped=0;const errors=[];
 const ins=db.prepare('INSERT INTO pesilat (nama_penuh,no_kp_atau_id,peringkat,cawangan,tarikh_daftar) VALUES (?,?,?,?,?)');
 const findById=db.prepare('SELECT 1 FROM pesilat WHERE no_kp_atau_id=? COLLATE NOCASE');
 const findByName=db.prepare('SELECT 1 FROM pesilat WHERE nama_penuh=? COLLATE NOCASE AND cawangan=? COLLATE NOCASE');
 db.exec('BEGIN');
 try{
  for(const row of rows){
   if(row.nama_penuh.length<2){errors.push(`Baris ${row.baris}: Nama tidak sah`);skipped++;continue;}
   if(row.no_kp_atau_id?findById.get(row.no_kp_atau_id):findByName.get(row.nama_penuh,row.cawangan)) {skipped++;continue;}
   try{ins.run(row.nama_penuh,row.no_kp_atau_id||uniqueId(),row.peringkat,row.cawangan,row.tarikh_daftar||today());inserted++;}
   catch(e){errors.push(`Baris ${row.baris}: ${e.message.includes('UNIQUE')?'ID bertindih':'Tidak dapat dimasukkan'}`);skipped++;}
  }
  db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e;}
 res.json({total:rows.length,inserted,skipped,errors:errors.slice(0,25)});
 }catch(e){return fail(res,e.message);}
});

app.get('/api/admin/certificates',requireAdmin,(req,res)=>{
 const q=trim(req.query.q,160);
 const page=Math.max(1,Number(req.query.page)||1),limit=20;
 const filter=q?' WHERE (p.nama_penuh LIKE ? OR s.nama_sijil LIKE ? OR p.cawangan LIKE ?)':'';
 const params=q?[`%${q}%`,`%${q}%`,`%${q}%`]:[];
 const from=' FROM sijil s JOIN pesilat p ON p.id=s.pesilat_id';
 const total=db.prepare('SELECT count(*) AS n'+from+filter).get(...params).n;
 const rows=db.prepare('SELECT s.*,p.nama_penuh,p.peringkat,p.cawangan'+from+filter+' ORDER BY s.id DESC LIMIT ? OFFSET ?').all(...params,limit,(page-1)*limit).map(r=>({...r,file_path:undefined}));
 res.json({rows,total,page,pages:Math.max(1,Math.ceil(total/limit))});
});
app.post('/api/admin/certificates',requireAdmin,upload.single('file'),(req,res)=>{
 const id=cleanId(req.body?.pesilat_id);
 if(!id)return fail(res,'Sila pilih pesilat.');
 const student=db.prepare('SELECT id FROM pesilat WHERE id=?').get(id);
 if(!student)return fail(res,'Pesilat tidak ditemui.',404);
 const title=trim(req.body?.nama_sijil,130),tarikh=trim(req.body?.tarikh_isu,10)||today();
 if(title.length<3)return fail(res,'Nama sijil perlu sekurang-kurangnya 3 aksara.');
 if(!validDate(tarikh))return fail(res,'Tarikh sijil tidak sah.');
 let jenis='generated',file_path=null,file_type=null;
 if(req.file){
  const bytes=req.file.buffer;
  if(bytes.subarray(0,5).toString('ascii')==='%PDF-')file_type='application/pdf';
  else if(bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')))file_type='image/png';
  else if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)file_type='image/jpeg';
  else return fail(res,'Hanya fail PDF, PNG atau JPG yang sah diterima.');
  jenis='uploaded';
  file_path=path.join(dataDir,'uploads',crypto.randomUUID()+({'application/pdf':'.pdf','image/png':'.png','image/jpeg':'.jpg'}[file_type]));
  fs.writeFileSync(file_path,bytes,{flag:'wx'});
 }
 try{
 const token=crypto.randomUUID();
 const result=db.prepare('INSERT INTO sijil (pesilat_id,nama_sijil,tarikh_isu,jenis,file_path,file_type,public_token) VALUES (?,?,?,?,?,?,?)').run(id,title,tarikh,jenis,file_path,file_type,token);
 return res.status(201).json({id:Number(result.lastInsertRowid),public_token:token});
 }catch(e){if(file_path)fs.rmSync(file_path,{force:true});throw e;}
});
app.put('/api/admin/certificates/:id',requireAdmin,upload.single('file'),(req,res)=>{
 const id=cleanId(req.params.id);if(!id)return fail(res,'ID tidak sah.');
 const current=db.prepare('SELECT * FROM sijil WHERE id=?').get(id);
 if(!current)return fail(res,'Sijil tidak ditemui.',404);
 const title=trim(req.body?.nama_sijil,130)||current.nama_sijil;
 const tarikh=trim(req.body?.tarikh_isu,10)||current.tarikh_isu;
 if(title.length<3)return fail(res,'Nama sijil perlu sekurang-kurangnya 3 aksara.');
 if(!validDate(tarikh))return fail(res,'Tarikh sijil tidak sah.');
 let file_path=current.file_path;
 let file_type=current.file_type;
 let jenis=current.jenis;
 if(req.file){
  const bytes=req.file.buffer;
  if(bytes.subarray(0,5).toString('ascii')==='%PDF-')file_type='application/pdf';
  else if(bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')))file_type='image/png';
  else if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)file_type='image/jpeg';
  else return fail(res,'Hanya fail PDF, PNG atau JPG yang sah diterima.');
  jenis='uploaded';
  const newPath=path.join(dataDir,'uploads',crypto.randomUUID()+({'application/pdf':'.pdf','image/png':'.png','image/jpeg':'.jpg'}[file_type]));
  fs.writeFileSync(newPath,bytes,{flag:'wx'});
  if(current.file_path&&fs.existsSync(current.file_path)){
   fs.rmSync(current.file_path,{force:true});
  }
  file_path=newPath;
 }
 db.prepare('UPDATE sijil SET nama_sijil=?,tarikh_isu=?,jenis=?,file_path=?,file_type=? WHERE id=?')
   .run(title,tarikh,jenis,file_path,file_type,id);
 res.json({id,nama_sijil:title,tarikh_isu:tarikh,jenis,public_token:current.public_token});
});
app.delete('/api/admin/certificates/:id',requireAdmin,(req,res)=>{
 const id=cleanId(req.params.id);if(!id)return fail(res,'ID tidak sah.');
 const row=db.prepare('SELECT file_path FROM sijil WHERE id=?').get(id);if(!row)return fail(res,'Sijil tidak ditemui.',404);
 db.prepare('DELETE FROM sijil WHERE id=?').run(id);
 if(row.file_path)fs.rmSync(row.file_path,{force:true});
 return res.json({success:true});
});

app.get('/api/admin/templates',requireAdmin,(_req,res)=>{
 const rows=db.prepare('SELECT id,nama_template,peringkat,keterangan,file_name,file_size,created_at FROM template_sijil ORDER BY id DESC').all();
 res.json({rows});
});

app.post('/api/admin/templates',requireAdmin,upload.single('file'),(req,res)=>{
 if(!req.file)return fail(res,'Sila muat naik fail templat PDF.');
 const bytes=req.file.buffer;
 if(bytes.subarray(0,5).toString('ascii')!=='%PDF-')return fail(res,'Fail mestilah dalam format PDF.');
 const nama=trim(req.body?.nama_template,160);
 const peringkat=trim(req.body?.peringkat,100);
 const keterangan=trim(req.body?.keterangan,250);
 if(nama.length<3)return fail(res,'Nama templat perlu sekurang-kurangnya 3 aksara.');
 if(!peringkat)return fail(res,'Sila pilih atau masukkan peringkat pesilat untuk templat ini.');
 const file_name=req.file.originalname||'template.pdf';
 const file_path=path.join(dataDir,'templates',crypto.randomUUID()+'.pdf');
 fs.writeFileSync(file_path,bytes,{flag:'wx'});
 try{
  const result=db.prepare('INSERT INTO template_sijil (nama_template,peringkat,keterangan,file_path,file_name,file_size) VALUES (?,?,?,?,?,?)').run(nama,peringkat,keterangan,file_path,file_name,bytes.length);
  return res.status(201).json({id:Number(result.lastInsertRowid),nama_template:nama,peringkat,file_name});
 }catch(e){
  fs.rmSync(file_path,{force:true});
  throw e;
 }
});

app.delete('/api/admin/templates/:id',requireAdmin,(req,res)=>{
 const id=cleanId(req.params.id);if(!id)return fail(res,'ID tidak sah.');
 const row=db.prepare('SELECT file_path FROM template_sijil WHERE id=?').get(id);
 if(!row)return fail(res,'Templat tidak ditemui.',404);
 db.prepare('DELETE FROM template_sijil WHERE id=?').run(id);
 if(row.file_path)fs.rmSync(row.file_path,{force:true});
 return res.json({success:true});
});

app.get('/api/admin/templates/:id/preview',requireAdmin,(req,res)=>{
 const id=cleanId(req.params.id);if(!id)return fail(res,'ID tidak sah.');
 const row=db.prepare('SELECT file_path,file_name FROM template_sijil WHERE id=?').get(id);
 if(!row||!fs.existsSync(row.file_path))return fail(res,'Fail templat tidak ditemui.',404);
 res.type('application/pdf');
 res.setHeader('Content-Disposition',`inline; filename="${encodeURIComponent(row.file_name)}"`);
 res.setHeader('Cache-Control','private, no-store');
 return fs.createReadStream(row.file_path).pipe(res);
});

app.get('/api/admin/templates/groups',requireAdmin,(_req,res)=>{
 const rows=db.prepare('SELECT id,nama_template,peringkat,file_name FROM template_sijil ORDER BY nama_template,peringkat').all();
 const groups={};
 for(const r of rows){
  if(!groups[r.nama_template])groups[r.nama_template]=[];
  groups[r.nama_template].push(r);
 }
 res.json({groups,templates:rows});
});

app.post('/api/admin/templates/test-preview',requireAdmin,async(req,res,next)=>{
 try{
  const templateId=cleanId(req.body?.template_id);
  const studentName=trim(req.body?.student_name,120)||'NUR AISYAH BINTI ABDULLAH';
  if(!templateId)return fail(res,'Sila pilih templat.');
  const row=db.prepare('SELECT file_path FROM template_sijil WHERE id=?').get(templateId);
  if(!row||!fs.existsSync(row.file_path))return fail(res,'Fail templat tidak wujud.',404);
  const result=await generateCertificatePdf({templatePath:row.file_path,studentName});
  res.type('application/pdf');
  res.setHeader('Content-Disposition','inline; filename="preview-ujian.pdf"');
  res.setHeader('Cache-Control','private, no-store');
  return res.send(Buffer.from(result.bytes));
 }catch(e){next(e);}
});

app.post('/api/admin/templates/generate-batch',requireAdmin,async(req,res,next)=>{
 try{
  const ids=Array.isArray(req.body?.pesilat_ids)?req.body.pesilat_ids.map(cleanId).filter(Boolean):[];
  if(!ids.length)return fail(res,'Sila pilih sekurang-kurangnya seorang pesilat.');
  const namaTemplate=trim(req.body?.nama_template,160);
  if(!namaTemplate)return fail(res,'Sila pilih atau masukkan nama templat sijil.');
  const tarikh=trim(req.body?.tarikh_isu,10)||today();
  if(!validDate(tarikh))return fail(res,'Tarikh sijil tidak sah.');

  const templates=db.prepare('SELECT * FROM template_sijil WHERE nama_template=?').all(namaTemplate);
  if(!templates.length)return fail(res,'Tiada templat dijumpai untuk tajuk sijil ini.');

  const placeholders=ids.map(()=>'?').join(',');
  const students=db.prepare(`SELECT * FROM pesilat WHERE id IN (${placeholders})`).all(...ids);

  let successCount=0;
  const failed=[];
  const generatedTokens=[];
  const templateCache=new Map();
  const toInsert=[];

  const norm = s => String(s || '').trim().toLowerCase().replace(/^ujian\s+/i, '').replace(/\s+/g, ' ');

  for(const student of students){
   let matchedTemplate=templates.find(t=>norm(t.peringkat)===norm(student.peringkat) || t.peringkat.trim().toLowerCase()===student.peringkat.trim().toLowerCase());
   if(!matchedTemplate){
    matchedTemplate=templates.find(t=>t.peringkat.trim().toLowerCase()==='semua peringkat');
   }

   if(!matchedTemplate||!fs.existsSync(matchedTemplate.file_path)){
    failed.push({id:student.id,nama:student.nama_penuh,peringkat:student.peringkat,reason:`Tiada templat PDF untuk peringkat "${student.peringkat}"`});
    continue;
   }

   try{
    let tplBytes=templateCache.get(matchedTemplate.file_path);
    if(!tplBytes){
     tplBytes=fs.readFileSync(matchedTemplate.file_path);
     templateCache.set(matchedTemplate.file_path,tplBytes);
    }

    const token=crypto.randomUUID();
    const outputPath=path.join(dataDir,'uploads',token+'.pdf');
    await generateCertificatePdf({
     templateBytes:tplBytes,
     studentName:student.nama_penuh,
     outputPath
    });

    toInsert.push({
     studentId:student.id,
     namaSijil:matchedTemplate.nama_template,
     tarikh,
     outputPath,
     token
    });
    successCount++;
    generatedTokens.push({studentId:student.id,nama:student.nama_penuh,token});
   }catch(err){
    failed.push({id:student.id,nama:student.nama_penuh,peringkat:student.peringkat,reason:err.message});
   }
  }

  if(toInsert.length>0){
   const insertStmt=db.prepare('INSERT INTO sijil (pesilat_id,nama_sijil,tarikh_isu,jenis,file_path,file_type,public_token) VALUES (?,?,?,?,?,?,?)');
   db.exec('BEGIN');
   try{
    for(const item of toInsert){
     insertStmt.run(item.studentId,item.namaSijil,item.tarikh,'uploaded',item.outputPath,'application/pdf',item.token);
    }
    db.exec('COMMIT');
   }catch(err){
    db.exec('ROLLBACK');
    for(const item of toInsert){
     fs.rmSync(item.outputPath,{force:true});
    }
    throw err;
   }
  }

  res.json({
   total:ids.length,
   successCount,
   failedCount:failed.length,
   failed,
   generatedTokens
  });
 }catch(e){next(e);}
});
app.get('/api/admin/settings',requireAdmin,(_req,res)=>res.json(getSettings()));
app.put('/api/admin/settings',requireAdmin,(req,res)=>{
 const fields=['nama_organisasi','sub_organisasi','nama_penandatangan','jawatan_penandatangan','tema_warna'];
 const stmt=db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
 for(const f of fields){
  if(!(f in req.body))continue;
  const v=trim(req.body[f],120);
  if(f==='tema_warna'&&!/^#[0-9a-fA-F]{6}$/.test(v))return fail(res,'Warna tema perlu format #RRGGBB.');
  if(f!=='tema_warna'&&!v)return fail(res,`Ruangan ${f} tidak boleh kosong.`);
 }
 for(const f of fields)if(f in req.body)stmt.run(f,trim(req.body[f],120));
 res.json(getSettings());
});

const dist=path.join(projectRoot,'client/dist');
if(fs.existsSync(dist)){
 app.use(express.static(dist,{index:false}));
 app.get('*',(req,res,next)=>{if(req.path.startsWith('/api/'))return next();res.sendFile(path.join(dist,'index.html'));});
}
app.use((req,res)=>res.status(404).json({error:'Laluan tidak ditemui.'}));
app.use((err,req,res,_next)=>{
 if(err instanceof multer.MulterError)return fail(res,err.code==='LIMIT_FILE_SIZE'?'Fail melebihi 10MB.':'Fail tidak boleh dimuat naik.');
 console.error('[ProSijil]',err);
 if(res.headersSent)return;
 return fail(res,'Ralat pelayan. Cuba semula.',500);
});
export default app;
