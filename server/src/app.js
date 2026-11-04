import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { rateLimit } from 'express-rate-limit';
import { db, getSettings, logActivity, getSystemCounts } from './db.js';
import { cookieName, cookieOptions, requireAdmin, setSession } from './auth.js';
import { portalUrl, production, projectRoot } from './config.js';
import { decodeCsv, csvSafe } from './csv.js';
import { uploadedToPdf } from './pdf.js';
import { generateCertificatePdf } from './certificateGenerator.js';
import { saveCertificate, getStoredCertificate, deleteStoredCertificates, updateStoredCertificate, ensureCertificateFile, generationToken, generationBatchId, getGenerationStatus } from './certificateStore.js';
import { saveTemplate, getStoredTemplate, getTemplateMetadata, listStoredTemplates, deleteStoredTemplate, updateTemplateMetadata } from './templateStore.js';
import { PDFDocument } from 'pdf-lib';
import { studentClient, readRows, getStoredStudent, saveStudent, deleteStudent, insertStudentBatch } from './studentStore.js';
import { trim, validatePesilat, validDate } from './validation.js';
import {listBranches,saveBranch} from './branchStore.js';
import {BRANCH_NAMES_SQL} from './branchSchema.js';
import { readDashboard } from './dashboardStore.js';
import { createPublicReport, listPublicReports, readPublicReport, updatePublicReport, readSupportContacts, saveSupportContacts } from './supportStore.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', production ? 1 : false);
app.use(helmet({contentSecurityPolicy: production ? undefined : false}));
app.use(express.json({limit:'2mb'}));
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
export const reportLimit = rateLimit({windowMs:15*60*1000,limit:8,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Terlalu banyak laporan dihantar. Sila cuba semula selepas 15 minit.'}});
const upload = multer({storage:multer.memoryStorage(),limits:{fileSize:50*1024*1024,fieldSize:20*1024*1024,files:1}});
const uploadTemplate = multer({storage:multer.memoryStorage(),limits:{fileSize:50*1024*1024,fieldSize:20*1024*1024,files:3}});
const today = () => new Date().toISOString().slice(0,10);
const fail = (res,message,status=400) => res.status(status).json({error:message});
const cleanId = v => Number.isSafeInteger(Number(v)) && Number(v) > 0 ? Number(v) : null;
function certificateFileType(bytes) {
 if(bytes.subarray(0,5).toString('ascii')==='%PDF-')return 'application/pdf';
 if(bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')))return 'image/png';
 if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return 'image/jpeg';
 return null;
}
async function loadTemplatePdf(bytes) {
 try {
  const pdf=await PDFDocument.load(bytes);
  if(!pdf.getPageCount())throw new Error('PDF kosong.');
  return pdf;
 } catch(error) {
  throw Object.assign(new Error('Fail PDF tidak dapat dibaca. Sila gunakan PDF yang sah, mempunyai muka surat dan tidak dilindungi kata laluan.'),{status:400});
 }
}

app.get('/api/health', (_req,res)=>{
 res.set('Cache-Control','no-store');
 res.json({status:'ok',service:'ProSijil',storage_version:2,commit:process.env.VERCEL_GIT_COMMIT_SHA || null});
});
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

app.get('/api/public/stats',async(_req,res,next)=>{
 try {
 const total=Number((await readRows('SELECT count(*) AS n FROM sijil'))[0].n);
 res.json({certificates:total});
 } catch(error) { next(error); }
});
app.get('/api/public/contact',async(_req,res,next)=>{
 try { res.set('Cache-Control','no-store'); res.json(await readSupportContacts()); } catch(error) { next(error); }
});
app.post('/api/public/reports',reportLimit,async(req,res,next)=>{
 try { const result=await createPublicReport(req.body); res.set('Cache-Control','no-store'); res.status(result.created?201:200).json(result.receipt); } catch(error) { next(error); }
});
app.get('/api/admin/support-contact',requireAdmin,async(_req,res,next)=>{
 try { res.set('Cache-Control','no-store'); res.json(await readSupportContacts()); } catch(error) { next(error); }
});
app.put('/api/admin/support-contact',requireAdmin,async(req,res,next)=>{
 try { res.set('Cache-Control','no-store'); res.json(await saveSupportContacts(req.body)); } catch(error) { next(error); }
});
app.get('/api/admin/reports',requireAdmin,async(req,res,next)=>{
 try { res.set('Cache-Control','no-store'); res.json(await listPublicReports(req.query)); } catch(error) { next(error); }
});
app.get('/api/admin/reports/:id',requireAdmin,async(req,res,next)=>{
 try { const id=cleanId(req.params.id); if(!id)return fail(res,'ID laporan tidak sah.'); const report=await readPublicReport(id); if(!report)return fail(res,'Laporan tidak ditemui.',404); res.set('Cache-Control','no-store'); res.json(report); } catch(error) { next(error); }
});
app.put('/api/admin/reports/:id',requireAdmin,async(req,res,next)=>{
 try { const id=cleanId(req.params.id); if(!id)return fail(res,'ID laporan tidak sah.'); const report=await updatePublicReport(id,req.body,req.admin.username); if(!report)return fail(res,'Laporan tidak ditemui.',404); res.set('Cache-Control','no-store'); res.json(report); } catch(error) { next(error); }
});
function cleanSearchText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[’‘`']/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

app.get('/api/public/search',searchLimit,async(req,res,next)=>{
 try {
 const rawQ=trim(req.query.q,160);
 if (rawQ.length < 3) return fail(res,'Masukkan nama penuh atau ID (minima 3 aksara).');

 const qClean = cleanSearchText(rawQ);
 const qWords = qClean.split(' ').filter(w => w.length > 0);
 if (qWords.length === 0) return res.json({results:[]});

 // 1. Fast SQL query first (exact match, case-insensitive)
 let records = await readRows('SELECT id,nama_penuh,no_kp_atau_id,peringkat,cawangan,tarikh_daftar FROM pesilat WHERE nama_penuh=? COLLATE NOCASE OR no_kp_atau_id=? COLLATE NOCASE LIMIT 15',[rawQ,rawQ]);

 // 2. If no exact match, perform flexible normalized search across pesilat (case, punctuation & partial insensitive)
 if (!records.length) {
   const allStudents = await readRows('SELECT id,nama_penuh,no_kp_atau_id,peringkat,cawangan,tarikh_daftar FROM pesilat');
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

 const result=await Promise.all(records.map(async student=>{
   const certificates=await readRows('SELECT id,nama_sijil,tarikh_isu,public_token FROM sijil WHERE pesilat_id=? ORDER BY tarikh_isu DESC,id DESC',[student.id]);
   return {id:student.id,nama_penuh:student.nama_penuh,no_kp_atau_id:student.no_kp_atau_id,tarikh_daftar:student.tarikh_daftar,peringkat:student.peringkat,cawangan:student.cawangan,certificates};
 }));
 res.setHeader('Cache-Control','no-store');
 res.json({results:result});
 } catch(error) { next(error); }
});
async function readCertificate(token, withFile=false) {
 const { isTursoConfigured, getTursoClient } = await import('./turso.js');
 if(isTursoConfigured()){
  const result=await getTursoClient().execute({
   sql:`SELECT s.id,s.pesilat_id,s.nama_sijil,s.tarikh_isu,s.jenis,s.file_path,s.file_type,s.public_token,s.kategori${withFile?',s.file_base64':''},p.nama_penuh,p.no_kp_atau_id,p.peringkat,p.cawangan,p.tarikh_daftar FROM sijil s JOIN pesilat p ON p.id=s.pesilat_id WHERE s.public_token=?`,
   args:[token]
  });
  return result.rows[0];
 }
 const certificate=db.prepare(`SELECT s.*,p.nama_penuh,p.no_kp_atau_id,p.peringkat,p.cawangan,p.tarikh_daftar FROM sijil s JOIN pesilat p ON p.id=s.pesilat_id WHERE s.public_token=?`).get(token);
 return certificate;
}
app.get('/api/public/verify/:token',searchLimit,async(req,res,next)=>{
 try {
 const row=await readCertificate(req.params.token);
 if(!row)return fail(res,'Sijil tidak ditemui atau tidak lagi sah.',404);
 return res.json({valid:true,certificate:{id:row.id,nama_sijil:row.nama_sijil,tarikh_isu:row.tarikh_isu,nama_penuh:row.nama_penuh,no_kp_atau_id:row.no_kp_atau_id,peringkat:row.peringkat,cawangan:row.cawangan,tarikh_daftar:row.tarikh_daftar}});
 } catch(error) { next(error); }
});
app.get('/api/public/certificates/:token/download',searchLimit,async(req,res,next)=>{
 try {
  let row=await readCertificate(req.params.token,true);
  if(!row)return fail(res,'Sijil tidak ditemui.',404);
  const student={nama_penuh:row.nama_penuh,peringkat:row.peringkat,cawangan:row.cawangan};
  row=await ensureCertificateFile(row);
  if(!row)return fail(res,'Sijil tidak ditemui.',404);
  // Always use the current durable bytes, even when an old disk/cache copy exists.
  return uploadedToPdf(res,row,student,req.query.preview!=='1');
 }catch(error){next(error);}
});

app.get('/api/admin/dashboard',requireAdmin,async(_req,res,next)=>{
 try {
 const snapshot=await readDashboard();
 res.set('Cache-Control','no-store');
 res.json(snapshot);
 } catch(error) { next(error); }
});

app.get('/api/admin/recent-activity', requireAdmin, async (req, res) => {
 try {
  // Segerakkan aktiviti terkini dari Turso Cloud jika ada sambungan awan
  try {
    const { isTursoConfigured, getTursoClient } = await import('./turso.js');
    if (isTursoConfigured()) {
      const turso = getTursoClient();
      const remoteActs = await turso.execute('SELECT id, type, action, title, detail, target_url, students_before, students_after, certs_before, certs_after, templates_before, templates_after, created_at FROM admin_activity ORDER BY id DESC LIMIT 150');
      if (remoteActs.rows && remoteActs.rows.length > 0) {
        const actStmt = db.prepare(`
          INSERT OR REPLACE INTO admin_activity (
            id, type, action, title, detail, target_url,
            students_before, students_after,
            certs_before, certs_after,
            templates_before, templates_after,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const row of remoteActs.rows) {
          actStmt.run(
            row.id, row.type, row.action, row.title, row.detail, row.target_url,
            row.students_before, row.students_after,
            row.certs_before, row.certs_after,
            row.templates_before, row.templates_after,
            row.created_at
          );
        }
      }
    }
  } catch (syncErr) {
    console.warn('[Recent Activity Turso Pull Warning]', syncErr.message);
  }

  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  const type = trim(req.query.type, 30);
  let query = 'SELECT id, type, action, title, detail, target_url, students_before, students_after, certs_before, certs_after, templates_before, templates_after, created_at FROM admin_activity';
  const params = [];
  if (type && type !== 'all') {
   query += ' WHERE type = ?';
   params.push(type);
  }
  query += ' ORDER BY id DESC LIMIT ?';
  params.push(limit);
  const activities = db.prepare(query).all(...params);
  res.json({ success: true, activities });
 } catch (err) {
  res.status(500).json({ error: 'Gagal memuat aktiviti terkini: ' + err.message });
 }
});

