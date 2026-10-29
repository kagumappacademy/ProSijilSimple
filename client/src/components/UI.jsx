import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, X, Search, ChevronLeft, ChevronRight, Inbox, AlertTriangle } from 'lucide-react';

export function Logo({ light = false, small = false, center = false, className = '' }) {
  return (
    <div
      className={`flex items-center gap-2.5 select-none transition-all duration-200 ${
        center ? 'justify-center mx-auto text-left' : ''
      } ${className}`}
    >
      <img
        src="/logo-prosijil.png"
        alt="Logo ProSijil"
        className={`${small ? 'h-7 sm:h-8' : 'h-8 sm:h-10 md:h-11'} w-auto object-contain shrink-0 transition-transform hover:scale-105 duration-200 ${
          light ? 'brightness-0 invert' : ''
        }`}
      />
      <div className="leading-tight shrink-0 hidden sm:block">
        <span
          className={`block ${
            small ? 'text-xs sm:text-[13px]' : 'text-base sm:text-lg'
          } font-black tracking-tight whitespace-nowrap ${light ? 'text-white' : 'text-slate-950'}`}
        >
          AKADEMI <span className={light ? 'text-red-400' : 'text-red-700'}>PROSILAT</span>
        </span>
        <span
          className={`block ${
            small ? 'text-[7.5px] sm:text-[8px] tracking-[0.08em]' : 'text-[8.5px] sm:text-[9px] tracking-[0.14em]'
          } uppercase font-bold whitespace-nowrap ${
            light ? 'text-white/70' : 'text-slate-400'
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
    // Apple & Google Style Primary: Refined Crimson Gradient with diffused glow
    primary:
      'bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-650 text-white shadow-[0_2px_8px_-1px_rgba(220,38,38,0.35)] hover:shadow-[0_5px_16px_-2px_rgba(220,38,38,0.45)] border border-red-500/30 focus:ring-4 focus:ring-red-500/15',
    // Apple Frosted Neutral Pill
    secondary:
      'bg-slate-100/90 hover:bg-slate-200/90 text-slate-800 border border-slate-200/70 hover:border-slate-300 shadow-2xs hover:shadow-xs focus:ring-4 focus:ring-slate-300/20',
    // Minimalist Ghost
    ghost:
      'text-slate-600 hover:text-slate-950 hover:bg-slate-100/80 active:bg-slate-200/70',
    // Apple Soft Danger
    danger:
      'bg-rose-50 text-rose-700 hover:bg-rose-100/90 border border-rose-200/70 shadow-2xs focus:ring-4 focus:ring-rose-500/15',
    // Dark Apple Obsidian
    dark:
      'bg-slate-950 text-white hover:bg-slate-800 border border-slate-800 shadow-sm focus:ring-4 focus:ring-slate-500/15',
    // Amber / Gold Accent
    gold:
      'bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-xs border border-amber-400/40',
  };

  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold tracking-tight transition-all duration-200 ease-out active:scale-[0.97] disabled:opacity-45 disabled:pointer-events-none cursor-pointer ${types[variant] || types.primary} ${className}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin shrink-0" /> : null}
      {children}
    </button>
  );
}

export function Input({ label, error, className = '', ...props }) {
  return (
    <label className="block space-y-1.5">
      {label && <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>}
      <input
        {...props}
        className={`w-full rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-white focus:bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-red-600/80 focus:ring-4 focus:ring-red-500/10 shadow-2xs ${className}`}
      />
      {error && <span className="text-[11px] font-medium text-rose-600">{error}</span>}
    </label>
  );
}

export function Select({ label, children, className = '', ...props }) {
  return (
    <label className="block space-y-1.5">
      {label && <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>}
      <select
        {...props}
        className={`w-full rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-white focus:bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none transition-all duration-200 focus:border-red-600/80 focus:ring-4 focus:ring-red-500/10 shadow-2xs ${className}`}
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="mb-5 sm:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        {eyebrow && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-widest text-red-700 border border-red-100/80 mb-1.5 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
            <span>{eyebrow}</span>
          </div>
        )}
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-950 leading-tight">
          {title}
        </h1>
        {desc && (
          <p className="text-xs sm:text-[13px] text-slate-500 mt-1 max-w-2xl leading-relaxed font-normal">
            {desc}
          </p>
        )}
      </div>
      {acts && <div className="flex flex-wrap items-center gap-2 shrink-0">{acts}</div>}
    </motion.div>
  );
}

export function Panel({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl sm:rounded-3xl border border-slate-200/70 bg-white/95 backdrop-blur-sm shadow-[0_2px_16px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.06)] transition-shadow duration-300 ${className}`}
    >
      {children}
    </div>
  );
}

