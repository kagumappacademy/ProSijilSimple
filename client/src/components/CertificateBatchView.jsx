import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ChevronDown,Eye,Download,Trash2,Layers} from 'lucide-react';
import {useLang} from '../lib/i18n';
import {certificateBatches,certificateCollections,certificateBatchKey} from '../lib/certificateGroups';
import {getCategoryMeta} from '../lib/certTypes';
import {certDownload,certPreview,fmtDate} from '../lib/api';
import {reportDate} from '../lib/supportTypes';

function BatchSection({batch,allRows,selectedIds,onToggleRows,onToggle,onDelete}){
  const {lang}=useLang(),english=lang==='eng';
  const [expanded,setExpanded]=useState(false),checkbox=useRef(null);
  const selected=allRows.filter(row=>selectedIds.has(row.id)).length,all=selected===allRows.length;
  useEffect(()=>{if(checkbox.current)checkbox.current.indeterminate=selected>0&&!all;},[selected,all]);
  const title=batch.id?(english?'Generation Batch ':'Batch Janaan ')+batch.id.slice(0,10).toUpperCase():(english?'Records without a batch ID':'Rekod tanpa ID batch');
  return <section aria-label={title} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <div className="flex items-start gap-3 bg-slate-50 p-3 sm:p-4">
      <input ref={checkbox} type="checkbox" checked={all} onChange={()=>onToggleRows(allRows)} aria-label={(english?'Select entire batch ':'Pilih seluruh batch ')+title+' ('+allRows.length+')'} className="mt-1 h-5 w-5 shrink-0 accent-red-700"/>
      <button type="button" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)} className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left">
        <span className="min-w-0"><span className="block break-words text-xs font-bold text-slate-950 sm:text-sm">{title}</span><span className="mt-1 block text-[11px] leading-5 text-slate-600">{english?'Issue date: ':'Tarikh sijil: '}{fmtDate(batch.issueDate)} · {english?'Created: ':'Dijana / dimuat naik: '}{reportDate(batch.createdAt,lang)}</span><span className="mt-1 block text-xs font-semibold text-slate-700">{selected}/{allRows.length} {english?'certificates selected':'sijil dipilih'}{batch.rows.length!==allRows.length&&` · ${batch.rows.length} ${english?'visible':'dipaparkan'}`}</span></span>
        <ChevronDown size={17} className={`mt-1 shrink-0 text-slate-500 transition-transform ${expanded?'rotate-180':''}`}/>
      </button>
    </div>
    {batch.rows.length!==allRows.length&&<p className="border-t border-slate-200 px-4 py-2 text-[11px] text-slate-600">{english?'The batch checkbox includes every certificate in this batch, including records outside the current filters.':'Checkbox batch memilih semua sijil batch ini, termasuk rekod di luar tapisan semasa.'}</p>}
    {!batch.id&&<p className="border-t border-slate-200 px-4 py-2 text-[11px] text-slate-500">{english?'Original batch information was not recorded. These records are grouped by title and issue date.':'Batch asal tidak direkodkan. Rekod ini dikumpulkan mengikut tajuk dan tarikh sijil.'}</p>}
    {expanded&&<div className="grid gap-3 border-t border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-3">{batch.rows.map(row=><div key={row.id} className={`min-w-0 space-y-2 rounded-xl border p-3 ${selectedIds.has(row.id)?'border-red-300 bg-red-50':'border-slate-200 bg-white'}`}>
      <label className="flex items-start gap-2"><input type="checkbox" checked={selectedIds.has(row.id)} onChange={()=>onToggle(row.id)} aria-label={(english?'Select certificate ':'Pilih sijil ')+row.nama_penuh+' '+row.id} className="mt-0.5 h-4 w-4 shrink-0 accent-red-700"/><span className="min-w-0 break-words text-xs font-bold text-slate-950">{row.nama_penuh}</span></label>
      <p className="break-words text-[11px] text-slate-600">{row.no_kp_atau_id} · {row.cawangan}</p><p className="break-words text-[11px] text-slate-600">{row.peringkat}</p>
      <div className="flex justify-end gap-2 border-t border-slate-200 pt-2"><a href={certPreview(row.public_token)} target="_blank" rel="noopener noreferrer" aria-label={english?'View certificate':'Lihat sijil'} className="rounded-lg bg-slate-100 p-2 text-slate-700"><Eye size={14}/></a><a href={certDownload(row.public_token)} download={row.nama_penuh+'.pdf'} aria-label={english?'Download certificate':'Muat turun sijil'} className="rounded-lg bg-red-50 p-2 text-red-700"><Download size={14}/></a><button type="button" onClick={()=>onDelete(row)} aria-label={english?'Delete certificate':'Padam sijil'} className="rounded-lg bg-rose-50 p-2 text-rose-700"><Trash2 size={14}/></button></div>
    </div>)}</div>}
  </section>;
}

export function CertificateBatchView({rows,allRows,selectedIds,onToggleRows,onToggle,onDelete}){
  const groups=useMemo(()=>certificateCollections(rows),[rows]);
  const fullBatches=useMemo(()=>new Map(certificateBatches(allRows).map(batch=>[batch.key,batch.rows])),[allRows]);
  return <div className="space-y-6 p-3 sm:p-5">{groups.map(group=>{
    const meta=getCategoryMeta(group.category);
    return <section key={group.key} aria-label={group.name} className="space-y-3"><div className="flex items-start gap-2 border-b border-slate-200 pb-3"><Layers size={19} className="mt-0.5 shrink-0 text-red-700"/><div className="min-w-0"><p className="text-[11px] font-bold text-slate-500">{meta.label}</p><h2 className="mt-1 break-words text-base font-bold text-slate-950">{group.name}</h2></div></div>
      {certificateBatches(group.rows).map(batch=><BatchSection key={batch.key} batch={batch} allRows={fullBatches.get(certificateBatchKey(batch.rows[0]))||batch.rows} selectedIds={selectedIds} onToggleRows={onToggleRows} onToggle={onToggle} onDelete={onDelete}/>)}
    </section>;
  })}</div>;
}
