import { db, getSettings } from './db.js';
import fs from 'node:fs';
import { isVercel } from './config.js';
import { getTursoClient, isTursoConfigured, ensureTursoSchema } from './turso.js';
import { getStoredStudent } from './studentStore.js';
import { createCertificatePdfBytes } from './pdf.js';

const columns = 'pesilat_id,nama_sijil,tarikh_isu,jenis,file_path,file_type,public_token,file_base64,kategori';
const storageError = message => Object.assign(new Error(message), {status:503});

async function certificateClient() {
  if (isTursoConfigured()) {
    await ensureTursoSchema();
    return getTursoClient();
  }
  if (isVercel) throw storageError('Storan kekal belum tersedia. Sila tetapkan sambungan pangkalan data sebelum menyimpan sijil.');
  return null;
}

async function cacheCertificate(row) {
  try {
    if (isTursoConfigured()) await getStoredStudent(row.pesilat_id);
    db.prepare(`INSERT INTO sijil(id,${columns}) VALUES(?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET ${columns.split(',').map(column=>`${column}=excluded.${column}`).join(',')}`)
      .run(row.id,...columns.split(',').map(column=>row[column] ?? (column==='file_path'?'':null)));
  } catch(error) { console.warn('[Certificate Cache]',error.message); }
}

export async function getStoredCertificate(id) {
  if (isTursoConfigured()) {
    await ensureTursoSchema();
    const result = await getTursoClient().execute({ sql: 'SELECT * FROM sijil WHERE id=?', args: [id] });
    return result.rows[0];
  }
  return db.prepare('SELECT * FROM sijil WHERE id=?').get(id);
}

export async function ensureCertificateFile(row) {
  if (!row || row.file_base64) return row;
  const local=db.prepare('SELECT * FROM sijil WHERE public_token=?').get(row.public_token);
  const sameFile=local && row.file_path && local.file_path===row.file_path && local.file_type===row.file_type;
  let recovered=sameFile && local.file_base64
    ? local.file_base64
    : (row.file_path && fs.existsSync(row.file_path) ? fs.readFileSync(row.file_path).toString('base64') : null);
  if (row.jenis==='generated') {
    const student=await getStoredStudent(row.pesilat_id);
    if (!student) return null;
    recovered=(await createCertificatePdfBytes(student,row,getSettings())).toString('base64');
  }
  if (!recovered) throw storageError('Fail asal sijil belum tersedia dalam storan kekal. Sila muat naik semula fail asal.');
  const remote=await certificateClient();
  const sql="UPDATE sijil SET file_base64=?,file_path='',file_type=? WHERE public_token=? AND (file_base64 IS NULL OR file_base64='') RETURNING *";
  const args=[recovered,row.jenis==='generated'?'application/pdf':row.file_type,row.public_token];
  const saved=remote ? (await remote.execute({sql,args})).rows[0] : db.prepare(sql).get(...args);
  if (!saved) {
    const latest=await getStoredCertificate(row.id);
    return latest?{...row,...latest}:null;
  }
  if (remote) await cacheCertificate(saved);
  return {...row,...saved};
}

export async function updateStoredCertificate(id, changes) {
  const remote=await certificateClient();
  const current=await getStoredCertificate(id);
  if (!current) return null;
  const replacing=Object.hasOwn(changes,'fileBase64');
  if (!replacing && current.jenis==='uploaded' && !await ensureCertificateFile(current)) return null;
  const fields=['nama_sijil=?','tarikh_isu=?','kategori=?'];
  const args=[changes.namaSijil,changes.tarikh,changes.kategori];
  if (replacing) {
    if (!changes.fileBase64) throw storageError('Fail sijil baharu tidak boleh kosong.');
    fields.push("jenis='uploaded'","file_path=''",'file_type=?','file_base64=?');
    args.push(changes.fileType,changes.fileBase64);
  } else if(current.jenis==='generated') {
    const student=await getStoredStudent(current.pesilat_id);
    if (!student) return null;
    const bytes=await createCertificatePdfBytes(student,{...current,nama_sijil:changes.namaSijil,tarikh_isu:changes.tarikh},getSettings());
    fields.push("file_path=''","file_type='application/pdf'",'file_base64=?');
    args.push(bytes.toString('base64'));
  }
  args.push(id);
  const sql=`UPDATE sijil SET ${fields.join(',')} WHERE id=? RETURNING *`;
  const saved=remote ? (await remote.execute({sql,args})).rows[0] : db.prepare(sql).get(...args);
  if (!saved) return null;
  if (replacing && saved.file_base64!==changes.fileBase64) throw storageError('Simpanan fail sijil baharu belum dapat disahkan. Sila cuba semula.');
  if (remote) await cacheCertificate(saved);
  return saved;
}

export async function deleteStoredCertificates(ids, remote = isTursoConfigured() ? getTursoClient() : null) {
  const placeholders = ids.map(() => '?').join(',');
  const sql = `DELETE FROM sijil WHERE id IN (${placeholders}) RETURNING id,file_path,nama_sijil,public_token`;
  if (remote) {
    const result = await remote.execute({ sql, args: ids });
    db.prepare(`DELETE FROM sijil WHERE id IN (${placeholders})`).run(...ids);
    return result.rows;
  }
  return db.prepare(sql).all(...ids);
}

// The cloud assigns IDs. A warm instance's SQLite IDs can lag behind other instances.
export async function saveCertificate(record, remote = isTursoConfigured() ? getTursoClient() : null) {
  if (remote && isTursoConfigured()) await ensureTursoSchema();
  if (!remote && isVercel) {
    const error = new Error('Storan kekal belum tersedia. Sila tetapkan sambungan pangkalan data sebelum menyimpan sijil.');
    error.status = 503;
    throw error;
  }
  let fileBase64=record.fileBase64;
  if(record.jenis==='generated' && !fileBase64){
    const student=await getStoredStudent(record.studentId);
    if(!student)throw new Error('Pesilat tidak ditemui.');
    fileBase64=(await createCertificatePdfBytes(student,{nama_sijil:record.namaSijil,tarikh_isu:record.tarikh,public_token:record.token},getSettings())).toString('base64');
  }
  if(!fileBase64)throw storageError('Fail sijil tidak boleh kosong.');
  const args = [record.studentId, record.namaSijil, record.tarikh, record.jenis || 'uploaded',
    '',record.fileType || 'application/pdf', record.token, fileBase64, record.kategori];
  const insert = `INSERT INTO sijil (${columns}) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(public_token) DO NOTHING`;
  if (remote) {
    // Never report success or change the local cache when durable storage fails.
    await remote.execute({ sql: insert, args });
    const result = await remote.execute({
      sql: `SELECT id,${columns} FROM sijil WHERE public_token=?`, args: [record.token],
    });
    const id = Number(result.rows[0]?.id);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Gagal mengesahkan simpanan sijil. Sila cuba semula.');
    const saved = result.rows[0];
    if (!saved.file_base64) throw storageError('Simpanan fail sijil belum dapat disahkan. Sila cuba semula.');
    await cacheCertificate(saved);
    return id;
  }
  db.prepare(insert).run(...args);
  return db.prepare('SELECT id FROM sijil WHERE public_token=?').get(record.token).id;
}
