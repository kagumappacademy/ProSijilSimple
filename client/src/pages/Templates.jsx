import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  RefreshCw,
  Move,
  Sliders,
  Type,
  Palette,
  Check,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  AlignCenter,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, fmtDate } from '../lib/api';
import { PageIntro, Panel, Button, Input, Modal, Confirm, Loading, Empty, Chip } from '../components/UI';
import { PdfThumbnail, renderPdfBlobToDataUrl } from '../components/PdfThumbnail';
import { useLang } from '../lib/i18n';
import { useSync } from '../lib/syncContext';
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

const FONT_OPTIONS = [
  { id: 'Lora', name: 'Lora', style: "'Lora', serif", desc: 'Serif Rasmi & Elegan (Lalai)' },
  { id: 'Helvetica', name: 'Helvetica', style: 'Helvetica, Arial, sans-serif', desc: 'Sans-Serif Bersih & Jelas' },
  { id: 'Times-Roman', name: 'Times-Roman', style: "'Times New Roman', Times, serif", desc: 'Serif Tradisional' },
  { id: 'Courier', name: 'Courier', style: "'Courier New', Courier, monospace", desc: 'Monospace Mesin Taip' },
];

const COLOR_SWATCHES = [
  { hex: '#c1362d', name: 'Merah Rasmi' },
  { hex: '#111827', name: 'Hitam Pekat' },
  { hex: '#b45309', name: 'Emas Diraja' },
  { hex: '#1e3a8a', name: 'Biru Tua' },
  { hex: '#065f46', name: 'Hijau Zamrud' },
  { hex: '#831843', name: 'Merah Marun' },
];

const SAMPLE_NAMES = [
  { label: 'Sederhana', name: 'MUHAMMAD ADAM BIN ABDULLAH' },
  { label: 'Pendek', name: 'ALI BIN ABU' },
  { label: 'Panjang', name: "SITI NUR AISYAH BINTI DATO' MOHAMMAD KHAIRUL ANUAR" },
];

const BELT_RANKS_PRESETS = LEVEL_RANK_ORDER;

const PENCAPAIAN_PRESETS = [
  'Semua Peringkat',
];

const PENGHARGAAN_PRESETS = [
  'Semua Peringkat',
];

const PENYERTAAN_PRESETS = [
  'Semua Peringkat',
];

/**
 * Komponen Interaktif Visual Drag & Drop untuk Mengatur Posisi dan Gaya Teks Nama pada Sijil.
 * Menyokong Drag dengan Tetikus (Mouse) & Sentuhan Skrin (Touch di Telefon Pintar).
 */
