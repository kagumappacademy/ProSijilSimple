import { createClient } from '@libsql/client';
import { db } from './db.js';
import { projectRoot } from './config.js';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import {BRANCH_SCHEMA,SEED_BRANCHES_SQL} from './branchSchema.js';
import { SUPPORT_SCHEMA } from './supportSchema.js';

dotenv.config({ path: path.join(projectRoot, '.env') });

export const TURSO_DATABASE_URL = process.env.NODE_ENV === 'test' ? '' : (process.env.TURSO_DATABASE_URL || '');
export const TURSO_AUTH_TOKEN = process.env.NODE_ENV === 'test' ? '' : (process.env.TURSO_AUTH_TOKEN || '');

/**
 * Checks if Turso database environment variables are set.
 * Sentiasa kembalikan false semasa mod ujian ('test') untuk mengelakkan pencemaran data ujian ke Cloud.
 */
export function isTursoConfigured() {
  if (process.env.NODE_ENV === 'test') {
    return false;
  }
  return Boolean(TURSO_DATABASE_URL && TURSO_DATABASE_URL.trim().length > 0);
}

/**
 * Creates and returns a Turso libSQL client.
 */
let sharedClient;
export function getTursoClient() {
  if (!isTursoConfigured()) {
    throw new Error('TURSO_DATABASE_URL belum ditetapkan dalam fail .env.');
  }

  sharedClient ||= createClient({
    url: TURSO_DATABASE_URL.trim(),
    authToken: TURSO_AUTH_TOKEN ? TURSO_AUTH_TOKEN.trim() : undefined,
  });
  return sharedClient;
}

export const TURSO_SCHEMA_STATEMENTS = [
  ...SUPPORT_SCHEMA,
  BRANCH_SCHEMA,
  'DROP TABLE IF EXISTS template_sijil_deleted',
  `CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS pesilat (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_penuh TEXT NOT NULL,
    no_kp_atau_id TEXT NOT NULL UNIQUE COLLATE NOCASE,
    peringkat TEXT NOT NULL DEFAULT 'Belum ditetapkan',
    cawangan TEXT NOT NULL DEFAULT 'Tidak dinyatakan',
    tarikh_daftar TEXT NOT NULL DEFAULT (date('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS sijil (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pesilat_id INTEGER NOT NULL REFERENCES pesilat(id) ON DELETE CASCADE,
    nama_sijil TEXT NOT NULL,
    tarikh_isu TEXT NOT NULL,
    jenis TEXT NOT NULL CHECK(jenis IN ('generated','uploaded')),
    file_path TEXT,
    file_type TEXT,
    public_token TEXT NOT NULL UNIQUE,
    file_base64 TEXT,
    kategori TEXT DEFAULT 'kenaikan_tali_pinggang',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS template_sijil (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama_template TEXT NOT NULL,
    peringkat TEXT NOT NULL,
    keterangan TEXT,
    file_path TEXT,
    file_name TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    file_base64 TEXT,
    kategori TEXT DEFAULT 'kenaikan_tali_pinggang',
    page_count INTEGER DEFAULT 1,
    thumbnail_base64 TEXT,
    layout_config TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS admin_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    action TEXT NOT NULL,
    title TEXT NOT NULL,
    detail TEXT,
    target_url TEXT,
    students_before INTEGER,
    students_after INTEGER,
    certs_before INTEGER,
    certs_after INTEGER,
    templates_before INTEGER,
    templates_after INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_pesilat_nama ON pesilat(nama_penuh)`,
  `CREATE INDEX IF NOT EXISTS idx_sijil_pesilat ON sijil(pesilat_id)`,
  `CREATE INDEX IF NOT EXISTS idx_template_peringkat ON template_sijil(nama_template, peringkat)`,
  `CREATE INDEX IF NOT EXISTS idx_activity_created ON admin_activity(created_at DESC)`
];

/**
 * Initializes all required tables and indexes on Turso.
 */
