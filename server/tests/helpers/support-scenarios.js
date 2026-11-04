import {test,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import {DatabaseSync} from 'node:sqlite';

export async function registerSupportTests(cloud){
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'prosijil-support-'));
  assert.ok(path.resolve(tmp).startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(tmp).startsWith('prosijil-support-'));
  process.env.DATA_DIR=tmp;process.env.VERCEL='';process.env.NODE_ENV=cloud?'production':'test';
  process.env.TURSO_DATABASE_URL=cloud?'file::memory:':'';process.env.TURSO_AUTH_TOKEN='';process.env.JWT_SECRET='support_tests_secret_at_least_32_characters';
  const {db}=await import('../../src/db.js');
  const {getTursoClient,initTursoSchema,pullTursoToLocal,pushLocalToTurso}=await import('../../src/turso.js');
  const remote=cloud?getTursoClient():null;if(remote)await initTursoSchema(remote);
  const {createPublicReport,validatePublicReport}=await import('../../src/supportStore.js');
  const {default:app,reportLimit}=await import('../../src/app.js');
  const server=app.listen(0);await new Promise(resolve=>server.once('listening',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const admin=db.prepare('SELECT id,username FROM admin_users LIMIT 1').get();
  const cookie='prosijil_admin='+jwt.sign({sub:String(admin.id)},process.env.JWT_SECRET,{issuer:'prosijil',expiresIn:'1h'});
  const prefix=cloud?'Cloud support':'Local support';
  const execute=(sql,args=[])=>remote?remote.execute({sql,args}):{rows:db.prepare(sql).all(...args)};
  const fixture=(overrides={})=>({request_id:crypto.randomUUID(),category:'teknikal',reporter_name:'Ibu Bapa Ujian',reporter_role:'ibu_bapa',email:'parent@example.test',phone:'',student_name:'Pesilat Ujian',branch:'Skudai',subject:'Sijil tidak boleh dimuat turun',message:'Butang muat turun tidak memberi respons selepas ditekan.',page_path:'/verify/test-token?private=hidden#detail',...overrides});
  async function call(url,body,method=body?'POST':'GET',authenticated=false){
    const res=await fetch(base+url,{method,headers:{...(authenticated?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    return {res,data:await res.json()};
  }
  const inbox=(url='/api/admin/reports')=>call(url,undefined,'GET',true);
  async function count(){return Number((await execute('SELECT count(*) AS n FROM public_reports')).rows[0].n);}
  beforeEach(async(t)=>{
    t.mock.method(console,'error',()=>{});
    reportLimit.resetKey('127.0.0.1');reportLimit.resetKey('::ffff:127.0.0.1');
    if(remote)await remote.batch(['DELETE FROM public_reports',"DELETE FROM settings WHERE key IN ('support_email','support_contacts')"],'write');
    db.exec("DELETE FROM public_reports; DELETE FROM settings WHERE key IN ('support_email','support_contacts')");
  });
  after(async()=>{await new Promise(resolve=>server.close(resolve));remote?.close();db.close();fs.rmSync(tmp,{recursive:true,force:true});});

  test(prefix+': public contacts contain only the approved officers and public settings',async()=>{
    const response=await call('/api/public/contact');assert.equal(response.res.status,200);
    assert.deepEqual(response.data.contacts,[{name:'En. Ifni',phone:'013 703 6786',whatsapp:'60137036786'},{name:'En. Harith',phone:'011 6116 9689',whatsapp:'601161169689'}]);
    assert.deepEqual(Object.keys(response.data).sort(),['contacts','email']);assert.equal(response.data.email,'');
    assert.equal(response.res.headers.get('cache-control'),'no-store');
    assert.equal((await call('/api/admin/support-contact')).res.status,401);
    assert.equal((await call('/api/admin/support-contact',{email:'other@example.test',contacts:[]},'PUT')).res.status,401);
  });

  test(prefix+': a public submission persists, returns only its receipt and cannot expose or alter private report details',async()=>{
    const body=fixture({status:'selesai',admin_notes:'Public cannot set this'});
    const created=await call('/api/public/reports',body);assert.equal(created.res.status,201);
    assert.match(created.data.reference,/^LAP-\d{8}-[A-F0-9]{12}$/);
    assert.deepEqual(Object.keys(created.data).sort(),['created_at','reference']);assert.equal(await count(),1);
    const report=(await execute('SELECT * FROM public_reports')).rows[0];
    assert.equal(report.reporter_name,body.reporter_name);assert.equal(report.message,body.message);
    assert.equal(report.status,'baru');assert.equal(report.admin_notes,'');assert.equal(report.page_path,'/verify/test-token');
    assert.equal((await call('/api/admin/reports')).res.status,401);
    assert.equal((await call('/api/admin/reports/'+report.id)).res.status,401);
    assert.equal((await call('/api/admin/reports/'+report.id,{status:'selesai',version:1,admin_notes:'x'},'PUT')).res.status,401);
    assert.equal((await call('/api/public/reports')).res.status,404);
    const detail=await inbox('/api/admin/reports/'+report.id);assert.equal(detail.data.email,body.email);
  });

  test(prefix+': repeat requests have one receipt, cannot reset admin actions and reject reuse for different content',async()=>{
    const body=fixture(),first=await call('/api/public/reports',body),second=await call('/api/public/reports',body);
    assert.equal(second.res.status,200);assert.deepEqual(second.data,first.data);assert.equal(await count(),1);
    const id=(await inbox()).data.rows[0].id;
    await call('/api/admin/reports/'+id,{status:'selesai',admin_notes:'Sudah dihubungi',version:1},'PUT',true);
    assert.equal((await call('/api/public/reports',body)).data.reference,first.data.reference);
    assert.equal((await inbox('/api/admin/reports/'+id)).data.status,'selesai');
    assert.equal((await call('/api/public/reports',{...body,subject:'Laporan lain'})).res.status,409);assert.equal(await count(),1);
  });

  test(prefix+': invalid and oversized fields are rejected without silently truncating a report',async()=>{
    for(const values of [{reporter_name:''},{email:'',phone:''},{email:'invalid'},{phone:'letters'},{subject:'x'},{message:'short'},{message:'x'.repeat(4001)},{reporter_role:'admin'},{category:'unknown'},{page_path:'https://external.example/'},{page_path:'//external.example/'},{page_path:'/\\external.example/'},{request_id:'short'},{website:'spam'}]){
      assert.throws(()=>validatePublicReport(fixture(values)),error=>error.status===400,JSON.stringify(values).slice(0,100));
    }
    assert.equal((await call('/api/public/reports',fixture({email:'',phone:''}))).res.status,400);
    assert.equal((await call('/api/public/reports',fixture({message:'x'.repeat(4001)}))).res.status,400);
    assert.equal(await count(),0);
  });

  test(prefix+': inbox pagination, filters and counts read the primary report set',async()=>{
    for(let index=0;index<35;index++)await createPublicReport(fixture({subject:'Pertanyaan nombor '+index}));
    await execute("UPDATE public_reports SET status='selesai' WHERE id IN (SELECT id FROM public_reports ORDER BY id LIMIT 2)");
    await execute("UPDATE public_reports SET status='dalam_semakan' WHERE id IN (SELECT id FROM public_reports WHERE status='baru' ORDER BY id LIMIT 3)");
    const first=await inbox(),second=await inbox('/api/admin/reports?page=2');
    assert.equal(first.data.rows.length,20);assert.equal(second.data.rows.length,15);assert.equal(first.data.total,35);
    assert.equal(new Set([...first.data.rows,...second.data.rows].map(row=>row.id)).size,35);
    assert.deepEqual(first.data.counts,{baru:30,dalam_semakan:3,selesai:2,semua:35});
    assert.equal((await inbox('/api/admin/reports?status=selesai')).data.total,2);
    assert.equal((await inbox('/api/admin/reports?q='+encodeURIComponent(first.data.rows[0].reference))).data.total,1);
    assert.equal((await inbox('/api/admin/reports?q='+encodeURIComponent("' OR 1=1 --"))).data.total,0);
    assert.ok(first.data.rows.every(row=>!('email' in row)&&!('message' in row)&&!('admin_notes' in row)));
    assert.equal(first.res.headers.get('cache-control'),'no-store');
    assert.equal((await inbox('/api/admin/reports?status=invalid')).res.status,400);
  });

  test(prefix+': admin actions persist and stale updates cannot overwrite another action',async()=>{
    await call('/api/public/reports',fixture());const id=(await inbox()).data.rows[0].id;
    const updated=await call('/api/admin/reports/'+id,{status:'dalam_semakan',admin_notes:'Menyemak fail sijil',version:1},'PUT',true);
    assert.equal(updated.res.status,200);assert.equal(updated.data.version,2);assert.equal(updated.data.updated_by,admin.username);
    assert.equal((await call('/api/admin/reports/'+id,{status:'selesai',admin_notes:'Stale edit',version:1},'PUT',true)).res.status,409);
    assert.equal((await inbox('/api/admin/reports/'+id)).data.admin_notes,'Menyemak fail sijil');
    assert.equal((await call('/api/admin/reports/'+id,{status:'invalid',admin_notes:'',version:2},'PUT',true)).res.status,400);
    assert.equal((await inbox('/api/admin/reports/9999999')).res.status,404);
    assert.equal((await inbox('/api/admin/reports/not-a-number')).res.status,400);
  });

  test(prefix+': official contacts can be updated, validated and intentionally cleared',async()=>{
    const body={email:'support@example.test',contacts:[{name:"Jurulatih O'Harith",phone:'+60129000000'}]};
    const saved=await call('/api/admin/support-contact',body,'PUT',true);assert.equal(saved.res.status,200);
    assert.equal((await call('/api/public/contact')).data.contacts[0].whatsapp,'60129000000');
    assert.equal((await call('/api/admin/support-contact',{email:'bad',contacts:[]},'PUT',true)).res.status,400);
    assert.equal((await call('/api/public/contact')).data.email,body.email);
    assert.equal((await call('/api/admin/support-contact',{email:'',contacts:Array(6).fill(body.contacts[0])},'PUT',true)).res.status,400);
    const cleared=await call('/api/admin/support-contact',{email:'',contacts:[]},'PUT',true);assert.equal(cleared.res.status,200);
    assert.deepEqual((await call('/api/public/contact')).data,{email:'',contacts:[]});
  });

  test(prefix+': public submission rate limits are separate from the administrator inbox',async()=>{
    for(let index=0;index<8;index++)assert.equal((await call('/api/public/reports',{})).res.status,400);
    const ninth=await call('/api/public/reports',fixture());assert.equal(ninth.res.status,429);assert.ok(ninth.res.headers.has('retry-after'));
    assert.equal((await inbox()).res.status,200);assert.equal(await count(),0);
  });

  if(!remote)test(prefix+': acknowledged reports and contact settings are visible from a fresh database connection',async()=>{
    const result=await call('/api/public/reports',fixture());
    await call('/api/admin/support-contact',{email:'persist@example.test',contacts:[]},'PUT',true);
    const fresh=new DatabaseSync(path.join(tmp,'prosijil.sqlite'));
    try{assert.equal(fresh.prepare('SELECT reference FROM public_reports').get().reference,result.data.reference);assert.equal(fresh.prepare("SELECT value FROM settings WHERE key='support_email'").get().value,'persist@example.test');}finally{fresh.close();}
  });

  if(remote){
    test(prefix+': an empty or stale cache cannot lose reports, publish stale messages or revert official contacts',async()=>{
      await call('/api/public/reports',fixture());const id=(await inbox()).data.rows[0].id;
      await call('/api/admin/reports/'+id,{status:'selesai',admin_notes:'Kekal',version:1},'PUT',true);
      assert.equal(db.prepare('SELECT count(*) AS n FROM public_reports').get().n,0);
      db.exec("INSERT INTO settings(key,value) VALUES('support_email','stale@example.test')");
      await pullTursoToLocal(remote);await pushLocalToTurso(remote);
      assert.equal((await inbox('/api/admin/reports/'+id)).data.status,'selesai');
      assert.equal((await call('/api/public/contact')).data.email,'');assert.equal(await count(),1);
    });

    test(prefix+': failed writes never return a receipt and a lost response can be retried without duplication',async(t)=>{
      t.mock.method(console,'error',()=>{});const original=remote.execute.bind(remote);let failInsert=true,failRead=false;
      t.mock.method(remote,'execute',async statement=>{
        if(failInsert&&typeof statement==='object'&&statement.sql.startsWith('INSERT INTO public_reports'))throw new Error('Quota failure');
        if(failRead&&typeof statement==='object'&&statement.sql==='SELECT * FROM public_reports WHERE request_id=?'){failRead=false;throw new Error('Response lost');}
        return original(statement);
      });
      const body=fixture(),failed=await call('/api/public/reports',body);assert.equal(failed.res.status,503);assert.equal(failed.data.reference,undefined);assert.equal(await count(),0);
      failInsert=false;failRead=true;
      assert.equal((await call('/api/public/reports',body)).res.status,503);assert.equal(await count(),1);
      const retry=await call('/api/public/reports',body);assert.equal(retry.res.status,200);assert.ok(retry.data.reference);assert.equal(await count(),1);
    });

    test(prefix+': contact changes are atomic and failed updates retain the last saved values',async(t)=>{
      t.mock.method(console,'error',()=>{});t.mock.method(remote,'batch',async()=>{throw new Error('Cloud unavailable');});
      const failure=await call('/api/admin/support-contact',{email:'new@example.test',contacts:[]},'PUT',true);assert.equal(failure.res.status,503);
      const contacts=(await call('/api/public/contact')).data;assert.equal(contacts.email,'');assert.equal(contacts.contacts.length,2);
    });

    test(prefix+': explicit migrations import reports once and preserve cloud actions on repeated migration',async()=>{
      db.exec("INSERT INTO public_reports(request_id,reference,category,reporter_name,reporter_role,email,subject,message) VALUES('migration-report-request','LAP-MIGRATE-0001','teknikal','Migration','lain','migration@example.test','Migration report','Report kept across migration')");
      await pushLocalToTurso(remote,{importNewRecords:true});assert.equal(await count(),1);
      const id=(await inbox()).data.rows[0].id;
      await call('/api/admin/reports/'+id,{status:'selesai',admin_notes:'Cloud action',version:1},'PUT',true);
      await pushLocalToTurso(remote,{importNewRecords:true});assert.equal(await count(),1);
      assert.equal((await inbox('/api/admin/reports/'+id)).data.admin_notes,'Cloud action');
    });
  }
}
