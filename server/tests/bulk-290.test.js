import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import jpeg from 'jpeg-js';
import {PDFDocument} from 'pdf-lib';
import {generateCertificateBatches} from '../../client/src/lib/generateBatch.js';

// Real HTTP, PDF generation and a separate libSQL primary, without a live account.
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'prosijil-290-'));
process.env.DATA_DIR=path.join(tmp,'cache');
process.env.NODE_ENV='production';process.env.VERCEL='1';
process.env.TURSO_DATABASE_URL='file::memory:';
process.env.TURSO_AUTH_TOKEN='';process.env.JWT_SECRET='bulk_290_test_secret_minimum_32_chars';
const {db}=await import('../src/db.js');
const {getTursoClient,initTursoSchema}=await import('../src/turso.js');
const {saveTemplate}=await import('../src/templateStore.js');
const {default:app}=await import('../src/app.js');
const remote=getTursoClient();await initTursoSchema(remote);
const server=app.listen(0);await new Promise(resolve=>server.once('listening',resolve));
const admin=db.prepare('SELECT id FROM admin_users LIMIT 1').get();
const cookie='prosijil_admin='+jwt.sign({sub:String(admin.id)},process.env.JWT_SECRET,{issuer:'prosijil',expiresIn:'1h'});
const base='http://127.0.0.1:'+server.address().port;
async function api(url,{body,method='POST'}={}){
 const res=await fetch(base+'/api'+url,{method,headers:{Cookie:cookie,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 const data=await res.json();
 if(!res.ok)throw Object.assign(new Error(data.error),{status:res.status});
 return data;
}
after(async()=>{await new Promise(resolve=>server.close(resolve));remote.close();db.close();fs.rmSync(tmp,{recursive:true,force:true});});

const templateName='Janaan Keseluruhan 290 Pesilat';
const pdf=await PDFDocument.create();
const image=await pdf.embedJpg(jpeg.encode({width:256,height:256,data:crypto.randomBytes(256*256*4)},75).data);
pdf.addPage([595,842]).drawImage(image,{x:0,y:0,width:595,height:842});
pdf.addPage([595,842]);
const templateBytes=Buffer.from(await pdf.save());
for(let i=0;i<8;i++)await saveTemplate({nama_template:templateName,peringkat:'Peringkat '+i,file_name:'peringkat-'+i+'.pdf',file_base64:templateBytes.toString('base64'),file_size:templateBytes.length,kategori:'kenaikan_tali_pinggang',page_count:2});
await remote.batch(Array.from({length:290},(_,i)=>({sql:'INSERT INTO pesilat(id,nama_penuh,no_kp_atau_id,peringkat,cawangan) VALUES(?,?,?,?,?)',args:[i+1,'PESILAT UJIAN '+(i+1),'ALL-290-'+i,'Peringkat '+(i%8),'Johor']})),'write');
const ids=Array.from({length:290},(_,i)=>i+1);

test('All 290 ranks generate with a 1MB cache budget despite transient saves and lost responses',async(t)=>{
 // Previously 290 full PDFs + SQLite WAL filled this disposable cache.
 db.exec('PRAGMA max_page_count=256');
 assert.equal(db.prepare('PRAGMA database_list').all().find(row=>row.name==='main').file,'');
 assert.equal(fs.existsSync(path.join(process.env.DATA_DIR,'prosijil.sqlite')),false);
 assert.equal(fs.existsSync(process.env.DATA_DIR),false,'Serverless generation must not write to the temporary disk at all.');
 const original=remote.execute;
 const failOnce=new Set([19,101,288]);let insertAttempts=0;
 remote.execute=async statement=>{
  if(typeof statement==='object' && statement.sql.startsWith('INSERT INTO sijil')){
   insertAttempts++;
   if(failOnce.delete(Number(statement.args[0])))throw Object.assign(new Error('Transient storage connection error'),{code:'SQLITE_BUSY'});
  }
  return original.call(remote,statement);
 };
 let loseResponse=true,networkFailure=true;
 const attempted=new Set(),progress=[];
 let result;
 try {
  result=await generateCertificateBatches({api:async(url,options)=>{
   if(url.endsWith('generate-batch')){
    options.body.pesilat_ids.forEach(id=>attempted.add(id));
    if(networkFailure && options.body.pesilat_ids.includes(141)){networkFailure=false;throw new Error('Network interrupted');}
   }
   const response=await api(url,options);
   if(url.endsWith('generate-batch') && loseResponse){loseResponse=false;throw new Error('Response lost after commit');}
   return response;
  },ids,templateName,issueDate:'2026-11-01',requestId:'all-290',sleep:async()=>{},onProgress:count=>progress.push(count)});
 } finally {remote.execute=original;}
 assert.equal(attempted.size,290);
 assert.equal(result.total,290);assert.equal(result.successCount,290);assert.equal(result.failedCount,0);assert.equal(result.verified,true);
 assert.equal(new Set(result.generatedTokens.map(row=>row.studentId)).size,290);
 assert.equal(new Set(result.generatedTokens.map(row=>row.token)).size,290);
 assert.equal(progress.at(-1),290);
 assert.equal(insertAttempts,293); // Retries reuse already committed rows.
 assert.equal((await remote.execute('SELECT count(*) AS n FROM sijil')).rows[0].n,290);
 assert.equal(db.prepare('SELECT count(*) AS n FROM sijil WHERE file_base64 IS NOT NULL').get().n,0);
 assert.equal(db.prepare('SELECT count(*) AS n FROM template_sijil WHERE file_base64 IS NOT NULL').get().n,0);
 assert.ok(db.prepare('PRAGMA page_count').get().page_count<=256);
 for(const item of result.generatedTokens){
  const saved=(await remote.execute({sql:'SELECT file_base64 FROM sijil WHERE public_token=?',args:[item.token]})).rows[0];
  const bytes=Buffer.from(saved.file_base64,'base64');
  const actual=await PDFDocument.load(bytes);
  assert.equal(actual.getPageCount(),2);
  assert.equal(actual.getTitle(),'PESILAT UJIAN '+item.studentId);
  assert.ok(bytes.length<templateBytes.length+15000);
 }
 const attemptsBefore=insertAttempts;
 const repeated=await generateCertificateBatches({api,ids,templateName,issueDate:'2026-11-01',requestId:'all-290',sleep:async()=>{}});
 assert.equal(repeated.successCount,290);assert.equal(repeated.failedCount,0);
 assert.equal((await remote.execute('SELECT count(*) AS n FROM sijil')).rows[0].n,290);
 assert.equal(insertAttempts,attemptsBefore);
 t.diagnostic('Verified 290 distinct recipients, 290 valid two-page PDFs, 0 omissions, no disk PDF cache.');
});

test('Final verification detects a missing certificate instead of trusting an earlier success count',async()=>{
 let removed=false;
 const result=await generateCertificateBatches({ids:[1,2,3],templateName,issueDate:'2026-11-01',requestId:'verify-missing',sleep:async()=>{},
  api:async(url,options)=>{
   if(url.endsWith('generation-status')&&!removed){
    removed=true;
    const token=crypto.createHash('sha256').update(admin.id+':verify-missing:3').digest('hex');
    await remote.execute({sql:'DELETE FROM sijil WHERE public_token=?',args:[token]});
   }
   return api(url,options);
  }});
 assert.equal(result.successCount,2);assert.equal(result.failedCount,1);
 assert.equal(result.failed[0].id,3);assert.equal(result.verified,true);
});

test('A provider quota failure is reported for its exact recipient, never as complete success',async()=>{
 const original=remote.execute;
 remote.execute=async statement=>{
  if(typeof statement==='object' && statement.sql.startsWith('INSERT INTO sijil') && Number(statement.args[0])===290){
   throw Object.assign(new Error('SQLITE_FULL: database or disk is full'),{code:'SQLITE_FULL'});
  }
  return original.call(remote,statement);
 };
 try {
  const result=await generateCertificateBatches({api,ids:[1,290,2],templateName,issueDate:'2026-11-01',requestId:'quota-check',sleep:async()=>{}});
  assert.equal(result.successCount,2);assert.equal(result.failedCount,1);
  assert.equal(result.failed[0].id,290);assert.equal(result.failed[0].retryable,false);
 } finally {remote.execute=original;}
});
