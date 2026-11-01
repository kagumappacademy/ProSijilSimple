import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const projectRoot=fileURLToPath(new URL('../../',import.meta.url));
function runIsolated(source,dataDir,extraEnv={}) {
 const result=spawnSync(process.execPath,['--input-type=module','-e',source],{
  cwd:projectRoot,encoding:'utf8',timeout:15000,
  env:{...process.env,DATA_DIR:dataDir,NODE_ENV:'test',VERCEL:'',TURSO_DATABASE_URL:'',TURSO_AUTH_TOKEN:'',...extraEnv},
 });
 assert.equal(result.status,0,result.stderr);
 return JSON.parse(result.stdout.trim().split('\n').at(-1));
}

test('Uploaded template survives a real process restart without a separate PDF file',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'prosijil-template-restart-'));
 try {
  const saved=runIsolated(`
   import {PDFDocument} from 'pdf-lib';
   import {saveTemplate} from './server/src/templateStore.js';
   import {db} from './server/src/db.js';
   const pdf=await PDFDocument.create();pdf.addPage();pdf.addPage();
   const bytes=Buffer.from(await pdf.save());
   const row=await saveTemplate({nama_template:'Templat Restart',peringkat:'Semua Peringkat',file_name:'restart.pdf',file_size:bytes.length,file_base64:bytes.toString('base64'),kategori:'penyertaan',page_count:2});
   console.log(JSON.stringify({id:row.id,bytes:row.file_base64}));db.close();
  `,tmp);
  assert.deepEqual(fs.readdirSync(path.join(tmp,'templates')),[]);
  const loaded=runIsolated(`
   import {PDFDocument} from 'pdf-lib';
   import {getStoredTemplate} from './server/src/templateStore.js';
   import {db} from './server/src/db.js';
   const row=await getStoredTemplate(${saved.id});
   const pdf=await PDFDocument.load(Buffer.from(row.file_base64,'base64'));
   console.log(JSON.stringify({id:row.id,bytes:row.file_base64,pages:pdf.getPageCount()}));db.close();
  `,tmp);
  assert.equal(loaded.id,saved.id);
  assert.equal(loaded.bytes,saved.bytes);
  assert.equal(loaded.pages,2);
 } finally {fs.rmSync(tmp,{recursive:true,force:true});}
});

test('Serverless hosting cannot report a template upload as saved without permanent storage',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'prosijil-template-storage-'));
 try {
  const result=runIsolated(`
   import {saveTemplate} from './server/src/templateStore.js';
   import {db} from './server/src/db.js';
   let status;
   try {await saveTemplate({nama_template:'Temporary upload',file_base64:'JVBERi0='});}
   catch(error){status=error.status;}
   console.log(JSON.stringify({status,count:db.prepare('SELECT count(*) AS n FROM template_sijil').get().n}));db.close();
  `,tmp,{VERCEL:'1'});
  assert.equal(result.status,503);
  assert.equal(result.count,0);
 } finally {fs.rmSync(tmp,{recursive:true,force:true});}
});

test('Existing cloud templates remain readable when optional metadata columns need migration',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'prosijil-template-migration-'));
 try {
  const result=runIsolated(`
   import {getTursoClient} from './server/src/turso.js';
   import {listStoredTemplates} from './server/src/templateStore.js';
   import {db} from './server/src/db.js';
   const remote=getTursoClient();
   await remote.execute('CREATE TABLE template_sijil(id INTEGER PRIMARY KEY,nama_template TEXT,peringkat TEXT,keterangan TEXT,file_name TEXT,file_size INTEGER,file_path TEXT,file_base64 TEXT,kategori TEXT,created_at TEXT)');
   await remote.execute("INSERT INTO template_sijil(id,nama_template,peringkat,file_name) VALUES(1,'Templat Lama','Awan Putih','lama.pdf')");
   const rows=await listStoredTemplates();
   console.log(JSON.stringify({count:rows.length,id:rows[0].id,pages:rows[0].page_count,layout:rows[0].layout_config}));
   remote.close();db.close();
  `,tmp,{NODE_ENV:'production',TURSO_DATABASE_URL:'file::memory:',JWT_SECRET:'template_migration_test_secret_minimum_32_chars'});
  assert.deepEqual(result,{count:1,id:1,pages:1,layout:null});
 } finally {fs.rmSync(tmp,{recursive:true,force:true});}
});

test('A new cloud database initializes storage before accepting a permanent template upload',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'prosijil-cloud-init-'));
 try {
  const result=runIsolated(`
   import {PDFDocument} from 'pdf-lib';
   import {saveTemplate,getStoredTemplate} from './server/src/templateStore.js';
   import {getTursoClient} from './server/src/turso.js';
   import {db} from './server/src/db.js';
   const pdf=await PDFDocument.create();pdf.addPage();
   const bytes=Buffer.from(await pdf.save());
   const row=await saveTemplate({nama_template:'First Upload',peringkat:'Semua Peringkat',file_name:'first.pdf',file_size:bytes.length,file_base64:bytes.toString('base64'),page_count:1});
   db.exec('DELETE FROM template_sijil');
   const loaded=await getStoredTemplate(row.id);
   console.log(JSON.stringify({id:loaded.id,bytes:loaded.file_base64===bytes.toString('base64')}));
   getTursoClient().close();db.close();
  `,tmp,{NODE_ENV:'production',TURSO_DATABASE_URL:'file::memory:',JWT_SECRET:'cloud_init_test_secret_minimum_32_chars'});
  assert.deepEqual(result,{id:1,bytes:true});
 } finally {fs.rmSync(tmp,{recursive:true,force:true});}
});

