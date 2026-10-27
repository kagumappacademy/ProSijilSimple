import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  Plus,
  Download,
  Eye,
  Trash2,
  FileText,
  UploadCloud,
  CalendarDays,
  MapPin,
  Filter,
  Layers,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  List,
  Search,
  CheckCircle2,
  CheckSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, fmtDate, certDownload, certPreview } from '../lib/api';
import { PageIntro, Panel, Button, Input, Modal, Confirm, Loading, Empty, SearchField, Chip } from '../components/UI';
import { useLang } from '../lib/i18n';
import {
  CERT_CATEGORIES,
  CULA_GROUPS,
  LEVEL_RANK_ORDER,
  getCertCategory,
  getCategoryMeta,
  getCulaCategory,
  getRankMeta,
} from '../lib/certTypes';

function CertificateForm({ open, onClose, onSaved }) {
  const [studentQ, setStudentQ] = useState('');
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [kategori, setKategori] = useState('kenaikan_tali_pinggang');
  const [title, setTitle] = useState('Sijil Ujian Kenaikan Tali Pinggang (Penggal 1/2026)');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleCategorySelect = (newCat) => {
    setKategori(newCat);
    if (newCat === 'kenaikan_tali_pinggang') {
      setTitle('Sijil Ujian Kenaikan Tali Pinggang (Penggal 1/2026)');
    } else if (newCat === 'pencapaian') {
      setTitle('Sijil Pencapaian Kejohanan Silat');
    } else if (newCat === 'penghargaan') {
      setTitle('Sijil Penghargaan Khas');
    } else if (newCat === 'penyertaan') {
      setTitle('Sijil Penyertaan Kursus Silat');
    }
  };

  useEffect(() => {
    if (!open) return;
    setStudentQ('');
    setSelected(null);
    setMatches([]);
    setFile(null);
    setKategori('kenaikan_tali_pinggang');
    setTitle('Sijil Ujian Kenaikan Tali Pinggang (Penggal 1/2026)');
    setDate(new Date().toISOString().slice(0, 10));
  }, [open]);

  useEffect(() => {
    if (!open || selected || studentQ.trim().length < 2) {
      setMatches([]);
      return;
    }
    const timer = setTimeout(
      () =>
        api('/admin/students?' + new URLSearchParams({ q: studentQ, page: '1' }))
          .then((r) => setMatches(r.rows))
          .catch(() => {}),
      250
    );
    return () => clearTimeout(timer);
  }, [studentQ, selected, open]);

  async function submit(e) {
    e.preventDefault();
    if (!selected) return toast.error('Sila pilih pesilat daripada hasil carian.');
    const form = new FormData();
    form.append('pesilat_id', selected.id);
    form.append('nama_sijil', title);
    form.append('tarikh_isu', date);
    form.append('kategori', kategori);
    if (file) form.append('file', file);
    setBusy(true);
    try {
      await api('/admin/certificates', { method: 'POST', body: form });
      toast.success('Sijil berjaya dikeluarkan!');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Keluarkan Sijil Baharu" wide>
      <form onSubmit={submit} className="space-y-4">
        {/* Pilihan Jenis / Kategori Sijil */}
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-700">Jenis / Kategori Sijil *</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CERT_CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                  kategori === cat.id
                    ? 'border-red-600 bg-red-50/80 ring-2 ring-red-400/30 font-extrabold text-red-900 shadow-2xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="text-base mb-0.5">{cat.emoji}</span>
                <span className="text-[11px] leading-tight font-bold">{cat.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600">Cari & Pilih Pesilat *</label>
          {selected ? (
            <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50/70 px-4 py-2.5">
              <div>
                <div className="font-bold text-slate-900 text-sm">{selected.nama_penuh}</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {selected.no_kp_atau_id} • {selected.cawangan} • {selected.peringkat}
                  {selected.tarikh_daftar ? ` • Daftar: ${fmtDate(selected.tarikh_daftar)}` : ''}
                </div>
              </div>
              <button
                type="button"
                className="text-xs font-bold text-red-700 underline hover:text-red-900"
                onClick={() => {
                  setSelected(null);
                  setStudentQ('');
                }}
              >
                Ubah
              </button>
            </div>
          ) : (
            <>
              <input
                placeholder="Taip nama atau ID pesilat..."
                value={studentQ}
                onChange={(e) => setStudentQ(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-red-600 focus:ring-4 focus:ring-red-500/10 transition"
              />
              {matches.length > 0 && (
                <div className="mt-2 max-h-40 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg divide-y divide-slate-50">
                  {matches.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => {
                        setSelected(p);
                        setStudentQ(p.nama_penuh);
                      }}
                      className="block w-full rounded-lg px-3 py-2 text-left hover:bg-red-50 transition"
                    >
                      <div className="text-xs sm:text-sm font-bold text-slate-900">{p.nama_penuh}</div>
                      <div className="text-[11px] text-slate-500">
                        {p.no_kp_atau_id} • {p.cawangan} • {p.peringkat}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Nama Sijil *" required placeholder="Contoh: Sijil Kenaikan Bengkung" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input label="Tarikh Dikeluarkan *" required type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="relative rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-4 sm:p-5 text-center transition hover:border-red-600">
          <UploadCloud size={24} className="mx-auto mb-1.5 text-red-700" />
          <div className="text-xs sm:text-sm font-bold text-slate-900">
            {file ? file.name : 'Lampirkan fail sijil sedia ada (pilihan)'}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">PDF, JPG atau PNG, maks 10MB. Jika kosong, PDF dijana secara automatik.</p>
          <input
            aria-label="Fail sijil PDF JPG PNG"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mt-2.5 w-full cursor-pointer text-xs text-slate-500 file:mr-2.5 file:rounded-lg file:border-0 file:bg-red-50 file:px-3 file:py-1.5 file:font-bold file:text-red-700"
          />
        </div>

        <div className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900 border border-amber-200/60">
          Sijil automatik akan menggunakan maklumat pesilat dan nama penandatangan daripada menu Tetapan Sistem.
        </div>

        <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} className="text-xs">
            Batal
          </Button>
          <Button type="submit" loading={busy} className="text-xs">
            <Award size={15} /> Keluarkan Sijil
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function Certificates() {
  const { t, lang } = useLang();
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('semua'); // 'semua', 'kenaikan_tali_pinggang', 'pencapaian', 'penghargaan', 'penyertaan'
  const [selectedCula, setSelectedCula] = useState('semua'); // 'semua', 'merah', 'kuning', 'hijau', 'hitam'
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' (By Cawangan -> Peringkat) or 'table'
  const [modal, setModal] = useState(false);
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  // Pilihan Pelajar / Sijil Pukal (Batch Selection)
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchModal, setBatchModal] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);

  // Padam pilihan jika carian atau penapis berubah
  useEffect(() => {
    setSelectedIds(new Set());
  }, [q, selectedCategory, selectedCula, selectedBranch, selectedLevel]);

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAllVisible = useCallback((rows) => {
    if (!rows || rows.length === 0) return;
    setSelectedIds((prev) => {
      const allSelected = rows.every((r) => prev.has(r.id));
      const next = new Set(prev);
      if (allSelected) {
        for (const r of rows) next.delete(r.id);
      } else {
        for (const r of rows) next.add(r.id);
      }
      return next;
    });
  }, []);

  const toggleGroupSelect = useCallback((certList) => {
    if (!certList || certList.length === 0) return;
    setSelectedIds((prev) => {
      const allSelected = certList.every((c) => prev.has(c.id));
      const next = new Set(prev);
      if (allSelected) {
        for (const c of certList) next.delete(c.id);
      } else {
        for (const c of certList) next.add(c.id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  async function handleBatchDelete() {
    if (selectedIds.size === 0) return;
    setBatchBusy(true);
    try {
      const res = await api('/admin/certificates/batch-delete', {
        method: 'POST',
        body: { ids: Array.from(selectedIds) }
      });
      toast.success(
        lang === 'eng'
          ? `Successfully deleted ${res.deletedCount || selectedIds.size} certificates.`
          : `Berjaya memadam ${res.deletedCount || selectedIds.size} sijil yang dipilih.`
      );
      setSelectedIds(new Set());
      setBatchModal(false);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBatchBusy(false);
    }
  }

  // Load all certificates matching filters for clean grouping
  const load = useCallback(() => {
    const params = new URLSearchParams({ all: '1' });
    if (q) params.set('q', q);
    if (selectedBranch) params.set('branch', selectedBranch);
    if (selectedLevel) params.set('level', selectedLevel);
    if (selectedCategory && selectedCategory !== 'semua') {
      params.set('category', selectedCategory);
    }

    api('/admin/certificates?' + params.toString())
      .then(setData)
      .catch((e) => toast.error(e.message));
  }, [q, selectedBranch, selectedLevel, selectedCategory]);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [load]);

  async function remove() {
    setBusy(true);
    try {
      await api('/admin/certificates/' + target.id, { method: 'DELETE' });
      setTarget(null);
      toast.success(lang === 'eng' ? 'Certificate record deleted.' : 'Sijil telah dipadam.');
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  // Pre-calculate branches and their certificate counts
  const branchList = useMemo(() => {
    return data?.branches || [];
  }, [data?.branches]);

  // Kiraan mengikut Kategori Jenis Sijil
  const categoryCounts = useMemo(() => {
    const counts = { semua: 0, kenaikan_tali_pinggang: 0, pencapaian: 0, penghargaan: 0, penyertaan: 0 };
    if (!data?.rows) return counts;
    counts.semua = data.rows.length;
    for (const r of data.rows) {
      const cat = getCertCategory(r);
      if (counts[cat] !== undefined) counts[cat] += 1;
      else counts.kenaikan_tali_pinggang += 1;
    }
    return counts;
  }, [data?.rows]);

  // Kiraan mengikut warna Cula
  const culaCounts = useMemo(() => {
    const counts = { semua: 0, merah: 0, kuning: 0, hijau: 0, hitam: 0 };
    if (!data?.rows) return counts;
    for (const r of data.rows) {
      if (getCertCategory(r) === 'kenaikan_tali_pinggang') {
        counts.semua += 1;
        const c = getCulaCategory(r.peringkat);
        if (counts[c] !== undefined) counts[c] += 1;
      }
    }
    return counts;
  }, [data?.rows]);

  // Hierarchical grouping: Cawangan -> Peringkat (Tersusun ikut Cula) -> Sijil
  const groupedTree = useMemo(() => {
    if (!data?.rows) return {};
    const tree = {};

    for (const cert of data.rows) {
      const cat = getCertCategory(cert);
      if (selectedCategory !== 'semua' && cat !== selectedCategory) continue;

      if (selectedCula !== 'semua' && cat === 'kenaikan_tali_pinggang') {
        if (getCulaCategory(cert.peringkat) !== selectedCula) continue;
      }

      const bKey = cert.cawangan || (lang === 'eng' ? 'No Branch' : 'Tiada Cawangan');
      const rKey = cert.peringkat || (lang === 'eng' ? 'Unassigned Rank' : 'Belum Ditetapkan');

      if (!tree[bKey]) {
        tree[bKey] = {
          total: 0,
          levels: {},
        };
      }
      tree[bKey].total += 1;

      if (!tree[bKey].levels[rKey]) {
        tree[bKey].levels[rKey] = [];
      }
      tree[bKey].levels[rKey].push(cert);
    }

    return tree;
  }, [data?.rows, selectedCategory, selectedCula, lang]);

  // Available peringkat within the currently selected cawangan (for sub-filter tabs)
  const availableLevelsForBranch = useMemo(() => {
    if (!data?.rows) return [];
    const setL = new Set();
    const counts = {};
    for (const c of data.rows) {
      const cat = getCertCategory(c);
      if (selectedCategory !== 'semua' && cat !== selectedCategory) continue;
      if (selectedCula !== 'semua' && cat === 'kenaikan_tali_pinggang') {
        if (getCulaCategory(c.peringkat) !== selectedCula) continue;
      }
      if (!selectedBranch || c.cawangan === selectedBranch) {
        setL.add(c.peringkat);
        counts[c.peringkat] = (counts[c.peringkat] || 0) + 1;
      }
    }

    // Sort according to belt rank order: Merah -> Kuning -> Hijau -> Hitam
    return Array.from(setL)
      .sort((a, b) => {
        const idxA = LEVEL_RANK_ORDER.indexOf(a);
        const idxB = LEVEL_RANK_ORDER.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
      })
      .map((name) => ({
        name,
        count: counts[name] || 0,
      }));
  }, [data?.rows, selectedBranch, selectedCategory, selectedCula]);

  // Cawangan keys to display
  const cawanganEntries = Object.entries(groupedTree);

  // Filtered rows for table view
  const tableRows = useMemo(() => {
    if (!data?.rows) return [];
    return data.rows.filter((c) => {
      const cat = getCertCategory(c);
      if (selectedCategory !== 'semua' && cat !== selectedCategory) return false;
      if (selectedCula !== 'semua' && cat === 'kenaikan_tali_pinggang') {
        if (getCulaCategory(c.peringkat) !== selectedCula) return false;
      }
      if (selectedBranch && c.cawangan !== selectedBranch) return false;
      if (selectedLevel && c.peringkat !== selectedLevel) return false;
      return true;
    });
  }, [data?.rows, selectedCategory, selectedCula, selectedBranch, selectedLevel]);

  return (
    <>
      <PageIntro
        eyebrow={t('certsEyebrow')}
        title={t('certsTitle')}
        desc={t('certsDesc')}
        action={
          <Button onClick={() => setModal(true)} className="!px-3.5 !py-2 text-xs">
            <Plus size={15} /> {t('btnNewCert')}
          </Button>
        }
      />

      <Panel className="flex flex-col">
        {/* Top Control Bar: Carian, Penapis & Togol Paparan */}
        <div className="border-b border-slate-100 p-3 sm:px-4 sm:py-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Award className="text-red-700 shrink-0" size={18} />
              <div className="text-xs sm:text-sm font-extrabold text-slate-950">
                {lang === 'eng' ? 'Certificate Records Center' : 'Pusat Rekod Sijil'}
              </div>
              <Chip color="red">{tableRows.length} daripada {data?.total || 0} Sijil</Chip>
            </div>

            {/* View Switch & Quick Select All */}
            <div className="flex flex-wrap items-center gap-2">
              {tableRows.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleSelectAllVisible(tableRows)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                    tableRows.length > 0 && tableRows.every((r) => selectedIds.has(r.id))
                      ? 'bg-red-50 text-red-700 border-red-300 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-2xs'
                  }`}
                  title={
                    tableRows.length > 0 && tableRows.every((r) => selectedIds.has(r.id))
                      ? 'Nyahpilih semua pelajar/sijil'
                      : 'Pilih semua pelajar/sijil'
                  }
                >
                  <CheckSquare size={13} className={tableRows.length > 0 && tableRows.every((r) => selectedIds.has(r.id)) ? 'text-red-700' : 'text-slate-400'} />
                  <span>
                    {tableRows.length > 0 && tableRows.every((r) => selectedIds.has(r.id))
                      ? (lang === 'eng' ? 'Deselect All' : 'Nyahpilih Semua')
                      : (lang === 'eng' ? 'Select All' : 'Pilih Semua')}
                  </span>
                </button>
              )}

              {/* View Switch: By Kumpulan vs By Jadual */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('grouped')}
                  className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition ${
                    viewMode === 'grouped'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title={lang === 'eng' ? 'By Branch & Rank' : 'Susunan Mengikut Cawangan & Peringkat'}
                >
                  <Layers size={13} />
                  <span>{lang === 'eng' ? 'Grouped' : 'Berkumpulan'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-bold transition ${
                    viewMode === 'table'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title={lang === 'eng' ? 'Full Table View' : 'Paparan Jadual Penuh'}
                >
                  <List size={13} />
                  <span>{lang === 'eng' ? 'Table' : 'Jadual'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Level 0: Kategori Utama Jenis Sijil (Sijil Kenaikan Tali Pinggang, Pencapaian, Penghargaan, Penyertaan) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-0.5 border-b border-slate-100/80">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('semua');
                setSelectedCula('semua');
              }}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedCategory === 'semua'
                  ? 'bg-red-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <span>Semua Jenis Sijil</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${selectedCategory === 'semua' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {categoryCounts.semua}
              </span>
            </button>

            {CERT_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              const count = categoryCounts[cat.id] || 0;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    if (cat.id !== 'kenaikan_tali_pinggang') setSelectedCula('semua');
                  }}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    active
                      ? cat.activeTabClass
                      : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Level 0.5: Sub-Penapis Warna Cula (Untuk Sijil Kenaikan Tali Pinggang) */}
          {(selectedCategory === 'semua' || selectedCategory === 'kenaikan_tali_pinggang') && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-0.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mr-1 shrink-0 flex items-center gap-1">
                Warna Cula:
              </span>
              <button
                type="button"
                onClick={() => setSelectedCula('semua')}
                className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                  selectedCula === 'semua'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
                }`}
              >
                Semua Cula ({culaCounts.semua})
              </button>
              {CULA_GROUPS.map((tab) => {
                const active = selectedCula === tab.id;
                const cCount = culaCounts[tab.id] || 0;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedCula(active ? 'semua' : tab.id)}
                    className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      active
                        ? 'bg-red-700 text-white shadow-xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${tab.dot}`} />
                    <span>{tab.label}</span>
                    <span className="text-[10px] opacity-75 font-mono">({cCount})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Level 1: Pilihan Cawangan (By Cawangan) */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <MapPin size={11} className="text-red-600" />
                Pilih Cawangan:
              </span>
              <span className="text-[10px] text-slate-400">
                {branchList.length} cawangan aktif
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => {
                  setSelectedBranch('');
                  setSelectedLevel('');
                }}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  !selectedBranch
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <span>Semua Cawangan</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    !selectedBranch ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tableRows.length}
                </span>
              </button>

              {branchList.map((b) => {
                const isActive = selectedBranch === b.name;
                return (
                  <button
                    key={b.name}
                    type="button"
                    onClick={() => {
                      if (isActive) {
                        setSelectedBranch('');
                      } else {
                        setSelectedBranch(b.name);
                      }
                      setSelectedLevel('');
                    }}
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      isActive
                        ? 'bg-red-700 text-white shadow-xs ring-1 ring-red-400'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
                    }`}
                  >
                    <span>{b.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-red-100/70 text-red-800'
                      }`}
                    >
                      {b.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Level 2: Di Dalam Cawangan Mengikut Peringkat (Tersusun ikut Cula) */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                <Filter size={11} className="text-red-600" />
                Peringkat:
              </span>

              <button
                type="button"
                onClick={() => setSelectedLevel('')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                  !selectedLevel
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua Peringkat
              </button>

              {availableLevelsForBranch.map((lvl) => {
                const meta = getRankMeta(lvl.name);
                const isSelected = selectedLevel === lvl.name;

                return (
                  <button
                    key={lvl.name}
                    type="button"
                    onClick={() => setSelectedLevel(isSelected ? '' : lvl.name)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                      isSelected
                        ? 'bg-red-700 text-white border-red-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                    <span>{lvl.name}</span>
                    <span className="text-[10px] opacity-75 font-mono">({lvl.count})</span>
                  </button>
                );
              })}
            </div>

            {/* Kotak Carian */}
            <div className="w-full sm:w-64 pt-1 sm:pt-0">
              <SearchField
                value={q}
                onChange={setQ}
                placeholder={lang === 'eng' ? 'Search student, IC, cert...' : 'Cari pesilat, no. KP, sijil...'}
              />
            </div>
          </div>
        </div>

        {/* Bar Tindakan Pukal (Floating Batch Action Bar bila ada sijil dipilih) */}
        {selectedIds.size > 0 && (
          <div className="sticky top-14 sm:top-16 z-20 flex flex-wrap items-center justify-between gap-3 bg-red-700 text-white px-4 py-3 shadow-lg border-b border-red-800">
            <div className="flex items-center gap-2">
              <CheckSquare size={18} className="text-white" />
              <div className="text-xs sm:text-sm font-extrabold">
                {selectedIds.size} {lang === 'eng' ? 'certificates selected' : 'sijil dipilih'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-xl bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-bold transition text-white"
              >
                {lang === 'eng' ? 'Cancel Selection' : 'Batal Pilihan'}
              </button>
              <button
                type="button"
                onClick={() => setBatchModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-extrabold text-red-700 hover:bg-red-50 transition shadow-xs"
              >
                <Trash2 size={14} className="text-red-700" />
                <span>{lang === 'eng' ? 'Delete Selected' : 'Padam Sijil Dipilih'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Kandungan Utama Sijil */}
        {!data ? (
          <Loading />
        ) : tableRows.length === 0 ? (
          <Empty
            icon={Award}
            title={t('noCertsYet')}
            message={t('noCertsYetDesc')}
          />
        ) : viewMode === 'grouped' ? (
          /* Paparan 1: Berkelompok Mengikut Cawangan -> Peringkat (Tersusun ikut Cula: Merah, Kuning, Hijau, Hitam) */
          <div className="divide-y divide-slate-200/80 p-3 sm:p-5 space-y-6">
            {cawanganEntries.map(([cawanganName, branchData]) => {
              // Susun peringkat mengikut urutan bengkung silat (Merah -> Kuning -> Hijau -> Hitam)
              const sortedLevels = Object.entries(branchData.levels).sort(([a], [b]) => {
                const idxA = LEVEL_RANK_ORDER.indexOf(a);
                const idxB = LEVEL_RANK_ORDER.indexOf(b);
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return a.localeCompare(b);
              });

              return (
                <div key={cawanganName} className="space-y-4 pt-2 first:pt-0">
                  {/* Cawangan Group Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-slate-100/90 to-red-50/50 p-3 rounded-2xl border border-slate-200/80">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-red-700 text-white font-black text-xs shadow-xs">
                        <MapPin size={15} />
                      </div>
                      <div>
                        <h2 className="text-sm sm:text-base font-extrabold text-slate-950 uppercase tracking-tight">
                          {cawanganName}
                        </h2>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {branchData.total} {lang === 'eng' ? 'official certificates issued' : 'sijil rasmi dikeluarkan'}
                        </span>
                      </div>
                    </div>
                    <Chip color="red">{branchData.total} {t('certsCountSuffix')}</Chip>
                  </div>

                  {/* Ranks inside Cawangan (Sorted directly by Cula) */}
                  <div className="space-y-4 pl-0 sm:pl-3">
                    {sortedLevels.map(([levelName, certList]) => {
                      const rankMeta = getRankMeta(levelName);
                      const allGroupSelected = certList.every((c) => selectedIds.has(c.id));

                      return (
                        <div
                          key={levelName}
                          className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-2xs space-y-3"
                        >
                          {/* Rank Header with quick Select All for group */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold border ${rankMeta.badge}`}>
                                <span className={`h-2 w-2 rounded-full ${rankMeta.dot}`} />
                                {levelName}
                              </span>
                              <span className="text-xs text-slate-400 font-bold font-mono">
                                ({certList.length} {t('studentsCountSuffix')})
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleGroupSelect(certList)}
                              className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border transition ${
                                allGroupSelected
                                  ? 'bg-red-50 text-red-700 border-red-300'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <CheckSquare size={13} className={allGroupSelected ? 'text-red-700' : 'text-slate-400'} />
                              <span>{allGroupSelected ? (lang === 'eng' ? 'Deselect Group' : 'Nyahpilih') : (lang === 'eng' ? 'Select Group' : 'Pilih Peringkat Ini')}</span>
                            </button>
                          </div>

                          {/* Student Certificate Cards in this Rank */}
                          <div className="grid gap-2.5 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {certList.map((r) => {
                              const isChecked = selectedIds.has(r.id);
                              const catMeta = getCategoryMeta(getCertCategory(r));

                              return (
                                <div
                                  key={r.id}
                                  className={`group relative rounded-xl border p-3 transition shadow-2xs ${
                                    isChecked
                                      ? 'border-red-600 bg-red-50/50 ring-2 ring-red-400/30'
                                      : 'border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xs'
                                  }`}
                                >
                                  {/* Top student row with selection checkbox */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-2 min-w-0">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleSelect(r.id)}
                                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer shrink-0"
                                      />
                                      <div className="min-w-0">
                                        <div className="font-extrabold text-slate-950 text-xs sm:text-sm truncate" title={r.nama_penuh}>
                                          {r.nama_penuh}
                                        </div>
                                        <div className="text-[10px] font-mono text-slate-500">
                                          {r.no_kp_atau_id || '—'}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Category Badge */}
                                    <span className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold border ${catMeta.badge}`}>
                                      <span>{catMeta.emoji}</span>
                                      <span>{catMeta.shortLabel}</span>
                                    </span>
                                  </div>

                                  <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                                    <FileText size={13} className="text-red-600 shrink-0" />
                                    <span className="truncate" title={r.nama_sijil}>{r.nama_sijil}</span>
                                  </div>

                                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2">
                                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                                      <CalendarDays size={11} className="text-slate-400" />
                                      {fmtDate(r.tarikh_isu)}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <a
                                        href={certPreview(r.public_token)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Lihat sijil"
                                        aria-label="Lihat sijil"
                                        className="rounded-lg bg-slate-100 p-1.5 text-slate-600 transition hover:bg-red-50 hover:text-red-800"
                                      >
                                        <Eye size={13} />
                                      </a>
                                      <a
                                        href={certDownload(r.public_token)}
                                        download={`${r.nama_penuh}.pdf`}
                                        title="Muat turun sijil"
                                        aria-label="Muat turun sijil"
                                        className="rounded-lg bg-red-50 p-1.5 text-red-700 transition hover:bg-red-100 border border-red-100"
                                      >
                                        <Download size={13} />
                                      </a>
                                      <button
                                        type="button"
                                        onClick={() => setTarget(r)}
                                        title="Padam sijil"
                                        aria-label="Padam sijil"
                                        className="rounded-lg bg-rose-50 p-1.5 text-rose-600 transition hover:bg-rose-100"
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
                </div>
              );
            })}
          </div>
        ) : (
          /* Paparan 2: Jadual Penuh (Table View) */
          <div>
            {/* Mobile Table View (< md) */}
            <div className="block md:hidden divide-y divide-slate-100 p-3 space-y-3">
              {tableRows.map((r) => {
                const rankMeta = getRankMeta(r.peringkat);
                const isChecked = selectedIds.has(r.id);
                const catMeta = getCategoryMeta(getCertCategory(r));

                return (
                  <div
                    key={r.id}
                    className={`rounded-2xl border p-3.5 space-y-2.5 transition shadow-2xs ${
                      isChecked
                        ? 'border-red-600 bg-red-50/40 ring-1 ring-red-400'
                        : 'border-slate-200/80 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(r.id)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-950 text-sm truncate">{r.nama_penuh}</div>
                          <div className="text-xs text-slate-400 font-mono">{r.no_kp_atau_id || '—'}</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9.5px] font-bold border ${catMeta.badge}`}>
                          <span>{catMeta.emoji}</span>
                          <span>{catMeta.shortLabel}</span>
                        </span>
                        <Chip color={rankMeta.chip}>{r.peringkat}</Chip>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
                      <span className="inline-flex items-center gap-1 font-medium">
                        <MapPin size={11} className="text-slate-400" />
                        {r.cawangan}
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <CalendarDays size={11} className="text-slate-400" />
                        {fmtDate(r.tarikh_isu)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
                      <FileText className="shrink-0 text-red-600" size={13} />
                      <span className="truncate" title={r.nama_sijil}>{r.nama_sijil}</span>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                      <a
                        href={certPreview(r.public_token)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Lihat sijil"
                        aria-label="Lihat sijil"
                        className="rounded-lg bg-slate-100 p-2 text-slate-600 transition hover:bg-red-50 hover:text-red-800"
                      >
                        <Eye size={14} />
                      </a>
                      <a
                        href={certDownload(r.public_token)}
                        download={`${r.nama_penuh}.pdf`}
                        title="Muat turun sijil"
                        aria-label="Muat turun sijil"
                        className="rounded-lg bg-red-50 p-2 text-red-700 transition hover:bg-red-100 border border-red-100"
                      >
                        <Download size={14} />
                      </a>
                      <button
                        onClick={() => setTarget(r)}
                        title="Padam sijil"
                        aria-label="Padam sijil"
                        className="rounded-lg bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100"
                      >
                        <Trash2 size={14} />
                      </button>
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
                    <th className="px-3.5 py-2.5 w-10">
                      <input
                        type="checkbox"
                        checked={tableRows.length > 0 && tableRows.every((r) => selectedIds.has(r.id))}
                        onChange={() => toggleSelectAllVisible(tableRows)}
                        className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                        title="Pilih semua di jadual ini"
                      />
                    </th>
                    <th className="px-3.5 py-2.5">Kategori</th>
                    <th className="px-3.5 py-2.5">{t('thStudent')}</th>
                    <th className="px-3.5 py-2.5">{t('thLevel')}</th>
                    <th className="px-3.5 py-2.5">{t('thBranch')}</th>
                    <th className="px-3.5 py-2.5">{t('thCertName')}</th>
                    <th className="px-3.5 py-2.5">{t('thIssueDate')}</th>
                    <th className="px-3.5 py-2.5 text-right">{t('thActions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tableRows.map((r) => {
                    const rankMeta = getRankMeta(r.peringkat);
                    const isChecked = selectedIds.has(r.id);
                    const catMeta = getCategoryMeta(getCertCategory(r));

                    return (
                      <tr
                        key={r.id}
                        className={`transition ${isChecked ? 'bg-red-50/50' : 'hover:bg-slate-50'}`}
                      >
                        <td className="px-3.5 py-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelect(r.id)}
                            className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold border ${catMeta.badge}`}>
                            <span>{catMeta.emoji}</span>
                            <span>{catMeta.shortLabel}</span>
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 font-bold text-slate-950">
                          <div>{r.nama_penuh}</div>
                          <div className="text-[10px] text-slate-400 font-mono font-normal">
                            {r.no_kp_atau_id || '—'}
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <Chip color={rankMeta.chip}>{r.peringkat}</Chip>
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600 whitespace-nowrap">{r.cawangan}</td>
                        <td className="px-3.5 py-2.5 font-medium text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <FileText className="shrink-0 text-red-600" size={14} />
                            <span className="truncate max-w-[240px]" title={r.nama_sijil}>
                              {r.nama_sijil}
                            </span>
                          </div>
                        </td>
                        <td className="px-3.5 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                          {fmtDate(r.tarikh_isu)}
                        </td>
                        <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <a
                              href={certPreview(r.public_token)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Lihat sijil"
                              aria-label="Lihat sijil"
                              className="rounded-lg bg-slate-100 p-1.5 text-slate-600 transition hover:bg-red-50 hover:text-red-800"
                            >
                              <Eye size={14} />
                            </a>
                            <a
                              href={certDownload(r.public_token)}
                              download={`${r.nama_penuh}.pdf`}
                              title="Muat turun sijil"
                              aria-label="Muat turun sijil"
                              className="rounded-lg bg-red-50 p-1.5 text-red-700 transition hover:bg-red-100 border border-red-100"
                            >
                              <Download size={14} />
                            </a>
                            <button
                              onClick={() => setTarget(r)}
                              title="Padam sijil"
                              aria-label="Padam sijil"
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

      <CertificateForm open={modal} onClose={() => setModal(false)} onSaved={load} />

      <Confirm
        open={!!target}
        onClose={() => setTarget(null)}
        onConfirm={remove}
        busy={busy}
        title={t('confirmDeleteCertTitle')}
        message={
          lang === 'eng'
            ? `Certificate "${target?.nama_sijil || ''}" for ${target?.nama_penuh || ''} will be permanently deleted and its public verification link revoked.`
            : `Sijil “${target?.nama_sijil || ''}” untuk ${target?.nama_penuh || ''} akan dipadam secara kekal dan pautan awamnya tidak lagi sah.`
        }
      />

      <Confirm
        open={batchModal}
        onClose={() => setBatchModal(false)}
        onConfirm={handleBatchDelete}
        busy={batchBusy}
        title={lang === 'eng' ? `Delete ${selectedIds.size} Selected Certificates?` : `Padam ${selectedIds.size} Sijil Yang Dipilih?`}
        message={
          lang === 'eng'
            ? `Are you sure you want to delete ${selectedIds.size} selected certificate records? Their public verification links will be permanently revoked.`
            : `Adakah anda pasti ingin memadam ${selectedIds.size} rekod sijil yang dipilih? Pautan semakan awam untuk sijil-sijil ini akan terbatal secara kekal.`
        }
      />
    </>
  );
}
