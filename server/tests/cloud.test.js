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
 assert.equal(stored.file_path,'');
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
 const originalDelete=remote.execute;
 remote.execute=async statement=>{
  if(typeof statement==='object' && statement.sql.startsWith('DELETE FROM template_sijil'))throw new Error('Cloud deletion unavailable');
  return originalDelete.call(remote,statement);
 };
 try{
  const failed=await call(`/api/admin/templates/${uploadedTemplateId}`,undefined,'DELETE');
  assert.equal(failed.res.status,500);
  assert.equal(db.prepare('SELECT count(*) AS n FROM template_sijil WHERE id=?').get(uploadedTemplateId).n,1);
  assert.deepEqual((await call(`/api/admin/templates/${uploadedTemplateId}/preview`)).data,bytes);
 } finally {remote.execute=originalDelete;}
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
 assert.equal(db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name='template_sijil_deleted'").get().n,0);
 assert.equal((await remote.execute("SELECT count(*) AS n FROM sqlite_master WHERE name='template_sijil_deleted'")).rows[0].n,0);
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

test('Student management and generation work across instances with empty recipient caches',async()=>{
 await remote.execute("INSERT INTO pesilat(id,nama_penuh,no_kp_atau_id,peringkat,cawangan) VALUES(900,'Pesilat Instance Lain','OTHER-900','Awan Kuning','Johor')");
 db.prepare('DELETE FROM pesilat WHERE id=900').run();
 const listed=await call('/api/admin/students?q=OTHER-900');
 assert.equal(listed.data.total,1);
 const publicSearch=await call('/api/public/search?q=OTHER-900');
 assert.equal(publicSearch.data.results.length,1);
 const generated=await call('/api/admin/templates/generate-batch',{
  pesilat_ids:[900],nama_template:'Penyertaan Awan',request_id:'empty-recipient-cache',
 });
 assert.equal(generated.res.status,200);
 assert.equal(generated.data.successCount,1);
 const token=generated.data.generatedTokens[0].token;
 assert.equal((await call('/api/public/certificates/'+token+'/download')).res.status,200);
 const publicCerts=await call('/api/public/search?q=OTHER-900');
 assert.equal(publicCerts.data.results[0].certificates.length,1);
 // Updating a parent must not cascade-delete its locally cached certificates.
 const updated=await call('/api/admin/students/900',{cawangan:'Melaka'},'PUT');
 assert.equal(updated.res.status,200);
 assert.equal(db.prepare('SELECT count(*) AS n FROM sijil WHERE public_token=?').get(token).n,1);
 db.prepare('DELETE FROM pesilat WHERE id=900').run();
 const created=await call('/api/admin/certificates',{pesilat_id:900,nama_sijil:'Sijil Manual Awan'});
 assert.equal(created.res.status,201);
 const certs=await call('/api/admin/students/900/certificates');
 assert.equal(certs.data.certificates.length,2);
 db.prepare('DELETE FROM pesilat WHERE id=900').run();
 const deleted=await call('/api/admin/students/900',undefined,'DELETE');
 assert.equal(deleted.res.status,200);
 assert.equal((await call('/api/public/verify/'+token)).res.status,404);
 assert.equal((await call('/api/admin/students?q=OTHER-900')).data.total,0);
});

test('CSV import uses cloud IDs, skips cloud duplicates and never overwrites another instance data',async()=>{
 await remote.execute("INSERT INTO pesilat(id,nama_penuh,no_kp_atau_id,peringkat,cawangan) VALUES(1200,'Rekod Instance Lain','REMOTE-1200','Awan Putih','Kulai')");
 db.prepare('DELETE FROM pesilat WHERE id=1200').run();
 const form=new FormData();
 form.set('file',new Blob(['nama_penuh,no_kp_atau_id,cawangan\nPesilat Import Awan,IMPORT-CLOUD,Kulai\nRekod Pendua,REMOTE-1200,Kulai\n']), 'pesilat.csv');
 const imported=await call('/api/admin/students/import',form);
 assert.equal(imported.res.status,200);
 assert.equal(imported.data.inserted,1);
 assert.equal(imported.data.skipped,1);
 const stored=(await remote.execute("SELECT * FROM pesilat WHERE no_kp_atau_id='IMPORT-CLOUD'")).rows[0];
 assert.ok(stored.id>1200);
 assert.equal(db.prepare("SELECT id FROM pesilat WHERE no_kp_atau_id='IMPORT-CLOUD'").get().id,stored.id);
 assert.equal((await remote.execute('SELECT nama_penuh FROM pesilat WHERE id=1200')).rows[0].nama_penuh,'Rekod Instance Lain');
 const retry=await call('/api/admin/students/import',form);
 assert.equal(retry.data.inserted,0);
 assert.equal(retry.data.skipped,2);
});

test('Cloud failure during student creation, CSV import or manual certificate creation returns an error without local success',async(t)=>{
 t.mock.method(console,'error',()=>{});
 const original=remote.execute;
 const originalBatch=remote.batch;
 remote.execute=async statement=>{
  if(typeof statement==='object' && /^(INSERT INTO pesilat|INSERT INTO sijil)/.test(statement.sql))throw new Error('Cloud write unavailable');
  return original.call(remote,statement);
 };
 remote.batch=async(statements,...args)=>{
  if(statements.some(statement=>statement.sql.startsWith('INSERT INTO pesilat')))throw new Error('Cloud write unavailable');
  return originalBatch.call(remote,statements,...args);
 };
 try {
  const created=await call('/api/admin/students',{nama_penuh:'Gagal Awan',no_kp_atau_id:'FAIL-CREATE'});
  assert.equal(created.res.status,500);
  assert.equal(db.prepare("SELECT count(*) AS n FROM pesilat WHERE no_kp_atau_id='FAIL-CREATE'").get().n,0);
  const form=new FormData();
  form.set('file',new Blob(['nama_penuh,no_kp_atau_id\nGagal Import,FAIL-IMPORT\n']), 'pesilat.csv');
  const imported=await call('/api/admin/students/import',form);
  assert.equal(imported.res.status,503);
  assert.equal(imported.data.inserted,0);
  assert.equal(db.prepare("SELECT count(*) AS n FROM pesilat WHERE no_kp_atau_id='FAIL-IMPORT'").get().n,0);
  const certificate=await call('/api/admin/certificates',{pesilat_id:1,nama_sijil:'Sijil Gagal Manual'});
  assert.equal(certificate.res.status,500);
  assert.match(certificate.data.error,/Cloud write unavailable/);
  assert.equal(db.prepare("SELECT count(*) AS n FROM sijil WHERE nama_sijil='Sijil Gagal Manual'").get().n,0);
  assert.equal((await call('/api/health')).res.status,200);
 } finally {remote.execute=original;remote.batch=originalBatch;}
});

test('Adding a duplicate student returns a useful conflict and preserves their certificates',async(t)=>{
 t.mock.method(console,'error',()=>{});
 const duplicate=await call('/api/admin/students',{nama_penuh:'Nama Pendua',no_kp_atau_id:'CLOUD-1'});
 assert.equal(duplicate.res.status,409);
 assert.match(duplicate.data.error,/sudah digunakan/);
 const invalid=await call('/api/admin/students',{nama_penuh:'A'});
 assert.equal(invalid.res.status,400);
});

test('Image certificate downloads are real PDFs even after the upload disk and cache are cleared',async()=>{
 const {default:jpeg}=await import('jpeg-js');
 const jpg=jpeg.encode({data:Buffer.from([255,255,255,255]),width:1,height:1},80).data;
 const form=new FormData();
 form.set('file',new Blob([jpg],{type:'image/jpeg'}),'certificate.jpg');
 form.set('pesilat_id','1');form.set('nama_sijil','Sijil Imej Awan');
 const created=await call('/api/admin/certificates',form);
 assert.equal(created.res.status,201);
 const cached=db.prepare('SELECT file_path FROM sijil WHERE id=?').get(created.data.id);
 assert.equal(cached.file_path,'');
 assert.deepEqual(fs.readdirSync(path.join(tmp,'uploads')),[]);
 db.prepare('DELETE FROM sijil WHERE id=?').run(created.data.id);
 const downloaded=await call('/api/public/certificates/'+created.data.public_token+'/download');
 assert.equal(downloaded.res.status,200);
 assert.match(downloaded.res.headers.get('content-type'),/application\/pdf/);
 assert.equal((await PDFDocument.load(downloaded.data)).getPageCount(),1);
});

test('Interrupted CSV batches keep confirmed progress and a retry imports only the remaining students',async()=>{
 const csv='nama_penuh,no_kp_atau_id\n'+Array.from({length:60},(_,i)=>'Pesilat Kelompok '+i+',CHUNK-'+i).join('\n');
 const form=new FormData();form.set('file',new Blob([csv]),'chunked.csv');
 const original=remote.batch;
 let writes=0;
 remote.batch=async(statements,...args)=>{
  if(statements.some(statement=>statement.sql.startsWith('INSERT INTO pesilat')) && ++writes===2)throw new Error('Disconnected');
  return original.call(remote,statements,...args);
 };
 try {
  const interrupted=await call('/api/admin/students/import',form);
  assert.equal(interrupted.res.status,503);
  assert.equal(interrupted.data.inserted,50);
  assert.equal((await remote.execute("SELECT count(*) AS n FROM pesilat WHERE no_kp_atau_id LIKE 'CHUNK-%'")).rows[0].n,50);
 } finally {remote.batch=original;}
 const retried=await call('/api/admin/students/import',form);
 assert.equal(retried.res.status,200);
 assert.equal(retried.data.inserted,10);
 assert.equal(retried.data.skipped,50);
 assert.equal((await remote.execute("SELECT count(*) AS n FROM pesilat WHERE no_kp_atau_id LIKE 'CHUNK-%'")).rows[0].n,60);
});

test('Uploaded certificate replacements remain current after metadata edits, stale sync and cache loss',async(t)=>{
 const create=new FormData();create.set('file',new Blob([bytes]),'old.pdf');
 create.set('pesilat_id','1');create.set('nama_sijil','Sijil Sebelum Update');
 const uploaded=await call('/api/admin/certificates',create);
 assert.equal(uploaded.res.status,201);
 const {id,public_token:token}=uploaded.data;
 const updatedDoc=await PDFDocument.create();updatedDoc.addPage();updatedDoc.addPage();updatedDoc.setTitle('VERSI TERKINI');
 const latestBytes=Buffer.from(await updatedDoc.save());
 const replacement=new FormData();replacement.set('file',new Blob([latestBytes]),'new.pdf');replacement.set('nama_sijil','Sijil Selepas Update');
 assert.equal((await call('/api/admin/certificates/'+id,replacement,'PUT')).res.status,200);
 assert.equal((await call('/api/admin/certificates/'+id,{nama_sijil:'Metadata Terkini'},'PUT')).res.status,200);
 // A disk file from another version must never take priority over durable bytes.
 const stalePath=path.join(tmp,'stale-certificate.pdf');fs.writeFileSync(stalePath,bytes);
 await remote.execute({sql:'UPDATE sijil SET file_path=? WHERE id=?',args:[stalePath,id]});
 assert.deepEqual((await call('/api/public/certificates/'+token+'/download')).data,latestBytes);
 db.prepare('UPDATE sijil SET nama_sijil=?,file_base64=?,file_path=? WHERE id=?').run('Nama Cache Lama',bytes.toString('base64'),stalePath,id);
 await pushLocalToTurso(remote);
 const stored=(await remote.execute({sql:'SELECT nama_sijil,file_base64 FROM sijil WHERE id=?',args:[id]})).rows[0];
 assert.equal(stored.nama_sijil,'Metadata Terkini');
 assert.deepEqual(Buffer.from(stored.file_base64,'base64'),latestBytes);
 fs.unlinkSync(stalePath);db.prepare('DELETE FROM sijil WHERE id=?').run(id);
 assert.deepEqual((await call('/api/public/certificates/'+token+'/download')).data,latestBytes);
 // A rejected replacement leaves the last confirmed file usable.
 t.mock.method(console,'error',()=>{});
 const original=remote.execute;
 remote.execute=async statement=>{
  if(typeof statement==='object' && statement.sql.startsWith('UPDATE sijil SET'))throw new Error('Update unavailable');
  return original.call(remote,statement);
 };
 try {
  const failed=await call('/api/admin/certificates/'+id,replacement,'PUT');
  assert.equal(failed.res.status,500);
 } finally {remote.execute=original;}
 assert.deepEqual((await call('/api/public/certificates/'+token+'/download')).data,latestBytes);
});

test('Template file and layout updates persist without allowing stale sync to revert them',async()=>{
 const uploaded=await call('/api/admin/templates',templateForm());
 const id=uploaded.data.id;
 const doc=await PDFDocument.create();doc.addPage();doc.addPage();doc.setTitle('TEMPLAT BARU');
 const newBytes=Buffer.from(await doc.save());
 const replacement=templateForm();replacement.set('file',new Blob([newBytes]),'template-new.pdf');
 const updated=await call('/api/admin/templates/'+id,replacement,'PUT');
 assert.equal(updated.res.status,200);assert.equal(updated.data.id,id);
 assert.equal((await call('/api/admin/templates/'+id+'/layout',{layout_config:{fontSize:29}},'POST')).res.status,200);
 db.prepare('UPDATE template_sijil SET file_base64=?,layout_config=? WHERE id=?').run(bytes.toString('base64'),'{"fontSize":14}',id);
 await pushLocalToTurso(remote);
 db.prepare('DELETE FROM template_sijil WHERE id=?').run(id);
 const preview=await call('/api/admin/templates/'+id+'/preview');
 assert.deepEqual(preview.data,newBytes);
 const stored=(await remote.execute({sql:'SELECT layout_config FROM template_sijil WHERE id=?',args:[id]})).rows[0];
 assert.equal(JSON.parse(stored.layout_config).fontSize,29);
});

test('Legacy disk-only certificates are promoted to durable storage before a successful update',async()=>{
 const originalPath=path.join(tmp,'legacy-certificate.pdf');fs.writeFileSync(originalPath,bytes);
 const result=await remote.execute({sql:"INSERT INTO sijil(pesilat_id,nama_sijil,tarikh_isu,jenis,file_type,file_path,public_token) VALUES(1,'Legacy Certificate','2026-11-01','uploaded','application/pdf',?,'legacy-durable') RETURNING id",args:[originalPath]});
 const id=Number(result.rows[0].id);
 assert.equal((await call('/api/admin/certificates/'+id,{nama_sijil:'Legacy Kekal'},'PUT')).res.status,200);
 fs.unlinkSync(originalPath);db.prepare('DELETE FROM sijil WHERE id=?').run(id);
 const downloaded=await call('/api/public/certificates/legacy-durable/download');
 assert.deepEqual(downloaded.data,bytes);
 const current=(await remote.execute({sql:'SELECT file_base64,file_path FROM sijil WHERE id=?',args:[id]})).rows[0];
 assert.equal(current.file_path,'');assert.equal(current.file_base64,bytes.toString('base64'));
});

test('Generated certificates are saved once and stay identical after organisation settings change',async()=>{
 const created=await call('/api/admin/certificates',{pesilat_id:1,nama_sijil:'Sijil Janaan Kekal'});
 assert.equal(created.res.status,201);
 const id=created.data.id,token=created.data.public_token;
 const initial=await call('/api/public/certificates/'+token+'/download');
 const current=(await remote.execute({sql:'SELECT file_base64 FROM sijil WHERE id=?',args:[id]})).rows[0];
 assert.deepEqual(Buffer.from(current.file_base64,'base64'),initial.data);
 const oldSettings=db.prepare("SELECT value FROM settings WHERE key='nama_organisasi'").get().value;
 try {
  db.prepare("UPDATE settings SET value='Organisasi Berubah' WHERE key='nama_organisasi'").run();
  assert.deepEqual((await call('/api/public/certificates/'+token+'/download')).data,initial.data);
  const updated=await call('/api/admin/certificates/'+id,{nama_sijil:'Janaan Dikemaskini'},'PUT');
  assert.equal(updated.res.status,200);
  const latest=await call('/api/public/certificates/'+token+'/download');
  assert.notDeepEqual(latest.data,initial.data);
  db.prepare('DELETE FROM sijil WHERE id=?').run(id);
  assert.deepEqual((await call('/api/public/certificates/'+token+'/download')).data,latest.data);
 } finally {db.prepare("UPDATE settings SET value=? WHERE key='nama_organisasi'").run(oldSettings);}
});
