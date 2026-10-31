import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import { PDFDocument } from 'pdf-lib';

// Exercise the configured-cloud branches using libSQL in memory, never a live account.
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'prosijil-cloud-'));
process.env.DATA_DIR=tmp;
process.env.NODE_ENV='production';
process.env.TURSO_DATABASE_URL='file::memory:';
process.env.TURSO_AUTH_TOKEN='';
process.env.JWT_SECRET='cloud_regression_test_secret_at_least_32_chars';
const {db}=await import('../src/db.js');
const {getTursoClient,initTursoSchema,pullTursoToLocal}=await import('../src/turso.js');
const remote=getTursoClient();
await initTursoSchema(remote);
const {default:app}=await import('../src/app.js');
const server=app.listen(0);
await new Promise(resolve=>server.once('listening',resolve));
const admin=db.prepare('SELECT id,username FROM admin_users LIMIT 1').get();
const cookie='prosijil_admin='+jwt.sign({sub:String(admin.id),username:admin.username},process.env.JWT_SECRET,{issuer:'prosijil',expiresIn:'1h'});
const base=`http://127.0.0.1:${server.address().port}`;
async function call(url,body,method=body?'POST':'GET'){
 const res=await fetch(base+url,{method,headers:{Cookie:cookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 const data=(res.headers.get('content-type')||'').includes('json')?await res.json():Buffer.from(await res.arrayBuffer());
 return {res,data};
}
after(async()=>{await new Promise(resolve=>server.close(resolve));remote.close();db.close();fs.rmSync(tmp,{recursive:true,force:true});});
const doc=await PDFDocument.create();
doc.addPage([595,842]);
const bytes=Buffer.from(await doc.save());
await remote.execute("INSERT INTO pesilat(id,nama_penuh,no_kp_atau_id,peringkat,cawangan) VALUES(1,'Pesilat Awan','CLOUD-1','Awan Kuning','Skudai')");
await remote.execute({sql:"INSERT INTO sijil(id,pesilat_id,nama_sijil,tarikh_isu,jenis,file_type,public_token,file_base64,kategori) VALUES(100,1,'Sijil Penyertaan','2026-10-31','uploaded','application/pdf','cloud-only',?,'penyertaan')",args:[bytes.toString('base64')]});

test('Certificate list and token access use current cloud records even with an empty local cache',async()=>{
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sijil').get().n,0);
 const list=await call('/api/admin/certificates?all=1');
 assert.equal(list.res.status,200);
 assert.equal(list.data.total,1);
 assert.equal(list.data.rows[0].id,100);
 assert.equal(list.data.rows[0].file_base64,undefined);
 const verify=await call('/api/public/verify/cloud-only');
 assert.equal(verify.data.valid,true);
 const download=await call('/api/public/certificates/cloud-only/download');
 assert.equal(download.res.status,200);
 assert.deepEqual(download.data,bytes);
});

test('Configured-cloud generation persists a PDF, returns the cloud ID and survives metadata refresh',async()=>{
 await pullTursoToLocal(remote);
 db.prepare("INSERT INTO template_sijil(nama_template,peringkat,file_name,file_base64,kategori) VALUES('Penyertaan Awan','Semua Peringkat','awan.pdf',?,'penyertaan')").run(bytes.toString('base64'));
 const body={pesilat_ids:[1],nama_template:'Penyertaan Awan',tarikh_isu:'2026-10-31',request_id:'cloud-save'};
 const generated=await call('/api/admin/templates/generate-batch',body);
 assert.equal(generated.data.successCount,1);
 const token=generated.data.generatedTokens[0].token;
 const saved=(await remote.execute({sql:'SELECT id,file_base64 FROM sijil WHERE public_token=?',args:[token]})).rows[0];
 assert.equal(saved.id,101);
 assert.ok(saved.file_base64);
 const retry=await call('/api/admin/templates/generate-batch',body);
 assert.equal(retry.data.generatedTokens[0].token,token);
 assert.equal((await remote.execute('SELECT COUNT(*) AS n FROM sijil')).rows[0].n,2);
 db.prepare('UPDATE sijil SET file_base64=NULL').run();
 db.prepare('DELETE FROM template_sijil').run();
 await pullTursoToLocal(remote);
 const download=await call('/api/public/certificates/'+token+'/download');
 assert.equal(download.res.status,200);
 assert.equal((await PDFDocument.load(download.data)).getPageCount(),1);
 // A stale local copy must not resurrect a cloud deletion in the list.
 await remote.execute("DELETE FROM sijil WHERE public_token='cloud-only'");
 const list=await call('/api/admin/certificates?all=1');
 assert.equal(list.data.total,1);
 assert.equal(list.data.rows[0].public_token,token);
});

test('Cloud write errors are reported as failed generation without success records',async()=>{
 db.prepare("INSERT INTO template_sijil(nama_template,peringkat,file_name,file_base64,kategori) VALUES('Gagal Simpan','Semua Peringkat','awan.pdf',?,'penyertaan')").run(bytes.toString('base64'));
 const original=remote.execute;
 remote.execute=async()=>{throw new Error('Simulated cloud write failure');};
 try{
  const response=await call('/api/admin/templates/generate-batch',{pesilat_ids:[1],nama_template:'Gagal Simpan',request_id:'cloud-fail'});
  assert.equal(response.res.status,200);
  assert.equal(response.data.successCount,0);
  assert.equal(response.data.failedCount,1);
  assert.match(response.data.failed[0].reason,/Simulated cloud write failure/);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM sijil WHERE nama_sijil='Gagal Simpan'").get().n,0);
 } finally {remote.execute=original;}
});

test('Management can update and delete cloud records missing from a warm instance cache',async()=>{
 db.prepare('DELETE FROM sijil').run();
 const updated=await call('/api/admin/certificates/101',{nama_sijil:'Penyertaan Dikemaskini'},'PUT');
 assert.equal(updated.res.status,200);
 assert.equal((await remote.execute('SELECT nama_sijil FROM sijil WHERE id=101')).rows[0].nama_sijil,'Penyertaan Dikemaskini');
 const deleted=await call('/api/admin/certificates/batch-delete',{ids:[101]});
 assert.equal(deleted.res.status,200);
 assert.equal(deleted.data.deletedCount,1);
 const list=await call('/api/admin/certificates?all=1');
 assert.equal(list.data.total,0);
});
