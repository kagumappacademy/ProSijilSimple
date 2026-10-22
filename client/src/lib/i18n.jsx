import React, { createContext, useContext, useEffect, useState } from 'react';
import { Clock, Calendar, Globe } from 'lucide-react';

const DICTIONARY = {
  bm: {
    // Brand & System
    brandName: 'AKADEMI PROSILAT',
    brandTagline: 'Sistem Pengurusan Sijil',
    adminTitle: 'Portal Admin',
    systemActive: 'Sistem Aktif',
    adminRole: 'Pentadbir Akademi',
    logout: 'Log Keluar',
    logoutSuccess: 'Anda telah log keluar.',
    viewPublicPortal: 'Lihat Portal Awam',
    mainMenu: 'MENU UTAMA',
    closeMenu: 'Tutup menu',
    openMenu: 'Buka menu',

    // Dashboard
    dashboard: 'Dashboard',
    overviewEyebrow: 'GAMBARAN KESELURUHAN',
    overviewTitle: 'Paparan Utama Pentadbiran',
    overviewDesc: 'Statistik masa nyata dan capaian pantas pengurusan sijil digital.',
    statStudents: 'Jumlah Pesilat',
    statCerts: 'Sijil Dikeluarkan',
    statBranches: 'Jumlah Cawangan',
    btnManageStudents: 'Urus Pesilat',
    btnTemplates: 'Templat Sijil',
    btnBatchGenerate: 'Jana Sijil Pukal',
    btnCertList: 'Senarai Sijil',
    analyticsRank: 'Mengikut Peringkat',
    analyticsBranch: 'Mengikut Cawangan',
    recentCerts: 'Sijil Terkini',
    viewAll: 'Semua',
    noCertsYet: 'Belum ada sijil',
    noCertsYetDesc: 'Keluarkan sijil pertama melalui menu Pengurusan Sijil.',

    // Students
    studentsMenu: 'Pengurusan Pesilat',
    studentsEyebrow: 'PENGURUSAN PESILAT',
    studentsTitle: 'Senarai Pesilat Akademi',
    studentsDesc: 'Urus pendaftaran pesilat, maklumat cawangan, dan sejarah sijil yang diperolehi.',
    btnRegisterStudent: 'Daftar Pesilat',
    btnImportCSV: 'Import CSV',
    searchPlaceholder: 'Cari nama atau No. KP...',
    allBranches: 'Semua Cawangan',
    allLevels: 'Semua Peringkat',
    thNo: 'No.',
    thName: 'Nama Pesilat',
    thId: 'No. KP / ID',
    thBranch: 'Cawangan',
    thLevel: 'Peringkat',
    thDateReg: 'Tarikh Daftar',
    thCerts: 'Sijil',
    thActions: 'Tindakan',
    btnViewCerts: 'Lihat Sijil',
    btnEdit: 'Kemaskini',
    btnDelete: 'Padam',
    noStudentsFound: 'Tiada pesilat ditemui',
    noStudentsFoundDesc: 'Sila ubah carian atau kriteria tapisan cawangan/peringkat.',
    pageShowing: 'Menunjukkan',
    pageOf: 'daripada',
    pageStudentsCount: 'pesilat',
    pageLabel: 'Laman',
    prevPage: 'Sebelumnya',
    nextPage: 'Seterusnya',
    modalRegisterTitle: 'Daftar Pesilat Baharu',
    modalEditTitle: 'Kemaskini Maklumat Pesilat',
    fullNameLabel: 'Nama Penuh Pesilat',
    idNumberLabel: 'Nombor Kad Pengenalan / ID',
    branchLabel: 'Cawangan',
    levelLabel: 'Peringkat Silat',
    dateRegLabel: 'Tarikh Pendaftaran',
    btnCancel: 'Batal',
    btnSave: 'Simpan',
    btnSaving: 'Menyimpan...',
    confirmDeleteStudentTitle: 'Padam Rekod Pesilat?',
    confirmDeleteStudentDesc: 'Tindakan ini akan memadam pesilat ini beserta semua rekod sijil yang berkaitan secara kekal.',
    btnConfirmDelete: 'Ya, Padam',

    // Templates
    templatesMenu: 'Templat Sijil',
    templatesEyebrow: 'REKABENTUK & FORMAT',
    templatesTitle: 'Templat Sijil PDF',
    templatesDesc: 'Muat naik fail PDF sijil rasmi mengikut peringkat pesilat untuk dijana secara automatik.',
    btnUploadTemplate: 'Muat Naik Templat',
    modalUploadTemplateTitle: 'Muat Naik Fail PDF Templat Sijil',
    templateTitleLabel: 'Tajuk / Kumpulan Sijil Rasmi',
    templateRankLabel: 'Peringkat Pesilat untuk Templat Ini',
    templateFileLabel: 'Pilih Fail PDF Templat',
    btnUpload: 'Muat Naik',
    btnUploading: 'Memuat Naik...',
    noTemplatesFound: 'Tiada Templat Sijil',
    noTemplatesFoundDesc: 'Sila muat naik fail PDF sijil rasmi pertama anda.',
    templateAvailable: 'templat tersedia',

    // Generate Certificates
    generateMenu: 'Janaan Sijil',
    generateEyebrow: 'JANAAN AUTOMATIK',
    generateTitle: 'Janaan Sijil Pukal',
    generateDesc: 'Pilih pesilat dan templat sijil. Pratonton sijil dipaparkan secara visual dari luar untuk pilihan templat yang tepat.',
    btnManageTemplatesPdf: 'Urus Templat PDF',
    step1Title: 'Langkah 1: Pilih Templat Sijil & Tarikh',
    step1Desc: 'Lihat pratonton sijil dari luar dan pilih templat yang diinginkan.',
    officialCertTitleLabel: 'Tajuk / Kumpulan Sijil Rasmi *',
    issueDateLabel: 'Tarikh Pengeluaran Sijil *',
    visualBoxTitle: 'Kotak Pilihan Templat (Pratonton Langsung Dari Luar):',
    visualBoxDesc: 'Klik mana-mana kotak untuk pilih templat & tapis pesilat',
    allLevelsOption: 'Semua Peringkat',
    autoGenRankDesc: 'Jana automatik mengikut peringkat',
    activeBadge: 'Aktif',
    studentsCountSuffix: 'pesilat',
    selectedBadge: 'Dipilih',
    selectBadge: 'Pilih',
    step2Title: 'Langkah 2: Pilih Pesilat untuk Dijana',
    selectedCountBadge: 'dipilih',
    btnSelectThisPage: 'Pilih Laman Ini',
    btnSelectAllRecords: 'Pilih Semua Rekod',
    btnDeselectAll: 'Nyahpilih Semua',
    recordsFoundText: 'rekod ditemui',
    perPageText: 'pesilat / laman',
    thTemplateMatch: 'Padanan Templat',
    statusTemplateReady: 'Templat Sedia',
    statusNoTemplate: 'Tiada Templat',
    activeFilterText: 'Tapisan Aktif:',
    btnClearFilter: 'Kosongkan Tapisan',
    btnGenerateNow: 'Jana Sijil Sekarang',
    btnGenerating: 'Menjana Sijil...',
    studentsSelectedForGen: 'pesilat dipilih untuk janaan sijil',
    genSubtext: 'Sijil dijana automatik mengikut peringkat dan didaftarkan ke profil pelajar.',
    genCompleteTitle: 'Janaan Sijil Selesai!',
    genTotalSelected: 'Jumlah Dipilih',
    genSuccessCount: 'Berjaya Dijana',
    genFailedCount: 'Dilangkau (Tiada Templat)',
    genFailedListTitle: 'Senarai pesilat yang tidak dapat dijana:',
    genFilesListTitle: 'Senarai Fail Sijil PDF Dijana',
    btnViewCert: 'Lihat',
    btnDownloadPdf: 'Muat Turun',
    btnViewNewCerts: 'Lihat Rekod Sijil Baharu',
    btnVerifyOnPublic: 'Semak di Portal Awam',

    // Certificate Management
    certsMenu: 'Pengurusan Sijil',
    certsEyebrow: 'PENGURUSAN SIJIL',
    certsTitle: 'Senarai & Rekod Sijil',
    certsDesc: 'Urus rekod sijil pesilat mengikut cawangan dan peringkat silat.',
    btnNewCert: 'Jana Sijil Baharu',
    structureByBranchTitle: 'Struktur Rekod Sijil Mengikut Cawangan',
    structureByBranchDesc: 'Pilih cawangan untuk melihat rekod sijil yang dikelompokkan mengikut peringkat.',
    allRecordsLabel: 'Semua Rekod',
    certsCountSuffix: 'sijil',
    ranksInBranchTitle: 'Peringkat Dalam Cawangan:',
    thCertSerial: 'No. Siri Sijil',
    thDateIssued: 'Tarikh Dikeluarkan',
    thPublicVerify: 'Pengesahan Awam',
    badgeVerified: 'Disahkan',
    confirmDeleteCertTitle: 'Padam Rekod Sijil?',
    confirmDeleteCertDesc: 'Tindakan ini akan memadam rekod sijil dan membatalkan pautan semakan awam secara kekal.',
    btnBatchDeleteCerts: 'Padam Sijil Dipilih',
    confirmBatchDeleteCertTitle: 'Padam Sijil-sijil Yang Dipilih?',
    confirmBatchDeleteCertDesc: 'Tindakan ini akan memadam rekod sijil yang dipilih dan membatalkan pautan semakan awam secara kekal.',
    selectedCertsCount: 'sijil dipilih',

    // Import
    importMenu: 'Import CSV',
    importEyebrow: 'IMPORT DATA',
    importTitle: 'Import Senarai Pesilat Melalui CSV',
    importDesc: 'Muat naik fail CSV untuk mendaftarkan senarai pesilat secara pukal.',
    btnDownloadSampleCsv: 'Muat Turun Contoh CSV',
    dropCsvTitle: 'Klik atau seret fail CSV ke sini',
    dropCsvDesc: 'Format disokong: .csv (UTF-8) dengan tajuk lajur yang tepat.',
    btnUploadProcess: 'Muat Naik & Proses CSV',
    csvGuideTitle: 'Panduan Lajur CSV:',

    // Settings
    settingsMenu: 'Tetapan Sistem',
    settingsEyebrow: 'KESELAMATAN & AKAUN',
    settingsTitle: 'Tetapan Sistem',
    settingsDesc: 'Kemaskini kata laluan dan urus keselamatan akaun pentadbir sistem.',
    changePasswordTitle: 'Tukar Kata Laluan',
    changePasswordDesc: 'Kemaskini kata laluan akaun pentadbir untuk keselamatan akaun.',
    currentPasswordLabel: 'Kata Laluan Semasa',
    newPasswordLabel: 'Kata Laluan Baharu',
    confirmPasswordLabel: 'Sahkan Kata Laluan Baharu',
    btnUpdatePassword: 'Kemaskini Kata Laluan',
    securityNoticeTitle: 'Nota Keselamatan',
    securityNoticeDesc: 'Gunakan kata laluan sekurang-kurangnya 12 aksara dengan gabungan huruf besar, huruf kecil, angka, dan simbol. Pastikan JWT_SECRET kekal selamat dalam persekitaran produksi.',

    // Public Portal
    navHowToCheck: 'Cara Semakan',
    navBenefits: 'Kelebihan',
    navAboutUs: 'Tentang Kami',
    btnAdminLogin: 'Admin',
    heroEyebrow: 'SISTEM SIJIL DIGITAL PESILAT',
    heroHeading1: 'Setiap pencapaian,',
    heroHeading2: 'satu kebanggaan.',
    heroSubtitle: 'Semak dan muat turun sijil pencapaian silat anak anda dengan pantas, selamat dan rasmi.',
    searchBoxTitle: 'Semakan Sijil Digital',
    searchBoxDesc: 'Sila masukkan Nama Penuh pesilat sahaja (jangan masukkan No. KP):',
    searchPlaceholderPublic: 'Nama penuh pesilat (cth: Muhammad Adam Bin Ali)',
    searchHelperText: 'Sila masukkan nama penuh pesilat sahaja. Jangan masukkan nombor kad pengenalan (No. KP).',
    searchWarningMinChars: 'Sila masukkan nama penuh pesilat (minima 3 aksara).',
    searchWarningNoIC: 'Sila masukkan nama penuh pesilat sahaja, jangan masukkan No. KP.',
    btnSearchCert: 'Cari Sijil Sekarang',
    btnSearching: 'Sedang Menyemak...',
    recordsFoundHeading: 'Rekod Ditemui',
    studentBadge: 'pesilat',
    dateRegPrefix: 'Tarikh Daftar:',
    certsEarnedHeading: 'Sijil-sijil Yang Telah Dikeluarkan',
    btnVerifyOnline: 'Pengesahan Rasmi',
    downloadPdfBtn: 'Muat Turun PDF',
    quoteText: '“Setiap langkah di gelanggang membina disiplin, keyakinan dan jati diri.”',
    quoteSubtext: 'Mengiktiraf usaha, meraikan pencapaian, menginspirasi generasi.',
    copyrightText: 'Akademi ProSilat. Hak cipta terpelihara.',
    adminLoginLink: 'Log masuk admin',

    // Verification Page
    verifyHeading: 'Pengesahan Sijil',
    verifyValidBadge: 'SIJIL SAH',
    verifyValidMessage: 'Sijil ini wujud dalam rekod rasmi Akademi ProSilat.',
    verifyStudentName: 'Nama Pesilat',
    verifyIdNumber: 'No. KP / ID',
    verifyCertName: 'Nama Sijil',
    verifyRankLevel: 'Peringkat',
    verifyDateIssued: 'Tarikh Dikeluarkan',
    verifySerialNo: 'No. Siri Sijil',
    verifyDownloadBtn: 'Muat Turun Fail PDF Sijil',

    // Auth / Login
    authPortalEyebrow: 'PORTAL PENTADBIR',
    authHeroTitle1: 'Urus sijil dengan lebih',
    authHeroTitle2: 'mudah & teratur.',
    authHeroDesc: 'Satu platform untuk mengurus rekod pesilat, mengeluarkan sijil, dan memperkasakan akademi silat anda.',
    authSystemSubtitle: 'Akademi ProSilat • Sistem Pengurusan Sijil Digital',
    authBackHome: 'Ke Halaman Utama',
    authWelcomeEyebrow: 'SELAMAT KEMBALI',
    authLoginTitle: 'Log Masuk Admin',
    authLoginDesc: 'Masukkan maklumat akaun pentadbir untuk meneruskan.',
    authUsernameLabel: 'Nama Pengguna',
    authPasswordLabel: 'Kata Laluan',
    authSignInBtn: 'Log Masuk Sistem',
    authSigningIn: 'Sedang Log Masuk...',

    // Time & Date Labels
    liveClockLabel: 'WAKTU SEMASA',
  },

  eng: {
    // Brand & System
    brandName: 'AKADEMI PROSILAT',
    brandTagline: 'Certificate Management System',
    adminTitle: 'Admin Portal',
    systemActive: 'System Active',
    adminRole: 'Academy Administrator',
    logout: 'Log Out',
    logoutSuccess: 'You have been logged out.',
    viewPublicPortal: 'View Public Portal',
    mainMenu: 'MAIN MENU',
    closeMenu: 'Close menu',
    openMenu: 'Open menu',

    // Dashboard
    dashboard: 'Dashboard',
    overviewEyebrow: 'SYSTEM OVERVIEW',
    overviewTitle: 'Administration Overview',
    overviewDesc: 'Real-time statistics and quick access to digital certificate management.',
    statStudents: 'Total Students',
    statCerts: 'Certificates Issued',
    statBranches: 'Total Branches',
    btnManageStudents: 'Manage Students',
    btnTemplates: 'Certificate Templates',
    btnBatchGenerate: 'Batch Generate',
    btnCertList: 'Certificate List',
    analyticsRank: 'By Rank Level',
    analyticsBranch: 'By Branch',
    recentCerts: 'Recent Certificates',
    viewAll: 'All',
    noCertsYet: 'No certificates issued yet',
    noCertsYetDesc: 'Issue the first certificate via the Certificate Management menu.',

    // Students
    studentsMenu: 'Student Management',
    studentsEyebrow: 'STUDENT MANAGEMENT',
    studentsTitle: 'Academy Students List',
    studentsDesc: 'Manage student registrations, branch details, and earned certificate history.',
    btnRegisterStudent: 'Register Student',
    btnImportCSV: 'Import CSV',
    searchPlaceholder: 'Search name or ID...',
    allBranches: 'All Branches',
    allLevels: 'All Rank Levels',
    thNo: 'No.',
    thName: 'Student Name',
    thId: 'IC No. / ID',
    thBranch: 'Branch',
    thLevel: 'Rank Level',
    thDateReg: 'Registration Date',
    thCerts: 'Certificates',
    thActions: 'Actions',
    btnViewCerts: 'View Certs',
    btnEdit: 'Edit',
    btnDelete: 'Delete',
    noStudentsFound: 'No students found',
    noStudentsFoundDesc: 'Please adjust your search or branch/rank filter criteria.',
    pageShowing: 'Showing',
    pageOf: 'of',
    pageStudentsCount: 'students',
    pageLabel: 'Page',
    prevPage: 'Previous',
    nextPage: 'Next',
    modalRegisterTitle: 'Register New Student',
    modalEditTitle: 'Update Student Information',
    fullNameLabel: 'Full Student Name',
    idNumberLabel: 'Identity Card Number / ID',
    branchLabel: 'Branch',
    levelLabel: 'Silat Rank Level',
    dateRegLabel: 'Registration Date',
    btnCancel: 'Cancel',
    btnSave: 'Save',
    btnSaving: 'Saving...',
    confirmDeleteStudentTitle: 'Delete Student Record?',
    confirmDeleteStudentDesc: 'This action will permanently delete this student along with all associated certificate records.',
    btnConfirmDelete: 'Yes, Delete',

    // Templates
    templatesMenu: 'Certificate Templates',
    templatesEyebrow: 'DESIGN & FORMAT',
    templatesTitle: 'PDF Certificate Templates',
    templatesDesc: 'Upload official certificate PDF files by rank for automated digital generation.',
    btnUploadTemplate: 'Upload Template',
    modalUploadTemplateTitle: 'Upload PDF Certificate Template',
    templateTitleLabel: 'Official Certificate Title / Group',
    templateRankLabel: 'Student Rank for this Template',
    templateFileLabel: 'Select PDF Template File',
    btnUpload: 'Upload',
    btnUploading: 'Uploading...',
    noTemplatesFound: 'No Certificate Templates',
    noTemplatesFoundDesc: 'Please upload your first official PDF certificate template.',
    templateAvailable: 'templates available',

    // Generate Certificates
    generateMenu: 'Generate Certs',
    generateEyebrow: 'AUTOMATED ISSUANCE',
    generateTitle: 'Batch Certificate Generation',
    generateDesc: 'Select students and certificate template. Live previews are displayed visually for accurate template selection.',
    btnManageTemplatesPdf: 'Manage PDF Templates',
    step1Title: 'Step 1: Select Template & Issue Date',
    step1Desc: 'View live certificate previews and choose your desired template.',
    officialCertTitleLabel: 'Official Certificate Title / Group *',
    issueDateLabel: 'Certificate Issue Date *',
    visualBoxTitle: 'Template Selection Box (Direct Visual Preview):',
    visualBoxDesc: 'Click any box to select a template & filter eligible students',
    allLevelsOption: 'All Rank Levels',
    autoGenRankDesc: 'Auto-generate matching student rank',
    activeBadge: 'Active',
    studentsCountSuffix: 'students',
    selectedBadge: 'Selected',
    selectBadge: 'Select',
    step2Title: 'Step 2: Select Students to Generate',
    selectedCountBadge: 'selected',
    btnSelectThisPage: 'Select This Page',
    btnSelectAllRecords: 'Select All Records',
    btnDeselectAll: 'Deselect All',
    recordsFoundText: 'records found',
    perPageText: 'students / page',
    thTemplateMatch: 'Template Match',
    statusTemplateReady: 'Template Ready',
    statusNoTemplate: 'No Template',
    activeFilterText: 'Active Filter:',
    btnClearFilter: 'Clear Filter',
    btnGenerateNow: 'Generate Certificates Now',
    btnGenerating: 'Generating Certificates...',
    studentsSelectedForGen: 'students selected for certificate generation',
    genSubtext: 'Certificates are generated automatically by rank and saved to student profiles.',
    genCompleteTitle: 'Certificate Generation Completed!',
    genTotalSelected: 'Total Selected',
    genSuccessCount: 'Successfully Generated',
    genFailedCount: 'Skipped (No Template)',
    genFailedListTitle: 'List of students skipped without template:',
    genFilesListTitle: 'Generated PDF Certificate Files',
    btnViewCert: 'View',
    btnDownloadPdf: 'Download',
    btnViewNewCerts: 'View New Certificate Records',
    btnVerifyOnPublic: 'Verify on Public Portal',

    // Certificate Management
    certsMenu: 'Certificate Management',
    certsEyebrow: 'CERTIFICATE MANAGEMENT',
    certsTitle: 'Certificate Records & Management',
    certsDesc: 'Manage student certificate records grouped by branch and martial arts rank level.',
    btnNewCert: 'Generate New Certificate',
    structureByBranchTitle: 'Certificate Records Grouped by Branch',
    structureByBranchDesc: 'Select a branch to view certificate records organized by rank.',
    allRecordsLabel: 'All Records',
    certsCountSuffix: 'certificates',
    ranksInBranchTitle: 'Ranks in Branch:',
    thCertSerial: 'Certificate Serial No.',
    thDateIssued: 'Issue Date',
    thPublicVerify: 'Public Verification',
    badgeVerified: 'Verified',
    confirmDeleteCertTitle: 'Delete Certificate Record?',
    confirmDeleteCertDesc: 'This will permanently remove the certificate record and revoke its public verification link.',
    btnBatchDeleteCerts: 'Delete Selected Certificates',
    confirmBatchDeleteCertTitle: 'Delete Selected Certificates?',
    confirmBatchDeleteCertDesc: 'This action will permanently delete the selected certificate records and revoke their public verification links.',
    selectedCertsCount: 'certificates selected',

    // Import
    importMenu: 'Import CSV',
    importEyebrow: 'DATA IMPORT',
    importTitle: 'Import Students via CSV',
    importDesc: 'Upload a CSV file to register multiple students in bulk.',
    btnDownloadSampleCsv: 'Download Sample CSV',
    dropCsvTitle: 'Click or drag CSV file here',
    dropCsvDesc: 'Supported format: .csv (UTF-8) with exact column headers.',
    btnUploadProcess: 'Upload & Process CSV',
    csvGuideTitle: 'CSV Column Guide:',

    // Settings
    settingsMenu: 'System Settings',
    settingsEyebrow: 'SECURITY & ACCOUNT',
    settingsTitle: 'System Settings',
    settingsDesc: 'Update passwords and manage system administrator account security.',
    changePasswordTitle: 'Change Password',
    changePasswordDesc: 'Update administrator account password for enhanced security.',
    currentPasswordLabel: 'Current Password',
    newPasswordLabel: 'New Password',
    confirmPasswordLabel: 'Confirm New Password',
    btnUpdatePassword: 'Update Password',
    securityNoticeTitle: 'Security Notice',
    securityNoticeDesc: 'Use a password of at least 12 characters with a combination of uppercase letters, lowercase letters, numbers, and symbols. Keep JWT_SECRET secure in production environments.',

    // Public Portal
    navHowToCheck: 'How to Check',
    navBenefits: 'Benefits',
    navAboutUs: 'About Us',
    btnAdminLogin: 'Admin',
    heroEyebrow: 'DIGITAL MARTIAL ARTS CERTIFICATES',
    heroHeading1: 'Every achievement,',
    heroHeading2: 'a source of pride.',
    heroSubtitle: 'Quickly, securely, and officially check and download your child’s silat achievement certificates.',
    searchBoxTitle: 'Digital Certificate Search',
    searchBoxDesc: 'Please enter Student Full Name only (do not enter IC number):',
    searchPlaceholderPublic: 'Student full name (e.g. Muhammad Adam Bin Ali)',
    searchHelperText: 'Please enter the student\'s full name only. Do not enter IC or ID number.',
    searchWarningMinChars: 'Please enter student full name only (minimum 3 characters).',
    searchWarningNoIC: 'Please enter student full name only, do not enter IC number.',
    btnSearchCert: 'Search Certificates Now',
    btnSearching: 'Searching...',
    recordsFoundHeading: 'Records Found',
    studentBadge: 'students',
    dateRegPrefix: 'Registration Date:',
    certsEarnedHeading: 'Official Certificates Issued',
    btnVerifyOnline: 'Official Verification',
    downloadPdfBtn: 'Download PDF',
    quoteText: '“Every step in the arena builds discipline, confidence, and character.”',
    quoteSubtext: 'Recognizing effort, celebrating achievement, inspiring generations.',
    copyrightText: 'Akademi ProSilat. All rights reserved.',
    adminLoginLink: 'Admin sign in',

    // Verification Page
    verifyHeading: 'Certificate Verification',
    verifyValidBadge: 'VALID CERTIFICATE',
    verifyValidMessage: 'This certificate exists in the official records of Akademi ProSilat.',
    verifyStudentName: 'Student Name',
    verifyIdNumber: 'IC No. / ID',
    verifyCertName: 'Certificate Title',
    verifyRankLevel: 'Rank Level',
    verifyDateIssued: 'Issue Date',
    verifySerialNo: 'Certificate Serial No.',
    verifyDownloadBtn: 'Download Certificate PDF',

    // Auth / Login
    authPortalEyebrow: 'ADMIN PORTAL',
    authHeroTitle1: 'Manage certificates with',
    authHeroTitle2: 'ease & structure.',
    authHeroDesc: 'A unified platform to manage student records, issue certificates, and empower your martial arts academy.',
    authSystemSubtitle: 'Akademi ProSilat • Digital Certificate Management System',
    authBackHome: 'Back to Home',
    authWelcomeEyebrow: 'WELCOME BACK',
    authLoginTitle: 'Admin Login',
    authLoginDesc: 'Enter administrator account credentials to proceed.',
    authUsernameLabel: 'Username',
    authPasswordLabel: 'Password',
    authSignInBtn: 'Sign In to System',
    authSigningIn: 'Signing In...',

    // Time & Date Labels
    liveClockLabel: 'CURRENT TIME',
  },
};

