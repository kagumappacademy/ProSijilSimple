import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Sun, Moon, Clock, Calendar } from 'lucide-react';

const ThemeContext = createContext(null);
const LangContext = createContext(null);

export const TRANSLATION_PAIRS = [
  // Navigation & Branding
  ['Dashboard', 'Dashboard'],
  ['Pengurusan Pesilat', 'Student Management'],
  ['Templat Sijil', 'Certificate Templates'],
  ['Janaan Sijil', 'Generate Certificates'],
  ['Pengurusan Sijil', 'Certificate Management'],
  ['Import CSV', 'Import CSV'],
  ['Tetapan Sistem', 'System Settings'],
  ['Lihat Portal Awam', 'View Public Portal'],
  ['Log Keluar', 'Log Out'],
  ['Log keluar', 'Log out'],
  ['Anda telah log keluar.', 'You have logged out.'],
  ['Sistem Aktif', 'System Active'],
  ['Pentadbir Akademi', 'Academy Admin'],
  ['MENU UTAMA', 'MAIN MENU'],
  ['Portal Admin', 'Admin Portal'],
  ['Akademi ProSilat / Admin', 'Akademi ProSilat / Admin'],
  ['Sistem Pengurusan Sijil', 'Certificate Management System'],
  ['Sistem Pengurusan Sijil Digital', 'Digital Certificate Management System'],

  // Dashboard & Greetings
  ['PAPAN PEMUKA', 'DASHBOARD'],
  ['Selamat kembali 👋', 'Welcome back 👋'],
  ['Selamat kembali', 'Welcome back'],
  ['SELAMAT KEMBALI', 'WELCOME BACK'],
  ['Ringkasan pengurusan sijil & pesilat', 'Summary of certificates & student management'],
  ['Jumlah Pesilat', 'Total Students'],
  ['Sijil Dikeluarkan', 'Certificates Issued'],
  ['Jumlah Cawangan', 'Total Branches'],
  ['Rekod rasmi', 'Official records'],
  ['Urus Pesilat', 'Manage Students'],
  ['Jana Sijil Pukal', 'Bulk Certificate Generation'],
  ['Senarai Sijil', 'Certificate List'],
  ['Mengikut Peringkat', 'By Rank Level'],
  ['Mengikut Cawangan', 'By Branch'],
  ['Sijil Terkini', 'Recent Certificates'],
  ['Belum ada sijil', 'No certificates yet'],
  ['Keluarkan sijil pertama melalui menu Pengurusan Sijil.', 'Issue first certificate via Certificate Management menu.'],
  ['Belum ada data', 'No data yet'],
  ['Rekod akan dipaparkan di sini.', 'Records will be displayed here.'],

  // Common UI actions & words
  ['Tindakan', 'Actions'],
  ['Status', 'Status'],
  ['Cawangan', 'Branch'],
  ['Peringkat', 'Rank Level'],
  ['Semua', 'All'],
  ['Semua Cawangan', 'All Branches'],
  ['Semua Peringkat', 'All Ranks'],
  ['Semua Kumpulan', 'All Groups'],
  ['Carian', 'Search'],
  ['Tapis', 'Filter'],
  ['Pilih', 'Select'],
  ['Pilih Semua', 'Select All'],
  ['Kosongkan', 'Deselect All'],
  ['Pilih Laman Ini', 'Select This Page'],
  ['Nyahpilih Laman Ini', 'Deselect This Page'],
  ['Simpan', 'Save'],
  ['Batal', 'Cancel'],
  ['Tutup', 'Close'],
  ['Padam', 'Delete'],
  ['Kemaskini', 'Update'],
  ['Kemas Kini', 'Update'],
  ['Lihat', 'View'],
  ['Muat Turun', 'Download'],
  ['Muat Turun PDF', 'Download PDF'],
  ['Muat Turun Templat CSV', 'Download CSV Template'],
  ['Muat Turun Semua (ZIP)', 'Download All (ZIP)'],
  ['Eksport CSV', 'Export CSV'],
  ['Import Sekarang', 'Import Now'],
  ['Import Pelajar', 'Import Students'],
  ['Daftar Pesilat Baharu', 'Register New Student'],
  ['Daftar Pesilat', 'Register Student'],
  ['Kemaskini Pesilat', 'Update Student'],
  ['Kemas Kini Maklumat Pesilat', 'Update Student Information'],
  ['Kemas Kini Maklumat Sijil', 'Update Certificate Information'],
  ['Profil Pesilat', 'Student Profile'],
  ['Sijil Dimiliki', 'Owned Certificates'],
  ['SENARAI REKOD', 'RECORD LIST'],
  ['JANAAN AUTOMATIK', 'AUTOMATIC GENERATION'],
  ['REKABENTUK & FORMAT', 'DESIGN & FORMAT'],
  ['REKOD PENGELUARAN', 'ISSUANCE RECORDS'],
  ['IMPORT DATA PUKAL', 'BULK DATA IMPORT'],
  ['KESELAMATAN & AKAUN', 'SECURITY & ACCOUNT'],

  // Table Headers & Form Labels
  ['Nama Pesilat', 'Student Name'],
  ['Nama Peserta', 'Student Name'],
  ['Nama Penuh', 'Full Name'],
  ['Nama Penuh *', 'Full Name *'],
  ['No. KP / ID', 'IC / ID No.'],
  ['No. Kad Pengenalan / ID', 'IC / ID Number'],
  ['Peringkat Bengkung *', 'Belt Rank *'],
  ['Peringkat *', 'Rank Level *'],
  ['Cawangan *', 'Branch *'],
  ['Tarikh Daftar', 'Registration Date'],
  ['Tarikh Pendaftaran *', 'Registration Date *'],
  ['Tarikh Isu', 'Issue Date'],
  ['Tarikh Dikeluarkan', 'Date Issued'],
  ['Tarikh Dikeluarkan *', 'Date Issued *'],
  ['Tarikh Pengeluaran Sijil *', 'Certificate Issue Date *'],
  ['No. Siri', 'Serial No.'],
  ['No. Siri Sijil', 'Certificate Serial No.'],
  ['Nama Sijil', 'Certificate Name'],
  ['Nama Sijil *', 'Certificate Name *'],
  ['Tajuk / Kumpulan Sijil', 'Certificate Title / Group'],
  ['Tajuk / Kumpulan Sijil Rasmi *', 'Official Certificate Title / Group *'],

  // Generation Steps & Descriptions
  ['Langkah 1: Pilih Templat Sijil & Tarikh', 'Step 1: Select Certificate Template & Date'],
  ['Lihat pratonton sijil dari luar dan pilih templat yang diinginkan.', 'Preview certificates and select your desired template.'],
  ['Kotak Pilihan Templat (Pratonton Langsung Dari Luar):', 'Template Selection Box (Live Outside Preview):'],
  ['Klik mana-mana kotak untuk pilih templat & tapis pesilat', 'Click any box to select template & filter students'],
  ['Jana automatik mengikut peringkat', 'Generate automatically by rank'],
  ['Langkah 2: Pilih Pesilat untuk Dijana', 'Step 2: Select Students for Generation'],
  ['Langkah 2: Pilih Pesilat Penerima Sijil', 'Step 2: Select Recipient Students'],
  ['Jana Sijil Rasmi', 'Generate Official Certificates'],
  ['Sedang menjana...', 'Generating...'],
  ['Keputusan Janaan Sijil Pukal', 'Bulk Generation Results'],
  ['Sijil Berjaya Dijana', 'Certificates Successfully Generated'],
  ['Sijil Gagal Dijana', 'Certificates Failed to Generate'],
  ['Jana Lagi', 'Generate More'],
  ['Lihat Senarai Sijil', 'View Certificate List'],
  ['Keluarkan Sijil Manual', 'Issue Manual Certificate'],
  ['Urus Templat PDF', 'Manage PDF Templates'],
  ['Muat Naik Templat', 'Upload Template'],
  ['Muat Naik Templat Sijil', 'Upload Certificate Template'],
  ['Fail Templat PDF (A4 Melintang)', 'Template PDF File (A4 Landscape)'],
  ['Fail Templat (PDF)', 'Template File (PDF)'],
  ['Peringkat Silat / Tali Pinggang', 'Silat Rank / Belt'],
  ['Keterangan Ringkas (Pilihan)', 'Brief Description (Optional)'],
  ['Muat Naik Sekarang', 'Upload Now'],
  ['Pratonton Sijil', 'Certificate Preview'],
  ['Padam templat?', 'Delete template?'],
  ['Padam sijil?', 'Delete certificate?'],
  ['Padam pesilat?', 'Delete student?'],
  ['Ya, padam', 'Yes, delete'],
  ['Tindakan ini tidak boleh diundur.', 'This action cannot be undone.'],

  // Settings
  ['Tukar Kata Laluan', 'Change Password'],
  ['Kemaskini kata laluan akaun pentadbir untuk keselamatan akaun.', 'Update administrator password for account security.'],
  ['Kata Laluan Semasa', 'Current Password'],
  ['Kata Laluan Baharu', 'New Password'],
  ['Sahkan Kata Laluan Baharu', 'Confirm New Password'],
  ['Kemaskini Kata Laluan', 'Update Password'],
  ['Nota Keselamatan', 'Security Note'],

  // CSV Import
  ['Muat Naik Fail CSV', 'Upload CSV File'],
  ['Format .csv (UTF-8), maksimum 10MB.', 'Format .csv (UTF-8), maximum 10MB.'],
  ['Format .csv (UTF-8), saiz maksimum 10MB', 'Format .csv (UTF-8), maximum size 10MB'],
  ['Seret fail CSV ke sini', 'Drag CSV file here'],
  ['Seret fail CSV ke sini atau klik untuk pilih', 'Drag CSV file here or click to select'],
  ['atau klik untuk memilih fail daripada komputer', 'or click to select file from computer'],
  ['Fail Dipilih', 'File Selected'],
  ['Keputusan Import', 'Import Results'],
  ['Jumlah Baris', 'Total Rows'],
  ['Berjaya Ditambah', 'Successfully Added'],
  ['Dilangkau (Bertindih)', 'Skipped (Duplicate)'],
  ['Panduan Format CSV', 'CSV Format Guide'],
  ['Langkah mudah menyediakan fail import pesilat:', 'Simple steps to prepare student import file:'],
  ['Muat turun templat CSV rasmi melalui butang di atas.', 'Download official CSV template via the button above.'],

  // Public & Login
  ['PORTAL PENTADBIR', 'ADMIN PORTAL'],
  ['Log Masuk Admin', 'Admin Login'],
  ['Log Masuk', 'Log In'],
  ['Nama Pengguna', 'Username'],
  ['Kata Laluan', 'Password'],
  ['Ke Halaman Utama', 'To Homepage'],
  ['Semakan Sijil Rasmi', 'Official Certificate Verification'],
  ['Cara Semakan', 'How to Verify'],
  ['Kelebihan', 'Benefits'],
  ['Tentang Kami', 'About Us'],
  ['Cari nama pesilat', 'Search student name'],
  ['Semak sijil', 'Verify certificate'],
  ['Muat turun PDF', 'Download PDF'],
  ['Cari Sijil Sekarang', 'Search Certificate Now'],
  ['Sedang menyemak rekod rasmi...', 'Checking official records...'],
  ['Rekod Dijumpai', 'Records Found'],
  ['Tiada Rekod Dijumpai', 'No Records Found'],
  ['Sijil Sah Rasmi', 'Official Valid Certificate'],
  ['Masukkan username', 'Enter username'],
  ['Masukkan maklumat akaun pentadbir untuk meneruskan.', 'Enter administrator credentials to proceed.'],
  ['Satu platform untuk mengurus rekod pesilat, mengeluarkan sijil, dan memperkasakan akademi silat anda.', 'A single platform to manage student records, issue certificates, and empower your silat academy.'],
  ['Urus sijil dengan lebih mudah & teratur.', 'Manage certificates with greater ease & organization.'],

  // Common statuses & helpers
  ['Sedang memuatkan...', 'Loading...'],
  ['Aktif', 'Active'],
  ['Dipilih', 'Selected'],
  ['Pilih', 'Select'],
  ['Pelajar', 'Students'],
  ['pesilat', 'students'],
  ['Pesilat', 'Students'],
  ['templat tersedia', 'templates available'],
  ['Nota:', 'Note:'],
  ['Gantikan Fail Sijil (Pilihan)', 'Replace Certificate File (Optional)'],
  ['Muat Naik Fail Baharu (Pilihan)', 'Upload New File (Optional)'],
  ['Pilih Fail', 'Select File'],
  ['Tiada fail dipilih', 'No file selected'],
  ['Sila tunggu...', 'Please wait...'],
  ['Pilih Cawangan', 'Select Branch'],
  ['Pilih Peringkat', 'Select Rank Level'],
  ['Semua Kategori', 'All Categories'],
  ['Tapis cawangan', 'Filter branch'],
  ['Tapis peringkat', 'Filter rank'],
  ['Susunan', 'Sort order'],
  ['Carian nama...', 'Search name...'],
  ['Cari rekod...', 'Search records...'],
  ['Cari nama atau No. KP...', 'Search name or ID...'],
  ['Cari templat...', 'Search templates...'],
  ['Cari nama atau no. sijil...', 'Search name or certificate number...'],
  ['Masukkan nama atau No. KP...', 'Enter name or ID...'],
  ['Masukkan cawangan...', 'Enter branch...'],
  ['Tukar ke Mod Cerah (Light)', 'Switch to Light Mode'],
  ['Tukar ke Mod Gelap (Dark)', 'Switch to Dark Mode'],
  ['Tukar Bahasa (BM / ENG)', 'Change Language (BM / ENG)'],
];

