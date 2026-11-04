import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {Inbox,RefreshCw,ArrowUpRight,Mail,Phone,Save} from 'lucide-react';
import {toast} from 'sonner';
import {api} from '../lib/api';
import {useLang} from '../lib/i18n';
import {useModalFocus} from '../lib/useModalFocus';
import {REPORT_CATEGORIES,REPORT_ROLES,REPORT_STATUSES,reportDate,reportLabel} from '../lib/supportTypes';
import {PageIntro,Panel,Button,Modal,Loading,Empty,SearchField,Chip,Pagination} from '../components/UI';

function StatusChip({status}){const{lang}=useLang();const meta=REPORT_STATUSES.find(option=>option.id===status);return <Chip color={meta?.color||'slate'}>{meta?.[lang]||status}</Chip>;}

function ReportDetail({id,onClose,onSaved}){
  const {lang}=useLang(),english=lang==='eng';
  const [record,setRecord]=useState(null),[status,setStatus]=useState('baru'),[notes,setNotes]=useState(''),[error,setError]=useState(''),[saving,setSaving]=useState(false),[loading,setLoading]=useState(true);
  const contentRef=useRef(null),requestRef=useRef(null),mounted=useRef(true),inFlight=useRef(false);
  const close=useCallback(()=>{if(!inFlight.current)onClose();},[onClose]);useModalFocus(contentRef,close);
  const load=useCallback(async()=>{
    requestRef.current?.abort();const controller=new AbortController();requestRef.current=controller;setLoading(true);
    try{const data=await api('/admin/reports/'+id,{cache:'no-store',signal:controller.signal});if(!controller.signal.aborted){setRecord(data);setStatus(data.status);setNotes(data.admin_notes);setError('');}}
    catch(failure){if(!controller.signal.aborted)setError(failure.message);}
    finally{if(!controller.signal.aborted)setLoading(false);}
  },[id]);
  useEffect(()=>{mounted.current=true;load();return()=>{mounted.current=false;requestRef.current?.abort();};},[load]);
  async function save(event){
    event.preventDefault();if(inFlight.current||!record)return;inFlight.current=true;setSaving(true);setError('');
    try{const saved=await api('/admin/reports/'+id,{method:'PUT',body:{status,admin_notes:notes,version:record.version}});if(mounted.current){setRecord(saved);toast.success(english?'Report updated.':'Laporan dikemas kini.');onSaved();}}
    catch(failure){if(mounted.current)setError(failure.message);}
    finally{inFlight.current=false;if(mounted.current)setSaving(false);}
  }
  return <Modal open wide onClose={close} closeDisabled={saving} title={english?'Enquiry / Report Details':'Butiran Pertanyaan / Laporan'}><div ref={contentRef}>
    {error&&<div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error} <button type="button" onClick={load} disabled={saving} className="font-bold underline">{english?'Reload Report':'Muat Semula Laporan'}</button></div>}
    {loading?<Loading/>:record&&<div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="break-all font-mono text-xs font-bold text-slate-700">{record.reference}</span><StatusChip status={record.status}/></div>
      <h3 className="break-words text-lg font-bold text-slate-950">{record.subject}</h3>
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-2">
        <p><strong className="block text-slate-900">{record.reporter_name}</strong>{reportLabel(REPORT_ROLES,record.reporter_role,lang)}</p>
        <p>{reportLabel(REPORT_CATEGORIES,record.category,lang)}<span className="mt-1 block">{reportDate(record.created_at,lang)}</span></p>
        {record.email&&<a href={'mailto:'+encodeURIComponent(record.email)+'?subject='+encodeURIComponent('Re: '+record.reference+' - '+record.subject)} className="inline-flex items-center gap-2 break-all font-semibold text-red-700"><Mail size={14} className="shrink-0"/>{record.email}</a>}
        {record.phone&&<a href={'tel:'+record.phone.replace(/[^+\d]/g,'')} className="inline-flex items-center gap-2 font-semibold text-red-700"><Phone size={14}/>{record.phone}</a>}
        {record.student_name&&<p><strong>{english?'Student: ':'Pesilat: '}</strong>{record.student_name}</p>}
        {record.branch&&<p><strong>{english?'Branch: ':'Cawangan: '}</strong>{record.branch}</p>}
      </div>
      <p className="whitespace-pre-wrap break-words rounded-xl border border-slate-200 p-4 text-xs leading-6 text-slate-700">{record.message}</p>
      <a href={record.page_path} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-start gap-1 text-xs font-semibold text-red-700"><span className="break-all">{english?'Reported page: ':'Halaman laporan: '}{record.page_path}</span><ArrowUpRight size={14} className="shrink-0"/></a>
      <form onSubmit={save} className="space-y-3 border-t border-slate-200 pt-4">
        <label className="block space-y-1 text-xs font-semibold text-slate-700"><span>{english?'Action status':'Status tindakan'}</span><select disabled={saving} value={status} onChange={event=>setStatus(event.target.value)} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900">{REPORT_STATUSES.map(option=><option key={option.id} value={option.id}>{option[lang]}</option>)}</select></label>
        <label className="block space-y-1 text-xs font-semibold text-slate-700"><span>{english?'Internal administrator notes':'Catatan dalaman pentadbir'}</span><textarea disabled={saving} rows={3} maxLength={4000} value={notes} onChange={event=>setNotes(event.target.value)} className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700"/></label>
        <p className="text-[11px] text-slate-500">{english?'Notes are visible to administrators only. Use the email or phone above to contact the sender.':'Catatan hanya dilihat oleh pentadbir. Gunakan emel atau telefon di atas untuk menghubungi pengirim.'}</p>
        {record.updated_by&&<p className="text-[11px] text-slate-500">{english?'Last updated by ':'Dikemas kini oleh '}{record.updated_by} · {reportDate(record.updated_at,lang)}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" disabled={saving} onClick={close}>{english?'Close':'Tutup'}</Button><Button type="submit" loading={saving}><Save size={14}/>{english?'Save Action':'Simpan Tindakan'}</Button></div>
      </form>
    </div>}
  </div></Modal>;
}

