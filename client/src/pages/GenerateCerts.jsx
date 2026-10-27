import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Award,
  Layers,
  Search,
  CalendarDays,
  Filter,
  ArrowRight,
  ArrowLeft,
  CheckSquare,
  Square,
  FileText,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Maximize2,
  Users,
  Check,
  FileCheck,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, fmtDate } from '../lib/api';
import { PageIntro, Panel, Button, Input, Chip, Loading, Empty, SearchField } from '../components/UI';
import { PdfThumbnail } from '../components/PdfThumbnail';
import { LargeTemplatePreviewModal } from './Templates';
import { useLang } from '../lib/i18n';
import {
  CERT_CATEGORIES,
  CULA_GROUPS,
  getCertCategory,
  getCategoryMeta,
  getCulaCategory,
  getRankMeta,
  sortTemplatesList,
} from '../lib/certTypes';

const PAGE_SIZE = 20;

export function GenerateCerts() {
  const { t, lang } = useLang();
  const navigate = useNavigate();

  // Wizard Step State: 1 = Template & Date, 2 = Select Students, 3 = Review & Generate / Results
  const [currentStep, setCurrentStep] = useState(1);

  // Template Groups
  const [templateGroups, setTemplateGroups] = useState({});
  const [allTemplates, setAllTemplates] = useState([]);
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('semua');
  const [selectedCula, setSelectedCula] = useState('semua');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));

  // Students list & filters
  const [students, setStudents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [levels, setLevels] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Pagination for Step 2
  const [currentPage, setCurrentPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [refreshingTemplates, setRefreshingTemplates] = useState(false);
  const [previewTarget, setPreviewTarget] = useState(null);
  const [result, setResult] = useState(null);

  // Scroll to step content
  const goToStep = (step) => {
    setCurrentStep(step);
    window.scrollTo({ top: 80, behavior: 'smooth' });
  };

  // Load templates
  const loadTemplates = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshingTemplates(true);
    try {
      const url = isManualRefresh ? '/admin/templates/groups?force_sync=1' : '/admin/templates/groups';
      const res = await api(url);
      const groups = res.groups || {};
      setTemplateGroups(groups);
      setAllTemplates(res.templates || []);
      const keys = Object.keys(groups);
      if (keys.length > 0) {
        if (!selectedTemplateName || !keys.includes(selectedTemplateName)) {
          setSelectedTemplateName(keys[0]);
        }
      } else {
        setSelectedTemplateName('');
      }
      if (isManualRefresh) {
        toast.success(lang === 'eng' ? 'Certificate templates updated!' : 'Senarai templat sijil terkini berjaya dikemaskini!');
      }
    } catch (err) {
      toast.error('Gagal memuat senarai templat: ' + err.message);
    } finally {
      if (isManualRefresh) setRefreshingTemplates(false);
    }
  }, [selectedTemplateName, lang]);

  // Load students
  const loadStudents = useCallback(async () => {
    try {
      const res = await api('/admin/students?limit=10000&page=1');
      setStudents(res.rows || []);
      setBranches(res.branches || []);
      setLevels(res.levels || []);
      // Default select all eligible students
      const allIds = new Set((res.rows || []).map((s) => s.id));
      setSelectedIds(allIds);
    } catch (err) {
      toast.error('Gagal memuat senarai pesilat: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
    loadStudents();
  }, [loadTemplates, loadStudents]);

  const norm = (s) =>
    String(s || '')
      .trim()
      .toLowerCase()
      .replace(/^ujian\s+/i, '')
      .replace(/\s+/g, ' ');

  // Count students by level for badges and cards
  const countByLevel = useMemo(() => {
    const counts = {};
    for (const s of students) {
      const k = norm(s.peringkat);
      counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  }, [students]);

  const getStudentCountForLevel = (lvl) => {
    return countByLevel[norm(lvl)] || 0;
  };

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBranch, selectedLevel, searchQuery]);

  // Filter students for Step 2 list
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (selectedBranch && s.cawangan !== selectedBranch) return false;
      if (selectedLevel) {
        const normLevel = norm(selectedLevel);
        if (norm(s.peringkat) !== normLevel && s.peringkat !== selectedLevel) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = s.nama_penuh.toLowerCase().includes(q);
        const matchId = (s.no_kp_atau_id || '').toLowerCase().includes(q);
        if (!matchName && !matchId) return false;
      }
      return true;
    });
  }, [students, selectedBranch, selectedLevel, searchQuery]);

  // Selected students list based on selectedIds
  const selectedStudentsList = useMemo(() => {
    return students.filter((s) => selectedIds.has(s.id));
  }, [students, selectedIds]);

  const idsToGenerate = useMemo(() => {
    return selectedStudentsList.map((s) => s.id);
  }, [selectedStudentsList]);

  // Pagination calculation for Step 2
  const totalStudents = filteredStudents.length;
  const totalPages = Math.ceil(totalStudents / PAGE_SIZE) || 1;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalStudents);
  const pageStudents = useMemo(() => {
    return filteredStudents.slice(startIndex, endIndex);
  }, [filteredStudents, startIndex, endIndex]);

  // Kiraan setiap kategori untuk paparan tab
  const categoryCounts = useMemo(() => {
    const counts = { semua: allTemplates.length, kenaikan_tali_pinggang: 0, pencapaian: 0, penghargaan: 0, penyertaan: 0 };
    for (const t of allTemplates) {
      const cat = getCertCategory(t);
      if (counts[cat] !== undefined) counts[cat] += 1;
      else counts.kenaikan_tali_pinggang += 1;
    }
    return counts;
  }, [allTemplates]);

  // Kiraan cula untuk tab sub-filter tali pinggang
  const culaCounts = useMemo(() => {
    const counts = { semua: 0, merah: 0, kuning: 0, hijau: 0, hitam: 0 };
    for (const t of allTemplates) {
      if (getCertCategory(t) === 'kenaikan_tali_pinggang') {
        counts.semua += 1;
        const c = getCulaCategory(t.peringkat);
        if (counts[c] !== undefined) counts[c] += 1;
      }
    }
    return counts;
  }, [allTemplates]);

  // Senarai nama template ditapis mengikut kategori
  const templateNames = useMemo(() => {
    const allNames = Object.keys(templateGroups);
    if (selectedCategory === 'semua') return allNames;
    const filtered = allNames.filter((name) => {
      const list = templateGroups[name] || [];
      return list.some((t) => getCertCategory(t) === selectedCategory);
    });
    return filtered.length > 0 ? filtered : allNames;
  }, [templateGroups, selectedCategory]);

  useEffect(() => {
    if (templateNames.length > 0 && !templateNames.includes(selectedTemplateName)) {
      setSelectedTemplateName(templateNames[0]);
    }
  }, [templateNames, selectedTemplateName]);

  // Semua templat mentah bagi nama template terpilih (untuk pemadanan auto semasa janaan)
  const rawTemplatesForName = templateGroups[selectedTemplateName] || [];

  // Templat yang ditapis & disusun mengikut Kategori dan Cula (Merah -> Kuning -> Hijau -> Hitam)
  const currentTemplatesForName = useMemo(() => {
    let list = templateGroups[selectedTemplateName] || [];
    if (selectedCategory !== 'semua') {
      list = list.filter((t) => getCertCategory(t) === selectedCategory);
    }
    if (selectedCula !== 'semua') {
      list = list.filter((t) => getCulaCategory(t.peringkat) === selectedCula);
    }
    return sortTemplatesList(list);
  }, [templateGroups, selectedTemplateName, selectedCategory, selectedCula]);

  function getMatchingTemplate(student) {
    if (!rawTemplatesForName.length) return null;
    const sNorm = norm(student.peringkat);
    const match = rawTemplatesForName.find(
      (t) =>
        norm(t.peringkat) === sNorm ||
        t.peringkat.trim().toLowerCase() === student.peringkat.trim().toLowerCase()
    );
    if (match) return match;
    const universal = rawTemplatesForName.find(
      (t) => t.peringkat.trim().toLowerCase() === 'semua peringkat'
    );
    return universal || null;
  }

  // Matching statistics for Step 3 confirmation
  const matchingStats = useMemo(() => {
    let matched = 0;
    let unmatched = 0;
    for (const s of selectedStudentsList) {
      if (getMatchingTemplate(s)) {
        matched++;
      } else {
        unmatched++;
      }
    }
    return { matched, unmatched };
  }, [selectedStudentsList, rawTemplatesForName]);

  // Handle rank level filter change & auto select
  function handleSelectLevelChange(level) {
    setSelectedLevel(level);
    if (level) {
      const normLevel = norm(level);
      const matching = students.filter(
        (s) => norm(s.peringkat) === normLevel || s.peringkat === level
      );
      setSelectedIds(new Set(matching.map((s) => s.id)));
    } else {
      setSelectedIds(new Set(students.map((s) => s.id)));
    }
  }

  function handleSelectLevelChip(level) {
    if (selectedLevel === level || (selectedLevel && norm(selectedLevel) === norm(level))) {
      handleSelectLevelChange('');
    } else {
      handleSelectLevelChange(level);
    }
  }

  // Toggle selection
  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const s of filteredStudents) next.add(s.id);
      return next;
    });
  }

  function deselectAllFiltered() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const s of filteredStudents) next.delete(s.id);
      return next;
    });
  }

  function selectCurrentPage() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const s of pageStudents) next.add(s.id);
      return next;
    });
  }

  function deselectCurrentPage() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const s of pageStudents) next.delete(s.id);
      return next;
    });
  }

  // Handle batch generation in Step 3
  async function handleGenerate() {
    if (idsToGenerate.length === 0) {
      return toast.error('Sila pilih sekurang-kurangnya seorang pesilat untuk dijana sijil.');
    }
    if (!selectedTemplateName) {
      return toast.error('Sila pilih nama templat sijil terlebih dahulu.');
    }

    setGenerating(true);
    setResult(null);

    try {
      const res = await api('/admin/templates/generate-batch', {
        method: 'POST',
        body: {
          pesilat_ids: idsToGenerate,
          nama_template: selectedTemplateName,
          tarikh_isu: issueDate,
        },
      });
      setResult(res);
      if (res.successCount > 0) {
        toast.success(`Berjaya menjana ${res.successCount} sijil digital!`);
        loadStudents();
      }
      if (res.failedCount > 0) {
        toast.warning(`${res.failedCount} pesilat dilangkau kerana tiada templat sepadan.`);
      }
    } catch (err) {
      toast.error('Ralat janaan sijil: ' + err.message);
    } finally {
      setGenerating(false);
    }
  }

  // Restart wizard for a fresh batch
  function handleResetNewBatch() {
    setResult(null);
    goToStep(1);
  }

  return (
    <>
      <PageIntro
        eyebrow={t('generateEyebrow')}
        title={t('generateTitle')}
        desc={t('generateDesc')}
        action={
          <Link
            to="/admin/templates"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 transition hover:bg-slate-50"
          >
            <Layers size={15} /> {t('btnManageTemplatesPdf')}
          </Link>
        }
      />

      {/* ======================================================== */}
      {/* GUIDED PROGRESS BAR (TOP STEP-BY-STEP WIZARD)            */}
      {/* ======================================================== */}
      <div className="mb-4 rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-2xs">
        <div className="relative">
          {/* Animated Connecting Track Line */}
          <div className="absolute top-4 left-8 right-8 -translate-y-1/2 h-1 bg-slate-200 rounded-full z-0 hidden sm:block">
            <div
              className="h-full bg-gradient-to-r from-red-600 via-red-700 to-emerald-600 rounded-full transition-all duration-500 ease-out"
              style={{
                width: currentStep === 1 ? '16%' : currentStep === 2 ? '50%' : '100%',
              }}
            />
          </div>

          {/* Stepper Interactive Nodes */}
          <div className="relative z-10 grid grid-cols-3 gap-1.5 sm:gap-4">
            {/* Step 1 Node */}
            <button
              type="button"
              onClick={() => goToStep(1)}
              className={`group flex flex-col sm:items-center text-left sm:text-center transition cursor-pointer p-1.5 sm:p-2 rounded-xl ${
                currentStep === 1 ? 'bg-red-50/60 sm:bg-transparent' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 sm:flex-col sm:gap-1.5">
                <div
                  className={`grid h-7 w-7 sm:h-9 sm:w-9 place-items-center rounded-full text-xs font-black transition-all shrink-0 ${
                    currentStep > 1
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : currentStep === 1
                      ? 'bg-red-700 text-white ring-4 ring-red-100 shadow-sm scale-105'
                      : 'bg-white border-2 border-slate-300 text-slate-500'
                  }`}
                >
                  {currentStep > 1 ? <Check size={15} strokeWidth={3} /> : '1'}
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-[11px] sm:text-xs font-extrabold truncate ${
                      currentStep === 1
                        ? 'text-red-700'
                        : currentStep > 1
                        ? 'text-emerald-700'
                        : 'text-slate-600'
                    }`}
                  >
                    <span className="sm:hidden">1. {lang === 'eng' ? 'Template' : 'Templat'}</span>
                    <span className="hidden sm:inline">1. {t('step1Short')}</span>
                  </div>
                  <div className="text-[9.5px] sm:text-[10px] text-slate-400 truncate">
                    {currentStep > 1 ? (
                      <span className="font-semibold text-emerald-600">✓ Selesai</span>
                    ) : (
                      selectedTemplateName || 'Pilih templat'
                    )}
                  </div>
                </div>
              </div>
            </button>

            {/* Step 2 Node */}
            <button
              type="button"
              onClick={() => {
                if (!selectedTemplateName) {
                  return toast.error(
                    lang === 'eng' ? 'Please select a template first.' : 'Sila pilih templat terlebih dahulu.'
                  );
                }
                goToStep(2);
              }}
              className={`group flex flex-col sm:items-center text-left sm:text-center transition cursor-pointer p-1.5 sm:p-2 rounded-xl ${
                currentStep === 2 ? 'bg-red-50/60 sm:bg-transparent' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 sm:flex-col sm:gap-1.5">
                <div
                  className={`grid h-7 w-7 sm:h-9 sm:w-9 place-items-center rounded-full text-xs font-black transition-all shrink-0 ${
                    currentStep > 2
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : currentStep === 2
                      ? 'bg-red-700 text-white ring-4 ring-red-100 shadow-sm scale-105'
                      : 'bg-white border-2 border-slate-300 text-slate-500'
                  }`}
                >
                  {currentStep > 2 ? <Check size={15} strokeWidth={3} /> : '2'}
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-[11px] sm:text-xs font-extrabold truncate ${
                      currentStep === 2
                        ? 'text-red-700'
                        : currentStep > 2
                        ? 'text-emerald-700'
                        : 'text-slate-600'
                    }`}
                  >
                    <span className="sm:hidden">2. {lang === 'eng' ? 'Students' : 'Pesilat'}</span>
                    <span className="hidden sm:inline">2. {t('step2Short')}</span>
                  </div>
                  <div className="text-[9.5px] sm:text-[10px] text-slate-400 truncate">
                    {currentStep > 2 ? (
                      <span className="font-semibold text-emerald-600">✓ {selectedStudentsList.length} dipilih</span>
                    ) : (
                      `${selectedStudentsList.length} dipilih`
                    )}
                  </div>
                </div>
              </div>
            </button>

            {/* Step 3 Node */}
            <button
              type="button"
              onClick={() => {
                if (!selectedTemplateName) {
                  return toast.error(
                    lang === 'eng' ? 'Please select a template first.' : 'Sila pilih templat terlebih dahulu.'
                  );
                }
                if (selectedStudentsList.length === 0) {
                  return toast.error(
                    lang === 'eng'
                      ? 'Please select at least one student.'
                      : 'Sila pilih sekurang-kurangnya seorang pesilat.'
                  );
                }
                goToStep(3);
              }}
              className={`group flex flex-col sm:items-center text-left sm:text-center transition cursor-pointer p-1.5 sm:p-2 rounded-xl ${
                currentStep === 3 ? 'bg-red-50/60 sm:bg-transparent' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 sm:flex-col sm:gap-1.5">
                <div
                  className={`grid h-7 w-7 sm:h-9 sm:w-9 place-items-center rounded-full text-xs font-black transition-all shrink-0 ${
                    result
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : currentStep === 3
                      ? 'bg-red-700 text-white ring-4 ring-red-100 shadow-sm scale-105'
                      : 'bg-white border-2 border-slate-300 text-slate-500'
                  }`}
                >
                  {result ? <Check size={15} strokeWidth={3} /> : '3'}
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-[11px] sm:text-xs font-extrabold truncate ${
                      currentStep === 3
                        ? 'text-red-700'
                        : result
                        ? 'text-emerald-700'
                        : 'text-slate-600'
                    }`}
                  >
                    <span className="sm:hidden">3. {lang === 'eng' ? 'Generate' : 'Janaan'}</span>
                    <span className="hidden sm:inline">3. {t('step3Short')}</span>
                  </div>
                  <div className="text-[9.5px] sm:text-[10px] text-slate-400 truncate">
                    {result ? (
                      <span className="font-semibold text-emerald-600">✓ Selesai ({result.successCount})</span>
                    ) : currentStep === 3 ? (
                      'Pengesahan akhir'
                    ) : (
                      'Jana sijil'
                    )}
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* STEP 1: PILIH TEMPLAT SIJIL & TARIKH                     */}
      {/* ======================================================== */}
      {currentStep === 1 && (
        <Panel className="p-3.5 sm:p-5 mb-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-red-50 text-red-700 shrink-0">
                <Sparkles size={17} />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-extrabold text-slate-950">
                  {t('step1Title')}
                </h2>
                <p className="text-[10px] text-slate-400">
                  {t('step1Desc')}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold text-slate-500">
                {currentTemplatesForName.length} {t('templateAvailable')}
              </span>
            </div>
          </div>

          {templateNames.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
              <AlertCircle size={22} className="mx-auto text-amber-600 mb-1.5" />
              <h3 className="font-bold text-amber-950 text-xs">{t('noTemplatesFound')}</h3>
              <p className="text-[11px] text-amber-800 mt-1 max-w-md mx-auto">
                {t('noTemplatesFoundDesc')}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => loadTemplates(true)}
                  disabled={refreshingTemplates}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-100/70 transition shadow-2xs cursor-pointer"
                >
                  <RefreshCw size={13} className={refreshingTemplates ? 'animate-spin text-amber-700' : ''} />
                  {refreshingTemplates ? 'Sedang Memuat Semula...' : 'Muat Semula Dari Cloud'}
                </button>
                <Link
                  to="/admin/templates"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-800 transition"
                >
                  <Layers size={13} /> {t('templatesMenu')}
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Top Toolbar: Tajuk & Tarikh Sijil */}
              <div className="grid gap-3 sm:grid-cols-12 items-end">
                <div className="sm:col-span-8">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-600">
                      {t('officialCertTitleLabel')}
                    </label>
                    <button
                      type="button"
                      onClick={() => loadTemplates(true)}
                      disabled={refreshingTemplates}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 hover:text-red-800 disabled:opacity-50 transition cursor-pointer"
                      title={lang === 'eng' ? 'Refresh templates from cloud' : 'Muat semula templat terkini dari Cloud'}
                    >
                      <RefreshCw size={11} className={refreshingTemplates ? 'animate-spin' : ''} />
                      <span>{refreshingTemplates ? (lang === 'eng' ? 'Updating...' : 'Menyegerak...') : (lang === 'eng' ? 'Refresh' : 'Muat Semula')}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-950 outline-none focus:border-red-600 shadow-2xs"
                      value={selectedTemplateName}
                      onChange={(e) => setSelectedTemplateName(e.target.value)}
                    >
                      {templateNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => loadTemplates(true)}
                      disabled={refreshingTemplates}
                      className="shrink-0 p-2 sm:p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-red-700 hover:border-red-300 hover:bg-red-50 transition disabled:opacity-50 shadow-2xs cursor-pointer"
                      title={lang === 'eng' ? 'Refresh template list from Cloud' : 'Muat semula senarai templat terkini dari Cloud'}
                    >
                      <RefreshCw size={15} className={refreshingTemplates ? 'animate-spin text-red-700' : ''} />
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-4">
                  <label className="mb-1 block text-[11px] font-bold text-slate-600">
                    {t('issueDateLabel')}
                  </label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-950 outline-none focus:border-red-600"
                  />
                </div>
              </div>

              {/* Kategori Jenis Sijil (Tab Utama) */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-600">
                    {lang === 'eng' ? 'Certificate Category:' : 'Kategori / Jenis Sijil:'}
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {lang === 'eng' ? 'Sort by category & cula belt' : 'Asingkan ikut kategori & cula tali pinggang'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => { setSelectedCategory('semua'); setSelectedCula('semua'); }}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shrink-0 cursor-pointer ${
                      selectedCategory === 'semua'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{lang === 'eng' ? 'All Types' : 'Semua Jenis'}</span>
                    <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                      selectedCategory === 'semua' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {categoryCounts.semua}
                    </span>
                  </button>

                  {CERT_CATEGORIES.map((cat) => {
                    const active = selectedCategory === cat.id;
                    const count = categoryCounts[cat.id] || 0;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          if (!cat.hasCula) setSelectedCula('semua');
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shrink-0 cursor-pointer ${
                          active
                            ? cat.activeTabClass
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span>{cat.emoji}</span>
                        <span>{cat.label}</span>
                        <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                          active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Sub-kategori Warna Cula (khusus untuk Sijil Kenaikan Tali Pinggang) */}
                {(selectedCategory === 'kenaikan_tali_pinggang' || selectedCategory === 'semua') && (
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1 pl-1 scrollbar-none border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                      {lang === 'eng' ? 'Belt Cula:' : 'Cula Tali Pinggang:'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedCula('semua')}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition shrink-0 cursor-pointer ${
                        selectedCula === 'semua'
                          ? 'bg-red-700 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                      }`}
                    >
                      <span>{lang === 'eng' ? 'All Cula' : 'Semua Cula'}</span>
                      <span className="text-[9.5px] opacity-80">({culaCounts.semua})</span>
                    </button>

                    {CULA_GROUPS.map((g) => {
                      const active = selectedCula === g.id;
                      const count = culaCounts[g.id] || 0;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setSelectedCula(g.id)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition shrink-0 cursor-pointer border ${
                            active
                              ? `${g.badge} ring-2 ring-red-400/30 shadow-2xs font-extrabold`
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className={`inline-block h-2 w-2 rounded-full ${g.dot}`} />
                          <span>{g.label}</span>
                          <span className="text-[9.5px] font-mono opacity-80">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Kotak Pratonton Visual Templat Dari Luar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-950 flex items-center gap-1.5">
                    <Eye size={13} className="text-red-700" />
                    {t('visualBoxTitle')}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {t('visualBoxDesc')}
                  </span>
                </div>

                {/* Responsive Grid of Visual Template Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-slate-50/70 rounded-2xl border border-slate-200/80">
                  {/* Button Option: Semua Peringkat */}
                  <button
                    type="button"
                    onClick={() => handleSelectLevelChange('')}
                    className={`group relative flex flex-col justify-between rounded-xl border p-2.5 text-left transition-all ${
                      !selectedLevel
                        ? 'border-red-600 bg-red-50/80 ring-2 ring-forest-400/40 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="aspect-[1/1.34] w-full rounded-lg border border-dashed border-red-300 bg-red-50/50 flex flex-col items-center justify-center p-2.5 text-center">
                      <Sparkles size={22} className="text-red-700 mb-1" />
                      <span className="text-xs font-extrabold text-slate-950 leading-tight">
                        {t('allLevelsOption')}
                      </span>
                      <span className="mt-1 text-[9.5px] text-slate-500">
                        {t('autoGenRankDesc')}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-900">
                        {students.length} {t('studentsCountSuffix')}
                      </span>
                      {!selectedLevel && (
                        <span className="text-[9px] font-extrabold text-red-700 bg-red-200/80 px-1.5 py-0.2 rounded-full">
                          {t('activeBadge')}
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Individual Template Boxes with Live PDF Thumbnail */}
                  {currentTemplatesForName.map((template) => {
                    const isSelected =
                      selectedLevel &&
                      (norm(selectedLevel) === norm(template.peringkat) ||
                        selectedLevel === template.peringkat);
                    const count = getStudentCountForLevel(template.peringkat);
                    const previewUrl = `/api/admin/templates/${template.id}/preview`;
                    const cat = getCertCategory(template);
                    const catMeta = getCategoryMeta(cat);
                    const rankMeta = getRankMeta(template.peringkat);
                    const isBelt = cat === 'kenaikan_tali_pinggang';

                    return (
                      <div
                        key={template.id}
                        onClick={() => handleSelectLevelChip(template.peringkat)}
                        className={`group relative flex flex-col justify-between rounded-xl border p-2.5 text-left cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${
                          isSelected
                            ? 'border-red-600 ring-2 ring-red-400/30 bg-red-50/30 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                        title={`Klik untuk pilih templat: ${template.peringkat}`}
                      >
                        {/* Visual Certificate Preview rendered from outside */}
                        <div className="relative aspect-[1/1.34] w-full overflow-hidden rounded-lg border border-slate-200/90 bg-slate-50">
                          <PdfThumbnail
                            url={previewUrl}
                            title={template.nama_template}
                            scale={0.65}
                            className="h-full w-full pointer-events-none"
                          />

                          {/* Rank / Cula / Category Badge on top of preview */}
                          <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-1 max-w-[85%]">
                            {isBelt ? (
                              <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold border shadow-2xs truncate ${rankMeta.badge}`}>
                                <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${rankMeta.dot}`} />
                                <span className="truncate">{template.peringkat.replace(/^ujian\s+/i, '')}</span>
                              </span>
                            ) : (
                              <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold border shadow-2xs truncate ${catMeta.badge}`}>
                                <span>{catMeta.emoji}</span>
                                <span className="truncate">{catMeta.shortLabel}</span>
                              </span>
                            )}
                          </div>

                          {/* Top-right zoom button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewTarget(template);
                            }}
                            className="absolute top-1.5 right-1.5 z-10 rounded-md bg-white/95 p-1 text-slate-700 hover:bg-red-50 hover:text-red-700 shadow-2xs border border-slate-200/90 transition cursor-pointer"
                            title="Lihat pratonton saiz besar"
                          >
                            <Maximize2 size={12} />
                          </button>

                          {/* Selection checkmark icon */}
                          {isSelected && (
                            <div className="absolute bottom-1.5 right-1.5 z-10 bg-red-700 text-white p-0.5 rounded-full shadow-xs">
                              <CheckCircle2 size={13} />
                            </div>
                          )}
                        </div>

                        {/* Card Details */}
                        <div className="mt-2">
                          <div className="flex items-center gap-1 text-[11px] font-extrabold text-slate-950 truncate" title={template.peringkat}>
                            <span className="text-[10px]">{catMeta.emoji}</span>
                            <span className="truncate">{template.peringkat}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                            <span>{count} {t('studentsCountSuffix')}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewTarget(template);
                              }}
                              className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-red-700 hover:underline cursor-pointer"
                              title="Buka saiz penuh"
                            >
                              <Maximize2 size={10} /> Besarkan
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Action Footer for Step 1 */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 mt-4 border-t border-slate-100 bg-[#FCFDFB] p-3 sm:px-4 rounded-xl">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="font-bold text-slate-900">Templat Terpilih:</span>
                  <span className="font-extrabold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-lg truncate max-w-[220px]">
                    {selectedTemplateName}
                  </span>
                  <span>•</span>
                  <span className="text-slate-500 font-semibold">{fmtDate(issueDate)}</span>
                  {selectedLevel && (
                    <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md text-[11px] font-bold">
                      {selectedLevel}
                    </span>
                  )}
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    if (!selectedTemplateName) {
                      return toast.error(
                        lang === 'eng' ? 'Please select a certificate template.' : 'Sila pilih templat sijil terlebih dahulu.'
                      );
                    }
                    goToStep(2);
                  }}
                  disabled={!selectedTemplateName}
                  className="!px-5 !py-2.5 text-xs sm:text-sm font-bold shadow-md cursor-pointer justify-center"
                >
                  <span>{t('btnNextToStep2')}</span>
                  <ArrowRight size={15} />
                </Button>
              </div>
            </div>
          )}
        </Panel>
      )}

      {/* ======================================================== */}
      {/* STEP 2: PILIH PESILAT UNTUK DIJANA                       */}
      {/* ======================================================== */}
      {currentStep === 2 && (
        <Panel className="flex flex-col mb-4 animate-in fade-in duration-200">
          {/* Top Context Reminder Banner */}
          <div className="m-3 sm:m-4 mb-0 rounded-xl border border-red-200/80 bg-red-50/70 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-red-700 text-white shrink-0">
                <Layers size={16} />
              </div>
              <div className="min-w-0 text-xs">
                <div className="font-extrabold text-slate-950 truncate flex items-center gap-1.5">
                  <span>{selectedTemplateName}</span>
                  <span className="text-[10px] font-semibold text-red-700 bg-white border border-red-200 px-1.5 py-0.2 rounded-md">
                    {rawTemplatesForName.length} templat format
                  </span>
                </div>
                <div className="text-[10.5px] text-slate-500 mt-0.5">
                  Tarikh Sijil: <strong className="text-slate-700">{fmtDate(issueDate)}</strong>
                  {selectedLevel && (
                    <> • Peringkat: <strong className="text-red-700">{selectedLevel}</strong></>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => goToStep(1)}
              className="self-start sm:self-center inline-flex items-center gap-1 text-[11px] font-bold text-red-700 hover:text-red-800 bg-white border border-red-200 px-3 py-1.5 rounded-lg transition shadow-2xs cursor-pointer"
            >
              <ChevronLeft size={13} /> {t('btnBackToStep1')}
            </button>
          </div>

          {/* Toolbar Carian & Tapisan */}
          <div className="flex flex-col gap-2.5 border-b border-slate-100 p-3 sm:px-4 sm:py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <Award className="text-red-700 shrink-0" size={17} />
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-950">
                {t('step2Title')}
              </h2>
              <Chip color="gold">{selectedStudentsList.length} {t('selectedCountBadge')}</Chip>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full lg:w-auto">
              <SearchField
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={t('searchPlaceholder')}
              />
              <select
                aria-label="Tapis cawangan"
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
              >
                <option value="">{t('allBranches')}</option>
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <select
                aria-label="Tapis peringkat"
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none"
                value={selectedLevel}
                onChange={(e) => handleSelectLevelChange(e.target.value)}
              >
                <option value="">{t('allLevels')} ({students.length})</option>
                {levels.map((l) => (
                  <option key={l} value={l}>
                    {l} ({getStudentCountForLevel(l)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedLevel && (
            <div className="px-4 py-1.5 bg-red-50/70 border-b border-red-100 flex items-center justify-between text-xs text-slate-900">
              <span className="inline-flex items-center gap-1.5 text-[11px]">
                <Filter size={12} className="text-red-700" />
                {t('activeFilterText')} <strong>{selectedLevel}</strong> ({filteredStudents.length} {t('studentsCountSuffix')})
              </span>
              <button
                onClick={() => handleSelectLevelChange('')}
                className="text-red-700 hover:text-slate-900 font-bold hover:underline text-[11px] cursor-pointer"
              >
                {t('btnClearFilter')}
              </button>
            </div>
          )}

          {/* Quick select buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-[#FBFCFA] px-3 sm:px-4 py-2 border-b border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
              <button
                type="button"
                onClick={selectCurrentPage}
                className="font-bold text-red-800 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md border border-red-200/60 inline-flex items-center gap-1 transition active:scale-95 cursor-pointer"
              >
                <CheckSquare size={12} /> {t('btnSelectThisPage')} ({pageStudents.length})
              </button>
              <button
                type="button"
                onClick={selectAllFiltered}
                className="font-bold text-red-800 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md border border-red-200/60 inline-flex items-center gap-1 transition active:scale-95 cursor-pointer"
              >
                <CheckSquare size={12} /> {t('btnSelectAllRecords')} ({filteredStudents.length})
              </button>
              <button
                type="button"
                onClick={deselectAllFiltered}
                className="font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md border border-slate-200/70 inline-flex items-center gap-1 transition active:scale-95 cursor-pointer"
              >
                <Square size={12} /> {t('btnDeselectAll')}
              </button>
            </div>

            <span className="text-[10px] sm:text-[11px] text-slate-500 font-semibold text-right sm:text-left">
              {filteredStudents.length} {t('recordsFoundText')} • 20 {t('perPageText')}
            </span>
          </div>

          {/* Jadual Pesilat (20 pesilat setiap laman) */}
          {loading ? (
            <Loading />
          ) : filteredStudents.length === 0 ? (
            <Empty
              title={t('noStudentsFound')}
              message={t('noStudentsFoundDesc')}
            />
          ) : (
            <div>
              {/* Mobile Card List (< md) */}
              <div className="block md:hidden divide-y divide-slate-100 p-3 space-y-2.5">
                {pageStudents.map((student, idx) => {
                  const isChecked = selectedIds.has(student.id);
                  const matchedTemplate = getMatchingTemplate(student);
                  const rowNumber = startIndex + idx + 1;

                  return (
                    <div
                      key={student.id}
                      onClick={() => toggleSelect(student.id)}
                      className={`rounded-2xl border p-3.5 space-y-2 transition cursor-pointer ${
                        isChecked ? 'bg-red-50/60 border-red-300 shadow-2xs' : 'bg-white border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelect(student.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-0.5 h-4 w-4 rounded text-red-700 focus:ring-red-500 cursor-pointer shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-950 text-xs sm:text-sm truncate">
                              {student.nama_penuh}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">
                              {student.no_kp_atau_id || '—'}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">#{rowNumber}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-600">
                        <span>{student.cawangan}</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-900">{student.peringkat}</span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        {matchedTemplate ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 text-[10px]">
                            <CheckCircle2 size={11} /> {t('statusTemplateReady')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 text-[10px]">
                            <AlertCircle size={11} /> {t('statusNoTemplate')}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold ${isChecked ? 'text-red-700' : 'text-slate-400'}`}>
                          {isChecked ? 'Dipilih' : 'Tidak dipilih'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View (>= md) */}
              <div className="hidden md:block overflow-x-auto max-h-[calc(100vh-370px)] overflow-y-auto">
                <table className="w-full min-w-[760px] text-left text-xs sm:text-sm">
                  <thead className="sticky top-0 z-10 bg-[#FBFCFA] text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-400 border-b border-slate-100 shadow-2xs">
                    <tr>
                      <th className="w-10 px-3.5 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={
                            pageStudents.length > 0 &&
                            pageStudents.every((s) => selectedIds.has(s.id))
                          }
                          onChange={(e) => {
                            if (e.target.checked) selectCurrentPage();
                            else deselectCurrentPage();
                          }}
                          title="Pilih / Nyahpilih semua pesilat dalam laman ini"
                          className="h-3.5 w-3.5 rounded text-red-700 focus:ring-red-500 cursor-pointer"
                        />
                      </th>
                      <th className="w-12 px-2 py-2 text-center">{t('thNo')}</th>
                      <th className="px-3.5 py-2">{t('thName')}</th>
                      <th className="px-3.5 py-2">{t('thId')}</th>
                      <th className="px-3.5 py-2">{t('thBranch')}</th>
                      <th className="px-3.5 py-2">{t('thLevel')}</th>
                      <th className="px-3.5 py-2">{t('thTemplateMatch')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pageStudents.map((student, idx) => {
                      const isChecked = selectedIds.has(student.id);
                      const matchedTemplate = getMatchingTemplate(student);
                      const rowNumber = startIndex + idx + 1;

                      return (
                        <tr
                          key={student.id}
                          onClick={() => toggleSelect(student.id)}
                          className={`cursor-pointer transition ${
                            isChecked ? 'bg-red-50/30' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="px-3.5 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelect(student.id)}
                              className="h-3.5 w-3.5 rounded text-red-700 focus:ring-red-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-center text-[11px] text-slate-400 font-mono">
                            {rowNumber}
                          </td>
                          <td className="px-3.5 py-1.5 font-bold text-slate-950 text-xs sm:text-sm">
                            {student.nama_penuh}
                          </td>
                          <td className="px-3.5 py-1.5 text-xs font-mono text-slate-600 whitespace-nowrap">
                            {student.no_kp_atau_id}
                          </td>
                          <td className="px-3.5 py-1.5 text-xs text-slate-600 whitespace-nowrap">
                            {student.cawangan}
                          </td>
                          <td className="px-3.5 py-1.5 whitespace-nowrap">
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200/80">
                              {student.peringkat}
                            </span>
                          </td>
                          <td className="px-3.5 py-1.5 text-xs whitespace-nowrap">
                            {matchedTemplate ? (
                              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 text-[10px]">
                                <CheckCircle2 size={11} /> {t('statusTemplateReady')} ({matchedTemplate.peringkat.replace(/^ujian\s+/i, '')})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 text-[10px]">
                                <AlertCircle size={11} /> {t('statusNoTemplate')}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination Bar */}
          {filteredStudents.length > 0 && (
            <div className="flex flex-wrap items-center justify-between border-t border-slate-100 bg-[#FBFCFA] px-4 py-2 text-xs">
              <span className="text-slate-500 text-[11px]">
                {t('pageShowing')} <strong>{startIndex + 1}</strong> – <strong>{endIndex}</strong> {t('pageOf')}{' '}
                <strong>{totalStudents}</strong> {t('pageStudentsCount')} ({t('pageLabel')} {currentPage} / {totalPages})
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="!px-2.5 !py-1 text-[11px] cursor-pointer"
                  title={t('prevPage')}
                >
                  <ChevronLeft size={13} /> {t('prevPage')}
                </Button>

                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pNum;
                    if (totalPages <= 5) {
                      pNum = i + 1;
                    } else if (currentPage <= 3) {
                      pNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pNum = totalPages - 4 + i;
                    } else {
                      pNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pNum}
                        type="button"
                        onClick={() => setCurrentPage(pNum)}
                        className={`h-6 w-6 rounded-md text-[11px] font-bold transition cursor-pointer ${
                          currentPage === pNum
                            ? 'bg-red-700 text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {pNum}
                      </button>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="!px-2.5 !py-1 text-[11px] cursor-pointer"
                  title={t('nextPage')}
                >
                  {t('nextPage')} <ChevronRight size={13} />
                </Button>
              </div>
            </div>
          )}

          {/* Bottom Navigation for Step 2 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100 bg-[#FCFDFB] p-3 sm:px-4 sm:py-3 rounded-b-2xl">
            <Button
              type="button"
              variant="secondary"
              onClick={() => goToStep(1)}
              className="!px-4 !py-2 text-xs font-bold order-2 sm:order-1 justify-center cursor-pointer"
            >
              <ChevronLeft size={14} /> {t('btnBackToStep1')}
            </Button>

            <div className="text-center sm:text-right order-1 sm:order-2">
              <div className="font-extrabold text-slate-950 text-xs sm:text-sm">
                {selectedStudentsList.length} {t('selectedCountBadge')} ({t('studentsCountSuffix')})
              </div>
              <div className="text-[10px] text-slate-400">
                {selectedStudentsList.length === 0
                  ? 'Sila tandakan sekurang-kurangnya seorang pesilat'
                  : 'Sedia untuk semakan akhir & janaan'}
              </div>
            </div>

            <Button
              type="button"
              onClick={() => {
                if (selectedStudentsList.length === 0) {
                  return toast.error(
                    lang === 'eng'
                      ? 'Please select at least one student.'
                      : 'Sila pilih sekurang-kurangnya seorang pesilat untuk dijana sijil.'
                  );
                }
                goToStep(3);
              }}
              disabled={selectedStudentsList.length === 0}
              className="!px-5 !py-2 text-xs sm:text-sm font-bold shadow-md order-3 justify-center cursor-pointer"
            >
              <span>{t('btnNextToStep3')}</span>
              <ArrowRight size={15} />
            </Button>
          </div>
        </Panel>
      )}

      {/* ======================================================== */}
      {/* STEP 3: SEMAKAN & JANAAN SIJIL (ATAU KEPUTUSAN JANAAN)   */}
      {/* ======================================================== */}
      {currentStep === 3 && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {!result ? (
            /* Bahagian 3A: Ringkasan Pengesahan Sebelum Menjana */
            <Panel className="p-4 sm:p-6">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3 mb-4">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-red-50 text-red-700 shrink-0">
                  <FileCheck size={18} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-950">
                    {t('step3Title')}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {t('step3Desc')}
                  </p>
                </div>
              </div>

              {/* 3 Overview Information Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                {/* Card 1: Templat */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">
                    <Layers size={13} className="text-red-700" />
                    <span>Templat Sijil</span>
                  </div>
                  <div className="text-sm font-extrabold text-slate-950 truncate" title={selectedTemplateName}>
                    {selectedTemplateName}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <span>Tarikh Sijil:</span>
                    <strong className="text-slate-800 font-semibold">{fmtDate(issueDate)}</strong>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Format Peringkat:</span>
                    <span className="font-bold text-slate-700">{rawTemplatesForName.length} templat</span>
                  </div>
                </div>

                {/* Card 2: Jumlah Pesilat */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">
                    <Users size={13} className="text-red-700" />
                    <span>Pesilat Terpilih</span>
                  </div>
                  <div className="text-2xl font-black text-slate-950">
                    {selectedStudentsList.length} <span className="text-xs font-semibold text-slate-500">orang pesilat</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <span>Cawangan:</span>
                    <span className="font-bold text-slate-700 truncate max-w-[140px] text-right">
                      {selectedBranch || 'Semua Cawangan'}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Tapisan Peringkat:</span>
                    <span className="font-bold text-slate-700 truncate max-w-[140px] text-right">
                      {selectedLevel || 'Semua Peringkat'}
                    </span>
                  </div>
                </div>

                {/* Card 3: Status Pemadanan */}
                <div className={`rounded-2xl border p-3.5 shadow-2xs ${
                  matchingStats.unmatched === 0
                    ? 'border-emerald-200 bg-emerald-50/40'
                    : 'border-amber-200 bg-amber-50/40'
                }`}>
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1">
                    {matchingStats.unmatched === 0 ? (
                      <CheckCircle2 size={13} className="text-emerald-600" />
                    ) : (
                      <AlertCircle size={13} className="text-amber-600" />
                    )}
                    <span>Padanan Templat</span>
                  </div>
                  <div className="text-2xl font-black">
                    <span className="text-emerald-700">{matchingStats.matched}</span>
                    <span className="text-xs font-semibold text-slate-400 mx-1">/</span>
                    <span className="text-slate-800 text-sm font-bold">{selectedStudentsList.length}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200/50 text-[11px]">
                    {matchingStats.unmatched === 0 ? (
                      <span className="font-bold text-emerald-800 flex items-center gap-1">
                        <Check size={13} /> Semua pesilat mempunyai templat sepadan!
                      </span>
                    ) : (
                      <span className="font-bold text-amber-800 flex items-center gap-1">
                        <AlertCircle size={13} /> {matchingStats.unmatched} pesilat akan dilangkau (tiada templat).
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Senarai Pratonton Pesilat Yang Akan Dijana */}
              <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden mb-5">
                <div className="bg-[#FBFCFA] px-4 py-2.5 border-b border-slate-100 flex items-center justify-between text-xs">
                  <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Award size={14} className="text-red-700" />
                    <span>Pratonton Senarai Pesilat ({selectedStudentsList.length})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    className="text-red-700 hover:text-red-800 font-bold hover:underline text-[11px] cursor-pointer"
                  >
                    {t('btnBackToStep2')}
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {selectedStudentsList.map((student, idx) => {
                    const matchedTemplate = getMatchingTemplate(student);
                    return (
                      <div
                        key={student.id}
                        className="px-4 py-2 flex items-center justify-between hover:bg-slate-50/70 transition gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[10px] font-mono text-slate-400 w-6 shrink-0">
                            #{idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-950 truncate text-xs sm:text-sm">
                              {student.nama_penuh}
                            </div>
                            <div className="text-[10.5px] text-slate-500 truncate flex items-center gap-1.5">
                              <span>{student.cawangan}</span>
                              <span>•</span>
                              <span className="font-semibold text-slate-800">{student.peringkat}</span>
                              {student.no_kp_atau_id && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono text-slate-400">{student.no_kp_atau_id}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          {matchedTemplate ? (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 text-[10px]">
                              <CheckCircle2 size={11} />
                              <span className="hidden sm:inline">Templat:</span> {matchedTemplate.peringkat.replace(/^ujian\s+/i, '')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 text-[10px]">
                              <AlertCircle size={11} /> Tiada Templat
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Action Footer for Step 3 Confirmation */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => goToStep(2)}
                  className="!px-4 !py-2.5 text-xs font-bold order-2 sm:order-1 justify-center cursor-pointer"
                >
                  <ChevronLeft size={14} /> {t('btnBackToStep2')}
                </Button>

                <Button
                  onClick={handleGenerate}
                  loading={generating}
                  disabled={idsToGenerate.length === 0 || templateNames.length === 0}
                  className="!px-6 !py-2.5 text-xs sm:text-sm font-extrabold shadow-lg order-1 sm:order-2 justify-center cursor-pointer bg-red-700 hover:bg-red-800"
                >
                  <Sparkles size={16} />{' '}
                  {generating
                    ? t('btnGenerating')
                    : `${t('btnGenerateNow')} (${idsToGenerate.length})`}
                </Button>
              </div>
            </Panel>
          ) : (
            /* Bahagian 3B: Keputusan Janaan Sijil (Selesai & Muat Turun) */
            <Panel className="border-emerald-200 bg-emerald-50/40 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-600 text-white shrink-0 shadow-sm">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-950">
                    {t('genCompleteTitle')}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {lang === 'eng' ? (
                      <>A total of <strong>{result.successCount}</strong> certificates were successfully generated and registered to student profiles.</>
                    ) : (
                      <>Sebanyak <strong>{result.successCount}</strong> sijil telah berjaya dijana dan didaftarkan ke pangkalan data rasmi.</>
                    )}
                  </p>
                </div>
              </div>

              {/* Stats Summary Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
                <div className="rounded-xl bg-white p-3.5 border border-emerald-100 shadow-xs">
                  <div className="text-xl sm:text-2xl font-black text-slate-950">{result.total}</div>
                  <div className="text-[10.5px] text-slate-400 mt-0.5">{t('genTotalSelected')}</div>
                </div>
                <div className="rounded-xl bg-white p-3.5 border border-emerald-100 shadow-xs">
                  <div className="text-xl sm:text-2xl font-black text-emerald-600">{result.successCount}</div>
                  <div className="text-[10.5px] text-slate-400 mt-0.5">{t('genSuccessCount')}</div>
                </div>
                <div className="rounded-xl bg-white p-3.5 border border-emerald-100 shadow-xs col-span-2 sm:col-span-1">
                  <div className="text-xl sm:text-2xl font-black text-amber-600">{result.failedCount}</div>
                  <div className="text-[10.5px] text-slate-400 mt-0.5">{t('genFailedCount')}</div>
                </div>
              </div>

              {/* Failed students notification */}
              {result.failed?.length > 0 && (
                <div className="rounded-xl bg-white p-3.5 border border-amber-200 mb-4 text-xs text-amber-900">
                  <div className="font-bold mb-1.5 flex items-center gap-1.5 text-amber-800">
                    <AlertCircle size={14} /> {t('genFailedListTitle')}
                  </div>
                  <ul className="space-y-0.5 pl-4 list-disc text-[11px]">
                    {result.failed.map((f, i) => (
                      <li key={i}>
                        <strong>{f.nama}</strong> ({f.peringkat}): {f.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Generated PDF files list */}
              {result.generatedTokens?.length > 0 && (
                <div className="rounded-2xl bg-white p-3.5 sm:p-4 border border-emerald-100 mb-4 text-xs shadow-2xs">
                  <div className="font-extrabold mb-3 text-slate-950 flex items-center justify-between">
                    <span>{t('genFilesListTitle')} ({result.generatedTokens.length}):</span>
                    <span className="text-[10.5px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      Sedia Dimuat Turun
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                    {result.generatedTokens.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between pt-2 first:pt-0 gap-2">
                        <div className="flex items-center gap-2 truncate min-w-0">
                          <FileText size={15} className="text-red-700 shrink-0" />
                          <span className="font-semibold text-slate-800 truncate text-xs" title={`${item.nama}.pdf`}>
                            {item.nama}.pdf
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={`/api/public/certificates/${item.token}/download?preview=1`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 font-bold inline-flex items-center gap-1 text-[11px] transition shadow-2xs"
                            title={t('btnViewCert')}
                          >
                            <Eye size={12} /> {t('btnViewCert')}
                          </a>
                          <a
                            href={`/api/public/certificates/${item.token}/download`}
                            download={`${item.nama}.pdf`}
                            className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold inline-flex items-center gap-1 text-[11px] transition shadow-2xs"
                            title={t('btnDownloadPdf')}
                          >
                            <Download size={12} /> {t('btnDownloadPdf')}
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Actions for Completed Generation */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <Link
                  to="/admin/sijil"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-red-800 shadow-sm"
                >
                  <Award size={15} /> {t('btnViewNewCerts')} <ArrowRight size={14} />
                </Link>
                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-900 transition hover:bg-slate-50 shadow-2xs"
                >
                  <ExternalLink size={14} /> {t('btnVerifyOnPublic')}
                </a>
                <button
                  type="button"
                  onClick={handleResetNewBatch}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition shadow-2xs cursor-pointer ml-auto"
                >
                  <RefreshCw size={14} /> {t('btnNewBatchGen')}
                </button>
              </div>
            </Panel>
          )}
        </div>
      )}

      {/* Large Template Preview Modal */}
      <LargeTemplatePreviewModal
        open={!!previewTarget}
        onClose={() => setPreviewTarget(null)}
        template={previewTarget}
      />
    </>
  );
}
