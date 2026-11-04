// Confirm every selected recipient. A failed chunk must not abandon later students.
export async function generateCertificateBatches({api,ids,templateName,issueDate,requestId,category,
  onProgress=()=>{},batchSize=5,verifyFinal=true,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))}) {
  ids=[...new Set(ids)];
  batchSize=Math.max(1,Math.min(25,Math.floor(batchSize)||5));
  const confirmed=new Map(),failures=new Map();
  let lastProgress=-1;
  let batchId=null;
  const report=()=>{if(confirmed.size!==lastProgress){lastProgress=confirmed.size;onProgress(lastProgress);}};
  const snapshot=(verified=false)=>{
    const failed=ids.filter(id=>!confirmed.has(id)).map(id=>failures.get(id)||{id,reason:'Simpanan belum dapat disahkan.',retryable:true});
    return {total:ids.length,successCount:confirmed.size,failedCount:failed.length,failed,
      generatedTokens:ids.filter(id=>confirmed.has(id)).map(id=>confirmed.get(id)),verified,...(batchId?{batchId}:{})};
  };
  async function generate(chunk) {
    let response;
    try {
      for(let attempt=0;attempt<2;attempt++){
        try {
          response=await api('/admin/templates/generate-batch',{method:'POST',
            body:{pesilat_ids:chunk,nama_template:templateName,tarikh_isu:issueDate,request_id:requestId,...(category?{kategori:category}:{})}});
          break;
        }catch(error){
          if(attempt===1 || (error.status>=400 && error.status<500 && error.status!==429))throw error;
        }
      }
      const allowed=new Set(chunk);
      if(response.batchId)batchId=response.batchId;
      for(const saved of response.generatedTokens||[]){
        if(allowed.has(saved.studentId) && typeof saved.token==='string' && saved.token){
          confirmed.set(saved.studentId,saved);failures.delete(saved.studentId);
        }
      }
      for(const failure of response.failed||[]){
        if(allowed.has(failure.id) && !confirmed.has(failure.id))failures.set(failure.id,failure);
      }
      for(const id of chunk)if(!confirmed.has(id) && !failures.has(id)){
        failures.set(id,{id,reason:'Respons janaan tidak mengesahkan simpanan pesilat ini.',retryable:true});
      }
    }catch(error){
      for(const id of chunk)if(!confirmed.has(id))failures.set(id,{id,
        reason:'Simpanan belum dapat disahkan: '+error.message,
        retryable:!(error.status>=400 && error.status<500 && error.status!==429)});
    }
    report();
  }
  async function process(pending){
    for(let offset=0;offset<pending.length;offset+=batchSize)await generate(pending.slice(offset,offset+batchSize));
  }
  await process(ids);
  for(const delay of [500,1500]){
    const retry=ids.filter(id=>!confirmed.has(id) && failures.get(id)?.retryable!==false);
    if(!retry.length)break;
    await sleep(delay);await process(retry);
  }
  if(verifyFinal && ids.length){
    const durable=new Map();
    try {
      for(let offset=0;offset<ids.length;offset+=500){
        let response;
        for(let attempt=0;attempt<3;attempt++){
          try {
            response=await api('/admin/templates/generation-status',{method:'POST',
              body:{pesilat_ids:ids.slice(offset,offset+500),request_id:requestId}});
            break;
          }catch(error){
            if(attempt===2 || (error.status>=400 && error.status<500 && error.status!==429))throw error;
            await sleep(500*(attempt+1));
          }
        }
        if(response.verified!==true)throw new Error('Pengesahan akhir pangkalan data tidak lengkap.');
        if(response.batchId)batchId=response.batchId;
        const allowed=new Set(ids.slice(offset,offset+500));
        for(const saved of response.generatedTokens||[])if(allowed.has(saved.studentId) && saved.token){
          durable.set(saved.studentId,{...confirmed.get(saved.studentId),...saved});
        }
      }
    }catch(error){error.result=snapshot(false);throw error;}
    confirmed.clear();for(const [id,saved] of durable){confirmed.set(id,saved);failures.delete(id);}
    report();
  }
  return snapshot(verifyFinal);
}
