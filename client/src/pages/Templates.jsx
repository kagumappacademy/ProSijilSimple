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
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Loader2,
  HelpCircle,
  Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, fmtDate } from '../lib/api';
import { PageIntro, Panel, Button, Input, Modal, Confirm, Loading, Empty, Chip } from '../components/UI';
import { PdfThumbnail, renderPdfBlobToDataUrl, renderPdfUrlToDataUrl } from '../components/PdfThumbnail';
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

const FONT_OPTIONS = [
  { id: 'Lora', name: 'Lora', style: "'Lora', serif", desc: 'Serif Elegan & Rasmi (Lalai)', sample: 'Aa' },
  { id: 'Cinzel', name: 'Cinzel', style: "'Cinzel', serif", desc: 'Serif Diraja Tradisional', sample: 'Aa' },
  { id: 'Montserrat', name: 'Montserrat', style: "'Montserrat', sans-serif", desc: 'Sans-Serif Moden & Jelas', sample: 'Aa' },
  { id: 'Times-Roman', name: 'Times-Roman', style: "'Times New Roman', Times, serif", desc: 'Serif Klasik Standard', sample: 'Aa' },
  { id: 'Helvetica', name: 'Helvetica', style: 'Helvetica, Arial, sans-serif', desc: 'Sans-Serif Bersih & Kemas', sample: 'Aa' },
];

const COLOR_SWATCHES = [
  { hex: '#c1362d', name: 'Merah Rasmi' },
  { hex: '#d4af37', name: 'Emas Diraja' },
  { hex: '#111827', name: 'Hitam Pekat' },
  { hex: '#1e3a8a', name: 'Biru Diraja' },
  { hex: '#065f46', name: 'Hijau Zamrud' },
  { hex: '#831843', name: 'Merah Marun' },
];

const SAMPLE_NAMES = [
  { label: 'Sederhana', name: 'MUHAMMAD ADAM BIN ABDULLAH' },
  { label: 'Pendek', name: 'ALI BIN ABU' },
  { label: 'Panjang', name: "SITI NUR AISYAH BINTI DATO' MOHAMMAD KHAIRUL ANUAR" },
];

/**
 * Komponen Visual Drag & Drop untuk Mengatur Posisi dan Gaya Teks Nama pada Sijil.
 * Menyokong Drag dengan Tetikus (Mouse) & Sentuhan Skrin (Touch di Telefon Pintar).
 */
