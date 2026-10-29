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
 layout_config TEXT,
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
 layout_config TEXT,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS settings (
 key TEXT PRIMARY KEY, value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS admin_activity (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 type TEXT NOT NULL,
 action TEXT NOT NULL,
 title TEXT NOT NULL,
 detail TEXT,
 target_url TEXT,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pesilat_nama ON pesilat(nama_penuh);
CREATE INDEX IF NOT EXISTS idx_sijil_pesilat ON sijil(pesilat_id);
CREATE INDEX IF NOT EXISTS idx_template_peringkat ON template_sijil(nama_template, peringkat);
CREATE INDEX IF NOT EXISTS idx_activity_created ON admin_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_id ON admin_activity(id DESC);
`);

// Migrasi lajur tambahan jika jadual telah wujud sebelum ini
try { db.exec('ALTER TABLE template_sijil ADD COLUMN file_base64 TEXT;'); } catch (_) {}
try { db.exec('ALTER TABLE sijil ADD COLUMN file_base64 TEXT;'); } catch (_) {}
try { db.exec('ALTER TABLE template_sijil ADD COLUMN kategori TEXT;'); } catch (_) {}
try { db.exec('ALTER TABLE sijil ADD COLUMN kategori TEXT;'); } catch (_) {}
try { db.exec('ALTER TABLE template_sijil ADD COLUMN page_count INTEGER DEFAULT 1;'); } catch (_) {}
try { db.exec('ALTER TABLE template_sijil ADD COLUMN thumbnail_base64 TEXT;'); } catch (_) {}
try { db.exec('ALTER TABLE template_sijil ADD COLUMN layout_config TEXT;'); } catch (_) {}
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

export function logActivity(type, action, title, detail = '', target_url = '') {
  try {
    db.prepare(`
      INSERT INTO admin_activity (type, action, title, detail, target_url, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(type, action, title, detail || '', target_url || '');

    // Hadkan kepada 200 rekod terkini untuk kebersihan dan prestasi SQLite
    db.prepare(`
      DELETE FROM admin_activity
      WHERE id NOT IN (
        SELECT id FROM admin_activity ORDER BY id DESC LIMIT 200
      )
    `).run();
  } catch (err) {
    console.warn('[Activity Log Warning]', err.message);
  }
}

export function ensureSeedActivities() {
  try {
    const row = db.prepare('SELECT COUNT(*) as count FROM admin_activity').get();
    if (row && row.count > 0) return;

    // Masukkan aktiviti awal berdasarkan rekod yang sudah wujud dalam sistem
    const certs = db.prepare(`
      SELECT s.nama_sijil, p.nama_penuh, s.created_at
      FROM sijil s
      LEFT JOIN pesilat p ON p.id = s.pesilat_id
      ORDER BY s.id DESC LIMIT 3
    `).all();
    for (const c of certs) {
      db.prepare(`
        INSERT INTO admin_activity (type, action, title, detail, target_url, created_at)
        VALUES ('certificate', 'create', 'Sijil Dikeluarkan', ?, '/admin/sijil', ?)
      `).run(`${c.nama_sijil} (${c.nama_penuh || 'Pesilat'})`, c.created_at || new Date().toISOString());
    }

    const students = db.prepare(`
      SELECT nama_penuh, cawangan, created_at
      FROM pesilat
      ORDER BY id DESC LIMIT 2
    `).all();
    for (const s of students) {
      db.prepare(`
        INSERT INTO admin_activity (type, action, title, detail, target_url, created_at)
        VALUES ('student', 'create', 'Pendaftaran Pesilat', ?, '/admin/pesilat', ?)
      `).run(`${s.nama_penuh} • ${s.cawangan || 'Akademi'}`, s.created_at || new Date().toISOString());
    }

    const templates = db.prepare(`
      SELECT nama_template, peringkat, created_at
      FROM template_sijil
      ORDER BY id DESC LIMIT 2
    `).all();
    for (const t of templates) {
      db.prepare(`
        INSERT INTO admin_activity (type, action, title, detail, target_url, created_at)
        VALUES ('template', 'create', 'Templat Dimuat Naik', ?, '/admin/templates', ?)
      `).run(`${t.nama_template} (${t.peringkat})`, t.created_at || new Date().toISOString());
    }
  } catch (err) {
    console.warn('[Activity Seed Warning]', err.message);
  }
}

// Inisialisasi rekod aktiviti awal jika pangkalan data belum mempunyai sebarang aktiviti
ensureSeedActivities();

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
