# Semakan semua permintaan ProSijil

Tarikh semakan: 4 November 2026.

| Permintaan | Pelaksanaan | Bukti semakan |
|---|---|---|
| Betulkan ralat muat naik `NOT NULL constraint failed: template_sijil.file_path` | Fail PDF disimpan dalam pangkalan data utama. Nilai `file_path` serasi dengan skema lama yang mewajibkannya. | Ujian muat naik pada skema SQLite dan libSQL lama, baharu serta cache lama. |
| Templat dan sijil yang dimuat naik atau dikemas kini kekal | Simpanan utama disahkan sebelum kejayaan dilaporkan; penyegerakan cache tidak menimpa PDF, susun atur atau kemas kini utama. | Ujian restart, kehilangan cache, kemas kini fail dan kegagalan simpanan. |
| Buang `template_sijil_deleted` | Jadual lama dibuang melalui migrasi SQLite dan Turso. Pemadaman admin menggunakan rekod utama. | Ujian migrasi dan restart memastikan jadual tidak wujud dan cache lama tidak menghidupkan semula templat yang dipadam. |
| Jana semua 290 pesilat tanpa tertinggal | Janaan menggunakan kelompok kecil dengan ID permintaan yang stabil, percubaan semula dan pengesahan setiap penerima pada akhir proses. PDF tidak memenuhi cakera sementara Vercel. | Ujian HTTP sebenar dengan pangkalan data libSQL berasingan mengesahkan 290 penerima dan 290 PDF yang sah, termasuk gangguan simpanan dan respons hilang. |
| Pengurusan cawangan di sidebar | Tambah/edit cawangan, kiraan ahli dan pautan Lihat Pesilat. Penamaan semula turut mengemas kini cawangan ahli. | Ujian API SQLite/libSQL dan pelayar untuk tambah, edit, nama baharu ahli serta navigasi senarai cawangan. |
| Butang Semua Jenis Sijil jelas untuk admin | Pilihan semua jenis serta kategori sijil tersedia; halaman templat menyediakan susunan butang responsif. | Build dan semakan pelayar pada paparan desktop serta telefon. |
| Tampal/seret senarai nama dan pratonton pilihan di langkah 2 | Terima teks/CSV/TSV, padankan nama atau ID, nyatakan nama tidak ditemui/berulang dan benarkan semakan pilihan sebelum janaan. | Ujian padanan 290 nama merentas cawangan dan halaman; aliran pelayar padanan, pratonton dan janaan. |
| Dark/light mode untuk admin, mula dalam light mode | Suis hanya dalam admin. Muat semula atau lawatan baharu bermula dengan light mode walaupun peranti memilih dark mode. | Ujian pelayar pertukaran tema, muat semula, portal awam dan paparan telefon. |
| Kiraan dashboard tepat | Kiraan mengambil satu snapshot pangkalan data utama, termasuk semua peringkat, cawangan dan kategori sijil. | Ujian data 290 pesilat, CRUD, cache kosong/lama, bacaan serentak dan perbandingan kiraan dengan rekod sebenar dalam pelayar. |
| Loading minimal dengan logo tegak berputar pada paksi Y | Logo berpusing pada paksi Y sahaja, tanpa kecondongan X/Z, orbit atau cahaya tambahan. Paparan ringkas digunakan semasa memuatkan, pemprosesan dan peralihan log masuk. | Build dan semakan pelayar tujuh kedudukan putaran, tiada kesan condong tetikus, paparan telefon 320/390px, kontras tema gelap, reduced motion serta logo gantian jika imej gagal dimuatkan. |
| Hubungi Kami, butang laporan dan borang awam | WhatsApp/panggilan En. Ifni (013 703 6786) dan En. Harith (011 6116 9689). Borang menyimpan laporan kekal dan memberikan nombor rujukan. Admin mempunyai peti masuk, status tindakan dan catatan dalaman. | Ujian simpanan, percubaan semula, privasi, akses admin dan borang pelayar. Butiran pegawai dan pembukaan borang turut disemak di laman sebenar tanpa menghantar laporan ujian ke production. |
| Asingkan sijil mengikut jenis, nama templat dan batch | Templat, janaan dan pengurusan sijil menggunakan koleksi jenis/nama. Setiap sesi janaan baharu mempunyai ID batch kekal. | Ujian nama sama dalam kategori berbeza, dua janaan pada tarikh sama, percubaan semula dan cache dimuat semula. |
| Tick seluruh batch sekaligus | Checkbox batch memilih semua rekod batch, termasuk yang tersembunyi akibat penapis. Bilangan penuh dan keadaan separa dipilih dipaparkan. | Ujian pelayar memilih tepat 290 sijil walaupun carian hanya memaparkan seorang, tanpa memilih batch lain. |
| Pastikan pertukaran penapis tidak menyembunyikan sijil secara mengelirukan | Menukar jenis, koleksi templat atau batch mengosongkan penapis cawangan/peringkat/cula yang berkaitan. | Bug dihasilkan semula dalam pelayar sebelum pembaikan; pertukaran jenis dan batch lulus selepas pembaikan. |

## Keputusan dan batas pengesahan

- `npm test`: 128 ujian lulus, termasuk simpanan kekal, migrasi skema, 290 penerima, cawangan, dashboard dan laporan.
- `npm run build`: berjaya.
- Audit pelayar tambahan menggunakan pangkalan data sementara yang berasingan; data pengguna sebenar tidak diubah untuk ujian.
- Janaan 290/290 diuji dengan data ujian. Kuota sebenar penyedia pangkalan data masih perlu mencukupi; jika penyedia menolak simpanan, sistem menunjukkan penerima yang gagal dan tidak melaporkan kejayaan palsu.
- Rekod lama yang tidak pernah menyimpan ID batch dilabel **Rekod tanpa ID batch** dan dikumpulkan mengikut jenis, tajuk, tarikh serta sumber. Batch sejarah tidak direka semula.
- Laporan masuk ke peti admin. Mesej WhatsApp atau emel tidak dihantar secara automatik.
