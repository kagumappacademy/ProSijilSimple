#!/usr/bin/env node
import { pushLocalToTurso, isTursoConfigured, TURSO_DATABASE_URL } from '../src/turso.js';

console.log('\n=============================================');
console.log('   PROSIJIL • SYNC / PUSH DATA KE TURSO CLOUD   ');
console.log('=============================================\n');

if (!isTursoConfigured()) {
  console.log('❌ TURSO_DATABASE_URL belum ditetapkan dalam fail .env.');
  console.log('👉 Sila masukkan URL dan Auth Token dalam fail .env anda:');
  console.log('   TURSO_DATABASE_URL=libsql://prosijil-db-username.turso.io');
  console.log('   TURSO_AUTH_TOKEN=eyJhbGciOi...\n');
  process.exit(1);
}

console.log(`📡 Menghubungkan ke Turso Cloud: ${TURSO_DATABASE_URL}`);
console.log('⏳ Sedang memindahkan data daripada SQLite tempatan ke Turso...\n');

pushLocalToTurso()
  .then((stats) => {
    console.log('✅ MIGRASI / PUSH KE TURSO BERJAYA!\n');
    console.log('📊 Ringkasan Rekod Yang Dipindahkan:');
    console.log(`   • Admin Users   : ${stats.admin_users} rekod`);
    console.log(`   • Pesilat       : ${stats.pesilat} rekod`);
    console.log(`   • Sijil         : ${stats.sijil} rekod`);
    console.log(`   • Templat Sijil : ${stats.template_sijil} rekod`);
    console.log(`   • Tetapan       : ${stats.settings} rekod\n`);
    console.log('🎉 Data pangkalan data anda kini selamat dan tersimpan di Turso Cloud!');
  })
  .catch((err) => {
    console.error('❌ Ralat semasa memindahkan data ke Turso:', err.message);
    process.exit(1);
  });