app.delete('/api/admin/recent-activity', requireAdmin, async (_req, res) => {
 try {
  db.prepare('DELETE FROM admin_activity').run();
  try {
    const { isTursoConfigured, getTursoClient } = await import('./turso.js');
    if (isTursoConfigured()) {
      const turso = getTursoClient();
      await turso.execute('DELETE FROM admin_activity');
    }
  } catch (e) {
    console.warn('[Turso Delete Activity Warning]', e.message);
  }
  res.json({ success: true, message: 'Log aktiviti berjaya dibersihkan.' });
 } catch (err) {
  res.status(500).json({ error: 'Gagal membersihkan log aktiviti.' });
 }
});
app.get('/api/admin/branches',requireAdmin,async(_req,res,next)=>{
 try{res.set('Cache-Control','no-store');res.json({rows:await listBranches()});}
 catch(error){next(error);}
});
app.post('/api/admin/branches',requireAdmin,async(req,res,next)=>{
 try{
  const row=await saveBranch(req.body||{});
  logActivity('branch','create','Cawangan Ditambah',row.nama_cawangan,'/admin/cawangan');
  res.status(201).json(row);
 }catch(error){next(error);}
});
app.put('/api/admin/branches/:id',requireAdmin,async(req,res,next)=>{
 try{
  const id=cleanId(req.params.id);if(!id)return fail(res,'ID cawangan tidak sah.');
  const row=await saveBranch(req.body||{},id);if(!row)return fail(res,'Cawangan tidak ditemui.',404);
  logActivity('branch','update','Cawangan Dikemaskini',row.nama_cawangan,'/admin/cawangan');
  res.json(row);
 }catch(error){next(error);}
});
app.get('/api/admin/students',requireAdmin,async(req,res,next)=>{
 try {
 const q=trim(req.query.q,160),branch=trim(req.query.branch,160),level=trim(req.query.level,90);
 const page=Math.max(1,Math.min(9999,Number(req.query.page)||1));
 const limit=Math.max(1,Math.min(10000,Number(req.query.limit)||20));
 const where=[];const p=[];
 if(q){where.push('(p.nama_penuh LIKE ? OR p.no_kp_atau_id LIKE ?)');p.push(`%${q}%`,`%${q}%`);}
 if(branch){where.push('trim(p.cawangan)=? COLLATE NOCASE');p.push(branch);}
 if(level){
  const cleanLevel=level.replace(/^ujian\s+/i,'');
  where.push('(p.peringkat=? OR p.peringkat=? OR p.peringkat=? COLLATE NOCASE)');
  p.push(level,cleanLevel,'Ujian '+cleanLevel);
 }
 const w=where.length?' WHERE '+where.join(' AND '):'';
 const total=Number((await readRows('SELECT count(*) as n FROM pesilat p'+w,p))[0].n);
 const rows=await readRows('SELECT p.*,(SELECT count(*) FROM sijil s WHERE s.pesilat_id=p.id) as sijil_count FROM pesilat p'+w+' ORDER BY p.id DESC LIMIT ? OFFSET ?',[...p,limit,(page-1)*limit]);
 const levels=(await readRows('SELECT DISTINCT peringkat FROM pesilat ORDER BY peringkat')).map(x=>x.peringkat);
 const branches=(await readRows(BRANCH_NAMES_SQL)).map(x=>x.nama);
 res.set('Cache-Control','no-store');
 res.json({rows,total,page,pages:Math.max(1,Math.ceil(total/limit)),levels,branches});
 } catch(error) { next(error); }
});
app.post('/api/admin/students',requireAdmin,async(req,res,next)=>{
 try {
  const countsBefore=getSystemCounts();
  const values=validatePesilat(req.body||{});
  const saved=await saveStudent(values);
  logActivity('student','create','Pesilat Didaftarkan',saved.nama_penuh,'/admin/pesilat',{countsBefore,countsAfter:getSystemCounts()});
  res.status(201).json(saved);
 } catch(error) { next(error); }
});
app.put('/api/admin/students/:id',requireAdmin,async(req,res,next)=>{
 try {
  const id=cleanId(req.params.id);if(!id)return fail(res,'ID pesilat tidak sah.');
  const before=await getStoredStudent(id);if(!before)return fail(res,'Pesilat tidak ditemui.',404);
  const countsBefore=getSystemCounts();
  const values=validatePesilat({...before,...req.body});
  values.no_kp_atau_id=values.no_kp_atau_id||before.no_kp_atau_id;
  const saved=await saveStudent(values,id);
  if(!saved)return fail(res,'Pesilat tidak ditemui.',404);
  logActivity('student','update','Pesilat Dikemaskini',saved.nama_penuh,'/admin/pesilat',{countsBefore,countsAfter:getSystemCounts()});
  res.json(saved);
 } catch(error) { next(error); }
});
app.delete('/api/admin/students/:id',requireAdmin,async(req,res,next)=>{
 try {
  const id=cleanId(req.params.id);if(!id)return fail(res,'ID pesilat tidak sah.');
  const countsBefore=getSystemCounts();
  const certs=db.prepare('SELECT file_path FROM sijil WHERE pesilat_id=?').all(id);
  const row=await deleteStudent(id);if(!row)return fail(res,'Pesilat tidak ditemui.',404);
  for(const cert of certs)if(cert.file_path){try{fs.rmSync(cert.file_path,{force:true});}catch(_){}}
  logActivity('student','delete','Pesilat Dipadam',row.nama_penuh,'/admin/pesilat',{countsBefore,countsAfter:getSystemCounts()});
  res.json({success:true});
 } catch(error) { next(error); }
});
app.get('/api/admin/students/:id/certificates',requireAdmin,async(req,res,next)=>{
 try {
  const id=cleanId(req.params.id);if(!id)return fail(res,'ID pesilat tidak sah.');
  const student=await getStoredStudent(id);if(!student)return fail(res,'Pesilat tidak ditemui.',404);
  const rows=await readRows('SELECT id,pesilat_id,nama_sijil,tarikh_isu,jenis,file_type,public_token,created_at FROM sijil WHERE pesilat_id=? ORDER BY tarikh_isu DESC,id DESC',[id]);
  res.json({student,certificates:rows});
 } catch(error) { next(error); }
});
app.get('/api/admin/students/export',requireAdmin,async (req,res,next)=>{
 try {
  const q=trim(req.query.q,160);
  const branch=trim(req.query.branch || req.query.cawangan,160);
  const level=trim(req.query.level || req.query.peringkat,90);

  const where=[];const p=[];
  if(q){where.push('(p.nama_penuh LIKE ? OR p.no_kp_atau_id LIKE ?)');p.push(`%${q}%`,`%${q}%`);}
  if(branch){where.push('trim(p.cawangan)=? COLLATE NOCASE');p.push(branch);}
  if(level){
   const cleanLevel=level.replace(/^ujian\s+/i,'');
   where.push('(p.peringkat=? OR p.peringkat=? OR p.peringkat=? COLLATE NOCASE)');
   p.push(level,cleanLevel,'Ujian '+cleanLevel);
  }
  const w=where.length?' WHERE '+where.join(' AND '):'';
  const rows=await readRows('SELECT p.nama_penuh, p.no_kp_atau_id, p.peringkat, p.cawangan, p.tarikh_daftar, (SELECT count(*) FROM sijil s WHERE s.pesilat_id=p.id) as jumlah_sijil FROM pesilat p'+w+' ORDER BY p.cawangan, p.peringkat, p.nama_penuh',p);

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
app.post('/api/admin/students/import',requireAdmin,upload.single('file'),async(req,res,next)=>{
 if(!req.file)return fail(res,'Sila pilih fail CSV.');
 if(!req.file.originalname.toLowerCase().endsWith('.csv'))return fail(res,'Format fail mestilah .csv.');
 try {
  const countsBefore=getSystemCounts();
  let rows;
  try { rows=decodeCsv(req.file.buffer); }
  catch(error) { return fail(res,error.message); }
  const existing=await readRows('SELECT nama_penuh,no_kp_atau_id,cawangan FROM pesilat');
  const key=value=>String(value).replace(/[A-Z]/g,char=>char.toLowerCase());
  const nameKey=row=>JSON.stringify([key(row.nama_penuh),key(row.cawangan)]);
  const knownIds=new Set(existing.map(row=>key(row.no_kp_atau_id)));
  const knownNames=new Set(existing.map(nameKey));
  const pending=[];
  let inserted=0,skipped=0;const errors=[];
  for(const row of rows){
   let values;
   try { values=validatePesilat(row); }
   catch(error){errors.push('Baris '+row.baris+': '+error.message);skipped++;continue;}
   const duplicate=values.no_kp_atau_id?knownIds.has(key(values.no_kp_atau_id)):knownNames.has(nameKey(values));
   if(duplicate){skipped++;continue;}
   if(values.no_kp_atau_id)knownIds.add(key(values.no_kp_atau_id));
   knownNames.add(nameKey(values));
   pending.push(values);
  }
  for(let offset=0;offset<pending.length;offset+=50){
   const chunk=pending.slice(offset,offset+50);
   try {
    const saved=await insertStudentBatch(chunk);
    inserted+=saved;skipped+=chunk.length-saved;
   }
   catch(error){
    // Count only durable writes. Preserve confirmed progress on a cloud outage.
    return res.status(503).json({error:`Import terhenti kerana simpanan gagal. ${inserted} rekod telah disahkan tersimpan. Sila cuba semula; rekod yang sudah disimpan akan dilangkau.`,total:rows.length,inserted,skipped,errors:errors.slice(0,25)});
   }
  }
  logActivity('student','import_csv','Import Pesilat CSV',inserted+' pesilat ditambah, '+skipped+' dilangkau ('+rows.length+' rekod)','/admin/pesilat',{countsBefore,countsAfter:getSystemCounts()});
  res.json({total:rows.length,inserted,skipped,errors:errors.slice(0,25)});
 } catch(error){next(error);}
});

app.get('/api/admin/certificates',requireAdmin,async(req,res,next)=>{
 try {
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
  conditions.push('trim(p.cawangan) = ? COLLATE NOCASE');
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
 const offset=fetchAll?0:(page-1)*limit;
 // Keep PDFs out of list responses; bulk PDF data can exceed the serverless response limit.
 const statements = [
  { sql: 'SELECT count(*) AS n'+from+filter, args: params },
  { sql: 'SELECT s.id,s.pesilat_id,s.nama_sijil,s.tarikh_isu,s.jenis,s.file_type,s.public_token,s.kategori,s.created_at,s.batch_id,s.template_name,p.nama_penuh,p.no_kp_atau_id,p.peringkat,p.cawangan'+from+filter+' ORDER BY p.cawangan, p.peringkat, s.id DESC'+(fetchAll?'':' LIMIT ? OFFSET ?'), args: fetchAll?params:[...params,limit,offset] },
  { sql: "SELECT p.cawangan AS name, count(s.id) AS count FROM sijil s JOIN pesilat p ON p.id=s.pesilat_id WHERE p.cawangan IS NOT NULL AND p.cawangan != '' GROUP BY p.cawangan COLLATE NOCASE ORDER BY p.cawangan", args: [] },
  { sql: "SELECT p.peringkat AS name, count(s.id) AS count FROM sijil s JOIN pesilat p ON p.id=s.pesilat_id WHERE p.peringkat IS NOT NULL AND p.peringkat != '' GROUP BY p.peringkat ORDER BY p.peringkat", args: [] },
 ];
 const remote = await studentClient();
 const results = remote
  ? (await remote.batch(statements, 'read')).map(result => result.rows)
  : statements.map(({sql,args}) => db.prepare(sql).all(...args));
 const total=Number(results[0][0].n);
 const [,rows,branches,levels]=results;
 res.set('Cache-Control', 'no-store');
 res.json({rows,total,page,pages:Math.max(1,Math.ceil(total/limit)),branches,levels});
 } catch (error) { next(error); }
});
app.post('/api/admin/certificates',requireAdmin,upload.single('file'),async(req,res,next)=>{
 try {
  const id=cleanId(req.body?.pesilat_id);if(!id)return fail(res,'Sila pilih pesilat.');
  const student=await getStoredStudent(id);if(!student)return fail(res,'Pesilat tidak ditemui.',404);
  const title=trim(req.body?.nama_sijil,130),tarikh=trim(req.body?.tarikh_isu,10)||today();
  const kategori=trim(req.body?.kategori,50)||'kenaikan_tali_pinggang';
  if(title.length<3)return fail(res,'Nama sijil perlu sekurang-kurangnya 3 aksara.');
  if(!validDate(tarikh))return fail(res,'Tarikh sijil tidak sah.');
  const fileType=req.file?certificateFileType(req.file.buffer):null;
  if(req.file&&!fileType)return fail(res,'Hanya fail PDF, PNG atau JPG yang sah diterima.');
  const countsBefore=getSystemCounts(),token=crypto.randomUUID();
  const jenis=req.file?'uploaded':'generated';
  const newCertId=await saveCertificate({studentId:id,namaSijil:title,tarikh,jenis,
   fileType,fileBase64:req.file?.buffer.toString('base64'),token,kategori});
  logActivity('certificate','create',req.file?'Sijil Dimuat Naik':'Sijil Dikeluarkan',title+' ('+student.nama_penuh+')','/admin/sijil',{countsBefore,countsAfter:getSystemCounts()});
  res.status(201).json({id:newCertId,public_token:token,kategori});
 }catch(error){next(error);}
});
app.put('/api/admin/certificates/:id',requireAdmin,upload.single('file'),async(req,res,next)=>{
 try {
  const id=cleanId(req.params.id);if(!id)return fail(res,'ID tidak sah.');
  const current=await getStoredCertificate(id);if(!current)return fail(res,'Sijil tidak ditemui.',404);
  const title=trim(req.body?.nama_sijil,130)||current.nama_sijil;
  const tarikh=trim(req.body?.tarikh_isu,10)||current.tarikh_isu;
  const kategori=trim(req.body?.kategori,50)||current.kategori||'kenaikan_tali_pinggang';
  if(title.length<3)return fail(res,'Nama sijil perlu sekurang-kurangnya 3 aksara.');
  if(!validDate(tarikh))return fail(res,'Tarikh sijil tidak sah.');
  const fileType=req.file?certificateFileType(req.file.buffer):null;
  if(req.file&&!fileType)return fail(res,'Hanya fail PDF, PNG atau JPG yang sah diterima.');
  const countsBefore=getSystemCounts();
  const changes={namaSijil:title,tarikh,kategori};
  if(req.file)Object.assign(changes,{fileType,fileBase64:req.file.buffer.toString('base64')});
  const saved=await updateStoredCertificate(id,changes);
  if(!saved)return fail(res,'Sijil tidak ditemui.',404);
  logActivity('certificate','update','Sijil Dikemaskini',title,'/admin/sijil',{countsBefore,countsAfter:getSystemCounts()});
  res.json({id,nama_sijil:saved.nama_sijil,tarikh_isu:saved.tarikh_isu,jenis:saved.jenis,kategori:saved.kategori,public_token:saved.public_token});
 }catch(error){next(error);}
});
app.delete('/api/admin/certificates/:id',requireAdmin,async (req,res,next)=>{
 try {
 const id=cleanId(req.params.id);if(!id)return fail(res,'ID tidak sah.');
 const countsBefore = getSystemCounts();
 const [row]=await deleteStoredCertificates([id]);
 if(!row)return fail(res,'Sijil tidak ditemui.',404);
 if(row.file_path){try{fs.rmSync(row.file_path,{force:true});}catch(_){}}

 logActivity('certificate', 'delete', 'Sijil Dipadam', `${row.nama_sijil || 'Sijil'} (${row.public_token || id})`, '/admin/sijil', { countsBefore, countsAfter: getSystemCounts() });

 return res.json({success:true});
 }catch(e){next(e);}
});
app.post('/api/admin/certificates/batch-delete',requireAdmin,async (req,res,next)=>{
 try {
 const ids=Array.isArray(req.body?.ids)?req.body.ids.map(cleanId).filter(Boolean):[];
 if(!ids.length)return fail(res,'Sila pilih sekurang-kurangnya satu sijil.');
 const countsBefore = getSystemCounts();

 const rows=await deleteStoredCertificates(ids);

 for(const r of rows){
  if(r.file_path){try{fs.rmSync(r.file_path,{force:true});}catch(_){}}
 }

 logActivity('certificate', 'delete', 'Padam Sijil Pukal', `${rows.length} sijil telah dipadam`, '/admin/sijil', { countsBefore, countsAfter: getSystemCounts() });

 return res.json({success:true,deletedCount:rows.length});
 }catch(e){next(e);}
});

app.get('/api/admin/templates',requireAdmin,async (req,res,next)=>{
 try {
  const category = trim(req.query?.category || req.query?.kategori, 60);
  const rows=await listStoredTemplates({category});
  res.set('Cache-Control','no-store');
  res.json({rows});
 } catch(err) { next(err); }
});

const templateUpload=uploadTemplate.fields([{name:'file',maxCount:1},{name:'file_page1',maxCount:1},{name:'file_page2',maxCount:1}]);
async function storeTemplateUpload(req,res,next){
 try {
  const id=req.params.id?cleanId(req.params.id):null;
  if(req.params.id&&!id)return fail(res,'ID tidak sah.');
  const countsBefore = getSystemCounts();
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
    const doc1 = await loadTemplatePdf(b1);
    const doc2 = await loadTemplatePdf(b2);
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
    const doc = await loadTemplatePdf(bytes);
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

  const thumbnail = typeof req.body?.thumbnail === 'string' && req.body.thumbnail.startsWith('data:image/')
    ? req.body.thumbnail.trim()
    : null;

  const layout_config = typeof req.body?.layout_config === 'string'
    ? req.body.layout_config.trim()
    : (req.body?.layout_config ? JSON.stringify(req.body.layout_config) : null);

  const saved = await saveTemplate({nama_template:nama,peringkat,keterangan,file_name,
    file_size:finalBytes.length,file_base64:finalBytes.toString('base64'),kategori,
    page_count:actualPageCount,thumbnail_base64:thumbnail,layout_config},id);
  if(!saved)return fail(res,'Templat telah dipadam atau tidak wujud.',404);
  const newId = Number(saved.id);

  logActivity('template', id?'update':'create', id?'Templat Dikemaskini':'Templat Dimuat Naik', `${nama} (${peringkat || 'Semua Peringkat'})`, '/admin/templates', { countsBefore, countsAfter: getSystemCounts() });

  return res.status(id?200:201).json({ id: newId, nama_template: nama, peringkat, kategori, page_count: actualPageCount, file_name, layout_config });
 } catch (e) { next(e); }
}
app.post('/api/admin/templates',requireAdmin,templateUpload,storeTemplateUpload);
app.put('/api/admin/templates/:id',requireAdmin,templateUpload,storeTemplateUpload);

app.delete('/api/admin/templates/:id',requireAdmin,async (req,res,next)=>{
 try {
  const id=cleanId(req.params.id);if(!id)return fail(res,'ID tidak sah.');
  const countsBefore = getSystemCounts();
  const row=await deleteStoredTemplate(id);
  if(!row)return fail(res,'Templat telah dipadam atau tidak wujud.',404);
  if(row.file_path){try{fs.rmSync(row.file_path,{force:true});}catch(_){}}

  logActivity('template', 'delete', 'Templat Dipadam', `${row.nama_template || 'Templat'} (${row.peringkat || ''})`, '/admin/templates', { countsBefore, countsAfter: getSystemCounts() });

  return res.json({success:true});
 }catch(e){next(e);}
});

app.get('/api/admin/templates/:id/preview',requireAdmin,async (req,res,next)=>{
 try {
 const id=cleanId(req.params.id);if(!id)return fail(res,'ID tidak sah.');
 const row=await getStoredTemplate(id);
 if(!row)return fail(res,'Templat telah dipadam atau tidak wujud.',404);

 res.type('application/pdf');
 res.setHeader('Content-Disposition',`inline; filename="${encodeURIComponent(row.file_name || 'template.pdf')}"`);
 res.setHeader('Cache-Control','private, no-store');
 return res.send(Buffer.from(row.file_base64,'base64'));
 } catch(error) { next(error); }
});

app.get('/api/admin/templates/:id/thumbnail',async (req,res)=>{
 try {
  const id=cleanId(req.params.id);if(!id)return fail(res,'ID tidak sah.');
  const row=await getTemplateMetadata(id);
  if(!row?.thumbnail_base64){
   return fail(res,'Thumbnail tidak ditemui.',404);
  }
  const cleanB64 = row.thumbnail_base64.replace(/^data:image\/[a-z]+;base64,/, '');
  const buf = Buffer.from(cleanB64, 'base64');
  res.type('image/jpeg');
  res.setHeader('Cache-Control','public, max-age=86400, stale-while-revalidate=604800');
  return res.send(buf);
 } catch(err) {
  return fail(res, err.message, 500);
 }
});

app.post('/api/admin/templates/:id/thumbnail',requireAdmin,async (req,res,next)=>{
 try {
  const id=cleanId(req.params.id);if(!id)return fail(res,'ID tidak sah.');
  const thumbnail=String(req.body?.thumbnail||req.body?.thumbnail_base64||'').trim();
  if(!thumbnail)return fail(res,'Thumbnail diperlukan.');
  const row=await updateTemplateMetadata(id,'thumbnail_base64',thumbnail);
  if(!row)return fail(res,'Templat telah dipadam atau tidak wujud.',404);

  return res.json({success:true, id});
 }catch(e){next(e);}
});

app.post('/api/admin/templates/:id/layout',requireAdmin,async (req,res,next)=>{
 try {
  const id=cleanId(req.params.id);if(!id)return fail(res,'ID tidak sah.');
  const countsBefore = getSystemCounts();
  const layoutConfig = typeof req.body?.layout_config === 'string'
    ? req.body.layout_config.trim()
    : (req.body?.layout_config ? JSON.stringify(req.body.layout_config) : null);

  const tplRow=await updateTemplateMetadata(id,'layout_config',layoutConfig);
  if(!tplRow)return fail(res,'Templat telah dipadam atau tidak wujud.',404);
  logActivity('template', 'update_layout', 'Reka Bentuk Templat Dikemaskini', `${tplRow?.nama_template || 'Templat'} (${tplRow?.peringkat || ''})`, '/admin/templates', { countsBefore, countsAfter: getSystemCounts() });

  return res.json({success:true, id, layout_config: layoutConfig});
 }catch(e){next(e);}
});

app.get('/api/admin/templates/groups',requireAdmin,async (req,res,next)=>{
 try {
  const rows=await listStoredTemplates();
  const groups=Object.create(null);
  for(const r of rows){
   if(!groups[r.nama_template])groups[r.nama_template]=[];
   groups[r.nama_template].push(r);
  }
  res.set('Cache-Control','no-store');
  res.json({groups,templates:rows});
 } catch(err) { next(err); }
});

app.post('/api/admin/templates/test-preview',requireAdmin,async(req,res,next)=>{
 try{
  const templateId=cleanId(req.body?.template_id);
  const studentName=trim(req.body?.student_name,120)||'NUR AISYAH BINTI ABDULLAH';
  if(!templateId)return fail(res,'Sila pilih templat.');
  const row=await getStoredTemplate(templateId);
  if(!row)return fail(res,'Templat telah dipadam atau tidak wujud.',404);
  const tplBytes=Buffer.from(row.file_base64,'base64');

  const layoutConfig = req.body?.layout_config || row.layout_config;
  const result=await generateCertificatePdf({templateBytes:tplBytes,studentName,layoutConfig});
  res.type('application/pdf');
  res.setHeader('Content-Disposition','inline; filename="preview-ujian.pdf"');
  res.setHeader('Cache-Control','private, no-store');
  return res.send(Buffer.from(result.bytes));
 }catch(e){next(e);}
});

app.post('/api/admin/templates/generation-status',requireAdmin,async(req,res,next)=>{
 try {
  const ids=Array.isArray(req.body?.pesilat_ids)?[...new Set(req.body.pesilat_ids.map(cleanId).filter(Boolean))]:[];
  const requestId=trim(req.body?.request_id,100);
  if(!requestId || !ids.length || ids.length>500)return fail(res,'ID janaan dan senarai pesilat yang sah diperlukan (maksimum 500).');
  res.set('Cache-Control','no-store');
  res.json(await getGenerationStatus(req.admin.id,requestId,ids));
 }catch(error){next(error);}
});
app.post('/api/admin/templates/generate-batch',requireAdmin,async(req,res,next)=>{
 try{
  const countsBefore = getSystemCounts();
  const ids=Array.isArray(req.body?.pesilat_ids)?[...new Set(req.body.pesilat_ids.map(cleanId).filter(Boolean))]:[];
  if(!ids.length)return fail(res,'Sila pilih sekurang-kurangnya seorang pesilat.');
  if(ids.length>25)return fail(res,'Maksimum 25 pesilat bagi setiap kelompok janaan.');
  const requestId=trim(req.body?.request_id,100);
  const namaTemplate=trim(req.body?.nama_template,160);
  if(!namaTemplate)return fail(res,'Sila pilih atau masukkan nama templat sijil.');
  const tarikh=trim(req.body?.tarikh_isu,10)||today();
  if(!validDate(tarikh))return fail(res,'Tarikh sijil tidak sah.');
  let category=trim(req.body?.kategori,60);
  if(category&&!['kenaikan_tali_pinggang','pencapaian','penghargaan','penyertaan'].includes(category))return fail(res,'Jenis sijil tidak sah.');
  const batchId=generationBatchId(req.admin.id,requestId||crypto.randomUUID());
  const [priorBatch]=await readRows('SELECT template_name,tarikh_isu,kategori FROM sijil WHERE batch_id=? LIMIT 1',[batchId]);
  if(priorBatch&&(priorBatch.template_name!==namaTemplate||priorBatch.tarikh_isu!==tarikh||(category&&category!==priorBatch.kategori)))return fail(res,'Batch ini telah digunakan untuk templat atau tarikh lain. Mulakan janaan baharu.',409);
  if(!category&&priorBatch)category=priorBatch.kategori;

  const confirmed=requestId ? await getGenerationStatus(req.admin.id,requestId,ids) : {generatedTokens:[]};
  const existing=new Map(confirmed.generatedTokens.map(row=>[row.studentId,row]));
  if(existing.size===ids.length)return res.json({...confirmed});
  let templates=await listStoredTemplates({name:namaTemplate});
  if(category)templates=templates.filter(template=>(template.kategori||'kenaikan_tali_pinggang')===category);
  else if(new Set(templates.map(template=>template.kategori||'kenaikan_tali_pinggang')).size>1)return fail(res,'Nama templat ini digunakan oleh beberapa jenis sijil. Sila pilih jenis sijil.');
  if(!templates.length)return fail(res,'Tiada templat dijumpai untuk tajuk sijil ini.');

  const placeholders=ids.map(()=>'?').join(',');
  const students=await readRows(`SELECT * FROM pesilat WHERE id IN (${placeholders})`,ids);

  let successCount=0;
  const foundIds=new Set(students.map(student=>student.id));
  const failed=ids.filter(id=>!foundIds.has(id)).map(id=>({id,reason:'Pesilat tidak ditemui. Sila muat semula senarai pesilat.',retryable:false}));
  const generatedTokens=[];
  const templateCache=new Map();

  const norm = s => String(s || '').trim().toLowerCase().replace(/^ujian\s+/i, '').replace(/\s+/g, ' ');

  for(const student of students){
   if(existing.has(student.id)){
    successCount++;generatedTokens.push({...existing.get(student.id),nama:student.nama_penuh});continue;
   }
   let matchedTemplate=templates.find(t=>norm(t.peringkat)===norm(student.peringkat) || t.peringkat.trim().toLowerCase()===student.peringkat.trim().toLowerCase());
   if(!matchedTemplate){
    matchedTemplate=templates.find(t=>t.peringkat.trim().toLowerCase()==='semua peringkat');
   }
   if(!matchedTemplate && templates[0]?.kategori !== 'kenaikan_tali_pinggang'){
    matchedTemplate=templates[0];
   }

   if(!matchedTemplate){
    failed.push({id:student.id,nama:student.nama_penuh,peringkat:student.peringkat,retryable:false,reason:`Tiada templat PDF untuk peringkat "${student.peringkat}"`});
    continue;
   }

   let tplBytes=templateCache.get(matchedTemplate.id);
   if(!tplBytes){
    try {
     const stored=await getStoredTemplate(matchedTemplate.id);
     if(stored){
      tplBytes=Buffer.from(stored.file_base64,'base64');
      matchedTemplate.layout_config=stored.layout_config;
      templateCache.set(matchedTemplate.id,tplBytes);
     }
    } catch(error) {
     failed.push({id:student.id,nama:student.nama_penuh,peringkat:student.peringkat,reason:error.message});
     continue;
    }
   }

   if(!tplBytes){
    failed.push({id:student.id,nama:student.nama_penuh,peringkat:student.peringkat,reason:`Fail templat PDF tidak wujud untuk peringkat "${student.peringkat}"`});
    continue;
   }

   try{
    // Retrying the same batch must reuse its token, including after a lost HTTP response.
    const token=requestId
      ? generationToken(req.admin.id,requestId,student.id)
      : crypto.randomUUID();
    const generated=await generateCertificatePdf({
     templateBytes:tplBytes,
     studentName:student.nama_penuh,
     layoutConfig:matchedTemplate.layout_config
    });

    await saveCertificate({
     studentId:student.id,
     namaSijil:matchedTemplate.nama_template,
     tarikh,
     fileBase64:Buffer.from(generated.bytes).toString('base64'),
     token,
     kategori: matchedTemplate.kategori || 'kenaikan_tali_pinggang',
     jenis:'generated',batchId,templateName:namaTemplate
    });
    successCount++;
    generatedTokens.push({studentId:student.id,nama:student.nama_penuh,token});
   }catch(err){
    failed.push({id:student.id,nama:student.nama_penuh,peringkat:student.peringkat,reason:err.message,retryable:!(/SQLITE_FULL|database or disk is full/i.test(err.message))});
   }
  }

  if(successCount>0){
    const tplName = namaTemplate;
    const detailMsg = failed.length > 0
      ? `${successCount} sijil berjaya dijana, ${failed.length} dilangkau (${tplName})`
      : `${successCount} sijil dijana (${tplName})`;
    logActivity('certificate', 'generate_batch', 'Janaan Sijil Pukal', detailMsg, '/admin/sijil', { countsBefore, countsAfter: getSystemCounts() });

  } else if (failed.length > 0) {
   logActivity('certificate', 'generate_batch', 'Janaan Sijil Dilangkau', `${failed.length} pesilat dilangkau (${failed[0]?.reason || 'Tiada templat sepadan: ' + namaTemplate})`, '/admin/jana-sijil', { countsBefore, countsAfter: getSystemCounts() });
  }

  res.json({
   batchId,
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
 const countsBefore = getSystemCounts();
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

 logActivity('settings', 'update', 'Tetapan Sistem Disimpan', 'Konfigurasi organisasi dan penandatangan dikemaskini', '/admin/tetapan', { countsBefore, countsAfter: getSystemCounts() });

 res.json(getSettings());
});

const dist=path.join(projectRoot,'client/dist');
if(fs.existsSync(dist)){
 app.use(express.static(dist,{index:false}));
 app.get('*',(req,res,next)=>{if(req.path.startsWith('/api/'))return next();res.sendFile(path.join(dist,'index.html'));});
}
app.use((req,res)=>res.status(404).json({error:'Laluan tidak ditemui.'}));
app.use((err,req,res,_next)=>{
 if(res.headersSent)return;
 if(/UNIQUE constraint failed: pesilat.no_kp_atau_id/i.test(err.message))return fail(res,'Nombor KP/ID sudah digunakan.',409);
 if(/UNIQUE constraint failed: cawangan.nama_cawangan/i.test(err.message))return fail(res,'Nama cawangan sudah digunakan. Sila gunakan nama lain.',409);
 if(err.type==='entity.too.large')return fail(res,'Data permintaan terlalu besar. Sila kecilkan fail atau imej pratonton.',413);
 if(err.type==='entity.parse.failed')return fail(res,'Data permintaan JSON tidak sah.',400);
 if(err instanceof multer.MulterError) {
   let msg = 'Fail tidak boleh dimuat naik.';
   if(err.code === 'LIMIT_FILE_SIZE') msg = 'Saiz fail melebihi had pelayan (maksimum 50MB setiap fail).';
   else if(err.code === 'LIMIT_FIELD_VALUE') msg = 'Data borang templat terlalu besar.';
   return fail(res, msg);
 }
 console.error('[ProSijil]',err);
 return fail(res, err.message || 'Ralat pelayan. Cuba semula.', err.status || 500);
});
export default app;