export function Reports(){
  const {lang}=useLang(),english=lang==='eng';
  const [data,setData]=useState(null),[status,setStatus]=useState(''),[query,setQuery]=useState(''),[page,setPage]=useState(1),[loading,setLoading]=useState(true),[error,setError]=useState(''),[selected,setSelected]=useState(null);
  const requestRef=useRef(null);
  const load=useCallback(async()=>{
    requestRef.current?.abort();const controller=new AbortController();requestRef.current=controller;setLoading(true);
    try{const result=await api('/admin/reports?'+new URLSearchParams({status,q:query,page:String(page)}),{cache:'no-store',signal:controller.signal});if(!controller.signal.aborted){setData(result);setError('');}}
    catch(failure){if(!controller.signal.aborted)setError(failure.message);}
    finally{if(!controller.signal.aborted)setLoading(false);}
  },[status,query,page]);
  useEffect(()=>{const timer=setTimeout(load,query?250:0);return()=>{clearTimeout(timer);requestRef.current?.abort();};},[load,query]);
  const close=useCallback(()=>setSelected(null),[]);
  return <>
    <PageIntro eyebrow={english?'PUBLIC SUPPORT':'SOKONGAN PORTAL AWAM'} title={english?'Enquiries & Reports':'Pertanyaan & Laporan'} desc={english?'Review messages from parents and students, and record follow-up actions.':'Semak mesej ibu bapa dan pesilat, serta rekod tindakan susulan.'} action={<Button type="button" variant="secondary" onClick={load} loading={loading}><RefreshCw size={14}/>{english?'Refresh':'Muat Semula'}</Button>}/>
    <div className="mb-4 flex flex-wrap gap-2">
      {[{id:'',bm:'Semua',eng:'All'},...REPORT_STATUSES].map(option=><button key={option.id} type="button" aria-pressed={status===option.id} onClick={()=>{setStatus(option.id);setPage(1);}} className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-bold ${status===option.id?'border-red-700 bg-red-700 text-white':'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>{option[lang]} <span className="ml-1 tabular-nums">{data?.counts?.[option.id||'semua']??'—'}</span></button>)}
    </div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><SearchField value={query} onChange={value=>{setQuery(value);setPage(1);}} placeholder={english?'Search reference, sender or subject...':'Cari rujukan, pengirim atau tajuk...'}/><Link to="/admin/tetapan" className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">{english?'Edit public contacts':'Tetapkan hubungan rasmi'}<ArrowUpRight size={14}/></Link></div>
    {error&&<p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</p>}
    <Panel>
      {loading?<Loading/>:data?.rows.length?<div className="divide-y divide-slate-200">{data.rows.map(report=><button key={report.id} type="button" onClick={()=>setSelected(report.id)} className="flex w-full items-start justify-between gap-3 p-4 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-inset">
        <span className="min-w-0 flex-1"><span className="block break-all font-mono text-[11px] text-slate-500">{report.reference}</span><span className="mt-1 block break-words text-sm font-bold text-slate-950">{report.subject}</span><span className="mt-1 block text-xs text-slate-600">{report.reporter_name} · {reportLabel(REPORT_CATEGORIES,report.category,lang)}</span><span className="mt-1 block text-[11px] text-slate-500">{reportDate(report.created_at,lang)}</span></span>
        <span className="flex shrink-0 flex-col items-end gap-2"><StatusChip status={report.status}/><ArrowUpRight size={16} className="text-slate-400"/></span>
      </button>)}</div>:!error&&<Empty icon={Inbox} title={english?'No messages found':'Tiada mesej ditemui'} message={english?'Messages submitted through the public form will appear here.':'Mesej yang dihantar melalui borang portal awam akan dipaparkan di sini.'}/>}
      {data&&<Pagination page={page} pages={data.pages} onChange={setPage}/>}
    </Panel>
    {selected&&<ReportDetail id={selected} onClose={close} onSaved={load}/>}
  </>;
}
