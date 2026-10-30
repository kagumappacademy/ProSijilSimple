import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, X, Search, ChevronLeft, ChevronRight, Inbox, AlertTriangle } from 'lucide-react';

export function Logo({
  light = false,
  small = false,
  center = false,
  className = '',
  showTextOnMobile = false,
}) {
  return (
    <div
      className={`flex items-center gap-2 select-none shrink-0 ${
        center ? 'justify-center mx-auto text-left' : ''
      } ${className}`}
    >
      <img
        src="/logo-prosijil.png"
        alt="Logo ProSijil"
        className={`${small ? 'h-7' : 'h-8 sm:h-9'} w-auto object-contain shrink-0 ${
          light ? 'brightness-0 invert' : ''
        }`}
      />
      <div className={`leading-tight shrink-0 ${showTextOnMobile ? 'block' : 'hidden sm:block'}`}>
        <span
          className={`block ${
            small ? 'text-xs' : 'text-sm sm:text-base'
          } font-bold tracking-tight whitespace-nowrap ${light ? 'text-white' : 'text-slate-900'}`}
        >
          AKADEMI <span className={light ? 'text-red-400' : 'text-red-700'}>PROSILAT</span>
        </span>
        <span
          className={`block ${
            small ? 'text-[7.5px] tracking-[0.06em]' : 'text-[8.5px] sm:text-[9px] tracking-[0.12em]'
          } uppercase font-semibold whitespace-nowrap ${
            light ? 'text-white/60' : 'text-slate-400'
          }`}
        >
          Sistem Pengurusan Sijil
        </span>
      </div>
    </div>
  );
}

export function Button({ children, variant = 'primary', loading = false, className = '', ...props }) {
  const types = {
    // Professional Solid Brand Crimson (Like Nike / Apple brand accent)
    primary:
      'bg-red-700 text-white hover:bg-red-800 active:bg-red-900 border border-transparent shadow-xs',
    // Minimalist Apple Neutral White / Gray
    secondary:
      'bg-white text-slate-800 hover:bg-slate-50 active:bg-slate-100 border border-slate-300 shadow-2xs',
    // Obsidian Dark (Nike / Apple Black)
    dark:
      'bg-slate-900 text-white hover:bg-black active:bg-slate-950 border border-transparent shadow-xs',
    // Minimalist Ghost
    ghost:
      'text-slate-600 hover:text-slate-950 hover:bg-slate-100 active:bg-slate-200 border border-transparent',
    // Clean Danger
    danger:
      'bg-white text-red-700 hover:bg-red-50 active:bg-red-100 border border-red-200 shadow-2xs',
    // Amber / Accent
    gold:
      'bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800 border border-transparent shadow-xs',
  };

  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold tracking-tight transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${types[variant] || types.primary} ${className}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin shrink-0" /> : null}
      {children}
    </button>
  );
}

export function Input({ label, error, className = '', ...props }) {
  return (
    <label className="block space-y-1">
      {label && <span className="block text-xs font-semibold text-slate-700">{label}</span>}
      <input
        {...props}
        className={`w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-2xs transition-colors ${className}`}
      />
      {error && <span className="text-[11px] font-medium text-red-600">{error}</span>}
    </label>
  );
}

export function Select({ label, children, className = '', ...props }) {
  return (
    <label className="block space-y-1">
      {label && <span className="block text-xs font-semibold text-slate-700">{label}</span>}
      <select
        {...props}
        className={`w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-2xs transition-colors ${className}`}
      >
        {children}
      </select>
    </label>
  );
}

export function PageIntro({ eyebrow, title, desc, action, actions }) {
  const acts = actions || action;
  return (
    <div className="mb-5 sm:mb-6 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {eyebrow && (
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-red-700 mb-0.5">
            {eyebrow}
          </div>
        )}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {desc && (
          <p className="text-xs sm:text-[13px] text-slate-500 mt-0.5 max-w-2xl font-normal leading-normal">
            {desc}
          </p>
        )}
      </div>
      {acts && <div className="flex flex-wrap items-center gap-2 shrink-0">{acts}</div>}
    </div>
  );
}

export function Panel({ children, className = '' }) {
  return (
    <div
      className={`rounded-xl border border-slate-200/90 bg-white shadow-2xs ${className}`}
    >
      {children}
    </div>
  );
}

