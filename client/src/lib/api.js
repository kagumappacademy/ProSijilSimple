export async function api(url,{body,...options}={}) {
 const isForm=body instanceof FormData;
 let response;
 try{
  response=await fetch('/api'+url,{credentials:'same-origin',...options,headers:{...(isForm?{}:{...(body?{'Content-Type':'application/json'}:{})}),...options.headers},body:isForm?body:body?JSON.stringify(body):undefined});
 }catch{throw new Error('Tidak dapat menghubungi pelayan. Pastikan API sedang berjalan.');}
 const type=response.headers.get('content-type')||'';
 const data=type.includes('json')?await response.json():await response.text();
 if(!response.ok)throw new Error(data?.error||'Permintaan gagal.');
 return data;
}
export const fmtDate=(s)=>{
 if(!s)return '—';
 try{return new Date(s+'T00:00:00').toLocaleDateString('ms-MY',{day:'numeric',month:'short',year:'numeric'});}catch{return s;}
};
export const certDownload=token=>`/api/public/certificates/${encodeURIComponent(token)}/download`;
export const certPreview=token=>certDownload(token)+'?preview=1';
