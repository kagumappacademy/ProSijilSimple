import React from 'react';
import { Languages } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

export function LanguageToggle({ className = '' }) {
  const { lang, setLang } = useLanguage();

  return (
    <div
      className={`inline-flex items-center rounded-xl border border-slate-200/90 bg-slate-100/80 dark:bg-slate-900 dark:border-slate-800 p-0.5 text-xs shadow-2xs ${className}`}
      role="group"
      aria-label="Pilih Bahasa / Select Language"
    >
      <button
        type="button"
        onClick={() => setLang('bm')}
        className={`px-2 py-1 rounded-lg text-[10.5px] font-extrabold uppercase transition-all ${
          lang === 'bm'
            ? 'bg-red-700 text-white shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
        title="Bahasa Melayu (BM)"
      >
        BM
      </button>

      <button
        type="button"
        onClick={() => setLang('en')}
        className={`px-2 py-1 rounded-lg text-[10.5px] font-extrabold uppercase transition-all ${
          lang === 'en'
            ? 'bg-red-700 text-white shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
        title="English (ENG)"
      >
        ENG
      </button>
    </div>
  );
}
