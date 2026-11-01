import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateCertificateBatches} from '../../client/src/lib/generateBatch.js';

test('An exhausted middle chunk still allows later recipients to generate, then retries the remainder',async()=>{
 const saved=new Map(),attempts=[];let failedRequests=0,failedVerify=false;
 const result=await generateCertificateBatches({ids:Array.from({length:15},(_,i)=>i+1),templateName:'Semua',requestId:'resume',sleep:async()=>{},
  api:async(url,{body})=>{
   if(url.endsWith('generation-status')){
    if(!failedVerify){failedVerify=true;throw new Error('Verification connection interrupted');}
    return {verified:true,generatedTokens:[...saved.values()]};
   }
   attempts.push([...body.pesilat_ids]);
   if(body.pesilat_ids.includes(6) && failedRequests++<2)throw new Error('Gateway timeout');
   const tokens=body.pesilat_ids.map(studentId=>({studentId,token:'saved-'+studentId}));
   tokens.forEach(item=>saved.set(item.studentId,item));
   return {successCount:tokens.length,generatedTokens:tokens,failed:[]};
  }});
 assert.deepEqual(attempts.slice(0,4),[[1,2,3,4,5],[6,7,8,9,10],[6,7,8,9,10],[11,12,13,14,15]]);
 assert.deepEqual(attempts.at(-1),[6,7,8,9,10]);
 assert.equal(result.successCount,15);assert.equal(result.failedCount,0);assert.equal(result.verified,true);
});

test('Numeric success counts without recipient tokens cannot hide a missing person',async()=>{
 const result=await generateCertificateBatches({ids:[1,2],templateName:'Semua',requestId:'missing',sleep:async()=>{},
  api:async(url)=>url.endsWith('generation-status')
   ? {verified:true,generatedTokens:[{studentId:1,token:'one'}]}
   : {successCount:2,failed:[],generatedTokens:[{studentId:1,token:'one'}]}});
 assert.equal(result.successCount,1);assert.equal(result.failedCount,1);assert.equal(result.failed[0].id,2);
});
