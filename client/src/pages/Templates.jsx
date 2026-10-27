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
  Maximize2,
  Award,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, fmtDate } from '../lib/api';
import { PageIntro, Panel, Button, Input, Modal, Confirm, Loading, Empty, Chip } from '../components/UI';
import { PdfThumbnail } from '../components/PdfThumbnail';
import { useLang } from '../lib/i18n';
import {
  CERT_CATEGORIES,
  CULA_GROUPS,
  LEVEL_RANK_ORDER,
  getCertCategory,
  getCategoryMeta,
  getCulaCategory,
  getRankMeta,
  sortTemplatesList,
} from '../lib/certTypes';

const BELT_RANKS_PRESETS = LEVEL_RANK_ORDER;

const PENCAPAIAN_PRESETS = [
  'Johan (Emas)',
  'Naib Johan (Perak)',
  'Ketiga (Gangsa)',
  'Tempat Keempat',
  'Pencapaian Khas',
  'Semua Peringkat',
];

const PENGHARGAAN_PRESETS = [
  'Jurulatih / Wasit Juri',
  'Pembantu Program',
  'Jawatankuasa Penganjur',
  'Penyumbang Khas',
  'Semua Peringkat',
];

const PENYERTAAN_PRESETS = [
  'Peserta Bengkel Silat',
  'Peserta Kursus Kejurulatihan',
  'Peserta Perkhemahan Latihan',
  'Peserta Seminar',
  'Semua Peringkat',
];

