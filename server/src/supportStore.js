import crypto from 'node:crypto';
import { db } from './db.js';
import { studentClient } from './studentStore.js';

const categories = new Set(['pertanyaan','sijil','teknikal','maklumat','lain']);
const roles = new Set(['ibu_bapa','pesilat','lain']);
const statuses = new Set(['baru','dalam_semakan','selesai']);
const inputColumns = ['category','reporter_name','reporter_role','email','phone','student_name','branch','subject','message','page_path'];
const defaults = [{name:'En. Ifni',phone:'013 703 6786'},{name:'En. Harith',phone:'011 6116 9689'}];
const invalid = message => Object.assign(new Error(message),{status:400});
const unavailable = error => Object.assign(new Error('Data sokongan tidak dapat disimpan atau dibaca buat masa ini. Sila cuba lagi.'),{status:503,cause:error});
function text(value,max,label,min=0) {
  if (value != null && typeof value !== 'string') throw invalid(`${label} tidak sah.`);
  const result = String(value ?? '').trim();
  if (result.length < min || result.length > max) throw invalid(`${label} mestilah ${min} hingga ${max} aksara.`);
  return result;
}
function email(value) {
  const result = text(value,254,'Emel');
  if (result && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(result)) throw invalid('Sila masukkan alamat emel yang sah.');
  return result;
}
function phone(value) {
  const result = text(value,40,'Nombor telefon');
  const digits = result.replace(/\D/g,'');
  if (result && (!/^\+?[\d\s().-]+$/.test(result) || digits.length < 7 || digits.length > 15)) throw invalid('Sila masukkan nombor telefon yang sah.');
  return result;
}
function contactRows(value) {
  if (!Array.isArray(value) || value.length > 5) throw invalid('Maksimum 5 pegawai hubungan dibenarkan.');
  if (value.some(row=>!row||typeof row!=='object'||Array.isArray(row))) throw invalid('Butiran pegawai hubungan tidak sah.');
  return value.filter(row => row?.name || row?.phone).map(row => {
    const name = text(row.name,80,'Nama pegawai',2), number = phone(row.phone);
    if (!number) throw invalid('Nombor telefon pegawai diperlukan.');
    const digits = number.replace(/\D/g,'');
    const whatsapp = number.startsWith('+') ? digits : digits.startsWith('0') ? '60'+digits.slice(1) : digits.startsWith('60') ? digits : '';
    if (!/^[1-9]\d{7,14}$/.test(whatsapp)) throw invalid('Gunakan nombor Malaysia bermula 0 atau format antarabangsa bermula +.');
    return {name,phone:number,whatsapp};
  });
}
async function primary() { try { return await studentClient(); } catch(error) { throw unavailable(error); } }
async function rows(remote,sql,args=[]) { return remote ? (await remote.execute({sql,args})).rows : db.prepare(sql).all(...args); }
async function snapshot(remote,queries) {
  if (remote) return (await remote.batch(queries,'read')).map(result=>result.rows);
  db.exec('BEGIN');
  try { const result=queries.map(({sql,args=[]})=>db.prepare(sql).all(...args)); db.exec('COMMIT'); return result; }
  catch(error) { db.exec('ROLLBACK'); throw error; }
}

export async function readSupportContacts() {
  const remote=await primary();
  try {
    const values=Object.fromEntries((await rows(remote,"SELECT key,value FROM settings WHERE key IN ('support_contacts','support_email')")).map(row=>[row.key,row.value]));
    return {email:values.support_email || '',contacts:contactRows(values.support_contacts === undefined ? defaults : JSON.parse(values.support_contacts))};
  } catch(error) { throw unavailable(error); }
}

export async function saveSupportContacts(body) {
  const address=email(body.email), contacts=contactRows(body.contacts);
  const serialized=JSON.stringify(contacts.map(({name,phone})=>({name,phone})));
  const queries=[['support_email',address],['support_contacts',serialized]].map(args=>({sql:'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value RETURNING value',args}));
  const remote=await primary();
  try {
    let saved;
    if (remote) saved=(await remote.batch(queries,'write')).map(result=>result.rows[0]);
    else {
      db.exec('BEGIN');
      try { saved=queries.map(({sql,args})=>db.prepare(sql).get(...args)); db.exec('COMMIT'); }
      catch(error) { db.exec('ROLLBACK'); throw error; }
    }
    if (saved[0]?.value !== address || saved[1]?.value !== serialized) throw new Error('Contact save was not confirmed.');
    return {email:address,contacts};
  } catch(error) { throw unavailable(error); }
}