function DraggableCertificateTextPositioner({
  imageSrc,
  leftRatio = 0.5,
  topRatio = 0.407,
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
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth || 500);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handlePointerMove = useCallback(
    (clientX, clientY) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = Math.min(Math.max(0.06, (clientX - rect.left) / rect.width), 0.94);
      const y = Math.min(Math.max(0.06, (clientY - rect.top) / rect.height), 0.94);
      onChangePos(Number(x.toFixed(4)), Number(y.toFixed(4)));
    },
    [onChangePos]
  );

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    handlePointerMove(e.clientX, e.clientY);

    const onMouseMove = (moveEvt) => {
      handlePointerMove(moveEvt.clientX, moveEvt.clientY);
    };
    const onMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleTouchStart = (e) => {
    if (!e.touches?.[0]) return;
    setIsDragging(true);
    handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);

    const onTouchMove = (moveEvt) => {
      if (!moveEvt.touches?.[0]) return;
      if (moveEvt.cancelable) moveEvt.preventDefault();
      handlePointerMove(moveEvt.touches[0].clientX, moveEvt.touches[0].clientY);
    };
    const onTouchEnd = () => {
      setIsDragging(false);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
  };

  const displayLines = useMemo(() => {
    const raw = String(sampleName || '').trim().toUpperCase();
    if (!raw) return ['[NAMA PESILAT]'];
    const words = raw.split(/\s+/).filter(Boolean);
    if (nameLayout === 'sebaris') {
      return [raw];
    }
    if (nameLayout === 'dua_baris') {
      if (words.length <= 1) return [raw];
      let splitIdx = words.findIndex((w, idx) => idx > 0 && /^(bin|binti|bt|b\.|a\/l|a\/p)$/i.test(w));
      if (splitIdx === -1) splitIdx = Math.ceil(words.length / 2);
      return [words.slice(0, splitIdx).join(' '), words.slice(splitIdx).join(' ')].filter(Boolean);
    }
    if (words.length > 4 || raw.length > 28) {
      let splitIdx = words.findIndex((w, idx) => idx > 0 && /^(bin|binti|bt|b\.|a\/l|a\/p)$/i.test(w));
      if (splitIdx === -1) splitIdx = Math.ceil(words.length / 2);
      return [words.slice(0, splitIdx).join(' '), words.slice(splitIdx).join(' ')].filter(Boolean);
    }
    return [raw];
  }, [sampleName, nameLayout]);

  const fontScaleFactor = (containerWidth || 500) / 595;
  const previewFontSizePx = Math.max(10, Math.round(fontSize * fontScaleFactor));

  const fontCss = useMemo(() => {
    const opt = FONT_OPTIONS.find((f) => f.id === fontFamily);
    return opt?.style || "'Lora', serif";
  }, [fontFamily]);

  const nudge = (dx, dy) => {
    const newX = Math.min(Math.max(0.05, leftRatio + dx), 0.95);
    const newY = Math.min(Math.max(0.05, topRatio + dy), 0.95);
    onChangePos(Number(newX.toFixed(4)), Number(newY.toFixed(4)));
  };

  return (
    <div className="space-y-2 select-none">
      {/* Board Visual Sijil */}
      <div
        ref={containerRef}
        onClick={(e) => handlePointerMove(e.clientX, e.clientY)}
        className={`relative w-full aspect-[1/1.414] max-h-[500px] sm:max-h-[560px] bg-slate-900/5 rounded-2xl border-2 overflow-hidden shadow-inner flex items-center justify-center cursor-crosshair transition-all ${
          isDragging ? 'border-red-500 ring-4 ring-red-100' : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt="Pratonton Sijil"
            className="w-full h-full object-contain pointer-events-none select-none"
            draggable={false}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 p-6 text-center">
            <Loader2 size={24} className="animate-spin mb-2 text-slate-500" />
            <span className="text-xs font-semibold">Memuatkan pratonton sijil...</span>
          </div>
        )}

        {/* Kotak Nama Boleh Ditarik (Draggable Target Box) */}
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          style={{
            left: `${(leftRatio * 100).toFixed(2)}%`,
            top: `${(topRatio * 100).toFixed(2)}%`,
            transform: 'translate(-50%, -50%)',
          }}
          className={`absolute cursor-grab active:cursor-grabbing px-3 py-1.5 rounded-lg border-2 border-dashed transition-all ${
            isDragging
              ? 'border-red-600 bg-red-50/80 shadow-xl scale-102 ring-2 ring-red-400/50'
              : 'border-blue-600/90 bg-white/75 hover:bg-white/95 hover:border-blue-700 shadow-md'
          }`}
        >
          {/* Label Panduan Seret */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-950 text-white text-[8.5px] font-bold px-2 py-0.5 rounded-full shadow pointer-events-none whitespace-nowrap">
            <Move size={8.5} />
            <span>SERET SAYA</span>
          </div>

          {/* Paparan Nama Ikut Fon & Warna Semasa */}
          <div
            style={{
              fontFamily: fontCss,
              fontSize: `${previewFontSizePx}px`,
              color: colorHex,
              lineHeight: 1.25,
            }}
            className="text-center font-bold whitespace-nowrap tracking-wide drop-shadow-2xs"
          >
            {displayLines.map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
          </div>

          {/* Titik Penjajaran Tengah */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-red-600 border-2 border-white shadow-xs pointer-events-none" />
        </div>
      </div>

      {/* Bar Kawalan Koordinat & Penalaan Mikro */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-100/80 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-[10.5px] font-bold text-slate-700">Posisi:</span>
          <span className="font-mono text-[10.5px] font-extrabold text-red-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
            X: {(leftRatio * 100).toFixed(1)}% • Y: {(topRatio * 100).toFixed(1)}%
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => nudge(0, -0.005)}
            title="Naik 0.5%"
            className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition cursor-pointer"
          >
            <ArrowUp size={12} />
          </button>
          <button
            type="button"
            onClick={() => nudge(0, 0.005)}
            title="Turun 0.5%"
            className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition cursor-pointer"
          >
            <ArrowDown size={12} />
          </button>
          <button
            type="button"
            onClick={() => nudge(-0.005, 0)}
            title="Kiri 0.5%"
            className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition cursor-pointer"
          >
            <ArrowLeft size={12} />
          </button>
          <button
            type="button"
            onClick={() => nudge(0.005, 0)}
            title="Kanan 0.5%"
            className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition cursor-pointer"
          >
            <ArrowRight size={12} />
          </button>
          <button
            type="button"
            onClick={() => onChangePos(0.5, topRatio)}
            title="Tengah Mendatar (50%)"
            className="px-2 h-7 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition cursor-pointer"
          >
            Tengah X
          </button>
          <button
            type="button"
            onClick={() => onChangePos(0.5, 0.407)}
            title="Posisi Asal Rasmi"
            className="px-2 h-7 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition cursor-pointer flex items-center gap-1"
          >
            <RotateCcw size={10} />
            <span>Lalai</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal Muat Naik Templat Sijil dengan Wizard Step-by-Step & Progress Bar:
 * Langkah 1: Muat Naik Fail PDF & Maklumat Asas
 * Langkah 2: Posisi Visual Drag & Drop, Saiz, Warna, Fon & Format Baris Nama
 * Langkah 3: Pengesahan & Simpan ke Cloud
 */
function UploadTemplateModal({ open, onClose, onSaved }) {
  const [step, setStep] = useState(1); // 1, 2, 3
  const [file, setFile] = useState(null);
  const [filePage1, setFilePage1] = useState(null);
  const [filePage2, setFilePage2] = useState(null);
  const [pageCount, setPageCount] = useState(1); // 1 or 2
  const [uploadMode2P, setUploadMode2P] = useState('single'); // 'single' or 'split'
  const [kategori, setKategori] = useState('kenaikan_tali_pinggang');
  const [nama, setNama] = useState('Sijil Ujian Kenaikan Tali Pinggang (Penggal 1/2026)');
  const [peringkat, setPeringkat] = useState('Ujian Awan Putih Cula Merah 1');
  const [keterangan, setKeterangan] = useState('');
  const [busy, setBusy] = useState(false);

  // Tetapan Gaya & Posisi Teks (Langkah 2)
  const [previewImage, setPreviewImage] = useState(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [leftRatio, setLeftRatio] = useState(0.5);
  const [topRatio, setTopRatio] = useState(0.407);
  const [fontSize, setFontSize] = useState(20);
  const [colorHex, setColorHex] = useState('#c1362d');
  const [fontFamily, setFontFamily] = useState('Lora');
  const [nameLayout, setNameLayout] = useState('auto'); // 'auto', 'sebaris', 'dua_baris'
  const [sampleName, setSampleName] = useState('MUHAMMAD ADAM BIN ABDULLAH');

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
      setPreviewImage(null);
      setLeftRatio(0.5);
      setTopRatio(0.407);
      setFontSize(20);
      setColorHex('#c1362d');
      setFontFamily('Lora');
      setNameLayout('auto');
      setSampleName('MUHAMMAD ADAM BIN ABDULLAH');
    }
  }, [open]);

  // Validasi & Bergerak ke Langkah 2 (Generate Page 1 Preview Image)
  const handleNextToStep2 = async () => {
    if (pageCount === 1) {
      if (!file) return toast.error('Sila pilih fail PDF templat 1 muka surat.');
      if (!file.name.toLowerCase().endsWith('.pdf')) return toast.error('Fail mestilah format .pdf.');
      if (file.size > 4.5 * 1024 * 1024) return toast.error('Saiz fail melebihi had maksima 4.5MB.');
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
    if (!peringkat.trim()) return toast.error('Sila pilih atau masukkan peringkat pesilat.');

    const targetFile = pageCount === 2 && uploadMode2P === 'split' ? filePage1 : file;
    setGeneratingPreview(true);
    try {
      const dataUrl = await renderPdfBlobToDataUrl(targetFile, 1);
      setPreviewImage(dataUrl);
      setStep(2);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memproses pratonton PDF: ' + (err.message || 'Ralat fail'));
    } finally {
      setGeneratingPreview(false);
    }
  };

  // Simpan & Hantar ke Server
  async function submit(e) {
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
    form.append('peringkat', peringkat.trim());
    form.append('keterangan', keterangan.trim());

    if (previewImage) {
      form.append('thumbnail', previewImage);
    }

    const textConfigObj = {
      fontSize,
      colorHex,
      fontFamily,
      leftRatio,
      topRatio,
      posXRatio: leftRatio,
      posYRatio: topRatio,
      nameLayout,
    };
    form.append('text_config', JSON.stringify(textConfigObj));

    setBusy(true);
    try {
      await api('/admin/templates', { method: 'POST', body: form });
      toast.success(
        pageCount === 2
          ? 'Templat sijil 2 muka surat berjaya dimuat naik dengan posisi & gaya nama tersuai!'
          : 'Templat sijil 1 muka surat berjaya dimuat naik dengan posisi & gaya nama tersuai!'
      );
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Gagal memuat naik templat');
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

  const catMeta = getCategoryMeta(kategori);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Muat Naik & Konfigurasi Templat Sijil (PDF)"
      wide
    >
      <div className="space-y-4">
        {/* STEPPER PROGRESS BAR MINIMALIST AESTHETIC */}
        <div className="rounded-2xl bg-slate-50 border border-slate-200/90 p-3 sm:p-4">
          <div className="flex items-center justify-between text-xs font-extrabold text-slate-800 mb-2">
            <span className="flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white text-[10px]">
                {step}
              </span>
              <span>
                {step === 1 && 'Langkah 1 daripada 3: Muat Naik Fail & Maklumat Asas'}
                {step === 2 && 'Langkah 2 daripada 3: Tetapan Posisi & Gaya Nama (Drag & Drop)'}
                {step === 3 && 'Langkah 3 daripada 3: Pengesahan & Simpan'}
              </span>
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              {step === 1 ? '33%' : step === 2 ? '66%' : '100%'}
            </span>
          </div>

          {/* Progress track */}
          <div className="relative h-2 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-rose-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: step === 1 ? '33.33%' : step === 2 ? '66.66%' : '100%' }}
            />
          </div>

          {/* 3 Steps Pills */}
          <div className="mt-2.5 grid grid-cols-3 gap-2 text-center text-[10.5px]">
            <button
              type="button"
              onClick={() => step > 1 && setStep(1)}
              className={`p-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1 ${
                step === 1
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : step > 1
                  ? 'bg-white text-emerald-700 border border-emerald-200 cursor-pointer'
                  : 'text-slate-400'
              }`}
            >
              {step > 1 ? <CheckCircle2 size={12} /> : <span>1.</span>}
              <span className="truncate">Fail & Info</span>
            </button>

            <button
              type="button"
              disabled={step < 2}
              onClick={() => step === 3 && setStep(2)}
              className={`p-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1 ${
                step === 2
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : step > 2
                  ? 'bg-white text-emerald-700 border border-emerald-200 cursor-pointer'
                  : 'text-slate-400 opacity-60'
              }`}
            >
              {step > 2 ? <CheckCircle2 size={12} /> : <span>2.</span>}
              <span className="truncate">Posisi & Fon</span>
            </button>

            <button
              type="button"
              disabled={step < 3}
              className={`p-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1 ${
                step === 3 ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-400 opacity-60'
              }`}
            >
              <span>3.</span>
              <span className="truncate">Pengesahan</span>
            </button>
          </div>
        </div>

        {/* ===================== LANGKAH 1 ===================== */}
        {step === 1 && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleNextToStep2();
            }}
            className="space-y-4"
          >
            {/* Format Halaman */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Pilihan Format Halaman Sijil *
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPageCount(1)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    pageCount === 1
                      ? 'border-slate-950 bg-slate-950 text-white shadow-xs'
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
                      ? 'border-slate-950 bg-slate-950 text-white shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold">2 Muka Surat (2 Pages)</span>
                    <Layers size={16} className={pageCount === 2 ? 'text-white' : 'text-slate-400'} />
                  </div>
                  <p className={`text-[11px] mt-1 ${pageCount === 2 ? 'text-slate-300' : 'text-slate-500'}`}>
                    Sijil dua helai (Depan ruangan nama & Belakang silabus)
                  </p>
                </button>
              </div>
            </div>

            {/* Muat Naik Fail PDF */}
            {pageCount === 1 ? (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Fail Templat PDF (1 Muka Surat) *
                </label>
                <label className="flex min-h-[105px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-center transition hover:border-slate-500 hover:bg-slate-50">
                  <UploadCloud size={24} className="text-slate-600 mb-1" />
                  <div className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-full">
                    {file ? file.name : 'Pilih fail PDF templat 1 muka surat'}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    PDF standard (maksima 4.5MB). Mengandungi garisan ruangan nama pesilat.
                  </p>
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
                  <label className="block text-xs font-semibold text-slate-700">
                    Kaedah Muat Naik 2 Muka Surat *
                  </label>
                  <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setUploadMode2P('single')}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                        uploadMode2P === 'single'
                          ? 'bg-white text-slate-900 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      1 Fail PDF (2 Halaman)
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode2P('split')}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                        uploadMode2P === 'split'
                          ? 'bg-white text-slate-900 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
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
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Fail PDF tunggal yang mengandungi kedua-dua muka surat depan dan belakang.
                      </p>
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
                      <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                        📄 Halaman 1 (Muka Hadapan) *
                      </label>
                      <label className="flex min-h-[95px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3 text-center transition hover:border-slate-500 hover:bg-slate-50">
                        <UploadCloud size={20} className="text-slate-600 mb-1" />
                        <div className="text-xs font-bold text-slate-900 truncate max-w-full">
                          {filePage1 ? filePage1.name : 'Pilih fail Halaman 1'}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">Muka hadapan sijil (ruangan nama)</p>
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
                      <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                        📄 Halaman 2 (Muka Belakang) *
                      </label>
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

            {/* Kategori Sijil */}
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
                        ? 'border-slate-950 bg-slate-950 text-white font-bold shadow-xs'
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
            </div>

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
              <Button type="submit" loading={generatingPreview} className="text-xs">
                <span>Seterusnya: Tetapan Posisi & Gaya Nama</span>
                <ChevronRight size={14} />
              </Button>
            </div>
          </form>
        )}

        {/* ===================== LANGKAH 2 ===================== */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Arahan Ringkas */}
            <div className="rounded-xl bg-red-50/70 border border-red-200/80 p-3 text-xs text-red-950 flex items-start gap-2">
              <Sparkles size={16} className="text-red-700 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Sesuaikan Posisi & Rupa Nama Pesilat:</strong> Seret kotak teks berlabel{' '}
                <span className="font-bold underline">"SERET SAYA"</span> terus ke posisi garisan nama
                pada sijil. Anda juga boleh memilih jenis fon, saiz, warna, serta mod sebaris atau dua baris di sebelah kanan.
              </div>
            </div>

            {/* Dua Kolum: Kiri = Visual Board Drag & Drop, Kanan = Panel Tetapan Gaya */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Kolum Kiri (Visual Board): 7 Kolum di skrin besar */}
              <div className="lg:col-span-7">
                <DraggableCertificateTextPositioner
                  imageSrc={previewImage}
                  leftRatio={leftRatio}
                  topRatio={topRatio}
                  onChangePos={(x, y) => {
                    setLeftRatio(x);
                    setTopRatio(y);
                  }}
                  fontSize={fontSize}
                  fontFamily={fontFamily}
                  colorHex={colorHex}
                  nameLayout={nameLayout}
                  sampleName={sampleName}
                />
              </div>

              {/* Kolum Kanan (Kawalan Gaya Teks): 5 Kolum */}
              <div className="lg:col-span-5 space-y-3.5 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200">
                {/* 1. Format Nama (Sebaris vs Dua Baris vs Auto) */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>Susunan Baris Nama *</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {nameLayout === 'auto' ? 'Pintar' : nameLayout === 'sebaris' ? '1 Baris' : '2 Baris'}
                    </span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setNameLayout('auto')}
                      className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                        nameLayout === 'auto'
                          ? 'border-slate-900 bg-slate-900 text-white font-bold shadow-2xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">Pintar</div>
                      <div className="text-[9px] opacity-75">Auto ikut saiz</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNameLayout('sebaris')}
                      className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                        nameLayout === 'sebaris'
                          ? 'border-slate-900 bg-slate-900 text-white font-bold shadow-2xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">Sebaris</div>
                      <div className="text-[9px] opacity-75">1 Baris Sahaja</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNameLayout('dua_baris')}
                      className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                        nameLayout === 'dua_baris'
                          ? 'border-slate-900 bg-slate-900 text-white font-bold shadow-2xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">Dua Baris</div>
                      <div className="text-[9px] opacity-75">Pisah di Bin/Binti</div>
                    </button>
                  </div>
                </div>

                {/* 2. Pilihan Jenis Fon (Google Fonts Rasmi Sijil) */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-800">
                    Pilihan Jenis Fon Sijil *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {FONT_OPTIONS.map((f) => (
                      <button
                        type="button"
                        key={f.id}
                        onClick={() => setFontFamily(f.id)}
                        className={`p-2 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                          fontFamily === f.id
                            ? 'border-red-600 bg-red-50/70 text-slate-950 font-bold ring-1 ring-red-300'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            <span style={{ fontFamily: f.style }} className="text-sm font-bold text-red-700">
                              {f.sample}
                            </span>
                            <span>{f.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">{f.desc}</div>
                        </div>
                        {fontFamily === f.id && <Check size={14} className="text-red-700 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Saiz Fon (Slider + Presets) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800">Saiz Fon Sijil</label>
                    <span className="font-mono text-xs font-extrabold text-red-700 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
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
                    className="w-full accent-red-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <div className="flex items-center justify-between gap-1 mt-1.5">
                    {[16, 18, 20, 24, 28].map((sz) => (
                      <button
                        type="button"
                        key={sz}
                        onClick={() => setFontSize(sz)}
                        className={`flex-1 py-1 rounded-lg text-[10.5px] font-bold border transition cursor-pointer ${
                          fontSize === sz
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {sz}pt
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Warna Teks (Palette Swatches + Native Hex Color Picker) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800">Warna Tulisan Nama</label>
                    <span className="font-mono text-xs font-bold text-slate-600">{colorHex.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {COLOR_SWATCHES.map((sw) => (
                      <button
                        type="button"
                        key={sw.hex}
                        onClick={() => setColorHex(sw.hex)}
                        title={sw.name}
                        style={{ backgroundColor: sw.hex }}
                        className={`h-7 w-7 rounded-full transition-transform cursor-pointer relative flex items-center justify-center ${
                          colorHex.toLowerCase() === sw.hex.toLowerCase()
                            ? 'scale-110 ring-3 ring-offset-2 ring-slate-900'
                            : 'hover:scale-105 opacity-90'
                        }`}
                      >
                        {colorHex.toLowerCase() === sw.hex.toLowerCase() && (
                          <Check size={12} className="text-white drop-shadow" />
                        )}
                      </button>
                    ))}

                    {/* Native Color Picker */}
                    <label
                      title="Pilih Warna Tersuai (Custom HEX)"
                      className="h-7 w-7 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-slate-500 bg-white relative overflow-hidden"
                    >
                      <Palette size={13} className="text-slate-600" />
                      <input
                        type="color"
                        value={colorHex}
                        onChange={(e) => setColorHex(e.target.value)}
                        className="opacity-0 absolute inset-0 cursor-pointer h-full w-full"
                      />
                    </label>
                  </div>
                </div>

                {/* 5. Uji Nama Contoh */}
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-600">
                    Uji Panjang Nama pada Pratonton:
                  </label>
                  <div className="flex items-center gap-1">
                    {SAMPLE_NAMES.map((s) => (
                      <button
                        type="button"
                        key={s.label}
                        onClick={() => setSampleName(s.name)}
                        className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-semibold border transition cursor-pointer truncate ${
                          sampleName === s.name
                            ? 'bg-red-50 text-red-700 border-red-300 font-bold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Butang Navigasi */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setStep(1)} className="text-xs">
                <ChevronLeft size={14} />
                <span>Kembali ke Langkah 1</span>
              </Button>
              <Button type="button" onClick={() => setStep(3)} className="text-xs">
                <span>Seterusnya: Semak & Sahkan</span>
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}

        {/* ===================== LANGKAH 3 ===================== */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
              <h4 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-600" />
                <span>Ringkasan Konfigurasi Templat Sijil</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Maklumat Asas */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Nama Templat:</span>
                    <span className="font-bold text-slate-900 text-right">{nama}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Kategori:</span>
                    <span className="font-bold text-slate-900 flex items-center gap-1">
                      <span>{catMeta.emoji}</span>
                      <span>{catMeta.label}</span>
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Peringkat / Bengkung:</span>
                    <span className="font-bold text-slate-900">{peringkat}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Format Halaman:</span>
                    <span className="font-bold text-slate-900">
                      {pageCount === 2 ? '2 Muka Surat (Depan & Belakang)' : '1 Muka Surat (Penuh)'}
                    </span>
                  </div>
                </div>

                {/* Maklumat Gaya Teks */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Jenis Fon & Saiz:</span>
                    <span className="font-bold text-slate-900">
                      {fontFamily} ({fontSize} pt)
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 items-center">
                    <span className="text-slate-500">Warna Tulisan:</span>
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span
                        className="inline-block h-3.5 w-3.5 rounded-full border border-slate-300"
                        style={{ backgroundColor: colorHex }}
                      />
                      <span className="font-mono text-[11px]">{colorHex.toUpperCase()}</span>
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Posisi Sijil:</span>
                    <span className="font-bold font-mono text-red-700">
                      X: {(leftRatio * 100).toFixed(1)}% | Y: {(topRatio * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Susunan Baris:</span>
                    <span className="font-bold text-slate-900">
                      {nameLayout === 'auto'
                        ? 'Pintar (Auto)'
                        : nameLayout === 'sebaris'
                        ? 'Sebaris Sahaja'
                        : 'Dua Baris'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mini Preview Box */}
              {previewImage && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-center">
                  <div className="text-[11px] font-bold text-slate-600 mb-1.5">
                    Hasil Pratonton Nama di Atas Templat:
                  </div>
                  <div className="relative mx-auto w-full max-w-[260px] aspect-[1/1.414] rounded-lg overflow-hidden border border-slate-300 bg-white shadow">
                    <img
                      src={previewImage}
                      alt="Thumbnail"
                      className="w-full h-full object-contain pointer-events-none"
                    />
                    <div
                      style={{
                        left: `${(leftRatio * 100).toFixed(1)}%`,
                        top: `${(topRatio * 100).toFixed(1)}%`,
                        transform: 'translate(-50%, -50%)',
                        fontFamily: FONT_OPTIONS.find((f) => f.id === fontFamily)?.style || "'Lora', serif",
                        color: colorHex,
                        fontSize: `${Math.max(7, Math.round(fontSize * (260 / 595)))}px`,
                        lineHeight: 1.2,
                      }}
                      className="absolute font-bold whitespace-nowrap text-center drop-shadow-2xs pointer-events-none"
                    >
                      {sampleName}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Butang Navigasi Akhir */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <Button type="button" variant="secondary" onClick={() => setStep(2)} className="text-xs">
                <ChevronLeft size={14} />
                <span>Kembali ke Ubah Suai Posisi</span>
              </Button>
              <Button
                type="button"
                loading={busy}
                onClick={submit}
                className="text-xs !bg-emerald-700 hover:!bg-emerald-800"
              >
                <UploadCloud size={15} />
                <span>Simpan & Muat Naik Templat ({pageCount} Page)</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/**
 * Modal untuk Mengubah Posisi & Gaya Fon bagi Templat yang Sedia Ada.
 * Membolehkan admin mengubah kedudukan teks, saiz, warna, fon dan mod sebaris/dua baris
 * tanpa perlu muat naik semula fail PDF.
 */
function TemplateConfigModal({ open, onClose, template, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const [leftRatio, setLeftRatio] = useState(0.5);
  const [topRatio, setTopRatio] = useState(0.407);
  const [fontSize, setFontSize] = useState(20);
  const [colorHex, setColorHex] = useState('#c1362d');
  const [fontFamily, setFontFamily] = useState('Lora');
  const [nameLayout, setNameLayout] = useState('auto');
  const [sampleName, setSampleName] = useState('MUHAMMAD ADAM BIN ABDULLAH');

  useEffect(() => {
    if (!open || !template) return;

    // Baca konfigurasi sedia ada jika ada
    let cfg = {};
    try {
      if (template.text_config) {
        cfg = typeof template.text_config === 'object' ? template.text_config : JSON.parse(template.text_config);
      }
    } catch (_) {}

    setLeftRatio(cfg.leftRatio ?? cfg.posXRatio ?? 0.5);
    setTopRatio(cfg.topRatio ?? cfg.posYRatio ?? 0.407);
    setFontSize(cfg.fontSize ?? 20);
    setColorHex(cfg.colorHex ?? '#c1362d');
    setFontFamily(cfg.fontFamily ?? 'Lora');
    setNameLayout(cfg.nameLayout ?? 'auto');

    // Muat imej pratonton
    if (template.thumbnail_base64 && template.thumbnail_base64.startsWith('data:image/')) {
      setPreviewImage(template.thumbnail_base64);
    } else {
      setLoading(true);
      renderPdfUrlToDataUrl(`/api/admin/templates/${template.id}/preview`, 1)
        .then((url) => setPreviewImage(url))
        .catch((err) => {
          console.warn('Gagal render pratonton:', err);
        })
        .finally(() => setLoading(false));
    }
  }, [open, template]);

  if (!open || !template) return null;

  async function handleSave() {
    setSaving(true);
    try {
      const textConfigObj = {
        fontSize,
        colorHex,
        fontFamily,
        leftRatio,
        topRatio,
        posXRatio: leftRatio,
        posYRatio: topRatio,
        nameLayout,
      };

      await api(`/admin/templates/${template.id}/config`, {
        method: 'POST',
        body: { text_config: JSON.stringify(textConfigObj) },
      });

      toast.success('Konfigurasi posisi & gaya nama templat berjaya dikemaskini!');
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      toast.error('Gagal mengemaskini konfigurasi: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Ubah Posisi & Gaya Nama Sijil" wide>
      <div className="space-y-4">
        {/* Template Info Header */}
        <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs sm:text-sm font-extrabold text-slate-900">{template.nama_template}</div>
            <div className="text-[11px] text-slate-500">Peringkat: {template.peringkat}</div>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-red-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
            X: {(leftRatio * 100).toFixed(1)}% • Y: {(topRatio * 100).toFixed(1)}%
          </div>
        </div>

        {/* Visual Drag & Drop & Setting Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <div className="lg:col-span-7">
            {loading ? (
              <div className="h-[420px] rounded-2xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center">
                <Loader2 size={24} className="animate-spin text-slate-500 mb-2" />
                <span className="text-xs font-semibold text-slate-600">Memuatkan templat PDF...</span>
              </div>
            ) : (
              <DraggableCertificateTextPositioner
                imageSrc={previewImage}
                leftRatio={leftRatio}
                topRatio={topRatio}
                onChangePos={(x, y) => {
                  setLeftRatio(x);
                  setTopRatio(y);
                }}
                fontSize={fontSize}
                fontFamily={fontFamily}
                colorHex={colorHex}
                nameLayout={nameLayout}
                sampleName={sampleName}
              />
            )}
          </div>

          <div className="lg:col-span-5 space-y-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200">
            {/* Format Nama */}
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-800">Susunan Baris Nama</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setNameLayout('auto')}
                  className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                    nameLayout === 'auto'
                      ? 'border-slate-900 bg-slate-900 text-white font-bold shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold">Pintar</div>
                  <div className="text-[9px] opacity-75">Auto</div>
                </button>
                <button
                  type="button"
                  onClick={() => setNameLayout('sebaris')}
                  className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                    nameLayout === 'sebaris'
                      ? 'border-slate-900 bg-slate-900 text-white font-bold shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold">Sebaris</div>
                  <div className="text-[9px] opacity-75">1 Baris</div>
                </button>
                <button
                  type="button"
                  onClick={() => setNameLayout('dua_baris')}
                  className={`p-2 rounded-xl border text-center transition cursor-pointer ${
                    nameLayout === 'dua_baris'
                      ? 'border-slate-900 bg-slate-900 text-white font-bold shadow-2xs'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold">Dua Baris</div>
                  <div className="text-[9px] opacity-75">2 Baris</div>
                </button>
              </div>
            </div>

            {/* Pilihan Fon */}
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-800">Pilihan Jenis Fon</label>
              <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
                {FONT_OPTIONS.map((f) => (
                  <button
                    type="button"
                    key={f.id}
                    onClick={() => setFontFamily(f.id)}
                    className={`w-full p-2 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                      fontFamily === f.id
                        ? 'border-red-600 bg-red-50 text-slate-950 font-bold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <div className="text-xs flex items-center gap-2">
                      <span style={{ fontFamily: f.style }} className="text-sm font-bold text-red-700">
                        {f.sample}
                      </span>
                      <span>{f.name}</span>
                    </div>
                    {fontFamily === f.id && <Check size={14} className="text-red-700 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Saiz Fon */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800">Saiz Fon</label>
                <span className="font-mono text-xs font-bold text-red-700 bg-white px-2 py-0.5 rounded border border-slate-200">
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
                className="w-full accent-red-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
            </div>

            {/* Warna */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800">Warna Tulisan</label>
                <span className="font-mono text-xs font-bold text-slate-600">{colorHex.toUpperCase()}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {COLOR_SWATCHES.map((sw) => (
                  <button
                    type="button"
                    key={sw.hex}
                    onClick={() => setColorHex(sw.hex)}
                    title={sw.name}
                    style={{ backgroundColor: sw.hex }}
                    className={`h-6 w-6 rounded-full transition cursor-pointer flex items-center justify-center ${
                      colorHex.toLowerCase() === sw.hex.toLowerCase()
                        ? 'ring-2 ring-offset-2 ring-slate-900 scale-110'
                        : 'opacity-90'
                    }`}
                  >
                    {colorHex.toLowerCase() === sw.hex.toLowerCase() && (
                      <Check size={10} className="text-white drop-shadow" />
                    )}
                  </button>
                ))}
                <label className="h-6 w-6 rounded-full border border-dashed border-slate-300 flex items-center justify-center cursor-pointer bg-white relative">
                  <Palette size={11} className="text-slate-600" />
                  <input
                    type="color"
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    className="opacity-0 absolute inset-0 cursor-pointer h-full w-full"
                  />
                </label>
              </div>
            </div>

            {/* Ujian Nama */}
            <div>
              <label className="mb-1 block text-[10.5px] font-bold text-slate-600">Uji Nama:</label>
              <div className="flex items-center gap-1">
                {SAMPLE_NAMES.map((s) => (
                  <button
                    type="button"
                    key={s.label}
                    onClick={() => setSampleName(s.name)}
                    className={`flex-1 py-1 rounded-md text-[10px] border transition cursor-pointer truncate ${
                      sampleName === s.name
                        ? 'bg-red-50 text-red-700 border-red-300 font-bold'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} className="text-xs">
            Batal
          </Button>
          <Button type="button" loading={saving} onClick={handleSave} className="text-xs !bg-emerald-700 hover:!bg-emerald-800">
            <Check size={14} />
            <span>Simpan Perubahan Gaya & Posisi</span>
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

export function LargeTemplatePreviewModal({ open, onClose, template, onTestGenerate, onEditConfig }) {
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
                if (onEditConfig) onEditConfig(template);
              }}
              className="!px-3.5 !py-2 text-xs bg-slate-900 hover:bg-slate-800 text-white"
            >
              <Sliders size={14} /> Ubah Posisi & Fon
            </Button>
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
  const [configTarget, setConfigTarget] = useState(null);
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
      if (!uploadOpen && !deleteTarget && !testTarget && !configTarget && !previewTarget) {
        loadTemplates(false);
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [loadTemplates, uploadOpen, deleteTarget, testTarget, configTarget, previewTarget]);

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
                                <span
                                  className="inline-flex items-center rounded-md bg-white/95 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-tight text-slate-700 border border-slate-200/90 shadow-2xs truncate"
                                >
                                  {item.peringkat.replace(/^ujian\s+/i, '')}
                                </span>
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
                                title={item.peringkat}
                                onClick={() => setPreviewTarget(item)}
                              >
                                {item.peringkat}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate mt-0.5" title={item.nama_template}>
                                {item.nama_template}
                              </div>
                            </div>
                          </div>

                          {/* Card Actions Footer - Muat Sempurna & Kemas Tanpa Terkeluar di Telefon */}
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 w-full min-w-0">
                            <button
                              type="button"
                              onClick={() => setTestTarget(item)}
                              className="flex-1 rounded-md bg-slate-100 px-2 py-1.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-200 transition-colors inline-flex items-center justify-center gap-1 cursor-pointer"
                              title="Uji janaan nama pada templat"
                            >
                              <Play size={10} />
                              <span>Uji</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setConfigTarget(item)}
                              className="rounded-lg bg-slate-100 p-1.5 text-slate-700 hover:bg-slate-200 hover:text-slate-950 transition active:scale-95 shrink-0 cursor-pointer"
                              title="Ubah posisi & gaya nama (fon, saiz, warna, drag & drop)"
                            >
                              <Sliders size={13} />
                            </button>

                            <a
                              href={previewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-red-50 hover:text-red-700 transition active:scale-95 shrink-0 cursor-pointer"
                              title="Buka fail PDF asal"
                            >
                              <Eye size={13} />
                            </a>

                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              className="rounded-lg bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 transition active:scale-95 shrink-0 cursor-pointer"
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
                          type="button"
                          onClick={() => setConfigTarget(item)}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                          title="Ubah posisi & gaya nama"
                        >
                          <Sliders size={12} /> Posisi
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
                          <Chip color={meta.chip}>{item.peringkat}</Chip>
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
                              onClick={() => setConfigTarget(item)}
                              title="Ubah posisi & gaya nama"
                              className="rounded-lg bg-slate-100 p-1.5 text-slate-700 transition hover:bg-slate-200 cursor-pointer"
                            >
                              <Sliders size={14} />
                            </button>
                            <button
                              onClick={() => setTestTarget(item)}
                              title="Uji janaan nama pada templat"
                              className="rounded-lg bg-emerald-50 p-1.5 text-emerald-700 transition hover:bg-emerald-100 cursor-pointer"
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

      <TemplateConfigModal
        open={!!configTarget}
        onClose={() => setConfigTarget(null)}
        template={configTarget}
        onSaved={loadTemplates}
      />

      <LargeTemplatePreviewModal
        open={!!previewTarget}
        onClose={() => setPreviewTarget(null)}
        template={previewTarget}
        onTestGenerate={(t) => setTestTarget(t)}
        onEditConfig={(t) => setConfigTarget(t)}
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