const LanguageContext = createContext({
  lang: 'bm',
  setLang: () => {},
  toggleLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }) {
  // Requirement: "apabila baru buka sistem akan keluar mod bm dahulu"
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem('prosijil_lang');
      return saved === 'eng' ? 'eng' : 'bm';
    } catch {
      return 'bm';
    }
  });

  const setLang = (newLang) => {
    const val = newLang === 'eng' ? 'eng' : 'bm';
    setLangState(val);
    try {
      localStorage.setItem('prosijil_lang', val);
    } catch {}
  };

  const toggleLang = () => {
    setLang(lang === 'bm' ? 'eng' : 'bm');
  };

  const t = (key, fallback) => {
    const dict = DICTIONARY[lang] || DICTIONARY.bm;
    if (dict[key] !== undefined) return dict[key];
    if (DICTIONARY.bm[key] !== undefined) return DICTIONARY.bm[key];
    return fallback !== undefined ? fallback : key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}

/**
 * Segmented Switcher Button [ BM | ENG ]
 */
export function LanguageSwitcher({ className = '', light = false }) {
  const { lang, setLang } = useLang();

  return (
    <div
      className={`inline-flex items-center rounded-xl p-0.5 select-none transition-all ${
        light
          ? 'bg-white/10 border border-white/20 text-white backdrop-blur-md'
          : 'bg-slate-100 border border-slate-200/90 text-slate-700'
      } ${className}`}
      role="group"
      aria-label="Tukar Bahasa / Switch Language"
    >
      <button
        type="button"
        onClick={() => setLang('bm')}
        className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition-all ${
          lang === 'bm'
            ? light
              ? 'bg-white text-red-900 shadow-sm font-black'
              : 'bg-red-700 text-white shadow-xs font-black'
            : light
            ? 'text-white/70 hover:text-white'
            : 'text-slate-600 hover:text-red-700'
        }`}
        title="Bahasa Melayu"
      >
        BM
      </button>
      <button
        type="button"
        onClick={() => setLang('eng')}
        className={`px-2.5 py-1 text-[11px] font-extrabold rounded-lg transition-all ${
          lang === 'eng'
            ? light
              ? 'bg-white text-red-900 shadow-sm font-black'
              : 'bg-red-700 text-white shadow-xs font-black'
            : light
            ? 'text-white/70 hover:text-white'
            : 'text-slate-600 hover:text-red-700'
        }`}
        title="English"
      >
        ENG
      </button>
    </div>
  );
}

/**
 * Live Clock and Date Header Component
 * Displays real-time ticking time and formatted current date according to BM or ENG.
 */
export function LiveClock({ light = false, compact = false, showDate = true, className = '' }) {
  const { lang } = useLang();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = () => {
    const hours24 = now.getHours();
    const hours12 = hours24 % 12 || 12;
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ampm = hours24 >= 12 ? 'PM' : 'AM';
    return {
      h24: `${String(hours24).padStart(2, '0')}:${minutes}:${seconds}`,
      h12: `${hours12}:${minutes}:${seconds} ${ampm}`,
    };
  };

  const formatDate = () => {
    if (lang === 'eng') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    } else {
      const days = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
      const months = [
        'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
        'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'
      ];
      return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    }
  };

  const { h12 } = formatTime();
  const dateStr = formatDate();

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-bold select-none ${
          light
            ? 'bg-white/10 text-white border border-white/15 backdrop-blur-sm'
            : 'bg-slate-100 text-slate-800 border border-slate-200'
        } ${className}`}
        title={dateStr}
      >
        <Clock size={13} className={light ? 'text-rose-200' : 'text-red-700'} />
        <span>{h12}</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 sm:gap-3 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs select-none transition-all ${
        light
          ? 'bg-white/10 text-white border border-white/20 backdrop-blur-md shadow-xs'
          : 'bg-[#FCFDFB] text-slate-800 border border-slate-200/90 shadow-2xs'
      } ${className}`}
    >
      {showDate && (
        <div className="hidden md:flex items-center gap-1.5 font-semibold border-r pr-2.5 sm:pr-3 border-current/15">
          <Calendar size={13} className={light ? 'text-rose-200' : 'text-red-700'} />
          <span className="text-[11px] sm:text-xs truncate">{dateStr}</span>
        </div>
      )}
      <div className="flex items-center gap-1.5 font-mono font-extrabold tracking-tight">
        <Clock size={13} className={light ? 'text-rose-200' : 'text-red-700'} />
        <span className={`text-[11px] sm:text-xs font-bold ${light ? 'text-white' : 'text-slate-800'}`}>{h12}</span>
      </div>
    </div>
  );
}