export async function initTursoSchema(client) {
  const turso = client || getTursoClient();
  for (const statement of TURSO_SCHEMA_STATEMENTS) await turso.execute(statement);
  await turso.execute(SEED_BRANCHES_SQL);
  // Ignore migration errors only when another instance added the column.
  const migrations = {
    sijil: {file_base64:'TEXT',kategori:"TEXT DEFAULT 'kenaikan_tali_pinggang'",batch_id:'TEXT',template_name:'TEXT'},
    template_sijil: {file_base64:'TEXT',kategori:"TEXT DEFAULT 'kenaikan_tali_pinggang'",page_count:'INTEGER DEFAULT 1',thumbnail_base64:'TEXT',layout_config:'TEXT'},
    admin_activity: {students_before:'INTEGER',students_after:'INTEGER',certs_before:'INTEGER',certs_after:'INTEGER',templates_before:'INTEGER',templates_after:'INTEGER'},
  };
  for (const [table,columns] of Object.entries(migrations)) {
    const existing = await turso.execute('PRAGMA table_info('+table+')');
    for (const [column,type] of Object.entries(columns)) {
      if (existing.rows.some(row => row.name === column)) continue;
      try { await turso.execute('ALTER TABLE '+table+' ADD COLUMN '+column+' '+type); }
      catch (error) {
        const current = await turso.execute('PRAGMA table_info('+table+')');
        if (!current.rows.some(row => row.name === column)) throw error;
      }
    }
  }
  await turso.execute('CREATE INDEX IF NOT EXISTS idx_sijil_batch ON sijil(batch_id)');
}

let schemaReady;
export async function ensureTursoSchema() {
  if (!isTursoConfigured()) return;
  schemaReady ||= initTursoSchema().catch(error => { schemaReady = null; throw error; });
  await schemaReady;
}

/**
 * Tests connection to Turso and returns database metrics and row counts.
 */
export async function testTursoConnection() {
  if (!isTursoConfigured()) {
    return {
      connected: false,
      configured: false,
      message: 'TURSO_DATABASE_URL belum ditetapkan dalam .env.',
    };
  }

  const start = Date.now();
  try {
    const turso = getTursoClient();
    await initTursoSchema(turso);

    const tables = ['admin_users', 'pesilat', 'sijil', 'template_sijil', 'settings'];
    const counts = {};

    for (const tbl of tables) {
      try {
        const res = await turso.execute(`SELECT count(*) AS total FROM ${tbl}`);
        counts[tbl] = Number(res.rows[0]?.total || 0);
      } catch {
        counts[tbl] = 0;
      }
    }

    const latencyMs = Date.now() - start;

    return {
      connected: true,
      configured: true,
      url: TURSO_DATABASE_URL,
      latencyMs,
      tables: counts,
      message: `Berjaya berhubung ke Turso (${latencyMs}ms).`,
    };
  } catch (err) {
    return {
      connected: false,
      configured: true,
      url: TURSO_DATABASE_URL,
      latencyMs: Date.now() - start,
      error: err.message,
      message: `Gagal berhubung ke Turso: ${err.message}`,
    };
  }
}

/**
 * Helper to execute an array of statements in chunks using turso.batch()
 */
async function batchExecute(turso, statements, chunkSize = 50) {
  let affected=0;
  for (let i = 0; i < statements.length; i += chunkSize) {
    const chunk = statements.slice(i, i + chunkSize);
    if (chunk.length > 0) {
      const results=await turso.batch(chunk, 'write');
      affected+=results.reduce((sum,result)=>sum+Number(result.rowsAffected),0);
    }
  }
  return affected;
}

/**
 * Migrates/Pushes all data from local SQLite database (prosijil.sqlite) to Turso.
 */
