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
 students_before INTEGER,
 students_after INTEGER,
 certs_before INTEGER,
 certs_after INTEGER,
 templates_before INTEGER,
 templates_after INTEGER,
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
try { db.exec('ALTER TABLE admin_activity ADD COLUMN students_before INTEGER;'); } catch (_) {}
try { db.exec('ALTER TABLE admin_activity ADD COLUMN students_after INTEGER;'); } catch (_) {}
try { db.exec('ALTER TABLE admin_activity ADD COLUMN certs_before INTEGER;'); } catch (_) {}
try { db.exec('ALTER TABLE admin_activity ADD COLUMN certs_after INTEGER;'); } catch (_) {}
try { db.exec('ALTER TABLE admin_activity ADD COLUMN templates_before INTEGER;'); } catch (_) {}
try { db.exec('ALTER TABLE admin_activity ADD COLUMN templates_after INTEGER;'); } catch (_) {}
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

export function getSystemCounts() {
  try {
    const students = db.prepare('SELECT COUNT(*) as c FROM pesilat').get()?.c || 0;
    const certs = db.prepare('SELECT COUNT(*) as c FROM sijil').get()?.c || 0;
    const templates = db.prepare('SELECT COUNT(*) as c FROM template_sijil').get()?.c || 0;
    return { students, certs, templates };
  } catch (_) {
    return { students: 0, certs: 0, templates: 0 };
  }
}

export function logActivity(type, action, title, detail = '', target_url = '', metrics = {}) {
  try {
    let countsBefore = metrics.countsBefore || metrics.before || null;
    let countsAfter = metrics.countsAfter || metrics.after || null;

    const current = getSystemCounts();
    if (!countsAfter) {
      countsAfter = current;
    }
    if (!countsBefore) {
      countsBefore = { ...countsAfter };
      if (type === 'student') {
        if (action === 'create' || action === 'import_csv') countsBefore.students = Math.max(0, countsAfter.students - 1);
        else if (action === 'delete') countsBefore.students = countsAfter.students + 1;
      } else if (type === 'certificate') {
        if (action === 'create' || action === 'generate_batch') countsBefore.certs = Math.max(0, countsAfter.certs - 1);
        else if (action === 'delete') countsBefore.certs = countsAfter.certs + 1;
      } else if (type === 'template') {
        if (action === 'create') countsBefore.templates = Math.max(0, countsAfter.templates - 1);
        else if (action === 'delete') countsBefore.templates = countsAfter.templates + 1;
      }
    }

    const students_before = metrics.students_before ?? countsBefore.students ?? 0;
    const students_after = metrics.students_after ?? countsAfter.students ?? 0;
    const certs_before = metrics.certs_before ?? countsBefore.certs ?? 0;
    const certs_after = metrics.certs_after ?? countsAfter.certs ?? 0;
    const templates_before = metrics.templates_before ?? countsBefore.templates ?? 0;
    const templates_after = metrics.templates_after ?? countsAfter.templates ?? 0;

    const nowIso = new Date().toISOString();

    const info = db.prepare(`
      INSERT INTO admin_activity (
        type, action, title, detail, target_url,
        students_before, students_after,
        certs_before, certs_after,
        templates_before, templates_after,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      type, action, title, detail || '', target_url || '',
      students_before, students_after,
      certs_before, certs_after,
      templates_before, templates_after,
      nowIso
    );

    // Hadkan kepada 200 rekod terkini untuk kebersihan dan prestasi SQLite
    db.prepare(`
      DELETE FROM admin_activity
      WHERE id NOT IN (
        SELECT id FROM admin_activity ORDER BY id DESC LIMIT 200
      )
    `).run();

    // Hantar terus rekod aktiviti ke Turso Cloud secara asynchronously
    import('./turso.js').then(({ isTursoConfigured, getTursoClient }) => {
      if (isTursoConfigured()) {
        const turso = getTursoClient();
        turso.execute({
          sql: `INSERT INTO admin_activity (
            type, action, title, detail, target_url,
            students_before, students_after,
            certs_before, certs_after,
            templates_before, templates_after,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            type, action, title, detail || null, target_url || null,
            students_before, students_after,
            certs_before, certs_after,
            templates_before, templates_after,
            nowIso
          ]
        }).catch((err) => console.warn('[Turso Live Activity Insert Warning]', err.message));
      }
    }).catch(() => {});
  } catch (err) {
    console.warn('[Activity Log Warning]', err.message);
  }
}

