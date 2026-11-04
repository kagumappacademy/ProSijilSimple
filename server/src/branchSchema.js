export const BRANCH_SCHEMA=`CREATE TABLE IF NOT EXISTS cawangan (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 nama_cawangan TEXT NOT NULL UNIQUE COLLATE NOCASE,
 keterangan TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

export const SEED_BRANCHES_SQL=`INSERT OR IGNORE INTO cawangan(nama_cawangan)
 SELECT DISTINCT trim(cawangan) FROM pesilat WHERE length(trim(cawangan))>0`;

export const BRANCH_NAMES_SQL=`SELECT nama_cawangan AS nama FROM cawangan
 UNION SELECT trim(cawangan) AS nama FROM pesilat WHERE length(trim(cawangan))>0
 ORDER BY nama COLLATE NOCASE`;
