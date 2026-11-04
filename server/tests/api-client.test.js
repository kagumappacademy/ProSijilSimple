import { test } from 'node:test';
import assert from 'node:assert/strict';
import { api } from '../../client/src/lib/api.js';

test('Upload size check counts both PDF files before contacting the server',async(t)=>{
 const fetchMock=t.mock.method(globalThis,'fetch',async()=>{throw new Error('Must not upload');});
 const form=new FormData();
 const bytes=new Uint8Array(2.1*1024*1024);
 form.set('file_page1',new Blob([bytes]),'front.pdf');
 form.set('file_page2',new Blob([bytes]),'back.pdf');
 await assert.rejects(api('/admin/templates',{method:'POST',body:form}),error=>error.status===413 && /4MB/.test(error.message));
 assert.equal(fetchMock.mock.callCount(),0);
});

test('API errors preserve confirmed import progress and explain hosting payload errors',async(t)=>{
 const fetchMock=t.mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify({error:'Import terhenti',inserted:3,skipped:1}),{status:503,headers:{'Content-Type':'application/json'}}));
 await assert.rejects(api('/admin/students/import'),error=>error.status===503 && error.data.inserted===3);
 fetchMock.mock.mockImplementation(async()=>new Response('',{status:413}));
 await assert.rejects(api('/admin/templates'),error=>error.status===413 && /4MB/.test(error.message));
});

test('Incomplete JSON responses produce a useful retry message',async(t)=>{
 t.mock.method(globalThis,'fetch',async()=>new Response('{"rows":',{headers:{'Content-Type':'application/json'}}));
 await assert.rejects(api('/admin/templates'),/Respons pelayan tidak lengkap/);
});

test('Concurrent identical reads share a request, but later reads remain fresh',async(t)=>{
 let finish;
 const fetchMock=t.mock.method(globalThis,'fetch',()=>new Promise(resolve=>{finish=resolve;}));
 const first=api('/admin/dashboard?dedupe=1'),second=api('/admin/dashboard?dedupe=1');
 assert.equal(fetchMock.mock.callCount(),1);
 finish(new Response('{"pesilat":290}',{headers:{'Content-Type':'application/json'}}));
 assert.deepEqual(await first,{pesilat:290});assert.deepEqual(await second,{pesilat:290});
 fetchMock.mock.mockImplementation(async()=>new Response('{"pesilat":291}',{headers:{'Content-Type':'application/json'}}));
 assert.equal((await api('/admin/dashboard?dedupe=1')).pesilat,291);assert.equal(fetchMock.mock.callCount(),2);
});

test('Aborted callers and mutations never share another request or retain old read promises',async(t)=>{
 const waiting=[];const fetchMock=t.mock.method(globalThis,'fetch',()=>new Promise(resolve=>waiting.push(resolve)));
 const first=api('/admin/students?dedupe=2');
 const mutation=api('/admin/students',{method:'POST',body:{nama_penuh:'Test'}});
 const next=api('/admin/students?dedupe=2');
 const controller=new AbortController(),abortable=api('/admin/students?dedupe=2',{signal:controller.signal});
 assert.equal(fetchMock.mock.callCount(),4);
 waiting.forEach(resolve=>resolve(new Response('{}',{headers:{'Content-Type':'application/json'}})));
 await Promise.all([first,mutation,next,abortable]);
});
