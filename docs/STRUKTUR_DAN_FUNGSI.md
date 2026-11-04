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
                     SQLite lokal   Turso (jika dikonfigurasi)
                     (server/data)   Rekod + fail file_base64
```

## Folder penting

| Folder / Fail | Fungsi |
|---|---|
| `client/src/pages/Public.jsx` | Landing page carian, keputusan pesilat/sijil dan pengesahan |
| `client/src/pages/Auth.jsx` | Borang log masuk admin |
| `client/src/components/AdminLayout.jsx` | Sidebar, header dan susun atur admin |
| `client/src/pages/Dashboard.jsx` | Statistik, carta bar dan sijil terkini |
| `client/src/pages/Students.jsx` | CRUD pesilat, carian, penapis dan eksport |
| `client/src/pages/Branches.jsx` | Tambah/edit cawangan, kiraan ahli/sijil dan pautan pesilat bertapis |
| `client/src/pages/Certificates.jsx` | Penjanaan sijil dan muat naik PDF/JPG/PNG |
| `client/src/pages/Import.jsx` | Import CSV pukal dan muat turun templat |
| `client/src/pages/Settings.jsx` | Tetapan organisasi dan tukar kata laluan |
| `client/src/components/UI.jsx` | Reusable buttons, modals, inputs, empty states |
| `client/src/index.css` | Gaya global, grid dan sokongan reduced motion |
| `client/tailwind.config.js` | Tema forest green + gold |
| `server/src/app.js` | Semua API & peraturan akses |
| `server/src/db.js` | Skema SQL SQLite + inisialisasi database |
| `server/src/branchStore.js` | Katalog cawangan dan pertukaran nama ahli secara transaksi |
| `server/src/auth.js` | JWT session dalam HTTP-only cookie |
| `server/src/csv.js` | Peta nama kolum CSV dan escape export |
| `server/src/pdf.js` | Reka bentuk PDF sijil (A4 landscape) |
| `server/src/certificateStore.js` | Simpan/kemas kini fail sijil kekal dan pulihkan fail lama |
| `server/src/templateStore.js` | Simpan fail templat dan layout kekal |
| `server/src/turso.js` | Migrasi skema dan penyegerakan dengan awan sebagai sumber utama |
| `client/src/lib/generateBatch.js` | Kelompok janaan, percubaan semula dan pengesahan setiap penerima |
| `server/tests/bulk-290.test.js` | Ujian 290 sijil dengan cache terhad dan gangguan sambungan |
| `server/scripts/create-admin.js` | CLI cipta admin tanpa default password |
| `server/scripts/demo-seed.js` | Contoh data (pilihan sahaja) |
| `server/tests/integration.test.js` | Ujian API & fungsi asas |

## Skema pangkalan data

- `admin_users(id, username, password_hash, created_at)`
- `pesilat(id, nama_penuh, no_kp_atau_id, peringkat, cawangan, tarikh_daftar, created_at, updated_at)`
- `cawangan(id, nama_cawangan, keterangan, created_at, updated_at)`
- `sijil(id, pesilat_id, nama_sijil, tarikh_isu, jenis, file_path, file_type, public_token, file_base64, kategori, batch_id, template_name, created_at)`
- `template_sijil(id, nama_template, peringkat, file_name, file_size, file_base64, kategori, page_count, thumbnail_base64, layout_config, created_at)`
- `public_reports(id, request_id, reference, category, reporter_name, reporter_role, email, phone, student_name, branch, subject, message, page_path, status, admin_notes, updated_by, version, created_at, updated_at)`
- `settings(key, value)`

SQLite akan mencipta jadual pada kali pertama API/skrip admin dijalankan. `pesilat_id` memautkan sijil kepada pesilat dengan `ON DELETE CASCADE`.

## Aliran utama

1. Admin memasukkan pelajar atau mengimport CSV.
2. Jika No KP/ID tidak ada, sistem menjana `PS-XXXXXXXX`.
3. Admin memilih pesilat, nama dan tarikh sijil. Fail uploaded disimpan dalam pangkalan data; jika tiada fail, PDF dijana dan disimpan ketika sijil dicipta. Kemas kini fail menggantikan versi utama selepas simpanan berjaya.
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
| GET, POST | `/api/admin/branches` | Admin, katalog termasuk cawangan tanpa pesilat |
| PUT | `/api/admin/branches/:id` | Admin, nama dan semua ahli dikemas kini dalam satu transaksi |
| PUT, DELETE | `/api/admin/students/:id` | Admin |
| POST | `/api/admin/students/import` | Admin |
| GET | `/api/admin/students/export` | Admin |
| GET, POST | `/api/admin/certificates` | Admin |
| PUT, DELETE | `/api/admin/certificates/:id` | Admin |
| GET, POST | `/api/admin/templates` | Admin |
| PUT, DELETE | `/api/admin/templates/:id` | Admin |
| POST | `/api/admin/templates/:id/layout` | Admin |
| POST | `/api/admin/templates/generate-batch` | Admin, maksimum 25 penerima setiap permintaan |
| POST | `/api/admin/templates/generation-status` | Admin, pengesahan maksimum 500 penerima setiap permintaan |
| GET, PUT | `/api/admin/settings` | Admin |

## Had & perhatian sebelum go-live

- Pangkalan data SQLite dan fail upload mesti berada pada **storan persisten** untuk production. Host yang memadam fail semasa redeploy (contoh Vercel Functions tanpa storage berasingan) tidak sesuai untuk setup SQLite lokal ini.
- Sediakan HTTPS, backup berkala SQLite + folder uploads, monitoring dan dasar retensi data. Hadkan akses ke admin.
- Tiada e-mel automatik, tandatangan kriptografi PDF atau integrasi pembayaran. Pautan pengesahan menyatakan rekod semasa dalam pangkalan data, **bukan** tandatangan PDF cryptographic.
- Sijil yang telah dikeluarkan menyimpan PDF tetap. Perubahan tetapan tidak mengubahnya; kemas kini sijil generated melalui admin akan menjana dan menyimpan versi baharu.
- Untuk privasi, jangan gunakan nombor KP sebenar dalam demo atau repositori awam.

## Hubungi Kami dan laporan portal

Portal awam mempunyai bahagian Hubungi Kami serta butang terapung Lapor Masalah pada halaman utama dan semakan sijil. Pegawai lalai ialah En. Ifni (013 703 6786) dan En. Harith (011 6116 9689), dengan pautan WhatsApp dan panggilan. Admin boleh mengubah pegawai dan emel pilihan melalui Tetapan > Hubungan Portal Awam.

Borang menerima pertanyaan atau laporan tanpa akaun. Sekurang-kurangnya satu emel atau telefon diperlukan. Rujukan LAP diberikan hanya selepas rekod disahkan tersimpan dalam jadual public_reports pada pangkalan data utama. Permintaan berulang menggunakan request_id yang sama tidak menduplikasi laporan. Had penghantaran ialah 8 permintaan setiap 15 minit bagi setiap alamat IP pada satu proses.

Menu admin Pertanyaan & Laporan menyediakan carian, penapis, butiran, status Baru / Dalam Semakan / Selesai dan catatan dalaman. Catatan dan butiran pengirim hanya boleh dibaca admin; versi rekod menghalang kemas kini lama menimpa tindakan admin lain. Tiada mesej dihantar secara automatik kepada pegawai atau pengirim.

| Kaedah | Route | Akses |
|---|---|---|
| GET | /api/public/contact | Butiran hubungan awam sahaja |
| POST | /api/public/reports | Awam, pengesahan medan dan had kadar |
| GET, PUT | /api/admin/support-contact | Admin |
| GET | /api/admin/reports | Admin, carian dan paginasi |
| GET, PUT | /api/admin/reports/:id | Admin, versi diperlukan semasa kemas kini |

## Koleksi templat dan batch sijil

Templat Sijil, Janaan Sijil dan Pengurusan Sijil diasingkan mengikut jenis sijil dan nama templat. Nama yang sama bagi jenis berbeza ialah dua koleksi berasingan; permintaan janaan menghantar kategori yang dipilih. Setiap sesi janaan baharu menyimpan batch_id kekal dan salinan nama templat dalam template_name pada sijil. Semua kelompok kecil, percubaan semula dan pengesahan akhir bagi sesi yang sama menggunakan batch yang sama. Dua sesi pada tarikh yang sama tetap berasingan. Metadata ini tidak mengubah PDF atau token pengesahan sedia ada.

Pengurusan Sijil menyediakan paparan Templat & Batch dan penapis batch. Checkbox pada kepala batch memilih keseluruhan batch, termasuk rekod yang tidak kelihatan akibat tapisan cawangan, peringkat atau carian. Bilangan penuh, bilangan dipilih dan bilangan dipaparkan ditunjukkan. Pilihan individu dan status checkbox separa dipilih turut tersedia. Pemadaman pukal masih memerlukan pengesahan bilangan rekod.

Rekod lama atau muat naik individu yang tiada batch_id dikumpulkan mengikut jenis, tajuk, tarikh sijil dan sumber serta dilabel Rekod tanpa ID batch. Sistem tidak mereka semula batch sejarah yang tidak pernah direkodkan. Migrasi SQLite/Turso menambah medan baharu secara automatik; penyegerakan metadata tidak boleh menulis balik salinan cache lama ke pangkalan data utama.
