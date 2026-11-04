import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createServer} from 'node:http';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {seedCloudAdmin} from './helpers/cloud-admin.js';

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'prosijil-performance-'));
assert.ok(path.resolve(tmp).startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(tmp).startsWith('prosijil-performance-'));
process.env.DATA_DIR=tmp;process.env.NODE_ENV='production';process.env.VERCEL='1';
process.env.TURSO_DATABASE_URL='file::memory:';process.env.TURSO_AUTH_TOKEN='';process.env.JWT_SECRET='performance_cloud_test_secret_at_least_32_characters';
const {db}=await import('../src/db.js');
const {getTursoClient,ensureTursoSchema}=await import('../src/turso.js');
const remote=getTursoClient(),originalBatch=remote.batch.bind(remote),originalExecute=remote.execute.bind(remote);
let schemaTrips=0;
remote.batch=async(...args)=>{schemaTrips++;return originalBatch(...args);};
remote.execute=async(...args)=>{schemaTrips++;return originalExecute(...args);};
await ensureTursoSchema();remote.batch=originalBatch;remote.execute=originalExecute;
await seedCloudAdmin(remote,db);const admin=db.prepare('SELECT id,username FROM admin_users LIMIT 1').get();
const password='PerfTestPassword2026';await remote.execute({sql:'UPDATE admin_users SET password_hash=? WHERE id=?',args:[await bcrypt.hash(password,4),admin.id]});
await remote.execute("INSERT INTO pesilat(id,nama_penuh,no_kp_atau_id,peringkat,cawangan) VALUES(1,'Pesilat Primary','PERF-1','Awan Putih','Skudai')");
await remote.execute("INSERT INTO settings(key,value) VALUES('nama_organisasi','Primary Academy')");
// A cold instance has no copied administrators, students, certificates or settings.
db.exec("DELETE FROM admin_users; DELETE FROM pesilat; UPDATE settings SET value='Stale Cache' WHERE key='nama_organisasi'");
const {default:handler}=await import('../../api/index.js');
const server=createServer(handler);server.listen(0);await new Promise(resolve=>server.once('listening',resolve));
const base='http://127.0.0.1:'+server.address().port,cookie='prosijil_admin='+jwt.sign({sub:String(admin.id)},process.env.JWT_SECRET,{issuer:'prosijil',expiresIn:'1h'});
after(async()=>{await new Promise(resolve=>server.close(resolve));remote.close();db.close();fs.rmSync(tmp,{recursive:true,force:true});});
async function call(url,body,method=body?'POST':'GET',authenticated=true){const response=await fetch(base+url,{method,headers:{...(authenticated?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:response.status,data:await response.json()};}

test('Cold schema setup takes at most four batched network round trips',()=>{assert.ok(schemaTrips<=4,'Actual schema trips: '+schemaTrips);});

test('A cold administrator session reads one primary admin row without copying unrelated tables',async(t)=>{
 const seen=[];t.mock.method(remote,'execute',async statement=>{const sql=typeof statement==='string'?statement:statement.sql;seen.push(sql);assert.match(sql,/^SELECT id, username FROM admin_users WHERE id=\?/);return originalExecute(statement);});
 const result=await call('/api/auth/me?force_sync=1');assert.equal(result.status,200);assert.equal(result.data.user.username,admin.username);assert.equal(seen.length,1);
 assert.equal(db.prepare('SELECT count(*) AS n FROM pesilat').get().n,0);assert.equal(db.prepare('SELECT count(*) AS n FROM admin_users').get().n,0);
});

test('Student pagination, count and filter options use one snapshot batch after authentication',async(t)=>{
 const execute=t.mock.method(remote,'execute',originalExecute),batch=t.mock.method(remote,'batch',originalBatch);
 const result=await call('/api/admin/students');assert.equal(result.status,200);assert.equal(result.data.total,1);assert.equal(result.data.rows[0].nama_penuh,'Pesilat Primary');
 assert.equal(execute.mock.callCount(),1);assert.equal(batch.mock.callCount(),1);assert.equal(batch.mock.calls[0].arguments[0].length,4);assert.equal(batch.mock.calls[0].arguments[1],'read');
});

test('Dashboard and certificate lists do not trigger an unrelated cache pull',async(t)=>{
 const execute=t.mock.method(remote,'execute',originalExecute),batch=t.mock.method(remote,'batch',originalBatch);
 const dashboard=await call('/api/admin/dashboard');assert.equal(dashboard.status,200);assert.equal(dashboard.data.pesilat,1);
 const certificates=await call('/api/admin/certificates?all=1&force_sync=1');assert.equal(certificates.status,200);
 assert.equal(execute.mock.callCount(),2);assert.equal(batch.mock.callCount(),2);assert.equal(db.prepare('SELECT count(*) AS n FROM pesilat').get().n,0);
});

test('Settings and activity read their primary records directly, even with a stale or empty cache',async()=>{
 assert.equal((await call('/api/admin/settings')).data.nama_organisasi,'Primary Academy');
 const changed=await call('/api/admin/settings',{nama_organisasi:'Updated Primary'},'PUT');assert.equal(changed.status,200);assert.equal(changed.data.nama_organisasi,'Updated Primary');
 assert.equal((await call('/api/admin/settings')).data.nama_organisasi,'Updated Primary');
 const history=await call('/api/admin/recent-activity');assert.equal(history.status,200);
 assert.equal(history.data.activities[0].students_before,1);assert.equal(history.data.activities[0].students_after,1,'Activity counts must use the primary dataset, rather than the empty cache.');
});

test('A cached administrator cannot override a renamed or removed primary account',async()=>{
 db.prepare('INSERT INTO admin_users(id,username,password_hash) VALUES(?,?,?)').run(admin.id,'Stale Administrator','stale');
 await remote.execute({sql:'UPDATE admin_users SET username=? WHERE id=?',args:['Primary Administrator',admin.id]});
 assert.equal((await call('/api/auth/me')).data.user.username,'Primary Administrator');
 await remote.execute({sql:'UPDATE admin_users SET username=? WHERE id=?',args:[admin.username,admin.id]});
 const staleCookie='prosijil_admin='+jwt.sign({sub:'999'},process.env.JWT_SECRET,{issuer:'prosijil',expiresIn:'1h'});
 db.prepare("INSERT INTO admin_users(id,username,password_hash) VALUES(999,'Removed','stale')").run();
 assert.equal((await fetch(base+'/api/auth/me',{headers:{Cookie:staleCookie}})).status,401);
});

test('Login and password changes use the primary account and never accept a stale cached password',async()=>{
 const login=await call('/api/auth/login',{username:admin.username,password},'POST',false);assert.equal(login.status,200);assert.equal(login.data.user.id,admin.id);
 const changed=await call('/api/auth/password',{current_password:password,new_password:'NewPrimaryPassword2026'},'POST');assert.equal(changed.status,200);
 assert.equal((await call('/api/auth/login',{username:admin.username,password},'POST',false)).status,401);
 assert.equal((await call('/api/auth/login',{username:admin.username,password:'NewPrimaryPassword2026'},'POST',false)).status,200);
});

test('A failed primary settings write returns an error and leaves saved settings intact',async(t)=>{
 t.mock.method(console,'error',()=>{});t.mock.method(remote,'batch',async()=>{throw new Error('Write unavailable');});
 const failed=await call('/api/admin/settings',{nama_organisasi:'Unsaved'},'PUT');assert.equal(failed.status,500);
 assert.equal((await call('/api/admin/settings')).data.nama_organisasi,'Updated Primary');
});