for(const {cloud,nullableCloud} of [{cloud:false},{cloud:true},{cloud:true,nullableCloud:true}]) {
 test(`Template upload supports legacy NOT NULL file_path in ${nullableCloud?'cache with a newer cloud schema':cloud?'cloud and cache':'local'} databases`,()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'prosijil-template-legacy-path-'));
  try {
   const result=runIsolated(`
    import fs from 'node:fs';
    import path from 'node:path';
    import {DatabaseSync} from 'node:sqlite';
    import {PDFDocument} from 'pdf-lib';
    import jwt from 'jsonwebtoken';
    const legacySchema=\`CREATE TABLE template_sijil(
     id INTEGER PRIMARY KEY AUTOINCREMENT,nama_template TEXT NOT NULL,peringkat TEXT NOT NULL,
     keterangan TEXT,file_path TEXT NOT NULL,file_name TEXT NOT NULL,file_size INTEGER DEFAULT 0,
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )\`;
    const originalPath=path.join(process.env.DATA_DIR,'original-template.pdf');
    const pdf=await PDFDocument.create();pdf.addPage([595,842]);
    const bytes=Buffer.from(await pdf.save());fs.writeFileSync(originalPath,bytes);
    const legacy=new DatabaseSync(path.join(process.env.DATA_DIR,'prosijil.sqlite'));
    legacy.exec(legacySchema);
    legacy.prepare("INSERT INTO template_sijil(nama_template,peringkat,file_path,file_name) VALUES('Existing','Awan Putih',?,'original.pdf')").run(originalPath);
    legacy.close();
    const {db}=await import('./server/src/db.js');
    const {getTursoClient,pushLocalToTurso,pullTursoToLocal,pullTemplatesFromTurso}=await import('./server/src/turso.js');
    let remote;
    if(${cloud}) {
     remote=getTursoClient();await remote.execute(${nullableCloud===true}?legacySchema.replace('file_path TEXT NOT NULL','file_path TEXT'):legacySchema);
     await remote.execute({sql:"INSERT INTO template_sijil(nama_template,peringkat,file_path,file_name) VALUES('Existing','Awan Putih',?,'original.pdf')",args:[originalPath]});
    }
    const {default:app}=await import('./server/src/app.js');
    const server=app.listen(0);await new Promise(resolve=>server.once('listening',resolve));
    try {
     const admin=db.prepare('SELECT id,username FROM admin_users LIMIT 1').get();
     const cookie='prosijil_admin='+jwt.sign({sub:String(admin.id)},process.env.JWT_SECRET,{issuer:'prosijil',expiresIn:'1h'});
     const base='http://127.0.0.1:'+server.address().port;
     const form=new FormData();
     form.set('nama_template','Legacy Compatible Upload');form.set('peringkat','Semua Peringkat');
     form.set('file',new Blob([bytes],{type:'application/pdf'}),'new.pdf');
     const uploaded=await fetch(base+'/api/admin/templates',{method:'POST',headers:{Cookie:cookie},body:form});
     const data=await uploaded.json();
     if(uploaded.status!==201)throw new Error('Upload failed ('+uploaded.status+'): '+data.error);
     if(${nullableCloud===true}) {
      await remote.execute({sql:'UPDATE template_sijil SET file_path=NULL WHERE id=?',args:[data.id]});
      await pullTursoToLocal(remote);
      await pullTemplatesFromTurso();
     }
     const preview=await fetch(base+'/api/admin/templates/'+data.id+'/preview',{headers:{Cookie:cookie}});
     const downloaded=Buffer.from(await preview.arrayBuffer());
     const localRow=db.prepare('SELECT file_base64,file_path FROM template_sijil WHERE id=?').get(data.id);
     if(remote)await pushLocalToTurso(remote);
     const stored=remote?(await remote.execute({sql:'SELECT file_base64 FROM template_sijil WHERE id=?',args:[data.id]})).rows[0]:localRow;
     console.log(JSON.stringify({status:uploaded.status,preview:preview.status,bytes:downloaded.equals(bytes),local:localRow.file_base64===(${cloud}?null:bytes.toString('base64')),durable:stored.file_base64===bytes.toString('base64'),pathValid:typeof localRow.file_path==='string',existing:db.prepare('SELECT file_path FROM template_sijil WHERE id=1').get().file_path===originalPath,original:fs.readFileSync(originalPath).equals(bytes)}));
    } finally {await new Promise(resolve=>server.close(resolve));remote?.close();db.close();}
   `,tmp,{NODE_ENV:cloud?'production':'test',TURSO_DATABASE_URL:cloud?'file::memory:':'',JWT_SECRET:'legacy_path_regression_secret_minimum_32_chars'});
   assert.deepEqual(result,{status:201,preview:200,bytes:true,local:true,durable:true,pathValid:true,existing:true,original:true});
  } finally {fs.rmSync(tmp,{recursive:true,force:true});}
 });
}

