# Pembaikan prestasi ProSijil

Semakan: 4 November 2026.

## Punca kelewatan

1. Banyak permintaan API menunggu penyegerakan seluruh pangkalan data ke cache SQLite, pada permulaan instance dan selepas 45 saat. Permintaan kecil boleh menunggu data admin, pesilat, sijil, templat serta tetapan yang tidak berkaitan.
2. Semua halaman admin, PDF.js dan alat pemprosesan PDF dimasukkan dalam fail JavaScript permulaan walaupun pengguna hanya membuka portal awam.
3. Portal dan borang log masuk menunggu semakan sesi sebelum dipaparkan.
4. Selepas menyimpan setiap sijil, pelayan membaca kembali seluruh PDF dan membaca semula pesilat untuk mengisi cache. Langkah ini menambah perjalanan rangkaian semasa janaan pukal.
5. Polling tetap berjalan ketika tab tersembunyi, dan beberapa permintaan serupa boleh berjalan serentak. Membuka atau menutup modal templat turut mengulangi muat awal senarai.

## Perubahan

| Bahagian | Selepas pembaikan |
|---|---|
| API | Setiap endpoint membaca rekod yang diperlukan terus dari pangkalan data utama. Tiada salinan penuh sebelum permintaan. |
| Sesi dan log masuk | Akaun disemak terus pada rekod utama; cache kosong atau lama tidak menjadi sumber pengesahan. Perbandingan dan hash kata laluan menggunakan API tak segerak. |
| Permulaan pangkalan data | DDL dan semakan lajur digabungkan dalam batch. Skema baharu menggunakan maksimum empat perjalanan rangkaian dalam ujian. Migrasi skema lama dan perlumbaan antara instance masih dikendalikan. |
| Senarai pesilat | Kiraan, halaman rekod, peringkat dan cawangan dibaca dalam satu batch snapshot, selepas pengesahan sesi. |
| Tetapan dan aktiviti | Dibaca terus dari sumber utama. Kegagalan menulis tetapan/kata laluan tidak dilaporkan sebagai kejayaan. Kiraan aktiviti menggunakan data utama. |
| Janaan sijil | `INSERT ... RETURNING` mengesahkan simpanan dan panjang fail tanpa memuat turun semula setiap PDF. Data pesilat yang sudah dibaca digunakan untuk cache metadata. Pengesahan akhir setiap penerima kekal. |
| Halaman awam | Dipaparkan semasa semakan sesi berjalan di latar. Borang log masuk juga boleh digunakan terus; pengesahan sesi admin pada API tetap diwajibkan. |
| Modul halaman | Halaman dimuatkan mengikut laluan. Sidebar admin kekal dipaparkan semasa modul halaman seterusnya dimuatkan. |
| PDF | PDF.js hanya dimuatkan apabila PDF benar-benar perlu dirender. Alat pengoptimuman PDF hanya dimuatkan apabila fail besar perlu diproses. Thumbnail sedia ada tidak memerlukannya. |
| Bacaan serentak | GET yang sama ketika masih berjalan dikongsi; respons siap tidak disimpan sebagai cache jangka masa. Bacaan seterusnya tetap mengambil data terkini. Mutasi dan permintaan yang boleh dibatalkan diasingkan. |
| Polling | Tab tersembunyi tidak melakukan polling. Polling aktif berjalan secara senyap tanpa indikator loading tambahan. Modal templat tidak mencetuskan muat awal senarai berulang. |

## Bukti semakan

- Fail JavaScript utama build sebelum pembaikan: kira-kira **1,615.92 kB**, gzip **489.77 kB**.
- Fail JavaScript utama selepas pembaikan: kira-kira **248.02 kB**, gzip **79.61 kB**. Ini ukuran fail utama, bukan jumlah semua fail yang mungkin dimuatkan semasa melayari beberapa halaman.
- Modul halaman templat kini kira-kira **77.01 kB**; enjin PDF dan alat pengoptimuman diasingkan.
- **138 ujian automatik lulus**, termasuk skema lama, simpanan kekal, janaan 290/290, kegagalan simpanan, sumber pengesahan utama, snapshot senarai, penggabungan permintaan dan tetapan.
- Ujian pelayar mengesahkan portal dipaparkan walaupun respons sesi ditahan, log masuk sebenar berjaya, sidebar kekal semasa modul halaman ditahan, dan modul admin/PDF tidak dimuatkan pada portal awam.
- Ujian pelayar mengesahkan thumbnail sedia ada tidak memuatkan enjin PDF; pratonton PDF baharu, muat naik, pemilihan dan janaan tetap menghasilkan rekod PDF serta ID batch yang disahkan.
- Laluan pengoptimuman PDF yang dimuatkan secara dinamik turut diuji: PDF ujian 7,200,883 bait berjaya dipratonton, dioptimumkan kepada 13,625 bait dan disimpan sebagai PDF satu halaman yang sah.
- Ujian pelayar mengesahkan tab tersembunyi tidak melakukan polling; dua polling serentak digabungkan menjadi satu bacaan templat dan satu bacaan pesilat tanpa indikator loading latar.

Ujian tulis menggunakan pangkalan data sementara yang berasingan. Ukuran bundle dan bilangan perjalanan rangkaian membuktikan pengurangan kerja; ia bukan jaminan masa respons tetap untuk semua sambungan atau keadaan hosting.
