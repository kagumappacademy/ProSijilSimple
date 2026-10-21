import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../lib/theme';
import { useLanguage } from '../lib/i18n';

export function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? t('ctrl.light', 'Tukar ke Mod Cahaya') : t('ctrl.dark', 'Tukar ke Mod Gelap')}
      title={isDark ? t('ctrl.light', 'Tukar ke Mod Cahaya') : t('ctrl.dark', 'Tukar ke Mod Gelap')}
      className={`group relative flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white dark:bg-slate-900 dark:border-slate-800 p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition-all hover:bg-slate-50 dark:hover:bg-slate-850 shadow-2xs active:scale-95 ${className}`}
    >
      <div className="relative flex h-5 w-5 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 transition-colors">
        {isDark ? (
          <Moon size={13} className="text-amber-400 transition-transform rotate-0" />
        ) : (
          <Sun size={13} className="text-amber-600 transition-transform rotate-0" />
        )}
      </div>
      <span className="hidden sm:inline-block text-[11px] font-bold">
        {isDark ? t('ctrl.dark', 'Gelap') : t('ctrl.light', 'Cahaya')}
      </span>
    </button>
  );
}
