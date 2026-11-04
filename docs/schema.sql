-- ProSijil SQLite schema (semak server/src/db.js untuk sumber sebenar + defaults)
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS pesilat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama_penuh TEXT NOT NULL,
  no_kp_atau_id TEXT NOT NULL UNIQUE COLLATE NOCASE,
  peringkat TEXT NOT NULL DEFAULT 'Belum ditetapkan',
  cawangan TEXT NOT NULL DEFAULT 'Tidak dinyatakan',
  tarikh_daftar TEXT NOT NULL DEFAULT (date('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS cawangan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama_cawangan TEXT NOT NULL UNIQUE COLLATE NOCASE,
  keterangan TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO cawangan(nama_cawangan)
  SELECT DISTINCT trim(cawangan) FROM pesilat WHERE length(trim(cawangan))>0;
CREATE TABLE IF NOT EXISTS sijil (
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
  batch_id TEXT,
  template_name TEXT,
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
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_pesilat_nama ON pesilat(nama_penuh);
CREATE INDEX IF NOT EXISTS idx_sijil_pesilat ON sijil(pesilat_id);
CREATE INDEX IF NOT EXISTS idx_template_peringkat ON template_sijil(nama_template,peringkat);

CREATE INDEX IF NOT EXISTS idx_sijil_batch ON sijil(batch_id);
CREATE TABLE IF NOT EXISTS public_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT NOT NULL UNIQUE,
    reference TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK(category IN ('pertanyaan','sijil','teknikal','maklumat','lain')),
    reporter_name TEXT NOT NULL,
    reporter_role TEXT NOT NULL CHECK(reporter_role IN ('ibu_bapa','pesilat','lain')),
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    student_name TEXT NOT NULL DEFAULT '',
    branch TEXT NOT NULL DEFAULT '',
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    page_path TEXT NOT NULL DEFAULT '/',
    status TEXT NOT NULL DEFAULT 'baru' CHECK(status IN ('baru','dalam_semakan','selesai')),
    admin_notes TEXT NOT NULL DEFAULT '',
    updated_by TEXT NOT NULL DEFAULT '',
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
CREATE INDEX IF NOT EXISTS idx_public_reports_status_created ON public_reports(status,created_at DESC);
