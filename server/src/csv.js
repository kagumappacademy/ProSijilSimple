import { parse } from 'csv-parse/sync';
import { saneName, trim } from './validation.js';
const aliases = {
 nama_penuh: ['nama_penuh','nama peserta','nama pesilat','nama pelajar','nama','full name','student name'],
 no_kp_atau_id: ['no_kp_atau_id','no kp','no kad pengenalan','no. kad pengenalan','nric','ic','id','no id','no. kp','nombor kad pengenalan'],
 peringkat: ['peringkat','peringkat semasa','tali pinggang','bengkung','belt','level'],
 cawangan: ['cawangan','nama cawangan','gelanggang','nama gelanggang','branch'],
 tarikh_daftar: ['tarikh_daftar','tarikh daftar','tarikh pendaftaran','registration date','tarikh','date']
};
const key = s => String(s || '').replace(/^\uFEFF/,'').trim().toLowerCase().replace(/[_\-]+/g,' ').replace(/\s+/g,' ');
function identify(header) {
 const text = key(header);
 for (const [canonical, values] of Object.entries(aliases)) {
  if (values.some(a => key(a) === text)) return canonical;
 }
 return null;
}
export function decodeCsv(buffer) {
 let source = buffer.toString('utf8').replace(/^\uFEFF/,'');
 if (source.includes('\uFFFD')) {
   // UTF-8 decoding errors often indicate Windows-1252; let user re-save to UTF-8 rather than corrupt names.
   throw new Error('Fail CSV perlu disimpan dalam format UTF-8.');
 }
 const first = source.split(/\r?\n/,1)[0];
 const delimiter = (first.match(/;/g)||[]).length > (first.match(/,/g)||[]).length ? ';' : ',';
 const records = parse(source, {columns:true, skip_empty_lines:true, relax_quotes:false, bom:true, delimiter, trim:true});
 if (!records.length) throw new Error('Fail CSV kosong atau tiada baris pesilat.');
 const headers = Object.keys(records[0]);
 const mapping = Object.fromEntries(headers.map(h => [h,identify(h)]).filter(v=>v[1]));
 if (!Object.values(mapping).includes('nama_penuh')) throw new Error('Kolum Nama Peserta / nama_penuh tidak ditemui.');
 if (records.length > 10000) throw new Error('Maksimum 10,000 baris untuk satu import.');
 return records.map((rec, i) => {
  const row = {};
  for (const [h,k] of Object.entries(mapping)) row[k] = rec[h];
  return { baris:i+2, nama_penuh:saneName(row.nama_penuh), no_kp_atau_id:trim(row.no_kp_atau_id,60), peringkat:trim(row.peringkat,90)||'Belum ditetapkan', cawangan:trim(row.cawangan,160)||'Tidak dinyatakan', tarikh_daftar:trim(row.tarikh_daftar,10) };
 });
}
export function csvSafe(s) {
 const v = String(s ?? '');
 const safe = /^[\s]*[=+@\-]/.test(v) ? "'" + v : v;
 return '"' + safe.replace(/"/g,'""') + '"';
}
