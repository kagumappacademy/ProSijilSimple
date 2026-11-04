import {seedCloudAdmin} from './cloud-admin.js';
import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import {PDFDocument} from 'pdf-lib';
import {DatabaseSync} from 'node:sqlite';

export async function registerBatchMetadataTests(cloud){
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'prosijil-batches-'));
  assert.ok(path.resolve(tmp).startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(tmp).startsWith('prosijil-batches-'));
  process.env.DATA_DIR=tmp;process.env.VERCEL='';process.env.NODE_ENV=cloud?'production':'test';
  process.env.TURSO_DATABASE_URL=cloud?'file::memory:':'';process.env.TURSO_AUTH_TOKEN='';process.env.JWT_SECRET='batch_metadata_tests_secret_at_least_32_characters';
  const {db}=await import('../../src/db.js');
  const {getTursoClient,initTursoSchema,pullTursoToLocal,pushLocalToTurso}=await import('../../src/turso.js');
  const {saveTemplate}=await import('../../src/templateStore.js');
  const {generationBatchId}=await import('../../src/certificateStore.js');
  const remote=cloud?getTursoClient():null;if(remote)await initTursoSchema(remote);
  if(remote)await seedCloudAdmin(remote,db);
  const {default:app}=await import('../../src/app.js');
  const server=app.listen(0);await new Promise(resolve=>server.once('listening',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const admin=db.prepare('SELECT id FROM admin_users LIMIT 1').get();
  const cookie='prosijil_admin='+jwt.sign({sub:String(admin.id)},process.env.JWT_SECRET,{issuer:'prosijil',expiresIn:'1h'});
  const name='Program Akademi November';
  async function sql(statement,args=[]){return remote?(await remote.execute({sql:statement,args})).rows:db.prepare(statement).all(...args);}
  async function call(url,body){
    const res=await fetch(base+'/api'+url,{method:body?'POST':'GET',headers:{Cookie:cookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    return {status:res.status,data:await res.json()};
  }
  const generate=(ids,request_id,kategori='penyertaan',extra={})=>call('/admin/templates/generate-batch',{pesilat_ids:ids,nama_template:name,tarikh_isu:'2026-11-04',request_id,...(kategori?{kategori}:{}),...extra});
  const prefix=cloud?'Cloud batch metadata':'Local batch metadata';
  const pdf=await PDFDocument.create();pdf.addPage([595,842]);const bytes=Buffer.from(await pdf.save());
  for(const kategori of ['penyertaan','penghargaan'])await saveTemplate({nama_template:name,peringkat:'Semua Peringkat',file_name:kategori+'.pdf',file_base64:bytes.toString('base64'),file_size:bytes.length,kategori,page_count:1});
  for(let id=1;id<=4;id++)await sql('INSERT INTO pesilat(id,nama_penuh,no_kp_atau_id,peringkat,cawangan) VALUES(?,?,?,?,?)',[id,'Pesilat Batch '+id,'BATCH-'+id,'Awan Putih',id%2?'Skudai':'Kulai']);
  after(async()=>{await new Promise(resolve=>server.close(resolve));remote?.close();db.close();fs.rmSync(tmp,{recursive:true,force:true});});

  test(prefix+': chunks and retries share a persistent batch, separate runs on the same date remain separate',async()=>{
    const first=await generate([1,2],'batch-run-one'),second=await generate([3,4],'batch-run-one');
    assert.equal(first.status,200);assert.equal(second.status,200);
    const batchId=generationBatchId(admin.id,'batch-run-one');assert.equal(first.data.batchId,batchId);assert.equal(second.data.batchId,batchId);
    const retry=await generate([1,2,3,4],'batch-run-one');assert.equal(retry.data.successCount,4);assert.equal(retry.data.batchId,batchId);
    assert.equal((await sql('SELECT count(*) AS n FROM sijil')).at(0).n,4);
    const other=await generate([1],'batch-run-two');assert.notEqual(other.data.batchId,batchId);
    const list=await call('/admin/certificates?all=1');assert.equal(list.data.total,5);
    const rows=list.data.rows.filter(row=>row.batch_id===batchId);assert.equal(rows.length,4);
    for(const row of rows){assert.equal(row.template_name,name);assert.equal(row.jenis,'generated');assert.equal(row.kategori,'penyertaan');assert.equal(row.file_base64,undefined);}
    const status=await call('/admin/templates/generation-status',{pesilat_ids:[1,2,3,4],request_id:'batch-run-one'});
    assert.equal(status.data.batchId,batchId);assert.equal(status.data.verified,true);
  });

  test(prefix+': same template title across types requires an unambiguous type and stores the correct category',async()=>{
    assert.equal((await generate([1],'ambiguous','')).status,400);
    assert.equal((await generate([1],'invalid','unknown')).status,400);
    const response=await generate([1],'category-specific','penghargaan');assert.equal(response.data.successCount,1);
    const [saved]=await sql('SELECT kategori,template_name FROM sijil WHERE public_token=?',[response.data.generatedTokens[0].token]);
    assert.equal(saved.kategori,'penghargaan');assert.equal(saved.template_name,name);
  });

  test(prefix+': an existing batch cannot be reused for a different date, template or category',async()=>{
    for(const extra of [{tarikh_isu:'2026-11-05'},{nama_template:'Nama lain'},{kategori:'penghargaan'}])assert.equal((await generate([1],'batch-run-one','penyertaan',extra)).status,409);
    assert.equal((await generate([1],'batch-run-one','')).data.successCount,1,'Retry can infer the previously stored category.');
  });

  test(prefix+': batch metadata survives a fresh connection or cloud cache refresh, without changing PDFs',async()=>{
    const [before]=await sql('SELECT * FROM sijil WHERE batch_id=? LIMIT 1',[generationBatchId(admin.id,'batch-run-one')]);
    if(remote){
      db.exec('DELETE FROM sijil');await pullTursoToLocal(remote);
      const cached=db.prepare('SELECT batch_id,template_name,file_base64 FROM sijil WHERE id=?').get(before.id);
      assert.equal(cached.batch_id,before.batch_id);assert.equal(cached.template_name,name);assert.equal(cached.file_base64,null);
      db.prepare('UPDATE sijil SET batch_id=?,template_name=? WHERE id=?').run('stale','Stale title',before.id);
      await pushLocalToTurso(remote);
      const [after]=await sql('SELECT batch_id,template_name,file_base64 FROM sijil WHERE id=?',[before.id]);
      assert.equal(after.batch_id,before.batch_id);assert.equal(after.template_name,name);assert.equal(after.file_base64,before.file_base64);
    }else{
      const filename=db.prepare('PRAGMA database_list').all().find(row=>row.name==='main').file;
      const fresh=new DatabaseSync(filename);try{const saved=fresh.prepare('SELECT * FROM sijil WHERE id=?').get(before.id);assert.equal(saved.batch_id,before.batch_id);assert.equal(saved.template_name,name);assert.equal(saved.file_base64,before.file_base64);}finally{fresh.close();}
    }
  });
}
