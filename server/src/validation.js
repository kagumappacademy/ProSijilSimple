export const trim = (v, max=250) => String(v ?? '').trim().slice(0,max);
export const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s + 'T00:00:00Z').getTime()) && new Date(s + 'T00:00:00Z').toISOString().slice(0,10) === s;
export const saneName = s => trim(s,160).replace(/\s+/g,' ');
export function validatePesilat(body) {
 const nama_penuh = saneName(body.nama_penuh);
 const no_kp_atau_id = trim(body.no_kp_atau_id,60);
 const peringkat = trim(body.peringkat,90) || 'Belum ditetapkan';
 const cawangan = trim(body.cawangan,160) || 'Tidak dinyatakan';
 const tarikh_daftar = trim(body.tarikh_daftar,10) || new Date().toISOString().slice(0,10);
 if (nama_penuh.length < 2) throw new Error('Nama penuh perlu sekurang-kurangnya 2 aksara.');
 if (!validDate(tarikh_daftar)) throw new Error('Tarikh daftar tidak sah.');
 return { nama_penuh, no_kp_atau_id, peringkat, cawangan, tarikh_daftar };
}
