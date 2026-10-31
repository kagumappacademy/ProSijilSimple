export async function api(url,{body,...options}={}) {
 const isForm=body instanceof FormData;
 let response;
 try{
  response=await fetch('/api'+url,{credentials:'same-origin',...options,headers:{...(isForm?{}:{...(body?{'Content-Type':'application/json'}:{})}),...options.headers},body:isForm?body:body?JSON.stringify(body):undefined});
 }catch{throw new Error('Tidak dapat menghubungi pelayan. Pastikan API sedang berjalan.');}
 const type=response.headers.get('content-type')||'';
 const data=type.includes('json')?await response.json():await response.text();
 if(!response.ok) {
  let errorMsg = '';
  if (typeof data === 'object' && data?.error) {
    errorMsg = data.error;
  } else if (typeof data === 'string' && data.trim()) {
    const clean = data.trim();
    if (clean.includes('FUNCTION_PAYLOAD_TOO_LARGE') || response.status === 413) {
      errorMsg = 'Saiz fail templat melebihi had pelayan (Maksima 4MB). Sila gunakan fail PDF yang lebih kecil.';
    } else if (response.status === 504 || clean.includes('GATEWAY_TIMEOUT')) {
      errorMsg = 'Sambungan ke pelayan tamat masa. Sila cuba sebentar lagi.';
    } else if (!clean.startsWith('<')) {
      errorMsg = clean;
    } else {
      errorMsg = `Ralat pelayan (${response.status}: ${response.statusText || 'Ralat'}).`;
    }
  } else {
    errorMsg = `Permintaan gagal (${response.status}).`;
  }
  const error = new Error(errorMsg);
  error.status = response.status;
  throw error;
 }
 return data;
}
export const fmtDate=(s)=>{
 if(!s)return '—';
 try{return new Date(s+'T00:00:00').toLocaleDateString('ms-MY',{day:'numeric',month:'short',year:'numeric'});}catch{return s;}
};
export const certDownload=token=>`/api/public/certificates/${encodeURIComponent(token)}/download`;
export const certPreview=token=>certDownload(token)+'?preview=1';
