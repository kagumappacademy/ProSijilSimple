import { createClient } from '@libsql/client';
import { db } from './db.js';
import { projectRoot } from './config.js';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.join(projectRoot, '.env') });

export const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL || '';
export const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || '';

/**
 * Checks if Turso database environment variables are set.
 */
export function isTursoConfigured() {
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
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_pesilat_nama ON pesilat(nama_penuh)`,
  `CREATE INDEX IF NOT EXISTS idx_sijil_pesilat ON sijil(pesilat_id)`,
  `CREATE INDEX IF NOT EXISTS idx_template_peringkat ON template_sijil(nama_template, peringkat)`
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

  // 5. Template Sijil
  const localTemplates = db.prepare('SELECT id, nama_template, peringkat, keterangan, file_path, file_name, file_size, file_base64, kategori, page_count, thumbnail_base64, created_at FROM template_sijil').all();
  const tplStmts = localTemplates.map((row) => ({
    sql: 'INSERT OR REPLACE INTO template_sijil (id, nama_template, peringkat, keterangan, file_path, file_name, file_size, file_base64, kategori, page_count, thumbnail_base64, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    args: [row.id, row.nama_template, row.peringkat, row.keterangan || null, row.file_path, row.file_name, row.file_size || 0, row.file_base64 || null, row.kategori || 'kenaikan_tali_pinggang', row.page_count || 1, row.thumbnail_base64 || null, row.created_at],
  }));
  await batchExecute(turso, tplStmts);
  stats.template_sijil = localTemplates.length;

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

    // 4. Sijil
    const remoteSijil = await turso.execute('SELECT id, pesilat_id, nama_sijil, tarikh_isu, jenis, file_path, file_type, public_token, file_base64, kategori, created_at FROM sijil');
    const sijilStmt = db.prepare('INSERT OR REPLACE INTO sijil (id, pesilat_id, nama_sijil, tarikh_isu, jenis, file_path, file_type, public_token, file_base64, kategori, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const row of remoteSijil.rows) {
      sijilStmt.run(row.id, row.pesilat_id, row.nama_sijil, row.tarikh_isu, row.jenis, row.file_path, row.file_type, row.public_token, row.file_base64, row.kategori || 'kenaikan_tali_pinggang', row.created_at);
      stats.sijil++;
    }

    // 5. Template Sijil
    let remoteTemplates;
    try {
      remoteTemplates = await turso.execute('SELECT id, nama_template, peringkat, keterangan, file_path, file_name, file_size, file_base64, kategori, page_count, thumbnail_base64, created_at FROM template_sijil');
    } catch (_) {
      remoteTemplates = await turso.execute('SELECT id, nama_template, peringkat, keterangan, file_path, file_name, file_size, file_base64, kategori, page_count, created_at FROM template_sijil');
    }
    const tplStmt = db.prepare('INSERT OR REPLACE INTO template_sijil (id, nama_template, peringkat, keterangan, file_path, file_name, file_size, file_base64, kategori, page_count, thumbnail_base64, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const row of remoteTemplates.rows) {
      tplStmt.run(row.id, row.nama_template, row.peringkat, row.keterangan, row.file_path, row.file_name, row.file_size, row.file_base64, row.kategori || 'kenaikan_tali_pinggang', row.page_count ?? 1, row.thumbnail_base64 || null, row.created_at);
      stats.template_sijil++;
    }

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return stats;
}

/**
 * Pulls only template_sijil from Turso cloud database and saves into local SQLite.
 */
export async function pullTemplatesFromTurso() {
  if (!isTursoConfigured()) return 0;
  const turso = getTursoClient();
  let remoteTemplates;
  try {
    remoteTemplates = await turso.execute('SELECT id, nama_template, peringkat, keterangan, file_path, file_name, file_size, file_base64, kategori, page_count, thumbnail_base64, created_at FROM template_sijil');
  } catch (_) {
    remoteTemplates = await turso.execute('SELECT id, nama_template, peringkat, keterangan, file_path, file_name, file_size, file_base64, kategori, page_count, created_at FROM template_sijil');
  }
  const tplStmt = db.prepare('INSERT OR REPLACE INTO template_sijil (id, nama_template, peringkat, keterangan, file_path, file_name, file_size, file_base64, kategori, page_count, thumbnail_base64, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  for (const row of remoteTemplates.rows) {
    tplStmt.run(row.id, row.nama_template, row.peringkat, row.keterangan, row.file_path, row.file_name, row.file_size, row.file_base64, row.kategori || 'kenaikan_tali_pinggang', row.page_count ?? 1, row.thumbnail_base64 || null, row.created_at);
  }
  return remoteTemplates.rows.length;
}

