import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
