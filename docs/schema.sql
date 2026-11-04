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