function DraggableCertificateTextPositioner({
  imageSrc,
  xPercent = 52.35,
  yPercent = 42.82,
  onChangePos,
  fontSize = 20,
  fontFamily = 'Lora',
  colorHex = '#c1362d',
  nameLayout = 'auto',
  sampleName = 'MUHAMMAD ADAM BIN ABDULLAH',
}) {
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState(500);

  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.clientWidth || 500);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const handlePointer = useCallback(
    (clientX, clientY) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = Math.min(Math.max(5, ((clientX - rect.left) / rect.width) * 100), 95);
      const y = Math.min(Math.max(5, ((clientY - rect.top) / rect.height) * 100), 95);
      onChangePos(Number(x.toFixed(2)), Number(y.toFixed(2)));
    },
    [onChangePos]
  );

  const onPointerDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    handlePointer(e.clientX, e.clientY);
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    handlePointer(e.clientX, e.clientY);
  };

  const onPointerUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch (_) {}
    }
  };

  // Preview font family style
  const fontObj = FONT_OPTIONS.find((f) => f.id === fontFamily) || FONT_OPTIONS[0];

  // Scale font size proportionally to container width (Standard cert width is ~595px)
  const effectivePx = Math.max(10, Math.round((fontSize * containerWidth) / 595));

  // Determine line split for preview
  const displayLines = useMemo(() => {
    if (nameLayout === 'single') return [sampleName];
    if (nameLayout === 'double') {
      const words = sampleName.trim().split(/\s+/);
      if (words.length <= 1) return [sampleName];
      const mid = Math.ceil(words.length / 2);
      return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
    }
    // 'auto'
    if (sampleName.length > 28) {
      const words = sampleName.trim().split(/\s+/);
      const mid = Math.ceil(words.length / 2);
      return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
    }
    return [sampleName];
  }, [sampleName, nameLayout]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-bold text-slate-700 flex items-center gap-1.5">
          <Move size={14} className="text-red-600" />
          Kawasan Pratonton & Posisi Nama (Boleh Ditarik):
        </span>
        <div className="flex items-center gap-1.5 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
          <span className="text-slate-500">X:</span>
          <span className="font-bold text-slate-900">{xPercent}%</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">Y:</span>
          <span className="font-bold text-slate-900">{yPercent}%</span>
        </div>
      </div>

      {/* Canvas Container with Pointer / Touch Dragging */}
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`relative w-full rounded-xl border border-slate-300 overflow-hidden bg-slate-100 select-none touch-none shadow-inner ${
          isDragging ? 'cursor-grabbing ring-2 ring-red-500' : 'cursor-crosshair'
        }`}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt="Pratonton Sijil"
            className="w-full h-auto block pointer-events-none select-none"
            draggable={false}
          />
        ) : (
          <div className="w-full aspect-[1/1.414] flex flex-col items-center justify-center text-slate-400 p-4 text-center">
            <Loader2 size={24} className="animate-spin text-red-600 mb-2" />
            <span className="text-xs font-semibold">Menjana visual sijil...</span>
          </div>
        )}

        {/* Crosshair Guidelines when dragging */}
        {isDragging && (
          <>
            <div
              className="absolute top-0 bottom-0 border-l border-red-500/60 pointer-events-none"
              style={{ left: `${xPercent}%` }}
            />
            <div
              className="absolute left-0 right-0 border-t border-red-500/60 pointer-events-none"
              style={{ top: `${yPercent}%` }}
            />
          </>
        )}

        {/* The Draggable Name Element - Centered Exactly at (xPercent, yPercent) */}
        <div
          style={{
            left: `${xPercent}%`,
            top: `${yPercent}%`,
            transform: 'translate(-50%, -50%)',
          }}
          className={`absolute pointer-events-none transition-transform duration-75 select-none max-w-[90%] text-center ${
            isDragging ? 'scale-105' : ''
          }`}
        >
          {/* Subtle Drag Handle Floating Above - Does NOT push the text down */}
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none flex items-center justify-center gap-1 text-[8px] font-bold text-slate-700 uppercase tracking-wider select-none">
            <Move size={8} className="text-red-600" />
            <span>Tarik Untuk Ubah Posisi</span>
          </div>

          {/* Dotted Guideline Box wrapping the Text */}
          <div
            className={`px-2 py-0.5 rounded border border-dashed text-center ${
              isDragging
                ? 'border-red-500 ring-2 ring-red-400/40 bg-red-500/5'
                : 'border-red-500/60'
            }`}
          >
            {/* Rendered Text */}
            <div
              style={{
                fontFamily: fontObj.style,
                fontSize: `${effectivePx}px`,
                color: colorHex,
                fontWeight: 'bold',
                lineHeight: 1.25,
              }}
              className="tracking-wide select-none drop-shadow-xs truncate max-w-full"
            >
              {displayLines.map((line, idx) => (
                <div key={idx} className="truncate">
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Alignment Helpers & Nudge Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChangePos(50, yPercent)}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 transition cursor-pointer active:scale-95"
            title="Tengahkan secara mendatar (X = 50%)"
          >
            <AlignCenter size={12} />
            <span>Tengah (X: 50%)</span>
          </button>
          <button
            type="button"
            onClick={() => onChangePos(52.35, 42.82)}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 transition cursor-pointer active:scale-95"
            title="Reset ke posisi lalai sistem (X: 52.35%, Y: 42.82%)"
          >
            <RotateCcw size={12} />
            <span>Posisi Lalai</span>
          </button>
        </div>

        {/* Nudge Arrow Buttons */}
        <div className="inline-flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => onChangePos(Math.max(5, Number((xPercent - 0.5).toFixed(2))), yPercent)}
            className="p-1 rounded hover:bg-white text-slate-700 transition cursor-pointer active:scale-90"
            title="Gerak ke Kiri 0.5%"
          >
            <ArrowLeft size={12} />
          </button>
          <button
            type="button"
            onClick={() => onChangePos(xPercent, Math.max(5, Number((yPercent - 0.5).toFixed(2))))}
            className="p-1 rounded hover:bg-white text-slate-700 transition cursor-pointer active:scale-90"
            title="Gerak ke Atas 0.5%"
          >
            <ArrowUp size={12} />
          </button>
          <button
            type="button"
            onClick={() => onChangePos(xPercent, Math.min(95, Number((yPercent + 0.5).toFixed(2))))}
            className="p-1 rounded hover:bg-white text-slate-700 transition cursor-pointer active:scale-90"
            title="Gerak ke Bawah 0.5%"
          >
            <ArrowDown size={12} />
          </button>
          <button
            type="button"
            onClick={() => onChangePos(Math.min(95, Number((xPercent + 0.5).toFixed(2))), yPercent)}
            className="p-1 rounded hover:bg-white text-slate-700 transition cursor-pointer active:scale-90"
            title="Gerak ke Kanan 0.5%"
          >
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function UploadTemplateModal({ open, onClose, onSaved }) {
  const [step, setStep] = useState(1); // 1 = Fail & Maklumat, 2 = Reka Bentuk & Posisi
  const [file, setFile] = useState(null);
  const [filePage1, setFilePage1] = useState(null);
  const [filePage2, setFilePage2] = useState(null);
  const [pageCount, setPageCount] = useState(1); // 1 or 2
  const [uploadMode2P, setUploadMode2P] = useState('single'); // 'single' (1 file with 2 pages) or 'split' (2 separate files)
  const [kategori, setKategori] = useState('kenaikan_tali_pinggang');
  const [nama, setNama] = useState('Sijil Ujian Kenaikan Tali Pinggang (Penggal 1/2026)');
  const [peringkat, setPeringkat] = useState('Ujian Awan Putih Cula Merah 1');
  const [keterangan, setKeterangan] = useState('');
  const [busy, setBusy] = useState(false);

  // Step 2 Layout & Typography state
  const [page1PreviewUrl, setPage1PreviewUrl] = useState(null);
  const [renderingPreview, setRenderingPreview] = useState(false);
  const [fontSize, setFontSize] = useState(20);
  const [fontFamily, setFontFamily] = useState('Lora');
  const [colorHex, setColorHex] = useState('#c1362d');
  const [nameLayout, setNameLayout] = useState('auto'); // 'auto', 'single', 'double'
  const [xPercent, setXPercent] = useState(52.35);
  const [yPercent, setYPercent] = useState(42.82);
  const [sampleName, setSampleName] = useState('MUHAMMAD ADAM BIN ABDULLAH');

  // Sync default name & rank suggestions when category changes
  const handleCategoryChange = (newCat) => {
    setKategori(newCat);
    if (newCat === 'kenaikan_tali_pinggang') {
      setNama('Sijil Ujian Kenaikan Tali Pinggang (Penggal 1/2026)');
      setPeringkat('Ujian Awan Putih Cula Merah 1');
    } else if (newCat === 'pencapaian') {
      setNama('Sijil Pencapaian Kejohanan Silat');
      setPeringkat('Semua Peringkat');
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
      setStep(1);
      setFile(null);
      setFilePage1(null);
      setFilePage2(null);
      setPageCount(1);
      setUploadMode2P('single');
      setKategori('kenaikan_tali_pinggang');
      setNama('Sijil Ujian Kenaikan Tali Pinggang (Penggal 1/2026)');
      setPeringkat('Ujian Awan Putih Cula Merah 1');
      setKeterangan('');
      setPage1PreviewUrl(null);
      setFontSize(20);
      setFontFamily('Lora');
      setColorHex('#c1362d');
      setNameLayout('auto');
      setXPercent(52.35);
      setYPercent(42.82);
      setSampleName('MUHAMMAD ADAM BIN ABDULLAH');
    }
  }, [open]);

  // Peralihan dari Langkah 1 ke Langkah 2: Jana Pratonton Halaman 1
  async function handleGoToStep2() {
    if (pageCount === 1) {
      if (!file) return toast.error('Sila pilih fail PDF templat 1 muka surat.');
      if (!file.name.toLowerCase().endsWith('.pdf')) return toast.error('Fail mestilah format .pdf.');
      if (file.size > 4.2 * 1024 * 1024) return toast.error('Saiz fail melebihi had maksima 4.2MB.');
    } else {
      if (uploadMode2P === 'split') {
        if (!filePage1) return toast.error('Sila pilih fail PDF untuk Halaman 1 (Muka Hadapan).');
        if (!filePage2) return toast.error('Sila pilih fail PDF untuk Halaman 2 (Muka Belakang).');
        if (!filePage1.name.toLowerCase().endsWith('.pdf') || !filePage2.name.toLowerCase().endsWith('.pdf')) {
          return toast.error('Kedua-dua fail mestilah dalam format .pdf.');
        }
      } else {
        if (!file) return toast.error('Sila pilih fail PDF templat 2 muka surat.');
        if (!file.name.toLowerCase().endsWith('.pdf')) return toast.error('Fail mestilah format .pdf.');
      }
    }

    if (nama.trim().length < 3) return toast.error('Sila masukkan nama templat sijil.');
    if (kategori === 'kenaikan_tali_pinggang' && !peringkat.trim()) {
      return toast.error('Sila pilih atau masukkan peringkat pesilat.');
    }

    const targetFile = (pageCount === 2 && uploadMode2P === 'split') ? filePage1 : file;
    if (!targetFile) return toast.error('Fail PDF tidak ditemui.');

    setRenderingPreview(true);
    try {
      const dataUrl = await renderPdfBlobToDataUrl(targetFile, 1, 1.35);
      setPage1PreviewUrl(dataUrl);
      setStep(2);
    } catch (err) {
      toast.error('Gagal memproses paparan PDF: ' + (err.message || 'Ralat membaca fail'));
    } finally {
      setRenderingPreview(false);
    }
  }

  async function submitFinal(e) {
    if (e) e.preventDefault();

    const form = new FormData();
    form.append('page_count', String(pageCount));
    if (pageCount === 2 && uploadMode2P === 'split') {
      form.append('file_page1', filePage1);
      form.append('file_page2', filePage2);
    } else {
      form.append('file', file);
    }
    form.append('nama_template', nama.trim());
    form.append('kategori', kategori);
    form.append('peringkat', kategori === 'kenaikan_tali_pinggang' ? peringkat.trim() : 'Semua Peringkat');
    form.append('keterangan', keterangan.trim());

    if (page1PreviewUrl) {
      form.append('thumbnail', page1PreviewUrl);
    }

    const layoutConfig = {
      fontSize,
      fontFamily,
      colorHex,
      nameLayout,
      xPercent,
      yPercent,
    };
    form.append('layout_config', JSON.stringify(layoutConfig));

    setBusy(true);
    try {
      await api('/admin/templates', { method: 'POST', body: form });
      toast.success(
        pageCount === 2
          ? 'Templat sijil 2 muka surat berjaya dimuat naik dengan susun atur tersuai!'
          : 'Templat sijil 1 muka surat berjaya dimuat naik dengan susun atur tersuai!'
      );
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
      {/* Stepper Progress Bar */}
      <div className="mb-5 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
          <div
            onClick={() => step === 2 && setStep(1)}
            className={`flex items-center gap-2 cursor-pointer transition ${
              step === 1 ? 'text-red-700' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span
              className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-extrabold ${
                step === 1 ? 'bg-red-700 text-white shadow-xs' : 'bg-emerald-600 text-white'
              }`}
            >
              {step > 1 ? <Check size={13} /> : '1'}
            </span>
            <span className="font-bold">Langkah 1: Fail & Maklumat Sijil</span>
          </div>

          <div
            className={`flex items-center gap-2 transition ${
              step === 2 ? 'text-red-700' : 'text-slate-400'
            }`}
          >
            <span
              className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-extrabold ${
                step === 2 ? 'bg-red-700 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
              }`}
            >
              2
            </span>
            <span className="font-bold">Langkah 2: Reka Bentuk & Posisi Nama</span>
          </div>
        </div>

        {/* Visual Progress Bar Track */}
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-600 transition-all duration-300 rounded-full"
            style={{ width: step === 1 ? '50%' : '100%' }}
          />
        </div>
      </div>

      {step === 1 ? (
        /* ================= LANGKAH 1: FAIL & MAKLUMAT ================= */
        <div className="space-y-4">
          {/* PILIHAN 1 PAGE ATAU 2 PAGE */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Pilihan Format Halaman Sijil *</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPageCount(1)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  pageCount === 1
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold">1 Muka Surat (1 Page)</span>
                  <FileText size={16} className={pageCount === 1 ? 'text-white' : 'text-slate-400'} />
                </div>
                <p className={`text-[11px] mt-1 ${pageCount === 1 ? 'text-slate-300' : 'text-slate-500'}`}>
                  Sijil sehelai (muka hadapan sahaja dengan ruangan nama)
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPageCount(2)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  pageCount === 2
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold">2 Muka Surat (2 Pages)</span>
                  <Layers size={16} className={pageCount === 2 ? 'text-white' : 'text-slate-400'} />
                </div>
                <p className={`text-[11px] mt-1 ${pageCount === 2 ? 'text-slate-300' : 'text-slate-500'}`}>
                  Sijil dua helai (Depan dengan nama & Belakang sukatan/silabus)
                </p>
              </button>
            </div>
          </div>

          {/* ZON MUAT NAIK MENGIKUT PILIHAN 1 ATAU 2 PAGE */}
          {pageCount === 1 ? (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Fail Templat PDF (1 Muka Surat) *</label>
              <label className="flex min-h-[105px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-center transition hover:border-slate-500 hover:bg-slate-50">
                <UploadCloud size={24} className="text-slate-600 mb-1" />
                <div className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-full">
                  {file ? file.name : 'Pilih fail PDF templat 1 muka surat'}
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">PDF standard (maksima 4.2MB). Mengandungi garisan ruangan nama pesilat.</p>
                {file && (
                  <span className="mt-1.5 text-[11px] font-semibold text-slate-800 bg-slate-200 px-2.5 py-0.5 rounded-md">
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
          ) : (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="block text-xs font-semibold text-slate-700">Kaedah Muat Naik 2 Muka Surat *</label>
                <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setUploadMode2P('single')}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      uploadMode2P === 'single' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    1 Fail PDF (2 Halaman)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode2P('split')}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                      uploadMode2P === 'split' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    2 Fail Berasingan (Depan & Belakang)
                  </button>
                </div>
              </div>

              {uploadMode2P === 'single' ? (
                <div>
                  <label className="flex min-h-[105px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-center transition hover:border-slate-500 hover:bg-slate-50">
                    <UploadCloud size={24} className="text-slate-600 mb-1" />
                    <div className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-full">
                      {file ? file.name : 'Pilih fail PDF lengkap (mengandungi muka 1 & muka 2)'}
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">Fail PDF tunggal yang mengandungi kedua-dua muka surat depan dan belakang.</p>
                    {file && (
                      <span className="mt-1.5 text-[11px] font-semibold text-slate-800 bg-slate-200 px-2.5 py-0.5 rounded-md">
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
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-700">📄 Halaman 1 (Muka Hadapan) *</label>
                    <label className="flex min-h-[95px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3 text-center transition hover:border-slate-500 hover:bg-slate-50">
                      <UploadCloud size={20} className="text-slate-600 mb-1" />
                      <div className="text-xs font-bold text-slate-900 truncate max-w-full">
                        {filePage1 ? filePage1.name : 'Pilih fail Halaman 1'}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">Muka hadapan sijil (ada ruangan nama)</p>
                      {filePage1 && (
                        <span className="mt-1 text-[10px] font-semibold text-slate-800 bg-slate-200 px-2 py-0.5 rounded">
                          {(filePage1.size / 1024).toFixed(1)} KB
                        </span>
                      )}
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        className="sr-only"
                        onChange={(e) => setFilePage1(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-700">📄 Halaman 2 (Muka Belakang) *</label>
                    <label className="flex min-h-[95px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3 text-center transition hover:border-slate-500 hover:bg-slate-50">
                      <UploadCloud size={20} className="text-slate-600 mb-1" />
                      <div className="text-xs font-bold text-slate-900 truncate max-w-full">
                        {filePage2 ? filePage2.name : 'Pilih fail Halaman 2'}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">Silabus / maklumat belakang sijil</p>
                      {filePage2 && (
                        <span className="mt-1 text-[10px] font-semibold text-slate-800 bg-slate-200 px-2 py-0.5 rounded">
                          {(filePage2.size / 1024).toFixed(1)} KB
                        </span>
                      )}
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        className="sr-only"
                        onChange={(e) => setFilePage2(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pilihan Jenis / Kategori Sijil */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Jenis / Kategori Sijil *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CERT_CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    kategori === cat.id
                      ? 'border-slate-900 bg-slate-900 text-white font-bold shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="text-base sm:text-lg mb-0.5">{cat.emoji}</span>
                  <span className="text-[11px] leading-tight font-bold">{cat.shortLabel}</span>
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

          {/* Padanan Peringkat / Warna Cula Pesilat - Hanya untuk Sijil Kenaikan Tali Pinggang */}
          {kategori === 'kenaikan_tali_pinggang' && (
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-600">
                Padanan Peringkat / Warna Cula Pesilat *
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
                Sistem memadankan templat ini mengikut warna cula dan peringkat bengkung pesilat.
              </p>
            </div>
          )}

          <Input
            label="Keterangan / Catatan (Pilihan)"
            placeholder="Contoh: Kejohanan Silat Daerah 2026 / Penggal Pertama"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={onClose} className="text-xs">
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleGoToStep2}
              loading={renderingPreview}
              className="text-xs inline-flex items-center gap-1.5"
            >
              <span>Seterusnya: Reka Bentuk & Posisi Nama</span>
              <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      ) : (
        /* ================= LANGKAH 2: REKA BENTUK & POSISI NAMA ================= */
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Ruangan Kiri: Visual Canvas Drag & Drop */}
            <div className="lg:col-span-7">
              <DraggableCertificateTextPositioner
                imageSrc={page1PreviewUrl}
                xPercent={xPercent}
                yPercent={yPercent}
                onChangePos={(x, y) => {
                  setXPercent(x);
                  setYPercent(y);
                }}
                fontSize={fontSize}
                fontFamily={fontFamily}
                colorHex={colorHex}
                nameLayout={nameLayout}
                sampleName={sampleName}
              />
            </div>

            {/* Ruangan Kanan: Kawalan Tipografi, Saiz, Warna & Susunan Baris */}
            <div className="lg:col-span-5 space-y-4">
              {/* 1. Pilihan Fon */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Type size={14} className="text-red-600" />
                  <span>Pilihan Jenis Fon:</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {FONT_OPTIONS.map((f) => (
                    <button
                      type="button"
                      key={f.id}
                      onClick={() => setFontFamily(f.id)}
                      className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                        fontFamily === f.id
                          ? 'border-red-600 bg-red-50/70 text-red-950 font-bold ring-1 ring-red-400'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold" style={{ fontFamily: f.style }}>
                        {f.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Saiz Fon Slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5 text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Sliders size={14} className="text-red-600" />
                    <span>Saiz Fon:</span>
                  </span>
                  <span className="font-mono bg-slate-100 text-slate-900 px-2 py-0.5 rounded border border-slate-200">
                    {fontSize} pt
                  </span>
                </div>
                <input
                  type="range"
                  min="14"
                  max="36"
                  step="1"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full accent-red-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>Kecil (14pt)</span>
                  <span>Lalai (20pt)</span>
                  <span>Besar (36pt)</span>
                </div>
              </div>

              {/* 3. Warna Fon */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Palette size={14} className="text-red-600" />
                  <span>Warna Teks Nama:</span>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {COLOR_SWATCHES.map((c) => (
                    <button
                      type="button"
                      key={c.hex}
                      onClick={() => setColorHex(c.hex)}
                      title={c.name}
                      className={`h-7 w-7 rounded-full transition-transform cursor-pointer relative flex items-center justify-center ${
                        colorHex.toLowerCase() === c.hex.toLowerCase()
                          ? 'ring-2 ring-offset-2 ring-slate-900 scale-110 shadow-sm'
                          : 'hover:scale-105 border border-black/10'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {colorHex.toLowerCase() === c.hex.toLowerCase() && (
                        <Check size={12} className="text-white drop-shadow" />
                      )}
                    </button>
                  ))}
                  {/* Custom color picker */}
                  <label
                    title="Pilih warna bebas"
                    className="h-7 w-7 rounded-full border border-slate-300 bg-gradient-to-tr from-rose-500 via-amber-400 to-emerald-500 cursor-pointer overflow-hidden relative flex items-center justify-center hover:scale-105 transition"
                  >
                    <input
                      type="color"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="opacity-0 absolute inset-0 cursor-pointer"
                    />
                  </label>
                  <span className="font-mono text-xs text-slate-600 uppercase ml-1">
                    {colorHex}
                  </span>
                </div>
              </div>

              {/* 4. Pilihan Susunan Baris Nama */}
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  Susunan Baris Nama Pesilat:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'auto', label: 'Automatik', desc: 'Pecah jika panjang' },
                    { id: 'single', label: '1 Baris', desc: 'Sentiasa sebaris' },
                    { id: 'double', label: '2 Baris', desc: 'Sentiasa 2 baris' },
                  ].map((mode) => (
                    <button
                      type="button"
                      key={mode.id}
                      onClick={() => setNameLayout(mode.id)}
                      className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                        nameLayout === mode.id
                          ? 'border-slate-900 bg-slate-900 text-white font-bold shadow-2xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">{mode.label}</div>
                      <div
                        className={`text-[9.5px] mt-0.5 ${
                          nameLayout === mode.id ? 'text-slate-300' : 'text-slate-400'
                        }`}
                      >
                        {mode.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Uji Contoh Nama */}
              <div>
                <div className="flex items-center justify-between mb-1 text-xs">
                  <span className="font-bold text-slate-700">Uji Nama Contoh:</span>
                  <div className="flex items-center gap-1">
                    {SAMPLE_NAMES.map((s) => (
                      <button
                        type="button"
                        key={s.label}
                        onClick={() => setSampleName(s.name)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                          sampleName === s.name
                            ? 'bg-red-100 text-red-800 font-bold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  value={sampleName}
                  onChange={(e) => setSampleName(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 uppercase"
                  placeholder="Masukkan sebarang nama contoh..."
                />
              </div>
            </div>
          </div>

          {/* Action Buttons Step 2 */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep(1)}
              className="text-xs inline-flex items-center gap-1"
            >
              <ArrowLeft size={13} />
              <span>Kembali ke Langkah 1</span>
            </Button>

            <Button
              type="button"
              onClick={submitFinal}
              loading={busy}
              className="text-xs inline-flex items-center gap-1.5 bg-red-700 hover:bg-red-800 text-white"
            >
              <UploadCloud size={15} />
              <span>Simpan & Muat Naik Templat Sijil</span>
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/**
 * Modal untuk Mengubah Susun Atur & Posisi Nama bagi Templat yang Telah Sedia Ada
 */
function EditTemplateLayoutModal({ open, onClose, template, onSaved }) {
  const [fontSize, setFontSize] = useState(20);
  const [fontFamily, setFontFamily] = useState('Lora');
  const [colorHex, setColorHex] = useState('#c1362d');
  const [nameLayout, setNameLayout] = useState('auto');
  const [xPercent, setXPercent] = useState(52.35);
  const [yPercent, setYPercent] = useState(42.82);
  const [sampleName, setSampleName] = useState('MUHAMMAD ADAM BIN ABDULLAH');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (template && open) {
      let cfg = null;
      if (typeof template.layout_config === 'string') {
        try { cfg = JSON.parse(template.layout_config); } catch (_) {}
      } else if (typeof template.layout_config === 'object') {
        cfg = template.layout_config;
      }
      setFontSize(Number(cfg?.fontSize) || 20);
      setFontFamily(cfg?.fontFamily || 'Lora');
      setColorHex(cfg?.colorHex || '#c1362d');
      setNameLayout(cfg?.nameLayout || 'auto');
      setXPercent(Number(cfg?.xPercent) || 52.35);
      setYPercent(Number(cfg?.yPercent) || 42.82);
      setSampleName('MUHAMMAD ADAM BIN ABDULLAH');
    }
  }, [template, open]);

  if (!template) return null;

  const previewImage = template.thumbnail_base64 || `/api/admin/templates/${template.id}/thumbnail`;

  async function handleSave() {
    setBusy(true);
    try {
      const layoutConfig = {
        fontSize,
        fontFamily,
        colorHex,
        nameLayout,
        xPercent,
        yPercent,
      };
      await api(`/admin/templates/${template.id}/layout`, {
        method: 'POST',
        body: { layout_config: layoutConfig },
      });
      toast.success('Susun atur templat berjaya dikemaskini!');
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Gagal mengemaskini susun atur: ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={template.kategori === 'kenaikan_tali_pinggang'
        ? `Ubah Posisi & Gaya Nama: ${template.peringkat}`
        : `Ubah Posisi & Gaya Nama: ${template.nama_template}`}
      wide
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7">
            <DraggableCertificateTextPositioner
              imageSrc={previewImage}
              xPercent={xPercent}
              yPercent={yPercent}
              onChangePos={(x, y) => {
                setXPercent(x);
                setYPercent(y);
              }}
              fontSize={fontSize}
              fontFamily={fontFamily}
              colorHex={colorHex}
              nameLayout={nameLayout}
              sampleName={sampleName}
            />
          </div>

          <div className="lg:col-span-5 space-y-4">
            {/* Pilihan Fon */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Type size={14} className="text-red-600" />
                <span>Pilihan Jenis Fon:</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {FONT_OPTIONS.map((f) => (
                  <button
                    type="button"
                    key={f.id}
                    onClick={() => setFontFamily(f.id)}
                    className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                      fontFamily === f.id
                        ? 'border-red-600 bg-red-50/70 text-red-950 font-bold ring-1 ring-red-400'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold" style={{ fontFamily: f.style }}>
                      {f.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{f.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Saiz Fon */}
            <div>
              <div className="flex items-center justify-between mb-1.5 text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Sliders size={14} className="text-red-600" />
                  <span>Saiz Fon:</span>
                </span>
                <span className="font-mono bg-slate-100 text-slate-900 px-2 py-0.5 rounded border border-slate-200">
                  {fontSize} pt
                </span>
              </div>
              <input
                type="range"
                min="14"
                max="36"
                step="1"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full accent-red-600 cursor-pointer"
              />
            </div>

            {/* Warna Fon */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Palette size={14} className="text-red-600" />
                <span>Warna Teks Nama:</span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {COLOR_SWATCHES.map((c) => (
                  <button
                    type="button"
                    key={c.hex}
                    onClick={() => setColorHex(c.hex)}
                    title={c.name}
                    className={`h-7 w-7 rounded-full transition-transform cursor-pointer relative flex items-center justify-center ${
                      colorHex.toLowerCase() === c.hex.toLowerCase()
                        ? 'ring-2 ring-offset-2 ring-slate-900 scale-110 shadow-sm'
                        : 'hover:scale-105 border border-black/10'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {colorHex.toLowerCase() === c.hex.toLowerCase() && (
                      <Check size={12} className="text-white drop-shadow" />
                    )}
                  </button>
                ))}
                <label
                  title="Pilih warna bebas"
                  className="h-7 w-7 rounded-full border border-slate-300 bg-gradient-to-tr from-rose-500 via-amber-400 to-emerald-500 cursor-pointer overflow-hidden relative flex items-center justify-center hover:scale-105 transition"
                >
                  <input
                    type="color"
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    className="opacity-0 absolute inset-0 cursor-pointer"
                  />
                </label>
                <span className="font-mono text-xs text-slate-600 uppercase ml-1">
                  {colorHex}
                </span>
              </div>
            </div>

            {/* Susunan Baris Nama */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Susunan Baris Nama Pesilat:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'auto', label: 'Automatik', desc: 'Pecah jika panjang' },
                  { id: 'single', label: '1 Baris', desc: 'Sentiasa sebaris' },
                  { id: 'double', label: '2 Baris', desc: 'Sentiasa 2 baris' },
                ].map((mode) => (
                  <button
                    type="button"
                    key={mode.id}
                    onClick={() => setNameLayout(mode.id)}
                    className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                      nameLayout === mode.id
                        ? 'border-slate-900 bg-slate-900 text-white font-bold shadow-2xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{mode.label}</div>
                    <div
                      className={`text-[9.5px] mt-0.5 ${
                        nameLayout === mode.id ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                      {mode.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Uji Nama Contoh */}
            <div>
              <div className="flex items-center justify-between mb-1 text-xs">
                <span className="font-bold text-slate-700">Uji Nama Contoh:</span>
                <div className="flex items-center gap-1">
                  {SAMPLE_NAMES.map((s) => (
                    <button
                      type="button"
                      key={s.label}
                      onClick={() => setSampleName(s.name)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                        sampleName === s.name
                          ? 'bg-red-100 text-red-800 font-bold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={sampleName}
                onChange={(e) => setSampleName(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100 uppercase"
                placeholder="Masukkan sebarang nama contoh..."
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} className="text-xs">
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            loading={busy}
            className="text-xs bg-red-700 hover:bg-red-800 text-white"
          >
            Simpan Kemas Kini Susun Atur
          </Button>
        </div>
      </div>
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
          {template.kategori === 'kenaikan_tali_pinggang' && (
            <div className="text-[11px] text-slate-500 mt-0.5">Peringkat: {template.peringkat}</div>
          )}
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
              {template.kategori === 'kenaikan_tali_pinggang' && (
                <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border ${meta.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                  {template.peringkat}
                </span>
              )}
              <span className="inline-flex items-center rounded-md bg-slate-900 text-white px-2 py-0.5 text-xs font-bold shadow-2xs">
                {Number(template.page_count) === 2 ? '2 Muka Surat' : '1 Muka Surat'}
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
            {Number(template.page_count) === 2 ? (
              <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                    page === 1 ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Muka 1 (Depan)
                </button>
                <button
                  type="button"
                  onClick={() => setPage(2)}
                  className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
                    page === 2 ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Muka 2 (Belakang)
                </button>
              </div>
            ) : (
              <span className="inline-flex items-center rounded-md bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs">
                1 Muka Surat (Halaman Penuh)
              </span>
            )}
          </div>
        </div>

        {/* Large High-Resolution Certificate Canvas Preview */}
        <div className="relative mx-auto flex items-center justify-center rounded-2xl border-2 border-slate-200 bg-slate-900/5 p-2 sm:p-5 shadow-inner max-h-[68vh] overflow-auto">
          <div className="relative w-full max-w-[620px] aspect-[1/1.414] overflow-hidden rounded-xl border border-slate-300/80 bg-white shadow-2xl">
            <PdfThumbnail
              url={previewUrl}
              title={template.nama_template}
              thumbnail={page === 1 ? template.thumbnail_base64 : null}
              templateId={template.id}
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
  const [layoutTarget, setLayoutTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Sorting & Filtering State
  const [viewMode, setViewMode] = useState('grid'); // 'grid' (kotak) or 'table'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('semua'); // 'semua', 'kenaikan_tali_pinggang', 'pencapaian', 'penghargaan', 'penyertaan'
  const [filterCula, setFilterCula] = useState('semua'); // 'semua', 'merah', 'kuning', 'hijau', 'hitam'
  const [sortBy, setSortBy] = useState('peringkat'); // 'peringkat', 'terkini', 'nama'

  const { setRefreshing: setGlobalRefreshing } = useSync();
  const [refreshing, setRefreshing] = useState(false);

  const loadTemplates = useCallback((isManual = false) => {
    setGlobalRefreshing(true);
    if (isManual) setRefreshing(true);
    const url = isManual ? '/admin/templates?force_sync=1' : '/admin/templates';
    return api(url)
      .then((res) => {
        setData(res);
        if (isManual) toast.success(lang === 'eng' ? 'Templates updated!' : 'Senarai templat berjaya dikemaskini!');
      })
      .catch((err) => {
        if (isManual) toast.error(err.message);
      })
      .finally(() => {
        if (isManual) setRefreshing(false);
        setGlobalRefreshing(false);
      });
  }, [lang, setGlobalRefreshing]);

  // Initial load & Auto-refresh every 15 seconds
  useEffect(() => {
    loadTemplates(false);
    const timer = setInterval(() => {
      // Background silent auto-refresh every 15s (if modals closed)
      if (!uploadOpen && !deleteTarget && !testTarget) {
        loadTemplates(false);
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [loadTemplates, uploadOpen, deleteTarget, testTarget]);

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
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => loadTemplates(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 shadow-2xs active:scale-95 cursor-pointer disabled:opacity-60"
              title="Muat semula senarai templat dari Cloud (Auto-refresh setiap 15 saat)"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin text-red-600' : ''} />
              <span>{refreshing ? (lang === 'eng' ? 'Refreshing...' : 'Menyegerak...') : (lang === 'eng' ? 'Refresh' : 'Muat Semula')}</span>
            </button>
            <Button onClick={() => setUploadOpen(true)} className="!px-3.5 !py-2 text-xs">
              <Plus size={15} /> {t('btnUploadTemplate')}
            </Button>
          </div>
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
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl text-xs">
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
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit mb-2">
            <button
              type="button"
              onClick={() => {
                setFilterCategory('semua');
                setFilterCula('semua');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                filterCategory === 'semua'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              <span>Semua Jenis Sijil</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${filterCategory === 'semua' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
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
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
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

          {/* TAB 2: Sub-Penapis Cula (Hanya dipaparkan untuk Sijil Kenaikan Tali Pinggang / Semua) */}
          {(filterCategory === 'semua' || filterCategory === 'kenaikan_tali_pinggang') && (
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
                  <span>Warna Cula:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setFilterCula('semua')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    filterCula === 'semua'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
                  }`}
                >
                  Semua Cula ({culaCounts.semua})
                </button>
                {CULA_GROUPS.map((tab) => {
                  const active = filterCula === tab.id;
                  const cCount = culaCounts[tab.id] || 0;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFilterCula(tab.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
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

              {/* Search and Sort Selectors */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                <div className="relative flex-1 sm:w-56">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={lang === 'eng' ? 'Search templates...' : 'Cari templat...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-950 placeholder:text-slate-400 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                  />
                </div>

                <div className="flex items-center gap-1 text-xs text-slate-500 w-full sm:w-auto">
                  <ArrowUpDown size={13} className="text-slate-400 shrink-0" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-red-600"
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

                  {/* Grid Cards for this category */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-slate-50/50 rounded-3xl border border-slate-200/60">
                    {items.map((item) => {
                      const meta = getRankMeta(item.peringkat);
                      const previewUrl = `/api/admin/templates/${item.id}/preview`;

                      return (
                        <div
                          key={item.id}
                          className={`group relative flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xs transition-colors hover:border-slate-400 ${meta.border}`}
                        >
                          <div>
                            {/* Live Certificate Visual Preview */}
                            <div
                              onClick={() => setPreviewTarget(item)}
                              className="relative aspect-[1/1.34] w-full overflow-hidden rounded-lg border border-slate-200/90 bg-slate-50 cursor-pointer group-hover:border-red-500 transition"
                              title="Klik untuk lihat pratonton sijil saiz besar"
                            >
                              <PdfThumbnail
                                url={previewUrl}
                                thumbnail={item.thumbnail_base64}
                                templateId={item.id}
                                title={item.nama_template}
                                scale={0.65}
                                className="h-full w-full pointer-events-none"
                              />

                              {/* Top-left Rank/Category & Page Count Badge on preview */}
                              <div className="absolute top-1.5 left-1.5 z-10 flex flex-wrap items-center gap-1 max-w-[80%]">
                                {item.kategori === 'kenaikan_tali_pinggang' && (
                                  <span
                                    className="inline-flex items-center rounded-md bg-white/95 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-tight text-slate-700 border border-slate-200/90 shadow-2xs truncate"
                                  >
                                    {item.peringkat.replace(/^ujian\s+/i, '')}
                                  </span>
                                )}
                                <span className="inline-flex items-center rounded-md bg-slate-900/90 text-white px-1.5 py-0.5 text-[8px] font-bold shadow-2xs shrink-0">
                                  {Number(item.page_count) === 2 ? '2 Muka' : '1 Muka'}
                                </span>
                              </div>

                              {/* Top-right Quick Zoom Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewTarget(item);
                                }}
                                className="absolute top-1.5 right-1.5 z-10 rounded-md bg-white/95 p-1 text-slate-700 hover:bg-red-50 hover:text-red-700 shadow-2xs border border-slate-200/90 transition"
                                title="Lihat pratonton saiz besar"
                              >
                                <Maximize2 size={12} />
                              </button>
                            </div>

                            {/* Card Details */}
                            <div className="mt-2 min-w-0">
                              <div
                                className="text-[11px] font-extrabold text-slate-950 truncate cursor-pointer hover:text-red-700 transition"
                                title={item.kategori === 'kenaikan_tali_pinggang' ? item.peringkat : item.nama_template}
                                onClick={() => setPreviewTarget(item)}
                              >
                                {item.kategori === 'kenaikan_tali_pinggang' ? item.peringkat : item.nama_template}
                              </div>
                              {item.kategori === 'kenaikan_tali_pinggang' ? (
                                <div className="text-[10px] text-slate-500 truncate mt-0.5" title={item.nama_template}>
                                  {item.nama_template}
                                </div>
                              ) : (
                                item.keterangan && (
                                  <div className="text-[10px] text-slate-500 truncate mt-0.5" title={item.keterangan}>
                                    {item.keterangan}
                                  </div>
                                )
                              )}
                            </div>
                          </div>

                          {/* Card Actions Footer - Muat Sempurna & Kemas Tanpa Terkeluar di Telefon */}
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 w-full min-w-0">
                            <button
                              type="button"
                              onClick={() => setTestTarget(item)}
                              className="flex-1 rounded-md bg-slate-100 px-2 py-1.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-200 transition-colors inline-flex items-center justify-center gap-1"
                              title="Uji janaan nama pada templat"
                            >
                              <Play size={10} />
                              <span>Uji</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setLayoutTarget(item)}
                              className="rounded-lg bg-slate-100 p-1.5 text-slate-700 hover:bg-slate-200 transition active:scale-95 shrink-0"
                              title="Ubah posisi & reka bentuk nama (fon, saiz, warna, drag & drop)"
                            >
                              <Sliders size={13} />
                            </button>

                            <a
                              href={previewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-red-50 hover:text-red-700 transition active:scale-95 shrink-0"
                              title="Buka fail PDF asal"
                            >
                              <Eye size={13} />
                            </a>

                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              className="rounded-lg bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 transition active:scale-95 shrink-0"
                              title="Padam templat ini"
                            >
                              <Trash2 size={13} />
                            </button>
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
            <div className="block md:hidden p-3 space-y-3">
              {filteredTemplates.map((item) => {
                const meta = getRankMeta(item.peringkat);
                const catMeta = getCategoryMeta(getCertCategory(item));
                const previewUrl = `/api/admin/templates/${item.id}/preview`;
                return (
                  <div key={item.id} className="rounded-2xl border border-slate-200/90 bg-white p-3.5 space-y-3 shadow-2xs">
                    {/* Baris Atas: Thumbnail Tetap + Butiran Templat */}
                    <div className="flex items-start gap-3">
                      {/* Thumbnail Saiz Tetap & Tidak Boleh Terlebih Lebar */}
                      <div
                        onClick={() => setPreviewTarget(item)}
                        className="w-[72px] h-[98px] shrink-0 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-2xs cursor-pointer hover:border-red-500 transition relative group/thumb"
                        title="Klik untuk besarkan pratonton"
                      >
                        <PdfThumbnail
                          url={previewUrl}
                          thumbnail={item.thumbnail_base64}
                          templateId={item.id}
                          title={item.nama_template}
                          scale={0.7}
                          className="h-full w-full object-contain"
                        />
                        <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition">
                          <Maximize2 size={13} className="text-white" />
                        </div>
                      </div>

                      {/* Maklumat Templat: Kategori, Peringkat & Nama Penuh */}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Chip color={catMeta.chip}>{catMeta.shortLabel}</Chip>
                          {item.kategori === 'kenaikan_tali_pinggang' && (
                            <Chip color={meta.chip}>{item.peringkat}</Chip>
                          )}
                          <span className="inline-flex items-center rounded-md bg-slate-900 text-white px-1.5 py-0.5 text-[9px] font-bold">
                            {Number(item.page_count) === 2 ? '2 Muka' : '1 Muka'}
                          </span>
                        </div>

                        <div
                          onClick={() => setPreviewTarget(item)}
                          className="font-extrabold text-slate-950 text-xs sm:text-sm leading-snug cursor-pointer hover:text-red-700 transition break-words"
                        >
                          {item.nama_template}
                        </div>

                        {item.keterangan && (
                          <div className="text-[11px] text-slate-500 break-words line-clamp-2">
                            {item.keterangan}
                          </div>
                        )}

                        <div className="text-[10px] text-slate-400 font-medium">
                          Dimuat naik: {fmtDate(item.created_at.slice(0, 10))}
                        </div>
                      </div>
                    </div>

                    {/* Baris Bawah: Butang Tindakan yang Tersusun Kemas untuk Telefon */}
                    <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewTarget(item)}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-50 border border-red-200/70 px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 transition active:scale-95"
                          title="Besarkan pratonton sijil"
                        >
                          <Maximize2 size={12} />
                          <span>Pratonton</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setLayoutTarget(item)}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition active:scale-95"
                          title="Ubah posisi & reka bentuk nama"
                        >
                          <Sliders size={12} />
                          <span>Posisi</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setTestTarget(item)}
                          title="Uji janaan nama pada templat"
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition active:scale-95"
                        >
                          <Play size={12} />
                          <span>Uji</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-slate-100 border border-slate-200 p-2 text-slate-600 transition hover:bg-red-50 hover:text-red-800"
                          title="Lihat fail PDF asal"
                        >
                          <Eye size={14} />
                        </a>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-100"
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
                    <th className="px-3.5 py-2.5">Halaman</th>
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
                            <PdfThumbnail
                          url={previewUrl}
                          thumbnail={item.thumbnail_base64}
                          templateId={item.id}
                          title={item.nama_template}
                          scale={0.7}
                          className="h-full w-full"
                        />
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
                          {item.kategori === 'kenaikan_tali_pinggang' ? (
                            <Chip color={meta.chip}>{item.peringkat}</Chip>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
                            {Number(item.page_count) === 2 ? '2 Muka' : '1 Muka'}
                          </span>
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
                              type="button"
                              onClick={() => setLayoutTarget(item)}
                              title="Ubah posisi & reka bentuk nama"
                              className="rounded-lg bg-slate-100 p-1.5 text-slate-700 transition hover:bg-slate-200"
                            >
                              <Sliders size={14} />
                            </button>
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

      <EditTemplateLayoutModal
        open={!!layoutTarget}
        onClose={() => setLayoutTarget(null)}
        template={layoutTarget}
        onSaved={loadTemplates}
      />

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