export async function pushLocalToTurso(client, { importNewRecords = false } = {}) {
  const turso=client || getTursoClient();
  await initTursoSchema(turso);
  const stats={admin_users:0,pesilat:0,sijil:0,template_sijil:0,settings:0,cawangan:0,public_reports:0};
  // Normal sync only repairs missing file bytes on records that still exist.
  // Importing new records is an explicit CLI migration, never a background task.
  if(importNewRecords) {
    db.exec(SEED_BRANCHES_SQL);
    const branches=db.prepare('SELECT nama_cawangan,keterangan FROM cawangan').all();
    stats.cawangan=await batchExecute(turso,branches.map(row=>({sql:'INSERT INTO cawangan(nama_cawangan,keterangan) VALUES(?,?) ON CONFLICT(nama_cawangan) DO NOTHING',args:[row.nama_cawangan,row.keterangan]})));
    const settings=db.prepare('SELECT key,value FROM settings').all();
    const admins=db.prepare('SELECT username,password_hash,created_at FROM admin_users').all();
    const students=db.prepare('SELECT nama_penuh,no_kp_atau_id,peringkat,cawangan,tarikh_daftar,created_at,updated_at FROM pesilat').all();
    stats.settings=await batchExecute(turso,settings.map(row=>({sql:'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO NOTHING',args:[row.key,row.value]})));
    stats.admin_users=await batchExecute(turso,admins.map(row=>({sql:'INSERT INTO admin_users(username,password_hash,created_at) VALUES(?,?,?) ON CONFLICT(username) DO NOTHING',args:[row.username,row.password_hash,row.created_at]})));
    stats.pesilat=await batchExecute(turso,students.map(row=>({sql:'INSERT INTO pesilat(nama_penuh,no_kp_atau_id,peringkat,cawangan,tarikh_daftar,created_at,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(no_kp_atau_id) DO NOTHING',args:[row.nama_penuh,row.no_kp_atau_id,row.peringkat,row.cawangan,row.tarikh_daftar,row.created_at,row.updated_at]})));
    const reportColumns='request_id,reference,category,reporter_name,reporter_role,email,phone,student_name,branch,subject,message,page_path,status,admin_notes,updated_by,version,created_at,updated_at'.split(',');
    const reports=db.prepare('SELECT * FROM public_reports').all();
    stats.public_reports=await batchExecute(turso,reports.map(row=>({sql:`INSERT INTO public_reports(${reportColumns.join(',')}) VALUES(${reportColumns.map(()=>'?').join(',')}) ON CONFLICT(request_id) DO NOTHING`,args:reportColumns.map(column=>row[column])})));
  }
  for(const row of db.prepare('SELECT s.*,p.no_kp_atau_id FROM sijil s JOIN pesilat p ON p.id=s.pesilat_id').all()) {
    const bytes=row.file_base64 || (row.file_path && fs.existsSync(row.file_path)?fs.readFileSync(row.file_path).toString('base64'):null);
    if(row.jenis==='uploaded'&&!bytes)continue;
    if(importNewRecords) {
      const inserted=await turso.execute({
        sql: 'INSERT INTO sijil(pesilat_id,nama_sijil,tarikh_isu,jenis,file_path,file_type,public_token,file_base64,kategori,created_at,batch_id,template_name) SELECT id,?,?,?,?,?,?,?,?,?,?,? FROM pesilat WHERE no_kp_atau_id=? ON CONFLICT(public_token) DO NOTHING',
        args:[row.nama_sijil,row.tarikh_isu,row.jenis,'',row.file_type,row.public_token,bytes,row.kategori || 'kenaikan_tali_pinggang',row.created_at,row.batch_id??null,row.template_name??null,row.no_kp_atau_id],
      });
      stats.sijil+=Number(inserted.rowsAffected);
    }
    if(bytes) {
      const repaired=await turso.execute({
        sql: "UPDATE sijil SET file_base64=? WHERE public_token=? AND jenis=? AND file_type IS ? AND (file_base64 IS NULL OR file_base64='')",
        args:[bytes,row.public_token,row.jenis,row.file_type],
      });
      stats.sijil+=Number(repaired.rowsAffected);
    }
  }
  for(const row of db.prepare('SELECT * FROM template_sijil').all()) {
    const bytes=row.file_base64 || (row.file_path && fs.existsSync(row.file_path)?fs.readFileSync(row.file_path).toString('base64'):null);
    if(!bytes)continue;
    if(importNewRecords) {
      const inserted=await turso.execute({
        sql: 'INSERT INTO template_sijil(nama_template,peringkat,keterangan,file_path,file_name,file_size,file_base64,kategori,page_count,thumbnail_base64,layout_config,created_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM template_sijil WHERE nama_template=? AND peringkat=? AND file_name=? AND created_at=?)',
        args:[row.nama_template,row.peringkat,row.keterangan,'',row.file_name,row.file_size,bytes,row.kategori || 'kenaikan_tali_pinggang',row.page_count || 1,row.thumbnail_base64,row.layout_config,row.created_at,row.nama_template,row.peringkat,row.file_name,row.created_at],
      });
      stats.template_sijil+=Number(inserted.rowsAffected);
    }
    const repaired=await turso.execute({
      sql: "UPDATE template_sijil SET file_base64=? WHERE id=? AND nama_template=? AND peringkat=? AND file_name=? AND file_size=? AND (file_base64 IS NULL OR file_base64='')",
      args:[bytes,row.id,row.nama_template,row.peringkat,row.file_name,row.file_size],
    });
    stats.template_sijil+=Number(repaired.rowsAffected);
  }
  return stats;
}

