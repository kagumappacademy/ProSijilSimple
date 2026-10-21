import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Award,Plus,Download,Eye,Trash2,FileText,UploadCloud,CalendarDays,Search,CheckCircle,Paperclip} from 'lucide-react';
import {toast} from 'sonner';
import {api,fmtDate,certDownload,certPreview} from '../lib/api';
import {PageIntro,Panel,Button,Input,Select,Modal,Confirm,Loading,Empty,SearchField,Pagination,Chip} from '../components/UI';
function CertificateForm({open,onClose,onSaved}){const[studentQ,setStudentQ]=useState(''),[matches,setMatches]=useState([]),[selected,setSelected]=useState(null),[title,setTitle]=useState('Sijil Kenaikan Bengkung'),[date,setDate]=useState(new Date().toISOString().slice(0,10)),[file,setFile]=useState(null),[busy,setBusy]=useState(false);
 useEffect(()=>{if(!open)return;setStudentQ('');setSelected(null);setMatches([]);setFile(null);setTitle('Sijil Kenaikan Bengkung');setDate(new Date().toISOString().slice(0,10));},[open]);
 useEffect(()=>{if(!open||selected||studentQ.trim().length<2){setMatches([]);return;}const timer=setTimeout(()=>api('/admin/students?'+new URLSearchParams({q:studentQ,page:'1'})).then(r=>setMatches(r.rows)).catch(()=>{}),250);return()=>clearTimeout(timer);},[studentQ,selected,open]);
 async function submit(e){e.preventDefault();if(!selected)return toast.error('Sila pilih pesilat daripada hasil carian.');const form=new FormData();form.append('pesilat_id',selected.id);form.append('nama_sijil',title);form.append('tarikh_isu',date);if(file)form.append('file',file);setBusy(true);try{await api('/admin/certificates',{method:'POST',body:form});toast.success('Sijil berjaya dikeluarkan!');onSaved();onClose();}catch(e){toast.error(e.message);}finally{setBusy(false);}}
 return <Modal open={open} onClose={onClose} title="Keluarkan Sijil Baharu" wide><form onSubmit={submit} className="space-y-5"><div><label className="mb-2 block text-xs font-bold text-slate-600">Cari & Pilih Pesilat *</label>{selected?<div className="flex items-center justify-between rounded-xl border border-forest-600 bg-forest-100 px-4 py-3"><div><div className="font-bold text-forest-950">{selected.nama_penuh}</div><div className="mt-1 text-xs text-slate-500">{selected.no_kp_atau_id} • {selected.cawangan}{selected.tarikh_daftar ? ` • Daftar: ${fmtDate(selected.tarikh_daftar)}` : ''}</div></div><button type="button" className="text-xs font-bold text-forest-700 underline" onClick={()=>{setSelected(null);setStudentQ('');}}>Ubah</button></div>:<><input placeholder="Taip nama atau ID pesilat..." value={studentQ} onChange={e=>setStudentQ(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-forest-500 focus:ring-4 focus:ring-forest-100"/>{matches.length>0&&<div className="mt-2 max-h-44 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">{matches.map(p=><button type="button" key={p.id} onClick={()=>{setSelected(p);setStudentQ(p.nama_penuh);}} className="block w-full rounded-lg px-3 py-2.5 text-left hover:bg-forest-100"><div className="text-sm font-bold text-forest-950">{p.nama_penuh}</div><div className="text-[11px] text-slate-500">{p.no_kp_atau_id} • {p.cawangan}</div></button>)}</div>}</>}</div><div className="grid gap-4 sm:grid-cols-2"><Input label="Nama Sijil *" required placeholder="Sijil Penyertaan" value={title} onChange={e=>setTitle(e.target.value)}/><Input label="Tarikh Dikeluarkan *" required type="date" value={date} onChange={e=>setDate(e.target.value)}/></div><div className="relative rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-6 text-center transition hover:border-forest-600"><UploadCloud size={27} className="mx-auto mb-2 text-forest-700"/><div className="text-sm font-bold text-forest-950">{file?file.name:'Lampirkan sijil sedia ada (pilihan)'}</div><p className="mt-1 text-xs text-slate-400">PDF, JPG atau PNG, maks 10MB. Jika kosong, PDF dijana secara automatik.</p><input aria-label="Fail sijil PDF JPG PNG" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={e=>setFile(e.target.files?.[0]||null)} className="mt-3 w-full cursor-pointer text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-forest-100 file:px-4 file:py-2 file:font-bold file:text-forest-900"/></div><div className="rounded-xl bg-amber-50 p-4 text-xs leading-6 text-amber-800">Sijil automatik akan menggunakan maklumat pesilat dan nama penandatangan daripada menu Tetapan Sistem.</div><div className="flex justify-end gap-2 pt-2"><Button type="button" variant="secondary" onClick={onClose}>Batal</Button><Button type="submit" loading={busy}><Award size={17}/> Keluarkan Sijil</Button></div></form></Modal>}
export function Certificates(){
  const [data,setData]=useState(null),
    [q,setQ]=useState(''),
    [page,setPage]=useState(1),
    [modal,setModal]=useState(false),
    [target,setTarget]=useState(null),
    [busy,setBusy]=useState(false);

  const load=useCallback(()=>
    api('/admin/certificates?'+new URLSearchParams({q,page:String(page)}))
      .then(setData)
      .catch(e=>toast.error(e.message)),
    [q,page]
  );

  useEffect(()=>{
    const timer=setTimeout(load,220);
    return()=>clearTimeout(timer);
  },[load]);

  async function remove(){
    setBusy(true);
    try {
      await api('/admin/certificates/'+target.id,{method:'DELETE'});
      setTarget(null);
      toast.success('Sijil telah dipadam.');
      load();
    } catch(e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageIntro
        eyebrow="DOKUMEN DIGITAL"
        title="Pengurusan Sijil"
        desc="Senarai rekod sijil pesilat yang telah dikeluarkan secara digital."
        actions={
          <Button onClick={()=>setModal(true)} className="!px-3.5 !py-2 text-xs">
            <Plus size={16}/> Keluarkan Sijil
          </Button>
        }
      />

      <Panel className="flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-slate-100 p-3 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2">
            <Award className="text-forest-700 shrink-0" size={18}/>
            <div className="text-xs sm:text-sm font-extrabold text-forest-950">Rekod Sijil</div>
            <Chip color="emerald">{data?.total||0} sijil</Chip>
          </div>
          <div className="w-full sm:w-auto">
            <SearchField value={q} onChange={v=>{setQ(v);setPage(1);}} placeholder="Nama pesilat / sijil..."/>
          </div>
        </div>

        {!data ? (
          <Loading/>
        ) : data.rows.length ? (
          <div className="overflow-x-auto max-h-[calc(100vh-230px)] overflow-y-auto">
            <table className="w-full min-w-[780px] text-left text-xs sm:text-sm">
              <thead className="sticky top-0 z-10 bg-[#FBFCFA] text-[10px] font-extrabold uppercase tracking-[.13em] text-slate-400 border-b border-slate-100 shadow-2xs">
                <tr>
                  {['Nama Pesilat','Nama Sijil','Tarikh','Format','Tindakan'].map((k,idx)=>(
                    <th className={`px-3.5 py-2.5 ${idx===4?'text-right':''}`} key={k}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.rows.map(r=>(
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="px-3.5 py-2.5">
                      <div className="font-bold text-forest-950 text-xs sm:text-sm">{r.nama_penuh}</div>
                      <div className="text-[10px] text-slate-400">{r.cawangan} • {r.peringkat}</div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-700 text-xs">
                        <FileText className="shrink-0 text-forest-600" size={15}/>
                        <span className="truncate max-w-[260px]" title={r.nama_sijil}>{r.nama_sijil}</span>
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                      {fmtDate(r.tarikh_isu)}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <Chip color={r.jenis==='generated'?'emerald':'gold'}>
                        {r.jenis==='generated'?'Auto PDF':'Fail Sendiri'}
                      </Chip>
                    </td>
                    <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <a
                          href={certPreview(r.public_token)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Lihat sijil"
                          aria-label="Lihat sijil"
                          className="rounded-lg bg-slate-100 p-1.5 text-slate-600 transition hover:bg-forest-100 hover:text-forest-800"
                        >
                          <Eye size={14}/>
                        </a>
                        <a
                          href={certDownload(r.public_token)}
                          download={`${r.nama_penuh}.pdf`}
                          title="Muat turun sijil"
                          aria-label="Muat turun sijil"
                          className="rounded-lg bg-forest-100 p-1.5 text-forest-800 transition hover:bg-emerald-100"
                        >
                          <Download size={14}/>
                        </a>
                        <button
                          onClick={()=>setTarget(r)}
                          title="Padam sijil"
                          aria-label="Padam sijil"
                          className="rounded-lg bg-rose-50 p-1.5 text-rose-600 transition hover:bg-rose-100"
                        >
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Belum ada sijil" message="Klik 'Keluarkan Sijil' untuk mencipta sijil pertama."/>
        )}

        <Pagination page={data?.page||1} pages={data?.pages||1} onChange={setPage}/>
      </Panel>

      <CertificateForm open={modal} onClose={()=>setModal(false)} onSaved={load}/>
      <Confirm
        open={!!target}
        onClose={()=>setTarget(null)}
        onConfirm={remove}
        busy={busy}
        title="Padam sijil ini?"
        message={`Sijil “${target?.nama_sijil||''}” untuk ${target?.nama_penuh||''} akan dipadam secara kekal dan pautan awamnya tidak lagi sah.`}
      />
    </>
  );
}
