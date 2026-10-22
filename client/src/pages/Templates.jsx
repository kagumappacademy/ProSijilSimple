import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Layers,
  Plus,
  UploadCloud,
  Eye,
  Trash2,
  FileText,
  Play,
  LayoutGrid,
  List,
  Search,
  ArrowUpDown,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, fmtDate } from '../lib/api';
import { PageIntro, Panel, Button, Input, Modal, Confirm, Loading, Empty, Chip } from '../components/UI';
import { PdfThumbnail } from '../components/PdfThumbnail';
import { useLang } from '../lib/i18n';

const LEVEL_LIST = [
  'Ujian Awan Putih Cula Merah 1',
  'Ujian Awan Putih Cula Merah 2',
  'Ujian Awan Putih Cula Merah 3',
  'Ujian Awan Putih Cula Hijau 1',
  'Ujian Awan Putih Cula Hijau 2',
  'Ujian Awan Putih Cula Hijau 3',
  'Ujian Awan Putih Cula Kuning 1',
  'Ujian Awan Putih Cula Kuning 2',
  'Ujian Awan Putih Cula Kuning 3',
  'Ujian Awan Putih Cula Hitam 1',
  'Ujian Awan Putih Cula Hitam 2',
  'Ujian Awan Putih Cula Hitam 3',
];

function getRankMeta(rank) {
  const r = (rank || '').toLowerCase();
  if (r.includes('merah')) {
    return {
      chip: 'rose',
      border: 'border-rose-200 hover:border-rose-400',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      dot: 'bg-rose-500',
      category: 'merah',
    };
  }
  if (r.includes('hijau')) {
    return {
      chip: 'emerald',
      border: 'border-emerald-200 hover:border-emerald-400',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
      category: 'hijau',
    };
  }
  if (r.includes('kuning')) {
    return {
      chip: 'gold',
      border: 'border-amber-200 hover:border-amber-400',
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      dot: 'bg-amber-400',
      category: 'kuning',
    };
  }
  if (r.includes('hitam')) {
    return {
      chip: 'slate',
      border: 'border-slate-300 hover:border-slate-500',
      badge: 'bg-slate-900 text-white border-slate-700',
      dot: 'bg-slate-900',
      category: 'hitam',
    };
  }
  return {
    chip: 'red',
    border: 'border-slate-200 hover:border-red-400',
    badge: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-forest-600',
    category: 'lain',
  };
}

