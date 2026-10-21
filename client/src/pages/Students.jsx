import React,{useCallback,useEffect,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {Plus,Download,Edit3,Trash2,GraduationCap,Search,Filter,FileUp,IdCard,Eye,CalendarDays,Award,UploadCloud,CheckCircle2} from 'lucide-react';
import {toast} from 'sonner';
import {api,fmtDate} from '../lib/api';
import {PageIntro,Panel,Button,Input,Select,Modal,Confirm,Loading,Empty,SearchField,Pagination,Chip} from '../components/UI';
const base={nama_penuh:'',no_kp_atau_id:'',peringkat:'Awan Putih',cawangan:'',tarikh_daftar:new Date().toISOString().slice(0,10)};

const demoCsv = '\uFEFFnama_penuh,no_kp_atau_id,peringkat,cawangan,tarikh_daftar\r\n"Muhammad Adam Bin Ali","080102011234","Awan Putih","Skudai","2026-10-21"\r\n"Siti Aisyah Binti Ahmad","","Awan Kuning","Kulai","2026-10-21"\r\n';

function downloadCsvTemplate() {
  const blob = new Blob([demoCsv], { type: 'text/csv;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = 'template-import-pesilat.csv';
  a.click();
  URL.revokeObjectURL(href);
}

function ImportStudentsModal({ open, onClose, onSaved }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [drag, setDrag] = useState(false);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setResult(null);
      setDrag(false);
    }
  }, [open]);

  async function submit(e) {
    if (e) e.preventDefault();
    if (!file) return toast.error('Sila pilih fail CSV terlebih dahulu.');
    if (!file.name.toLowerCase().endsWith('.csv')) return toast.error('Fail mestilah dalam format .csv.');

    const body = new FormData();
    body.append('file', file);
    setBusy(true);
    setResult(null);
    try {
      const r = await api('/admin/students/import', { method: 'POST', body });
      setResult(r);
      toast.success(`Import selesai: ${r.inserted} rekod baharu ditambah.`);
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Import Pelajar / Pesilat melalui CSV" wide>
      <div className="space-y-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          Muat naik fail CSV untuk menambah ramai pelajar pesilat secara pukal sekaligus. Kolum yang diterima: <strong>Nama Peserta</strong> (wajib), <strong>No. KP / ID</strong>, <strong>Cawangan</strong>, <strong>Peringkat</strong>, dan <strong>Tarikh Daftar</strong>.
        </p>

        <label
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f) setFile(f);
          }}
          className={`flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
            drag ? 'border-forest-600 bg-forest-100' : 'border-slate-200 bg-slate-50/70 hover:border-forest-500 hover:bg-forest-100/40'
          }`}
        >
          <UploadCloud size={32} className="text-forest-700 mb-2"/>
          <div className="text-sm font-bold text-forest-950">
            {file ? file.name : 'Seret fail CSV ke sini atau klik untuk pilih'}
          </div>
          <p className="mt-1 text-xs text-slate-400">Format .csv (UTF-8), saiz maksimum 10MB</p>
          {file && (
            <span className="mt-2 text-xs font-bold text-forest-800 bg-forest-100 px-3 py-1 rounded-full">
              {(file.size / 1024).toFixed(1)} KB • Fail Dipilih
            </span>
          )}
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={e => setFile(e.target.files?.[0] || null)}
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={downloadCsvTemplate}>
            <Download size={15}/> Muat Turun Templat CSV
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              {result ? 'Tutup' : 'Batal'}
            </Button>
            <Button type="button" onClick={submit} loading={busy} disabled={!file}>
              <FileUp size={16}/> Import Sekarang
            </Button>
          </div>
        </div>

        {result && (
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <div className="flex items-center gap-2 font-extrabold text-emerald-800 text-sm">
              <CheckCircle2 size={18}/> Keputusan Import
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2.5 text-center">
              <div className="rounded-xl bg-white p-3 border border-emerald-100">
                <div className="text-xl font-extrabold text-forest-900">{result.total}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Jumlah Baris</div>
              </div>
              <div className="rounded-xl bg-white p-3 border border-emerald-100">
                <div className="text-xl font-extrabold text-emerald-600">{result.inserted}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Berjaya Ditambah</div>
              </div>
              <div className="rounded-xl bg-white p-3 border border-emerald-100">
                <div className="text-xl font-extrabold text-amber-600">{result.skipped}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Dilangkau (Bertindih)</div>
              </div>
            </div>
            {result.errors?.length > 0 && (
              <div className="mt-3 text-xs leading-6 text-amber-900 bg-white p-3 rounded-xl border border-amber-200">
                <strong>Nota:</strong>
                {result.errors.map((s, i) => (
                  <div key={i}>• {s}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

function StudentDetailsModal({open,onClose,student,onEdit}){
  if(!student) return null;
  return (
    <Modal open={open} onClose={onClose} title="Butiran Pesilat">
      <div className="space-y-4">
        <div className="flex items-center gap-4 rounded-2xl bg-forest-50 p-4 border border-forest-100">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-forest-800 text-base font-extrabold text-white">
            {student.nama_penuh.split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-extrabold text-forest-950 truncate">{student.nama_penuh}</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{student.no_kp_atau_id}</p>
          </div>
        </div>
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white p-4">
          {[
            ['Nama Penuh', student.nama_penuh],
            ['No. Kad Pengenalan / ID', student.no_kp_atau_id],
            ['Cawangan / Gelanggang', student.cawangan],
            ['Peringkat / Bengkung', student.peringkat],
            ['Tarikh Daftar', fmtDate(student.tarikh_daftar)],
            ['Bilangan Sijil Dimiliki', `${student.sijil_count || 0} sijil`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between items-center py-2.5 text-xs">
              <span className="text-slate-500 font-medium">{label}</span>
              <span className="font-bold text-forest-950 text-right">{value}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Tutup</Button>
          <Button type="button" onClick={() => { onClose(); onEdit(student); }}>
            <Edit3 size={15}/> Kemas Kini
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function StudentEditor({open,onClose,onSaved,selected}){const[form,setForm]=useState(base),[saving,setSaving]=useState(false);useEffect(()=>setForm(selected||base),[selected,open]);const set=(k,v)=>setForm(f=>({...f,[k]:v}));async function submit(e){e.preventDefault();setSaving(true);try{if(selected){await api('/admin/students/'+selected.id,{method:'PUT',body:form});toast.success('Maklumat pesilat dikemas kini.');}else{await api('/admin/students',{method:'POST',body:form});toast.success('Pesilat berjaya ditambah.');}onSaved();onClose();}catch(e){toast.error(e.message);}finally{setSaving(false);}}
 return <Modal open={open} onClose={onClose} title={selected?'Kemaskini Maklumat Pesilat':'Tambah Pesilat Baharu'}><form onSubmit={submit} className="space-y-4"><Input label="Nama Penuh Pesilat *" required placeholder="Contoh: Muhammad Adam Bin Ali" value={form.nama_penuh||''} onChange={e=>set('nama_penuh',e.target.value)}/><Input label="No. KP / ID Pesilat" placeholder="Kosongkan untuk ID automatik" value={form.no_kp_atau_id||''} onChange={e=>set('no_kp_atau_id',e.target.value)}/><div className="grid gap-4 sm:grid-cols-2"><Input label="Peringkat / Bengkung *" list="level-suggestions" required value={form.peringkat||''} onChange={e=>set('peringkat',e.target.value)}/><datalist id="level-suggestions">{['Awan Putih','Awan Putih Cula Merah 1','Awan Putih Cula Merah 2','Awan Putih Cula Merah 3','Awan Kuning','Awan Hijau','Awan Biru','Awan Merah','Awan Hitam'].map(x=><option key={x} value={x}/>)}</datalist><Input label="Nama Cawangan / Gelanggang *" required placeholder="Contoh: Skudai" value={form.cawangan||''} onChange={e=>set('cawangan',e.target.value)}/></div><Input label="Tarikh Daftar *" type="date" required value={form.tarikh_daftar||base.tarikh_daftar} onChange={e=>set('tarikh_daftar',e.target.value)}/><div className="flex justify-end gap-2 pt-4"><Button type="button" variant="secondary" onClick={onClose}>Batal</Button><Button type="submit" loading={saving}>{selected?'Simpan Perubahan':'Tambah Pesilat'}</Button></div></form></Modal>}
export function Students(){const[data,setData]=useState(null),[q,setQ]=useState(''),[branch,setBranch]=useState(''),[level,setLevel]=useState(''),[page,setPage]=useState(1),[edit,setEdit]=useState(null),[formOpen,setFormOpen]=useState(false),[importOpen,setImportOpen]=useState(false),[deleteTarget,setDeleteTarget]=useState(null),[deleting,setDeleting]=useState(false),[viewTarget,setViewTarget]=useState(null);const fetchRows=useCallback(()=>api('/admin/students?'+new URLSearchParams({q,branch,level,page:String(page)})).then(setData).catch(e=>toast.error(e.message)),[q,branch,level,page]);useEffect(()=>{const t=setTimeout(fetchRows,180);return()=>clearTimeout(t);},[fetchRows]);async function remove(){setDeleting(true);try{await api('/admin/students/'+deleteTarget.id,{method:'DELETE'});toast.success('Pesilat dipadam bersama sijil berkaitan.');setDeleteTarget(null);fetchRows();}catch(e){toast.error(e.message);}finally{setDeleting(false);}}function openAdd(){setEdit(null);setFormOpen(true);}function openEdit(item){setEdit(item);setFormOpen(true);}return <><PageIntro eyebrow="REKOD PELAJAR" title="Pengurusan Pesilat" desc="Tambah, kemas kini, padam, import dan cari semua rekod pesilat mengikut cawangan." actions={<><a href="/api/admin/students/export" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-forest-900 transition hover:bg-slate-50"><Download size={17}/> Export CSV</a><Button variant="secondary" onClick={()=>setImportOpen(true)}><FileUp size={17}/> Import CSV</Button><Button onClick={openAdd}><Plus size={18}/> Tambah Pesilat</Button></>}/><Panel><div className="flex flex-col gap-3 border-b border-slate-100 p-5 xl:flex-row xl:items-center xl:justify-between"><div className="flex items-center gap-2.5"><GraduationCap className="text-forest-700" size={22}/><div className="text-sm font-extrabold text-forest-950">Senarai Pelajar</div><span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-800">Jumlah: {data?.total||0} orang pelajar</span></div><div className="grid gap-2 sm:grid-cols-3"><SearchField value={q} onChange={v=>{setQ(v);setPage(1);}} placeholder="Cari nama atau ID..."/><select aria-label="Tapis cawangan" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600 outline-none" value={branch} onChange={e=>{setBranch(e.target.value);setPage(1);}}><option value="">Semua Cawangan</option>{data?.branches?.map(x=><option key={x}>{x}</option>)}</select><select aria-label="Tapis peringkat" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600 outline-none" value={level} onChange={e=>{setLevel(e.target.value);setPage(1);}}><option value="">Semua Peringkat</option>{data?.levels?.map(x=><option key={x}>{x}</option>)}</select></div></div>{!data?<Loading/>:data.rows.length?<div className="overflow-x-auto"><table className="w-full min-w-[880px] border-collapse text-left text-sm"><thead className="bg-[#FBFCFA] text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-400"><tr>{['Bil.','Pesilat','ID / No. KP','Cawangan','Peringkat','Tarikh Daftar','Sijil','Tindakan'].map((x,idx)=><th key={x} className={`px-5 py-4 ${idx===0?'w-14 text-center':''}`}>{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{data.rows.map((r,i)=><tr key={r.id} className="transition hover:bg-forest-100/25"><td className="px-5 py-4 text-center text-xs font-bold text-slate-400 w-14">{(page-1)*20+i+1}</td><td className="max-w-[240px] px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-forest-100 text-xs font-extrabold text-forest-700">{r.nama_penuh.split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase()}</div><div className="min-w-0"><button onClick={()=>setViewTarget(r)} className="truncate font-bold text-forest-950 hover:underline text-left block max-w-full" title={r.nama_penuh}>{r.nama_penuh}</button></div></div></td><td className="px-5 py-4 text-xs font-mono text-slate-600">{r.no_kp_atau_id}</td><td className="px-5 py-4 text-xs text-slate-600">{r.cawangan}</td><td className="px-5 py-4"><Chip color="gold">{r.peringkat}</Chip></td><td className="px-5 py-4 text-xs font-semibold text-forest-900 whitespace-nowrap"><div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 text-slate-700 border border-slate-200"><CalendarDays size={13} className="text-forest-600"/>{fmtDate(r.tarikh_daftar)}</div></td><td className="px-5 py-4 font-extrabold text-forest-900">{r.sijil_count}</td><td className="px-5 py-4"><div className="flex gap-2"><button onClick={()=>setViewTarget(r)} title="Lihat butiran pesilat" aria-label="Lihat butiran pesilat" className="rounded-lg bg-blue-50 p-2 text-blue-600 transition hover:bg-blue-100"><Eye size={16}/></button><button onClick={()=>openEdit(r)} title="Kemaskini pesilat" aria-label="Kemaskini pesilat" className="rounded-lg bg-slate-100 p-2 text-slate-600 transition hover:bg-forest-100 hover:text-forest-800"><Edit3 size={16}/></button><button onClick={()=>setDeleteTarget(r)} title="Padam pesilat" aria-label="Padam pesilat" className="rounded-lg bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100"><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div>:<Empty title="Tiada rekod pesilat" message="Tambah pesilat baharu atau ubah kriteria carian."/>}<Pagination page={data?.page||1} pages={data?.pages||1} onChange={setPage}/></Panel><StudentDetailsModal open={!!viewTarget} onClose={()=>setViewTarget(null)} student={viewTarget} onEdit={openEdit}/><StudentEditor open={formOpen} onClose={()=>setFormOpen(false)} onSaved={fetchRows} selected={edit}/><ImportStudentsModal open={importOpen} onClose={()=>setImportOpen(false)} onSaved={fetchRows}/><Confirm open={!!deleteTarget} onClose={()=>setDeleteTarget(null)} onConfirm={remove} busy={deleting} title="Padam pesilat ini?" message={`Anda akan memadam ${deleteTarget?.nama_penuh||'pesilat'} dan SEMUA sijil miliknya secara kekal.`}/></>}
