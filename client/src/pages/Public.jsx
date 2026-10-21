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
import { Logo, Button, Chip, Empty } from '../components/UI';
import { useLanguage } from '../lib/i18n';
import { LanguageToggle } from '../components/LanguageToggle';
import { ThemeToggle } from '../components/ThemeToggle';

const rise = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

const steps = [
  {
    icon: Search,
    num: '01',
    title: 'Cari nama pesilat',
    text: 'Masukkan nama penuh atau nombor ID pesilat pada ruangan carian pintar.',
  },
  {
    icon: FileCheck2,
    num: '02',
    title: 'Semak sijil',
    text: 'Lihat profil pesilat serta senarai sijil digital rasmi yang telah dikeluarkan.',
  },
  {
    icon: Download,
    num: '03',
    title: 'Muat turun PDF',
    text: 'Dapatkan dokumen sijil berkualiti tinggi dengan hanya satu klik mudah.',
  },
];

function PublicNav() {
  const { t } = useLanguage();

  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8 sm:py-5 lg:px-12">
        <Link to="/" aria-label="Utama">
          <Logo light />
        </Link>
        <nav className="hidden items-center gap-7 text-xs font-semibold text-white/80 md:flex">
          <a href="/#cara" className="transition hover:text-rose-200">
            {t('public.howTo', 'Cara Semakan')}
          </a>
          <a href="/#kelebihan" className="transition hover:text-rose-200">
            {t('public.features', 'Kelebihan')}
          </a>
          <a href="/#tentang" className="transition hover:text-rose-200">
            {t('public.about', 'Tentang Kami')}
          </a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-2.5">
          <LanguageToggle className="border-white/20 bg-white/10 text-white" />
          <ThemeToggle className="border-white/20 bg-white/10 text-white hover:bg-white/20" />
          <Link
            to="/admin/login"
            className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-white/20 backdrop-blur-sm shadow-xs"
          >
            <LockKeyhole size={13} /> {t('public.adminLogin', 'Admin')} <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
    </header>
  );
}

