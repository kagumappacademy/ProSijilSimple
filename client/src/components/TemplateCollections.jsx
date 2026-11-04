import React from 'react';
import {Layers,CheckCircle2} from 'lucide-react';
import {useLang} from '../lib/i18n';
import {getCategoryMeta} from '../lib/certTypes';

export function TemplateCollections({groups,value,onChange,allowAll=true,label}){
  const {lang}=useLang(),english=lang==='eng';
  return <div className="space-y-2" role="group" aria-label={label||(english?'Certificate template collections':'Koleksi nama templat sijil')}>
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold text-slate-700">{label||(english?'Select a template collection':'Pilih koleksi nama templat')}</p>{allowAll&&<button type="button" aria-pressed={!value} onClick={()=>onChange('')} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${!value?'border-slate-900 bg-slate-900 text-white':'border-slate-300 bg-white text-slate-700'}`}>{english?'All Templates':'Semua Nama Templat'}</button>}</div>
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{groups.map(group=><button key={group.key} type="button" aria-pressed={value===group.key} onClick={()=>onChange(group.key)} className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 ${value===group.key?'border-red-400 bg-red-50':'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50'}`}>
      <Layers size={17} className="mt-0.5 shrink-0 text-red-700"/><span className="min-w-0 flex-1"><span className="block break-words text-xs font-bold text-slate-950">{group.name}</span><span className="mt-1 block text-[11px] text-slate-600">{getCategoryMeta(group.category).label} · {group.rows.length} {english?'records':'rekod'}</span></span>{value===group.key&&<CheckCircle2 size={15} className="shrink-0 text-red-700"/>}
    </button>)}</div>
  </div>;
}
