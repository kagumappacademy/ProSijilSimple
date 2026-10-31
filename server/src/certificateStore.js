import { db } from './db.js';
import { getTursoClient, isTursoConfigured } from './turso.js';

export async function getStoredCertificate(id) {
  if (isTursoConfigured()) {
    const result = await getTursoClient().execute({ sql: 'SELECT * FROM sijil WHERE id=?', args: [id] });
    return result.rows[0];
  }
  return db.prepare('SELECT * FROM sijil WHERE id=?').get(id);
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
  const columns = 'pesilat_id,nama_sijil,tarikh_isu,jenis,file_type,public_token,file_base64,kategori';
  const args = [record.studentId, record.namaSijil, record.tarikh, record.jenis || 'uploaded',
    record.fileType || 'application/pdf', record.token, record.fileBase64 || null, record.kategori];
  const insert = `INSERT INTO sijil (${columns}) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(public_token) DO NOTHING`;
  if (remote) {
    // Never report success or change the local cache when durable storage fails.
    await remote.execute({ sql: insert, args });
    const result = await remote.execute({
      sql: 'SELECT id FROM sijil WHERE public_token=?', args: [record.token],
    });
    const id = Number(result.rows[0]?.id);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Gagal mengesahkan simpanan sijil. Sila cuba semula.');
    db.prepare(`INSERT INTO sijil (id,${columns}) VALUES (?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET
        pesilat_id=excluded.pesilat_id,nama_sijil=excluded.nama_sijil,
        tarikh_isu=excluded.tarikh_isu,jenis=excluded.jenis,file_type=excluded.file_type,
        public_token=excluded.public_token,file_base64=excluded.file_base64,kategori=excluded.kategori`)
      .run(id, ...args);
    return id;
  }
  db.prepare(insert).run(...args);
  return db.prepare('SELECT id FROM sijil WHERE public_token=?').get(record.token).id;
}
