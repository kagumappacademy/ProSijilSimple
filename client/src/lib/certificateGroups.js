import {CERT_CATEGORIES,getCertCategory,sortTemplatesList} from './certTypes.js';

export const collectionKey=(category,name)=>JSON.stringify([category,String(name||'').trim()]);
export const templateCollectionKey=row=>collectionKey(getCertCategory(row),row.nama_template);
export const certificateTemplateName=row=>row.template_name||row.nama_sijil||'Tanpa nama';
export const certificateCollectionKey=row=>collectionKey(getCertCategory(row),certificateTemplateName(row));
export const certificateBatchKey=row=>row.batch_id?'batch:'+row.batch_id:'unbatched:'+JSON.stringify([getCertCategory(row),certificateTemplateName(row),row.tarikh_isu||'',row.jenis||'']);

export function templateCollections(rows,sort='peringkat'){
  const groups=new Map();
  for(const row of rows){const key=templateCollectionKey(row);if(!groups.has(key))groups.set(key,{key,name:row.nama_template,category:getCertCategory(row),rows:[]});groups.get(key).rows.push(row);}
  const ordered=[...groups.values()].sort((first,second)=>sort==='terkini'
    ?Math.max(...second.rows.map(row=>Number(row.id)))-Math.max(...first.rows.map(row=>Number(row.id)))
    :CERT_CATEGORIES.findIndex(category=>category.id===first.category)-CERT_CATEGORIES.findIndex(category=>category.id===second.category)||first.name.localeCompare(second.name));
  for(const group of ordered)group.rows=sort==='terkini'?[...group.rows].sort((a,b)=>Number(b.id)-Number(a.id)):sortTemplatesList(group.rows);
  return ordered;
}

export function certificateCollections(rows){
  const groups=new Map();
  for(const row of rows){const key=certificateCollectionKey(row);if(!groups.has(key))groups.set(key,{key,name:certificateTemplateName(row),category:getCertCategory(row),rows:[]});groups.get(key).rows.push(row);}
  return [...groups.values()].sort((a,b)=>CERT_CATEGORIES.findIndex(category=>category.id===a.category)-CERT_CATEGORIES.findIndex(category=>category.id===b.category)||a.name.localeCompare(b.name));
}

export function certificateBatches(rows){
  const groups=new Map();
  for(const row of rows){const key=certificateBatchKey(row);if(!groups.has(key))groups.set(key,{key,id:row.batch_id||null,issueDate:row.tarikh_isu,createdAt:row.created_at,rows:[]});const batch=groups.get(key);batch.rows.push(row);if(row.created_at&&(!batch.createdAt||row.created_at<batch.createdAt))batch.createdAt=row.created_at;}
  return [...groups.values()].sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')||a.key.localeCompare(b.key));
}
