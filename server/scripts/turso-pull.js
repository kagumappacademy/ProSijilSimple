#!/usr/bin/env node
import { pullTursoToLocal, isTursoConfigured, TURSO_DATABASE_URL } from '../src/turso.js';

console.log('\n=============================================');
console.log('   PROSIJIL • PULL DATA DARI TURSO KE LOCAL   ');
console.log('=============================================\n');

if (!isTursoConfigured()) {
  console.log('❌ TURSO_DATABASE_URL belum ditetapkan dalam fail .env.');
  console.log('👉 Sila masukkan URL dan Auth Token dalam fail .env anda:');
  console.log('   TURSO_DATABASE_URL=libsql://prosijil-db-username.turso.io');
  console.log('   TURSO_AUTH_TOKEN=eyJhbGciOi...\n');
  process.exit(1);
}

console.log(`📡 Menghubungkan ke Turso Cloud: ${TURSO_DATABASE_URL}`);
console.log('⏳ Sedang memuat turun data dari Turso ke SQLite tempatan...\n');

pullTursoToLocal()
  .then((stats) => {
    console.log('✅ PULL DARI TURSO BERJAYA!\n');
    console.log('📊 Ringkasan Rekod Yang Dimuat Turun:');
    console.log(`   • Admin Users   : ${stats.admin_users} rekod`);
    console.log(`   • Pesilat       : ${stats.pesilat} rekod`);
    console.log(`   • Sijil         : ${stats.sijil} rekod`);
    console.log(`   • Templat Sijil : ${stats.template_sijil} rekod`);
    console.log(`   • Tetapan       : ${stats.settings} rekod\n`);
    console.log('🎉 Pangkalan data tempatan anda kini telah dikemaskini daripada Turso Cloud!');
  })
  .catch((err) => {
    console.error('❌ Ralat semasa memuat turun data dari Turso:', err.message);
    process.exit(1);
  });
