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
