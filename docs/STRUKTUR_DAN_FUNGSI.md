# ProSijil — Struktur Sistem & Panduan Kod

## Seni bina

```
                     ┌────────────────────────────┐
 Ibu Bapa / Admin ──►│ React + Vite + TailwindCSS │
                     │ Komponen & animasi Motion  │
                     └──────────────┬─────────────┘
                                    │  /api (HTTP + cookie)
                     ┌──────────────▼─────────────┐
                     │ Express.js REST API        │
                     │ Auth, carian, CRUD, CSV    │
                     │ Multer, PDFKit             │
                     └─────┬──────────────┬───────┘
                           │              │
                     SQLite lokal   Fail PDF/JPG/PNG
                     (server/data)   (server/data/uploads)
```

## Folder penting

| Folder / Fail | Fungsi |
|---|---|
| `client/src/pages/Public.jsx` | Landing page carian, keputusan pesilat/sijil dan pengesahan |
| `client/src/pages/Auth.jsx` | Borang log masuk admin |
| `client/src/components/AdminLayout.jsx` | Sidebar, header dan susun atur admin |
| `client/src/pages/Dashboard.jsx` | Statistik, carta bar dan sijil terkini |
| `client/src/pages/Students.jsx` | CRUD pesilat, carian, penapis dan eksport |
| `client/src/pages/Certificates.jsx` | Penjanaan sijil dan muat naik PDF/JPG/PNG |
| `client/src/pages/Import.jsx` | Import CSV pukal dan muat turun templat |
| `client/src/pages/Settings.jsx` | Tetapan organisasi dan tukar kata laluan |
| `client/src/components/UI.jsx` | Reusable buttons, modals, inputs, empty states |
| `client/src/index.css` | Gaya global, grid dan sokongan reduced motion |
| `client/tailwind.config.js` | Tema forest green + gold |
| `server/src/app.js` | Semua API & peraturan akses |
| `server/src/db.js` | Skema SQL SQLite + inisialisasi database |
| `server/src/auth.js` | JWT session dalam HTTP-only cookie |
| `server/src/csv.js` | Peta nama kolum CSV dan escape export |
| `server/src/pdf.js` | Reka bentuk PDF sijil (A4 landscape) |
| `server/scripts/create-admin.js` | CLI cipta admin tanpa default password |
| `server/scripts/demo-seed.js` | Contoh data (pilihan sahaja) |
| `server/tests/integration.test.js` | Ujian API & fungsi asas |

## Skema pangkalan data

- `admin_users(id, username, password_hash, created_at)`
- `pesilat(id, nama_penuh, no_kp_atau_id, peringkat, cawangan, tarikh_daftar, created_at, updated_at)`
- `sijil(id, pesilat_id, nama_sijil, tarikh_isu, jenis, file_path, file_type, public_token, created_at)`
- `settings(key, value)`

SQLite akan mencipta jadual pada kali pertama API/skrip admin dijalankan. `pesilat_id` memautkan sijil kepada pesilat dengan `ON DELETE CASCADE`.

## Aliran utama

1. Admin memasukkan pelajar atau mengimport CSV.
2. Jika No KP/ID tidak ada, sistem menjana `PS-XXXXXXXX`.
3. Admin memilih pesilat, nama dan tarikh sijil. Jika tiada fail, PDF sijil dijana ketika dimuat turun.
4. Ibu bapa membuat carian **nama penuh tepat** atau **ID tepat**. Carian sebahagian nama tidak dipaparkan bagi mengehadkan pendedahan maklumat pesilat.
5. Hasil memaparkan profil ringkas dan setiap sijil boleh dimuat turun PDF.
6. Pautan `/verify/:token` membolehkan kesahihan sijil disemak. Padam sijil akan membatalkan pautan.

## API utama

| Kaedah | Route | Akses |
|---|---|---|
| POST | `/api/auth/login` | Awam (had percubaan) |
| GET | `/api/auth/me` | Admin |
| POST | `/api/auth/logout` | Awam |
| POST | `/api/auth/password` | Admin |
| GET | `/api/public/search?q=` | Awam (had kadar) |
| GET | `/api/public/verify/:token` | Awam |
| GET | `/api/public/certificates/:token/download` | Awam |
| GET | `/api/admin/dashboard` | Admin |
| GET, POST | `/api/admin/students` | Admin |
| PUT, DELETE | `/api/admin/students/:id` | Admin |
| POST | `/api/admin/students/import` | Admin |
| GET | `/api/admin/students/export` | Admin |
| GET, POST | `/api/admin/certificates` | Admin |
| DELETE | `/api/admin/certificates/:id` | Admin |
| GET, PUT | `/api/admin/settings` | Admin |

## Had & perhatian sebelum go-live

- Pangkalan data SQLite dan fail upload mesti berada pada **storan persisten** untuk production. Host yang memadam fail semasa redeploy (contoh Vercel Functions tanpa storage berasingan) tidak sesuai untuk setup SQLite lokal ini.
- Sediakan HTTPS, backup berkala SQLite + folder uploads, monitoring dan dasar retensi data. Hadkan akses ke admin.
- Tiada e-mel automatik, tandatangan kriptografi PDF atau integrasi pembayaran. Pautan pengesahan menyatakan rekod semasa dalam pangkalan data, **bukan** tandatangan PDF cryptographic.
- Sijil yang dijana akan menggunakan butiran tetapan terkini; jika perlu membekukan versi pada tarikh keluaran, eksport dan simpan PDF akhir sebagai sijil uploaded.
- Untuk privasi, jangan gunakan nombor KP sebenar dalam demo atau repositori awam.
