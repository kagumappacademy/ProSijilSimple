#!/usr/bin/env node
import {pushLocalToTurso,isTursoConfigured} from '../src/turso.js';

if(!isTursoConfigured()){
  console.error('Sila tetapkan TURSO_DATABASE_URL dan TURSO_AUTH_TOKEN dalam .env.');
  process.exit(1);
}
const importNewRecords=process.argv.includes('--import-new');
console.log(importNewRecords
  ? 'Migrasi manual: salin rekod tempatan yang belum wujud ke Turso.'
  : 'Semakan storan: pulihkan fail yang kosong pada rekod Turso sedia ada.');
try {
  const stats=await pushLocalToTurso(undefined,{importNewRecords});
  console.log('Selesai. Bilangan rekod baharu atau fail dipulihkan:',stats);
  if(!importNewRecords)console.log('Untuk migrasi awal daripada SQLite tempatan: npm run turso:push -- --import-new');
} catch(error){
  console.error('Simpanan ke Turso gagal:',error.message);
  process.exitCode=1;
}
