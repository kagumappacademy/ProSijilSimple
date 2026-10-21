import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, X, Search, ChevronLeft, ChevronRight, Inbox, AlertTriangle } from 'lucide-react';
import { useLang } from '../lib/appContext';

export function Logo({ light = false, small = false, center = false, className = '' }) {
  let lang = 'bm';
  try {
    const ctx = useLang();
    if (ctx?.lang) lang = ctx.lang;
  } catch (e) {
    lang = 'bm';
  }

  const isEn = lang === 'en';
  const subtitle = isEn ? 'Certificate Management System' : 'Sistem Pengurusan Sijil';

  return (
    <div
      className={`flex items-center gap-2 select-none ${
        center ? 'justify-center mx-auto text-left' : ''
      } ${className}`}
    >
      <img
        src="/logo-prosijil.png"
        alt="Logo ProSijil"
        className={`${small ? 'h-7 sm:h-8' : 'h-10 sm:h-12'} w-auto object-contain shrink-0 ${
          light ? 'brightness-0 invert' : ''
        }`}
      />
      <div className="leading-tight shrink-0">
        <span
          className={`block ${
            small ? 'text-xs sm:text-[13px]' : 'text-base sm:text-lg'
          } font-black tracking-tight whitespace-nowrap ${light ? 'text-white' : 'text-slate-950'}`}
        >
          AKADEMI <span className={light ? 'text-red-400' : 'text-red-700'}>PROSILAT</span>
        </span>
        <span
          data-no-translate="true"
          translate="no"
          className={`block ${
            small
              ? isEn
                ? 'text-[6px] sm:text-[6.5px] tracking-tight'
                : 'text-[7.5px] sm:text-[8px] tracking-[0.05em]'
              : isEn
              ? 'text-[7.5px] sm:text-[8px] tracking-[0.02em]'
              : 'text-[8.5px] sm:text-[9px] tracking-[0.14em]'
          } uppercase font-bold whitespace-nowrap ${
            light ? 'text-white/70' : 'text-slate-500'
          }`}
        >
          {subtitle}
        </span>
      </div>
    </div>
  );
}

export function Button({ children, variant = 'primary', loading = false, className = '', ...props }) {
  const types = {
    primary: 'bg-red-700 text-white hover:bg-red-800 shadow-xs focus:ring-4 focus:ring-red-500/15',
    secondary: 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/90 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs',
    ghost: 'text-slate-700 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-400',
    danger: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/80 dark:border-rose-900/40',
    gold: 'bg-red-600 text-white hover:bg-red-700 shadow-xs',
  };

  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${types[variant]} ${className}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : null}
      {children}
    </button>
  );
}

export function Input({ label, error, className = '', ...props }) {
  return (
    <label className="block space-y-1">
      {label && <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">{label}</span>}
      <input
        {...props}
        className={`w-full rounded-xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-red-600 focus:ring-4 focus:ring-red-500/10 ${className}`}
      />
      {error && <span className="text-[11px] text-rose-600 dark:text-rose-400">{error}</span>}
    </label>
  );
}

export function Select({ label, children, className = '', ...props }) {
  return (
    <label className="block space-y-1">
      {label && <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-300">{label}</span>}
      <select
        {...props}
        className={`w-full rounded-xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-500/10 ${className}`}
      >
        {children}
      </select>
    </label>
  );
}

export function PageIntro({ eyebrow, title, desc, action, actions }) {
  const acts = actions || action;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 sm:mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        {eyebrow && (
          <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-red-600 dark:text-red-400 mb-0.5">
            {eyebrow}
          </div>
        )}
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">{title}</h1>
        {desc && <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl">{desc}</p>}
      </div>
      {acts && <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">{acts}</div>}
    </motion.div>
  );
}

export function Panel({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-apple dark:shadow-none ${className}`}>
      {children}
    </div>
  );
}

export function Chip({ children, color = 'emerald', className = '' }) {
  const c = {
    emerald: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/50',
    rose: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/50',
    red: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200/80 dark:border-red-800/50',
    gold: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/50',
    slate: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700',
    forest: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200/80 dark:border-red-800/50',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] sm:text-[11px] font-bold ${
        c[color] || c.emerald
      } ${className}`}
    >
      {children}
    </span>
  );
}

export function Empty({ title = 'Belum ada data', message = 'Rekod akan dipaparkan di sini.', icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-8 sm:py-12 text-center">
      <div className="mb-2.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/40">
        <Icon size={20} />
      </div>
      <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{title}</h3>
      <p className="mt-1 max-w-xs text-xs text-slate-400 dark:text-slate-500">{message}</p>
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex items-center justify-center p-8 text-red-700 dark:text-red-400">
      <Loader2 className="animate-spin" size={22} />
      <span className="ml-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">Sedang memuatkan...</span>
    </div>
  );
}

export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 bg-[#FCFDFB] dark:bg-slate-900 px-4 py-2 text-xs">
      <span className="text-xs text-slate-500 dark:text-slate-400">
        Halaman <strong>{page}</strong> daripada <strong>{pages}</strong>
      </span>
      <div className="flex gap-1.5">
        <Button variant="secondary" className="!p-1.5" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft size={13} />
        </Button>
        <Button variant="secondary" className="!p-1.5" disabled={page >= pages} onClick={() => onChange(page + 1)}>
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
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/45 dark:bg-black/70 p-3 sm:p-4 backdrop-blur-[5px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-2xl border border-slate-200/70 dark:border-slate-850 dark:border-slate-800 ${
          wide ? 'max-w-2xl' : 'max-w-lg'
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-950 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
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
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/70 dark:border-rose-900/50">
          <AlertTriangle size={18} />
        </div>
        <p className="pt-0.5 text-xs sm:text-sm leading-6 text-slate-600 dark:text-slate-300">{message}</p>
      </div>
      <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
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
    <div className="relative">
      <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
      <input
        aria-label="Carian"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-w-0 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-8 pr-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-red-600 focus:ring-4 focus:ring-red-500/10 sm:min-w-[200px]"
      />
    </div>
  );
}
