import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ArrowRight,
  FileCheck2,
  ShieldCheck,
  Download,
  BookOpen,
  CheckCircle2,
  FileText,
  GraduationCap,
  ArrowUpRight,
  MapPin,
  CalendarDays,
  ChevronRight,
  Loader2,
  LockKeyhole,
  Quote,
  IdCard,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, certDownload, fmtDate } from '../lib/api';
import { Logo, Button, Chip, Empty, Loading } from '../components/UI';
import { useLang, LanguageSwitcher, LiveClock } from '../lib/i18n';

const rise = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

function PublicNav() {
  const { t } = useLang();

  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8 sm:py-5 lg:px-12">
        <Link to="/" aria-label="Utama">
          <Logo light />
        </Link>
        <nav className="hidden items-center gap-7 text-xs font-semibold text-white/80 md:flex">
          <a href="/#cara" className="transition hover:text-rose-200">
            {t('navHowToCheck')}
          </a>
          <a href="/#kelebihan" className="transition hover:text-rose-200">
            {t('navBenefits')}
          </a>
          <a href="/#tentang" className="transition hover:text-rose-200">
            {t('navAboutUs')}
          </a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Clock & Date on Front Page */}
          <LiveClock light showDate={true} className="hidden lg:inline-flex" />

          {/* Language Switcher [ BM | ENG ] */}
          <LanguageSwitcher light />

          <Link
            to="/admin/login"
            className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-white/20 backdrop-blur-sm shadow-xs"
          >
            <LockKeyhole size={13} /> {t('btnAdminLogin')} <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
    </header>
  );
}

