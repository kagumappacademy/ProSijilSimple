import React, { createContext, useContext, useEffect, useState } from 'react';
import { Sun, Moon, Globe, Clock, Calendar } from 'lucide-react';

const ThemeContext = createContext(null);
const LangContext = createContext(null);

export const dictionary = {
  bm: {
    // Navigation
    dashboard: 'Dashboard',
    pesilat: 'Pengurusan Pesilat',
    templates: 'Templat Sijil',
    janaSijil: 'Janaan Sijil',
    sijil: 'Pengurusan Sijil',
    importCsv: 'Import CSV',
    tetapan: 'Tetapan Sistem',
    portalAwam: 'Lihat Portal Awam',
    logKeluar: 'Log Keluar',
    sistemAktif: 'Sistem Aktif',
    adminRole: 'Pentadbir Akademi',
    menuUtama: 'MENU UTAMA',

    // Common actions & words
    cari: 'Cari nama atau No. KP...',
    cawangan: 'Cawangan',
    peringkat: 'Peringkat',
    semua: 'Semua',
    tindakan: 'Tindakan',
    jana: 'Jana Sijil',
    muatTurun: 'Muat Turun',
    lihat: 'Lihat',
    kemaskini: 'Kemaskini',
    padam: 'Padam',
    tambah: 'Tambah',
    batal: 'Batal',
    simpan: 'Simpan',
    salin: 'Salin',
    status: 'Status',
    rekod: 'Rekod',
    tapis: 'Tapis',
    pilih: 'Pilih',
    pelajar: 'Pelajar',
    pesilatCount: 'Pesilat',
    semuaPeringkat: 'Semua Peringkat',
    semuaCawangan: 'Semua Cawangan',

    // Themes
    darkMode: 'Mod Gelap',
    lightMode: 'Mod Cerah',

    // Days & Months
    days: ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'],
    months: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'],
  },
  en: {
    // Navigation
    dashboard: 'Dashboard',
    pesilat: 'Student Management',
    templates: 'Certificate Templates',
    janaSijil: 'Generate Certificates',
    sijil: 'Certificate Management',
    importCsv: 'Import CSV',
    tetapan: 'System Settings',
    portalAwam: 'View Public Portal',
    logKeluar: 'Log Out',
    sistemAktif: 'System Active',
    adminRole: 'Academy Admin',
    menuUtama: 'MAIN MENU',

    // Common actions & words
    cari: 'Search name or ID...',
    cawangan: 'Branch',
    peringkat: 'Rank Level',
    semua: 'All',
    tindakan: 'Actions',
    jana: 'Generate Certificate',
    muatTurun: 'Download',
    lihat: 'View',
    kemaskini: 'Update',
    padam: 'Delete',
    tambah: 'Add',
    batal: 'Cancel',
    simpan: 'Save',
    salin: 'Copy',
    status: 'Status',
    rekod: 'Records',
    tapis: 'Filter',
    pilih: 'Select',
    pelajar: 'Students',
    pesilatCount: 'Students',
    semuaPeringkat: 'All Ranks',
    semuaCawangan: 'All Branches',

    // Themes
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',

    // Days & Months
    days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  },
};

export function AppProvider({ children }) {
  // Theme State
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('prosijil_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  // Language State
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('prosijil_lang') || 'bm';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('prosijil_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('prosijil_lang', lang);
  }, [lang]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleLang = () => {
    setLang((prev) => (prev === 'bm' ? 'en' : 'bm'));
  };

  const t = (key, fallback = '') => {
    return dictionary[lang]?.[key] || fallback || key;
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, setTheme }}>
      <LangContext.Provider value={{ lang, setLang, toggleLang, t }}>
        {children}
      </LangContext.Provider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within AppProvider');
  return ctx;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within AppProvider');
  return ctx;
}

// Small Dark/Light Mode Switch Button
export function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Tukar ke Mod Cerah (Light)' : 'Tukar ke Mod Gelap (Dark)'}
      aria-label="Tukar tema mod cerah / gelap"
      className={`relative inline-flex h-8 w-14 items-center rounded-full p-1 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/30 ${
        isDark ? 'bg-red-950/80 border border-red-800/60' : 'bg-slate-200/90 border border-slate-300/80'
      } ${className}`}
    >
      <span
        className={`pointer-events-none inline-flex h-6 w-6 transform items-center justify-center rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
          isDark ? 'translate-x-6 bg-slate-900 text-amber-300' : 'translate-x-0 bg-white text-slate-700'
        }`}
      >
        {isDark ? <Moon size={13} className="text-amber-300" /> : <Sun size={13} className="text-amber-500" />}
      </span>
    </button>
  );
}

// Button Tukar Bahasa (ENG / BM)
export function LangToggle({ className = '' }) {
  const { lang, toggleLang } = useLang();

  return (
    <div
      className={`inline-flex items-center rounded-xl p-0.5 border border-slate-200/90 bg-slate-100/90 dark:border-slate-750 dark:bg-slate-800/90 dark:border-slate-700 shadow-2xs ${className}`}
      title="Tukar Bahasa (BM / ENG)"
    >
      <button
        type="button"
        onClick={() => lang !== 'bm' && toggleLang()}
        className={`px-2 py-1 rounded-lg text-[11px] font-extrabold transition-all duration-150 ${
          lang === 'bm'
            ? 'bg-red-700 text-white shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        BM
      </button>
      <button
        type="button"
        onClick={() => lang !== 'en' && toggleLang()}
        className={`px-2 py-1 rounded-lg text-[11px] font-extrabold transition-all duration-150 ${
          lang === 'en'
            ? 'bg-red-700 text-white shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
      >
        ENG
      </button>
    </div>
  );
}

// Live Digital Clock & Date Widget (Jam & Tarikh Langsung)
export function ClockWidget({ className = '' }) {
  const { lang } = useLang();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const d = dictionary[lang] || dictionary.bm;
  const dayName = d.days[now.getDay()];
  const dateNum = now.getDate();
  const monthName = d.months[now.getMonth()];
  const yearNum = now.getFullYear();

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  const timeStr = `${hh}:${mm}:${ss}`;
  const dateStr = `${dayName}, ${dateNum} ${monthName} ${yearNum}`;

  return (
    <div
      className={`hidden sm:flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-mono shadow-2xs dark:border-slate-800 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 ${className}`}
      title={`Masa & Tarikh: ${dateStr} ${timeStr}`}
    >
      <div className="flex items-center gap-1.5 text-red-700 dark:text-red-400 font-bold">
        <Clock size={13} className="shrink-0 animate-pulse" />
        <span>{timeStr}</span>
      </div>
      <span className="text-slate-300 dark:text-slate-700">•</span>
      <div className="flex items-center gap-1 text-[11px] font-sans font-semibold text-slate-600 dark:text-slate-400">
        <Calendar size={12} className="shrink-0 text-slate-400 dark:text-slate-500" />
        <span>{dateStr}</span>
      </div>
    </div>
  );
}
