import React,{useCallback,useEffect,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {Plus,Download,Edit3,Trash2,GraduationCap,Search,Filter,FileUp,IdCard,Eye,CalendarDays,Award,UploadCloud,CheckCircle2,FileText,MapPin} from 'lucide-react';
import {toast} from 'sonner';
import {api,fmtDate} from '../lib/api';
import {PageIntro,Panel,Button,Input,Select,Modal,Confirm,Loading,Empty,SearchField,Pagination,Chip} from '../components/UI';
import {useLang} from '../lib/i18n';
import {
  CERT_CATEGORIES,
  getCertCategory,
  getCategoryMeta,
  getRankMeta,
} from '../lib/certTypes';
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
            drag ? 'border-red-600 bg-red-50' : 'border-slate-200 bg-slate-50/70 hover:border-red-500 hover:bg-red-50/40'
          }`}
        >
          <UploadCloud size={32} className="text-red-700 mb-2"/>
          <div className="text-sm font-bold text-slate-950">
            {file ? file.name : 'Seret fail CSV ke sini atau klik untuk pilih'}
          </div>
          <p className="mt-1 text-xs text-slate-400">Format .csv (UTF-8), saiz maksimum 10MB</p>
          {file && (
            <span className="mt-2 text-xs font-bold text-red-800 bg-red-50 px-3 py-1 rounded-full">
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
                <div className="text-xl font-extrabold text-slate-900">{result.total}</div>
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

function ExportStudentsModal({ open, onClose, branches = [], levels = [], currentBranch = '', currentLevel = '' }) {
  const { lang } = useLang();
  const [selectedBranch, setSelectedBranch] = useState(currentBranch || '');
  const [selectedLevel, setSelectedLevel] = useState(currentLevel || '');
  const [count, setCount] = useState(null);
  const [loadingCount, setLoadingCount] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedBranch(currentBranch || '');
      setSelectedLevel(currentLevel || '');
    }
  }, [open, currentBranch, currentLevel]);

  // Semak bilangan pesilat sepadan
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoadingCount(true);
    const params = new URLSearchParams({ limit: '1' });
    if (selectedBranch) params.set('branch', selectedBranch);
    if (selectedLevel) params.set('level', selectedLevel);

    api('/admin/students?' + params.toString())
      .then((r) => {
        if (active) setCount(r.total ?? 0);
      })
      .catch(() => {
        if (active) setCount(null);
      })
      .finally(() => {
        if (active) setLoadingCount(false);
      });

    return () => {
      active = false;
    };
  }, [open, selectedBranch, selectedLevel]);

  function downloadCsv(branchToUse, levelToUse) {
    const params = new URLSearchParams();
    if (branchToUse) params.set('branch', branchToUse);
    if (levelToUse) params.set('level', levelToUse);
    const url = '/api/admin/students/export' + (params.toString() ? '?' + params.toString() : '');

    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', '');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast.success(
      lang === 'eng'
        ? 'Downloading student CSV file...'
        : 'Memuat turun fail CSV pesilat mengikut tapisan...'
    );
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={lang === 'eng' ? 'Export Students List (CSV)' : 'Eksport Senarai Pesilat (CSV)'}>
      <div className="space-y-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          {lang === 'eng'
            ? 'Download student records into CSV / Excel format. You can filter by specific branch and rank, or export all registered students.'
            : 'Muat turun data pesilat ke format fail CSV (Excel). Anda boleh memilih cawangan dan peringkat tertentu, atau muat turun semua rekod pesilat berdaftar.'}
        </p>

        {/* Pilihan Cawangan & Peringkat */}
        <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 sm:p-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <MapPin size={13} className="text-red-700" />
              <span>{lang === 'eng' ? 'Select Branch' : 'Pilih Cawangan'}</span>
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-100"
            >
              <option value="">{lang === 'eng' ? 'All Branches (Semua Cawangan)' : 'Semua Cawangan'}</option>
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Award size={13} className="text-red-700" />
              <span>{lang === 'eng' ? 'Select Rank / Level' : 'Pilih Peringkat / Bengkung'}</span>
            </label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-100"
            >
              <option value="">{lang === 'eng' ? 'All Levels (Semua Peringkat)' : 'Semua Peringkat'}</option>
              {levels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Ringkasan Rekod Sepadan */}
        <div className="rounded-xl border border-red-100 bg-red-50/70 p-3 text-xs space-y-1.5">
          <div className="flex items-center justify-between font-bold text-slate-900">
            <span>{lang === 'eng' ? 'Matching Records:' : 'Jumlah Rekod Sepadan:'}</span>
            <span className="font-mono text-sm text-red-700 font-extrabold">
              {loadingCount ? 'Mengira...' : count !== null ? `${count} pesilat` : '—'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600 pt-1 border-t border-red-200/50">
            <span className="font-semibold text-slate-500">{lang === 'eng' ? 'Criteria:' : 'Kriteria:'}</span>
            <Chip color="slate">{selectedBranch || (lang === 'eng' ? 'All Branches' : 'Semua Cawangan')}</Chip>
            <span>•</span>
            <Chip color="gold">{selectedLevel || (lang === 'eng' ? 'All Levels' : 'Semua Peringkat')}</Chip>
          </div>
        </div>

        {/* Butang Tindakan */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => downloadCsv('', '')}
            className="text-xs font-semibold text-slate-500 hover:text-red-700 transition underline underline-offset-2"
          >
            {lang === 'eng' ? 'Export All (No Filters)' : 'Eksport Semua (Tanpa Tapisan)'}
          </button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={onClose} className="text-xs">
              {lang === 'eng' ? 'Cancel' : 'Batal'}
            </Button>
            <Button
              type="button"
              onClick={() => downloadCsv(selectedBranch, selectedLevel)}
              disabled={count === 0}
              className="text-xs"
            >
              <Download size={14} />
              <span>{lang === 'eng' ? 'Download CSV' : 'Muat Turun CSV'}</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function EditCertModal({ open, onClose, cert, onSaved }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('kenaikan_tali_pinggang');
  const [date, setDate] = useState('');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (cert) {
      setTitle(cert.nama_sijil || '');
      setCategory(cert.kategori || getCertCategory(cert) || 'kenaikan_tali_pinggang');
      setDate(cert.tarikh_isu || '');
      setFile(null);
    }
  }, [cert, open]);

  if (!cert) return null;

  async function submit(e) {
    e.preventDefault();
    if (title.trim().length < 3) return toast.error('Nama sijil perlu sekurang-kurangnya 3 aksara.');
    const form = new FormData();
    form.append('nama_sijil', title.trim());
    form.append('kategori', category);
    form.append('tarikh_isu', date);
    if (file) form.append('file', file);

    setSaving(true);
    try {
      await api('/admin/certificates/' + cert.id, { method: 'PUT', body: form });
      toast.success('Maklumat sijil berjaya dikemas kini.');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Kemas Kini Maklumat Sijil">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-700">Kategori / Jenis Sijil *</label>
          <div className="grid grid-cols-2 gap-2">
            {CERT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-1.5 p-2 rounded-xl border text-left text-xs transition cursor-pointer ${
                  category === cat.id
                    ? `${cat.activeTabClass} border-transparent ring-2 ring-red-400/40`
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="text-sm shrink-0">{cat.emoji}</span>
                <span className="font-bold truncate text-[11px]">{cat.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Nama Sijil *"
          required
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <Input
          label="Tarikh Dikeluarkan *"
          type="date"
          required
          value={date}
          onChange={e => setDate(e.target.value)}
        />
        <div>
          <label className="mb-2 block text-xs font-bold text-slate-600">Gantikan Fail Sijil (Pilihan)</label>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-red-50 file:px-4 file:py-2 file:font-bold file:text-slate-900"
          />
          <p className="mt-1 text-[11px] text-slate-400">Biarkan kosong jika tidak mahu menggantikan fail sedia ada.</p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
          <Button type="submit" loading={saving}>Simpan Perubahan</Button>
        </div>
      </form>
    </Modal>
  );
}

function QuickAddCertModal({ open, onClose, student, onSaved }) {
  const [category, setCategory] = useState('kenaikan_tali_pinggang');
  const [title, setTitle] = useState('Sijil Ujian Kenaikan Tali Pinggang (Penggal 1/2026)');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setCategory('kenaikan_tali_pinggang');
      setTitle('Sijil Ujian Kenaikan Tali Pinggang (Penggal 1/2026)');
      setDate(new Date().toISOString().slice(0, 10));
      setFile(null);
    }
  }, [open]);

  function handleCategoryChange(newCat) {
    setCategory(newCat);
    if (newCat === 'kenaikan_tali_pinggang') {
      setTitle('Sijil Ujian Kenaikan Tali Pinggang (Penggal 1/2026)');
    } else if (newCat === 'pencapaian') {
      setTitle('Sijil Pencapaian Kejohanan Silat');
    } else if (newCat === 'penghargaan') {
      setTitle('Sijil Penghargaan Jawatankuasa / Jurulatih');
    } else if (newCat === 'penyertaan') {
      setTitle('Sijil Penyertaan Kursus / Latihan Silat');
    }
  }

  if (!student) return null;

  async function submit(e) {
    e.preventDefault();
    if (title.trim().length < 3) return toast.error('Nama sijil perlu sekurang-kurangnya 3 aksara.');
    const form = new FormData();
    form.append('pesilat_id', student.id);
    form.append('nama_sijil', title.trim());
    form.append('kategori', category);
    form.append('tarikh_isu', date);
    if (file) form.append('file', file);

    setSaving(true);
    try {
      await api('/admin/certificates', { method: 'POST', body: form });
      toast.success('Sijil berjaya dikeluarkan untuk pesilat ini.');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Keluarkan Sijil: ${student.nama_penuh}`}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-700">Kategori / Jenis Sijil *</label>
          <div className="grid grid-cols-2 gap-2">
            {CERT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryChange(cat.id)}
                className={`flex items-center gap-1.5 p-2 rounded-xl border text-left text-xs transition cursor-pointer ${
                  category === cat.id
                    ? `${cat.activeTabClass} border-transparent ring-2 ring-red-400/40`
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="text-sm shrink-0">{cat.emoji}</span>
                <span className="font-bold truncate text-[11px]">{cat.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Nama Sijil *"
          required
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <Input
          label="Tarikh Dikeluarkan *"
          type="date"
          required
          value={date}
          onChange={e => setDate(e.target.value)}
        />
        <div>
          <label className="mb-2 block text-xs font-bold text-slate-600">Lampirkan Fail PDF / Imej (Pilihan)</label>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-red-50 file:px-4 file:py-2 file:font-bold file:text-slate-900"
          />
          <p className="mt-1 text-[11px] text-slate-400">Jika kosong, PDF sijil rasmi dijana secara automatik.</p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
          <Button type="submit" loading={saving}><Award size={16}/> Keluarkan Sijil</Button>
        </div>
      </form>
    </Modal>
  );
}

function StudentDetailsModal({ open, onClose, student, onEdit, onSaved }) {
  const [certs, setCerts] = useState([]);
  const [loadingCerts, setLoadingCerts] = useState(true);
  const [editingCert, setEditingCert] = useState(null);
  const [deletingCert, setDeletingCert] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [addingCert, setAddingCert] = useState(false);

  const loadCerts = useCallback(() => {
    if (!student) return;
    setLoadingCerts(true);
    api('/admin/students/' + student.id + '/certificates')
      .then(r => setCerts(r.certificates || []))
      .catch(err => toast.error('Gagal memuat senarai sijil: ' + err.message))
      .finally(() => setLoadingCerts(false));
  }, [student]);

  useEffect(() => {
    if (open && student) {
      loadCerts();
    }
  }, [open, student, loadCerts]);

  async function handleDeleteCert() {
    if (!deletingCert) return;
    setDeletingBusy(true);
    try {
      await api('/admin/certificates/' + deletingCert.id, { method: 'DELETE' });
      toast.success('Sijil telah berjaya dipadam.');
      setDeletingCert(null);
      loadCerts();
      if (onSaved) onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeletingBusy(false);
    }
  }

  const sortedCerts = React.useMemo(() => {
    const catOrder = {
      kenaikan_tali_pinggang: 1,
      pencapaian: 2,
      penghargaan: 3,
      penyertaan: 4,
    };
    return [...certs].sort((a, b) => {
      const cA = getCertCategory(a);
      const cB = getCertCategory(b);
      if (cA !== cB) return (catOrder[cA] || 99) - (catOrder[cB] || 99);
      return new Date(b.tarikh_isu || 0) - new Date(a.tarikh_isu || 0);
    });
  }, [certs]);

  if (!student) return null;

  return (
    <>
      <Modal open={open} onClose={onClose} title="Butiran & Sijil Pesilat" wide>
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-red-50 p-4 border border-red-100">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red-700 text-sm font-extrabold text-white">
                {student.nama_penuh.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-slate-950 truncate">{student.nama_penuh}</h3>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono font-bold text-slate-600">{student.no_kp_atau_id}</span>
                  <span>•</span>
                  <span>{student.cawangan}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Chip color="gold">{student.peringkat}</Chip>
              <Button type="button" variant="secondary" onClick={() => { onClose(); onEdit(student); }} className="!py-1.5 !px-3 text-xs">
                <Edit3 size={14}/> Edit Profil
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-400 block mb-0.5">Tarikh Daftar</span>
              <strong className="text-slate-950">{fmtDate(student.tarikh_daftar)}</strong>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Bilangan Sijil Terkini</span>
              <strong className="text-slate-950">{certs.length} sijil</strong>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <Award className="text-red-700" size={18}/>
                <h4 className="text-sm font-extrabold text-slate-950">
                  Senarai Sijil Pesilat ({certs.length})
                </h4>
              </div>
              <Button type="button" onClick={() => setAddingCert(true)} className="!py-1.5 !px-3 text-xs">
                <Plus size={14}/> Tambah Sijil
              </Button>
            </div>

            {loadingCerts ? (
              <div className="p-8 text-center text-xs text-slate-400">Sedang menyemak rekod sijil...</div>
            ) : certs.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
                <Award size={28} className="mx-auto text-slate-400 mb-2"/>
                <div className="font-bold text-slate-950 text-xs">Belum Mempunyai Sijil</div>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                  Pelajar ini belum dikeluarkan sebarang sijil. Klik butang "+ Tambah Sijil" di atas untuk mengeluarkan sijil baharu.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {sortedCerts.map(c => {
                  const cat = getCertCategory(c);
                  const catMeta = getCategoryMeta(cat);
                  return (
                    <div
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-[#FCFDFB] p-3.5 transition hover:border-red-600 hover:bg-red-50/30"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-700">
                          <FileText size={19}/>
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-950 text-sm truncate" title={c.nama_sijil}>
                            {c.nama_sijil}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                            <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9.5px] font-bold border ${catMeta.badge}`}>
                              <span>{catMeta.emoji}</span>
                              <span>{catMeta.shortLabel}</span>
                            </span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays size={12}/>{fmtDate(c.tarikh_isu)}
                            </span>
                            <span>•</span>
                            <Chip color={c.jenis === 'generated' ? 'emerald' : 'gold'}>
                              {c.jenis === 'generated' ? 'Auto PDF' : 'Fail PDF'}
                            </Chip>
                          </div>
                        </div>
                      </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`/api/public/certificates/${c.public_token}/download?preview=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Lihat sijil PDF"
                        className="rounded-lg bg-slate-100 p-2 text-slate-600 transition hover:bg-red-50 hover:text-red-800"
                      >
                        <Eye size={15}/>
                      </a>
                      <a
                        href={`/api/public/certificates/${c.public_token}/download`}
                        download={`${student.nama_penuh}.pdf`}
                        title="Muat turun sijil"
                        className="rounded-lg bg-emerald-50 p-2 text-emerald-700 transition hover:bg-emerald-100"
                      >
                        <Download size={15}/>
                      </a>
                      <button
                        type="button"
                        onClick={() => setEditingCert(c)}
                        title="Edit nama atau tarikh sijil ini"
                        className="rounded-lg bg-blue-50 p-2 text-blue-600 transition hover:bg-blue-100"
                      >
                        <Edit3 size={15}/>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingCert(c)}
                        title="Buang / Padam sijil ini"
                        className="rounded-lg bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100"
                      >
                        <Trash2 size={15}/>
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={onClose}>Tutup</Button>
          </div>
        </div>
      </Modal>

      <EditCertModal
        open={!!editingCert}
        onClose={() => setEditingCert(null)}
        cert={editingCert}
        onSaved={() => {
          loadCerts();
          if (onSaved) onSaved();
        }}
      />

      <QuickAddCertModal
        open={addingCert}
        onClose={() => setAddingCert(false)}
        student={student}
        onSaved={() => {
          loadCerts();
          if (onSaved) onSaved();
        }}
      />

      <Confirm
        open={!!deletingCert}
        onClose={() => setDeletingCert(null)}
        onConfirm={handleDeleteCert}
        busy={deletingBusy}
        title="Padam sijil ini?"
        message={`Sijil "${deletingCert?.nama_sijil || ''}" milik ${student.nama_penuh} akan dipadam secara kekal.`}
      />
    </>
  );
}

function StudentEditor({open,onClose,onSaved,selected}){
  const { t, lang } = useLang();
  const [form,setForm]=useState(base),[saving,setSaving]=useState(false);
  useEffect(()=>setForm(selected||base),[selected,open]);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  async function submit(e){
    e.preventDefault();
    setSaving(true);
    try{
      if(selected){
        await api('/admin/students/'+selected.id,{method:'PUT',body:form});
        toast.success(lang === 'eng' ? 'Student information updated.' : 'Maklumat pesilat dikemas kini.');
      }else{
        await api('/admin/students',{method:'POST',body:form});
        toast.success(lang === 'eng' ? 'Student successfully registered.' : 'Pesilat berjaya ditambah.');
      }
      onSaved();
      onClose();
    }catch(e){
      toast.error(e.message);
    }finally{
      setSaving(false);
    }
  }
  return (
    <Modal open={open} onClose={onClose} title={selected ? t('modalEditTitle') : t('modalRegisterTitle')}>
      <form onSubmit={submit} className="space-y-4">
        <Input label={`${t('fullNameLabel')} *`} required placeholder="Contoh: Muhammad Adam Bin Ali" value={form.nama_penuh||''} onChange={e=>set('nama_penuh',e.target.value)}/>
        <Input label={t('idNumberLabel')} placeholder={lang === 'eng' ? 'Leave blank for automatic ID' : 'Kosongkan untuk ID automatik'} value={form.no_kp_atau_id||''} onChange={e=>set('no_kp_atau_id',e.target.value)}/>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={`${t('levelLabel')} *`} list="level-suggestions" required value={form.peringkat||''} onChange={e=>set('peringkat',e.target.value)}/>
          <datalist id="level-suggestions">{['Ujian Awan Putih Cula Merah 1','Ujian Awan Putih Cula Merah 2','Ujian Awan Putih Cula Merah 3','Ujian Awan Putih Cula Hijau 1','Ujian Awan Putih Cula Hijau 2','Ujian Awan Putih Cula Hijau 3','Ujian Awan Putih Cula Kuning 1','Ujian Awan Putih Cula Kuning 2','Ujian Awan Putih Cula Kuning 3','Ujian Awan Putih Cula Hitam 1','Ujian Awan Putih Cula Hitam 2','Ujian Awan Putih Cula Hitam 3','Awan Putih Cula Merah 1','Awan Putih Cula Merah 2','Awan Putih Cula Merah 3','Awan Putih Cula Hijau 1','Awan Putih Cula Hijau 2','Awan Putih Cula Hijau 3','Awan Putih Cula Kuning 1','Awan Putih Cula Kuning 2','Awan Putih Cula Kuning 3','Awan Putih Cula Hitam 1','Awan Putih Cula Hitam 2','Awan Putih Cula Hitam 3'].map(x=><option key={x} value={x}/>)}</datalist>
          <Input label={`${t('branchLabel')} *`} required placeholder="Contoh: Skudai" value={form.cawangan||''} onChange={e=>set('cawangan',e.target.value)}/>
        </div>
        <Input label={`${t('dateRegLabel')} *`} type="date" required value={form.tarikh_daftar||base.tarikh_daftar} onChange={e=>set('tarikh_daftar',e.target.value)}/>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>{t('btnCancel')}</Button>
          <Button type="submit" loading={saving}>{selected ? (lang === 'eng' ? 'Save Changes' : 'Simpan Perubahan') : t('btnRegisterStudent')}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function Students(){
  const { t, lang } = useLang();
  const [data,setData]=useState(null),
    [q,setQ]=useState(''),
    [branch,setBranch]=useState(''),
    [level,setLevel]=useState(''),
    [page,setPage]=useState(1),
    [edit,setEdit]=useState(null),
    [formOpen,setFormOpen]=useState(false),
    [importOpen,setImportOpen]=useState(false),
    [exportOpen,setExportOpen]=useState(false),
    [deleteTarget,setDeleteTarget]=useState(null),
    [deleting,setDeleting]=useState(false),
    [viewTarget,setViewTarget]=useState(null);

  const fetchRows=useCallback(()=>
    api('/admin/students?'+new URLSearchParams({q,branch,level,page:String(page)}))
      .then(setData)
      .catch(e=>toast.error(e.message)),
    [q,branch,level,page]
  );

  useEffect(()=>{
    const t=setTimeout(fetchRows,180);
    return()=>clearTimeout(t);
  },[fetchRows]);

  async function remove(){
    setDeleting(true);
    try {
      await api('/admin/students/'+deleteTarget.id,{method:'DELETE'});
      toast.success(lang === 'eng' ? 'Student deleted along with associated certificates.' : 'Pesilat dipadam bersama sijil berkaitan.');
      setDeleteTarget(null);
      fetchRows();
    } catch(e) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  }

  function openAdd(){ setEdit(null); setFormOpen(true); }
  function openEdit(item){ setEdit(item); setFormOpen(true); }

  return (
    <>
      <PageIntro
        eyebrow={t('studentsEyebrow')}
        title={t('studentsTitle')}
        desc={t('studentsDesc')}
        actions={
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 transition hover:bg-red-50 hover:border-red-200 hover:text-red-700 shadow-xs cursor-pointer"
              title="Eksport senarai pesilat mengikut cawangan, peringkat atau semua rekod"
            >
              <Download size={14} className="text-red-700"/>
              <span>Export CSV</span>
              {(branch || level) && (
                <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" title="Tapisan cawangan/peringkat aktif" />
              )}
            </button>
            <Button variant="secondary" onClick={()=>setImportOpen(true)} className="!px-3 !py-2 text-xs">
              <FileUp size={14}/> {t('btnImportCSV')}
            </Button>
            <Button onClick={openAdd} className="!px-3 !py-2 text-xs">
              <Plus size={15}/> {t('btnRegisterStudent')}
            </Button>
          </div>
        }
      />

      <Panel className="flex flex-col">
        {/* Filter bar */}
        <div className="flex flex-col gap-2.5 border-b border-slate-100 p-3 sm:px-4 sm:py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="text-red-700 shrink-0" size={20}/>
            <div className="text-xs sm:text-sm font-extrabold text-slate-950">{lang === 'eng' ? 'Students List' : 'Senarai Pelajar'}</div>
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] sm:text-xs font-extrabold text-emerald-800">
              {data?.total||0} {lang === 'eng' ? 'students' : 'orang'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full lg:w-auto">
            <SearchField value={q} onChange={v=>{setQ(v);setPage(1);}} placeholder={t('searchPlaceholder')}/>
            <select
              aria-label="Tapis cawangan"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-red-500"
              value={branch}
              onChange={e=>{setBranch(e.target.value);setPage(1);}}
            >
              <option value="">{t('allBranches')}</option>
              {data?.branches?.map(x=><option key={x} value={x}>{x}</option>)}
            </select>
            <select
              aria-label="Tapis peringkat"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-red-500"
              value={level}
              onChange={e=>{setLevel(e.target.value);setPage(1);}}
            >
              <option value="">{t('allLevels')}</option>
              {data?.levels?.map(x=><option key={x} value={x}>{x}</option>)}
            </select>
          </div>
        </div>

        {/* Table / Card content: Touch-friendly cards on mobile, full table on desktop */}
        {!data ? (
          <Loading/>
        ) : data.rows.length ? (
          <>
            {/* Mobile Card View (< md) */}
            <div className="block md:hidden divide-y divide-slate-100 max-h-[calc(100vh-230px)] overflow-y-auto">
              {data.rows.map((r, i) => (
                <div key={r.id} className="p-3.5 space-y-2.5 hover:bg-slate-50/70 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-red-50 text-xs font-black text-red-700 border border-red-100 shadow-2xs">
                        {r.nama_penuh.split(' ').slice(0, 2).map((x) => x[0]).join('').toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <button
                          onClick={() => setViewTarget(r)}
                          className="font-bold text-slate-950 text-xs sm:text-sm hover:underline text-left block truncate"
                          title={r.nama_penuh}
                        >
                          {r.nama_penuh}
                        </button>
                        <div className="text-[10px] font-mono text-slate-500">
                          {r.no_kp_atau_id || '—'}
                        </div>
                      </div>
                    </div>
                    <Chip color="gold">{r.peringkat}</Chip>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-0.5">
                    <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                      <MapPin size={11} className="text-slate-400" />
                      {r.cawangan}
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <CalendarDays size={11} className="text-slate-400" />
                      {fmtDate(r.tarikh_daftar)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setViewTarget(r)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition"
                    >
                      <Award size={13} />
                      <span>{r.sijil_count} {t('thCerts').toLowerCase()}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewTarget(r)}
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                        title={t('btnViewCerts')}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => openEdit(r)}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                        title={t('btnEdit')}
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(r)}
                        className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                        title={t('btnDelete')}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto max-h-[calc(100vh-230px)] overflow-y-auto">
              <table className="w-full min-w-[800px] border-collapse text-left text-xs sm:text-sm">
                <thead className="sticky top-0 z-10 bg-[#FBFCFA] text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-400 border-b border-slate-100 shadow-2xs">
                  <tr>
                    <th className="w-12 px-3.5 py-2.5 text-center">{t('thNo')}</th>
                    <th className="px-3.5 py-2.5">{t('thName')}</th>
                    <th className="px-3.5 py-2.5">{t('thId')}</th>
                    <th className="px-3.5 py-2.5">{t('thBranch')}</th>
                    <th className="px-3.5 py-2.5">{t('thLevel')}</th>
                    <th className="px-3.5 py-2.5">{t('thDateReg')}</th>
                    <th className="px-3.5 py-2.5">{t('thCerts')}</th>
                    <th className="px-3.5 py-2.5 text-right">{t('thActions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.rows.map((r,i)=>(
                    <tr key={r.id} className="transition hover:bg-red-50/30">
                      <td className="px-3.5 py-2.5 text-center text-xs font-bold text-slate-400 w-12">
                        {(page-1)*20+i+1}
                      </td>
                      <td className="max-w-[220px] px-3.5 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-50 text-[11px] font-extrabold text-red-700">
                            {r.nama_penuh.split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={()=>setViewTarget(r)}
                              className="truncate font-bold text-slate-950 hover:underline text-left block max-w-full text-xs sm:text-sm"
                              title={r.nama_penuh}
                            >
                              {r.nama_penuh}
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 text-xs font-mono text-slate-600 whitespace-nowrap">
                        {r.no_kp_atau_id}
                      </td>
                      <td className="px-3.5 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                        {r.cawangan}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <Chip color="gold">{r.peringkat}</Chip>
                      </td>
                      <td className="px-3.5 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 text-slate-700 border border-slate-200">
                          <CalendarDays size={11} className="text-red-600"/>
                          <span>{fmtDate(r.tarikh_daftar)}</span>
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={()=>setViewTarget(r)}
                          title={lang === 'eng' ? 'View and manage student certificates' : 'Lihat dan urus sijil pelajar ini'}
                          className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-bold text-red-800 transition hover:bg-red-50 hover:text-slate-900"
                        >
                          <Award size={13} className="text-red-700"/>
                          <span>{r.sijil_count} {t('thCerts').toLowerCase()}</span>
                        </button>
                      </td>
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={()=>setViewTarget(r)}
                            title={t('btnViewCerts')}
                            aria-label={t('btnViewCerts')}
                            className="rounded-lg bg-blue-50 p-1.5 text-blue-600 transition hover:bg-blue-100"
                          >
                            <Eye size={14}/>
                          </button>
                          <button
                            onClick={()=>openEdit(r)}
                            title={t('btnEdit')}
                            aria-label={t('btnEdit')}
                            className="rounded-lg bg-slate-100 p-1.5 text-slate-600 transition hover:bg-red-50 hover:text-red-800"
                          >
                            <Edit3 size={14}/>
                          </button>
                          <button
                            onClick={()=>setDeleteTarget(r)}
                            title={t('btnDelete')}
                            aria-label={t('btnDelete')}
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
          </>
        ) : (
          <Empty title={t('noStudentsFound')} message={t('noStudentsFoundDesc')}/>
        )}

        <Pagination page={data?.page||1} pages={data?.pages||1} onChange={setPage}/>
      </Panel>

      <StudentDetailsModal
        open={!!viewTarget}
        onClose={()=>setViewTarget(null)}
        student={viewTarget}
        onEdit={openEdit}
        onSaved={fetchRows}
      />
      <StudentEditor open={formOpen} onClose={()=>setFormOpen(false)} onSaved={fetchRows} selected={edit}/>
      <ImportStudentsModal open={importOpen} onClose={()=>setImportOpen(false)} onSaved={fetchRows}/>
      <ExportStudentsModal
        open={exportOpen}
        onClose={()=>setExportOpen(false)}
        branches={data?.branches || []}
        levels={data?.levels || []}
        currentBranch={branch}
        currentLevel={level}
      />
      <Confirm
        open={!!deleteTarget}
        onClose={()=>setDeleteTarget(null)}
        onConfirm={remove}
        busy={deleting}
        title={t('confirmDeleteStudentTitle')}
        message={lang === 'eng' ? `You will delete ${deleteTarget?.nama_penuh||'student'} and ALL associated certificates permanently.` : `Anda akan memadam ${deleteTarget?.nama_penuh||'pesilat'} dan SEMUA sijil miliknya secara kekal.`}
      />
    </>
  );
}