// Kemaskini rekod sedia ada yang masih belum mempunyai maklumat kiraan sebelum/selepas
try {
  const currentCounts = getSystemCounts();
  db.prepare(`
    UPDATE admin_activity
    SET students_before = COALESCE(students_before, ?),
        students_after = COALESCE(students_after, ?),
        certs_before = COALESCE(certs_before, ?),
        certs_after = COALESCE(certs_after, ?),
        templates_before = COALESCE(templates_before, ?),
        templates_after = COALESCE(templates_after, ?)
    WHERE students_before IS NULL OR students_after IS NULL
  `).run(
    currentCounts.students, currentCounts.students,
    currentCounts.certs, currentCounts.certs,
    currentCounts.templates, currentCounts.templates
  );
} catch (_) {}

export function ensureSeedActivities() {
  try {
    const row = db.prepare('SELECT COUNT(*) as count FROM admin_activity').get();
    if (row && row.count > 0) return;

    const current = getSystemCounts();

    // Masukkan aktiviti awal berdasarkan rekod yang sudah wujud dalam sistem
    const certs = db.prepare(`
      SELECT s.nama_sijil, p.nama_penuh, s.created_at
      FROM sijil s
      LEFT JOIN pesilat p ON p.id = s.pesilat_id
      ORDER BY s.id DESC LIMIT 3
    `).all();
    for (const c of certs) {
      db.prepare(`
        INSERT INTO admin_activity (
          type, action, title, detail, target_url,
          students_before, students_after,
          certs_before, certs_after,
          templates_before, templates_after,
          created_at
        )
        VALUES ('certificate', 'create', 'Sijil Dikeluarkan', ?, '/admin/sijil', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `${c.nama_sijil} (${c.nama_penuh || 'Pesilat'})`,
        current.students, current.students,
        Math.max(0, current.certs - 1), current.certs,
        current.templates, current.templates,
        c.created_at || new Date().toISOString()
      );
    }

    const students = db.prepare(`
      SELECT nama_penuh, cawangan, created_at
      FROM pesilat
      ORDER BY id DESC LIMIT 2
    `).all();
    for (const s of students) {
      db.prepare(`
        INSERT INTO admin_activity (
          type, action, title, detail, target_url,
          students_before, students_after,
          certs_before, certs_after,
          templates_before, templates_after,
          created_at
        )
        VALUES ('student', 'create', 'Pendaftaran Pesilat', ?, '/admin/pesilat', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `${s.nama_penuh} • ${s.cawangan || 'Akademi'}`,
        Math.max(0, current.students - 1), current.students,
        current.certs, current.certs,
        current.templates, current.templates,
        s.created_at || new Date().toISOString()
      );
    }

    const templates = db.prepare(`
      SELECT nama_template, peringkat, created_at
      FROM template_sijil
      ORDER BY id DESC LIMIT 2
    `).all();
    for (const t of templates) {
      db.prepare(`
        INSERT INTO admin_activity (
          type, action, title, detail, target_url,
          students_before, students_after,
          certs_before, certs_after,
          templates_before, templates_after,
          created_at
        )
        VALUES ('template', 'create', 'Templat Dimuat Naik', ?, '/admin/templates', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `${t.nama_template} (${t.peringkat})`,
        current.students, current.students,
        current.certs, current.certs,
        Math.max(0, current.templates - 1), current.templates,
        t.created_at || new Date().toISOString()
      );
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
