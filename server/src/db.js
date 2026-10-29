import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { dataDir } from './config.js';

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(path.join(dataDir, 'uploads'), { recursive: true });
fs.mkdirSync(path.join(dataDir, 'templates'), { recursive: true });
export const db = new DatabaseSync(path.join(dataDir, 'prosijil.sqlite'));
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
db.exec(`
CREATE TABLE IF NOT EXISTS admin_users (
 id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE COLLATE NOCASE,
 password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS pesilat (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 nama_penuh TEXT NOT NULL, no_kp_atau_id TEXT NOT NULL UNIQUE COLLATE NOCASE,
 peringkat TEXT NOT NULL DEFAULT 'Belum ditetapkan', cawangan TEXT NOT NULL DEFAULT 'Tidak dinyatakan',
 tarikh_daftar TEXT NOT NULL DEFAULT (date('now')),
 created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sijil (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 pesilat_id INTEGER NOT NULL REFERENCES pesilat(id) ON DELETE CASCADE,
 nama_sijil TEXT NOT NULL, tarikh_isu TEXT NOT NULL,
 jenis TEXT NOT NULL CHECK(jenis IN ('generated','uploaded')),
 file_path TEXT, file_type TEXT, public_token TEXT NOT NULL UNIQUE,
 file_base64 TEXT,
 kategori TEXT DEFAULT 'kenaikan_tali_pinggang',
 page_count INTEGER DEFAULT 1,
 thumbnail_base64 TEXT,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS template_sijil (
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
);
CREATE TABLE IF NOT EXISTS settings (
 key TEXT PRIMARY KEY, value TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pesilat_nama ON pesilat(nama_penuh);
CREATE INDEX IF NOT EXISTS idx_sijil_pesilat ON sijil(pesilat_id);
CREATE INDEX IF NOT EXISTS idx_template_peringkat ON template_sijil(nama_template, peringkat);
`);

// Migrasi lajur tambahan jika jadual telah wujud sebelum ini
try { db.exec('ALTER TABLE template_sijil ADD COLUMN file_base64 TEXT;'); } catch (_) {}
try { db.exec('ALTER TABLE sijil ADD COLUMN file_base64 TEXT;'); } catch (_) {}
try { db.exec('ALTER TABLE template_sijil ADD COLUMN kategori TEXT;'); } catch (_) {}
try { db.exec('ALTER TABLE sijil ADD COLUMN kategori TEXT;'); } catch (_) {}
try { db.exec('ALTER TABLE template_sijil ADD COLUMN page_count INTEGER DEFAULT 1;'); } catch (_) {}
try { db.exec('ALTER TABLE template_sijil ADD COLUMN thumbnail_base64 TEXT;'); } catch (_) {}
const defaults = {
 nama_organisasi: 'AKADEMI PRO SILAT',
 sub_organisasi: 'Pusat Latihan Silat Pintar',
 nama_penandatangan: 'Pengarah Akademi',
 jawatan_penandatangan: 'Pengarah Program',
 tema_warna: '#991b1b'
};
for (const [key, value] of Object.entries(defaults)) {
 db.prepare('INSERT OR IGNORE INTO settings (key,value) VALUES (?,?)').run(key, value);
}

// Pastikan akaun admin KagumProsijil sentiasa sedia ada dan dikemaskini
db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?) ON CONFLICT(username) DO UPDATE SET password_hash=excluded.password_hash')
  .run('KagumProsijil', '$2b$12$m.gOPB24d1olq2e5HQc00OfdsGvthuhyxkkd3OgI3KC2QFW..Zi4u');
db.prepare("DELETE FROM admin_users WHERE username = 'admin'").run();
export function getSettings() {
 return Object.fromEntries(db.prepare('SELECT key,value FROM settings').all().map(x => [x.key,x.value]));
}
export function makeId() {
 return 'PS-' + Math.random().toString(36).slice(2, 10).toUpperCase();
}
export function uniqueId() {
 let id;
 do { id = makeId(); } while (db.prepare('SELECT 1 FROM pesilat WHERE no_kp_atau_id = ?').get(id));
 return id;
}

export async function syncWithTursoIfAvailable() {
  try {
    const { isTursoConfigured, pullTursoToLocal } = await import('./turso.js');
    if (isTursoConfigured()) {
      console.log('[Turso] Mengambil data terkini daripada Turso Cloud...');
      await pullTursoToLocal();
      console.log('[Turso] Data berjaya disegerakkan.');
    }
  } catch (err) {
    console.warn('[Turso] Amaran auto-sync:', err.message);
  }
}

export function triggerTursoSync() {
  import('./turso.js').then(({ isTursoConfigured, pushLocalToTurso }) => {
    if (isTursoConfigured()) {
      pushLocalToTurso().catch((e) => console.warn('[Turso] Background sync error:', e.message));
    }
  }).catch(() => {});
}
