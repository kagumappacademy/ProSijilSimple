import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {Building2,Plus,Edit3,Users,ArrowUpRight,RefreshCw} from 'lucide-react';
import {toast} from 'sonner';
import {api} from '../lib/api';
import {useLang} from '../lib/i18n';
import {PageIntro,Panel,Button,Input,Modal,Loading,Empty,SearchField,Chip} from '../components/UI';

function BranchEditor({branch,onClose,onSaved}){
 const {t}=useLang();
 const [name,setName]=useState(branch.nama_cawangan||'');
 const [description,setDescription]=useState(branch.keterangan||'');
 const [saving,setSaving]=useState(false);
 async function submit(event){
  event.preventDefault();if(saving)return;
  setSaving(true);
  try{
   await api('/admin/branches'+(branch.id?'/'+branch.id:''),{method:branch.id?'PUT':'POST',
    body:{nama_cawangan:name,keterangan:description}});
   toast.success(t(branch.id?'branchUpdated':'branchAdded'));
   onSaved();onClose();
  }catch(error){toast.error(error.message);}
  finally{setSaving(false);}
 }
 return <Modal open onClose={()=>{if(!saving)onClose();}} title={t(branch.id?'branchEditTitle':'btnAddBranch')}>
  <form onSubmit={submit} className="space-y-4">
   <Input label={t('branchName')+' *'} required autoFocus minLength={2} maxLength={160}
    value={name} onChange={event=>setName(event.target.value)} placeholder="Contoh: Skudai" />
   <label className="block space-y-1">
    <span className="block text-xs font-semibold text-slate-700">{t('branchDescription')}</span>
    <textarea rows={3} maxLength={500} value={description} onChange={event=>setDescription(event.target.value)}
     className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900" />
   </label>
   {branch.id&&<p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{t('branchRenamingNote')}</p>}
   <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
    <Button type="button" variant="secondary" disabled={saving} onClick={onClose}>{t('btnCancel')}</Button>
    <Button type="submit" loading={saving}>{t('btnSave')}</Button>
   </div>
  </form>
 </Modal>;
}

function BranchActions({branch,onEdit}){
 const {t}=useLang();
 return <div className="flex flex-wrap justify-end gap-2 whitespace-nowrap">
  <Button variant="secondary" onClick={()=>onEdit(branch)} aria-label={t('branchEditTitle')+' '+branch.nama_cawangan}><Edit3 size={13}/>{t('btnEdit')}</Button>
  <Link to={'/admin/pesilat?'+new URLSearchParams({branch:branch.nama_cawangan})}
   className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-100">
   {t('branchStudents')}<ArrowUpRight size={14}/>
  </Link>
 </div>;
}

export function Branches(){
 const {t,lang}=useLang();
 const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false);
 const [error,setError]=useState(''),[query,setQuery]=useState(''),[editor,setEditor]=useState(null);
 const requestVersion=useRef(0);
 const load=useCallback(async()=>{
  const version=++requestVersion.current;
  setRefreshing(true);
  try{const data=await api('/admin/branches');if(version===requestVersion.current){setRows(data.rows);setError('');}}
  catch(failure){if(version===requestVersion.current)setError(failure.message);}
  finally{if(version===requestVersion.current){setLoading(false);setRefreshing(false);}}
 },[]);
 useEffect(()=>{load();return()=>{requestVersion.current++;};},[load]);
 const filtered=useMemo(()=>{
  const q=query.trim().toLocaleLowerCase();
  return rows.filter(row=>(row.nama_cawangan+' '+row.keterangan).toLocaleLowerCase().includes(q));
 },[rows,query]);
 const totalStudents=rows.reduce((sum,row)=>sum+Number(row.pesilat_count),0);
 return <>
  <PageIntro eyebrow={t('branchesEyebrow')} title={t('branchesTitle')} desc={t('branchesDesc')}
   action={<><Button variant="secondary" onClick={load} loading={refreshing}><RefreshCw size={14}/>{lang==='eng'?'Refresh':'Muat Semula'}</Button>
    <Button onClick={()=>setEditor({})}><Plus size={15}/>{t('btnAddBranch')}</Button></>} />
  <div className="mb-5 grid grid-cols-2 gap-3">
   <Panel className="flex items-center gap-3 p-4"><Building2 className="text-red-700" size={23}/><div>
    <div className="text-xl font-bold text-slate-950">{rows.length}</div><div className="text-xs text-slate-500">{t('statBranches')}</div>
   </div></Panel>
   <Panel className="flex items-center gap-3 p-4"><Users className="text-slate-500" size={23}/><div>
    <div className="text-xl font-bold text-slate-950">{totalStudents}</div><div className="text-xs text-slate-500">{t('statStudents')}</div>
   </div></Panel>
  </div>
  {error&&<div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
  <Panel>
   <div className="border-b border-slate-100 p-4"><SearchField value={query} onChange={setQuery} placeholder={t('branchSearch')}/></div>
   {loading?<Loading/>:filtered.length?<>
    <div className="divide-y divide-slate-100 sm:hidden">{filtered.map(row=><article key={row.id} aria-label={row.nama_cawangan} className="space-y-3 p-4">
     <div><h3 className="break-words text-sm font-bold text-slate-900">{row.nama_cawangan}</h3>
      {row.keterangan&&<p className="mt-1 whitespace-pre-wrap break-words text-xs text-slate-500">{row.keterangan}</p>}</div>
     <div className="flex gap-2"><Chip color="slate">{row.pesilat_count} {t('studentsCountLabel')}</Chip><Chip color="slate">{row.sijil_count} {t('certsCountLabel')}</Chip></div>
     <BranchActions branch={row} onEdit={setEditor}/>
    </article>)}</div>
    <div className="hidden overflow-x-auto sm:block">
    <table className="w-full text-left text-xs sm:text-sm">
     <thead className="bg-slate-50 text-xs text-slate-500"><tr>
      <th scope="col" className="px-4 py-3">{t('branchName')}</th>
      <th scope="col" className="px-4 py-3 text-center">{t('studentsCountLabel')}</th>
      <th scope="col" className="px-4 py-3 text-center">{t('certsCountLabel')}</th>
      <th scope="col" className="px-4 py-3 text-right">{t('thActions')}</th>
     </tr></thead>
     <tbody className="divide-y divide-slate-100">{filtered.map(row=><tr key={row.id} className="hover:bg-slate-50/60">
      <td className="px-4 py-4"><div className="font-bold text-slate-900">{row.nama_cawangan}</div>
       {row.keterangan&&<p className="mt-1 max-w-md whitespace-pre-wrap text-xs text-slate-500">{row.keterangan}</p>}</td>
      <td className="px-4 py-4 text-center"><Chip color="slate">{row.pesilat_count}</Chip></td>
      <td className="px-4 py-4 text-center">{row.sijil_count}</td>
      <td className="px-4 py-4"><BranchActions branch={row} onEdit={setEditor}/></td>
     </tr>)}</tbody>
    </table>
   </div></>:<Empty icon={Building2} title={query?(lang==='eng'?'No matching branches':'Tiada cawangan sepadan'):t('branchEmpty')} message={t('branchEmptyDesc')}/>}
  </Panel>
  {editor&&<BranchEditor branch={editor} onClose={()=>setEditor(null)} onSaved={load}/>}
 </>;
}
