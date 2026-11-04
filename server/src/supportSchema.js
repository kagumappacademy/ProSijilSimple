export const SUPPORT_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS public_reports (
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
  )`,
  'CREATE INDEX IF NOT EXISTS idx_public_reports_status_created ON public_reports(status,created_at DESC)',
];