for(const cloud of [false,true]) {
 test(`Updated certificates and templates survive a ${cloud?'cold cloud instance':'local restart'} and remove the retired deletion table`,()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'prosijil-updated-files-'));
  const env={NODE_ENV:cloud?'production':'test',TURSO_DATABASE_URL:cloud?pathToFileURL(path.join(tmp,'cloud.sqlite')).href:'',JWT_SECRET:'updated_files_restart_secret_minimum_32_chars'};
  try {
   const saved=runIsolated(`
    import {PDFDocument} from 'pdf-lib';
    import {saveStudent} from './server/src/studentStore.js';
    import {saveCertificate,updateStoredCertificate} from './server/src/certificateStore.js';
    import {saveTemplate,updateTemplateMetadata} from './server/src/templateStore.js';
    import {db} from './server/src/db.js';
    import {getTursoClient} from './server/src/turso.js';
    const student=await saveStudent({nama_penuh:'Pesilat Kekal',no_kp_atau_id:'RESTART-FILES',peringkat:'Awan Putih',cawangan:'Johor',tarikh_daftar:'2026-11-01'});
    const first=await PDFDocument.create();first.addPage();first.setTitle('ASAL');
    const second=await PDFDocument.create();second.addPage();second.addPage();second.setTitle('DIKEMASKINI');
    const original=Buffer.from(await first.save()).toString('base64');
    const latest=Buffer.from(await second.save()).toString('base64');
    const cert=await saveCertificate({studentId:student.id,namaSijil:'Sijil Asal',tarikh:'2026-11-01',fileBase64:original,token:'updated-restart',kategori:'penyertaan'});
    await updateStoredCertificate(cert,{namaSijil:'Sijil Terkini',tarikh:'2026-11-01',kategori:'penyertaan',fileBase64:latest,fileType:'application/pdf'});
    const base={nama_template:'Templat Kekal',peringkat:'Semua Peringkat',file_name:'template.pdf',file_size:Buffer.from(original,'base64').length,file_base64:original,kategori:'penyertaan',page_count:1};
    const template=await saveTemplate(base);
    await saveTemplate({...base,file_base64:latest,file_size:Buffer.from(latest,'base64').length,page_count:2},template.id);
    await updateTemplateMetadata(template.id,'layout_config','{"fontSize":31}');
    const retired='CREATE TABLE template_sijil_deleted(id INTEGER PRIMARY KEY,deleted_at TEXT)';
    db.exec(retired);db.prepare('INSERT INTO template_sijil_deleted(id) VALUES(?)').run(template.id);
    if(${cloud}){const remote=getTursoClient();await remote.execute(retired);await remote.execute({sql:'INSERT INTO template_sijil_deleted(id) VALUES(?)',args:[template.id]});remote.close();}
    console.log(JSON.stringify({cert,template:template.id,latest}));db.close();
   `,path.join(tmp,'cache1'),env);
   const loaded=runIsolated(`
    import fs from 'node:fs';import path from 'node:path';
    import {PDFDocument} from 'pdf-lib';
    import {getStoredCertificate} from './server/src/certificateStore.js';
    import {getStoredTemplate} from './server/src/templateStore.js';
    import {getTursoClient} from './server/src/turso.js';
    import {db} from './server/src/db.js';
    const cert=await getStoredCertificate(${saved.cert});
    const template=await getStoredTemplate(${saved.template});
    const pages=(await PDFDocument.load(Buffer.from(cert.file_base64,'base64'))).getPageCount();
    const retiredLocal=db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name='template_sijil_deleted'").get().n;
    let retiredCloud=0;if(${cloud}){const remote=getTursoClient();retiredCloud=Number((await remote.execute("SELECT count(*) AS n FROM sqlite_master WHERE name='template_sijil_deleted'")).rows[0].n);remote.close();}
    console.log(JSON.stringify({cert:cert.file_base64,template:template.file_base64,title:cert.nama_sijil,layout:JSON.parse(template.layout_config).fontSize,pages,retiredLocal,retiredCloud,uploads:fs.readdirSync(path.join(process.env.DATA_DIR,'uploads')),templates:fs.readdirSync(path.join(process.env.DATA_DIR,'templates'))}));db.close();
   `,path.join(tmp,cloud?'cache2':'cache1'),env);
   assert.deepEqual(loaded,{cert:saved.latest,template:saved.latest,title:'Sijil Terkini',layout:31,pages:2,retiredLocal:0,retiredCloud:0,uploads:[],templates:[]});
  } finally {fs.rmSync(tmp,{recursive:true,force:true});}
 });
}
