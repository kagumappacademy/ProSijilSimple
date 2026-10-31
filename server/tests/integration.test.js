import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import bcrypt from 'bcryptjs';

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'prosijil-test-'));
process.env.DATA_DIR=tmp;
process.env.NODE_ENV='test';
process.env.TURSO_DATABASE_URL='';
process.env.TURSO_AUTH_TOKEN='';
process.env.JWT_SECRET='prosijil_test_secret_minimum_32_chars_long';
const {db}=await import('../src/db.js');
const {default:app}=await import('../src/app.js');
const server=app.listen(0);
await new Promise(resolve=>server.once('listening',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
after(async()=>{await new Promise(resolve=>server.close(resolve));db.close();fs.rmSync(tmp,{recursive:true,force:true});});
async function call(pathname,{method='GET',body,cookie,form}={}){
 const headers={};if(cookie)headers.Cookie=cookie;
 if(body)headers['Content-Type']='application/json';
 const res=await fetch(base+pathname,{method,headers,body:form|| (body?JSON.stringify(body):undefined)});
 const type=res.headers.get('content-type')||'';
 const value=type.includes('application/json')?await res.json():await res.arrayBuffer();
 return {res,data:value};
}
const hash=bcrypt.hashSync('KataLaluanSangatKuat!2026',10);
db.prepare('INSERT INTO admin_users(username,password_hash) VALUES(?,?)').run('admin-test',hash);
let cookie='', token='', sid=0;

test('Health & login protected',async()=>{
 const health=await call('/api/health');assert.equal(health.res.status,200);
 const forbidden=await call('/api/admin/dashboard');assert.equal(forbidden.res.status,401);
 const wrong=await call('/api/auth/login',{method:'POST',body:{username:'admin-test',password:'wrong'}});assert.equal(wrong.res.status,401);
 const login=await call('/api/auth/login',{method:'POST',body:{username:'admin-test',password:'KataLaluanSangatKuat!2026'}});
 assert.equal(login.res.status,200);cookie=login.res.headers.get('set-cookie').split(';')[0];assert.ok(cookie.includes('prosijil_admin='));
});
test('Student CRUD',async()=>{
 const newStudent=await call('/api/admin/students',{method:'POST',cookie,body:{nama_penuh:'Aiman Bin Kasim',peringkat:'Awan Putih',cawangan:'Skudai'}});
 assert.equal(newStudent.res.status,201);sid=newStudent.data.id;assert.match(newStudent.data.no_kp_atau_id,/^PS-/);
 const updated=await call('/api/admin/students/'+sid,{method:'PUT',cookie,body:{peringkat:'Awan Kuning'}});
 assert.equal(updated.res.status,200);assert.equal(updated.data.peringkat,'Awan Kuning');
 const list=await call('/api/admin/students?q=Aiman',{cookie});assert.equal(list.data.total,1);
});
test('CSV import accepts Nama Peserta/Nama Cawangan/Peringkat without ID',async()=>{
 const file=new FormData();file.append('file',new Blob(['Nama Peserta,Nama Cawangan,Peringkat\n"Nur Syafina Binti Zain","Kulai","Awan Putih"\n'],{type:'text/csv'}),'pesilat.csv');
 const result=await call('/api/admin/students/import',{method:'POST',cookie,form:file});
 assert.equal(result.res.status,200);assert.equal(result.data.inserted,1);
 const again=await call('/api/admin/students/import',{method:'POST',cookie,form:file});assert.equal(again.data.skipped,1);
});
test('Issue generated certificate, public exact search, verify, PDF download',async()=>{
 const form=new FormData();form.set('pesilat_id',String(sid));form.set('nama_sijil','Sijil Kenaikan Bengkung');form.set('tarikh_isu','2026-10-20');
 const created=await call('/api/admin/certificates',{method:'POST',cookie,form});assert.equal(created.res.status,201);token=created.data.public_token;
 const search=await call('/api/public/search?q='+encodeURIComponent('Aiman Bin Kasim'));
 assert.equal(search.data.results.length,1);assert.equal(search.data.results[0].certificates.length,1);
 const verify=await call('/api/public/verify/'+token);assert.equal(verify.data.valid,true);
 const pdf=await call('/api/public/certificates/'+token+'/download');assert.equal(pdf.res.status,200);
 assert.match(pdf.res.headers.get('content-type'),/pdf/);
 assert.equal(Buffer.from(pdf.data).subarray(0,5).toString(),'%PDF-');
});
test('Delete certificate revokes public token',async()=>{
 const list=await call('/api/admin/certificates',{cookie});
 const id=list.data.rows.find(row=>row.public_token===token).id;
 const deleted=await call('/api/admin/certificates/'+id,{method:'DELETE',cookie});assert.equal(deleted.res.status,200);
 const verify=await call('/api/public/verify/'+token);assert.equal(verify.res.status,404);
});

test('Upload template, batch generate certificate with Lora font, verify and download', async()=>{
 const { PDFDocument } = await import('pdf-lib');
 const doc = await PDFDocument.create();
 doc.addPage([595.28, 841.89]);
 doc.addPage([595.28, 841.89]);
 const samplePdfBytes = await doc.save();

 const form = new FormData();
 form.set('file', new Blob([samplePdfBytes], { type: 'application/pdf' }), 'templat-ujian.pdf');
 form.set('nama_template', 'Ujian Kenaikan Bengkung 2026');
 form.set('peringkat', 'Awan Kuning');
 form.set('keterangan', 'Templat rasmi');

 const uploadRes = await call('/api/admin/templates', { method: 'POST', cookie, form });
 assert.equal(uploadRes.res.status, 201);
 const templateId = uploadRes.data.id;

 const groupsRes = await call('/api/admin/templates/groups', { cookie });
 assert.equal(groupsRes.res.status, 200);
 assert.ok(groupsRes.data.groups['Ujian Kenaikan Bengkung 2026']);

 // Batch generate for student sid (Aiman Bin Kasim, level: Awan Kuning)
 const batchRes = await call('/api/admin/templates/generate-batch', {
   method: 'POST',
   cookie,
   body: {
     pesilat_ids: [sid],
     nama_template: 'Ujian Kenaikan Bengkung 2026',
     tarikh_isu: '2026-10-20'
   }
 });
 assert.equal(batchRes.res.status, 200);
 assert.equal(batchRes.data.successCount, 1);
 const genToken = batchRes.data.generatedTokens[0].token;

 const verify = await call('/api/public/verify/' + genToken);
 assert.equal(verify.data.valid, true);
 assert.equal(verify.data.certificate.nama_sijil, 'Ujian Kenaikan Bengkung 2026');

 const download = await call('/api/public/certificates/' + genToken + '/download');
 assert.equal(download.res.status, 200);
 const pdf = await PDFDocument.load(download.data);
 assert.equal(pdf.getPageCount(), 2);

 // Test student certificates listing and edit
 const stuCerts = await call('/api/admin/students/' + sid + '/certificates', { cookie });
 assert.equal(stuCerts.res.status, 200);
 assert.ok(stuCerts.data.certificates.length >= 1);
 const cId = stuCerts.data.certificates[0].id;

 const editCert = await call('/api/admin/certificates/' + cId, {
   method: 'PUT',
   cookie,
   body: { nama_sijil: 'Ujian Kenaikan Bengkung (Terkemaskini)', tarikh_isu: '2026-10-21' }
 });
 assert.equal(editCert.res.status, 200);
 assert.equal(editCert.data.nama_sijil, 'Ujian Kenaikan Bengkung (Terkemaskini)');

 // Delete template
 const delRes = await call('/api/admin/templates/' + templateId, { method: 'DELETE', cookie });
 assert.equal(delRes.res.status, 200);
});

test('Bulk generation survives a lost response, preserves exact counts and downloadable PDFs', async()=>{
 const { PDFDocument } = await import('pdf-lib');
 const { generateCertificateBatches } = await import('../../client/src/lib/generateBatch.js');
 const doc = await PDFDocument.create();
 doc.addPage([595,842]);
 const pdfBytes = await doc.save();
 const templateName = 'Sijil Penyertaan Pukal';
 db.prepare('INSERT INTO template_sijil(nama_template,peringkat,file_name,file_base64,kategori) VALUES(?,?,?,?,?)')
   .run(templateName,'Semua Peringkat','pukal.pdf',Buffer.from(pdfBytes).toString('base64'),'penyertaan');
 const insertStudent = db.prepare('INSERT INTO pesilat(nama_penuh,no_kp_atau_id,peringkat,cawangan) VALUES(?,?,?,?)');
 const ids = Array.from({length:12},(_,index)=>Number(insertStudent.run(`Pesilat Pukal ${index}`,`BULK-${index}`,'Awan Kuning',index%2?'Kulai':'Skudai').lastInsertRowid));
 let loseFirstResponse = true;
 const requestSizes = [];
 const progress = [];
 const result = await generateCertificateBatches({
   ids,templateName,issueDate:'2026-10-31',requestId:'regression-lost-response',
   onProgress: count=>progress.push(count),
   api: async (url, options)=>{
     requestSizes.push(options.body.pesilat_ids.length);
     const response = await call('/api'+url,{...options,cookie});
     assert.equal(response.res.status,200);
     if(loseFirstResponse){loseFirstResponse=false;throw new Error('Connection lost after save');}
     return response.data;
   },
 });
 assert.equal(result.successCount,12);
 assert.equal(result.failedCount,0);
 assert.deepEqual(requestSizes,[5,5,5,2]);
 assert.deepEqual(progress,[5,10,12]);
 assert.equal(new Set(result.generatedTokens.map(item=>item.token)).size,12);
 const list = await call('/api/admin/certificates?all=1',{cookie});
 const bulkRows = list.data.rows.filter(row=>row.nama_sijil===templateName);
 assert.equal(bulkRows.length,12);
 assert.equal(list.data.total,list.data.rows.length);
 assert.equal(list.res.headers.get('cache-control'),'no-store');
 assert.ok(list.data.rows.every(row=>!('file_base64' in row) && !('file_path' in row)));
 for(const row of [bulkRows[0],bulkRows.at(-1)]){
   const stored = db.prepare('SELECT file_base64,file_path FROM sijil WHERE id=?').get(row.id);
   assert.ok(stored.file_base64);
   assert.equal(stored.file_path,null);
   const download = await call('/api/public/certificates/'+row.public_token+'/download');
   assert.equal(download.res.status,200);
   assert.equal((await PDFDocument.load(download.data)).getPageCount(),1);
 }
 const filtered = await call('/api/admin/certificates?all=1&category=penyertaan&branch=Kulai',{cookie});
 assert.equal(filtered.data.total,6);
 assert.equal(filtered.data.rows.length,6);
});

test('Bulk generation reports unknown students and deduplicates recipient IDs',async()=>{
 const response = await call('/api/admin/templates/generate-batch',{method:'POST',cookie,
   body:{pesilat_ids:[sid,sid,999999],nama_template:'Sijil Penyertaan Pukal',request_id:'deduplicate',tarikh_isu:'2026-10-31'}});
 assert.equal(response.res.status,200);
 assert.equal(response.data.total,2);
 assert.equal(response.data.successCount,1);
 assert.equal(response.data.failedCount,1);
 assert.equal(response.data.failed[0].id,999999);
});

test('Interrupted bulk generation retains confirmed results and identifies unconfirmed recipients',async()=>{
 const { generateCertificateBatches } = await import('../../client/src/lib/generateBatch.js');
 let calls=0;
 await assert.rejects(generateCertificateBatches({
   ids:[1,2,3,4,5,6,7],templateName:'Sijil',issueDate:'2026-10-31',requestId:'interrupted',
   api:async()=>{
     if(++calls>1)throw new Error('Gateway timeout');
     return {successCount:5,failed:[],generatedTokens:[1,2,3,4,5].map(studentId=>({studentId,token:`token-${studentId}`}))};
   },
 }),error=>{
   assert.equal(error.result.successCount,5);
   assert.equal(error.result.generatedTokens.length,5);
   assert.deepEqual(error.result.failed.map(row=>row.id),[6,7]);
   return true;
 });
 assert.equal(calls,3);
});