export function validatePublicReport(body) {
  if (body.website) throw invalid('Laporan tidak dapat dihantar. Sila cuba lagi.');
  const requestId=text(body.request_id,80,'ID permintaan',16);
  if (!/^[a-zA-Z0-9_-]+$/.test(requestId)) throw invalid('ID permintaan tidak sah. Muat semula borang dan cuba lagi.');
  if (!categories.has(body.category) || !roles.has(body.reporter_role)) throw invalid('Sila pilih kategori dan peranan yang sah.');
  const record={category:body.category,reporter_name:text(body.reporter_name,120,'Nama pengirim',2),reporter_role:body.reporter_role,
    email:email(body.email),phone:phone(body.phone),student_name:text(body.student_name,160,'Nama pesilat'),branch:text(body.branch,160,'Cawangan'),
    subject:text(body.subject,160,'Tajuk',3),message:text(body.message,4000,'Butiran laporan',10),page_path:text(body.page_path || '/',300,'Halaman')};
  if (!record.email && !record.phone) throw invalid('Sila isi emel atau nombor telefon untuk dihubungi.');
  if (!record.page_path.startsWith('/') || record.page_path.startsWith('//') || /[\\\u0000-\u001f]/.test(record.page_path)) throw invalid('Halaman laporan tidak sah.');
  record.page_path=new URL(record.page_path,'https://portal.invalid').pathname;
  return {requestId,record};
}

export async function createPublicReport(body) {
  const {requestId,record}=validatePublicReport(body);
  const reference='LAP-'+new Date().toISOString().slice(0,10).replaceAll('-','')+'-'+crypto.randomBytes(6).toString('hex').toUpperCase();
  const sql=`INSERT INTO public_reports(request_id,reference,${inputColumns.join(',')}) VALUES(${Array(12).fill('?').join(',')}) ON CONFLICT(request_id) DO NOTHING RETURNING id`;
  const args=[requestId,reference,...inputColumns.map(column=>record[column])];
  const remote=await primary();
  let inserted,saved;
  try {
    inserted=remote ? (await remote.execute({sql,args})).rows[0] : db.prepare(sql).get(...args);
    [saved]=await rows(remote,'SELECT * FROM public_reports WHERE request_id=?',[requestId]);
    if (!saved?.reference) throw new Error('Report save was not confirmed.');
  } catch(error) { throw unavailable(error); }
  if (inputColumns.some(column=>saved[column] !== record[column])) throw Object.assign(new Error('Permintaan ini sudah digunakan untuk laporan lain. Muat semula borang dan cuba lagi.'),{status:409});
  return {created:Boolean(inserted),receipt:{reference:saved.reference,created_at:saved.created_at}};
}

export async function listPublicReports(query) {
  const conditions=[],args=[];
  const status=text(query.status,30,'Status'),q=text(query.q,160,'Carian');
  if (status && !statuses.has(status)) throw invalid('Status laporan tidak sah.');
  if (status) { conditions.push('status=?'); args.push(status); }
  if (q) { conditions.push('(reference LIKE ? OR reporter_name LIKE ? OR subject LIKE ?)'); args.push(...Array(3).fill('%'+q+'%')); }
  const filter=conditions.length ? ' WHERE '+conditions.join(' AND ') : '';
  const page=Math.max(1,Math.floor(Number(query.page)||1));
  if (!Number.isSafeInteger(page) || !Number.isSafeInteger((page-1)*20)) throw invalid('Nombor halaman tidak sah.');
  const remote=await primary();
  try {
    const [totalRows,reports,grouped]=await snapshot(remote,[
      {sql:'SELECT count(*) AS n FROM public_reports'+filter,args},
      {sql:'SELECT id,reference,category,reporter_name,reporter_role,subject,status,created_at,updated_at FROM public_reports'+filter+' ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET ?',args:[...args,(page-1)*20]},
      {sql:'SELECT status,count(*) AS n FROM public_reports GROUP BY status'},
    ]);
    const counts={baru:0,dalam_semakan:0,selesai:0,semua:0};
    for (const row of grouped) { counts[row.status]=Number(row.n); counts.semua+=Number(row.n); }
    const total=Number(totalRows[0].n);
    return {rows:reports,total,page,pages:Math.max(1,Math.ceil(total/20)),counts};
  } catch(error) { throw unavailable(error); }
}

export async function readPublicReport(id) {
  const remote=await primary();
  try { return (await rows(remote,'SELECT * FROM public_reports WHERE id=?',[id]))[0] || null; }
  catch(error) { throw unavailable(error); }
}

export async function updatePublicReport(id,body,username) {
  if (!statuses.has(body.status)) throw invalid('Status laporan tidak sah.');
  if (!Number.isSafeInteger(body.version) || body.version < 1) throw invalid('Versi laporan tidak sah. Muat semula laporan.');
  const notes=text(body.admin_notes,4000,'Catatan admin');
  const remote=await primary();
  let saved;
  try {
    const sql="UPDATE public_reports SET status=?,admin_notes=?,updated_by=?,version=version+1,updated_at=datetime('now') WHERE id=? AND version=? RETURNING *";
    const args=[body.status,notes,username,id,body.version];
    saved=remote ? (await remote.execute({sql,args})).rows[0] : db.prepare(sql).get(...args);
  } catch(error) { throw unavailable(error); }
  if (saved) return saved;
  if (!await readPublicReport(id)) return null;
  throw Object.assign(new Error('Laporan ini telah dikemas kini oleh pentadbir lain. Muat semula laporan sebelum menyimpan.'),{status:409});
}