// Build Bidirectional Lookup Maps
const bmToEnMap = new Map();
const enToBmMap = new Map();

for (const [bm, en] of TRANSLATION_PAIRS) {
  bmToEnMap.set(bm.trim(), en.trim());
  enToBmMap.set(en.trim(), bm.trim());
}

// Regex patterns for dynamic numbers (e.g., "Halaman 1 daripada 5")
const dynamicPatterns = [
  {
    bm: /^Halaman\s+(\d+)\s+daripada\s+(\d+)$/i,
    toEn: (_, p1, p2) => `Page ${p1} of ${p2}`,
    en: /^Page\s+(\d+)\s+of\s+(\d+)$/i,
    toBm: (_, p1, p2) => `Halaman ${p1} daripada ${p2}`,
  },
  {
    bm: /^(\d+)\s+pesilat$/i,
    toEn: (_, n) => `${n} students`,
    en: /^(\d+)\s+students$/i,
    toBm: (_, n) => `${n} pesilat`,
  },
  {
    bm: /^(\d+)\s+Pelajar$/i,
    toEn: (_, n) => `${n} Students`,
    en: /^(\d+)\s+Students$/i,
    toBm: (_, n) => `${n} Pelajar`,
  },
  {
    bm: /^(\d+)\s+templat tersedia$/i,
    toEn: (_, n) => `${n} templates available`,
    en: /^(\d+)\s+templates available$/i,
    toBm: (_, n) => `${n} templat tersedia`,
  },
  {
    bm: /^(\d+)\s+dipilih$/i,
    toEn: (_, n) => `${n} selected`,
    en: /^(\d+)\s+selected$/i,
    toBm: (_, n) => `${n} dipilih`,
  },
  {
    bm: /^(\d+)\s+rekod baharu ditambah\.?$/i,
    toEn: (_, n) => `${n} new records added.`,
    en: /^(\d+)\s+new records added\.?$/i,
    toBm: (_, n) => `${n} rekod baharu ditambah.`,
  },
  {
    bm: /^(\d+)\s+rekod dijumpai$/i,
    toEn: (_, n) => `${n} records found`,
    en: /^(\d+)\s+records found$/i,
    toBm: (_, n) => `${n} rekod dijumpai`,
  },
  {
    bm: /^(\d+)\s+sijil berjaya dijana$/i,
    toEn: (_, n) => `${n} certificates generated successfully`,
    en: /^(\d+)\s+certificates generated successfully$/i,
    toBm: (_, n) => `${n} sijil berjaya dijana`,
  },
];

