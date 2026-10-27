/**
 * Definisi Jenis & Kategori Sijil Rasmi
 * 1. Sijil Kenaikan Tali Pinggang (mengandungi Ujian Cula Merah, Kuning, Hijau, Hitam)
 * 2. Sijil Pencapaian
 * 3. Sijil Penghargaan
 * 4. Sijil Penyertaan
 */

export const CERT_CATEGORIES = [
  {
    id: 'kenaikan_tali_pinggang',
    label: 'Sijil Kenaikan Tali Pinggang',
    shortLabel: 'Kenaikan Tali Pinggang',
    emoji: '🥋',
    hasCula: true,
    description: 'Sijil kenaikan tali pinggang / bengkung pesilat mengikut warna cula (Merah, Kuning, Hijau, Hitam).',
    badge: 'bg-red-50 text-red-700 border-red-200',
    chip: 'red',
    dot: 'bg-red-600',
    headerBg: 'from-red-600 to-rose-700',
    activeTabClass: 'bg-red-700 text-white shadow-xs',
  },
  {
    id: 'pencapaian',
    label: 'Sijil Pencapaian',
    shortLabel: 'Pencapaian',
    emoji: '🏆',
    hasCula: false,
    description: 'Sijil pencapaian kejohanan, pertandingan silat, atau anugerah kecemerlangan.',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    chip: 'gold',
    dot: 'bg-amber-500',
    headerBg: 'from-amber-600 to-yellow-600',
    activeTabClass: 'bg-amber-600 text-white shadow-xs',
  },
  {
    id: 'penghargaan',
    label: 'Sijil Penghargaan',
    shortLabel: 'Penghargaan',
    emoji: '🎖️',
    hasCula: false,
    description: 'Sijil penghargaan kepada jurulatih, penceramah, pembantu, atau jawatankuasa penganjur.',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    chip: 'emerald',
    dot: 'bg-emerald-600',
    headerBg: 'from-emerald-600 to-teal-700',
    activeTabClass: 'bg-emerald-700 text-white shadow-xs',
  },
  {
    id: 'penyertaan',
    label: 'Sijil Penyertaan',
    shortLabel: 'Penyertaan',
    emoji: '📜',
    hasCula: false,
    description: 'Sijil penyertaan kursus, bengkel latihan, perkhemahan, atau program silat.',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    chip: 'slate',
    dot: 'bg-slate-600',
    headerBg: 'from-slate-700 to-slate-900',
    activeTabClass: 'bg-slate-800 text-white shadow-xs',
  },
];

export const CULA_GROUPS = [
  {
    id: 'merah',
    label: 'Cula Merah',
    shortLabel: 'Merah',
    color: 'rose',
    dot: 'bg-rose-500',
    chip: 'rose',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    border: 'border-rose-200 hover:border-rose-400',
    order: 1,
  },
  {
    id: 'kuning',
    label: 'Cula Kuning',
    shortLabel: 'Kuning',
    color: 'gold',
    dot: 'bg-amber-400',
    chip: 'gold',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    border: 'border-amber-200 hover:border-amber-400',
    order: 2,
  },
  {
    id: 'hijau',
    label: 'Cula Hijau',
    shortLabel: 'Hijau',
    color: 'emerald',
    dot: 'bg-emerald-500',
    chip: 'emerald',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    border: 'border-emerald-200 hover:border-emerald-400',
    order: 3,
  },
  {
    id: 'hitam',
    label: 'Cula Hitam',
    shortLabel: 'Hitam',
    color: 'slate',
    dot: 'bg-slate-900',
    chip: 'slate',
    badge: 'bg-slate-900 text-white border-slate-700',
    border: 'border-slate-300 hover:border-slate-500',
    order: 4,
  },
];

export const LEVEL_RANK_ORDER = [
  'Ujian Awan Putih Cula Merah 1',
  'Ujian Awan Putih Cula Merah 2',
  'Ujian Awan Putih Cula Merah 3',
  'Ujian Awan Putih Cula Kuning 1',
  'Ujian Awan Putih Cula Kuning 2',
  'Ujian Awan Putih Cula Kuning 3',
  'Ujian Awan Putih Cula Hijau 1',
  'Ujian Awan Putih Cula Hijau 2',
  'Ujian Awan Putih Cula Hijau 3',
  'Ujian Awan Putih Cula Hitam 1',
  'Ujian Awan Putih Cula Hitam 2',
  'Ujian Awan Putih Cula Hitam 3',
];