function SearchResult({ records, loading, q, searched }) {
  const { t, lang } = useLanguage();
  if (!searched) return null;
  return (
    <div id="hasil-carian" className="mx-auto w-full max-w-4xl px-4 pt-6 sm:px-6">
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-apple"
          >
            <Loader2 className="mx-auto animate-spin text-red-600 dark:text-red-400" size={26} />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              {t('public.searching', 'Sedang menyemak rekod rasmi...')}
            </p>
          </motion.div>
        ) : records.length ? (
          <motion.div key="records" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={18} />
              <h2 className="text-lg font-extrabold text-slate-950 dark:text-slate-100">
                {t('public.recordsFound', 'Rekod Ditemui')}
              </h2>
              <Chip color="red">{records.length} {lang === 'en' ? 'students' : 'pesilat'}</Chip>
            </div>
            <div className="space-y-4">
              {records.map((p) => (
                <div key={p.id} className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-apple">
                  <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 dark:border-slate-800 bg-[#FCFDFB] dark:bg-slate-900/60 p-4 sm:p-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900/50">
                      <GraduationCap size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-extrabold leading-snug text-slate-950 dark:text-slate-100">{p.nama_penuh}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                        {p.no_kp_atau_id && (
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
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
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-bold text-slate-700 dark:text-slate-300">
                            <CalendarDays size={12} />
                            {lang === 'en' ? 'Registered:' : 'Tarikh Daftar:'} {fmtDate(p.tarikh_daftar)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Chip color="emerald">{p.certificates.length} {lang === 'en' ? 'certs' : 'sijil'}</Chip>
                  </div>
                  <div className="p-4 sm:p-5">
                    <h4 className="mb-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {t('public.certList', 'Senarai Sijil Digital Rasmi')}
                    </h4>
                    {p.certificates.length ? (
                      <div className="space-y-2.5">
                        {p.certificates.map((c) => (
                          <div
                            key={c.id}
                            className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                          >
                            <div className="grid h-9 w-9 place-items-center rounded-lg bg-white dark:bg-slate-900 text-red-700 dark:text-red-400 shadow-2xs border border-slate-200/60 dark:border-slate-700">
                              <FileText size={18} />
                            </div>
                            <div className="min-w-[150px] flex-1">
                              <div className="text-sm font-bold text-slate-950 dark:text-slate-100">{c.nama_sijil}</div>
                              <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                                <CalendarDays size={11} />
                                {fmtDate(c.tarikh_isu)}
                              </div>
                            </div>
                            <a
                              className="inline-flex items-center gap-1.5 rounded-xl bg-red-700 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-red-800 shadow-xs"
                              href={certDownload(c.public_token)}
                              download={`${p.nama_penuh}.pdf`}
                            >
                              <Download size={14} /> {t('public.downloadPdf', 'Muat Turun PDF')}
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty
                        title={lang === 'en' ? 'No certificates issued yet' : 'Belum mempunyai sijil'}
                        message={lang === 'en' ? 'Please contact the academy administrator if certificate is missing.' : 'Hubungi pihak akademi sekiranya sijil masih belum dipaparkan.'}
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
            className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-8 text-center shadow-apple"
          >
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/50">
              <Search size={22} />
            </div>
            <h3 className="text-base font-extrabold text-slate-950 dark:text-slate-100">
              {t('public.noRecords', 'Tiada rekod ditemui')}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-slate-500 dark:text-slate-400">
              {t('public.noRecordsDesc', 'Semak ejaan nama penuh atau nombor ID. Sila hubungi pihak akademi jika sijil belum didaftarkan.')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Home() {
  const { t, lang } = useLanguage();
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
    if (q.trim().length < 3) return toast.error(lang === 'en' ? 'Enter full name or ID (minimum 3 characters).' : 'Masukkan nama penuh atau ID (minima 3 aksara).');
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

  return (
    <div className="min-h-screen bg-[#FBFBFD] dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 transition-colors">
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
              <motion.div
                variants={rise}
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-300/30 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-rose-200 backdrop-blur-md shadow-xs"
              >
                <span className="h-2 w-2 animate-pulse rounded-full bg-rose-300" /> {t('public.badge', 'SISTEM SIJIL DIGITAL PESILAT')}{' '}
                <ChevronRight size={14} />
              </motion.div>

              <motion.h1
                variants={rise}
                className="max-w-3xl text-balance text-[clamp(2.2rem,4.5vw,4.5rem)] font-extrabold leading-[1.12] tracking-[-0.05em]"
              >
                {lang === 'en' ? (
                  <>Every achievement, <span className="text-rose-300">a proud moment.</span></>
                ) : (
                  <>Setiap pencapaian, <span className="text-rose-300">satu kebanggaan.</span></>
                )}
              </motion.h1>

              <motion.p variants={rise} className="mt-3.5 max-w-xl text-sm leading-6 text-white/80 sm:text-base">
                {lang === 'en'
                  ? 'Quickly, securely, and officially verify and download your child\'s silat achievements.'
                  : 'Semak dan muat turun sijil pencapaian silat anak anda dengan pantas, selamat dan rasmi.'}
              </motion.p>

              {/* Apple-style Clean Floating Search Box */}
              <motion.form
                variants={rise}
                onSubmit={search}
                className="mt-6 max-w-xl rounded-2xl border border-white/20 bg-white/95 dark:bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-md"
              >
                <div className="flex items-center gap-2">
                  <Search size={18} className="ml-3 shrink-0 text-slate-400" />
                  <input
                    aria-label={t('public.searchPlaceholder', 'Nama penuh atau nombor ID pesilat...')}
                    placeholder={t('public.searchPlaceholder', 'Nama penuh atau nombor ID pesilat...')}
                    className="w-full min-w-0 flex-1 bg-transparent px-2 py-2 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none placeholder:font-normal placeholder:text-slate-400"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                  <Button type="submit" loading={loading} className="!rounded-xl !px-3 sm:!px-5 text-xs">
                    {t('public.searchBtn', 'Semak')} <ArrowRight size={14} />
                  </Button>
                </div>
              </motion.form>

              <motion.p variants={rise} className="mt-3 flex items-center gap-2 text-xs text-white/50">
                <ShieldCheck size={14} className="text-rose-300" />{' '}
                {lang === 'en' ? 'Fast search using full student name or ID number only.' : 'Carian pantas menggunakan nama penuh atau ID pesilat sahaja.'}
              </motion.p>

              <motion.div variants={rise} className="mt-6 flex flex-wrap items-center gap-6">
                <div>
                  <div className="text-xl sm:text-2xl font-extrabold text-white">
                    {latest === null ? '—' : latest.toLocaleString(lang === 'en' ? 'en-US' : 'ms-MY')}
                    <span className="text-rose-300">+</span>
                  </div>
                  <span className="text-[11px] text-white/50">{lang === 'en' ? 'Certificates issued' : 'Sijil dikeluarkan'}</span>
                </div>
                <div className="h-6 w-px bg-white/20" />
                <div>
                  <div className="text-xl sm:text-2xl font-extrabold text-white">
                    100<span className="text-rose-300">%</span>
                  </div>
                  <span className="text-[11px] text-white/50">{lang === 'en' ? 'Digital & accessible' : 'Digital & mudah dicapai'}</span>
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
                  <div className="relative mt-6 text-2xl font-extrabold tracking-tight">SIJIL</div>
                  <div className="relative mt-0.5 text-base font-bold tracking-[0.15em] text-red-800">PENGHARGAAN</div>
                  <div className="relative mx-auto mt-4 h-px w-24 bg-red-700" />
                  <div className="relative mt-4 text-[9px] text-slate-500">Dengan sukacitanya dianugerahkan kepada</div>
                  <div className="relative mt-2 font-serif text-xl font-bold italic text-red-900">PESILAT CEMERLANG</div>
                  <div className="relative mt-2 text-[11px] font-semibold text-slate-700">Sijil Kenaikan Bengkung</div>
                  <div className="relative mt-6 flex justify-between text-[8px] text-slate-500">
                    <span>
                      ________________
                      <br />
                      Pengarah Akademi
                    </span>
                    <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-red-700 font-extrabold text-red-700">
                      RASMI
                    </span>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-5 -left-6 flex items-center gap-2.5 rounded-xl bg-white p-3 shadow-xl border border-slate-100">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-900">Disahkan Digital</div>
                  <div className="text-[10px] text-slate-400">Sijil rasmi sedia dimuat turun</div>
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
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-red-600">MUDAH & PANTAS</div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              Semak sijil dalam <span className="text-red-600">3 langkah.</span>
            </h2>
            <p className="mt-2 text-xs leading-6 text-slate-500">
              Tiada pendaftaran akaun diperlukan untuk ibu bapa. Carian yang mudah, pengalaman yang lancar.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
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
                <span>AKADEMI PROSILAT</span>
                <span>MUDAH • SELAMAT • RASMI</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-red-600">
                DIBINA UNTUK KOMUNITI SILAT
              </div>
              <h2 className="mt-2 max-w-xl text-2xl font-extrabold leading-snug tracking-tight text-slate-950 sm:text-3xl">
                Menghargai setiap usaha dan <span className="text-red-600">kejayaan pesilat.</span>
              </h2>
              <p className="mt-3 text-xs leading-6 text-slate-500">
                Portal berpusat yang membantu pihak akademi mengurus rekod sijil dan memudahkan ibu bapa mendapatkan dokumen pencapaian pada bila-bila masa.
              </p>
              <div className="mt-5 space-y-3.5">
                {[
                  ['Sijil boleh dimuat turun sebagai PDF', 'Disimpan secara digital supaya mudah dicetak dan dikongsi.'],
                  ['Semakan kesahihan sijil', 'Setiap sijil mempunyai pautan pengesahan rasmi tersendiri.'],
                  ['Mesra telefon pintar & laptop', 'Akses lancar dari telefon, tablet dan komputer riba.'],
                ].map(([a, b]) => (
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
              “Setiap langkah di gelanggang membina disiplin, keyakinan dan jati diri.”
            </h2>
            <p className="mt-3 text-xs text-white/60">Mengiktiraf usaha, meraikan pencapaian, menginspirasi generasi.</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-8 lg:px-12">
          <Logo small />
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Akademi ProSilat. Hak cipta terpelihara.
          </p>
          <Link to="/admin/login" className="text-xs font-semibold text-red-700 hover:underline">
            Log masuk admin
          </Link>
        </div>
      </footer>
    </div>
  );
}

export function Verify() {
  const { t, lang } = useLanguage();
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
    <div className="min-h-screen bg-[#FBFBFD] dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 transition-colors">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
        <Link to="/" className="flex justify-center">
          <Logo center />
        </Link>
        <div className="mt-6 sm:mt-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-7 text-center shadow-apple">
          {loading ? (
            <Loader2 className="mx-auto animate-spin text-red-700 dark:text-red-400" size={28} />
          ) : record ? (
            <>
              <CheckCircle2 className="mx-auto text-emerald-600 dark:text-emerald-400" size={44} />
              <div className="mt-3 text-xs font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                {lang === 'en' ? 'VALID CERTIFICATE' : 'SIJIL SAH'}
              </div>
              <h1 className="mt-2 text-xl font-extrabold text-slate-950 dark:text-slate-100 sm:text-2xl">
                {lang === 'en' ? 'Certificate Verification' : 'Pengesahan Sijil'}
              </h1>
              <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
                {t('public.verifyDesc', 'Sijil ini wujud dalam rekod rasmi Akademi ProSilat.')}
              </p>
              <div className="mt-5 space-y-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 text-left border border-slate-200/60 dark:border-slate-700">
                {[
                  [t('th.name', 'Nama Pesilat'), record.nama_penuh],
                  [t('th.ic', 'No. KP / ID'), record.no_kp_atau_id || '—'],
                  [t('th.certName', 'Nama Sijil'), record.nama_sijil],
                  [t('th.rank', 'Peringkat'), record.peringkat],
                  [t('th.branch', 'Cawangan'), record.cawangan],
                  [lang === 'en' ? 'Student Registration Date' : 'Tarikh Daftar Pesilat', record.tarikh_daftar ? fmtDate(record.tarikh_daftar) : '—'],
                  [t('th.issueDate', 'Tarikh Dikeluarkan'), fmtDate(record.tarikh_isu)],
                ].map(([key, value]) => (
                  <div key={key} className="flex flex-wrap justify-between gap-1 border-b border-slate-200/60 dark:border-slate-700/60 pb-2 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">{key}</span>
                    <strong className="text-right text-slate-900 dark:text-slate-100">{value}</strong>
                  </div>
                ))}
              </div>
              <a
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-red-800 shadow-xs"
                href={certDownload(token)}
                download={`${record.nama_penuh}.pdf`}
              >
                <Download size={15} /> {t('action.download', 'Muat Turun Sijil')}
              </a>
            </>
          ) : (
            <>
              <div className="text-4xl">⚠️</div>
              <h1 className="mt-3 text-lg font-extrabold text-slate-950 dark:text-slate-100">
                {lang === 'en' ? 'Verification Failed' : 'Pengesahan Gagal'}
              </h1>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{error}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
