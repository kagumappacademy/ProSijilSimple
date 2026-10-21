import { db } from '../src/db.js';
import crypto from 'node:crypto';
const samples=[
 ['Nur Aisyah Binti Abdullah','PS-DEMO001','Awan Putih','Skudai'],
 ['Muhammad Adam Bin Zulkifli','PS-DEMO002','Awan Putih Cula Merah 1','Taman Universiti'],
 ['Siti Nur Amirah Binti Hamdan','PS-DEMO003','Awan Putih Cula Merah 2','Pasir Gudang'],
 ['Muhammad Arif Bin Ahmad','PS-DEMO004','Awan Putih Cula Merah 3','Skudai'],
 ['Nur Fatihah Binti Ismail','PS-DEMO005','Awan Kuning','Kulai'],
 ['Ahmad Hakimi Bin Razak','PS-DEMO006','Awan Hijau','Senai']
];
for(const [name,id,level,branch] of samples){
 const r=db.prepare('INSERT OR IGNORE INTO pesilat(nama_penuh,no_kp_atau_id,peringkat,cawangan) VALUES(?,?,?,?)').run(name,id,level,branch);
 if(!r.changes)continue;
 db.prepare('INSERT INTO sijil(pesilat_id,nama_sijil,tarikh_isu,jenis,public_token) VALUES(?,?,?,?,?)').run(Number(r.lastInsertRowid),'Sijil Kenaikan Bengkung','2026-10-20','generated',crypto.randomUUID());
}
console.log('Data DEMO telah ditambah. Carian contoh: PS-DEMO001');
