import { createClient } from '@libsql/client';
import { db } from './db.js';
import { projectRoot } from './config.js';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';

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
export function getTursoClient() {
  if (!isTursoConfigured()) {
    throw new Error('TURSO_DATABASE_URL belum ditetapkan dalam fail .env.');
  }

  return createClient({
    url: TURSO_DATABASE_URL.trim(),
    authToken: TURSO_AUTH_TOKEN ? TURSO_AUTH_TOKEN.trim() : undefined,
  });
}

export const TURSO_SCHEMA_STATEMENTS = [
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
  for (const statement of TURSO_SCHEMA_STATEMENTS) {
    await turso.execute(statement);
  }
  try {
    await turso.execute('ALTER TABLE template_sijil ADD COLUMN page_count INTEGER DEFAULT 1;');
  } catch (_) {}
  try {
    await turso.execute('ALTER TABLE template_sijil ADD COLUMN thumbnail_base64 TEXT;');
  } catch (_) {}
  try {
    await turso.execute('ALTER TABLE template_sijil ADD COLUMN layout_config TEXT;');
  } catch (_) {}
  try { await turso.execute('ALTER TABLE admin_activity ADD COLUMN students_before INTEGER;'); } catch (_) {}
  try { await turso.execute('ALTER TABLE admin_activity ADD COLUMN students_after INTEGER;'); } catch (_) {}
  try { await turso.execute('ALTER TABLE admin_activity ADD COLUMN certs_before INTEGER;'); } catch (_) {}
  try { await turso.execute('ALTER TABLE admin_activity ADD COLUMN certs_after INTEGER;'); } catch (_) {}
  try { await turso.execute('ALTER TABLE admin_activity ADD COLUMN templates_before INTEGER;'); } catch (_) {}
  try { await turso.execute('ALTER TABLE admin_activity ADD COLUMN templates_after INTEGER;'); } catch (_) {}
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
  for (let i = 0; i < statements.length; i += chunkSize) {
    const chunk = statements.slice(i, i + chunkSize);
    if (chunk.length > 0) {
      await turso.batch(chunk, 'write');
    }
  }
}

/**
 * Migrates/Pushes all data from local SQLite database (prosijil.sqlite) to Turso.
 */
