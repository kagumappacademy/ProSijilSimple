import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createClient } from '@libsql/client';

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'prosijil-persistence-'));
process.env.DATA_DIR=path.join(tmp,'local');
process.env.NODE_ENV='test';
process.env.TURSO_DATABASE_URL='';
process.env.TURSO_AUTH_TOKEN='';
const {db}=await import('../src/db.js');
const {saveCertificate}=await import('../src/certificateStore.js');
const {initTursoSchema,pullTursoToLocal,pushLocalToTurso}=await import('../src/turso.js');
const remote=createClient({url:'file::memory:'});
await initTursoSchema(remote);
const student=db.prepare('INSERT INTO pesilat(nama_penuh,no_kp_atau_id,peringkat,cawangan) VALUES(?,?,?,?)')
  .run('Pesilat Ujian','PERSIST-1','Awan Kuning','Skudai');
const studentId=Number(student.lastInsertRowid);
await remote.execute({sql:'INSERT INTO pesilat(id,nama_penuh,no_kp_atau_id,peringkat,cawangan) VALUES(?,?,?,?,?)',args:[studentId,'Pesilat Ujian','PERSIST-1','Awan Kuning','Skudai']});
const record={studentId,namaSijil:'Sijil Tersimpan',tarikh:'2026-10-31',token:'persist-token',fileBase64:Buffer.from('%PDF-saved').toString('base64'),kategori:'penyertaan'};
after(()=>{remote.close();db.close();fs.rmSync(tmp,{recursive:true,force:true});});

test('Durable save uses the remote ID, persists PDF bytes and safely retries',async()=>{
 await remote.execute({sql:'INSERT INTO sijil(id,pesilat_id,nama_sijil,tarikh_isu,jenis,public_token) VALUES(?,?,?,?,?,?)',args:[500,studentId,'Remote only','2026-10-31','generated','remote-only']});
 const id=await saveCertificate(record,remote);
 assert.equal(id,501);
 assert.equal(await saveCertificate(record,remote),501);
 const stored=(await remote.execute({sql:'SELECT file_base64 FROM sijil WHERE public_token=?',args:[record.token]})).rows[0];
 assert.equal(stored.file_base64,record.fileBase64);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sijil').get().n,1);
 assert.equal((await remote.execute('SELECT COUNT(*) AS n FROM sijil')).rows[0].n,2);
});

test('Failed remote storage never creates a successful local certificate',async()=>{
 await assert.rejects(saveCertificate({...record,token:'failed-token'},{execute:async()=>{throw new Error('Cloud unavailable');}}),/Cloud unavailable/);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sijil WHERE public_token=?').get('failed-token').n,0);
});

test('Pull does not hold a local transaction during network waits or erase PDF bytes',async()=>{
 let reads=0;
 const checkedRemote={execute:async statement=>{
   assert.equal(db.isTransaction,false);
   assert.equal(db.prepare('SELECT file_base64 FROM sijil WHERE public_token=?').get(record.token).file_base64,record.fileBase64);
   reads++;
   return remote.execute(statement);
 }};
 await pullTursoToLocal(checkedRemote);
 await pullTursoToLocal(checkedRemote);
 assert.ok(reads>=12);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sijil').get().n,2);
 assert.equal(db.prepare('SELECT file_base64 FROM sijil WHERE public_token=?').get(record.token).file_base64,record.fileBase64);
});

test('Push preserves remote-only certificates and PDFs absent from the local cache',async()=>{
 db.prepare('DELETE FROM sijil WHERE public_token=?').run('remote-only');
 db.prepare('UPDATE sijil SET file_base64=NULL WHERE public_token=?').run(record.token);
 await pushLocalToTurso(remote);
 assert.equal((await remote.execute('SELECT COUNT(*) AS n FROM sijil')).rows[0].n,2);
 assert.equal((await remote.execute({sql:'SELECT file_base64 FROM sijil WHERE public_token=?',args:[record.token]})).rows[0].file_base64,record.fileBase64);
});

test('Sync never publishes a metadata-only template without its PDF',async()=>{
 const result=db.prepare("INSERT INTO template_sijil(nama_template,peringkat,file_name) VALUES('Metadata sahaja','Awan Putih','missing.pdf')").run();
 await pushLocalToTurso(remote);
 const stored=await remote.execute({sql:'SELECT count(*) AS n FROM template_sijil WHERE id=?',args:[Number(result.lastInsertRowid)]});
 assert.equal(stored.rows[0].n,0);
});
