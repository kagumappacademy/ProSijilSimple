import {seedCloudAdmin} from './cloud-admin.js';
import { test, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import { PDFDocument } from 'pdf-lib';

export async function registerDashboardTests(cloud) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prosijil-dashboard-'));
  assert.ok(path.resolve(tmp).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(tmp).startsWith('prosijil-dashboard-'));
  process.env.DATA_DIR = tmp; process.env.VERCEL = '';
  process.env.NODE_ENV = cloud ? 'production' : 'test';
  process.env.TURSO_DATABASE_URL = cloud ? 'file::memory:' : ''; process.env.TURSO_AUTH_TOKEN = '';
  process.env.JWT_SECRET = 'dashboard_snapshot_tests_secret_minimum_32_chars';
  const { db } = await import('../../src/db.js');
  const { getTursoClient, initTursoSchema } = await import('../../src/turso.js');
  const remote = cloud ? getTursoClient() : null;
  if (remote) await initTursoSchema(remote);
  if(remote)await seedCloudAdmin(remote,db);
  const { default: app } = await import('../../src/app.js');
  const server = app.listen(0); await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const admin = db.prepare('SELECT id FROM admin_users LIMIT 1').get();
  const cookie = 'prosijil_admin=' + jwt.sign({ sub: String(admin.id) }, process.env.JWT_SECRET, { issuer: 'prosijil', expiresIn: '1h' });
  const execute = (sql, args = []) => remote ? remote.execute({ sql, args }) : db.prepare(sql).run(...args);
  const prefix = cloud ? 'Cloud dashboard' : 'Local dashboard';
  async function call(url = '/api/admin/dashboard', body, method = body ? 'POST' : 'GET', authenticated = true) {
    const form = body instanceof FormData;
    const res = await fetch(base + url, { method, headers: { ...(authenticated ? { Cookie: cookie } : {}), ...(body && !form ? { 'Content-Type': 'application/json' } : {}) }, body: form ? body : body ? JSON.stringify(body) : undefined });
    return { res, data: await res.json() };
  }
  function assertTotals(data, count = 290) {
    assert.equal(data.pesilat, count);
    assert.equal(data.byLevel.reduce((sum, row) => sum + row.total, 0), count);
    assert.equal(data.byBranch.reduce((sum, row) => sum + row.total, 0), count);
  }
  async function seed() {
    const statements = [];
    for (let index = 0; index < 10; index++) statements.push({ sql: 'INSERT INTO cawangan(id,nama_cawangan) VALUES(?,?)', args: [index + 1, `Cawangan ${String(index + 1).padStart(2, '0')}`] });
    statements.push({ sql: "INSERT INTO cawangan(id,nama_cawangan) VALUES(11,'  CAWANGAN   01  '),(12,'Cawangan Kosong'),(13,'Tidak dinyatakan')", args: [] });
    for (let index = 0; index < 290; index++) {
      let branch = `Cawangan ${String(index % 10 + 1).padStart(2, '0')}`;
      let level = `Peringkat ${String(index % 12 + 1).padStart(2, '0')}`;
      if (index === 0) { branch = '  cawangan   01 '; level = ' peringkat   01 '; }
      if (index === 1) { branch = 'CAWANGAN 01'; level = 'PERINGKAT 01'; }
      if (index === 2) { branch = ''; level = ''; }
      if (index === 3) { branch = 'Tidak dinyatakan'; level = 'Belum ditetapkan'; }
      if (index === 4) branch = '   ';
      if (index === 5) branch = 'Legacy Branch';
      statements.push({ sql: 'INSERT INTO pesilat(id,nama_penuh,no_kp_atau_id,peringkat,cawangan) VALUES(?,?,?,?,?)', args: [index + 1, `Pesilat ${index + 1}`, `DASH-${index + 1}`, level, branch] });
    }
    for (let index = 1; index <= 29; index++) statements.push({
      sql: `INSERT INTO sijil(id,pesilat_id,nama_sijil,tarikh_isu,jenis,file_path,public_token,kategori,created_at) VALUES(?,?,?,'2026-11-04','uploaded','',?,?,?)`,
      args: [index, index, 'Sijil ' + index, 'dashboard-' + index, ['kenaikan_tali_pinggang', 'pencapaian', 'penghargaan', 'penyertaan'][index % 4], index === 1 ? '2026-11-04 12:00:00' : `2026-10-${String(index).padStart(2, '0')} 12:00:00`],
    });
    statements.push({ sql: `INSERT INTO sijil(id,pesilat_id,nama_sijil,tarikh_isu,jenis,file_path,public_token,created_at) VALUES(100,1,'Sijil Lama 1','2026-01-01','uploaded','','old-100','2026-01-01 00:00:00'),(101,2,'Sijil Lama 2','2026-02-01','uploaded','','old-101','2026-02-01 00:00:00')`, args: [] });
    if (remote) await remote.batch(statements, 'write');
    else { db.exec('BEGIN'); try { for (const row of statements) db.prepare(row.sql).run(...row.args); db.exec('COMMIT'); } catch (error) { db.exec('ROLLBACK'); throw error; } }
    // A damaged legacy record must not inflate counts beyond the management list.
    await execute('PRAGMA foreign_keys=OFF');
    await execute("INSERT INTO sijil(id,pesilat_id,nama_sijil,tarikh_isu,jenis,file_path,public_token,created_at) VALUES(900,99999,'Orphan','2030-01-01','uploaded','','orphan','2030-01-01 00:00:00')");
    await execute('PRAGMA foreign_keys=ON');
  }
  beforeEach(async () => {
    if (remote) await remote.batch(['DELETE FROM sijil', 'DELETE FROM pesilat', 'DELETE FROM cawangan'], 'write');
    db.exec('DELETE FROM sijil; DELETE FROM pesilat; DELETE FROM cawangan;');
  });
  after(async () => { await new Promise(resolve => server.close(resolve)); remote?.close(); db.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

  test(prefix + ': only administrators can read statistics', async () => {
    assert.equal((await call('/api/admin/dashboard', undefined, 'GET', false)).res.status, 401);
  });

  test(prefix + ': an empty database returns actual zero totals and no cached records', async () => {
    const { res, data } = await call();
    assert.equal(res.status, 200); assertTotals(data, 0);
    assert.equal(data.sijil, 0); assert.equal(data.branches, 0);
    assert.deepEqual(data.byBranch, []); assert.deepEqual(data.recent, []);
    assert.equal(res.headers.get('cache-control'), 'no-store');
    assert.ok(Number.isFinite(Date.parse(data.updatedAt)));
  });

  test(prefix + ': all 290 students appear across every rank and branch, without truncation or duplicate spelling', async () => {
    await seed();
    const { data } = await call(); assertTotals(data);
    assert.equal(data.byLevel.length, 13); assert.equal(data.byBranch.length, 13);
    assert.equal(data.branches, 12); assert.equal(data.unassignedBranchStudents, 3);
    assert.equal(data.byBranch.find(row => row.name === 'Cawangan Kosong').total, 0);
    assert.equal(data.byBranch.filter(row => row.name.toLowerCase() === 'cawangan 01').length, 1);
    assert.equal(data.byLevel.filter(row => row.name.toLowerCase() === 'peringkat 01').length, 1);
    assert.equal(data.byLevel.find(row => row.name === 'Belum ditetapkan').total, 2);
    assert.ok(data.byBranch.every(row => row.name === row.name.trim() && !/\s{2}/.test(row.name)));
  });

  test(prefix + ': certificate totals match all categories in management and recent records use creation time', async () => {
    await seed();
    const { data } = await call();
    const management = await call('/api/admin/certificates?all=1');
    assert.equal(data.sijil, 31); assert.equal(data.sijil, management.data.total);
    assert.equal(data.recent.length, 6); assert.equal(data.recent[0].id, 1);
    assert.ok(data.recent.every(row => row.id !== 900 && !('file_base64' in row)));
  });

  test(prefix + ': new registrations, branch edits and deletions are reflected in the next request', async () => {
    await seed();
    const added = await call('/api/admin/students', { nama_penuh: 'Pesilat Baharu', no_kp_atau_id: 'DASH-NEW', peringkat: 'Peringkat 01', cawangan: 'Cawangan 01' });
    assert.equal(added.res.status, 201);
    const initial = (await call()).data; assertTotals(initial, 291);
    const previousBranch = initial.byBranch.find(row => row.name === 'Cawangan 01').total;
    const moved = await call('/api/admin/students/' + added.data.id, { cawangan: 'Cawangan 03', peringkat: 'Peringkat 02' }, 'PUT');
    assert.equal(moved.res.status, 200);
    const afterMove = (await call()).data; assertTotals(afterMove, 291);
    assert.equal(afterMove.byBranch.find(row => row.name === 'Cawangan 01').total, previousBranch - 1);
    const branch = await call('/api/admin/branches', { nama_cawangan: 'Cawangan Baharu' });
    assert.equal(branch.res.status, 201);
    const afterBranch = (await call()).data; assert.equal(afterBranch.branches, 13);
    assert.equal(afterBranch.byBranch.find(row => row.name === 'Cawangan Baharu').total, 0);
    assert.equal((await call('/api/admin/students/' + added.data.id, undefined, 'DELETE')).res.status, 200);
    assertTotals((await call()).data);
  });

  test(prefix + ': uploading and deleting a certificate updates its total without counting students twice', async () => {
    await seed();
    const doc = await PDFDocument.create(); doc.addPage();
    const form = new FormData(); form.set('file', new Blob([await doc.save()]), 'dashboard.pdf');
    form.set('pesilat_id', '1'); form.set('nama_sijil', 'Sijil Dashboard');
    const created = await call('/api/admin/certificates', form);
    assert.equal(created.res.status, 201);
    const current = (await call()).data; assert.equal(current.sijil, 32); assertTotals(current);
    assert.equal((await call('/api/admin/certificates/' + created.data.id, undefined, 'DELETE')).res.status, 200);
    assert.equal((await call()).data.sijil, 31);
  });

  if (remote) {
    test(prefix + ': stale or empty instance caches cannot change primary counts', async () => {
      await seed();
      db.exec("INSERT INTO pesilat(id,nama_penuh,no_kp_atau_id,cawangan) VALUES(999,'Cache Lama','CACHE-999','Cawangan Palsu'); INSERT INTO cawangan(nama_cawangan) VALUES('Cawangan Palsu')");
      const data = (await call()).data; assertTotals(data);
      assert.equal(data.branches, 12); assert.equal(data.sijil, 31);
      assert.ok(!data.byBranch.some(row => row.name === 'Cawangan Palsu'));
    });

    test(prefix + ': one read transaction prevents concurrent changes from mixing totals', async (t) => {
      await seed();
      const batch = remote.batch.bind(remote);
      let calls = 0;
      t.mock.method(remote, 'batch', async (queries, mode) => {
        calls++; assert.equal(mode, 'read');
        const snapshot = await batch(queries, mode);
        await remote.execute("INSERT INTO pesilat(nama_penuh,no_kp_atau_id,cawangan,peringkat) VALUES('Concurrent','CONCURRENT','Cawangan 01','Peringkat 01')");
        return snapshot;
      });
      const data = (await call()).data; assertTotals(data); assert.equal(calls, 1);
    });

    test(prefix + ': a primary read failure returns an error instead of successful stale or zero counts', async (t) => {
      await seed(); t.mock.method(console, 'error', () => {});
      t.mock.method(remote, 'batch', async () => { throw new Error('Primary unavailable'); });
      const response = await call();
      assert.equal(response.res.status, 500); assert.equal(response.data.pesilat, undefined);
      assert.match(response.data.error, /Primary unavailable/);
    });
  }
}
