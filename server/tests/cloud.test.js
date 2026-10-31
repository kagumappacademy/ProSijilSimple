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
const {getTursoClient,initTursoSchema,pullTursoToLocal,pushLocalToTurso}=await import('../src/turso.js');
const {saveTemplate}=await import('../src/templateStore.js');
const remote=getTursoClient();
await initTursoSchema(remote);
const {default:app}=await import('../src/app.js');
const server=app.listen(0);
await new Promise(resolve=>server.once('listening',resolve));
const admin=db.prepare('SELECT id,username FROM admin_users LIMIT 1').get();
const cookie='prosijil_admin='+jwt.sign({sub:String(admin.id),username:admin.username},process.env.JWT_SECRET,{issuer:'prosijil',expiresIn:'1h'});
const base=`http://127.0.0.1:${server.address().port}`;
async function call(url,body,method=body?'POST':'GET'){
 const isForm=body instanceof FormData;
 const res=await fetch(base+url,{method,headers:{Cookie:cookie,...(body&&!isForm?{'Content-Type':'application/json'}:{})},body:isForm?body:body?JSON.stringify(body):undefined});
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
 await saveTemplate({nama_template:'Penyertaan Awan',peringkat:'Semua Peringkat',file_name:'awan.pdf',file_size:bytes.length,file_base64:bytes.toString('base64'),kategori:'penyertaan',page_count:1});
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
 await saveTemplate({nama_template:'Gagal Simpan',peringkat:'Semua Peringkat',file_name:'awan.pdf',file_size:bytes.length,file_base64:bytes.toString('base64'),kategori:'penyertaan',page_count:1});
 const original=remote.execute;
 remote.execute=async(statement)=>{
  if(typeof statement==='object' && statement.sql.startsWith('INSERT INTO sijil'))throw new Error('Simulated cloud write failure');
  return original.call(remote,statement);
 };
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

let uploadedTemplateId;
const templateForm=()=>{
 const form=new FormData();
 form.set('file',new Blob([bytes],{type:'application/pdf'}),'template-kekal.pdf');
 form.set('nama_template','Templat Kekal');
 form.set('peringkat','Semua Peringkat');
 form.set('kategori','penyertaan');
 form.set('layout_config',JSON.stringify({fontSize:21,xPercent:50,yPercent:50}));
 return form;
};

test('Template upload persists PDF bytes before success and remains accessible with an empty cache',async()=>{
 const uploaded=await call('/api/admin/templates',templateForm());
 assert.equal(uploaded.res.status,201);
 uploadedTemplateId=uploaded.data.id;
 const stored=(await remote.execute({sql:'SELECT file_path,file_base64,file_size FROM template_sijil WHERE id=?',args:[uploadedTemplateId]})).rows[0];
 assert.equal(stored.file_path,null);
 assert.equal(stored.file_size,bytes.length);
 assert.deepEqual(Buffer.from(stored.file_base64,'base64'),bytes);
 db.prepare('DELETE FROM template_sijil').run();
 const list=await call('/api/admin/templates');
 assert.ok(list.data.rows.some(row=>row.id===uploadedTemplateId));
 assert.ok(list.data.rows.every(row=>!('file_base64' in row)));
 const groups=await call('/api/admin/templates/groups');
 assert.equal(groups.data.groups['Templat Kekal'][0].id,uploadedTemplateId);
 const preview=await call(`/api/admin/templates/${uploadedTemplateId}/preview`);
 assert.equal(preview.res.status,200);
 assert.deepEqual(preview.data,bytes);
 const namedPreview=await call('/api/admin/templates/test-preview',{template_id:uploadedTemplateId,student_name:'PESILAT KEKAL'});
 assert.equal(namedPreview.res.status,200);
 assert.equal((await PDFDocument.load(namedPreview.data)).getTitle(),'PESILAT KEKAL');
});

test('Metadata sync cannot blank or replace a persistent template PDF or revert its saved layout',async()=>{
 db.prepare('UPDATE template_sijil SET file_base64=NULL,layout_config=NULL WHERE id=?').run(uploadedTemplateId);
 await pushLocalToTurso(remote);
 await pullTursoToLocal(remote);
 const stored=(await remote.execute({sql:'SELECT file_base64,layout_config FROM template_sijil WHERE id=?',args:[uploadedTemplateId]})).rows[0];
 assert.deepEqual(Buffer.from(stored.file_base64,'base64'),bytes);
 assert.equal(JSON.parse(stored.layout_config).fontSize,21);
 const preview=await call(`/api/admin/templates/${uploadedTemplateId}/preview`);
 assert.deepEqual(preview.data,bytes);
 const layout=await call(`/api/admin/templates/${uploadedTemplateId}/layout`,{layout_config:{fontSize:25}});
 assert.equal(layout.res.status,200);
 const thumbnail=await call(`/api/admin/templates/${uploadedTemplateId}/thumbnail`,{thumbnail:'data:image/jpeg;base64,/9j/2Q=='});
 assert.equal(thumbnail.res.status,200);
 assert.deepEqual((await call(`/api/admin/templates/${uploadedTemplateId}/preview`)).data,bytes);
});

test('Failed cloud template uploads and deletions never report success or lose the saved PDF',async(t)=>{
 t.mock.method(console,'error',()=>{});
 const localBefore=db.prepare('SELECT count(*) AS n FROM template_sijil').get().n;
 const originalExecute=remote.execute;
 remote.execute=async statement=>{
  if(typeof statement==='object' && statement.sql.startsWith('INSERT INTO template_sijil'))throw new Error('Cloud upload unavailable');
  return originalExecute.call(remote,statement);
 };
 try{
  const failed=await call('/api/admin/templates',templateForm());
  assert.equal(failed.res.status,500);
  assert.equal(db.prepare('SELECT count(*) AS n FROM template_sijil').get().n,localBefore);
 } finally {remote.execute=originalExecute;}
 const originalBatch=remote.batch;
 remote.batch=async()=>{throw new Error('Cloud deletion unavailable');};
 try{
  const failed=await call(`/api/admin/templates/${uploadedTemplateId}`,undefined,'DELETE');
  assert.equal(failed.res.status,500);
  assert.equal(db.prepare('SELECT count(*) AS n FROM template_sijil_deleted WHERE id=?').get(uploadedTemplateId).n,0);
  assert.deepEqual((await call(`/api/admin/templates/${uploadedTemplateId}/preview`)).data,bytes);
 } finally {remote.batch=originalBatch;}
});

test('Legacy PDFs are recovered from their own disk copy and copied into permanent cloud storage',async()=>{
 const diskPath=path.join(tmp,'legacy-template.pdf');
 fs.writeFileSync(diskPath,bytes);
 const inserted=await remote.execute({sql:"INSERT INTO template_sijil(nama_template,peringkat,file_name,file_size,kategori) VALUES('Legacy Kekal','Awan Kuning','legacy.pdf',?,'kenaikan_tali_pinggang') RETURNING id",args:[bytes.length]});
 const id=Number(inserted.rows[0].id);
 db.prepare("INSERT INTO template_sijil(id,nama_template,peringkat,file_name,file_size,kategori,file_path) VALUES(?,'Legacy Kekal','Awan Kuning','legacy.pdf',?,'kenaikan_tali_pinggang',?)").run(id,bytes.length,diskPath);
 const preview=await call(`/api/admin/templates/${id}/preview`);
 assert.equal(preview.res.status,200);
 assert.deepEqual(preview.data,bytes);
 fs.unlinkSync(diskPath);
 db.prepare('DELETE FROM template_sijil WHERE id=?').run(id);
 assert.deepEqual((await call(`/api/admin/templates/${id}/preview`)).data,bytes);
});

test('Only admin deletion removes a template and a stale instance cannot resurrect it by syncing',async()=>{
 const stale=db.prepare('SELECT * FROM template_sijil WHERE id=?').get(uploadedTemplateId);
 const deleted=await call(`/api/admin/templates/${uploadedTemplateId}`,undefined,'DELETE');
 assert.equal(deleted.res.status,200);
 // Simulate another instance retaining the previous record, including all its PDF bytes.
 const columns=Object.keys(stale);
 db.prepare(`INSERT INTO template_sijil(${columns.join(',')}) VALUES(${columns.map(()=>'?').join(',')})`).run(...Object.values(stale));
 await pushLocalToTurso(remote);
 assert.equal((await call(`/api/admin/templates/${uploadedTemplateId}/preview`)).res.status,404);
 assert.ok(!(await call('/api/admin/templates')).data.rows.some(row=>row.id===uploadedTemplateId));
 assert.equal((await remote.execute({sql:'SELECT count(*) AS n FROM template_sijil WHERE id=?',args:[uploadedTemplateId]})).rows[0].n,0);
 await pullTursoToLocal(remote);
 assert.equal(db.prepare('SELECT count(*) AS n FROM template_sijil WHERE id=?').get(uploadedTemplateId).n,0);
});

test('A missing legacy PDF never silently substitutes another rank template',async(t)=>{
 t.mock.method(console,'error',()=>{});
 const inserted=await remote.execute("INSERT INTO template_sijil(nama_template,peringkat,file_name,kategori) VALUES('Legacy Kekal','Awan Putih','missing.pdf','kenaikan_tali_pinggang') RETURNING id");
 const id=Number(inserted.rows[0].id);
 const preview=await call(`/api/admin/templates/${id}/preview`);
 assert.equal(preview.res.status,503);
 assert.match(preview.data.error,/fail asal/);
 const existing=(await remote.execute({sql:'SELECT file_base64 FROM template_sijil WHERE id=?',args:[id]})).rows[0];
 assert.equal(existing.file_base64,null);
});