export function Chip({ children, color = 'emerald', className = '' }) {
  const c = {
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200/70',
    rose: 'bg-rose-50 text-rose-800 border-rose-200/70',
    red: 'bg-red-50 text-red-800 border-red-200/70',
    gold: 'bg-amber-50 text-amber-900 border-amber-200/70',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    forest: 'bg-red-50 text-red-800 border-red-200/70',
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-tight ${
        c[color] || c.emerald
      } ${className}`}
    >
      {children}
    </span>
  );
}

export function Empty({ title = 'Belum ada data', message = 'Rekod akan dipaparkan di sini.', icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 border border-slate-200">
        <Icon size={20} />
      </div>
      <h3 className="font-semibold text-slate-900 text-xs sm:text-sm">{title}</h3>
      <p className="mt-1 max-w-xs text-xs text-slate-400 font-normal">{message}</p>
    </div>
  );
}

export function Loading({
  text = 'Sedang memuatkan data...',
  subtext,
  size = 'md', // 'sm', 'md', 'lg'
  fullScreen = false,
  className = '',
}) {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const outerSize = isSm ? 'h-8 w-8' : isLg ? 'h-16 w-16' : 'h-11 w-11';
  const innerSize = isSm ? 'h-5 w-5' : isLg ? 'h-10 w-10' : 'h-7 w-7';
  const logoSize = isSm ? 'h-3 w-3' : isLg ? 'h-6 w-6' : 'h-4 w-4';

  const content = (
    <div className={`flex flex-col items-center justify-center text-center select-none py-10 px-4 ${className}`}>
      {/* Precision Circular Spinner (Nike / Apple style clean loader) */}
      <div className={`relative flex items-center justify-center ${outerSize}`}>
        <div
          className="absolute inset-0 rounded-full border-2 border-slate-200 border-t-red-700 animate-spin"
          style={{ animationDuration: '0.8s' }}
        />
        <div className={`relative z-10 flex items-center justify-center rounded-full bg-white shadow-2xs ${innerSize}`}>
          <img
            src="/logo-prosijil.png"
            alt="ProSijil"
            className={`${logoSize} object-contain`}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-col items-center max-w-xs">
        <div className="text-xs sm:text-sm font-semibold text-slate-900">
          {text}
        </div>
        {subtext && (
          <p className="mt-0.5 text-xs text-slate-400 font-normal">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/95 backdrop-blur-xs p-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-lg max-w-xs w-full text-center">
          {content}
        </div>
      </div>
    );
  }

  return content;
}

export function ProcessingModal({
  open = false,
  title = 'Sedang Memproses Data...',
  subtitle = 'Sila tunggu sebentar sementara sistem memproses data anda.',
}) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-xl border border-slate-200">
        <Loading text={title} subtext={subtitle} size="md" />
      </div>
    </div>
  );
}

export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 bg-[#FCFDFB] px-4 py-2.5 text-xs">
      <span className="text-xs text-slate-500 font-medium">
        Halaman <strong className="text-slate-800">{page}</strong> daripada <strong className="text-slate-800">{pages}</strong>
      </span>
      <div className="flex gap-1.5">
        <Button variant="secondary" className="!p-1.5 rounded-lg" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft size={13} />
        </Button>
        <Button variant="secondary" className="!p-1.5 rounded-lg" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          <ChevronRight size={13} />
        </Button>
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide = false }) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-900/40 p-3 sm:p-4 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`max-h-[92vh] w-full overflow-y-auto rounded-xl bg-white p-5 sm:p-6 shadow-xl border border-slate-200 ${
          wide ? 'max-w-2xl' : 'max-w-lg'
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h2 className="text-sm sm:text-base font-bold tracking-tight text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Confirm({
  open,
  onClose,
  onConfirm,
  busy,
  title = 'Padam rekod?',
  message = 'Tindakan ini tidak boleh diundur.',
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-50 text-red-700 border border-red-200">
          <AlertTriangle size={18} />
        </div>
        <p className="pt-0.5 text-xs sm:text-sm leading-relaxed text-slate-600">{message}</p>
      </div>
      <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-3">
        <Button variant="secondary" onClick={onClose} className="text-xs">
          Batal
        </Button>
        <Button variant="danger" loading={busy} onClick={onConfirm} className="text-xs">
          Ya, padam
        </Button>
      </div>
    </Modal>
  );
}

export function SearchField({ value, onChange, placeholder = 'Cari rekod...' }) {
  return (
    <div className="relative flex items-center">
      <Search size={14} className="pointer-events-none absolute left-3 text-slate-400" />
      <input
        aria-label="Carian"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-w-0 rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 shadow-2xs transition-colors sm:min-w-[200px]"
      />
    </div>
  );
}
