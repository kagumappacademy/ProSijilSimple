#!/usr/bin/env node
import { testTursoConnection, isTursoConfigured, TURSO_DATABASE_URL } from '../src/turso.js';

console.log('\n========================================');
console.log('   PROSIJIL • PEMERIKSA SAMBUNGAN TURSO   ');
console.log('========================================\n');

if (!isTursoConfigured()) {
  console.log('❌ TURSO_DATABASE_URL belum ditetapkan dalam fail .env.');
  console.log('👉 Sila masukkan URL dan Auth Token dalam fail .env anda:');
  console.log('   TURSO_DATABASE_URL=libsql://prosijil-db-username.turso.io');
  console.log('   TURSO_AUTH_TOKEN=eyJhbGciOi...');
  console.log('\nSistem kini menggunakan SQLite tempatan (server/data/prosijil.sqlite).\n');
  process.exit(0);
}

console.log(`📡 Menyambung ke Turso: ${TURSO_DATABASE_URL}`);
console.log('⏳ Sedang menguji ketersambungan...\n');

testTursoConnection()
  .then((res) => {
    if (res.connected) {
      console.log('✅ Sambungan ke Turso BERJAYA!');
      console.log(`⏱️  Masa tindak balas (Latency): ${res.latencyMs}ms\n`);
      console.log('📊 Bilangan Rekod di Turso Cloud:');
      for (const [table, count] of Object.entries(res.tables)) {
        console.log(`   • ${table.padEnd(16)}: ${count} rekod`);
      }
      console.log('\n💡 Tip: Jalankan "npm run turso:push" untuk menghantar data tempatan ke Turso.');
    } else {
      console.log('❌ Gagal berhubung ke Turso:');
      console.log(`   Ralat: ${res.error || res.message}\n`);
      console.log('Sila pastikan:');
      console.log('1. Database URL bermula dengan libsql:// atau https://');
      console.log('2. TURSO_AUTH_TOKEN adalah sah dan belum tamat tempoh.');
    }
  })
  .catch((err) => {
    console.error('❌ Ralat tidak dijangka:', err.message);
  });