export const dictionary = {
  bm: {
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
    darkMode: 'Mod Gelap',
    lightMode: 'Mod Cerah',
    days: ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'],
    months: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'],
  },
  en: {
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
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  },
};

/**
 * Checks if a DOM node belongs to a student name or protected field that must NEVER be translated.
 */
function isProtectedNode(node) {
  if (!node) return false;
  const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  if (!el) return false;

  // Check data-no-translate, translate="no", or student name classes
  if (
    el.closest('[data-no-translate="true"]') ||
    el.closest('[translate="no"]') ||
    el.closest('.student-name') ||
    el.getAttribute('data-student-name')
  ) {
    return true;
  }
  return false;
}

/**
 * Translates a single text string according to the target language.
 */
export function translateString(text, targetLang) {
  if (!text || typeof text !== 'string') return text;
  const trimmed = text.trim();
  if (!trimmed) return text;

  if (targetLang === 'en') {
    // Check direct dictionary
    if (bmToEnMap.has(trimmed)) {
      return text.replace(trimmed, bmToEnMap.get(trimmed));
    }
    // Check dynamic patterns
    for (const pat of dynamicPatterns) {
      if (pat.bm.test(trimmed)) {
        return text.replace(trimmed, trimmed.replace(pat.bm, pat.toEn));
      }
    }
  } else if (targetLang === 'bm') {
    // Check direct dictionary
    if (enToBmMap.has(trimmed)) {
      return text.replace(trimmed, enToBmMap.get(trimmed));
    }
    // Check dynamic patterns
    for (const pat of dynamicPatterns) {
      if (pat.en.test(trimmed)) {
        return text.replace(trimmed, trimmed.replace(pat.en, pat.toBm));
      }
    }
  }

  return text;
}

