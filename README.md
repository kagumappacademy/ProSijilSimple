# ProSijil — Sistem Pengurusan Sijil Pesilat (Full Stack)

**Sistem lengkap portal admin + portal awam**, dibina mengikut `prompt_sistem_sijil.md` yang diberikan. Reka bentuk menggunakan tema hijau zamrud dan emas, responsif pada telefon, dengan animasi halaman dan interaksi ringan.

## Teknologi

- **Frontend:** React 18, Vite 6, Tailwind CSS 3, React Router, Framer Motion, Lucide Icons, Sonner Toast
- **Backend:** Node.js 22.13+ (disyorkan Node.js 22 LTS), Express, SQLite (`node:sqlite`), PDFKit, multer, csv-parse, bcryptjs & JWT HTTP-only cookies
- **Pangkalan data:** SQLite dan fail sijil di direktori data setempat / volume yang persisten
- **Production hosting:** VPS, Render atau Railway **dengan persistent disk / volume**, atau Docker di pelayan sendiri. Bukan deployment Vercel stateless tanpa pindaan storan/database.

## Cara run di VS Code (Windows / Mac / Linux)

1. Pastikan sudah memasang [Node.js 22](https://nodejs.org/) atau lebih baharu dan mempunyai akses internet untuk memasang dependency.
2. Extract ZIP, buka folder **`ProSijil-Full-System`** dalam VS Code.
3. Buka **Terminal** di VS Code pada root folder (folder yang mengandungi `package.json`).
4. Salin konfigurasi:
   - Windows (PowerShell): `Copy-Item .env.example .env`
   - Mac / Linux: `cp .env.example .env`
5. Buka fail `.env`, **tukar `JWT_SECRET` kepada rentetan rawak sekurang-kurangnya 32 aksara**. Guna `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"` untuk menjana secret.
6. Jalankan:

```bash
npm install
npm run admin:create -- --username admin --password "TukarKataLaluanKuat!2026"
npm run dev
```

7. Buka alamat berikut:
   - **Portal Awam:** http://localhost:5173/
   - **Log Masuk Admin:** http://localhost:5173/admin/login
   - **API Status:** http://localhost:5173/api/health
8. Log masuk menggunakan username dan password yang **anda tetapkan pada langkah 6**. Tiada akaun admin default disimpan dalam kod.

> **Nota Windows:** Jika PowerShell mengganggu simbol tertentu dalam kata laluan CLI, gunakan tanda petik yang sesuai dan elakkan melaksanakan arahan itu pada komputer yang dikongsi (kata laluan CLI boleh muncul dalam history). Untuk production, cipta admin pada terminal pelayan yang selamat.

### Ingin cuba dengan data contoh?

```bash
npm run demo:seed
```

Kemudian cari `PS-DEMO001` dalam portal awam. Ini hanya **data rekaan**; jangan gunakan pada sistem sebenar tanpa memadam data demo.

### Jalankan versi build satu port (deployment)

```bash
npm run build
npm start
```

Aplikasi akan dibuka di **http://localhost:4000** dan API menggunakan port yang sama. Ubah `PORTAL_URL=http://localhost:4000` dalam `.env` untuk ujian build satu-port tempatan; gunakan domain HTTPS sebenar apabila online.

### Jalankan ujian automatik

```bash
npm test
```

Ujian mengesahkan API, log masuk, CRUD pesilat, import CSV, penciptaan sijil, pengesahan, muat turun PDF dan pembatalan pautan apabila sijil dipadam.

## Ciri-ciri lengkap

| Fungsi | Butiran |
|---|---|
| Landing page awam | Carian nama penuh/ID, profil, cawangan, peringkat dan senarai sijil |
| Muat turun PDF | Sijil dijana automatik atau fail PDF/JPG/PNG ditukar kepada PDF ketika download |
| Pengesahan sijil | Pautan token unik /verify/token, automatik terbatal jika sijil dipadam |
| Login pentadbir | Kata laluan bcrypt, token JWT dalam cookie HTTP-only, sesi 8 jam, login rate limit |
| Dashboard | Statistik pesilat, sijil, cawangan, taburan peringkat dan aktiviti terkini |
| CRUD pesilat | Tambah, kemaskini, padam, tapis, cari, auto ID dan eksport CSV |
| Pengurusan cawangan | Menu sidebar untuk tambah/kemas kini cawangan, kiraan pesilat dan sijil, serta pautan terus ke pesilat cawangan |
| Import CSV | Terima `Nama Peserta`, `Nama Cawangan`, `Peringkat`, `No KP` (kolum No KP optional), elak duplikasi |
| Pengurusan sijil | Tetapkan pesilat, tarikh, jenis sijil, upload fail atau jana templat rasmi PDF |
| Tetapan sistem | Nama akademi, subtajuk, penandatangan, jawatan dan kata laluan admin |
| Animasi & UX | Motion entrance, hover cards, efek ambient, loading state, modal, toast, skeleton-style elements, sidebar mobile |
| Mobile | Layout responsif, jadual scroll, sidebar boleh dibuka di telefon |

## Format CSV

Sistem menerima tajuk kolum `nama_penuh`, `no_kp_atau_id`, `peringkat`, `cawangan` atau alternatif `Nama Peserta`, `No KP`, `Peringkat`, `Nama Cawangan`. **Hanya nama wajib**. Jika fail cuma ada tiga kolum (`Nama Peserta`, `Nama Cawangan`, `Peringkat`), sistem tetap boleh import dan akan buat ID `PS-XXXXXXXX` secara automatik. Simpan CSV sebagai **CSV UTF-8**. Fail contoh tersedia pada `examples/import-pesilat.csv`.

## Deployment pilihan: Docker

1. Lengkapkan `.env` (tukar `NODE_ENV=production`, `JWT_SECRET`, `PORTAL_URL`).
2. Pada pelayan dengan Docker Compose jalankan `docker compose up --build -d`.
3. Cipta admin menggunakan `docker compose exec prosijil npm run admin:create -- --username admin --password "password-minimum-12-aksara"`.
4. Letak reverse proxy HTTPS (Nginx / Caddy) di depan port 4000.
5. **Backup volume `prosijil_data` secara berkala**, termasuk SQLite dan folder uploads.

## Penyimpanan kekal sijil dan templat PDF

Fail sijil PDF/JPG/PNG dan templat disimpan bersama rekod pangkalan data sebagai `file_base64`, tanpa tempoh luput. Fail baharu tidak bergantung pada folder sementara pelayan. Muat naik dan penggantian fail hanya dilaporkan berjaya selepas simpanan pangkalan data disahkan. Kemas kini metadata sijil uploaded mengekalkan fail sedia ada; kegagalan simpanan fail baharu mengekalkan versi terakhir yang berjaya disimpan. Muat turun sentiasa membaca versi utama, walaupun cache atau cakera masih mempunyai salinan lama.

Sijil janaan manual juga disimpan sebagai PDF tetap semasa dicipta. Perubahan tetapan organisasi tidak mengubah PDF yang telah dikeluarkan. Jika admin mengemas kini sijil jenis generated, PDF baharu dijana dan disimpan. Sijil lama yang hanya mempunyai metadata generated akan disimpan sebagai PDF ketika kali pertama dimuat turun.

Jadual `template_sijil_deleted` tidak lagi digunakan dan dibuang secara automatik semasa inisialisasi SQLite/Turso selepas restart atau redeploy. Pemadaman berlaku terus pada rekod utama; cache disesuaikan dengan rekod yang masih wujud di awan. Penyegerakan biasa tidak mencipta semula rekod yang tiada di awan atau menggantikan fail/layout terkini dengan cache lama.

Hosting Vercel memerlukan `TURSO_DATABASE_URL` dan kelayakan akses yang sah kerana fail sementara pelayan tidak kekal. Pemasangan SQLite tempatan memerlukan direktori `DATA_DIR` pada cakera atau volume kekal. Sandarkan pangkalan data secara berkala. Fail lama yang masih mempunyai salinan cache/cakera akan disalin semula ke storan awan apabila dibaca; jika semua salinan asal sudah hilang, admin perlu memuat naik semula PDF asal.

Untuk pembangunan tempatan tanpa Turso, biarkan kedua-dua pemboleh ubah Turso kosong seperti dalam `.env.example`. Untuk hosting Vercel, masukkan URL dan token sebenar dalam tetapan environment hosting sebelum deployment. Jadual baharu dan lajur storan PDF lama akan disediakan secara automatik apabila sambungan digunakan.

Pangkalan data lama yang mewajibkan `template_sijil.file_path` juga disokong: templat yang disimpan dalam `file_base64` menggunakan rentetan kosong untuk `file_path`. Muat naik dan penyegerakan tidak memerlukan fail sementara atau pemadaman jadual lama. Selepas mengemas kini kod, redeploy pelayan untuk membetulkan ralat `NOT NULL constraint failed: template_sijil.file_path` pada laman online.

`npm run turso:push` kini hanya memulihkan fail kosong pada rekod awan yang masih wujud. Untuk migrasi awal yang disengajakan daripada SQLite tempatan, gunakan `npm run turso:push -- --import-new`; mod ini boleh memasukkan rekod tempatan yang tiada di awan. Ia tidak dijalankan oleh penyegerakan automatik dan tidak menggantikan rekod/fail awan sedia ada.

Muat naik melalui portal dihadkan kepada jumlah 4MB bagi setiap permintaan, termasuk kedua-dua PDF dan thumbnail. PDF templat besar akan cuba dioptimumkan sebelum saiz akhir diperiksa; jika masih terlalu besar, kecilkan PDF asal. Fail PDF rosak, kosong atau berkunci akan ditolak dengan mesej yang jelas.

Operasi pesilat, dashboard, carian awam dan janaan menggunakan rekod awan terkini apabila Turso ditetapkan. Import CSV disimpan dalam kelompok kecil dengan ID yang diberikan pangkalan data awan, tanpa menolak seluruh cache lama ke awan. Jika import terhenti, hanya kelompok yang disahkan tersimpan dikira berjaya; muat naik semula CSV yang sama untuk menyambung dan melangkau rekod sedia ada. Ralat janaan manual dikembalikan melalui API, dan sijil JPG/PNG ditukar kepada PDF sebenar semasa dimuat turun, termasuk apabila fail cakera sementara sudah tiada.

### Janaan keseluruhan 290 pesilat

Butang janaan memproses semua pilihan dalam kelompok 5 pesilat. Kelompok yang terganggu tidak membatalkan pemprosesan pesilat berikutnya; pesilat yang gagal sementara dicuba semula. ID janaan disimpan dalam pelayar sehingga admin memilih janaan baharu, jadi sambungan semula menggunakan token sijil yang sama dan tidak menghasilkan pendua. Sebelum status lengkap dipaparkan, API menyemak setiap ID pesilat terpilih dan fail yang benar-benar tersimpan dalam pangkalan data utama. Peringkat tanpa templat perlu dilengkapkan sebelum memulakan janaan keseluruhan.

Di Vercel, SQLite hanyalah cache metadata dalam memori dan tidak menulis ke cakera sementara. Apabila Turso digunakan, PDF sijil/templat tidak disalin ke cache SQLite; salinan kekal dibaca daripada Turso. PDF baharu hanya memasukkan aksara fon yang diperlukan bagi nama pesilat, bukannya keseluruhan fon. Perubahan ini mengelakkan pertumbuhan cache PDF/WAL semasa janaan pukal. Jika storan utama pembekal sendiri mencapai hadnya, sistem tetap memaparkan pesilat yang belum tersimpan dan tidak melaporkan janaan lengkap secara palsu.

Ujian `server/tests/bulk-290.test.js` mengesahkan 290 penerima berbeza dan 290 PDF dua muka surat yang sah dengan had cache 1MB, termasuk sambungan terputus, simpanan sementara gagal, percubaan semula dan semakan ketiadaan pendua. Ujian menggunakan pangkalan data berasingan tanpa menyentuh data sebenar.

## Fail penting

Menu **Pengurusan Cawangan** tersedia di `/admin/cawangan`. Cawangan lama daripada rekod pesilat dimasukkan dalam katalog secara automatik, dan cawangan baharu boleh disimpan walaupun belum mempunyai pesilat. Nama dan keterangan disimpan kekal dalam SQLite/Turso. Kemas kini nama mengubah katalog dan semua pesilat cawangan tersebut dalam satu transaksi, sambil mengekalkan ID pesilat dan fail sijil. Nama pendua ditolak. **Lihat Pesilat** membuka senarai dengan tapisan cawangan yang dikekalkan dalam URL; borang daftar turut mencadangkan cawangan yang telah ditambah.

- `docs/STRUKTUR_DAN_FUNGSI.md`: struktur, API dan penerangan modul
- `server/src/db.js`: skema SQLite (dijana automatik pada startup)
- `client/src/pages/`: semua halaman UI
- `server/tests/`: ujian integrasi API
- `.env.example`: template environment variables

## Privasi dan keselamatan

- Gunakan **nama penuh tepat** atau **ID tepat** untuk carian awam agar rekod pelajar tidak boleh dilihat melalui carian sebahagian nama.
- ID/No KP sebenar hanya ditunjukkan kepada admin, bukan pada paparan awam.
- Sijil boleh dimuat turun menggunakan pautan token yang hanya dipaparkan selepas carian padanan tepat. Token panjang rawak unik bukan langkah privasi mutlak: sesiapa dengan pautan sijil boleh membukanya.
- Untuk kegunaan organisasi sebenar, sediakan notis privasi, kebenaran ibu bapa yang berkaitan dan dasar akses/data/backup. Pertimbangkan lapisan pengesahan tambahan sebelum memaparkan sijil kanak-kanak secara awam.
- Sistem e-mel tidak disertakan. Untuk hosting Vercel, tetapkan pangkalan data Turso bagi penyimpanan rekod dan PDF kekal; lihat bahagian penyimpanan templat di atas.

**Panduan tambahan:** `docs/STRUKTUR_DAN_FUNGSI.md`.
