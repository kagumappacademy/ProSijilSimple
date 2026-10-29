import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import { db, getSettings, uniqueId, triggerTursoSync } from './db.js';
import { cookieName, cookieOptions, requireAdmin, setSession } from './auth.js';
import { dataDir, portalUrl, production, projectRoot } from './config.js';
import { decodeCsv, csvSafe } from './csv.js';
import { createCertificatePdf, uploadedToPdf } from './pdf.js';
import { generateCertificatePdf } from './certificateGenerator.js';
import { PDFDocument } from 'pdf-lib';
import { trim, validatePesilat, validDate } from './validation.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', production ? 1 : false);
app.use(helmet({contentSecurityPolicy: production ? undefined : false}));
app.use(express.json({limit:'100kb'}));
app.use(cookieParser());
// Mutating requests from a web page must originate from our own frontend.
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.get('origin')) {
    const origin = req.get('origin');
    const host = req.get('host');
    const isSameHost = host && (origin === `https://${host}` || origin === `http://${host}`);
    const isVercelDomain = /^https:\/\/[a-zA-Z0-9_.-]+\.vercel\.app$/.test(origin);
    const allowed = new Set([
      portalUrl,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:4000',
      'http://127.0.0.1:4000',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ]);
    if (process.env.VERCEL_URL) {
      allowed.add(`https://${process.env.VERCEL_URL}`);
    }

    if (!isSameHost && !isVercelDomain && !allowed.has(origin)) {
      return res.status(403).json({ error: 'Origin tidak dibenarkan.' });
    }
  }
  next();
});
const authLimit = rateLimit({windowMs:15*60*1000,limit:12,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Terlalu banyak percubaan. Cuba semula dalam 15 minit.'}});
const searchLimit = rateLimit({windowMs:60*1000,limit:35,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Terlalu banyak carian. Cuba semula sebentar lagi.'}});
const upload = multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:1}});
const uploadTemplate = multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:3}});
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
app.post('/api/auth/password',requireAdmin,async (req,res)=>{
 const current=String(req.body.current_password??''), next=String(req.body.new_password??'');
 const admin=db.prepare('SELECT password_hash FROM admin_users WHERE id=?').get(req.admin.id);
 if (!bcrypt.compareSync(current,admin.password_hash)) return fail(res,'Kata laluan semasa tidak tepat.',403);
 if (next.length < 12 || next.length > 128) return fail(res,'Kata laluan baharu mestilah 12–128 aksara.');
 const newHash = bcrypt.hashSync(next,12);
 db.prepare('UPDATE admin_users SET password_hash=? WHERE id=?').run(newHash,req.admin.id);

 try {
  const { isTursoConfigured, getTursoClient } = await import('./turso.js');
  if (isTursoConfigured()) {
   const turso = getTursoClient();
   await turso.execute({
    sql: 'UPDATE admin_users SET password_hash=? WHERE id=?',
    args: [newHash, req.admin.id]
   });
   console.log('[Turso] Kata laluan admin dikemaskini di Turso Cloud');
  }
 } catch(err) {
  console.warn('[Turso Admin Password Warning]', err.message);
 }

 res.clearCookie(cookieName,{...cookieOptions,maxAge:undefined});return res.json({success:true});
});