export function AppProvider({ children }) {
  // Theme State
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('prosijil_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  // Language State: 'bm' or 'en'
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('prosijil_lang') || 'bm';
  });

  // Track if translation is currently running to avoid MutationObserver loops
  const isTranslating = useRef(false);

  // Apply Theme
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
      if (body) body.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      if (body) body.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }
    localStorage.setItem('prosijil_theme', theme);
  }, [theme]);

  // Apply Language and update storage
  useEffect(() => {
    localStorage.setItem('prosijil_lang', lang);
    document.documentElement.lang = lang === 'en' ? 'en' : 'ms';
  }, [lang]);

  // Automatic DOM text and attribute translation engine
  useEffect(() => {
    const translateNode = (node) => {
      if (isProtectedNode(node)) return;

      if (node.nodeType === Node.TEXT_NODE) {
        const val = node.nodeValue;
        if (!val || !val.trim()) return;
        const translated = translateString(val, lang);
        if (translated !== val) {
          node.nodeValue = translated;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Translate placeholders
        const placeholder = node.getAttribute('placeholder');
        if (placeholder) {
          const transP = translateString(placeholder, lang);
          if (transP !== placeholder) node.setAttribute('placeholder', transP);
        }
        // Translate title
        const title = node.getAttribute('title');
        if (title && !isProtectedNode(node)) {
          const transT = translateString(title, lang);
          if (transT !== title) node.setAttribute('title', transT);
        }
      }
    };

    const translateTree = (root) => {
      if (!root || isProtectedNode(root)) return;
      isTranslating.current = true;
      try {
        const walker = document.createTreeWalker(
          root,
          NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
          {
            acceptNode: (n) => {
              if (isProtectedNode(n)) return NodeFilter.FILTER_REJECT;
              return NodeFilter.FILTER_ACCEPT;
            },
          }
        );
        let curr = walker.nextNode();
        while (curr) {
          translateNode(curr);
          curr = walker.nextNode();
        }
      } finally {
        isTranslating.current = false;
      }
    };

    // Initial translation pass on the document body
    translateTree(document.body);

    // MutationObserver to translate dynamically rendered elements (modals, dropdowns, page navigations)
    const observer = new MutationObserver((mutations) => {
      if (isTranslating.current) return;
      for (const m of mutations) {
        if (m.type === 'childList') {
          for (const node of m.addedNodes) {
            translateTree(node);
          }
        } else if (m.type === 'characterData') {
          translateNode(m.target);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
    };
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
        className={`pointer-events-none inline-flex h-6 w-6 transform items-center justify-center rounded-full shadow-md transition-transform duration-200 ease-in-out ${
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
  const { lang, setLang } = useLang();

  return (
    <div
      className={`inline-flex items-center rounded-xl p-0.5 border border-slate-200/90 bg-slate-100/90 dark:border-slate-700 dark:bg-slate-800/90 shadow-2xs ${className}`}
      title="Tukar Bahasa (BM / ENG)"
    >
      <button
        type="button"
        onClick={() => setLang('bm')}
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
        onClick={() => setLang('en')}
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

// Live Digital Clock & Date Widget (Waktu Semasa • MYT (GMT+8))
export function ClockWidget({ className = '' }) {
  const { lang } = useLang();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fullDays = {
    bm: ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'],
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  };

  const fullMonths = {
    bm: [
      'Januari',
      'Februari',
      'Mac',
      'April',
      'Mei',
      'Jun',
      'Julai',
      'Ogos',
      'September',
      'Oktober',
      'November',
      'Disember',
    ],
    en: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
  };

  const dayName = (fullDays[lang] || fullDays.bm)[now.getDay()];
  const dateNum = now.getDate();
  const monthName = (fullMonths[lang] || fullMonths.bm)[now.getMonth()];
  const yearNum = now.getFullYear();

  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hh = String(hours).padStart(2, '0');

  const timeStr = `${hh}:${minutes}:${seconds} ${ampm}`;
  const dateStr = `${dayName}, ${dateNum} ${monthName} ${yearNum}`;
  const eyebrowStr = lang === 'en' ? 'CURRENT TIME • MYT (GMT+8)' : 'WAKTU SEMASA • MYT (GMT+8)';

  return (
    <div
      data-no-translate="true"
      translate="no"
      className={`rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 sm:px-5 sm:py-3 shadow-2xs select-none transition-all ${className}`}
      title={`${eyebrowStr}\n${timeStr}\n${dateStr}`}
    >
      <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-none">
        {eyebrowStr}
      </div>
      <div className="text-xl sm:text-2xl lg:text-[26px] font-black tracking-tight text-slate-900 dark:text-white leading-tight font-sans my-1">
        {timeStr}
      </div>
      <div className="text-xs sm:text-[13px] font-semibold text-slate-600 dark:text-slate-400 leading-none">
        {dateStr}
      </div>
    </div>
  );
}
