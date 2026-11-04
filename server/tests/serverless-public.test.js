import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createServer} from 'node:http';

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'prosijil-public-startup-'));
assert.ok(path.resolve(tmp).startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(tmp).startsWith('prosijil-public-startup-'));
process.env.DATA_DIR=tmp;process.env.NODE_ENV='production';process.env.VERCEL='1';
process.env.TURSO_DATABASE_URL='file::memory:';process.env.TURSO_AUTH_TOKEN='';process.env.JWT_SECRET='public_startup_isolated_secret_at_least_32_chars';
const {db}=await import('../src/db.js');
const {getTursoClient,ensureTursoSchema}=await import('../src/turso.js');
await ensureTursoSchema();const remote=getTursoClient();
const {default:handler}=await import('../../api/index.js');
const server=createServer(handler);server.listen(0);await new Promise(resolve=>server.once('listening',resolve));
const base='http://127.0.0.1:'+server.address().port;
after(async()=>{await new Promise(resolve=>server.close(resolve));remote.close();db.close();fs.rmSync(tmp,{recursive:true,force:true});});

test('Public startup, contacts and reports do not wait for or read an unrelated administrator cache refresh',async(t)=>{
  const execute=remote.execute.bind(remote);let reads=0;
  t.mock.method(remote,'execute',async statement=>{
    const sql=typeof statement==='string'?statement:statement.sql;
    assert.ok(!/FROM (sijil|pesilat|admin_users|cawangan)/i.test(sql),'Public support must not pull the whole admin cache.');
    reads++;return execute(statement);
  });
  assert.equal((await fetch(base+'/api/health')).status,200);
  assert.equal((await fetch(base+'/api/auth/me')).status,401);assert.equal(reads,0);
  const contact=await fetch(base+'/api/public/contact');assert.equal(contact.status,200);assert.equal((await contact.json()).contacts.length,2);
  const response=await fetch(base+'/api/public/reports',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({request_id:'startup-report-request-1',category:'teknikal',reporter_name:'Public startup',reporter_role:'pesilat',phone:'0123456789',subject:'Laporan ketika portal dibuka',message:'Borang ini tidak perlu menunggu salinan data pentadbir.',page_path:'/'})});
  assert.equal(response.status,201);assert.match((await response.json()).reference,/^LAP-/);
  assert.equal(db.prepare('SELECT count(*) AS n FROM public_reports').get().n,0,'Reports remain only in the primary database.');
});

test('Anonymous public checks ignore a force-sync query and still do not read administrator data',async(t)=>{
  t.mock.method(remote,'execute',async()=>{throw new Error('No database connection should be attempted.');});
  assert.equal((await fetch(base+'/api/health?force_sync=1')).status,200);
  assert.equal((await fetch(base+'/api/auth/me?force_sync=1')).status,401);
});
