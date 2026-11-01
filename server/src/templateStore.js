import fs from 'node:fs';
import { db } from './db.js';
import { isVercel } from './config.js';
import { getTursoClient, isTursoConfigured, ensureTursoSchema } from './turso.js';

const metadata = 'id,nama_template,peringkat,keterangan,file_name,file_size,kategori,page_count,thumbnail_base64,layout_config,created_at';

async function templateClient() {
  if (!isTursoConfigured()) return null;
  await ensureTursoSchema();
  const remote = getTursoClient();
  return remote;
}

function storageError(message) {
  const error = new Error(message);
  error.status = 503;
  return error;
}

function cacheTemplate(row) {
  const columns = `${metadata},file_base64,file_path`.split(',');
  db.prepare(`INSERT INTO template_sijil (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})
    ON CONFLICT(id) DO UPDATE SET ${columns.slice(1).map(column => `${column}=excluded.${column}`).join(',')}`)
    .run(...columns.map(column => row[column] ?? (column === 'file_path' ? '' : null)));
}

export async function listStoredTemplates({ name, category } = {}) {
  const conditions = [], args = [];
  if (name) { conditions.push('nama_template=?'); args.push(name); }
  if (category && category !== 'semua') {
    conditions.push("COALESCE(NULLIF(kategori,''),'kenaikan_tali_pinggang')=?");
    args.push(category);
  }
  const sql = `SELECT ${metadata} FROM template_sijil${conditions.length ? ' WHERE '+conditions.join(' AND ') : ''} ORDER BY id DESC`;
  const remote = await templateClient();
  return remote ? (await remote.execute({ sql, args })).rows : db.prepare(sql).all(...args);
}

export async function getTemplateMetadata(id) {
  const sql = `SELECT ${metadata} FROM template_sijil WHERE id=?`;
  const remote = await templateClient();
  return remote
    ? (await remote.execute({ sql, args: [id] })).rows[0]
    : db.prepare(sql).get(id);
}

export async function updateTemplateMetadata(id, column, value) {
  if (!['thumbnail_base64','layout_config'].includes(column)) throw new Error('Medan templat tidak sah.');
  // A successful update must also have a permanent, readable copy of the PDF.
  if (!await getStoredTemplate(id)) return null;
  let row;
  const remote = await templateClient();
  if (remote) {
    row = (await remote.execute({
      sql: `UPDATE template_sijil SET ${column}=? WHERE id=? RETURNING *`, args: [value,id],
    })).rows[0];
    if (!row) return null;
    cacheTemplate(row);
    return row;
  }
  db.prepare(`UPDATE template_sijil SET ${column}=? WHERE id=?`).run(value,id);
  return row || await getTemplateMetadata(id);
}

export async function saveTemplate(record, id = null) {
  const columns = ['nama_template','peringkat','keterangan','file_path','file_name','file_size','file_base64','kategori','page_count','thumbnail_base64','layout_config'];
  // Legacy databases require file_path. Empty means the PDF lives in file_base64;
  // it remains falsy for disk access/deletion and does not point at a fake file.
  const args = columns.map(column => column === 'file_path' ? '' : record[column] ?? null);
  const sql=id
    ? `UPDATE template_sijil SET ${columns.map(column=>`${column}=?`).join(',')} WHERE id=? RETURNING id`
    : `INSERT INTO template_sijil (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')}) RETURNING id`;
  if(id)args.push(id);
  let saved;
  const remote = await templateClient();
  if (remote) {
    const inserted = await remote.execute({
      sql, args,
    });
    if(!inserted.rows[0])return null;
    const id = Number(inserted.rows[0]?.id);
    const check = await remote.execute({
      sql: `SELECT ${metadata},length(file_base64) AS stored_length FROM template_sijil WHERE id=?`, args: [id],
    });
    saved = check.rows[0];
    if (!saved || Number(saved.stored_length) !== record.file_base64.length) {
      throw storageError('Simpanan PDF belum dapat disahkan. Sila cuba muat naik semula.');
    }
    saved = { ...saved, file_base64: record.file_base64, file_path: '' };
  } else {
    // Vercel's temporary filesystem cannot be the only copy of an uploaded PDF.
    if (isVercel) throw storageError('Storan kekal belum tersedia. Sila tetapkan sambungan pangkalan data sebelum memuat naik templat.');
    const result = db.prepare(sql).get(...args);
    if(!result)return null;
    saved = db.prepare('SELECT * FROM template_sijil WHERE id=?').get(Number(result.id));
  }
  cacheTemplate(saved);
  return saved;
}

export async function getStoredTemplate(id) {
  const local = db.prepare('SELECT * FROM template_sijil WHERE id=?').get(id);
  const remote = await templateClient();
  const row = remote ? (await remote.execute({ sql: 'SELECT * FROM template_sijil WHERE id=?', args: [id] })).rows[0] : local;
  // Never serve a deleted template from a stale cache, or substitute another rank's PDF.
  if (!row) return null;
  if (!row.file_base64) {
    const sameFile = local && ['nama_template','peringkat','file_name','file_size'].every(key => local[key] === row[key]);
    let recovered = sameFile ? local.file_base64 : null;
    const diskPath = sameFile ? local.file_path : row.file_path;
    if (!recovered && diskPath && fs.existsSync(diskPath)) recovered = fs.readFileSync(diskPath).toString('base64');
    if (recovered) {
      const bytes = Buffer.from(recovered, 'base64');
      if (bytes.subarray(0,5).toString() !== '%PDF-' || (row.file_size && bytes.length !== Number(row.file_size))) recovered = null;
    }
    if (!recovered) throw storageError('Salinan PDF asal templat ini belum tersedia dalam storan kekal. Sila muat naik semula fail asal.');
    if (remote) {
      await remote.execute({ sql: "UPDATE template_sijil SET file_base64=? WHERE id=? AND (file_base64 IS NULL OR file_base64='')", args: [recovered,id] });
    }
    row.file_base64 = recovered;
  }
  cacheTemplate(row);
  return row;
}

export async function deleteStoredTemplate(id) {
  const remote = await templateClient();
  if (remote) {
    const result = await remote.execute({
      sql: 'DELETE FROM template_sijil WHERE id=? RETURNING nama_template,peringkat,file_path', args: [id],
    });
    db.prepare('DELETE FROM template_sijil WHERE id=?').run(id);
    return result.rows[0];
  }
  return db.prepare('DELETE FROM template_sijil WHERE id=? RETURNING nama_template,peringkat,file_path').get(id);
}
