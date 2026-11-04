import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {Outlet,useLocation} from 'react-router-dom';
import {Flag,MessageCircle,Phone,Mail,ArrowUpRight,Send,CheckCircle2,Copy} from 'lucide-react';
import {toast} from 'sonner';
import {api} from '../lib/api';
import {useLang} from '../lib/i18n';
import {useModalFocus} from '../lib/useModalFocus';
import {REPORT_CATEGORIES,REPORT_ROLES} from '../lib/supportTypes';
import {Button,Input,Modal} from './UI';

const SupportContext=createContext(null);

export function PublicSupportLayout(){
  const {pathname}=useLocation();
  const {lang}=useLang();
  const [contact,setContact]=useState(null),[contactError,setContactError]=useState(''),[dialog,setDialog]=useState(null);
  const requestRef=useRef(null);
  const loadContacts=useCallback(async()=>{
    requestRef.current?.abort();const controller=new AbortController();requestRef.current=controller;
    try{const data=await api('/public/contact',{cache:'no-store',signal:controller.signal});if(!controller.signal.aborted){setContact(data);setContactError('');}}
    catch(error){if(!controller.signal.aborted)setContactError(error.message);}
  },[]);
  useEffect(()=>{loadContacts();return()=>requestRef.current?.abort();},[loadContacts]);
  const openForm=useCallback((category='teknikal')=>setDialog({category,page_path:pathname}),[pathname]);
  const closeForm=useCallback(()=>setDialog(null),[]);
  const value=useMemo(()=>({contact,contactError,loadContacts,openForm}),[contact,contactError,loadContacts,openForm]);
  return <SupportContext.Provider value={value}>
    <Outlet/>
    <button type="button" onClick={()=>openForm('teknikal')} aria-label={lang==='eng'?'Report a portal issue':'Lapor masalah portal'}
      className="fixed bottom-4 right-4 z-40 inline-flex min-h-11 max-w-[calc(100vw-32px)] items-center gap-2 rounded-full bg-red-700 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-red-900/20 transition hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2">
      <Flag size={16}/>{lang==='eng'?'Report an Issue':'Lapor Masalah'}
    </button>
    {dialog&&<ReportForm initial={dialog} onClose={closeForm}/>}
  </SupportContext.Provider>;
}

export function ContactSection(){
  const {lang}=useLang(),english=lang==='eng';
  const {contact,contactError,loadContacts,openForm}=useContext(SupportContext);
  return <section id="hubungi" aria-labelledby="contact-heading" className="mx-auto max-w-7xl scroll-mt-8 px-4 pb-16 pt-4 sm:px-8 lg:px-12">
    <div className="grid gap-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-apple sm:p-8 lg:grid-cols-2 lg:gap-12">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-red-700">{english?'WE ARE HERE TO HELP':'KAMI SEDIA MEMBANTU'}</p>
        <h2 id="contact-heading" className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">{english?'Contact Us':'Hubungi Kami'}</h2>
        <p className="mt-3 text-xs leading-6 text-slate-600">{english?'Parents and students can contact the academy about certificate records, corrections or problems with this portal.':'Ibu bapa dan pesilat boleh menghubungi pihak akademi tentang rekod sijil, pembetulan maklumat atau masalah portal.'}</p>
        <div className="mt-5 space-y-3">
          {contact?.contacts?.map(person=><div key={person.name+person.phone} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-red-700"><MessageCircle size={20}/></div>
            <a href={'https://wa.me/'+person.whatsapp} target="_blank" rel="noopener noreferrer" aria-label={'WhatsApp '+person.name} className="min-w-0 flex-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700">
              <span className="block text-sm font-bold text-slate-900">{person.name}</span><span className="mt-0.5 block text-xs text-slate-600">{person.phone}</span>
              <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-red-700">WhatsApp<ArrowUpRight size={12}/></span>
            </a>
            <a href={'tel:+'+person.whatsapp} aria-label={(english?'Call ':'Telefon ')+person.name} className="rounded-lg border border-slate-200 bg-white p-3 text-slate-700 hover:bg-red-50"><Phone size={16}/></a>
          </div>)}
          {contact?.email&&<a href={'mailto:'+encodeURIComponent(contact.email)} className="flex items-center gap-2 break-all rounded-xl border border-slate-200 p-3 text-xs font-semibold text-red-700"><Mail size={16} className="shrink-0"/>{contact.email}</a>}
          {!contact&&!contactError&&<p role="status" className="text-xs text-slate-500">{english?'Loading contact details…':'Memuatkan butiran hubungan…'}</p>}
          {contactError&&<p className="text-xs text-slate-500">{english?'Contact details could not be loaded. You can still use the form.':'Butiran hubungan tidak dapat dimuatkan. Anda masih boleh menggunakan borang.'} <button type="button" onClick={loadContacts} className="font-bold text-red-700 underline">{english?'Retry':'Cuba lagi'}</button></p>}
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
          <MessageCircle size={22} className="text-red-700"/><h3 className="mt-3 text-base font-bold text-slate-950">{english?'Have a question?':'Ada pertanyaan?'}</h3>
          <p className="mt-2 text-xs leading-6 text-slate-600">{english?'Send a message to the administrator. Include your contact details so the academy can follow up.':'Hantar pertanyaan kepada pentadbir. Sertakan maklumat hubungan supaya pihak akademi boleh membuat susulan.'}</p>
          <Button type="button" onClick={()=>openForm('pertanyaan')} className="mt-4"><Send size={14}/>{english?'Send an Enquiry':'Hantar Pertanyaan'}</Button>
        </div>
        <div className="rounded-2xl border border-slate-200 p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-950"><Flag size={18} className="text-red-700"/>{english?'Something is not working?':'Ada sesuatu yang tidak kena?'}</h3>
          <p className="mt-2 text-xs leading-6 text-slate-600">{english?'Report a bug, missing certificate or incorrect information. A reference number is provided after your report is saved.':'Laporkan bug, sijil tidak ditemui atau maklumat yang salah. Nombor rujukan diberikan selepas laporan berjaya disimpan.'}</p>
          <Button type="button" variant="secondary" onClick={()=>openForm('teknikal')} className="mt-3">{english?'Report an Issue':'Lapor Masalah'}<ArrowUpRight size={14}/></Button>
        </div>
      </div>
    </div>
  </section>;
}