export async function pushLocalToTurso() {
  const turso = getTursoClient();
  await initTursoSchema(turso);

  const stats = {
    admin_users: 0,
    pesilat: 0,
    sijil: 0,
    template_sijil: 0,
    settings: 0,
  };

  // 1. Settings
  const localSettings = db.prepare('SELECT key, value FROM settings').all();
  const settingsStmts = localSettings.map((row) => ({
    sql: 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    args: [row.key, row.value],
  }));
  await batchExecute(turso, settingsStmts);
  stats.settings = localSettings.length;

  // 2. Admin Users
  const localAdmins = db.prepare('SELECT id, username, password_hash, created_at FROM admin_users').all();
  const adminStmts = localAdmins.map((row) => ({
    sql: 'INSERT OR REPLACE INTO admin_users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)',
    args: [row.id, row.username, row.password_hash, row.created_at],
  }));
  await batchExecute(turso, adminStmts);
  stats.admin_users = localAdmins.length;

  // 3. Pesilat
  const localPesilat = db.prepare('SELECT id, nama_penuh, no_kp_atau_id, peringkat, cawangan, tarikh_daftar, created_at, updated_at FROM pesilat').all();
  const pesilatStmts = localPesilat.map((row) => ({
    sql: 'INSERT OR REPLACE INTO pesilat (id, nama_penuh, no_kp_atau_id, peringkat, cawangan, tarikh_daftar, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    args: [row.id, row.nama_penuh, row.no_kp_atau_id, row.peringkat, row.cawangan, row.tarikh_daftar, row.created_at, row.updated_at],
  }));
  await batchExecute(turso, pesilatStmts);
  stats.pesilat = localPesilat.length;

  // 4. Sijil
  const localSijil = db.prepare('SELECT id, pesilat_id, nama_sijil, tarikh_isu, jenis, file_path, file_type, public_token, file_base64, kategori, created_at FROM sijil').all();
  const sijilStmts = localSijil.map((row) => ({
    sql: 'INSERT OR REPLACE INTO sijil (id, pesilat_id, nama_sijil, tarikh_isu, jenis, file_path, file_type, public_token, file_base64, kategori, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    args: [row.id, row.pesilat_id, row.nama_sijil, row.tarikh_isu, row.jenis, row.file_path, row.file_type, row.public_token, row.file_base64 || null, row.kategori || 'kenaikan_tali_pinggang', row.created_at],
  }));
  await batchExecute(turso, sijilStmts);
  stats.sijil = localSijil.length;

  // 5. Template Sijil (tolak secara individu untuk mengelakkan had saiz payload batch Turso)
  const localTemplates = db.prepare('SELECT id, nama_template, peringkat, keterangan, file_path, file_name, file_size, file_base64, kategori, page_count, thumbnail_base64, layout_config, created_at FROM template_sijil').all();
  for (const row of localTemplates) {
    try {
      await turso.execute({
        sql: 'INSERT OR REPLACE INTO template_sijil (id, nama_template, peringkat, keterangan, file_path, file_name, file_size, file_base64, kategori, page_count, thumbnail_base64, layout_config, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [row.id, row.nama_template, row.peringkat, row.keterangan || null, row.file_path, row.file_name, row.file_size || 0, row.file_base64 || null, row.kategori || 'kenaikan_tali_pinggang', row.page_count || 1, row.thumbnail_base64 || null, row.layout_config || null, row.created_at],
      });
      stats.template_sijil++;
    } catch (tplErr) {
      console.warn(`[Turso Push Template ${row.id} Warning]:`, tplErr.message);
    }
  }

  // 6. Admin Activity (Simpan ke Turso Cloud supaya aktiviti terkini kekal)
  try {
    const localActivities = db.prepare('SELECT id, type, action, title, detail, target_url, students_before, students_after, certs_before, certs_after, templates_before, templates_after, created_at FROM admin_activity ORDER BY id DESC LIMIT 150').all();
    if (localActivities.length > 0) {
      const actStmts = localActivities.map((row) => ({
        sql: `INSERT OR REPLACE INTO admin_activity (
          id, type, action, title, detail, target_url,
          students_before, students_after,
          certs_before, certs_after,
          templates_before, templates_after,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          row.id, row.type, row.action, row.title, row.detail || null, row.target_url || null,
          row.students_before ?? null, row.students_after ?? null,
          row.certs_before ?? null, row.certs_after ?? null,
          row.templates_before ?? null, row.templates_after ?? null,
          row.created_at
        ]
      }));
      await batchExecute(turso, actStmts);
      stats.admin_activity = localActivities.length;
    }
  } catch (actErr) {
    console.warn('[Turso Push Activity Warning]:', actErr.message);
  }

  return stats;
}

/**
 * Pulls all data from Turso cloud database and saves into local SQLite.
 */
export async function pullTursoToLocal() {
  const turso = getTursoClient();

  const stats = {
    admin_users: 0,
    pesilat: 0,
    sijil: 0,
    template_sijil: 0,
    settings: 0,
  };

  db.exec('BEGIN');
  try {
    // 1. Settings
    const remoteSettings = await turso.execute('SELECT key, value FROM settings');
    const setStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const row of remoteSettings.rows) {
      setStmt.run(row.key, row.value);
      stats.settings++;
    }

    // 2. Admin Users
    const remoteAdmins = await turso.execute('SELECT id, username, password_hash, created_at FROM admin_users');
    if (remoteAdmins.rows.length > 0) {
      db.exec('DELETE FROM admin_users');
      const adminStmt = db.prepare('INSERT OR REPLACE INTO admin_users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)');
      for (const row of remoteAdmins.rows) {
        adminStmt.run(row.id, row.username, row.password_hash, row.created_at);
        stats.admin_users++;
      }
    }

    // 3. Pesilat
    const remotePesilat = await turso.execute('SELECT id, nama_penuh, no_kp_atau_id, peringkat, cawangan, tarikh_daftar, created_at, updated_at FROM pesilat');
    const pesilatStmt = db.prepare('INSERT OR REPLACE INTO pesilat (id, nama_penuh, no_kp_atau_id, peringkat, cawangan, tarikh_daftar, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    for (const row of remotePesilat.rows) {
      pesilatStmt.run(row.id, row.nama_penuh, row.no_kp_atau_id, row.peringkat, row.cawangan, row.tarikh_daftar, row.created_at, row.updated_at);
      stats.pesilat++;
    }

    // 4. Sijil (ringan: tanpa memuat turun file_base64 pukal)
    const remoteSijil = await turso.execute('SELECT id, pesilat_id, nama_sijil, tarikh_isu, jenis, file_path, file_type, public_token, kategori, created_at FROM sijil');
    const sijilStmt = db.prepare(`
      INSERT INTO sijil (id, pesilat_id, nama_sijil, tarikh_isu, jenis, file_path, file_type, public_token, kategori, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        pesilat_id=excluded.pesilat_id,
        nama_sijil=excluded.nama_sijil,
        tarikh_isu=excluded.tarikh_isu,
        jenis=excluded.jenis,
        file_path=excluded.file_path,
        file_type=excluded.file_type,
        public_token=excluded.public_token,
        kategori=excluded.kategori,
        created_at=excluded.created_at
    `);
    for (const row of remoteSijil.rows) {
      sijilStmt.run(row.id, row.pesilat_id, row.nama_sijil, row.tarikh_isu, row.jenis, row.file_path, row.file_type, row.public_token, row.kategori || 'kenaikan_tali_pinggang', row.created_at);
      stats.sijil++;
    }

    // 5. Template Sijil (ringan: muat turun metadata + thumbnail_base64 tanpa file_base64 pukal 50MB)
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
      tplStmt.run(row.id, row.nama_template, row.peringkat, row.keterangan, row.file_path, row.file_name, row.file_size, row.kategori || 'kenaikan_tali_pinggang', row.page_count ?? 1, row.thumbnail_base64 || null, row.layout_config || null, row.created_at);
      stats.template_sijil++;
    }

    // 6. Admin Activity (Muat turun aktiviti terkini dari Turso Cloud ke SQLite)
    try {
      const remoteActivities = await turso.execute('SELECT id, type, action, title, detail, target_url, students_before, students_after, certs_before, certs_after, templates_before, templates_after, created_at FROM admin_activity ORDER BY id DESC LIMIT 150');
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
    tplStmt.run(row.id, row.nama_template, row.peringkat, row.keterangan, row.file_path, row.file_name, row.file_size, row.kategori || 'kenaikan_tali_pinggang', row.page_count ?? 1, row.thumbnail_base64 || null, row.layout_config || null, row.created_at);
  }
  return remoteTemplates.rows.length;
}

/**
 * Memastikan fail PDF templat (file_base64) sedia ada dalam SQLite tempatan.
 * Jika tiada secara tempatan, muat turun atas permintaan daripada Turso Cloud bagi templat ini sahaja.
 */
export async function ensureTemplateFileBase64(templateId) {
  const row = db.prepare('SELECT file_base64, file_path FROM template_sijil WHERE id=?').get(templateId);
  if (row?.file_base64) return row.file_base64;
  if (row?.file_path && fs.existsSync(row.file_path)) {
    try {
      const b64 = fs.readFileSync(row.file_path).toString('base64');
      db.prepare('UPDATE template_sijil SET file_base64=? WHERE id=?').run(b64, templateId);
      return b64;
    } catch (_) {}
  }
  if (!isTursoConfigured()) return null;
  try {
    const turso = getTursoClient();
    let res = await turso.execute({
      sql: 'SELECT file_base64, layout_config FROM template_sijil WHERE id=?',
      args: [templateId]
    });
    let tRow = res.rows?.[0];

    // Sandaran jika ID ini belum ada file_base64 di Turso, cari daripada templat dengan tajuk sama
    if (!tRow?.file_base64) {
      const localMeta = db.prepare('SELECT nama_template, peringkat FROM template_sijil WHERE id=?').get(templateId);
      if (localMeta?.nama_template) {
        const sibRes = await turso.execute({
          sql: "SELECT file_base64, layout_config FROM template_sijil WHERE nama_template=? AND file_base64 IS NOT NULL AND file_base64 != '' ORDER BY id DESC LIMIT 1",
          args: [localMeta.nama_template]
        });
        if (sibRes.rows?.[0]?.file_base64) {
          tRow = sibRes.rows[0];
        }
      }
    }

    if (tRow?.file_base64) {
      db.prepare('UPDATE template_sijil SET file_base64=?, layout_config=COALESCE(?, layout_config) WHERE id=?')
        .run(tRow.file_base64, tRow.layout_config || null, templateId);
      return tRow.file_base64;
    }
  } catch (err) {
    console.warn(`[Turso] Gagal memuat turun file_base64 templat ${templateId}:`, err.message);
  }
  return null;
}

