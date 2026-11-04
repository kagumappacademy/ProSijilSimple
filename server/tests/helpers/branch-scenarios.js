import {seedCloudAdmin} from './cloud-admin.js';
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import {PDFDocument} from 'pdf-lib';

export async function registerBranchTests(cloud){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'prosijil-branches-'));
 process.env.DATA_DIR=tmp;process.env.VERCEL='';
 process.env.NODE_ENV=cloud?'production':'test';
 process.env.TURSO_DATABASE_URL=cloud?'file::memory:':'';process.env.TURSO_AUTH_TOKEN='';
 process.env.JWT_SECRET='branch_management_tests_secret_minimum_32_chars';
 const {db}=await import('../../src/db.js');
 const {getTursoClient,initTursoSchema}=await import('../../src/turso.js');
 const remote=cloud?getTursoClient():null;if(remote)await initTursoSchema(remote);
  if(remote)await seedCloudAdmin(remote,db);
 const {default:app}=await import('../../src/app.js');
 const server=app.listen(0);await new Promise(resolve=>server.once('listening',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const admin=db.prepare('SELECT id FROM admin_users LIMIT 1').get();
 const cookie='prosijil_admin='+jwt.sign({sub:String(admin.id)},process.env.JWT_SECRET,{issuer:'prosijil',expiresIn:'1h'});
 async function call(url,body,method=body?'POST':'GET',authenticated=true){
  const form=body instanceof FormData;
  const res=await fetch(base+url,{method,headers:{...(authenticated?{Cookie:cookie}:{}),...(body&&!form?{'Content-Type':'application/json'}:{})},body:form?body:body?JSON.stringify(body):undefined});
  const data=(res.headers.get('content-type')||'').includes('json')?await res.json():Buffer.from(await res.arrayBuffer());
  return {status:res.status,data};
 }
 after(async()=>{await new Promise(resolve=>server.close(resolve));remote?.close();db.close();fs.rmSync(tmp,{recursive:true,force:true});});
 const prefix=cloud?'Cloud branches':'Local branches';
 let branch,empty,student,second,certificate,pdfBytes;

 test(prefix+': management endpoints require an administrator',async()=>{
  assert.equal((await call('/api/admin/branches',undefined,'GET',false)).status,401);
  assert.equal((await call('/api/admin/branches',{nama_cawangan:'Forbidden'},'POST',false)).status,401);
  assert.equal((await call('/api/admin/branches/1',{nama_cawangan:'Forbidden'},'PUT',false)).status,401);
 });

 test(prefix+': existing student branches are adopted and counted without case duplicates',async()=>{
  student=(await call('/api/admin/students',{nama_penuh:'Pesilat Pertama',no_kp_atau_id:'BR-ONE',cawangan:'Legacy Branch'})).data;
  second=(await call('/api/admin/students',{nama_penuh:'Pesilat Kedua',no_kp_atau_id:'BR-TWO',cawangan:'legacy branch'})).data;
  await call('/api/admin/students',{nama_penuh:'Pesilat Lain',no_kp_atau_id:'BR-OTHER',cawangan:'Kulai'});
  const doc=await PDFDocument.create();doc.addPage();pdfBytes=Buffer.from(await doc.save());
  const form=new FormData();form.set('file',new Blob([pdfBytes]),'existing.pdf');form.set('pesilat_id',String(student.id));form.set('nama_sijil','Sijil Sedia Ada');
  certificate=(await call('/api/admin/certificates',form)).data;
  const list=await call('/api/admin/branches');
  assert.equal(list.status,200);assert.equal(list.data.rows.length,2);
  branch=list.data.rows.find(row=>row.nama_cawangan.toLowerCase()==='legacy branch');
  assert.equal(branch.pesilat_count,2);assert.equal(branch.sijil_count,1);
 });

 test(prefix+': a new empty branch persists and is available for registration filters',async()=>{
  const created=await call('/api/admin/branches',{nama_cawangan:'  Bangi & Kajang  ',keterangan:'Gelanggang baharu'});
  assert.equal(created.status,201);empty=created.data;
  assert.equal(empty.nama_cawangan,'Bangi & Kajang');
  const list=await call('/api/admin/branches');
  const row=list.data.rows.find(item=>item.id===empty.id);
  assert.equal(row.pesilat_count,0);assert.equal(row.keterangan,'Gelanggang baharu');
  const students=await call('/api/admin/students?'+new URLSearchParams({branch:row.nama_cawangan}));
  assert.equal(students.data.total,0);assert.ok(students.data.branches.includes(row.nama_cawangan));
  assert.equal((await call('/api/admin/dashboard')).data.branches,3);
  if(remote){
   db.exec('DELETE FROM cawangan');
   assert.equal((await call('/api/admin/branches')).data.rows.find(item=>item.id===empty.id).keterangan,'Gelanggang baharu');
  }
 });

 test(prefix+': renaming updates all members atomically and retains certificate files and identities',async()=>{
  const renamed=await call('/api/admin/branches/'+branch.id,{nama_cawangan:'Skudai Utama',keterangan:'Nama baharu'},'PUT');
  assert.equal(renamed.status,200);assert.equal(renamed.data.id,branch.id);
  const filtered=await call('/api/admin/students?'+new URLSearchParams({branch:'skudai utama'}));
  assert.equal(filtered.data.total,2);
  assert.deepEqual(filtered.data.rows.map(row=>row.id).sort((a,b)=>a-b),[student.id,second.id].sort((a,b)=>a-b));
  assert.ok(filtered.data.rows.every(row=>row.cawangan==='Skudai Utama'));
  assert.equal((await call('/api/admin/students?branch=Legacy%20Branch')).data.total,0);
  assert.deepEqual((await call('/api/public/certificates/'+certificate.public_token+'/download')).data,pdfBytes);
  const csv=await call('/api/admin/students/export?branch=Skudai%20Utama');
  assert.match(csv.data.toString(),/Pesilat Pertama/);assert.doesNotMatch(csv.data.toString(),/Pesilat Lain/);
 });

 test(prefix+': duplicate names roll back every member change; invalid names and missing IDs are rejected',async(t)=>{
  t.mock.method(console,'error',()=>{});
  assert.equal((await call('/api/admin/branches',{nama_cawangan:'bangi & kajang'})).status,409);
  assert.equal((await call('/api/admin/branches/'+branch.id,{nama_cawangan:'Kulai'},'PUT')).status,409);
  assert.equal((await call('/api/admin/students?branch=Skudai%20Utama')).data.total,2);
  assert.equal((await call('/api/admin/students?branch=Kulai')).data.total,1);
  assert.equal((await call('/api/admin/branches',{nama_cawangan:' '})).status,400);
  assert.equal((await call('/api/admin/branches',{nama_cawangan:'A'.repeat(161)})).status,400);
  assert.equal((await call('/api/admin/branches/999999',{nama_cawangan:'Tidak Wujud'},'PUT')).status,404);
 });

 test(prefix+': student registration and CSV imports use the canonical managed branch name',async()=>{
  const added=await call('/api/admin/students',{nama_penuh:'Pesilat Bangi',no_kp_atau_id:'BR-NEW',cawangan:'bangi & kajang'});
  assert.equal(added.status,201);assert.equal(added.data.cawangan,'Bangi & Kajang');
  const form=new FormData();form.set('file',new Blob(['nama_penuh,no_kp_atau_id,cawangan\nPesilat Import,BR-IMPORT,bangi & kajang\n']),'members.csv');
  assert.equal((await call('/api/admin/students/import',form)).data.inserted,1);
  const filtered=await call('/api/admin/students?'+new URLSearchParams({branch:'Bangi & Kajang'}));
  assert.equal(filtered.data.total,2);assert.ok(filtered.data.rows.every(row=>row.cawangan==='Bangi & Kajang'));
 });

 if(remote)test(prefix+': failed cloud writes never report successful branch changes',async(t)=>{
  t.mock.method(console,'error',()=>{});
  const execute=remote.execute,batch=remote.batch;
  remote.execute=async statement=>{
   if(typeof statement==='object'&&statement.sql.startsWith('INSERT INTO cawangan'))throw new Error('Cloud unavailable');
   return execute.call(remote,statement);
  };
  remote.batch=async()=>{throw new Error('Cloud unavailable');};
  try{
   assert.equal((await call('/api/admin/branches',{nama_cawangan:'Gagal Simpan'})).status,500);
   assert.equal((await call('/api/admin/branches/'+branch.id,{nama_cawangan:'Gagal Rename'},'PUT')).status,500);
  }finally{remote.execute=execute;remote.batch=batch;}
  assert.equal((await call('/api/admin/students?branch=Skudai%20Utama')).data.total,2);
  assert.ok(!(await call('/api/admin/branches')).data.rows.some(row=>row.nama_cawangan==='Gagal Simpan'));
 });
}