app.get('/api/public/stats',(_req,res)=>{
 const total=db.prepare('SELECT count(*) AS n FROM sijil').get().n;
 res.json({certificates:total});
});
function cleanSearchText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[’‘`']/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

app.get('/api/public/search',searchLimit,(req,res)=>{
 const rawQ=trim(req.query.q,160);
 if (rawQ.length < 3) return fail(res,'Masukkan nama penuh atau ID (minima 3 aksara).');

 const qClean = cleanSearchText(rawQ);
 const qWords = qClean.split(' ').filter(w => w.length > 0);
 if (qWords.length === 0) return res.json({results:[]});

 // 1. Fast SQL query first (exact match, case-insensitive)
 let records = db.prepare('SELECT id,nama_penuh,no_kp_atau_id,peringkat,cawangan,tarikh_daftar FROM pesilat WHERE nama_penuh=? COLLATE NOCASE OR no_kp_atau_id=? COLLATE NOCASE LIMIT 15').all(rawQ,rawQ);

 // 2. If no exact match, perform flexible normalized search across pesilat (case, punctuation & partial insensitive)
 if (!records.length) {
   const allStudents = db.prepare('SELECT id,nama_penuh,no_kp_atau_id,peringkat,cawangan,tarikh_daftar FROM pesilat').all();
   const scored = [];
   for (const s of allStudents) {
     const sNameClean = cleanSearchText(s.nama_penuh);
     const sIdClean = cleanSearchText(s.no_kp_atau_id);

     if (sNameClean === qClean || sIdClean === qClean) {
       scored.push({ ...s, score: 100 });
       continue;
     }
     if (sNameClean.includes(qClean) || sIdClean.includes(qClean)) {
       scored.push({ ...s, score: 80 });
       continue;
     }
     const allWordsMatch = qWords.every(w => sNameClean.includes(w) || sIdClean.includes(w));
     if (allWordsMatch) {
       scored.push({ ...s, score: 50 });
       continue;
     }
   }
   scored.sort((a, b) => b.score - a.score || a.nama_penuh.localeCompare(b.nama_penuh));
   records = scored.slice(0, 15);
 }

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
app.get('/api/public/certificates/:token/download',searchLimit,async (req,res,next)=>{
 try {
 const row=readCertificate(req.params.token);
 if(!row)return fail(res,'Sijil tidak ditemui.',404);
 const student={nama_penuh:row.nama_penuh,peringkat:row.peringkat,cawangan:row.cawangan};
 if(row.jenis==='generated')return createCertificatePdf(res,student,row,getSettings(),req.query.preview!=='1');

 // 1. Direct base64 in certificate record
 if(row.file_base64){
  const buffer=Buffer.from(row.file_base64,'base64');
  res.type(row.file_type||'application/pdf');
  res.setHeader('Content-Disposition',`${req.query.preview==='1'?'inline':'attachment'}; filename="${encodeURIComponent(row.nama_penuh+'.pdf')}"`);
  return res.send(buffer);
 }

 // 2. Local disk file if available
 if(row.file_path && fs.existsSync(row.file_path))return uploadedToPdf(res,row,student,req.query.preview!=='1');

 // 3. Dynamic on-the-fly generation from matched template in Turso Cloud!
 const norm = s => String(s || '').trim().toLowerCase().replace(/^ujian\s+/i, '').replace(/\s+/g, ' ');
 let templates=db.prepare('SELECT id,nama_template,peringkat,file_path,file_base64 FROM template_sijil WHERE nama_template=?').all(row.nama_sijil);
 if(!templates.length || !templates.some(t => t.file_base64 || (t.file_path && fs.existsSync(t.file_path)))){
  try {
    const { isTursoConfigured, pullTemplatesFromTurso } = await import('./turso.js');
    if (isTursoConfigured()) {
      await pullTemplatesFromTurso();
      templates=db.prepare('SELECT id,nama_template,peringkat,file_path,file_base64 FROM template_sijil WHERE nama_template=?').all(row.nama_sijil);
    }
  } catch(err) {
    console.warn('[Turso Template Pull Warning]', err.message);
  }
 }
 let matched=templates.find(t=>norm(t.peringkat)===norm(row.peringkat) || t.peringkat.trim().toLowerCase()===row.peringkat.trim().toLowerCase())
  || templates.find(t=>t.peringkat.trim().toLowerCase()==='semua peringkat')
  || templates[0];

 if(matched && (matched.file_base64 || (matched.file_path && fs.existsSync(matched.file_path)))){
  const tplBytes = matched.file_base64 ? Buffer.from(matched.file_base64, 'base64') : fs.readFileSync(matched.file_path);
  const generated = await generateCertificatePdf({
    templateBytes: tplBytes,
    studentName: row.nama_penuh
  });
  res.type('application/pdf');
  res.setHeader('Content-Disposition',`${req.query.preview==='1'?'inline':'attachment'}; filename="${encodeURIComponent(row.nama_penuh+'.pdf')}"`);
  return res.send(Buffer.from(generated.bytes));
 }

 return fail(res,'Fail sijil tidak tersedia.',404);
 }catch(e){next(e);}
});

app.get('/api/admin/dashboard',requireAdmin,(_req,res)=>{
 const pesilat=db.prepare('SELECT count(*) AS n FROM pesilat').get().n;
 const sijil=db.prepare('SELECT count(*) AS n FROM sijil').get().n;
 const branches=db.prepare('SELECT count(DISTINCT cawangan) AS n FROM pesilat').get().n;
 const byLevel=db.prepare('SELECT peringkat as name,count(*) as total FROM pesilat GROUP BY peringkat ORDER BY total DESC LIMIT 7').all();
 const byBranch=db.prepare('SELECT cawangan as name,count(*) as total FROM pesilat GROUP BY cawangan ORDER BY total DESC LIMIT 6').all();
 const recent=db.prepare('SELECT s.id,s.nama_sijil,s.tarikh_isu,s.kategori,p.nama_penuh,p.cawangan FROM sijil s JOIN pesilat p ON s.pesilat_id=p.id ORDER BY s.id DESC LIMIT 6').all();
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
app.post('/api/admin/students',requireAdmin,async (req,res)=>{
 try{
 const values=validatePesilat(req.body||{});
 values.no_kp_atau_id=values.no_kp_atau_id||uniqueId();
 let newId = null;

 // 1. Simpan ke Turso Cloud jika bersambung (Cloud sebagai punca kebenaran)
 try {
  const { isTursoConfigured, getTursoClient } = await import('./turso.js');
  if (isTursoConfigured()) {
   const turso = getTursoClient();
   const tursoRes = await turso.execute({
    sql: "INSERT INTO pesilat (nama_penuh, no_kp_atau_id, peringkat, cawangan, tarikh_daftar, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now')) RETURNING id",
    args: [values.nama_penuh, values.no_kp_atau_id, values.peringkat, values.cawangan, values.tarikh_daftar]
   });
   if (tursoRes.rows && tursoRes.rows[0]?.id) {
    newId = Number(tursoRes.rows[0].id);
   } else if (tursoRes.lastInsertRowid) {
    newId = Number(tursoRes.lastInsertRowid);
   }
   console.log('[Turso] Pesilat baharu disimpan di Turso Cloud:', newId, values.nama_penuh);
  }
 } catch(err) {
  console.error('[Turso Student Insert Error]', err);
  return fail(res, err.message.includes('UNIQUE') ? 'Nombor KP/ID sudah digunakan.' : 'Gagal menambah pesilat ke Turso Cloud: ' + err.message, 500);
 }

 if (newId) {
  db.prepare('INSERT OR REPLACE INTO pesilat (id, nama_penuh, no_kp_atau_id, peringkat, cawangan, tarikh_daftar) VALUES (?, ?, ?, ?, ?, ?)')
    .run(newId, values.nama_penuh, values.no_kp_atau_id, values.peringkat, values.cawangan, values.tarikh_daftar);
 } else {
  const result=db.prepare('INSERT INTO pesilat (nama_penuh,no_kp_atau_id,peringkat,cawangan,tarikh_daftar) VALUES (@nama_penuh,@no_kp_atau_id,@peringkat,@cawangan,@tarikh_daftar)').run(values);
  newId = Number(result.lastInsertRowid);
 }

 res.status(201).json({id:newId,...values});
 }catch(e){return fail(res,e.message.includes('UNIQUE')?'Nombor KP/ID sudah digunakan.':e.message);}
});
app.put('/api/admin/students/:id',requireAdmin,async (req,res)=>{
 const id=cleanId(req.params.id);if(!id)return fail(res,'ID pesilat tidak sah.');
 const before=db.prepare('SELECT * FROM pesilat WHERE id=?').get(id);if(!before)return fail(res,'Pesilat tidak ditemui.',404);
 try{
 const values=validatePesilat({...before,...req.body});
 values.no_kp_atau_id=values.no_kp_atau_id||before.no_kp_atau_id;

 // 1. Kemaskini di Turso Cloud terlebih dahulu
 try {
  const { isTursoConfigured, getTursoClient } = await import('./turso.js');
  if (isTursoConfigured()) {
   const turso = getTursoClient();
   await turso.execute({
    sql: "UPDATE pesilat SET nama_penuh=?, no_kp_atau_id=?, peringkat=?, cawangan=?, tarikh_daftar=?, updated_at=datetime('now') WHERE id=?",
    args: [values.nama_penuh, values.no_kp_atau_id, values.peringkat, values.cawangan, values.tarikh_daftar, id]
   });
   console.log('[Turso] Pesilat berjaya dikemaskini di Turso Cloud:', id, values.nama_penuh);
  }
 } catch(err) {
  console.error('[Turso Student Update Error]', err);
  return fail(res, err.message.includes('UNIQUE') ? 'Nombor KP/ID sudah digunakan.' : 'Gagal menyimpan kemas kini ke Turso Cloud: ' + err.message, 500);
 }

 // 2. Kemaskini di SQLite tempatan (cache)
 db.prepare("UPDATE pesilat SET nama_penuh=@nama_penuh,no_kp_atau_id=@no_kp_atau_id,peringkat=@peringkat,cawangan=@cawangan,tarikh_daftar=@tarikh_daftar,updated_at=datetime('now') WHERE id=@id").run({...values,id});

 res.json({id,...values});
 }catch(e){return fail(res,e.message.includes('UNIQUE')?'Nombor KP/ID sudah digunakan.':e.message);}
});
app.delete('/api/admin/students/:id',requireAdmin,async (req,res)=>{
 const id=cleanId(req.params.id);if(!id)return fail(res,'ID pesilat tidak sah.');
 const certs=db.prepare('SELECT file_path FROM sijil WHERE pesilat_id=?').all(id);

 // 1. Padam di Turso Cloud terlebih dahulu
 try {
  const { isTursoConfigured, getTursoClient } = await import('./turso.js');
  if (isTursoConfigured()) {
   const turso = getTursoClient();
   await turso.execute({ sql: 'DELETE FROM pesilat WHERE id=?', args: [id] });
   console.log('[Turso] Pesilat dipadam dari Turso Cloud:', id);
  }
 } catch(err) {
  console.error('[Turso Student Delete Error]', err);
  return fail(res, 'Gagal memadam pesilat dari Turso Cloud: ' + err.message, 500);
 }

 // 2. Padam di SQLite tempatan
 const result=db.prepare('DELETE FROM pesilat WHERE id=?').run(id);
 if(!result.changes)return fail(res,'Pesilat tidak ditemui.',404);
 for(const c of certs) if(c.file_path) { try{ fs.rmSync(c.file_path,{force:true}); }catch(_){} }
 res.json({success:true});
});
app.get('/api/admin/students/:id/certificates',requireAdmin,(req,res)=>{
 const id=cleanId(req.params.id);if(!id)return fail(res,'ID pesilat tidak sah.');
 const student=db.prepare('SELECT id,nama_penuh,no_kp_atau_id,peringkat,cawangan,tarikh_daftar FROM pesilat WHERE id=?').get(id);
 if(!student)return fail(res,'Pesilat tidak ditemui.',404);
 const rows=db.prepare('SELECT id,pesilat_id,nama_sijil,tarikh_isu,jenis,file_type,public_token,created_at FROM sijil WHERE pesilat_id=? ORDER BY tarikh_isu DESC,id DESC').all(id);
 res.json({student,certificates:rows});
});
app.get('/api/admin/students/export',requireAdmin,async (req,res,next)=>{
 try {
  const q=trim(req.query.q,160);
  const branch=trim(req.query.branch || req.query.cawangan,160);
  const level=trim(req.query.level || req.query.peringkat,90);

  const where=[];const p=[];
  if(q){where.push('(p.nama_penuh LIKE ? OR p.no_kp_atau_id LIKE ?)');p.push(`%${q}%`,`%${q}%`);}
  if(branch){where.push('p.cawangan=?');p.push(branch);}
  if(level){
   const cleanLevel=level.replace(/^ujian\s+/i,'');
   where.push('(p.peringkat=? OR p.peringkat=? OR p.peringkat=? COLLATE NOCASE)');
   p.push(level,cleanLevel,'Ujian '+cleanLevel);
  }
  const w=where.length?' WHERE '+where.join(' AND '):'';
  const rows=db.prepare('SELECT p.nama_penuh, p.no_kp_atau_id, p.peringkat, p.cawangan, p.tarikh_daftar, (SELECT count(*) FROM sijil s WHERE s.pesilat_id=p.id) as jumlah_sijil FROM pesilat p'+w+' ORDER BY p.cawangan, p.peringkat, p.nama_penuh').all(...p);

  const cols=['nama_penuh','no_kp_atau_id','peringkat','cawangan','tarikh_daftar','jumlah_sijil'];
  const csv='\uFEFF'+cols.join(',')+'\r\n'+rows.map(r=>cols.map(k=>csvSafe(r[k])).join(',')).join('\r\n');

  let fileParts = ['prosijil-pesilat'];
  if(branch) fileParts.push(branch.replace(/[^a-zA-Z0-9_-]/g,'_'));
  if(level) fileParts.push(level.replace(/[^a-zA-Z0-9_-]/g,'_'));
  const filename = `${fileParts.join('-')}.csv`;

  res.setHeader('Content-Disposition',`attachment; filename="${encodeURIComponent(filename)}"`);
  res.type('text/csv; charset=utf-8').send(csv);
 } catch(e){ next(e); }
});
app.post('/api/admin/students/import',requireAdmin,upload.single('file'),async (req,res)=>{
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
  try {
   const { isTursoConfigured, pushLocalToTurso } = await import('./turso.js');
   if (isTursoConfigured()) {
    await pushLocalToTurso();
    console.log('[Turso] Pesilat CSV import disegerakkan ke Turso Cloud');
   }
  } catch(err) {
   console.warn('[Turso Import Sync Warning]', err.message);
  }
 }catch(e){db.exec('ROLLBACK');throw e;}
 res.json({total:rows.length,inserted,skipped,errors:errors.slice(0,25)});
 }catch(e){return fail(res,e.message);}
});

app.get('/api/admin/certificates',requireAdmin,(req,res)=>{
 const q=trim(req.query.q,160);
 const branch=trim(req.query.branch,80);
 const level=trim(req.query.level,100);
 const category=trim(req.query.category || req.query.kategori,60);
 const fetchAll=req.query.all==='1'||req.query.limit==='all';
 const page=Math.max(1,Number(req.query.page)||1);
 const limit=fetchAll?10000:Math.min(100,Math.max(1,Number(req.query.limit)||20));

 const conditions=[];
 const params=[];
 if(q){
  conditions.push('(p.nama_penuh LIKE ? OR s.nama_sijil LIKE ? OR p.cawangan LIKE ? OR p.no_kp_atau_id LIKE ?)');
  params.push(`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`);
 }
 if(branch){
  conditions.push('p.cawangan = ?');
  params.push(branch);
 }
 if(level){
  conditions.push('p.peringkat = ?');
  params.push(level);
 }
 if(category && category !== 'semua'){
  if(category === 'kenaikan_tali_pinggang'){
   conditions.push("(s.kategori = 'kenaikan_tali_pinggang' OR s.kategori IS NULL OR s.nama_sijil LIKE '%kenaikan%' OR s.nama_sijil LIKE '%tali pinggang%' OR s.nama_sijil LIKE '%bengkung%')");
  } else if(category === 'pencapaian'){
   conditions.push("(s.kategori = 'pencapaian' OR s.nama_sijil LIKE '%pencapaian%')");
  } else if(category === 'penghargaan'){
   conditions.push("(s.kategori = 'penghargaan' OR s.nama_sijil LIKE '%penghargaan%')");
  } else if(category === 'penyertaan'){
   conditions.push("(s.kategori = 'penyertaan' OR s.nama_sijil LIKE '%penyertaan%')");
  } else {
   conditions.push('s.kategori = ?');
   params.push(category);
  }
 }
 const filter=conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
 const from=' FROM sijil s JOIN pesilat p ON p.id=s.pesilat_id';
 const total=db.prepare('SELECT count(*) AS n'+from+filter).get(...params).n;
 const offset=fetchAll?0:(page-1)*limit;
 const rows=db.prepare('SELECT s.*,p.nama_penuh,p.no_kp_atau_id,p.peringkat,p.cawangan'+from+filter+' ORDER BY p.cawangan, p.peringkat, s.id DESC LIMIT ? OFFSET ?').all(...params,limit,offset).map(r=>({...r,file_path:undefined}));

 const branches=db.prepare("SELECT p.cawangan AS name, count(s.id) AS count FROM sijil s JOIN pesilat p ON p.id=s.pesilat_id WHERE p.cawangan IS NOT NULL AND p.cawangan != '' GROUP BY p.cawangan ORDER BY p.cawangan").all();
 const levels=db.prepare("SELECT p.peringkat AS name, count(s.id) AS count FROM sijil s JOIN pesilat p ON p.id=s.pesilat_id WHERE p.peringkat IS NOT NULL AND p.peringkat != '' GROUP BY p.peringkat ORDER BY p.peringkat").all();

 res.json({rows,total,page,pages:Math.max(1,Math.ceil(total/limit)),branches,levels});
});
app.post('/api/admin/certificates',requireAdmin,upload.single('file'),async (req,res,next)=>{
 const id=cleanId(req.body?.pesilat_id);
 if(!id)return fail(res,'Sila pilih pesilat.');
 const student=db.prepare('SELECT id FROM pesilat WHERE id=?').get(id);
 if(!student)return fail(res,'Pesilat tidak ditemui.',404);
 const title=trim(req.body?.nama_sijil,130),tarikh=trim(req.body?.tarikh_isu,10)||today();
 const kategori=trim(req.body?.kategori,50)||'kenaikan_tali_pinggang';
 if(title.length<3)return fail(res,'Nama sijil perlu sekurang-kurangnya 3 aksara.');
 if(!validDate(tarikh))return fail(res,'Tarikh sijil tidak sah.');
 let jenis='generated',file_path=null,file_type=null,file_base64=null;
 if(req.file){
  const bytes=req.file.buffer;
  if(bytes.subarray(0,5).toString('ascii')==='%PDF-')file_type='application/pdf';
  else if(bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')))file_type='image/png';
  else if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)file_type='image/jpeg';
  else return fail(res,'Hanya fail PDF, PNG atau JPG yang sah diterima.');
  jenis='uploaded';
  file_base64=bytes.toString('base64');
  file_path=path.join(dataDir,'uploads',crypto.randomUUID()+({'application/pdf':'.pdf','image/png':'.png','image/jpeg':'.jpg'}[file_type]));
  try{fs.writeFileSync(file_path,bytes,{flag:'wx'});}catch(_){}
 }
 try{
 const token=crypto.randomUUID();
 const result=db.prepare('INSERT INTO sijil (pesilat_id,nama_sijil,tarikh_isu,jenis,file_path,file_type,public_token,file_base64,kategori) VALUES (?,?,?,?,?,?,?,?,?)').run(id,title,tarikh,jenis,file_path,file_type,token,file_base64,kategori);
 const newCertId = Number(result.lastInsertRowid);

 // Simpan terus ke Turso Cloud jika bersambung
 try {
  const { isTursoConfigured, getTursoClient } = await import('./turso.js');
  if (isTursoConfigured()) {
   const turso = getTursoClient();
   await turso.execute({
    sql: "INSERT OR REPLACE INTO sijil (id, pesilat_id, nama_sijil, tarikh_isu, jenis, file_path, file_type, public_token, file_base64, kategori, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))",
    args: [newCertId, id, title, tarikh, jenis, file_path, file_type, token, file_base64, kategori]
   });
   console.log('[Turso] Sijil baharu disimpan ke Turso Cloud:', newCertId);
  }
 } catch(err) {
  console.warn('[Turso Sync Warning]', err.message);
 }

 return res.status(201).json({id:newCertId,public_token:token,kategori});
 }catch(e){if(file_path){try{fs.rmSync(file_path,{force:true});}catch(_){}}throw e;}
});
app.put('/api/admin/certificates/:id',requireAdmin,upload.single('file'),async (req,res,next)=>{
 try {
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
 let file_base64=current.file_base64;
 let kategori=trim(req.body?.kategori,50)||current.kategori||'kenaikan_tali_pinggang';
 if(req.file){
  const bytes=req.file.buffer;
  if(bytes.subarray(0,5).toString('ascii')==='%PDF-')file_type='application/pdf';
  else if(bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')))file_type='image/png';
  else if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)file_type='image/jpeg';
  else return fail(res,'Hanya fail PDF, PNG atau JPG yang sah diterima.');
  jenis='uploaded';
  file_base64=bytes.toString('base64');
  const newPath=path.join(dataDir,'uploads',crypto.randomUUID()+({'application/pdf':'.pdf','image/png':'.png','image/jpeg':'.jpg'}[file_type]));
  try{fs.writeFileSync(newPath,bytes,{flag:'wx'});}catch(_){}
  if(current.file_path&&fs.existsSync(current.file_path)){
   try{fs.rmSync(current.file_path,{force:true});}catch(_){}
  }
  file_path=newPath;
 }
 db.prepare('UPDATE sijil SET nama_sijil=?,tarikh_isu=?,jenis=?,file_path=?,file_type=?,file_base64=?,kategori=? WHERE id=?')
   .run(title,tarikh,jenis,file_path,file_type,file_base64,kategori,id);

 try {
  const { isTursoConfigured, getTursoClient } = await import('./turso.js');
  if (isTursoConfigured()) {
   const turso = getTursoClient();
   await turso.execute({
    sql: 'UPDATE sijil SET nama_sijil=?, tarikh_isu=?, jenis=?, file_path=?, file_type=?, file_base64=?, kategori=? WHERE id=?',
    args: [title, tarikh, jenis, file_path, file_type, file_base64, kategori, id]
   });
  }
 } catch(err) {
  console.warn('[Turso Sync Warning]', err.message);
 }

 res.json({id,nama_sijil:title,tarikh_isu:tarikh,jenis,kategori,public_token:current.public_token});
 }catch(e){next(e);}
});
app.delete('/api/admin/certificates/:id',requireAdmin,async (req,res,next)=>{
 try {
 const id=cleanId(req.params.id);if(!id)return fail(res,'ID tidak sah.');
 const row=db.prepare('SELECT file_path FROM sijil WHERE id=?').get(id);if(!row)return fail(res,'Sijil tidak ditemui.',404);
 db.prepare('DELETE FROM sijil WHERE id=?').run(id);
 if(row.file_path){try{fs.rmSync(row.file_path,{force:true});}catch(_){}}

 try {
  const { isTursoConfigured, getTursoClient } = await import('./turso.js');
  if (isTursoConfigured()) {
   const turso = getTursoClient();
   await turso.execute({ sql: 'DELETE FROM sijil WHERE id=?', args: [id] });
  }
 } catch(err) {
  console.warn('[Turso Delete Warning]', err.message);
 }

 return res.json({success:true});
 }catch(e){next(e);}
});
app.post('/api/admin/certificates/batch-delete',requireAdmin,async (req,res,next)=>{
 try {
 const ids=Array.isArray(req.body?.ids)?req.body.ids.map(cleanId).filter(Boolean):[];
 if(!ids.length)return fail(res,'Sila pilih sekurang-kurangnya satu sijil.');

 const placeholders=ids.map(()=>'?').join(',');
 const rows=db.prepare(`SELECT id, file_path FROM sijil WHERE id IN (${placeholders})`).all(...ids);

 db.exec('BEGIN');
 try {
  db.prepare(`DELETE FROM sijil WHERE id IN (${placeholders})`).run(...ids);
  db.exec('COMMIT');
 } catch(err){
  db.exec('ROLLBACK');
  throw err;
 }

 for(const r of rows){
  if(r.file_path){try{fs.rmSync(r.file_path,{force:true});}catch(_){}}
 }

 try {
  const { isTursoConfigured, getTursoClient } = await import('./turso.js');
  if (isTursoConfigured()) {
   const turso = getTursoClient();
   await turso.execute({ sql: `DELETE FROM sijil WHERE id IN (${placeholders})`, args: ids });
  }
 } catch(err) {
  console.warn('[Turso Batch Delete Warning]', err.message);
 }

 return res.json({success:true,deletedCount:rows.length});
 }catch(e){next(e);}
});

app.get('/api/admin/templates',requireAdmin,async (req,res)=>{
 try {
  const force = req.query?.force_sync === '1';
  const category = trim(req.query?.category || req.query?.kategori, 60);
  if (force) {
   try {
    const { isTursoConfigured, pullTemplatesFromTurso } = await import('./turso.js');
    if (isTursoConfigured()) {
     await pullTemplatesFromTurso();
    }
   } catch(e) { console.warn('[Turso Templates Force Sync Warning]', e.message); }
  }
  let query = 'SELECT id,nama_template,peringkat,keterangan,file_name,file_size,kategori,page_count,created_at FROM template_sijil';
  const conds = [];
  const params = [];
  if (category && category !== 'semua') {
   if (category === 'kenaikan_tali_pinggang') {
    conds.push("(kategori = 'kenaikan_tali_pinggang' OR kategori IS NULL OR nama_template LIKE '%kenaikan%' OR nama_template LIKE '%tali pinggang%')");
   } else if (category === 'pencapaian') {
    conds.push("(kategori = 'pencapaian' OR nama_template LIKE '%pencapaian%')");
   } else if (category === 'penghargaan') {
    conds.push("(kategori = 'penghargaan' OR nama_template LIKE '%penghargaan%')");
   } else if (category === 'penyertaan') {
    conds.push("(kategori = 'penyertaan' OR nama_template LIKE '%penyertaan%')");
   } else {
    conds.push('kategori = ?');
    params.push(category);
   }
  }
  if (conds.length) query += ' WHERE ' + conds.join(' AND ');
  query += ' ORDER BY id DESC';

  let rows=db.prepare(query).all(...params);
  if(!rows.length && !category){
   try {
    const { isTursoConfigured, pullTemplatesFromTurso } = await import('./turso.js');
    if (isTursoConfigured()) {
     await pullTemplatesFromTurso();
     rows=db.prepare(query).all(...params);
    }
   } catch(e) {
    console.warn('[Turso Templates Fetch Warning]', e.message);
   }
  }
  res.json({rows});
 } catch(err) {
  res.status(500).json({ error: err.message });
 }
});

app.post('/api/admin/templates',requireAdmin,uploadTemplate.fields([{ name: 'file', maxCount: 1 }, { name: 'file_page1', maxCount: 1 }, { name: 'file_page2', maxCount: 1 }]),async (req,res,next)=>{
 try {
  const requestedPageCount = Number(req.body?.page_count) === 2 ? 2 : 1;
  const singleFile = req.files?.file?.[0] || req.file;
  const filePage1 = req.files?.file_page1?.[0];
  const filePage2 = req.files?.file_page2?.[0];

  let finalBytes = null;
  let file_name = 'template.pdf';
  let actualPageCount = requestedPageCount;

  if (requestedPageCount === 2 && filePage1 && filePage2) {
    const b1 = filePage1.buffer;
    const b2 = filePage2.buffer;
    if (b1.subarray(0, 5).toString('ascii') !== '%PDF-' || b2.subarray(0, 5).toString('ascii') !== '%PDF-') {
      return fail(res, 'Kedua-dua fail mestilah dalam format PDF.');
    }
    const doc1 = await PDFDocument.load(b1);
    const doc2 = await PDFDocument.load(b2);
    const merged = await PDFDocument.create();
    const [p1] = await merged.copyPages(doc1, [0]);
    const [p2] = await merged.copyPages(doc2, [0]);
    merged.addPage(p1);
    merged.addPage(p2);
    finalBytes = Buffer.from(await merged.save());
    actualPageCount = 2;
    file_name = filePage1.originalname || 'template_2pages.pdf';
  } else if (singleFile) {
    const bytes = singleFile.buffer;
    if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
      return fail(res, 'Fail mestilah dalam format PDF.');
    }
    const doc = await PDFDocument.load(bytes);
    const numPages = doc.getPageCount();

    const targetPages = req.body?.page_count !== undefined && req.body?.page_count !== null && req.body?.page_count !== ''
      ? (Number(req.body.page_count) === 2 ? 2 : 1)
      : (numPages >= 2 ? 2 : 1);

    if (targetPages === 1) {
      if (numPages > 1) {
        // Ambil hanya muka surat pertama untuk templat 1 muka surat
        const singleDoc = await PDFDocument.create();
        const [p1] = await singleDoc.copyPages(doc, [0]);
        singleDoc.addPage(p1);
        finalBytes = Buffer.from(await singleDoc.save());
      } else {
        finalBytes = bytes;
      }
      actualPageCount = 1;
    } else {
      if (numPages < 2) {
        return fail(
          res,
          'Pilihan 2 Muka Surat dipilih tetapi fail PDF hanya mempunyai 1 muka surat. Sila muat naik fail PDF dengan 2 muka surat, atau gunakan pilihan "2 Fail Berasingan" untuk memuat naik Halaman 1 & 2.'
        );
      }
      if (numPages > 2) {
        const twoDoc = await PDFDocument.create();
        const copied = await twoDoc.copyPages(doc, [0, 1]);
        twoDoc.addPage(copied[0]);
        twoDoc.addPage(copied[1]);
        finalBytes = Buffer.from(await twoDoc.save());
      } else {
        finalBytes = bytes;
      }
      actualPageCount = 2;
    }
    file_name = singleFile.originalname || 'template.pdf';
  } else {
    return fail(res, 'Sila muat naik fail templat PDF.');
  }

  const nama = trim(req.body?.nama_template, 160);
  const peringkat = trim(req.body?.peringkat, 100);
  const keterangan = trim(req.body?.keterangan, 250);
  const kategori = trim(req.body?.kategori, 50) || 'kenaikan_tali_pinggang';
  if (nama.length < 3) return fail(res, 'Nama templat perlu sekurang-kurangnya 3 aksara.');
  if (!peringkat) return fail(res, 'Sila pilih atau masukkan peringkat pesilat untuk templat ini.');

  const file_base64 = finalBytes.toString('base64');
  const file_path = path.join(dataDir, 'templates', crypto.randomUUID() + '.pdf');
  try { fs.writeFileSync(file_path, finalBytes, { flag: 'wx' }); } catch (_) {}

  let newId = null;

  // 1. Simpan terus ke Turso Cloud jika bersambung (Cloud sebagai sumber utama)
  try {
    const { isTursoConfigured, getTursoClient } = await import('./turso.js');
    if (isTursoConfigured()) {
      const turso = getTursoClient();
      const tursoRes = await turso.execute({
        sql: "INSERT INTO template_sijil (nama_template, peringkat, keterangan, file_path, file_name, file_size, file_base64, kategori, page_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')) RETURNING id",
        args: [nama, peringkat, keterangan || null, file_path, file_name, finalBytes.length, file_base64, kategori, actualPageCount]
      });
      if (tursoRes.rows && tursoRes.rows[0]?.id) {
        newId = Number(tursoRes.rows[0].id);
      } else if (tursoRes.lastInsertRowid) {
        newId = Number(tursoRes.lastInsertRowid);
      }
      console.log('[Turso] Templat berjaya disegerakkan ke Turso Cloud:', nama, 'ID:', newId, 'Muka Surat:', actualPageCount);
    }
  } catch (err) {
    console.error('[Turso Template Insert Error]', err);
    return fail(res, 'Gagal menyimpan templat ke Turso Cloud: ' + err.message, 500);
  }

  // 2. Simpan juga ke SQLite tempatan (cache)
  if (newId) {
    db.prepare('INSERT OR REPLACE INTO template_sijil (id,nama_template,peringkat,keterangan,file_path,file_name,file_size,file_base64,kategori,page_count) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(newId, nama, peringkat, keterangan, file_path, file_name, finalBytes.length, file_base64, kategori, actualPageCount);
  } else {
    const result = db.prepare('INSERT INTO template_sijil (nama_template,peringkat,keterangan,file_path,file_name,file_size,file_base64,kategori,page_count) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(nama, peringkat, keterangan, file_path, file_name, finalBytes.length, file_base64, kategori, actualPageCount);
    newId = Number(result.lastInsertRowid);
  }

  return res.status(201).json({ id: newId, nama_template: nama, peringkat, kategori, page_count: actualPageCount, file_name });
 } catch (e) { next(e); }
});

app.delete('/api/admin/templates/:id',requireAdmin,async (req,res,next)=>{
 try {
  const id=cleanId(req.params.id);if(!id)return fail(res,'ID tidak sah.');
  const row=db.prepare('SELECT file_path FROM template_sijil WHERE id=?').get(id);
  if(!row)return fail(res,'Templat tidak ditemui.',404);
  db.prepare('DELETE FROM template_sijil WHERE id=?').run(id);
  if(row.file_path){try{fs.rmSync(row.file_path,{force:true});}catch(_){}}

  try {
    const { isTursoConfigured, getTursoClient } = await import('./turso.js');
    if (isTursoConfigured()) {
      const turso = getTursoClient();
      await turso.execute({ sql: 'DELETE FROM template_sijil WHERE id=?', args: [id] });
    }
  } catch (e) { console.warn('[Turso Delete Warning]', e.message); }

  return res.json({success:true});
 }catch(e){next(e);}
});

app.get('/api/admin/templates/:id/preview',requireAdmin,async (req,res)=>{
 const id=cleanId(req.params.id);if(!id)return fail(res,'ID tidak sah.');
 let row=db.prepare('SELECT file_path,file_name,file_base64 FROM template_sijil WHERE id=?').get(id);
 if(!row || (!row.file_base64 && (!row.file_path || !fs.existsSync(row.file_path)))){
  try {
   const { isTursoConfigured, getTursoClient } = await import('./turso.js');
   if (isTursoConfigured()) {
    const turso = getTursoClient();
    const tRes = await turso.execute({
     sql: 'SELECT id, nama_template, peringkat, keterangan, file_path, file_name, file_size, file_base64, created_at FROM template_sijil WHERE id=?',
     args: [id]
    });
    if (tRes.rows && tRes.rows.length > 0) {
     const tRow = tRes.rows[0];
     try {
      db.prepare('INSERT OR REPLACE INTO template_sijil (id, nama_template, peringkat, keterangan, file_path, file_name, file_size, file_base64, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(tRow.id, tRow.nama_template, tRow.peringkat, tRow.keterangan, tRow.file_path, tRow.file_name, tRow.file_size, tRow.file_base64, tRow.created_at);
     } catch(_) {}
     row = { file_path: tRow.file_path, file_name: tRow.file_name, file_base64: tRow.file_base64 };
    }
   }
  } catch(e) { console.warn('[Turso Preview Warning]', e.message); }
 }
 if(!row)return fail(res,'Templat tidak ditemui.',404);

 res.type('application/pdf');
 res.setHeader('Content-Disposition',`inline; filename="${encodeURIComponent(row.file_name)}"`);
 res.setHeader('Cache-Control','private, max-age=86400');

 if(row.file_base64){
  return res.send(Buffer.from(row.file_base64,'base64'));
 }
 if(row.file_path && fs.existsSync(row.file_path)){
  return fs.createReadStream(row.file_path).pipe(res);
 }
 return fail(res,'Fail templat tidak ditemui.',404);
});

app.get('/api/admin/templates/groups',requireAdmin,async (req,res)=>{
 try {
  const force = req.query?.force_sync === '1';
  if (force) {
   try {
    const { isTursoConfigured, pullTemplatesFromTurso } = await import('./turso.js');
    if (isTursoConfigured()) {
     await pullTemplatesFromTurso();
    }
   } catch(e) { console.warn('[Turso Groups Force Sync Warning]', e.message); }
  }
  let rows=db.prepare('SELECT id,nama_template,peringkat,file_name,kategori,page_count FROM template_sijil ORDER BY id DESC, nama_template, peringkat').all();
  if(!rows.length){
   try {
    const { isTursoConfigured, pullTemplatesFromTurso } = await import('./turso.js');
    if (isTursoConfigured()) {
     await pullTemplatesFromTurso();
     rows=db.prepare('SELECT id,nama_template,peringkat,file_name,kategori,page_count FROM template_sijil ORDER BY id DESC, nama_template, peringkat').all();
    }
   } catch(e) { console.warn('[Turso Groups Warning]', e.message); }
  }
  const groups={};
  for(const r of rows){
   if(!groups[r.nama_template])groups[r.nama_template]=[];
   groups[r.nama_template].push(r);
  }
  res.json({groups,templates:rows});
 } catch(err) {
  res.status(500).json({ error: err.message });
 }
});

app.post('/api/admin/templates/test-preview',requireAdmin,async(req,res,next)=>{
 try{
  const templateId=cleanId(req.body?.template_id);
  const studentName=trim(req.body?.student_name,120)||'NUR AISYAH BINTI ABDULLAH';
  if(!templateId)return fail(res,'Sila pilih templat.');
  let row=db.prepare('SELECT file_path,file_base64 FROM template_sijil WHERE id=?').get(templateId);
  if(!row || (!row.file_base64 && (!row.file_path || !fs.existsSync(row.file_path)))){
   try {
    const { isTursoConfigured, pullTemplatesFromTurso } = await import('./turso.js');
    if (isTursoConfigured()) {
     await pullTemplatesFromTurso();
     row=db.prepare('SELECT file_path,file_base64 FROM template_sijil WHERE id=?').get(templateId);
    }
   } catch(e) { console.warn('[Turso Test Preview Warning]', e.message); }
  }
  if(!row)return fail(res,'Fail templat tidak wujud.',404);

  let tplBytes=null;
  if(row.file_base64){
   tplBytes=Buffer.from(row.file_base64,'base64');
  }else if(row.file_path && fs.existsSync(row.file_path)){
   tplBytes=fs.readFileSync(row.file_path);
  }else{
   return fail(res,'Fail templat tidak wujud.',404);
  }

  const result=await generateCertificatePdf({templateBytes:tplBytes,studentName});
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

  let templates=db.prepare('SELECT id,nama_template,peringkat,file_path,file_name,file_base64 FROM template_sijil WHERE nama_template=?').all(namaTemplate);
  if(!templates.length || !templates.some(t => t.file_base64 || (t.file_path && fs.existsSync(t.file_path)))){
   try {
    const { isTursoConfigured, pullTemplatesFromTurso } = await import('./turso.js');
    if (isTursoConfigured()) {
     await pullTemplatesFromTurso();
     templates=db.prepare('SELECT id,nama_template,peringkat,file_path,file_name,file_base64 FROM template_sijil WHERE nama_template=?').all(namaTemplate);
    }
   } catch(e) { console.warn('[Turso Batch Fetch Warning]', e.message); }
  }
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

   if(!matchedTemplate){
    failed.push({id:student.id,nama:student.nama_penuh,peringkat:student.peringkat,reason:`Tiada templat PDF untuk peringkat "${student.peringkat}"`});
    continue;
   }

   let tplBytes=templateCache.get(matchedTemplate.id);
   if(!tplBytes){
    if(matchedTemplate.file_base64){
     tplBytes=Buffer.from(matchedTemplate.file_base64,'base64');
    }else if(matchedTemplate.file_path && fs.existsSync(matchedTemplate.file_path)){
     tplBytes=fs.readFileSync(matchedTemplate.file_path);
    }
    if(tplBytes)templateCache.set(matchedTemplate.id,tplBytes);
   }

   if(!tplBytes){
    failed.push({id:student.id,nama:student.nama_penuh,peringkat:student.peringkat,reason:`Fail templat PDF tidak wujud untuk peringkat "${student.peringkat}"`});
    continue;
   }

   try{
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
     token,
     kategori: matchedTemplate.kategori || 'kenaikan_tali_pinggang'
    });
    successCount++;
    generatedTokens.push({studentId:student.id,nama:student.nama_penuh,token});
   }catch(err){
    failed.push({id:student.id,nama:student.nama_penuh,peringkat:student.peringkat,reason:err.message});
   }
  }

  if(toInsert.length>0){
   const insertStmt=db.prepare('INSERT INTO sijil (pesilat_id,nama_sijil,tarikh_isu,jenis,file_path,file_type,public_token,kategori) VALUES (?,?,?,?,?,?,?,?)');
   db.exec('BEGIN');
   try{
    for(const item of toInsert){
     insertStmt.run(item.studentId,item.namaSijil,item.tarikh,'uploaded',item.outputPath,'application/pdf',item.token,item.kategori);
    }
    db.exec('COMMIT');
    try {
      const { isTursoConfigured, pushLocalToTurso } = await import('./turso.js');
      if (isTursoConfigured()) {
        await pushLocalToTurso();
        console.log('[Turso] Sijil generate-batch disegerakkan ke Turso Cloud');
      }
    } catch(err) {
      console.warn('[Turso Batch Sync Warning]', err.message);
    }
   }catch(err){
    db.exec('ROLLBACK');
    for(const item of toInsert){
     try{fs.rmSync(item.outputPath,{force:true});}catch(_){}
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
app.put('/api/admin/settings',requireAdmin,async (req,res)=>{
 const fields=['nama_organisasi','sub_organisasi','nama_penandatangan','jawatan_penandatangan','tema_warna'];
 const stmt=db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
 for(const f of fields){
  if(!(f in req.body))continue;
  const v=trim(req.body[f],120);
  if(f==='tema_warna'&&!/^#[0-9a-fA-F]{6}$/.test(v))return fail(res,'Warna tema perlu format #RRGGBB.');
  if(f!=='tema_warna'&&!v)return fail(res,`Ruangan ${f} tidak boleh kosong.`);
 }
 for(const f of fields)if(f in req.body)stmt.run(f,trim(req.body[f],120));

 try {
  const { isTursoConfigured, getTursoClient } = await import('./turso.js');
  if (isTursoConfigured()) {
   const turso = getTursoClient();
   const stmts = fields
     .filter(f => f in req.body)
     .map(f => ({
       sql: 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
       args: [f, trim(req.body[f], 120)]
     }));
   if (stmts.length > 0) {
     await turso.batch(stmts, 'write');
     console.log('[Turso] Tetapan dikemaskini di Turso Cloud');
   }
  }
 } catch(err) {
  console.warn('[Turso Settings Update Warning]', err.message);
 }

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