function UploadTemplateModal({ open, onClose, onSaved }) {
  const [file, setFile] = useState(null);
  const [kategori, setKategori] = useState('kenaikan_tali_pinggang');
  const [nama, setNama] = useState('Sijil Ujian Kenaikan Tali Pinggang (Penggal 1/2026)');
  const [peringkat, setPeringkat] = useState('Ujian Awan Putih Cula Merah 1');
  const [keterangan, setKeterangan] = useState('');
  const [busy, setBusy] = useState(false);

  // Sync default name & rank suggestions when category changes
  const handleCategoryChange = (newCat) => {
    setKategori(newCat);
    if (newCat === 'kenaikan_tali_pinggang') {
      setNama('Sijil Ujian Kenaikan Tali Pinggang (Penggal 1/2026)');
      setPeringkat('Ujian Awan Putih Cula Merah 1');
    } else if (newCat === 'pencapaian') {
      setNama('Sijil Pencapaian Kejohanan Silat');
      setPeringkat('Johan (Emas)');
    } else if (newCat === 'penghargaan') {
      setNama('Sijil Penghargaan Khas');
      setPeringkat('Semua Peringkat');
    } else if (newCat === 'penyertaan') {
      setNama('Sijil Penyertaan Kursus Silat');
      setPeringkat('Semua Peringkat');
    }
  };

  useEffect(() => {
    if (!open) {
      setFile(null);
      setKategori('kenaikan_tali_pinggang');
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
      return toast.error(
        `Saiz fail (${(file.size / (1024 * 1024)).toFixed(1)}MB) melebihi had maksima 4.2MB untuk pelayan Cloud. Sila kecilkan (compress) saiz fail PDF terlebih dahulu.`
      );
    }
    if (nama.trim().length < 3) return toast.error('Sila masukkan nama templat sijil.');

    const form = new FormData();
    form.append('file', file);
    form.append('nama_template', nama.trim());
    form.append('kategori', kategori);
    form.append('peringkat', peringkat.trim());
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

  const currentPresets = useMemo(() => {
    if (kategori === 'pencapaian') return PENCAPAIAN_PRESETS;
    if (kategori === 'penghargaan') return PENGHARGAAN_PRESETS;
    if (kategori === 'penyertaan') return PENYERTAAN_PRESETS;
    return BELT_RANKS_PRESETS;
  }, [kategori]);

  return (
    <Modal open={open} onClose={onClose} title="Muat Naik Templat Sijil (PDF)" wide>
      <form onSubmit={submit} className="space-y-3.5">
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600">Fail Templat PDF (2 Muka Surat) *</label>
          <label className="flex min-h-[110px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-4 text-center transition hover:border-red-600">
            <UploadCloud size={24} className="text-red-700 mb-1" />
            <div className="text-xs sm:text-sm font-bold text-slate-950">
              {file ? file.name : 'Pilih atau seret fail PDF templat sijil'}
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400">PDF standard (maksima 4.2MB). Muka surat 1 mengandungi ruangan nama.</p>
            {file && (
              <span className="mt-1.5 text-[11px] font-semibold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full">
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

        {/* Pilihan Jenis / Kategori Sijil */}
        <div>
          <label className="mb-2 block text-xs font-bold text-slate-700">Jenis / Kategori Sijil *</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {CERT_CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`flex flex-col items-center justify-center p-3 sm:p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                  kategori === cat.id
                    ? `${cat.activeTabClass} border-transparent ring-2 ring-red-400/40 shadow-sm font-extrabold`
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs'
                }`}
              >
                <span className="text-xl sm:text-2xl mb-1">{cat.emoji}</span>
                <span className="text-xs font-bold leading-tight">{cat.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Nama Templat Sijil *"
          required
          placeholder="Contoh: Sijil Ujian Kenaikan Tali Pinggang (Penggal 1/2026)"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
        />

        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600">
            {kategori === 'kenaikan_tali_pinggang'
              ? 'Padanan Peringkat / Warna Cula Pesilat *'
              : 'Peringkat / Kategori Penerima *'}
          </label>
          <div className="relative">
            <input
              list="template-rank-presets"
              value={peringkat}
              onChange={(e) => setPeringkat(e.target.value)}
              placeholder="Pilih atau taip peringkat..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-100"
              required
            />
            <datalist id="template-rank-presets">
              {currentPresets.map((lvl) => (
                <option key={lvl} value={lvl} />
              ))}
            </datalist>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {kategori === 'kenaikan_tali_pinggang'
              ? 'Sistem memadankan templat ini mengikut warna cula dan peringkat bengkung pesilat.'
              : 'Gunakan "Semua Peringkat" jika templat ini sesuai untuk mana-mana penerima.'}
          </p>
        </div>

        <Input
          label="Keterangan / Catatan (Pilihan)"
          placeholder="Contoh: Kejohanan Silat Daerah 2026 / Penggal Pertama"
          value={keterangan}
          onChange={(e) => setKeterangan(e.target.value)}
        />

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-xs text-emerald-900 leading-relaxed">
          <strong>Peraturan Janaan PDF:</strong>
          <ul className="mt-1 list-disc list-inside space-y-0.5 text-emerald-800 text-[11px]">
            <li>
              <strong>Page 1:</strong> Nama pesilat dicetak di atas garisan nama dengan <strong>fon Lora</strong>, saiz <strong>20</strong>, warna merah <strong>#c1362d</strong>.
            </li>
            <li>
              <strong>Page 2:</strong> Dikekalkan sepenuhnya tanpa sebarang perubahan.
            </li>
          </ul>
        </div>

        <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
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

        <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
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

export function LargeTemplatePreviewModal({ open, onClose, template, onTestGenerate }) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (open) setPage(1);
  }, [open, template]);

  if (!open || !template) return null;
  const previewUrl = `/api/admin/templates/${template.id}/preview`;
  const meta = getRankMeta(template.peringkat);
  const cat = getCategoryMeta(getCertCategory(template));

  return (
    <Modal open={open} onClose={onClose} title="Pratonton Penuh Saiz Besar Templat Sijil" wide>
      <div className="space-y-4">
        {/* Header Details */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 sm:p-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider border ${cat.badge}`}>
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </span>
              <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border ${meta.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                {template.peringkat}
              </span>
              <span className="text-xs text-slate-400 font-mono">ID #{template.id}</span>
            </div>
            <h3 className="mt-1 text-sm sm:text-base font-extrabold text-slate-950 truncate" title={template.nama_template}>
              {template.nama_template}
            </h3>
            {template.keterangan && (
              <p className="text-xs text-slate-500 mt-0.5">{template.keterangan}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center rounded-xl bg-white border border-slate-200 p-0.5 shadow-2xs text-xs font-bold">
              <button
                type="button"
                onClick={() => setPage(1)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  page === 1 ? 'bg-red-700 text-white shadow-xs' : 'text-slate-600 hover:text-red-700'
                }`}
              >
                Muka 1 (Nama Pesilat)
              </button>
              <button
                type="button"
                onClick={() => setPage(2)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  page === 2 ? 'bg-red-700 text-white shadow-xs' : 'text-slate-600 hover:text-red-700'
                }`}
              >
                Muka 2 (Belakang)
              </button>
            </div>
          </div>
        </div>

        {/* Large High-Resolution Certificate Canvas Preview */}
        <div className="relative mx-auto flex items-center justify-center rounded-2xl border-2 border-slate-200 bg-slate-900/5 p-2 sm:p-5 shadow-inner max-h-[68vh] overflow-auto">
          <div className="relative w-full max-w-[620px] aspect-[1/1.414] overflow-hidden rounded-xl border border-slate-300/80 bg-white shadow-2xl">
            <PdfThumbnail
              url={previewUrl}
              title={template.nama_template}
              pageNum={page}
              scale={1.3}
              className="h-full w-full"
            />
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="text-xs text-slate-400">
            {template.file_name} • {(template.file_size / 1024).toFixed(1)} KB
          </div>

          <div className="flex items-center gap-2">
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            >
              <ExternalLink size={14} /> Buka PDF Asal
            </a>
            <Button
              type="button"
              onClick={() => {
                onClose();
                if (onTestGenerate) onTestGenerate(template);
              }}
              className="!px-3.5 !py-2 text-xs bg-emerald-700 hover:bg-emerald-800"
            >
              <Play size={14} /> Uji Janaan Nama
            </Button>
            <Button type="button" variant="secondary" onClick={onClose} className="!px-3.5 !py-2 text-xs">
              Tutup
            </Button>
          </div>
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
  const [previewTarget, setPreviewTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Sorting & Filtering State
  const [viewMode, setViewMode] = useState('grid'); // 'grid' (kotak) or 'table'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('semua'); // 'semua', 'kenaikan_tali_pinggang', 'pencapaian', 'penghargaan', 'penyertaan'
  const [filterCula, setFilterCula] = useState('semua'); // 'semua', 'merah', 'kuning', 'hijau', 'hitam'
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

  // Kiraan setiap kategori untuk paparan tab
  const categoryCounts = useMemo(() => {
    const counts = { semua: 0, kenaikan_tali_pinggang: 0, pencapaian: 0, penghargaan: 0, penyertaan: 0 };
    if (!data?.rows) return counts;
    counts.semua = data.rows.length;
    for (const item of data.rows) {
      const cat = getCertCategory(item);
      if (counts[cat] !== undefined) counts[cat] += 1;
      else counts.kenaikan_tali_pinggang += 1;
    }
    return counts;
  }, [data?.rows]);

  // Kiraan cula untuk tab sub-filter tali pinggang
  const culaCounts = useMemo(() => {
    const counts = { semua: 0, merah: 0, kuning: 0, hijau: 0, hitam: 0 };
    if (!data?.rows) return counts;
    for (const item of data.rows) {
      if (getCertCategory(item) === 'kenaikan_tali_pinggang') {
        counts.semua += 1;
        const c = getCulaCategory(item.peringkat);
        if (counts[c] !== undefined) counts[c] += 1;
      }
    }
    return counts;
  }, [data?.rows]);

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    if (!data?.rows) return [];
    let list = [...data.rows];

    // 1. Tapis mengikut Kategori Jenis Sijil
    if (filterCategory !== 'semua') {
      list = list.filter((t) => getCertCategory(t) === filterCategory);
    }

    // 2. Tapis mengikut Cula (khusus untuk Sijil Kenaikan Tali Pinggang)
    if (filterCula !== 'semua') {
      list = list.filter((t) => getCulaCategory(t.peringkat) === filterCula);
    }

    // 3. Tapis carian teks
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

    // 4. Susunan (Sorting)
    if (sortBy === 'peringkat') {
      list = sortTemplatesList(list);
    } else if (sortBy === 'terkini') {
      list.sort((a, b) => (b.id || 0) - (a.id || 0));
    } else if (sortBy === 'nama') {
      list.sort((a, b) => (a.nama_template || '').localeCompare(b.nama_template || ''));
    }

    return list;
  }, [data?.rows, filterCategory, filterCula, searchQuery, sortBy]);

  // Kelompokkan templat mengikut Jenis Sijil untuk paparan teratur
  const groupedByCategory = useMemo(() => {
    const groups = {};
    for (const item of filteredTemplates) {
      const cat = getCertCategory(item);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return groups;
  }, [filteredTemplates]);

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

          {/* TAB 1: Kategori Utama Jenis Sijil (Sijil Kenaikan Tali Pinggang, Pencapaian, Penghargaan, Penyertaan) */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-b border-slate-100 pb-3">
            <button
              type="button"
              onClick={() => {
                setFilterCategory('semua');
                setFilterCula('semua');
              }}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                filterCategory === 'semua'
                  ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-950/20'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/90 shadow-2xs hover:border-slate-300'
              }`}
            >
              <span>Semua Jenis Sijil</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                filterCategory === 'semua' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {categoryCounts.semua}
              </span>
            </button>

            {CERT_CATEGORIES.map((cat) => {
              const active = filterCategory === cat.id;
              const count = categoryCounts[cat.id] || 0;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setFilterCategory(cat.id);
                    if (cat.id !== 'kenaikan_tali_pinggang') setFilterCula('semua');
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    active
                      ? `${cat.activeTabClass} shadow-sm ring-1 ring-black/10`
                      : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/90 shadow-2xs hover:border-slate-300'
                  }`}
                >
                  <span className="text-base sm:text-lg">{cat.emoji}</span>
                  <span>{cat.label}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* TAB 2: Sub-Penapis Cula (Hanya dipaparkan untuk Sijil Kenaikan Tali Pinggang / Semua) */}
          {(filterCategory === 'semua' || filterCategory === 'kenaikan_tali_pinggang') && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1.5 uppercase tracking-wider">
                  <span>Warna Cula:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setFilterCula('semua')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    filterCula === 'semua'
                      ? 'bg-red-700 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/90 shadow-2xs hover:border-slate-300'
                  }`}
                >
                  <span>Semua Cula</span>
                  <span className="text-[11px] opacity-80 font-mono">({culaCounts.semua})</span>
                </button>
                {CULA_GROUPS.map((tab) => {
                  const active = filterCula === tab.id;
                  const cCount = culaCounts[tab.id] || 0;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilterCula(tab.id)}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer border ${
                        active
                          ? `${tab.badge} ring-2 ring-red-400/40 shadow-xs font-extrabold`
                          : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200/90 shadow-2xs hover:border-slate-300'
                      }`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${tab.dot}`} />
                      <span>{tab.label}</span>
                      <span className="text-[11px] opacity-80 font-mono">({cCount})</span>
                    </button>
                  );
                })}
              </div>

              {/* Search and Sort Selectors */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[160px] sm:min-w-[190px]">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={lang === 'eng' ? 'Search templates...' : 'Cari templat...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs text-slate-950 placeholder:text-slate-400 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                  />
                </div>

                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <ArrowUpDown size={13} className="text-slate-400 shrink-0" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-red-600"
                  >
                    <option value="peringkat">Urutan Kategori & Cula</option>
                    <option value="terkini">Terkini Dimuat Naik</option>
                    <option value="nama">Nama Templat (A-Z)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        {!data ? (
          <Loading text="Memuatkan Koleksi Templat Sijil..." subtext="Menyegerak fail PDF dari Cloud..." />
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
          /* Kotak (Card Grid View) - Terasing & Tersusun mengikut Kategori & Cula */
          <div className="p-3 sm:p-4 max-h-[calc(100vh-235px)] overflow-y-auto space-y-6">
            {Object.keys(groupedByCategory).map((catId) => {
              const catMeta = getCategoryMeta(catId);
              const items = groupedByCategory[catId];
              if (!items || items.length === 0) return null;

              return (
                <div key={catId} className="space-y-2.5">
                  {/* Category Section Header */}
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{catMeta.emoji}</span>
                      <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                        {catMeta.label}
                      </h3>
                      <Chip color={catMeta.chip}>{items.length} Templat</Chip>
                    </div>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      {catMeta.description}
                    </span>
                  </div>

                  {/* Grid Cards for this category - Roomy, Aesthetic Minimalist */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 p-3.5 sm:p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80">
                    {items.map((item) => {
                      const meta = getRankMeta(item.peringkat);
                      const previewUrl = `/api/admin/templates/${item.id}/preview`;
                      const isBelt = catId === 'kenaikan_tali_pinggang';

                      return (
                        <div
                          key={item.id}
                          className={`group relative flex flex-col justify-between rounded-2xl border bg-white p-3.5 sm:p-4 shadow-2xs transition-all duration-200 hover:shadow-apple-md hover:-translate-y-1 ${meta.border}`}
                        >
                          <div>
                            {/* Live Certificate Visual Preview - Larger & Crisper */}
                            <div
                              onClick={() => setPreviewTarget(item)}
                              className="relative aspect-[1/1.34] w-full overflow-hidden rounded-xl border border-slate-200/90 bg-slate-100/70 cursor-pointer group-hover:border-red-400 group-hover:shadow-xs transition duration-200"
                              title="Klik untuk lihat pratonton sijil saiz besar"
                            >
                              <PdfThumbnail
                                url={previewUrl}
                                title={item.nama_template}
                                scale={0.82}
                                className="h-full w-full pointer-events-none transition duration-200 group-hover:scale-[1.02]"
                              />

                              {/* Top-left Rank / Category Badge on preview */}
                              <div className="absolute top-2 left-2 z-10">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-lg bg-white/95 backdrop-blur-xs px-2.5 py-1 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-tight border shadow-xs ${meta.badge}`}
                                >
                                  {isBelt && <span className={`inline-block h-2 w-2 rounded-full ${meta.dot}`} />}
                                  <span>{item.peringkat.replace(/^ujian\s+/i, '')}</span>
                                </span>
                              </div>

                              {/* Top-right Quick Zoom Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewTarget(item);
                                }}
                                className="absolute top-2 right-2 z-10 rounded-lg bg-white/95 backdrop-blur-xs p-1.5 text-slate-700 hover:bg-red-50 hover:text-red-700 shadow-xs border border-slate-200/90 transition"
                                title="Lihat pratonton saiz besar"
                              >
                                <Maximize2 size={13} />
                              </button>
                            </div>

                            {/* Card Details */}
                            <div className="mt-3 min-w-0">
                              <div
                                className="text-xs sm:text-sm font-extrabold text-slate-950 truncate cursor-pointer hover:text-red-700 transition"
                                title={item.peringkat}
                                onClick={() => setPreviewTarget(item)}
                              >
                                {item.peringkat}
                              </div>
                              <div className="text-[11px] sm:text-xs text-slate-500 truncate mt-0.5" title={item.nama_template}>
                                {item.nama_template}
                              </div>
                            </div>
                          </div>

                          {/* Card Actions Footer - Aesthetic Minimalist */}
                          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5 w-full min-w-0">
                            <button
                              type="button"
                              onClick={() => setTestTarget(item)}
                              className="rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 border border-emerald-200/70 transition inline-flex items-center gap-1.5 shrink-0 active:scale-95 shadow-2xs cursor-pointer"
                              title="Uji janaan nama pada templat"
                            >
                              <Play size={11} className="fill-emerald-800 text-emerald-800" />
                              <span>Uji Sijil</span>
                            </button>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setPreviewTarget(item)}
                                className="rounded-xl bg-slate-50 p-2 text-slate-600 hover:bg-slate-100 hover:text-red-700 border border-slate-200/70 transition active:scale-95 shadow-2xs cursor-pointer"
                                title="Pratonton saiz besar"
                              >
                                <Maximize2 size={13} />
                              </button>

                              <a
                                href={previewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-xl bg-slate-50 p-2 text-slate-600 hover:bg-slate-100 hover:text-red-700 border border-slate-200/70 transition active:scale-95 shadow-2xs"
                                title="Buka fail PDF asal"
                              >
                                <Eye size={13} />
                              </a>

                              <button
                                type="button"
                                onClick={() => setDeleteTarget(item)}
                                className="rounded-xl bg-rose-50 p-2 text-rose-600 hover:bg-rose-100 border border-rose-200/70 transition active:scale-95 shadow-2xs cursor-pointer"
                                title="Padam templat ini"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View Alternative */
          <div>
            {/* Mobile Cards View (< md) */}
            <div className="block md:hidden divide-y divide-slate-100 p-3 space-y-3">
              {filteredTemplates.map((item) => {
                const meta = getRankMeta(item.peringkat);
                const catMeta = getCategoryMeta(getCertCategory(item));
                const previewUrl = `/api/admin/templates/${item.id}/preview`;
                return (
                  <div key={item.id} className="rounded-2xl border border-slate-200/80 bg-white p-3.5 space-y-2.5 shadow-2xs">
                    <div className="flex items-start gap-3">
                      <div
                        onClick={() => setPreviewTarget(item)}
                        className="h-20 w-15 shrink-0 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-2xs cursor-pointer hover:border-red-500 transition relative group/thumb"
                        title="Klik untuk besarkan pratonton"
                      >
                        <PdfThumbnail url={previewUrl} title={item.nama_template} scale={0.7} className="h-full w-full" />
                        <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition">
                          <Maximize2 size={12} className="text-white" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Chip color={catMeta.chip}>{catMeta.shortLabel}</Chip>
                          <Chip color={meta.chip}>{item.peringkat}</Chip>
                        </div>
                        <div
                          onClick={() => setPreviewTarget(item)}
                          className="font-bold text-slate-950 text-xs sm:text-sm mt-1 cursor-pointer hover:text-red-700 transition"
                        >
                          {item.nama_template}
                        </div>
                        {item.keterangan && <div className="text-[10px] text-slate-400 mt-0.5">{item.keterangan}</div>}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                      <span>{fmtDate(item.created_at.slice(0, 10))}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewTarget(item)}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition"
                          title="Besarkan pratonton sijil"
                        >
                          <Maximize2 size={12} /> Pratonton
                        </button>
                        <button
                          onClick={() => setTestTarget(item)}
                          title="Uji janaan nama pada templat"
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition"
                        >
                          <Play size={12} /> Uji
                        </button>
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-slate-100 p-1.5 text-slate-600 transition hover:bg-red-50 hover:text-red-800"
                          title="Lihat fail PDF asal"
                        >
                          <Eye size={14} />
                        </a>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="rounded-lg bg-rose-50 p-1.5 text-rose-600 transition hover:bg-rose-100"
                          title="Padam templat ini"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto max-h-[calc(100vh-235px)] overflow-y-auto">
              <table className="w-full min-w-[760px] text-left text-xs sm:text-sm">
                <thead className="sticky top-0 z-10 bg-[#FBFCFA] text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-400 border-b border-slate-100 shadow-2xs">
                  <tr>
                    <th className="px-3.5 py-2.5">Pratonton</th>
                    <th className="px-3.5 py-2.5">Kategori</th>
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
                    const catMeta = getCategoryMeta(getCertCategory(item));
                    const previewUrl = `/api/admin/templates/${item.id}/preview`;

                    return (
                      <tr key={item.id} className="transition hover:bg-slate-50">
                        <td className="px-3.5 py-2">
                          <div
                            onClick={() => setPreviewTarget(item)}
                            className="h-16 w-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shadow-2xs cursor-pointer hover:border-red-500 transition relative group/thumb"
                            title="Klik untuk besarkan pratonton"
                          >
                            <PdfThumbnail url={previewUrl} title={item.nama_template} scale={0.7} className="h-full w-full" />
                            <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition">
                              <Maximize2 size={12} className="text-white" />
                            </div>
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold border ${catMeta.badge}`}>
                            <span>{catMeta.emoji}</span>
                            <span>{catMeta.shortLabel}</span>
                          </span>
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
          </div>
        )}
      </Panel>

      <UploadTemplateModal open={uploadOpen} onClose={() => setUploadOpen(false)} onSaved={loadTemplates} />

      <TestGenerateModal open={!!testTarget} onClose={() => setTestTarget(null)} template={testTarget} />

      <LargeTemplatePreviewModal
        open={!!previewTarget}
        onClose={() => setPreviewTarget(null)}
        template={previewTarget}
        onTestGenerate={(t) => setTestTarget(t)}
      />

      <Confirm
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        busy={deleting}
        title={lang === 'eng' ? 'Delete this certificate template?' : 'Padam templat sijil ini?'}
        message={
          lang === 'eng'
            ? `Template "${deleteTarget?.nama_template || ''}" (${deleteTarget?.peringkat || ''}) will be permanently deleted.`
            : `Templat “${deleteTarget?.nama_template || ''}” (${deleteTarget?.peringkat || ''}) akan dipadam daripada sistem.`
        }
      />
    </>
  );
}