function SearchResult({ records, loading, q, searched }) {
  const { t, lang } = useLang();
  if (!searched) return null;

  return (
    <div id="hasil-carian" className="mx-auto w-full max-w-4xl px-4 pt-6 sm:px-6">
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-apple"
          >
            <Loading
              text={t('btnSearching')}
              subtext={lang === 'eng' ? 'Searching official database...' : 'Menyemak rekod rasmi pangkalan data...'}
              size="md"
            />
          </motion.div>
        ) : records.length ? (
          <motion.div key="records" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle2 className="text-emerald-600" size={18} />
              <h2 className="text-lg font-extrabold text-slate-950">{t('recordsFoundHeading')}</h2>
              <Chip color="red">{records.length} {t('studentBadge')}</Chip>
            </div>
            <div className="space-y-4">
              {records.map((p) => (
                <div key={p.id} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-apple">
                  <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-[#FCFDFB] p-4 sm:p-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700 border border-red-100">
                      <GraduationCap size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      {/* Name preserved as strictly requested */}
                      <h3 className="text-base font-extrabold leading-snug text-slate-950">{p.nama_penuh}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
                        {p.no_kp_atau_id && (
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                            <IdCard size={13} />
                            {p.no_kp_atau_id}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={13} />
                          {p.cawangan}
                        </span>
                        <Chip color="gold">{p.peringkat}</Chip>
                        {p.tarikh_daftar && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-700">
                            <CalendarDays size={12} />
                            {t('dateRegPrefix')} {fmtDate(p.tarikh_daftar)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Chip color="emerald">{p.certificates.length} {t('thCerts')}</Chip>
                  </div>
                  <div className="p-4 sm:p-5">
                    <h4 className="mb-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      {t('certsEarnedHeading')}
                    </h4>
                    {p.certificates.length ? (
                      <div className="space-y-2.5">
                        {p.certificates.map((c) => (
                          <div
                            key={c.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/70 p-3 hover:bg-slate-50 transition"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-red-700 shadow-2xs border border-slate-200/60">
                                <FileText size={18} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-slate-950 truncate" title={c.nama_sijil}>{c.nama_sijil}</div>
                                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                                  <CalendarDays size={11} />
                                  {fmtDate(c.tarikh_isu)}
                                </div>
                              </div>
                            </div>
                            <a
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-700 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-red-800 shadow-xs shrink-0 w-full sm:w-auto"
                              href={certDownload(c.public_token)}
                              download={`${p.nama_penuh}.pdf`}
                            >
                              <Download size={14} /> {t('downloadPdfBtn')}
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty
                        title={lang === 'eng' ? 'No certificates yet' : 'Belum mempunyai sijil'}
                        message={lang === 'eng' ? 'Contact the academy if certificates are not yet displayed.' : 'Hubungi pihak akademi sekiranya sijil masih belum dipaparkan.'}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-slate-200/80 bg-white px-6 py-8 text-center shadow-apple"
          >
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60">
              <Search size={22} />
            </div>
            <h3 className="text-base font-extrabold text-slate-950">{t('noStudentsFound')}</h3>
            <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-slate-500">
              {lang === 'eng'
                ? `Check spelling of student full name "${q}". Please make sure to enter full name only without IC number.`
                : `Semak ejaan nama penuh pesilat “${q}”. Sila pastikan anda hanya memasukkan nama penuh tanpa nombor kad pengenalan (No. KP).`}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Home() {
  const { t, lang } = useLang();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [records, setRecords] = useState([]);
  const [latest, setLatest] = useState(null);

  useEffect(() => {
    api('/public/stats')
      .then((r) => setLatest(r.certificates))
      .catch(() => {});
  }, []);

  async function search(e) {
    e.preventDefault();
    if (q.trim().length < 3) return toast.error(t('searchWarningMinChars'));
    if (/^\d{4,}/.test(q.trim()) || /^\d{2,}-\d{2,}/.test(q.trim())) {
      return toast.warning(t('searchWarningNoIC'));
    }
    setLoading(true);
    setSearched(true);
    try {
      const r = await api('/public/search?q=' + encodeURIComponent(q.trim()));
      setRecords(r.results);
      setTimeout(() => document.getElementById('hasil-carian')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (e) {
      toast.error(e.message);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  const stepsList = [
    {
      icon: Search,
      num: '01',
      title: lang === 'eng' ? 'Enter Student Full Name' : 'Masukkan Nama Penuh',
      text: lang === 'eng' ? 'Enter student full name only into the search field (do not enter IC number).' : 'Masukkan nama penuh pesilat sahaja pada ruangan carian (jangan masukkan no. kad pengenalan).',
    },
    {
      icon: FileCheck2,
      num: '02',
      title: lang === 'eng' ? 'Verify certificates' : 'Semak sijil',
      text: lang === 'eng' ? 'View student profile and list of official digital certificates issued.' : 'Lihat profil pesilat serta senarai sijil digital rasmi yang telah dikeluarkan.',
    },
    {
      icon: Download,
      num: '03',
      title: lang === 'eng' ? 'Download PDF' : 'Muat turun PDF',
      text: lang === 'eng' ? 'Download high-quality certificate documents with a single click.' : 'Dapatkan dokumen sijil berkualiti tinggi dengan hanya satu klik mudah.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FBFBFD]">
      <PublicNav />
      <main>
        {/* Apple/Android Style Hero Section with Crimson/Ruby Red Mesh */}
        <section className="mesh-bg relative isolate overflow-hidden pb-12 pt-24 sm:pb-16 sm:pt-32 text-white">
          <div className="dot-grid pointer-events-none absolute inset-0 opacity-25" />
          <div className="pointer-events-none absolute -right-32 top-12 h-[520px] w-[520px] rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-16 top-28 h-[395px] w-[395px] rounded-full border border-white/10" />
          <div className="pointer-events-none absolute right-3 top-44 h-[250px] w-[250px] rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-44 -left-44 h-[470px] w-[470px] rounded-full bg-red-500/20 blur-[100px]" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 sm:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-12 lg:px-12">
            <motion.div initial="hidden" animate="show" variants={stagger}>
              {/* Live Clock & Date Badge directly on front page */}
              <div className="mb-4 flex flex-wrap items-center gap-2.5">
                <motion.div
                  variants={rise}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-300/30 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-rose-200 backdrop-blur-md shadow-xs"
                >
                  <span className="h-2 w-2 animate-pulse rounded-full bg-rose-300" /> {t('heroEyebrow')}{' '}
                  <ChevronRight size={14} />
                </motion.div>
                <LiveClock light showDate={true} />
              </div>

              <motion.h1
                variants={rise}
                className="max-w-3xl text-balance text-[clamp(2.2rem,4.5vw,4.5rem)] font-extrabold leading-[1.12] tracking-[-0.05em]"
              >
                {t('heroHeading1')} <span className="text-rose-300">{t('heroHeading2')}</span>
              </motion.h1>

              <motion.p variants={rise} className="mt-3.5 max-w-xl text-sm leading-6 text-white/80 sm:text-base">
                {t('heroSubtitle')}
              </motion.p>

              {/* Apple-style Clean Floating Search Box */}
              <motion.form
                variants={rise}
                onSubmit={search}
                className="mt-6 max-w-xl rounded-2xl border border-white/20 bg-white/95 p-1.5 shadow-2xl backdrop-blur-md"
              >
                <div className="flex items-center gap-2">
                  <Search size={18} className="ml-3 shrink-0 text-slate-400" />
                  <input
                    aria-label={t('searchBoxTitle')}
                    placeholder={t('searchPlaceholderPublic')}
                    className="w-full min-w-0 flex-1 bg-transparent px-2 py-2 text-xs sm:text-sm font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                  <Button type="submit" loading={loading} className="!rounded-xl !px-3 sm:!px-5 text-xs">
                    {lang === 'eng' ? 'Search' : 'Semak'} <ArrowRight size={14} />
                  </Button>
                </div>
              </motion.form>

              <motion.div
                variants={rise}
                className="mt-3.5 inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-rose-100 backdrop-blur-md border border-white/15 shadow-xs"
              >
                <ShieldCheck size={15} className="text-rose-300 shrink-0" />
                <span>{t('searchHelperText')}</span>
              </motion.div>

              <motion.div variants={rise} className="mt-6 flex flex-wrap items-center gap-6">
                <div>
                  <div className="text-xl sm:text-2xl font-extrabold text-white">
                    {latest === null ? '—' : latest.toLocaleString(lang === 'eng' ? 'en-US' : 'ms-MY')}
                    <span className="text-rose-300">+</span>
                  </div>
                  <span className="text-[11px] text-white/50">{t('statCerts')}</span>
                </div>
                <div className="h-6 w-px bg-white/20" />
                <div>
                  <div className="text-xl sm:text-2xl font-extrabold text-white">
                    100<span className="text-rose-300">%</span>
                  </div>
                  <span className="text-[11px] text-white/50">
                    {lang === 'eng' ? 'Digital & easily accessible' : 'Digital & mudah dicapai'}
                  </span>
                </div>
              </motion.div>
            </motion.div>

            {/* Certificate Preview Card */}
            <motion.div
              initial={{ opacity: 0, x: 25, rotate: 2 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative mx-auto hidden w-full max-w-[380px] lg:block"
            >
              <div className="absolute -inset-6 rounded-full bg-rose-500/15 blur-2xl" />
              <div className="animate-float relative rotate-[3deg] rounded-2xl bg-[#FAF7EE] p-3.5 shadow-2xl border border-white/20">
                <div className="relative min-h-[270px] rounded-sm border-[4px] border-double border-[#991B1B] p-6 text-center text-slate-900">
                  <div className="absolute inset-2 border border-[#DC2626]/40" />
                  <div className="relative mt-2 text-[9px] font-extrabold tracking-[0.2em] text-red-700">
                    AKADEMI PRO SILAT
                  </div>
                  <div className="relative mt-6 text-2xl font-extrabold tracking-tight">
                    {lang === 'eng' ? 'CERTIFICATE' : 'SIJIL'}
                  </div>
                  <div className="relative mt-0.5 text-base font-bold tracking-[0.15em] text-red-800">
                    {lang === 'eng' ? 'OF APPRECIATION' : 'PENGHARGAAN'}
                  </div>
                  <div className="relative mx-auto mt-4 h-px w-24 bg-red-700" />
                  <div className="relative mt-4 text-[9px] text-slate-500">
                    {lang === 'eng' ? 'Proudly awarded to' : 'Dengan sukacitanya dianugerahkan kepada'}
                  </div>
                  <div className="relative mt-2 font-serif text-xl font-bold italic text-red-900">
                    PESILAT CEMERLANG
                  </div>
                  <div className="relative mt-2 text-[11px] font-semibold text-slate-700">
                    {lang === 'eng' ? 'Belt Promotion Certificate' : 'Sijil Kenaikan Bengkung'}
                  </div>
                  <div className="relative mt-6 flex justify-between text-[8px] text-slate-500">
                    <span>
                      ________________
                      <br />
                      {lang === 'eng' ? 'Academy Director' : 'Pengarah Akademi'}
                    </span>
                    <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-red-700 font-extrabold text-red-700">
                      {lang === 'eng' ? 'OFFICIAL' : 'RASMI'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-5 -left-6 flex items-center gap-2.5 rounded-xl bg-white p-3 shadow-xl border border-slate-100">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-900">
                    {lang === 'eng' ? 'Digitally Verified' : 'Disahkan Digital'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {lang === 'eng' ? 'Official certificate ready to download' : 'Sijil rasmi sedia dimuat turun'}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 rounded-t-[50%] bg-[#FBFBFD]" />
        </section>

        <SearchResult records={records} loading={loading} searched={searched} q={q} />

        {/* 3 Langkah Semakan: Apple-inspired cards */}
        <section id="cara" className="mx-auto max-w-7xl px-4 py-16 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-red-600">
              {lang === 'eng' ? 'SIMPLE & FAST' : 'MUDAH & PANTAS'}
            </div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              {lang === 'eng' ? 'Check certificates in ' : 'Semak sijil dalam '}
              <span className="text-red-600">{lang === 'eng' ? '3 steps.' : '3 langkah.'}</span>
            </h2>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              {lang === 'eng'
                ? 'No account registration required for parents. Easy search, seamless experience.'
                : 'Tiada pendaftaran akaun diperlukan untuk ibu bapa. Carian yang mudah, pengalaman yang lancar.'}
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {stepsList.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-apple transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-700 transition group-hover:bg-red-700 group-hover:text-white">
                    <s.icon size={20} />
                  </div>
                  <span className="text-3xl font-extrabold text-slate-200">{s.num}</span>
                </div>
                <h3 className="mt-4 text-base font-extrabold text-slate-950">{s.title}</h3>
                <p className="mt-2 text-xs leading-6 text-slate-500">{s.text}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Kelebihan Section */}
        <section id="kelebihan" className="bg-white py-14 border-y border-slate-200/60">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-8 lg:grid-cols-2 lg:items-center lg:px-12">
            <div className="relative flex min-h-[280px] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-red-950 via-rose-950 to-red-900 shadow-xl">
              <div className="dot-grid absolute inset-0 opacity-30" />
              <div className="relative z-10 grid h-[180px] w-[180px] place-items-center rounded-full border border-rose-400/30 bg-white/5">
                <div className="grid h-24 w-24 place-items-center rounded-full bg-rose-500/20 text-rose-300">
                  <ShieldCheck size={52} strokeWidth={1.2} />
                </div>
              </div>
              <div className="absolute bottom-4 left-5 right-5 flex justify-between text-[11px] font-semibold text-white/70">
                <span>{t('brandName')}</span>
                <span>{lang === 'eng' ? 'EASY • SECURE • OFFICIAL' : 'MUDAH • SELAMAT • RASMI'}</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-red-600">
                {lang === 'eng' ? 'BUILT FOR SILAT COMMUNITY' : 'DIBINA UNTUK KOMUNITI SILAT'}
              </div>
              <h2 className="mt-2 max-w-xl text-2xl font-extrabold leading-snug tracking-tight text-slate-950 sm:text-3xl">
                {lang === 'eng' ? 'Honoring every effort and ' : 'Menghargai setiap usaha dan '}
                <span className="text-red-600">
                  {lang === 'eng' ? 'achievement of students.' : 'kejayaan pesilat.'}
                </span>
              </h2>
              <p className="mt-3 text-xs leading-6 text-slate-500">
                {lang === 'eng'
                  ? 'A centralized portal that helps the academy manage certificate records and makes it easy for parents to access achievement documents anytime.'
                  : 'Portal berpusat yang membantu pihak akademi mengurus rekod sijil dan memudahkan ibu bapa mendapatkan dokumen pencapaian pada bila-bila masa.'}
              </p>
              <div className="mt-5 space-y-3.5">
                {(lang === 'eng'
                  ? [
                      ['Certificates downloadable as PDF', 'Digitally preserved for convenient printing and sharing.'],
                      ['Certificate authenticity verification', 'Each certificate has its own official verification link.'],
                      ['Mobile & laptop friendly', 'Seamless access from smartphones, tablets, and laptops.'],
                    ]
                  : [
                      ['Sijil boleh dimuat turun sebagai PDF', 'Disimpan secara digital supaya mudah dicetak dan dikongsi.'],
                      ['Semakan kesahihan sijil', 'Setiap sijil mempunyai pautan pengesahan rasmi tersendiri.'],
                      ['Mesra telefon pintar & laptop', 'Akses lancar dari telefon, tablet dan komputer riba.'],
                    ]
                ).map(([a, b]) => (
                  <div key={a} className="flex gap-3">
                    <div className="mt-0.5 text-red-600">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-950">{a}</div>
                      <p className="mt-0.5 text-xs text-slate-500">{b}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Quote Section */}
        <section id="tentang" className="mx-auto max-w-7xl px-4 py-14 sm:px-8 lg:px-12">
          <div className="rounded-2xl bg-gradient-to-r from-red-950 via-stone-900 to-red-950 px-6 py-8 text-center text-white sm:px-10 shadow-xl">
            <Quote className="mx-auto text-rose-400" size={26} />
            <h2 className="mx-auto mt-3 max-w-2xl text-balance text-xl font-extrabold leading-snug sm:text-2xl">
              {t('quoteText')}
            </h2>
            <p className="mt-3 text-xs text-white/60">{t('quoteSubtext')}</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-8 lg:px-12">
          <Logo small />
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} {t('copyrightText')}
            </p>
          </div>
          <Link to="/admin/login" className="text-xs font-semibold text-red-700 hover:underline">
            {t('adminLoginLink')}
          </Link>
        </div>
      </footer>
    </div>
  );
}

export function Verify() {
  const { t, lang } = useLang();
  const { token } = useParams();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/public/verify/' + encodeURIComponent(token))
      .then((r) => setRecord(r.certificate))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-4">
          <Link to="/">
            <Logo center />
          </Link>
          <div className="flex items-center gap-2">
            <LiveClock showDate={false} className="hidden sm:inline-flex" />
            <LanguageSwitcher />
          </div>
        </div>

        <div className="mt-6 sm:mt-8 rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-7 text-center shadow-apple">
          {loading ? (
            <Loading
              text={lang === 'eng' ? 'Verifying Certificate...' : 'Menyemak Kesahihan Sijil...'}
              subtext={lang === 'eng' ? 'Searching official academy registry...' : 'Mencari rekod rasmi di pengkalan data...'}
              size="md"
            />
          ) : record ? (
            <>
              <CheckCircle2 className="mx-auto text-emerald-600" size={44} />
              <div className="mt-3 text-xs font-extrabold uppercase tracking-widest text-emerald-600">
                {t('verifyValidBadge')}
              </div>
              <h1 className="mt-2 text-xl font-extrabold text-slate-950 sm:text-2xl">
                {t('verifyHeading')}
              </h1>
              <p className="mt-2 text-xs leading-6 text-slate-500">
                {t('verifyValidMessage')}
              </p>
              <div className="mt-5 space-y-2.5 rounded-xl bg-slate-50 p-4 text-left border border-slate-200/60">
                {[
                  [t('verifyStudentName'), record.nama_penuh],
                  [t('verifyIdNumber'), record.no_kp_atau_id || '—'],
                  [t('verifyCertName'), record.nama_sijil],
                  [t('verifyRankLevel'), record.peringkat],
                  [t('branchLabel'), record.cawangan],
                  [t('dateRegLabel'), record.tarikh_daftar ? fmtDate(record.tarikh_daftar) : '—'],
                  [t('verifyDateIssued'), fmtDate(record.tarikh_isu)],
                ].map(([key, value]) => (
                  <div key={key} className="flex flex-wrap justify-between gap-1 border-b border-slate-200/60 pb-2 text-xs">
                    <span className="text-slate-500">{key}</span>
                    <strong className="text-right text-slate-900">{value}</strong>
                  </div>
                ))}
              </div>
              <a
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-red-800 shadow-xs"
                href={certDownload(token)}
                download={`${record.nama_penuh}.pdf`}
              >
                <Download size={15} /> {t('verifyDownloadBtn')}
              </a>
            </>
          ) : (
            <>
              <div className="text-4xl">⚠️</div>
              <h1 className="mt-3 text-lg font-extrabold text-slate-950">
                {lang === 'eng' ? 'Verification Failed' : 'Pengesahan Gagal'}
              </h1>
              <p className="mt-2 text-xs text-slate-500">{error}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
