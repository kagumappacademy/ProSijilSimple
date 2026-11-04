import { db, uniqueId } from './db.js';
import { isVercel } from './config.js';
import { getTursoClient, isTursoConfigured, ensureTursoSchema } from './turso.js';

export async function studentClient() {
  if (isTursoConfigured()) {
    await ensureTursoSchema();
    return getTursoClient();
  }
  if (isVercel) {
    const error = new Error('Storan kekal belum tersedia. Sila tetapkan sambungan pangkalan data.');
    error.status = 503;
    throw error;
  }
  return null;
}

export async function readRows(sql, args = []) {
  const remote = await studentClient();
  return remote ? (await remote.execute({ sql, args })).rows : db.prepare(sql).all(...args);
}

export function cacheStudent(row) {
  // REPLACE deletes the previous parent row and cascades deletion to its certificates.
  db.prepare(`INSERT INTO pesilat(id,nama_penuh,no_kp_atau_id,peringkat,cawangan,tarikh_daftar,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
    nama_penuh=excluded.nama_penuh,no_kp_atau_id=excluded.no_kp_atau_id,
    peringkat=excluded.peringkat,cawangan=excluded.cawangan,tarikh_daftar=excluded.tarikh_daftar,
    created_at=excluded.created_at,updated_at=excluded.updated_at`)
    .run(row.id,row.nama_penuh,row.no_kp_atau_id,row.peringkat,row.cawangan,row.tarikh_daftar,row.created_at,row.updated_at);
}

export async function getStoredStudent(id) {
  const [row] = await readRows('SELECT * FROM pesilat WHERE id=?', [id]);
  if (row) {
    try { cacheStudent(row); } catch(error) { console.warn('[Student Cache]', error.message); }
  }
  return row;
}

export async function saveStudent(values, id = null) {
  const remote = await studentClient();
  const record = { ...values, no_kp_atau_id: values.no_kp_atau_id || uniqueId() };
  const [branch]=await readRows('SELECT nama_cawangan FROM cawangan WHERE nama_cawangan=? COLLATE NOCASE',[record.cawangan]);
  if(branch)record.cawangan=branch.nama_cawangan;
  const columns = 'nama_penuh,no_kp_atau_id,peringkat,cawangan,tarikh_daftar';
  const args = columns.split(',').map(column => record[column]);
  const sql = id
    ? `UPDATE pesilat SET nama_penuh=?,no_kp_atau_id=?,peringkat=?,cawangan=?,tarikh_daftar=?,updated_at=datetime('now') WHERE id=? RETURNING *`
    : `INSERT INTO pesilat(${columns}) VALUES(?,?,?,?,?) RETURNING *`;
  if (id) args.push(id);
  const row = remote ? (await remote.execute({ sql, args })).rows[0] : db.prepare(sql).get(...args);
  if (row && remote) {
    try { cacheStudent(row); } catch(error) { console.warn('[Student Cache]', error.message); }
  }
  return row;
}

export async function insertStudentBatch(records) {
  const remote = await studentClient();
  const branches=new Map((await readRows('SELECT nama_cawangan FROM cawangan')).map(row=>[row.nama_cawangan.toLowerCase(),row.nama_cawangan]));
  const sql = `INSERT INTO pesilat(nama_penuh,no_kp_atau_id,peringkat,cawangan,tarikh_daftar)
    VALUES(?,?,?,?,?) ON CONFLICT(no_kp_atau_id) DO NOTHING RETURNING *`;
  const statements = records.map(record => ({sql,args:[record.nama_penuh,
    record.no_kp_atau_id || uniqueId(),record.peringkat,branches.get(record.cawangan.toLowerCase())||record.cawangan,record.tarikh_daftar]}));
  if (remote) {
    // One transaction per small batch; never push unrelated stale cache records.
    const results = await remote.batch(statements,'write');
    const saved = results.flatMap(result => result.rows);
    for (const row of saved) {
      try { cacheStudent(row); } catch(error) { console.warn('[Student Cache]',error.message); }
    }
    return saved.length;
  }
  // No await while the local transaction is open.
  db.exec('BEGIN');
  try {
    let inserted=0;
    for (const statement of statements) if(db.prepare(sql).get(...statement.args))inserted++;
    db.exec('COMMIT');
    return inserted;
  } catch(error) { db.exec('ROLLBACK'); throw error; }
}

export async function deleteStudent(id) {
  const remote = await studentClient();
  let row;
  if (remote) {
    const results = await remote.batch([
      { sql: 'DELETE FROM sijil WHERE pesilat_id=? RETURNING id', args: [id] },
      { sql: 'DELETE FROM pesilat WHERE id=? RETURNING *', args: [id] },
    ], 'write');
    row = results[1].rows[0];
    if(row)row.deleted_certificates=results[0].rows.length;
    db.prepare('DELETE FROM pesilat WHERE id=?').run(id);
  } else {
    const count=db.prepare('SELECT count(*) AS n FROM sijil WHERE pesilat_id=?').get(id).n;
    row = db.prepare('DELETE FROM pesilat WHERE id=? RETURNING *').get(id);
    if(row)row.deleted_certificates=count;
  }
  return row;
}
