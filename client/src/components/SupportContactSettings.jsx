import React,{useEffect,useRef,useState} from 'react';
import {MessageCircle,Plus,Trash2} from 'lucide-react';
import {toast} from 'sonner';
import {api} from '../lib/api';
import {useLang} from '../lib/i18n';
import {Button,Input,Panel,Loading} from './UI';

export function SupportContactSettings(){
  const {lang}=useLang(),english=lang==='eng';
  const [email,setEmail]=useState(''),[contacts,setContacts]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[saving,setSaving]=useState(false);
  const [ready,setReady]=useState(false);
  const mounted=useRef(true),requestRef=useRef(null);
  async function load(){
    requestRef.current?.abort();const controller=new AbortController();requestRef.current=controller;setLoading(true);
    try{const data=await api('/admin/support-contact',{cache:'no-store',signal:controller.signal});if(!controller.signal.aborted){setEmail(data.email);setContacts(data.contacts);setReady(true);setError('');}}
    catch(failure){if(!controller.signal.aborted)setError(failure.message);}
    finally{if(!controller.signal.aborted)setLoading(false);}
  }
  useEffect(()=>{mounted.current=true;load();return()=>{mounted.current=false;requestRef.current?.abort();};},[]);
  const patch=(index,key,value)=>setContacts(previous=>previous.map((person,position)=>position===index?{...person,[key]:value}:person));
  async function submit(event){
    event.preventDefault();if(saving)return;setSaving(true);setError('');
    try{const data=await api('/admin/support-contact',{method:'PUT',body:{email,contacts}});if(mounted.current){setEmail(data.email);setContacts(data.contacts);toast.success(english?'Public contact details saved.':'Butiran hubungan portal awam disimpan.');}}
    catch(failure){if(mounted.current)setError(failure.message);}
    finally{if(mounted.current)setSaving(false);}
  }
  return <Panel className="p-5 sm:p-6">
    <h2 className="flex items-center gap-2 text-sm font-bold text-slate-950"><MessageCircle size={20} className="text-red-700"/>{english?'Public Contact Details':'Hubungan Portal Awam'}</h2>
    <p className="mt-2 text-xs leading-6 text-slate-500">{english?'These contacts are displayed in Contact Us. Parents and students can also send reports to the administrator inbox.':'Butiran ini dipaparkan dalam Hubungi Kami. Ibu bapa dan pesilat juga boleh menghantar laporan ke peti masuk pentadbir.'}</p>
    {error&&<p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error} <button type="button" onClick={load} disabled={saving} className="font-bold underline">{english?'Reload':'Muat semula'}</button></p>}
    {loading?<Loading size="sm"/>:ready&&<form onSubmit={submit} className="mt-4 space-y-4">
      <fieldset disabled={saving} className="space-y-4">
        {contacts.map((person,index)=><div key={index} className="space-y-3 rounded-xl border border-slate-200 p-3">
          <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-700">{english?'Contact':'Pegawai'} {index+1}</span><button type="button" onClick={()=>setContacts(previous=>previous.filter((_,position)=>position!==index))} aria-label={(english?'Remove contact ':'Buang pegawai ')+(index+1)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-800"><Trash2 size={15}/></button></div>
          <Input label={(english?'Contact name ':'Nama pegawai ')+(index+1)} required minLength={2} maxLength={80} value={person.name} onChange={event=>patch(index,'name',event.target.value)}/>
          <Input label={(english?'WhatsApp number ':'Nombor WhatsApp ')+(index+1)} required type="tel" maxLength={40} value={person.phone} onChange={event=>patch(index,'phone',event.target.value)}/>
        </div>)}
        <Button type="button" variant="secondary" disabled={contacts.length>=5} onClick={()=>setContacts(previous=>[...previous,{name:'',phone:''}])}><Plus size={14}/>{english?'Add Contact':'Tambah Pegawai'}</Button>
        <Input label={english?'Official email (optional)':'Emel rasmi (pilihan)'} type="email" maxLength={254} value={email} onChange={event=>setEmail(event.target.value)}/>
      </fieldset>
      <Button type="submit" loading={saving}>{english?'Save Contact Details':'Simpan Butiran Hubungan'}</Button>
    </form>}
  </Panel>;
}