function ReportForm({initial,onClose}){
  const {lang}=useLang(),english=lang==='eng';
  const [form,setForm]=useState({category:initial.category,reporter_name:'',reporter_role:'ibu_bapa',email:'',phone:'',student_name:'',branch:'',subject:'',message:'',website:''});
  const [saving,setSaving]=useState(false),[error,setError]=useState(''),[receipt,setReceipt]=useState(null);
  const contentRef=useRef(null),receiptRef=useRef(null),submission=useRef(null),inFlight=useRef(false),mounted=useRef(true);
  const close=useCallback(()=>{if(!inFlight.current)onClose();},[onClose]);
  useModalFocus(contentRef,close);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{if(receipt)receiptRef.current?.focus();},[receipt]);
  const patch=(key,value)=>setForm(previous=>({...previous,[key]:value}));
  async function submit(event){
    event.preventDefault();if(inFlight.current)return;
    if(!form.email.trim()&&!form.phone.trim()){setError(english?'Enter an email address or phone number.':'Sila isi emel atau nombor telefon untuk dihubungi.');return;}
    const payload={...form,page_path:initial.page_path},signature=JSON.stringify(payload);
    if(submission.current?.signature!==signature)submission.current={signature,id:crypto.randomUUID()};
    inFlight.current=true;setSaving(true);setError('');
    try{
      const data=await api('/public/reports',{method:'POST',body:{...payload,request_id:submission.current.id}});
      if(!data?.reference||typeof data.reference!=='string')throw new Error(english?'Report storage has not been confirmed. Please retry.':'Simpanan laporan belum dapat disahkan. Sila cuba lagi.');
      if(mounted.current)setReceipt(data);
    }catch(failure){if(mounted.current)setError(failure.message);}
    finally{inFlight.current=false;if(mounted.current)setSaving(false);}
  }
  async function copyReference(){try{await navigator.clipboard.writeText(receipt.reference);toast.success(english?'Reference copied.':'Nombor rujukan disalin.');}catch{toast.error(english?'Please copy the reference shown.':'Sila salin nombor rujukan yang dipaparkan.');}}
  return <Modal open wide onClose={close} closeDisabled={saving} title={english?'Contact & Report Form':'Borang Pertanyaan & Laporan'}>
    <div ref={contentRef}>
      {receipt?<div ref={receiptRef} tabIndex={-1} role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center outline-none">
        <CheckCircle2 size={38} className="mx-auto text-emerald-700"/><h3 className="mt-3 text-lg font-bold text-slate-950">{english?'Message Received':'Mesej Berjaya Diterima'}</h3>
        <p className="mt-2 text-xs leading-6 text-slate-600">{english?'Your message has been saved for the administrator. Keep this reference for follow-up.':'Mesej anda telah disimpan untuk semakan pentadbir. Simpan nombor rujukan ini untuk urusan susulan.'}</p>
        <p className="my-4 break-all rounded-lg border border-emerald-200 bg-white p-3 font-mono text-sm font-bold text-slate-900">{receipt.reference}</p>
        <div className="flex flex-wrap justify-center gap-2"><Button type="button" variant="secondary" onClick={copyReference}><Copy size={14}/>{english?'Copy Reference':'Salin Rujukan'}</Button><Button type="button" onClick={onClose}>{english?'Done':'Selesai'}</Button></div>
      </div>:<form onSubmit={submit} className="space-y-4">
        <p className="text-xs leading-6 text-slate-600">{english?'Tell us what happened and how the academy can contact you. No account is required.':'Terangkan pertanyaan atau masalah anda dan cara pihak akademi boleh menghubungi anda. Tiada akaun diperlukan.'}</p>
        <fieldset disabled={saving} className="space-y-4 disabled:opacity-70">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={english?'Your name *':'Nama pengirim *'} name="name" autoComplete="name" required minLength={2} maxLength={120} value={form.reporter_name} onChange={event=>patch('reporter_name',event.target.value)}/>
            <label className="block space-y-1 text-xs font-semibold text-slate-700"><span>{english?'Your role *':'Peranan *'}</span><select required value={form.reporter_role} onChange={event=>patch('reporter_role',event.target.value)} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900">{REPORT_ROLES.map(role=><option key={role.id} value={role.id}>{role[lang]}</option>)}</select></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={english?'Email':'Emel'} name="email" type="email" autoComplete="email" maxLength={254} value={form.email} onChange={event=>patch('email',event.target.value)}/>
            <Input label={english?'Phone / WhatsApp':'Telefon / WhatsApp'} name="tel" type="tel" autoComplete="tel" maxLength={40} value={form.phone} onChange={event=>patch('phone',event.target.value)}/>
          </div>
          <p className="text-[11px] text-slate-500">{english?'Provide at least one: email or phone number.':'Isi sekurang-kurangnya satu: emel atau nombor telefon.'}</p>
          <label className="block space-y-1 text-xs font-semibold text-slate-700"><span>{english?'Category *':'Kategori *'}</span><select required value={form.category} onChange={event=>patch('category',event.target.value)} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900">{REPORT_CATEGORIES.map(category=><option key={category.id} value={category.id}>{category[lang]}</option>)}</select></label>
          <Input label={english?'Subject *':'Tajuk *'} required minLength={3} maxLength={160} value={form.subject} onChange={event=>patch('subject',event.target.value)}/>
          <label className="block space-y-1 text-xs font-semibold text-slate-700"><span>{english?'Message / issue details *':'Mesej / butiran masalah *'}</span><textarea required minLength={10} maxLength={4000} rows={4} value={form.message} onChange={event=>patch('message',event.target.value)} placeholder={english?'Describe the steps you took and any error message.':'Terangkan langkah yang dibuat dan mesej ralat yang muncul.'} className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs leading-relaxed text-slate-900 outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"/></label>
          <details className="rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer text-xs font-semibold text-slate-700">{english?'Student details (optional)':'Maklumat pesilat (pilihan)'}</summary><div className="mt-3 grid gap-3 sm:grid-cols-2"><Input label={english?'Student name':'Nama pesilat'} maxLength={160} value={form.student_name} onChange={event=>patch('student_name',event.target.value)}/><Input label={english?'Branch':'Cawangan'} maxLength={160} value={form.branch} onChange={event=>patch('branch',event.target.value)}/></div></details>
          <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden"><label>Website<input tabIndex={-1} autoComplete="off" name="website" value={form.website} onChange={event=>patch('website',event.target.value)}/></label></div>
          <p className="text-[11px] leading-5 text-slate-500">{english?'Your contact details are used by the administrator to follow up on this message.':'Maklumat hubungan digunakan oleh pentadbir untuk membuat susulan mesej ini.'}</p>
        </fieldset>
        {error&&<p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3"><Button type="button" variant="secondary" disabled={saving} onClick={close}>{english?'Cancel':'Batal'}</Button><Button type="submit" loading={saving}><Send size={14}/>{english?'Send Message':'Hantar Mesej'}</Button></div>
      </form>}
    </div>
  </Modal>;
}