/**
 * Pulls all data from Turso cloud database and saves into local SQLite.
 */
export async function pullTursoToLocal(client) {
  const turso = client || getTursoClient();
  if (!client) await ensureTursoSchema();

  const stats = {
    admin_users: 0,
    pesilat: 0,
    sijil: 0,
    template_sijil: 0,
    settings: 0,
  };

  // Complete network reads before opening a synchronous SQLite transaction.
  // Other requests must never see half a sync or have their writes rolled back with it.
  const remoteBranches=await turso.execute('SELECT * FROM cawangan');
  const remoteSettings = await turso.execute('SELECT key, value FROM settings');
  const remoteAdmins = await turso.execute('SELECT id, username, password_hash, created_at FROM admin_users');
  const remotePesilat = await turso.execute('SELECT id, nama_penuh, no_kp_atau_id, peringkat, cawangan, tarikh_daftar, created_at, updated_at FROM pesilat');
  const remoteSijil = await turso.execute('SELECT id, pesilat_id, nama_sijil, tarikh_isu, jenis, file_path, file_type, public_token, kategori, created_at, batch_id, template_name FROM sijil');
  let remoteTemplates;
  try {
    remoteTemplates = await turso.execute('SELECT id, nama_template, peringkat, keterangan, file_path, file_name, file_size, kategori, page_count, thumbnail_base64, layout_config, created_at FROM template_sijil');
  } catch (_) {
    try {
      remoteTemplates = await turso.execute('SELECT id, nama_template, peringkat, keterangan, file_path, file_name, file_size, kategori, page_count, thumbnail_base64, created_at FROM template_sijil');
    } catch (_2) {
      remoteTemplates = await turso.execute('SELECT id, nama_template, peringkat, keterangan, file_path, file_name, file_size, kategori, page_count, created_at FROM template_sijil');
    }
  }
  let remoteActivities = { rows: [] };
  try {
    remoteActivities = await turso.execute('SELECT id, type, action, title, detail, target_url, students_before, students_after, certs_before, certs_after, templates_before, templates_after, created_at FROM admin_activity ORDER BY id DESC LIMIT 150');
  } catch (err) {
    console.warn('[Turso Pull Activity Warning]:', err.message);
  }

  db.exec('BEGIN');
  try {
    // Branch identities come from the same durable catalog as student names.
    db.exec('DELETE FROM cawangan');
    const branchStmt=db.prepare('INSERT INTO cawangan(id,nama_cawangan,keterangan,created_at,updated_at) VALUES(?,?,?,?,?)');
    for(const row of remoteBranches.rows)branchStmt.run(row.id,row.nama_cawangan,row.keterangan,row.created_at,row.updated_at);
    const setStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const row of remoteSettings.rows) {
      setStmt.run(row.key, row.value);
      stats.settings++;
    }

    // 2. Admin Users
    if (remoteAdmins.rows.length > 0) {
      db.exec('DELETE FROM admin_users');
      const adminStmt = db.prepare('INSERT OR REPLACE INTO admin_users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)');
      for (const row of remoteAdmins.rows) {
        adminStmt.run(row.id, row.username, row.password_hash, row.created_at);
        stats.admin_users++;
      }
    }

    // 3. Pesilat
    const pesilatStmt = db.prepare(`INSERT INTO pesilat (id, nama_penuh, no_kp_atau_id, peringkat, cawangan, tarikh_daftar, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET nama_penuh=excluded.nama_penuh,no_kp_atau_id=excluded.no_kp_atau_id,
      peringkat=excluded.peringkat,cawangan=excluded.cawangan,tarikh_daftar=excluded.tarikh_daftar,
      created_at=excluded.created_at,updated_at=excluded.updated_at`);
    for (const row of remotePesilat.rows) {
      pesilatStmt.run(row.id, row.nama_penuh, row.no_kp_atau_id, row.peringkat, row.cawangan, row.tarikh_daftar, row.created_at, row.updated_at);
      stats.pesilat++;
    }

    // 4. Sijil (ringan: tanpa memuat turun file_base64 pukal)
    const sijilStmt = db.prepare(`
      INSERT INTO sijil (id, pesilat_id, nama_sijil, tarikh_isu, jenis, file_path, file_type, public_token, kategori, created_at, batch_id, template_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        pesilat_id=excluded.pesilat_id,
        nama_sijil=excluded.nama_sijil,
        tarikh_isu=excluded.tarikh_isu,
        jenis=excluded.jenis,
        file_path=excluded.file_path,
        file_type=excluded.file_type,
        file_base64=CASE WHEN sijil.public_token=excluded.public_token THEN sijil.file_base64 ELSE NULL END,
        public_token=excluded.public_token,
        kategori=excluded.kategori,
        batch_id=excluded.batch_id,
        template_name=excluded.template_name,
        created_at=excluded.created_at
    `);
    for (const row of remoteSijil.rows) {
      sijilStmt.run(row.id, row.pesilat_id, row.nama_sijil, row.tarikh_isu, row.jenis, row.file_path, row.file_type, row.public_token, row.kategori || 'kenaikan_tali_pinggang', row.created_at, row.batch_id??null, row.template_name??null);
      stats.sijil++;
    }

    // 5. Template Sijil (ringan: muat turun metadata + thumbnail_base64 tanpa file_base64 pukal 50MB)
    const tplStmt = db.prepare(`
      INSERT INTO template_sijil (id, nama_template, peringkat, keterangan, file_path, file_name, file_size, kategori, page_count, thumbnail_base64, layout_config, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        nama_template=excluded.nama_template,
        peringkat=excluded.peringkat,
        keterangan=excluded.keterangan,
        file_path=excluded.file_path,
        file_name=excluded.file_name,
        file_size=excluded.file_size,
        kategori=excluded.kategori,
        page_count=excluded.page_count,
        thumbnail_base64=COALESCE(excluded.thumbnail_base64, template_sijil.thumbnail_base64),
        layout_config=COALESCE(excluded.layout_config, template_sijil.layout_config),
        created_at=excluded.created_at
    `);
    for (const row of remoteTemplates.rows) {
      tplStmt.run(row.id, row.nama_template, row.peringkat, row.keterangan, row.file_path ?? '', row.file_name, row.file_size, row.kategori || 'kenaikan_tali_pinggang', row.page_count ?? 1, row.thumbnail_base64 || null, row.layout_config || null, row.created_at);
      stats.template_sijil++;
    }
    pruneFileCache('template_sijil',remoteTemplates.rows);
    pruneFileCache('sijil',remoteSijil.rows);

    // 6. Admin Activity (Muat turun aktiviti terkini dari Turso Cloud ke SQLite)
    try {
      if (remoteActivities.rows && remoteActivities.rows.length > 0) {
        const actStmt = db.prepare(`
          INSERT OR REPLACE INTO admin_activity (
            id, type, action, title, detail, target_url,
            students_before, students_after,
            certs_before, certs_after,
            templates_before, templates_after,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const row of remoteActivities.rows) {
          actStmt.run(
            row.id, row.type, row.action, row.title, row.detail, row.target_url,
            row.students_before, row.students_after,
            row.certs_before, row.certs_after,
            row.templates_before, row.templates_after,
            row.created_at
          );
        }
        stats.admin_activity = remoteActivities.rows.length;
      }
    } catch (actErr) {
      console.warn('[Turso Pull Activity Warning]:', actErr.message);
    }

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return stats;
}

/**
 * Pulls only template_sijil from Turso cloud database and saves into local SQLite (tanpa file_base64 pukal).
 */
export async function pullTemplatesFromTurso() {
  if (!isTursoConfigured()) return 0;
  await ensureTursoSchema();
  const turso = getTursoClient();
  let remoteTemplates;
  try {
    remoteTemplates = await turso.execute('SELECT id, nama_template, peringkat, keterangan, file_path, file_name, file_size, kategori, page_count, thumbnail_base64, layout_config, created_at FROM template_sijil');
  } catch (_) {
    try {
      remoteTemplates = await turso.execute('SELECT id, nama_template, peringkat, keterangan, file_path, file_name, file_size, kategori, page_count, thumbnail_base64, created_at FROM template_sijil');
    } catch (_2) {
      remoteTemplates = await turso.execute('SELECT id, nama_template, peringkat, keterangan, file_path, file_name, file_size, kategori, page_count, created_at FROM template_sijil');
    }
  }
  const tplStmt = db.prepare(`
    INSERT INTO template_sijil (id, nama_template, peringkat, keterangan, file_path, file_name, file_size, kategori, page_count, thumbnail_base64, layout_config, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      nama_template=excluded.nama_template,
      peringkat=excluded.peringkat,
      keterangan=excluded.keterangan,
      file_path=excluded.file_path,
      file_name=excluded.file_name,
      file_size=excluded.file_size,
      kategori=excluded.kategori,
      page_count=excluded.page_count,
      thumbnail_base64=COALESCE(excluded.thumbnail_base64, template_sijil.thumbnail_base64),
      layout_config=COALESCE(excluded.layout_config, template_sijil.layout_config),
      created_at=excluded.created_at
  `);
  for (const row of remoteTemplates.rows) {
    tplStmt.run(row.id, row.nama_template, row.peringkat, row.keterangan, row.file_path ?? '', row.file_name, row.file_size, row.kategori || 'kenaikan_tali_pinggang', row.page_count ?? 1, row.thumbnail_base64 || null, row.layout_config || null, row.created_at);
  }
  pruneFileCache('template_sijil',remoteTemplates.rows);
  return remoteTemplates.rows.length;
}

function pruneFileCache(table, remoteRows) {
  if(!['template_sijil','sijil'].includes(table))throw new Error('Jadual cache tidak sah.');
  const ids=new Set(remoteRows.map(row=>Number(row.id)));
  const remove=db.prepare('DELETE FROM '+table+' WHERE id=?');
  for(const row of db.prepare('SELECT id FROM '+table).all())if(!ids.has(Number(row.id)))remove.run(row.id);
}

/**
 * Memastikan fail PDF templat (file_base64) sedia ada dalam SQLite tempatan.
 * Jika tiada secara tempatan, muat turun atas permintaan daripada Turso Cloud bagi templat ini sahaja.
 */
export async function ensureTemplateFileBase64(templateId) {
  const { getStoredTemplate } = await import('./templateStore.js');
  return (await getStoredTemplate(templateId))?.file_base64 || null;
}