function UploadTemplateModal({ open, onClose, onSaved }) {
  const [file, setFile] = useState(null);
  const [nama, setNama] = useState('Sijil Ujian Kenaikan Tali Pinggang (Penggal 1/2026)');
  const [peringkat, setPeringkat] = useState('Ujian Awan Putih Cula Merah 1');
  const [keterangan, setKeterangan] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setNama('Sijil Ujian Kenaikan Tali Pinggang (Penggal 1/2026)');
      setPeringkat('Ujian Awan Putih Cula Merah 1');
      setKeterangan('');
    }
  }, [open]);

  async function submit(e) {
    e.preventDefault();
    if (!file) return toast.error('Sila pilih fail PDF templat.');
    if (!file.name.toLowerCase().endsWith('.pdf')) return toast.error('Fail mestilah format .pdf.');
    if (file.size > 4.2 * 1024 * 1024) {
      return toast.error(`Saiz fail (${(file.size / (1024 * 1024)).toFixed(1)}MB) melebihi had maksima 4.2MB untuk pelayan Cloud. Sila kecilkan (compress) saiz fail PDF terlebih dahulu.`);
    }
    if (nama.trim().length < 3) return toast.error('Sila masukkan nama templat sijil.');

    const form = new FormData();
    form.append('file', file);
    form.append('nama_template', nama.trim());
    form.append('peringkat', peringkat);
    form.append('keterangan', keterangan.trim());

    setBusy(true);
    try {
      await api('/admin/templates', { method: 'POST', body: form });
      toast.success('Templat sijil berjaya dimuat naik!');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Muat Naik Templat Sijil (PDF)" wide>
      <form onSubmit={submit} className="space-y-3.5">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600">Fail Templat PDF (2 Muka Surat) *</label>
          <label className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-4 text-center transition hover:border-red-600">
            <UploadCloud size={26} className="text-red-700 mb-1.5" />
            <div className="text-xs sm:text-sm font-bold text-slate-950">
              {file ? file.name : 'Pilih atau seret fail PDF templat sijil'}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">PDF standard (maksima 4.2MB untuk Cloud). Muka surat 1 mengandungi ruangan nama.</p>
            {file && (
              <span className="mt-2 text-[11px] font-semibold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full">
                {(file.size / 1024).toFixed(1)} KB • Sedia dimuat naik
              </span>
            )}
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>

        <Input
          label="Nama Templat Sijil *"
          required
          placeholder="Contoh: Sijil Ujian Kenaikan Tali Pinggang (Penggal 1/2026)"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
        />

        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600">Padanan Peringkat Pesilat *</label>
          <select
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-ink outline-none focus:border-red-600 focus:ring-4 focus:ring-red-100"
            value={peringkat}
            onChange={(e) => setPeringkat(e.target.value)}
          >
            {LEVEL_LIST.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-slate-400">
            Sistem memilih templat ini secara automatik apabila pesilat mempunyai peringkat di atas.
          </p>
        </div>

        <Input
          label="Keterangan / Catatan (Pilihan)"
          placeholder="Contoh: Sesi peperiksaan penggal pertama"
          value={keterangan}
          onChange={(e) => setKeterangan(e.target.value)}
        />

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs text-emerald-900 leading-relaxed">
          <strong>Peraturan Janaan:</strong>
          <ul className="mt-1 list-disc list-inside space-y-0.5 text-emerald-800 text-[11px]">
            <li>
              <strong>Page 1:</strong> Nama pesilat di atas garisan nama dengan <strong>fon Lora</strong>, saiz <strong>20</strong>, warna merah <strong>#c1362d</strong>.
            </li>
            <li>
              <strong>Page 2:</strong> Dikekalkan sepenuhnya tanpa sebarang perubahan.
            </li>
          </ul>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} className="text-xs">
            Batal
          </Button>
          <Button type="submit" loading={busy} className="text-xs">
            <UploadCloud size={15} /> Muat Naik Templat
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function TestGenerateModal({ open, onClose, template }) {
  const [name, setName] = useState('MUHAMMAD ADAM BIN ALI');
  const [testing, setTesting] = useState(false);

  if (!template) return null;

  async function handleTest() {
    if (!name.trim()) return toast.error('Sila masukkan nama untuk ujian.');
    setTesting(true);
    try {
      const response = await fetch('/api/admin/templates/test-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: template.id,
          student_name: name.trim(),
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Gagal menjana ujian');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast.success('Ujian janaan PDF dibuka di tab baharu.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTesting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Uji Cuba Janaan Templat">
      <div className="space-y-3.5">
        <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200">
          <div className="font-bold text-slate-950 text-xs sm:text-sm">{template.nama_template}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Peringkat: {template.peringkat}</div>
        </div>

        <Input
          label="Nama Pesilat untuk Diuji"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Masukkan nama contoh..."
        />

        <p className="text-[11px] text-slate-500 leading-relaxed">
          Ujian ini akan menjana dokumen PDF dengan nama di Page 1 menggunakan fon Lora 20 (#c1362d) dan membuka terus di pelayar untuk semakan anda.
        </p>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} className="text-xs">
            Tutup
          </Button>
          <Button type="button" loading={testing} onClick={handleTest} className="text-xs">
            <Play size={15} /> Jana & Buka PDF
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function Templates() {
  const { t, lang } = useLang();
  const [data, setData] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [testTarget, setTestTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Sorting & Filtering State
  const [viewMode, setViewMode] = useState('grid'); // 'grid' (kotak) or 'table'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCula, setFilterCula] = useState('semua'); // 'semua', 'merah', 'hijau', 'kuning', 'hitam'
  const [sortBy, setSortBy] = useState('peringkat'); // 'peringkat', 'terkini', 'nama'

  const loadTemplates = useCallback(() => {
    api('/admin/templates')
      .then(setData)
      .catch((err) => toast.error(err.message));
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api('/admin/templates/' + deleteTarget.id, { method: 'DELETE' });
      toast.success(lang === 'eng' ? 'Certificate template deleted.' : 'Templat berjaya dipadam.');
      setDeleteTarget(null);
      loadTemplates();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  }

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    if (!data?.rows) return [];
    let list = [...data.rows];

    // Filter by cula tab
    if (filterCula !== 'semua') {
      list = list.filter((t) => (t.peringkat || '').toLowerCase().includes(filterCula));
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          (t.nama_template || '').toLowerCase().includes(q) ||
          (t.peringkat || '').toLowerCase().includes(q) ||
          (t.file_name || '').toLowerCase().includes(q) ||
          (t.keterangan || '').toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'peringkat') {
      list.sort((a, b) => {
        const idxA = LEVEL_LIST.indexOf(a.peringkat);
        const idxB = LEVEL_LIST.indexOf(b.peringkat);
        const valA = idxA === -1 ? 999 : idxA;
        const valB = idxB === -1 ? 999 : idxB;
        return valA - valB;
      });
    } else if (sortBy === 'terkini') {
      list.sort((a, b) => (b.id || 0) - (a.id || 0));
    } else if (sortBy === 'nama') {
      list.sort((a, b) => (a.nama_template || '').localeCompare(b.nama_template || ''));
    }

    return list;
  }, [data?.rows, filterCula, searchQuery, sortBy]);

  return (
    <>
      <PageIntro
        eyebrow={t('templatesEyebrow')}
        title={t('templatesTitle')}
        desc={t('templatesDesc')}
        action={
          <Button onClick={() => setUploadOpen(true)} className="!px-3.5 !py-2 text-xs">
            <Plus size={15} /> {t('btnUploadTemplate')}
          </Button>
        }
      />

      <Panel className="flex flex-col">
        {/* Header & Filter Controls Bar */}
        <div className="border-b border-slate-100 p-3 sm:px-4 sm:py-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers className="text-red-700 shrink-0" size={18} />
              <div className="text-xs sm:text-sm font-extrabold text-slate-950">
                {lang === 'eng' ? 'Certificate Templates Collection' : 'Koleksi Templat Sijil'}
              </div>
              <Chip color="emerald">{filteredTemplates.length} {lang === 'eng' ? 'of' : 'daripada'} {data?.rows?.length || 0}</Chip>
            </div>

            {/* View Switcher: Kotak (Grid) vs Jadual (List) */}
            <div className="flex items-center gap-1.5 bg-slate-100/80 p-0.5 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                  viewMode === 'grid'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-red-800'
                }`}
                title={lang === 'eng' ? 'Grid View' : 'Paparan Kotak (Grid Sijil)'}
              >
                <LayoutGrid size={14} />
                <span>{lang === 'eng' ? 'Grid' : 'Kotak'}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-red-800'
                }`}
                title={lang === 'eng' ? 'Table View' : 'Paparan Jadual'}
              >
                <List size={14} />
                <span>{lang === 'eng' ? 'Table' : 'Jadual'}</span>
              </button>
            </div>
          </div>

          {/* Quick Filters & Sorting Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            {/* Cula Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'semua', label: lang === 'eng' ? 'All' : 'Semua' },
                { id: 'merah', label: lang === 'eng' ? 'Red Stripe' : 'Cula Merah', dot: 'bg-rose-500' },
                { id: 'hijau', label: lang === 'eng' ? 'Green Stripe' : 'Cula Hijau', dot: 'bg-emerald-500' },
                { id: 'kuning', label: lang === 'eng' ? 'Yellow Stripe' : 'Cula Kuning', dot: 'bg-amber-400' },
                { id: 'hitam', label: lang === 'eng' ? 'Black Stripe' : 'Cula Hitam', dot: 'bg-slate-800' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterCula(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    filterCula === tab.id
                      ? 'bg-red-700 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
                  }`}
                >
                  {tab.dot && <span className={`h-2 w-2 rounded-full ${tab.dot}`} />}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search and Sort Selectors */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[170px] sm:min-w-[200px]">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={lang === 'eng' ? 'Search templates...' : 'Cari templat...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-950 placeholder:text-slate-400 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                />
              </div>

              <div className="flex items-center gap-1 text-xs text-slate-500">
                <ArrowUpDown size={13} className="text-slate-400 shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-red-600"
                >
                  <option value="peringkat">{lang === 'eng' ? 'Rank Order' : 'Urutan Peringkat'}</option>
                  <option value="terkini">{lang === 'eng' ? 'Recently Uploaded' : 'Terkini Dimuat Naik'}</option>
                  <option value="nama">{lang === 'eng' ? 'Template Name (A-Z)' : 'Nama Templat (A-Z)'}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        {!data ? (
          <Loading />
        ) : data.rows.length === 0 ? (
          <Empty
            icon={Layers}
            title="Belum ada templat sijil"
            message="Klik butang 'Muat Naik Templat' untuk menambah fail PDF templat sijil pertama anda."
          />
        ) : filteredTemplates.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Tiada templat ditemui sepadan dengan carian atau penapis dipilih.
          </div>
        ) : viewMode === 'grid' ? (
          /* Kotak (Card Grid View) - Visible Certificate Preview */
          <div className="p-3 sm:p-4 max-h-[calc(100vh-235px)] overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
              {filteredTemplates.map((item) => {
                const meta = getRankMeta(item.peringkat);
                const previewUrl = `/api/admin/templates/${item.id}/preview`;

                return (
                  <div
                    key={item.id}
                    className={`group relative flex flex-col justify-between rounded-2xl border bg-white p-3 shadow-xs transition-all hover:shadow-md hover:-translate-y-0.5 ${meta.border}`}
                  >
                    <div>
                      {/* Live Certificate Visual Preview (Visible from outside) */}
                      <div className="relative aspect-[1/1.38] w-full overflow-hidden rounded-xl border border-slate-200/90 bg-slate-50 shadow-2xs group-hover:border-red-400 transition">
                        <PdfThumbnail
                          url={previewUrl}
                          title={item.nama_template}
                          className="h-full w-full"
                        />

                        {/* Top-left Rank Badge on the preview */}
                        <div className="absolute top-2 left-2 z-10">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider shadow-xs border ${meta.badge}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                            {item.peringkat}
                          </span>
                        </div>

                        {/* Hover Overlay with Quick Action to view full PDF */}
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/60 opacity-0 backdrop-blur-[2px] transition duration-200 group-hover:opacity-100">
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-slate-900 shadow-lg transition hover:bg-red-50"
                          >
                            <ExternalLink size={14} /> Buka PDF Penuh
                          </a>
                        </div>
                      </div>

                      {/* Certificate Metadata */}
                      <div className="mt-2.5 space-y-1">
                        <h3
                          className="text-xs sm:text-sm font-extrabold text-slate-950 line-clamp-2 leading-snug"
                          title={item.nama_template}
                        >
                          {item.nama_template}
                        </h3>

                        {item.keterangan && (
                          <p className="text-[11px] text-slate-500 line-clamp-1">{item.keterangan}</p>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                          <span className="truncate max-w-[130px]" title={item.file_name}>
                            {item.file_name}
                          </span>
                          <span>{(item.file_size / 1024).toFixed(1)} KB</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 gap-1.5">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setTestTarget(item)}
                        className="!px-2.5 !py-1.5 text-[11px] flex-1 justify-center bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                        title="Uji janaan nama pesilat pada templat ini"
                      >
                        <Play size={13} className="text-emerald-700" /> Uji Janaan
                      </Button>

                      <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-slate-100 p-2 text-slate-600 transition hover:bg-red-50 hover:text-red-800"
                        title="Lihat fail PDF asal"
                      >
                        <Eye size={14} />
                      </a>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="rounded-lg bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100"
                        title="Padam templat ini"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Table View Alternative */
          <div className="overflow-x-auto max-h-[calc(100vh-235px)] overflow-y-auto">
            <table className="w-full min-w-[760px] text-left text-xs sm:text-sm">
              <thead className="sticky top-0 z-10 bg-[#FBFCFA] text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-400 border-b border-slate-100 shadow-2xs">
                <tr>
                  <th className="px-3.5 py-2.5">Pratonton</th>
                  <th className="px-3.5 py-2.5">Nama Templat</th>
                  <th className="px-3.5 py-2.5">Peringkat / Bengkung</th>
                  <th className="px-3.5 py-2.5">Fail PDF</th>
                  <th className="px-3.5 py-2.5">Tarikh Muat Naik</th>
                  <th className="px-3.5 py-2.5 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTemplates.map((item) => {
                  const meta = getRankMeta(item.peringkat);
                  const previewUrl = `/api/admin/templates/${item.id}/preview`;

                  return (
                    <tr key={item.id} className="transition hover:bg-slate-50">
                      <td className="px-3.5 py-2">
                        <div className="h-14 w-11 rounded-md overflow-hidden border border-slate-200 bg-slate-50 shadow-2xs">
                          <PdfThumbnail url={previewUrl} title={item.nama_template} className="h-full w-full" />
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="font-bold text-slate-950 text-xs sm:text-sm">{item.nama_template}</div>
                        {item.keterangan && (
                          <div className="text-[10px] text-slate-400 mt-0.5">{item.keterangan}</div>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <Chip color={meta.chip}>{item.peringkat}</Chip>
                      </td>
                      <td className="px-3.5 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1 font-medium">
                          <FileText size={14} className="text-red-700 shrink-0" />
                          <span className="truncate max-w-[180px]" title={item.file_name}>
                            {item.file_name}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {(item.file_size / 1024).toFixed(1)} KB
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                        {fmtDate(item.created_at.slice(0, 10))}
                      </td>
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Lihat fail PDF asal"
                            className="rounded-lg bg-slate-100 p-1.5 text-slate-600 transition hover:bg-red-50 hover:text-red-800"
                          >
                            <Eye size={14} />
                          </a>
                          <button
                            onClick={() => setTestTarget(item)}
                            title="Uji janaan nama pada templat"
                            className="rounded-lg bg-emerald-50 p-1.5 text-emerald-700 transition hover:bg-emerald-100"
                          >
                            <Play size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(item)}
                            title="Padam templat"
                            className="rounded-lg bg-rose-50 p-1.5 text-rose-600 transition hover:bg-rose-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <UploadTemplateModal open={uploadOpen} onClose={() => setUploadOpen(false)} onSaved={loadTemplates} />

      <TestGenerateModal open={!!testTarget} onClose={() => setTestTarget(null)} template={testTarget} />

      <Confirm
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        busy={deleting}
        title={lang === 'eng' ? 'Delete this certificate template?' : 'Padam templat sijil ini?'}
        message={lang === 'eng' ? `Template "${deleteTarget?.nama_template || ''}" (${deleteTarget?.peringkat || ''}) will be permanently deleted.` : `Templat “${deleteTarget?.nama_template || ''}” (${deleteTarget?.peringkat || ''}) akan dipadam daripada sistem.`}
      />
    </>
  );
}