/**
 * Pengesanan automatik kategori sijil
 */
export function getCertCategory(item) {
  if (!item) return 'kenaikan_tali_pinggang';

  if (item.kategori) {
    const k = item.kategori.toLowerCase().trim();
    if (k === 'kenaikan_tali_pinggang' || k === 'kenaikan' || k === 'tali_pinggang' || k === 'bengkung') {
      return 'kenaikan_tali_pinggang';
    }
    if (k === 'pencapaian') return 'pencapaian';
    if (k === 'penghargaan') return 'penghargaan';
    if (k === 'penyertaan') return 'penyertaan';
  }

  const name = (
    (item.nama_sijil || '') + ' ' +
    (item.nama_template || '') + ' ' +
    (item.peringkat || '') + ' ' +
    (item.keterangan || '')
  ).toLowerCase();

  if (name.includes('pencapaian')) return 'pencapaian';
  if (name.includes('penghargaan')) return 'penghargaan';
  if (name.includes('penyertaan')) return 'penyertaan';
  if (
    name.includes('kenaikan') ||
    name.includes('tali pinggang') ||
    name.includes('bengkung') ||
    name.includes('cula') ||
    name.includes('awan putih') ||
    name.includes('ujian')
  ) {
    return 'kenaikan_tali_pinggang';
  }

  return 'kenaikan_tali_pinggang';
}

/**
 * Mengambil metadata kategori sijil
 */
export function getCategoryMeta(catId) {
  return CERT_CATEGORIES.find((c) => c.id === catId) || CERT_CATEGORIES[0];
}

/**
 * Mengesan warna Cula daripada nama peringkat
 */
export function getCulaCategory(rank = '') {
  const r = (rank || '').toLowerCase();
  if (r.includes('merah')) return 'merah';
  if (r.includes('kuning')) return 'kuning';
  if (r.includes('hijau')) return 'hijau';
  if (r.includes('hitam')) return 'hitam';
  return 'lain';
}

/**
 * Mengambil metadata gaya peringkat/cula
 */
export function getRankMeta(rank = '') {
  const cula = getCulaCategory(rank);
  const match = CULA_GROUPS.find((g) => g.id === cula);
  if (match) {
    return {
      chip: match.chip,
      border: match.border,
      badge: match.badge,
      dot: match.dot,
      category: match.id,
      label: match.label,
    };
  }
  return {
    chip: 'red',
    border: 'border-slate-200 hover:border-red-400',
    badge: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-600',
    category: 'lain',
    label: rank || 'Lain-lain',
  };
}

/**
 * Fungsi sorting berperingkat untuk templat
 * Kategori: Kenaikan Tali Pinggang (Merah -> Kuning -> Hijau -> Hitam) -> Pencapaian -> Penghargaan -> Penyertaan
 */
export function sortTemplatesList(templates = []) {
  const catOrder = {
    kenaikan_tali_pinggang: 1,
    pencapaian: 2,
    penghargaan: 3,
    penyertaan: 4,
  };

  const culaOrder = {
    merah: 1,
    kuning: 2,
    hijau: 3,
    hitam: 4,
    lain: 5,
  };

  return [...templates].sort((a, b) => {
    const catA = getCertCategory(a);
    const catB = getCertCategory(b);
    if (catA !== catB) {
      return (catOrder[catA] || 99) - (catOrder[catB] || 99);
    }

    if (catA === 'kenaikan_tali_pinggang') {
      const culaA = getCulaCategory(a.peringkat);
      const culaB = getCulaCategory(b.peringkat);
      if (culaA !== culaB) {
        return (culaOrder[culaA] || 99) - (culaOrder[culaB] || 99);
      }
      const idxA = LEVEL_RANK_ORDER.indexOf(a.peringkat);
      const idxB = LEVEL_RANK_ORDER.indexOf(b.peringkat);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    }

    return (a.nama_template || '').localeCompare(b.nama_template || '');
  });
}
