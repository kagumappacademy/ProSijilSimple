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

function getRankMeta(rank) {
  const r = (rank || '').toLowerCase();
  if (r.includes('merah')) {
    return {
      chip: 'rose',
      border: 'border-rose-200',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      dot: 'bg-rose-500',
    };
  }
  if (r.includes('hijau')) {
    return {
      chip: 'emerald',
      border: 'border-emerald-200',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
    };
  }
  if (r.includes('kuning')) {
    return {
      chip: 'gold',
      border: 'border-amber-200',
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      dot: 'bg-amber-400',
    };
  }
  if (r.includes('hitam')) {
    return {
      chip: 'slate',
      border: 'border-slate-300',
      badge: 'bg-slate-900 text-white border-slate-700',
      dot: 'bg-slate-900',
    };
  }
  return {
    chip: 'red',
    border: 'border-red-200',
    badge: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-600',
  };
}

function CertificateForm({ open, onClose, onSaved }) {
  const [studentQ, setStudentQ] = useState('');
  const [matches, setMatches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [title, setTitle] = useState('Sijil Kenaikan Bengkung');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStudentQ('');
    setSelected(null);
    setMatches([]);
    setFile(null);
    setTitle('Sijil Kenaikan Bengkung');
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
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-600">Cari & Pilih Pesilat *</label>
          {selected ? (
            <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50/70 px-4 py-2.5">
              <div>
                <div className="font-bold text-slate-900 text-sm">{selected.nama_penuh}</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {selected.no_kp_atau_id} • {selected.cawangan}
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
                        {p.no_kp_atau_id} • {p.cawangan}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Nama Sijil *" required placeholder="Sijil Penyertaan" value={title} onChange={(e) => setTitle(e.target.value)} />
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
  }, [q, selectedBranch, selectedLevel]);

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

    api('/admin/certificates?' + params.toString())
      .then(setData)
      .catch((e) => toast.error(e.message));
  }, [q, selectedBranch, selectedLevel]);

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

  // Hierarchical grouping: Cawangan -> Peringkat -> Certificates
  const groupedTree = useMemo(() => {
    if (!data?.rows) return {};
    const tree = {};

    for (const cert of data.rows) {
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
  }, [data?.rows, lang]);

  // Available peringkat within the currently selected cawangan (for sub-filter tabs)
  const availableLevelsForBranch = useMemo(() => {
    if (!data?.rows) return [];
    const setL = new Set();
    const counts = {};
    for (const c of data.rows) {
      if (!selectedBranch || c.cawangan === selectedBranch) {
        setL.add(c.peringkat);
        counts[c.peringkat] = (counts[c.peringkat] || 0) + 1;
      }
    }
    return Array.from(setL).map((name) => ({
      name,
      count: counts[name] || 0,
    }));
  }, [data?.rows, selectedBranch]);

  // Cawangan keys to display
  const cawanganEntries = Object.entries(groupedTree);

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
              <Chip color="red">{data?.total || 0} {t('certsCountSuffix')}</Chip>
            </div>

            {/* View Switch & Quick Select All */}
            <div className="flex flex-wrap items-center gap-2">
              {data?.rows && data.rows.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleSelectAllVisible(data.rows)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                    data.rows.length > 0 && data.rows.every((r) => selectedIds.has(r.id))
                      ? 'bg-red-50 text-red-700 border-red-300 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-2xs'
                  }`}
                  title={
                    data.rows.length > 0 && data.rows.every((r) => selectedIds.has(r.id))
                      ? 'Nyahpilih semua pelajar/sijil'
                      : 'Pilih semua pelajar/sijil'
                  }
                >
                  <CheckSquare size={13} className={data.rows.length > 0 && data.rows.every((r) => selectedIds.has(r.id)) ? 'text-red-700' : 'text-slate-400'} />
                  <span>
                    {data.rows.length > 0 && data.rows.every((r) => selectedIds.has(r.id))
                      ? (lang === 'eng' ? 'Deselect All' : 'Nyahpilih Semua')
                      : (lang === 'eng' ? 'Select All' : 'Pilih Semua')}
                  </span>
                </button>
              )}

              {/* View Switch: By Kumpulan vs By Jadual */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('grouped')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                    viewMode === 'grouped'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title={lang === 'eng' ? 'By Branch & Rank' : 'Susunan Mengikut Cawangan & Peringkat'}
                >
                  <Layers size={13} />
                  <span>{lang === 'eng' ? 'By Branch & Rank' : 'By Cawangan & Peringkat'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                    viewMode === 'table'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title={lang === 'eng' ? 'Full Table View' : 'Paparan Jadual Penuh'}
                >
                  <List size={13} />
                  <span>{lang === 'eng' ? 'Full Table' : 'Jadual Penuh'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Level 1: Pilihan Cawangan (By Cawangan) */}
          <div className="space-y-1.5 pt-1">
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
                  {data?.total || 0}
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

          {/* Level 2: Di Dalam Cawangan Mengikut Peringkat (In Cawangan By Peringkat) */}
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
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded-full ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {lvl.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Carian Pantas */}
            <div className="w-full sm:w-auto">
              <SearchField
                value={q}
                onChange={setQ}
                placeholder="Cari nama, ID atau sijil..."
              />
            </div>
          </div>
        </div>

        {/* Bar Tindakan Pukal (Batch Selection Action Bar) */}
        {selectedIds.size > 0 && (
          <div className="mx-3 sm:mx-4 mt-3 rounded-2xl border border-red-200 bg-gradient-to-r from-red-50/95 via-rose-50/80 to-red-50/95 p-3 sm:px-4 sm:py-2.5 shadow-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-red-700 text-white shadow-xs">
                <CheckSquare size={15} />
              </span>
              <div>
                <div className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span className="text-red-700">{selectedIds.size}</span>
                  <span>{lang === 'eng' ? 'certificates selected' : 'sijil dipilih'}</span>
                </div>
                <p className="text-[10px] text-slate-500 hidden sm:block">
                  {lang === 'eng'
                    ? 'Select certificates and click delete to remove them in batch.'
                    : 'Pilih pelajar/sijil dan klik buang untuk memadam rekod secara pukal.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition shadow-2xs"
              >
                {lang === 'eng' ? 'Deselect All' : 'Batal Pilihan'}
              </button>
              <button
                type="button"
                onClick={() => setBatchModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-red-800 transition active:scale-95"
              >
                <Trash2 size={13} />
                <span>{lang === 'eng' ? `Delete (${selectedIds.size})` : `Buang (${selectedIds.size})`}</span>
              </button>
            </div>
          </div>
        )}

        {/* Kandungan Sijil (By Cawangan -> By Peringkat) */}
        {!data ? (
          <Loading />
        ) : data.rows.length === 0 ? (
          <Empty
            title="Tiada rekod sijil ditemui"
            message="Tiada sijil yang sepadan dengan cawangan, peringkat atau kriteria carian anda."
          />
        ) : viewMode === 'grouped' ? (
          /* Paparan Hierarki Berkumpulan (By Cawangan, dan di dalam Cawangan By Peringkat) */
          <div className="p-3 sm:p-4 max-h-[calc(100vh-250px)] overflow-y-auto space-y-4">
            {cawanganEntries.map(([cawanganName, branchData]) => {
              const levelEntries = Object.entries(branchData.levels);

              return (
                <div
                  key={cawanganName}
                  className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs"
                >
                  {/* Header Cawangan (Level 1) */}
                  <div className="flex items-center justify-between bg-gradient-to-r from-red-50/70 via-slate-50 to-white px-4 py-2.5 border-b border-slate-200/80">
                    <div className="flex items-center gap-2">
                      <div className="grid h-7 w-7 place-items-center rounded-lg bg-red-700 text-white shadow-xs">
                        <MapPin size={14} />
                      </div>
                      <div>
                        <h2 className="text-xs sm:text-sm font-extrabold text-slate-950">
                          {cawanganName}
                        </h2>
                        <p className="text-[10px] text-slate-400">
                          {levelEntries.length} peringkat berdaftar di cawangan ini
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-extrabold text-red-800">
                      <Award size={12} /> {branchData.total} sijil
                    </span>
                  </div>

                  {/* Di dalam Cawangan: Kumpulan Mengikut Peringkat (Level 2) */}
                  <div className="p-3 sm:p-4 space-y-3.5 bg-slate-50/40">
                    {levelEntries.map(([peringkatName, certList]) => {
                      const rankMeta = getRankMeta(peringkatName);

                      return (
                        <div
                          key={peringkatName}
                          className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs"
                        >
                          {/* Header Peringkat Di Dalam Cawangan */}
                          <div className="flex items-center justify-between px-3.5 py-2 bg-white border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <span className={`h-2.5 w-2.5 rounded-full ${rankMeta.dot}`} />
                              <h3 className="text-xs font-extrabold text-slate-900">
                                {peringkatName}
                              </h3>
                            </div>
                            <Chip color={rankMeta.chip}>
                              {certList.length} sijil
                            </Chip>
                          </div>

                          {/* Senarai Sijil Di Bawah Peringkat Ini */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-[#FAFBF9] text-[9px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                                <tr>
                                  <th className="w-9 px-2 py-2 text-center">
                                    <input
                                      type="checkbox"
                                      aria-label="Pilih semua sijil peringkat ini"
                                      checked={certList.length > 0 && certList.every((c) => selectedIds.has(c.id))}
                                      onChange={() => toggleGroupSelect(certList)}
                                      className="h-3.5 w-3.5 rounded border-slate-300 text-red-700 focus:ring-red-500 cursor-pointer"
                                      title={
                                        certList.length > 0 && certList.every((c) => selectedIds.has(c.id))
                                          ? 'Nyahpilih semua dalam peringkat ini'
                                          : 'Pilih semua dalam peringkat ini'
                                      }
                                    />
                                  </th>
                                  <th className="w-8 px-2 py-2 text-center">Bil.</th>
                                  <th className="px-3 py-2">Nama Pesilat</th>
                                  <th className="px-3 py-2">No. KP / ID</th>
                                  <th className="px-3 py-2">Nama Sijil</th>
                                  <th className="px-3 py-2">Tarikh Dikeluarkan</th>
                                  <th className="px-3 py-2">Format</th>
                                  <th className="px-3 py-2 text-right">Tindakan</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {certList.map((r, idx) => (
                                  <tr
                                    key={r.id}
                                    className={`transition ${selectedIds.has(r.id) ? 'bg-red-50/70 border-y border-red-200' : 'hover:bg-slate-50/80'}`}
                                  >
                                    <td className="px-2 py-2 text-center">
                                      <input
                                        type="checkbox"
                                        aria-label={`Pilih sijil ${r.nama_penuh}`}
                                        checked={selectedIds.has(r.id)}
                                        onChange={() => toggleSelect(r.id)}
                                        className="h-3.5 w-3.5 rounded border-slate-300 text-red-700 focus:ring-red-500 cursor-pointer"
                                      />
                                    </td>
                                    <td className="px-2 py-2 text-center font-mono text-slate-400 text-[10px]">
                                      {idx + 1}
                                    </td>
                                    <td className="px-3 py-2">
                                      <span className="font-bold text-slate-950 text-xs sm:text-sm">
                                        {r.nama_penuh}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                                      {r.no_kp_atau_id || '—'}
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-1 font-semibold text-slate-800 text-xs">
                                        <FileText size={13} className="text-red-600 shrink-0" />
                                        <span className="truncate max-w-[220px]" title={r.nama_sijil}>
                                          {r.nama_sijil}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-slate-500 text-[11px] whitespace-nowrap">
                                      <span className="inline-flex items-center gap-1">
                                        <CalendarDays size={11} className="text-slate-400" />
                                        {fmtDate(r.tarikh_isu)}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap">
                                      <span
                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                          r.jenis === 'generated'
                                            ? 'bg-red-50 text-red-700 border-red-200'
                                            : 'bg-amber-50 text-amber-800 border-amber-200'
                                        }`}
                                      >
                                        {r.jenis === 'generated' ? 'Auto PDF' : 'Fail Sendiri'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-right whitespace-nowrap">
                                      <div className="inline-flex items-center gap-1">
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
                                          onClick={() => setTarget(r)}
                                          title="Padam sijil"
                                          aria-label="Padam sijil"
                                          className="rounded-lg bg-rose-50 p-1.5 text-rose-600 transition hover:bg-rose-100"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
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
          /* Paparan Jadual Penuh Bertapis */
          <div className="overflow-x-auto max-h-[calc(100vh-250px)] overflow-y-auto">
            <table className="w-full min-w-[760px] text-left text-xs sm:text-sm">
              <thead className="sticky top-0 z-10 bg-[#FBFCFA] text-[10px] font-extrabold uppercase tracking-[.13em] text-slate-400 border-b border-slate-100 shadow-2xs">
                <tr>
                  <th className="w-10 px-3.5 py-2.5 text-center">
                    <input
                      type="checkbox"
                      aria-label="Pilih semua sijil"
                      checked={data.rows.length > 0 && data.rows.every((c) => selectedIds.has(c.id))}
                      onChange={() => toggleSelectAllVisible(data.rows)}
                      className="h-4 w-4 rounded border-slate-300 text-red-700 focus:ring-red-500 cursor-pointer"
                      title={
                        data.rows.length > 0 && data.rows.every((c) => selectedIds.has(c.id))
                          ? 'Nyahpilih semua sijil'
                          : 'Pilih semua sijil'
                      }
                    />
                  </th>
                  <th className="px-3.5 py-2.5">Nama Pesilat</th>
                  <th className="px-3.5 py-2.5">Cawangan</th>
                  <th className="px-3.5 py-2.5">Peringkat</th>
                  <th className="px-3.5 py-2.5">Nama Sijil</th>
                  <th className="px-3.5 py-2.5">Tarikh</th>
                  <th className="px-3.5 py-2.5">Format</th>
                  <th className="px-3.5 py-2.5 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.rows.map((r) => {
                  const rankMeta = getRankMeta(r.peringkat);

                  return (
                    <tr
                      key={r.id}
                      className={`transition ${selectedIds.has(r.id) ? 'bg-red-50/70 border-y border-red-200' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-3.5 py-2.5 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Pilih sijil ${r.nama_penuh}`}
                          checked={selectedIds.has(r.id)}
                          onChange={() => toggleSelect(r.id)}
                          className="h-4 w-4 rounded border-slate-300 text-red-700 focus:ring-red-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="font-bold text-slate-950 text-xs sm:text-sm">{r.nama_penuh}</div>
                        <div className="text-[10px] text-slate-400">{r.no_kp_atau_id || '—'}</div>
                      </td>
                      <td className="px-3.5 py-2.5 font-semibold text-slate-700 whitespace-nowrap text-xs">
                        {r.cawangan}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <Chip color={rankMeta.chip}>{r.peringkat}</Chip>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
                          <FileText className="shrink-0 text-red-600" size={14} />
                          <span className="truncate max-w-[240px]" title={r.nama_sijil}>
                            {r.nama_sijil}
                          </span>
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                        {fmtDate(r.tarikh_isu)}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <Chip color={r.jenis === 'generated' ? 'red' : 'gold'}>
                          {r.jenis === 'generated' ? 'Auto PDF' : 'Fail Sendiri'}
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
        )}
      </Panel>

      <CertificateForm open={modal} onClose={() => setModal(false)} onSaved={load} />

      <Confirm
        open={!!target}
        onClose={() => setTarget(null)}
        onConfirm={remove}
        busy={busy}
        title={t('confirmDeleteCertTitle')}
        message={lang === 'eng' ? `Certificate "${target?.nama_sijil || ''}" for ${target?.nama_penuh || ''} will be permanently deleted and its public verification link revoked.` : `Sijil “${target?.nama_sijil || ''}” untuk ${target?.nama_penuh || ''} akan dipadam secara kekal dan pautan awamnya tidak lagi sah.`}
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