export function Chip({ children, color = 'emerald', className = '' }) {
  const c = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    rose: 'bg-rose-50 text-rose-700 border-rose-200/60',
    red: 'bg-red-50 text-red-700 border-red-200/60',
    gold: 'bg-amber-50 text-amber-800 border-amber-200/60',
    slate: 'bg-slate-100 text-slate-700 border-slate-200/60',
    forest: 'bg-red-50 text-red-700 border-red-200/60',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold tracking-tight shadow-2xs ${
        c[color] || c.emerald
      } ${className}`}
    >
      {children}
    </span>
  );
}

export function Empty({ title = 'Belum ada data', message = 'Rekod akan dipaparkan di sini.', icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 sm:py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 border border-slate-200/70 shadow-2xs">
        <Icon size={22} />
      </div>
      <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm tracking-tight">{title}</h3>
      <p className="mt-1 max-w-xs text-xs text-slate-400 leading-relaxed font-normal">{message}</p>
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

  // Strictly concentric, perfectly scaled circular dimensions (standard Tailwind classes)
  const outerSize = isSm ? 'h-9 w-9' : isLg ? 'h-20 w-20' : 'h-14 w-14';
  const innerSize = isSm ? 'h-6 w-6' : isLg ? 'h-12 w-12' : 'h-9 w-9';
  const logoSize = isSm ? 'h-3.5 w-3.5' : isLg ? 'h-7 w-7' : 'h-5 w-5';
  const trackBorder = isSm ? 'border-2' : isLg ? 'border-[3px]' : 'border-[2.5px]';

  const content = (
    <div className={`flex flex-col items-center justify-center text-center select-none py-8 sm:py-10 px-4 ${className}`}>
      {/* Concentric Circular Spinner with Centered Brand Emblem (Zero corner clipping) */}
      <div className={`relative flex items-center justify-center ${outerSize}`}>
        {/* Soft ambient glow behind spinner */}
        <div className="absolute inset-0 rounded-full bg-red-600/10 blur-md pointer-events-none" />

        {/* Outer Circular Track & Spinning Arc */}
        <div
          className={`absolute inset-0 rounded-full ${trackBorder} border-slate-100 border-t-red-600 border-r-rose-500/80 animate-spin`}
          style={{ animationDuration: '0.9s' }}
        />

        {/* Concentric Inner Circle: Strictly rounded-full to eliminate any corner clipping */}
        <motion.div
          animate={{
            scale: [0.97, 1.02, 0.97],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className={`relative z-10 flex items-center justify-center rounded-full bg-white shadow-xs border border-slate-100 ${innerSize}`}
        >
          <img
            src="/logo-prosijil.png"
            alt="ProSijil"
            className={`${logoSize} object-contain`}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </motion.div>
      </div>

      {/* Text & Aesthetic Minimalist Progress Indicator */}
      <div className="mt-3.5 flex flex-col items-center max-w-xs">
        <div className="text-xs sm:text-sm font-extrabold tracking-tight text-slate-800">
          {text}
        </div>

        {subtext ? (
          <p className="mt-1 text-[11px] text-slate-400 max-w-xs leading-relaxed font-normal">
            {subtext}
          </p>
        ) : (
          <div className="mt-2.5 h-1 w-24 sm:w-28 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              animate={{
                x: ['-100%', '150%'],
              }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="h-full w-1/2 rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-red-600"
            />
          </div>
        )}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/90 backdrop-blur-md p-4">
        <div className="rounded-3xl border border-slate-100 bg-white/95 p-6 sm:p-8 shadow-2xl max-w-xs w-full">
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-sm rounded-3xl bg-white p-6 sm:p-7 text-center shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18)] border border-slate-100"
      >
        <Loading text={title} subtext={subtitle} size="lg" />
      </motion.div>
    </div>
  );
}

export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 bg-[#FCFDFB] px-4 py-2.5 text-xs">
      <span className="text-xs text-slate-500 font-medium">
        Halaman <strong className="text-slate-800 font-bold">{page}</strong> daripada <strong className="text-slate-800 font-bold">{pages}</strong>
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
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/35 p-3 sm:p-4 backdrop-blur-md"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-3xl bg-white p-5 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)] border border-slate-200/60 ${
          wide ? 'max-w-2xl' : 'max-w-lg'
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-950">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
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
      <div className="flex gap-3.5">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/70 shadow-2xs">
          <AlertTriangle size={20} />
        </div>
        <p className="pt-1 text-xs sm:text-sm leading-6 text-slate-600">{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-3">
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
        className="w-full min-w-0 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-white focus:bg-white py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-red-600/80 focus:ring-4 focus:ring-red-500/10 shadow-2xs sm:min-w-[200px]"
      />
    </div>
  );
}
