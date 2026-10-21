import React, { createContext, useContext, useEffect, useState } from 'react';

const LanguageContext = createContext();

export const translations = {
  bm: {
    // Navigation & Layout
    'nav.dashboard': 'Dashboard',
    'nav.students': 'Pengurusan Pesilat',
    'nav.templates': 'Templat Sijil',
    'nav.generate': 'Janaan Sijil',
    'nav.certificates': 'Pengurusan Sijil',
    'nav.import': 'Import CSV',
    'nav.settings': 'Tetapan Sistem',
    'nav.mainMenu': 'MENU UTAMA',
    'nav.viewPublic': 'Lihat Portal Awam',
    'nav.adminRole': 'Pentadbir Akademi',
    'nav.logout': 'Log keluar',
    'nav.systemOnline': 'Sistem Aktif',
    'brand.subtitle': 'Sistem Pengurusan Sijil',
    'portal.admin': 'Portal Pentadbir',

    // Dashboard
    'dash.title': 'Dashboard',
    'dash.eyebrow': 'RINGKASAN & STATISTIK',
    'dash.desc': 'Pantau bilangan pesilat, status pengeluaran sijil digital, dan rekod terkini mengikut cawangan.',
    'dash.totalStudents': 'Jumlah Pesilat',
    'dash.issuedCerts': 'Sijil Dikeluarkan',
    'dash.totalBranches': 'Jumlah Cawangan',
    'dash.btnManageStudents': 'Urus Pesilat',
    'dash.btnTemplates': 'Templat Sijil',
    'dash.btnBatchGenerate': 'Jana Sijil Pukal',
    'dash.btnCertList': 'Senarai Sijil',
    'dash.byRank': 'Mengikut Peringkat',
    'dash.byBranch': 'Mengikut Cawangan',
    'dash.recentCerts': 'Sijil Terkini',
    'dash.all': 'Semua',
    'dash.noCerts': 'Belum ada sijil',
    'dash.noCertsDesc': 'Keluarkan sijil pertama melalui menu Pengurusan Sijil.',
    'dash.officialRecord': 'Rekod rasmi',

    // Common Actions & Filters
    'action.search': 'Cari...',
    'action.searchPlaceholder': 'Cari nama atau No. KP...',
    'action.allBranches': 'Semua Cawangan',
    'action.allRanks': 'Semua Peringkat',
    'action.save': 'Simpan',
    'action.cancel': 'Batal',
    'action.delete': 'Padam',
    'action.edit': 'Kemaskini',
    'action.view': 'Lihat',
    'action.download': 'Muat Turun',
    'action.downloadPdf': 'Muat Turun PDF',
    'action.generate': 'Jana Sijil',
    'action.close': 'Tutup',
    'action.confirm': 'Sahkan',
    'action.select': 'Pilih',
    'action.selected': 'Dipilih',
    'action.previous': 'Sebelumnya',
    'action.next': 'Seterusnya',
    'action.showing': 'Menunjukkan',
    'action.of': 'daripada',
    'action.students': 'pesilat',
    'action.page': 'Laman',
    'action.selectThisPage': 'Pilih Laman Ini',
    'action.selectAll': 'Pilih Semua Rekod',
    'action.deselectAll': 'Nyahpilih Semua',
    'action.filterActive': 'Tapisan Aktif',
    'action.clearFilter': 'Kosongkan Tapisan',

    // Table Headers
    'th.no': 'No.',
    'th.name': 'Nama Pesilat',
    'th.ic': 'No. KP / ID',
    'th.branch': 'Cawangan',
    'th.rank': 'Peringkat',
    'th.certName': 'Nama Sijil',
    'th.issueDate': 'Tarikh Isu',
    'th.status': 'Status',
    'th.action': 'Tindakan',
    'th.match': 'Padanan Templat',

    // Status Badges
    'status.valid': 'Sah',
    'status.revoked': 'Terbatal',
    'status.ready': 'Templat Sedia',
    'status.noTemplate': 'Tiada Templat',

    // Generation Page
    'gen.title': 'Janaan Sijil Pukal',
    'gen.eyebrow': 'JANAAN AUTOMATIK',
    'gen.desc': 'Pilih pesilat dan templat sijil. Pratonton sijil dipaparkan secara visual dari luar untuk pilihan templat yang tepat.',
    'gen.step1Title': 'Langkah 1: Pilih Templat Sijil & Tarikh',
    'gen.step1Desc': 'Lihat pratonton sijil dari luar dan pilih templat yang diinginkan.',
    'gen.certTitleLabel': 'Tajuk / Kumpulan Sijil Rasmi *',
    'gen.certDateLabel': 'Tarikh Pengeluaran Sijil *',
    'gen.previewBoxTitle': 'Kotak Pilihan Templat (Pratonton Langsung Dari Luar):',
    'gen.previewBoxDesc': 'Klik mana-mana kotak untuk pilih templat & tapis pesilat',
    'gen.allRanksBtn': 'Semua Peringkat',
    'gen.allRanksAuto': 'Jana automatik mengikut peringkat',
    'gen.active': 'Aktif',
    'gen.step2Title': 'Langkah 2: Pilih Pesilat untuk Dijana',
    'gen.generateBtn': 'Jana Sijil Sekarang',
    'gen.generating': 'Menjana Sijil...',
    'gen.selectedCount': 'pesilat dipilih untuk janaan sijil',
    'gen.autoDesc': 'Sijil dijana automatik mengikut peringkat dan didaftarkan ke profil pelajar.',
    'gen.completed': 'Janaan Sijil Selesai!',
    'gen.completedDesc': 'sijil telah berjaya dijana dan didaftarkan ke pangkalan data.',
    'gen.totalSelected': 'Jumlah Dipilih',
    'gen.successful': 'Berjaya Dijana',
    'gen.skipped': 'Dilangkau (Tiada Templat)',
    'gen.generatedListTitle': 'Senarai Fail Sijil PDF Dijana',
    'gen.viewNewCerts': 'Lihat Rekod Sijil Baharu',
    'gen.checkPublic': 'Semak di Portal Awam',

    // Settings Page
    'settings.title': 'Tetapan Sistem',
    'settings.eyebrow': 'KESELAMATAN & AKAUN',
    'settings.desc': 'Kemaskini kata laluan dan urus keselamatan akaun pentadbir sistem.',
    'settings.changePassword': 'Tukar Kata Laluan',
    'settings.changePasswordDesc': 'Kemaskini kata laluan akaun pentadbir untuk keselamatan akaun.',
    'settings.currPassword': 'Kata Laluan Semasa',
    'settings.newPassword': 'Kata Laluan Baharu',
    'settings.confirmPassword': 'Sahkan Kata Laluan Baharu',
    'settings.updatePasswordBtn': 'Kemaskini Kata Laluan',
    'settings.securityNote': 'Nota Keselamatan',
    'settings.securityNoteDesc': 'Gunakan kata laluan sekurang-kurangnya 12 aksara dengan gabungan huruf besar, huruf kecil, angka, dan simbol. Pastikan JWT_SECRET kekal selamat dalam persekitaran produksi.',

    // Student Management
    'students.title': 'Pengurusan Pesilat',
    'students.eyebrow': 'PANGKALAN DATA PESILAT',
    'students.desc': 'Daftar, kemaskini maklumat pesilat, dan urus rekod sijil setiap pesilat secara teratur.',
    'students.addBtn': 'Daftar Pesilat',
    'students.modalAddTitle': 'Daftar Pesilat Baharu',
    'students.modalEditTitle': 'Kemas Kini Maklumat Pesilat',
    'students.fullName': 'Nama Penuh Pesilat',
    'students.icNumber': 'Nombor KP / ID Pelajar',
    'students.branch': 'Cawangan',
    'students.rank': 'Peringkat',
    'students.regDate': 'Tarikh Daftar',
    'students.saveBtn': 'Simpan Pesilat',
    'students.deleteConfirmTitle': 'Padam Rekod Pesilat?',
    'students.deleteConfirmDesc': 'Adakah anda pasti ingin memadam rekod pesilat ini? Tindakan ini tidak boleh dibatalkan.',

    // Certificates Page
    'certs.title': 'Pengurusan Sijil',
    'certs.eyebrow': 'REKOD PENGELUARAN SIJIL',
    'certs.desc': 'Semak, tapis mengikut cawangan dan peringkat, cetak, muat turun, atau batalkan sijil digital rasmi.',
    'certs.byBranch': 'Mengikut Cawangan',
    'certs.byLevel': 'Mengikut Peringkat',
    'certs.searchPlaceholder': 'Cari nama pesilat, No. KP atau No. Sijil...',
    'certs.revokeBtn': 'Batalkan Sijil',
    'certs.revokeConfirm': 'Adakah anda pasti mahu membatalkan sijil ini? Sijil yang dibatalkan tidak lagi sah di portal awam.',
    'certs.downloadAll': 'Muat Turun Semua (ZIP)',
    'certs.exportCsv': 'Eksport CSV',

    // Templates Page
    'templates.title': 'Templat Sijil PDF',
    'templates.eyebrow': 'PENGURUSAN DOKUMEN',
    'templates.desc': 'Muat naik fail templat sijil PDF rasmi untuk setiap cawangan dan peringkat ujian.',
    'templates.uploadBtn': 'Muat Naik Templat PDF',
    'templates.modalTitle': 'Muat Naik Templat Sijil Baharu',
    'templates.nameLabel': 'Tajuk / Kumpulan Sijil (cth: Sijil Kenaikan Bengkung)',
    'templates.branchLabel': 'Cawangan (Kosongkan jika untuk semua cawangan)',
    'templates.rankLabel': 'Peringkat Sasaran (cth: Ujian 1)',
    'templates.pdfFile': 'Pilih Fail PDF Templat',
    'templates.dragDrop': 'Seret & lepas fail PDF di sini atau klik untuk pilih',

    // Import Page
    'import.title': 'Import Pesilat Melalui CSV',
    'import.eyebrow': 'KEMASUKAN DATA PUKAL',
    'import.desc': 'Muat naik fail CSV untuk memasukkan ratusan rekod pesilat secara serentak ke dalam sistem.',
    'import.downloadTemplate': 'Muat Turun Contoh Templat CSV',
    'import.dropzoneTitle': 'Pilih Fail CSV untuk Dimuat Naik',
    'import.dropzoneDesc': 'Pastikan lajur mengandungi: Nama, No KP, Cawangan, Peringkat',
    'import.previewTitle': 'Pratonton Data CSV',
    'import.submitBtn': 'Import Data Sekarang',

    // Public Portal
    'public.howTo': 'Cara Semakan',
    'public.features': 'Kelebihan',
    'public.about': 'Tentang Kami',
    'public.adminLogin': 'Portal Admin',
    'public.badge': 'SISTEM SIJIL DIGITAL PESILAT',
    'public.heroTitle': 'Semakan Sijil Rasmi Akademi ProSilat',
    'public.heroDesc': 'Sistem pengesahan ketulenan sijil digital berasaskan kod QR dan nombor pengenalan rasmi.',
    'public.searchPlaceholder': 'Masukkan nama penuh pesilat atau no. KP...',
    'public.searchBtn': 'Semak Sekarang',
    'public.searching': 'Sedang menyemak rekod rasmi...',
    'public.recordsFound': 'Rekod Ditemui',
    'public.noRecords': 'Tiada rekod ditemui',
    'public.noRecordsDesc': 'Semak ejaan nama penuh atau nombor ID. Sila hubungi pihak akademi jika sijil belum didaftarkan.',
    'public.certList': 'Senarai Sijil Digital Rasmi',
    'public.downloadPdf': 'Muat Turun PDF',
    'public.verifyTitle': 'Pengesahan Ketulenan Sijil',
    'public.verifyDesc': 'Sijil ini telah disahkan sah dan berdaftar secara rasmi dalam pangkalan data Akademi ProSilat.',
    'public.verifyRevoked': 'Sijil ini telah DIBATALKAN oleh pihak pentadbir dan tidak lagi sah.',

    // Header Controls
    'ctrl.light': 'Cahaya',
    'ctrl.dark': 'Gelap',
    'ctrl.lang': 'Bahasa',
    'ctrl.today': 'Hari Ini',
  },
  en: {
    // Navigation & Layout
    'nav.dashboard': 'Dashboard',
    'nav.students': 'Student Management',
    'nav.templates': 'Certificate Templates',
    'nav.generate': 'Batch Generation',
    'nav.certificates': 'Certificate Management',
    'nav.import': 'Import CSV',
    'nav.settings': 'System Settings',
    'nav.mainMenu': 'MAIN MENU',
    'nav.viewPublic': 'View Public Portal',
    'nav.adminRole': 'Academy Administrator',
    'nav.logout': 'Logout',
    'nav.systemOnline': 'System Online',
    'brand.subtitle': 'Certificate Management System',
    'portal.admin': 'Admin Portal',

    // Dashboard
    'dash.title': 'Dashboard',
    'dash.eyebrow': 'OVERVIEW & STATISTICS',
    'dash.desc': 'Monitor student counts, digital certificate issuance status, and latest records by branch.',
    'dash.totalStudents': 'Total Students',
    'dash.issuedCerts': 'Certificates Issued',
    'dash.totalBranches': 'Total Branches',
    'dash.btnManageStudents': 'Manage Students',
    'dash.btnTemplates': 'Certificate Templates',
    'dash.btnBatchGenerate': 'Batch Issue Certs',
    'dash.btnCertList': 'Certificate List',
    'dash.byRank': 'By Rank / Level',
    'dash.byBranch': 'By Branch',
    'dash.recentCerts': 'Recent Certificates',
    'dash.all': 'All',
    'dash.noCerts': 'No certificates yet',
    'dash.noCertsDesc': 'Issue your first certificate through the Certificate Management menu.',
    'dash.officialRecord': 'Official records',

    // Common Actions & Filters
    'action.search': 'Search...',
    'action.searchPlaceholder': 'Search name or IC No...',
    'action.allBranches': 'All Branches',
    'action.allRanks': 'All Ranks',
    'action.save': 'Save',
    'action.cancel': 'Cancel',
    'action.delete': 'Delete',
    'action.edit': 'Edit',
    'action.view': 'View',
    'action.download': 'Download',
    'action.downloadPdf': 'Download PDF',
    'action.generate': 'Generate',
    'action.close': 'Close',
    'action.confirm': 'Confirm',
    'action.select': 'Select',
    'action.selected': 'Selected',
    'action.previous': 'Previous',
    'action.next': 'Next',
    'action.showing': 'Showing',
    'action.of': 'of',
    'action.students': 'students',
    'action.page': 'Page',
    'action.selectThisPage': 'Select This Page',
    'action.selectAll': 'Select All Records',
    'action.deselectAll': 'Deselect All',
    'action.filterActive': 'Active Filter',
    'action.clearFilter': 'Clear Filter',

    // Table Headers
    'th.no': 'No.',
    'th.name': 'Student Name',
    'th.ic': 'IC / ID No.',
    'th.branch': 'Branch',
    'th.rank': 'Rank / Level',
    'th.certName': 'Certificate Title',
    'th.issueDate': 'Issue Date',
    'th.status': 'Status',
    'th.action': 'Action',
    'th.match': 'Template Match',

    // Status Badges
    'status.valid': 'Valid',
    'status.revoked': 'Revoked',
    'status.ready': 'Template Ready',
    'status.noTemplate': 'No Template',

    // Generation Page
    'gen.title': 'Batch Certificate Generation',
    'gen.eyebrow': 'AUTOMATED ISSUANCE',
    'gen.desc': 'Select students and certificate templates. Visual previews allow choosing the exact right template directly.',
    'gen.step1Title': 'Step 1: Select Template & Issue Date',
    'gen.step1Desc': 'View certificate previews and select your desired template.',
    'gen.certTitleLabel': 'Official Certificate Title / Group *',
    'gen.certDateLabel': 'Certificate Issue Date *',
    'gen.previewBoxTitle': 'Template Selector (Direct Live Previews):',
    'gen.previewBoxDesc': 'Click any template card to select template and filter students',
    'gen.allRanksBtn': 'All Ranks',
    'gen.allRanksAuto': 'Auto-match by student rank',
    'gen.active': 'Active',
    'gen.step2Title': 'Step 2: Select Students to Issue Certificates',
    'gen.generateBtn': 'Generate Certificates Now',
    'gen.generating': 'Generating Certificates...',
    'gen.selectedCount': 'students selected for certificate generation',
    'gen.autoDesc': 'Certificates are generated automatically according to rank and linked to student profiles.',
    'gen.completed': 'Batch Generation Completed!',
    'gen.completedDesc': 'certificates successfully generated and registered into database.',
    'gen.totalSelected': 'Total Selected',
    'gen.successful': 'Successfully Generated',
    'gen.skipped': 'Skipped (No Template)',
    'gen.generatedListTitle': 'Generated PDF Certificate Files',
    'gen.viewNewCerts': 'View Issued Certificates',
    'gen.checkPublic': 'Verify in Public Portal',

    // Settings Page
    'settings.title': 'System Settings',
    'settings.eyebrow': 'SECURITY & ACCOUNT',
    'settings.desc': 'Update administrator password and manage account security.',
    'settings.changePassword': 'Change Password',
    'settings.changePasswordDesc': 'Update admin account password to maintain system security.',
    'settings.currPassword': 'Current Password',
    'settings.newPassword': 'New Password',
    'settings.confirmPassword': 'Confirm New Password',
    'settings.updatePasswordBtn': 'Update Password',
    'settings.securityNote': 'Security Note',
    'settings.securityNoteDesc': 'Use a strong password of at least 12 characters combining uppercase, lowercase, numbers, and symbols. Keep JWT_SECRET secure in production environments.',

    // Student Management
    'students.title': 'Student Management',
    'students.eyebrow': 'STUDENT DATABASE',
    'students.desc': 'Register, update student information, and manage each student\'s certificates seamlessly.',
    'students.addBtn': 'Add Student',
    'students.modalAddTitle': 'Register New Student',
    'students.modalEditTitle': 'Edit Student Information',
    'students.fullName': 'Student Full Name',
    'students.icNumber': 'IC / Student ID No.',
    'students.branch': 'Branch',
    'students.rank': 'Rank / Level',
    'students.regDate': 'Registration Date',
    'students.saveBtn': 'Save Student',
    'students.deleteConfirmTitle': 'Delete Student Record?',
    'students.deleteConfirmDesc': 'Are you sure you want to delete this student? This action cannot be undone.',

    // Certificates Page
    'certs.title': 'Certificate Management',
    'certs.eyebrow': 'ISSUED RECORDS',
    'certs.desc': 'Review, filter by branch and rank, print, download, or revoke official digital certificates.',
    'certs.byBranch': 'By Branch',
    'certs.byLevel': 'By Rank / Level',
    'certs.searchPlaceholder': 'Search student name, IC or Certificate No...',
    'certs.revokeBtn': 'Revoke Certificate',
    'certs.revokeConfirm': 'Are you sure you want to revoke this certificate? Revoked certificates will no longer be valid on the public portal.',
    'certs.downloadAll': 'Download All (ZIP)',
    'certs.exportCsv': 'Export CSV',

    // Templates Page
    'templates.title': 'PDF Certificate Templates',
    'templates.eyebrow': 'DOCUMENT MANAGEMENT',
    'templates.desc': 'Upload official PDF certificate templates for each branch and examination rank.',
    'templates.uploadBtn': 'Upload PDF Template',
    'templates.modalTitle': 'Upload New Certificate Template',
    'templates.nameLabel': 'Certificate Title / Group (e.g. Belt Rank Promotion)',
    'templates.branchLabel': 'Branch (Leave blank for all branches)',
    'templates.rankLabel': 'Target Rank / Level (e.g. Ujian 1)',
    'templates.pdfFile': 'Select PDF Template File',
    'templates.dragDrop': 'Drag & drop PDF file here or click to browse',

    // Import Page
    'import.title': 'Import Students via CSV',
    'import.eyebrow': 'BULK DATA ENTRY',
    'import.desc': 'Upload a CSV spreadsheet to import hundreds of student records into the system simultaneously.',
    'import.downloadTemplate': 'Download Sample CSV Template',
    'import.dropzoneTitle': 'Select CSV File to Upload',
    'import.dropzoneDesc': 'Ensure columns include: Name, IC No, Branch, Rank',
    'import.previewTitle': 'CSV Data Preview',
    'import.submitBtn': 'Import Data Now',

    // Public Portal
    'public.howTo': 'How to Verify',
    'public.features': 'Features',
    'public.about': 'About Us',
    'public.adminLogin': 'Admin Portal',
    'public.badge': 'DIGITAL CERTIFICATE SYSTEM',
    'public.heroTitle': 'Verify Official ProSilat Certificates',
    'public.heroDesc': 'Fast, secure digital certificate verification powered by QR codes and official records.',
    'public.searchPlaceholder': 'Enter full student name or IC No...',
    'public.searchBtn': 'Verify Now',
    'public.searching': 'Searching official records...',
    'public.recordsFound': 'Records Found',
    'public.noRecords': 'No records found',
    'public.noRecordsDesc': 'Check the spelling of full name or ID number. Contact the academy if the certificate is not yet registered.',
    'public.certList': 'Official Digital Certificates',
    'public.downloadPdf': 'Download PDF',
    'public.verifyTitle': 'Certificate Authenticity Verified',
    'public.verifyDesc': 'This certificate is verified and officially registered in the Akademi ProSilat database.',
    'public.verifyRevoked': 'This certificate has been REVOKED by the administrator and is no longer valid.',

    // Header Controls
    'ctrl.light': 'Light',
    'ctrl.dark': 'Dark',
    'ctrl.lang': 'Language',
    'ctrl.today': 'Today',
  },
};

export function LanguageProvider({ children }) {
  // Requirement: "apabila baru buka sistem akan keluar mod bm dahulu"
  // Using sessionStorage ensures every fresh browser session always opens in BM first.
  const [lang, setLang] = useState(() => {
    try {
      return sessionStorage.getItem('pro_lang') || 'bm';
    } catch {
      return 'bm';
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('pro_lang', lang);
    } catch {}
  }, [lang]);

  const t = (key, fallback = '') => {
    const dict = translations[lang] || translations.bm;
    if (dict[key] !== undefined) return dict[key];
    if (translations.bm[key] !== undefined) return translations.bm[key];
    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      lang: 'bm',
      setLang: () => {},
      t: (k, fb) => fb || k,
    };
  }
  return ctx;
}
