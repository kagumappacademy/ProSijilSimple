export const REPORT_CATEGORIES = [
  {id:'pertanyaan',bm:'Pertanyaan umum',eng:'General enquiry'},
  {id:'sijil',bm:'Masalah sijil / muat turun',eng:'Certificate / download issue'},
  {id:'teknikal',bm:'Ralat sistem / bug',eng:'System error / bug'},
  {id:'maklumat',bm:'Pembetulan maklumat',eng:'Information correction'},
  {id:'lain',bm:'Lain-lain',eng:'Other'},
];
export const REPORT_ROLES = [{id:'ibu_bapa',bm:'Ibu bapa / penjaga',eng:'Parent / guardian'},{id:'pesilat',bm:'Pesilat',eng:'Student'},{id:'lain',bm:'Lain-lain',eng:'Other'}];
export const REPORT_STATUSES = [
  {id:'baru',bm:'Baharu',eng:'New',color:'rose'},
  {id:'dalam_semakan',bm:'Dalam semakan',eng:'In progress',color:'gold'},
  {id:'selesai',bm:'Selesai',eng:'Resolved',color:'emerald'},
];
export const reportLabel = (options,id,lang) => options.find(option=>option.id===id)?.[lang] || id;
export const reportDate = (value,lang) => value ? new Date(value.includes('T')?value:value.replace(' ','T')+'Z').toLocaleString(lang==='eng'?'en-GB':'ms-MY') : '—';
