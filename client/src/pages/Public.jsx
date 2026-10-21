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

const rise = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

const steps = [
  {
    icon: Search,
    num: '01',
    title: 'Cari nama pesilat',
    text: 'Masukkan nama penuh atau nombor ID pesilat pada ruangan carian.',
  },
  {
    icon: FileCheck2,
    num: '02',
    title: 'Semak sijil',
    text: 'Lihat maklumat pesilat dan senarai sijil yang telah dikeluarkan.',
  },
  {
    icon: Download,
    num: '03',
    title: 'Muat turun PDF',
    text: 'Dapatkan sijil digital rasmi anda dengan hanya satu klik.',
  },
];

function PublicNav() {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8 sm:py-5 lg:px-12">
        <Link to="/" aria-label="Utama">
          <Logo light />
        </Link>
        <nav className="hidden items-center gap-7 text-xs font-semibold text-white/75 md:flex">
          <a href="/#cara" className="transition hover:text-gold-400">
            Cara Semakan
          </a>
          <a href="/#kelebihan" className="transition hover:text-gold-400">
            Kelebihan
          </a>
          <a href="/#tentang" className="transition hover:text-gold-400">
            Tentang Kami
          </a>
        </nav>
        <Link
          to="/admin/login"
          className="flex items-center gap-1.5 rounded-full border border-white/25 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-white/10"
        >
          <LockKeyhole size={13} /> Admin <ArrowUpRight size={13} />
        </Link>
      </div>
    </header>
  );
}

function SearchResult({ records, loading, q, searched }) {
  if (!searched) return null;
  return (
    <div id="hasil-carian" className="mx-auto w-full max-w-4xl px-4 pt-6 sm:px-6">
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-soft"
          >
            <Loader2 className="mx-auto animate-spin text-forest-700" size={26} />
            <p className="mt-2 text-xs text-slate-500">Sedang menyemak rekod...</p>
          </motion.div>
        ) : records.length ? (
          <motion.div key="records" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle2 className="text-emerald-600" size={18} />
              <h2 className="text-lg font-extrabold text-forest-950">Rekod ditemui</h2>
              <Chip>{records.length} pesilat</Chip>
            </div>
            <div className="space-y-4">
              {records.map((p) => (
                <div key={p.id} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-soft">
                  <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-[#FCFDFB] p-4 sm:p-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest-100 text-forest-800">
                      <GraduationCap size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-extrabold leading-snug text-forest-950">{p.nama_penuh}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
                        {p.no_kp_atau_id && (
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
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
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-800">
                            <CalendarDays size={12} />
                            Tarikh Daftar: {fmtDate(p.tarikh_daftar)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Chip>{p.certificates.length} sijil</Chip>
                  </div>
                  <div className="p-4 sm:p-5">
                    <h4 className="mb-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Senarai sijil digital
                    </h4>
                    {p.certificates.length ? (
                      <div className="space-y-2.5">
                        {p.certificates.map((c) => (
                          <div
                            key={c.id}
                            className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3"
                          >
                            <div className="grid h-9 w-9 place-items-center rounded-lg bg-white text-forest-700">
                              <FileText size={18} />
                            </div>
                            <div className="min-w-[150px] flex-1">
                              <div className="text-sm font-bold text-forest-950">{c.nama_sijil}</div>
                              <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                                <CalendarDays size={11} />
                                {fmtDate(c.tarikh_isu)}
                              </div>
                            </div>
                            <a
                              className="inline-flex items-center gap-1.5 rounded-xl bg-forest-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-forest-700"
                              href={certDownload(c.public_token)}
                              download={`${p.nama_penuh}.pdf`}
                            >
                              <Download size={14} /> Muat Turun PDF
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty
                        title="Belum mempunyai sijil"
                        message="Hubungi pihak akademi sekiranya sijil masih belum dipaparkan."
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
            className="rounded-2xl border border-slate-100 bg-white px-6 py-8 text-center shadow-soft"
          >
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-amber-50 text-amber-600">
              <Search size={22} />
            </div>
            <h3 className="text-base font-extrabold text-forest-950">Tiada rekod ditemui</h3>
            <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-slate-500">
              Semak ejaan <strong>nama penuh</strong> atau nombor ID “{q}”. Jika sijil belum dikeluarkan, sila hubungi pihak akademi.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Home() {
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
    if (q.trim().length < 3) return toast.error('Masukkan nama penuh atau ID (minima 3 aksara).');
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
    <div className="min-h-screen bg-[#F7F9F7]">
      <PublicNav />
      <main>
        <section className="mesh-bg relative isolate overflow-hidden pb-12 pt-24 sm:pb-16 sm:pt-32 text-white">
          <div className="dot-grid pointer-events-none absolute inset-0 opacity-30" />
          <div className="pointer-events-none absolute -right-32 top-12 h-[520px] w-[520px] rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-16 top-28 h-[395px] w-[395px] rounded-full border border-white/10" />
          <div className="pointer-events-none absolute right-3 top-44 h-[250px] w-[250px] rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-44 -left-44 h-[470px] w-[470px] rounded-full bg-gold-500/10 blur-[90px]" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 sm:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-12 lg:px-12">
            <motion.div initial="hidden" animate="show" variants={stagger}>
              <motion.div
                variants={rise}
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-white/[0.06] px-3.5 py-1.5 text-xs font-semibold text-gold-400"
              >
                <span className="h-2 w-2 animate-pulse rounded-full bg-gold-400" /> SISTEM SIJIL DIGITAL PESILAT{' '}
                <ChevronRight size={14} />
              </motion.div>
              <motion.h1
                variants={rise}
                className="max-w-3xl text-balance text-[clamp(2.2rem,4.5vw,4.5rem)] font-extrabold leading-[1.12] tracking-[-0.05em]"
              >
                Setiap pencapaian, <span className="text-gold-400">satu kebanggaan.</span>
              </motion.h1>
              <motion.p variants={rise} className="mt-3.5 max-w-xl text-sm leading-6 text-white/70 sm:text-base">
                Semak dan muat turun sijil pencapaian silat anak anda dengan pantas, selamat dan rasmi.
              </motion.p>
              <motion.form
                variants={rise}
                onSubmit={search}
                className="mt-6 max-w-xl rounded-2xl border border-white/10 bg-white p-1.5 shadow-xl"
              >
                <div className="flex items-center gap-2">
                  <Search size={18} className="ml-3 shrink-0 text-slate-400" />
                  <input
                    aria-label="Nama penuh atau nombor ID pesilat"
                    placeholder="Nama penuh atau nombor ID pesilat..."
                    className="w-full min-w-0 flex-1 bg-transparent px-2 py-2 text-xs sm:text-sm font-semibold text-forest-950 outline-none placeholder:font-normal placeholder:text-slate-400"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                  <Button type="submit" loading={loading} className="!rounded-xl !px-3 sm:!px-5 text-xs">
                    Semak <ArrowRight size={14} />
                  </Button>
                </div>
              </motion.form>
              <motion.p variants={rise} className="mt-3 flex items-center gap-2 text-xs text-white/45">
                <ShieldCheck size={14} className="text-gold-400" /> Carian menggunakan nama penuh atau ID pesilat sahaja.
              </motion.p>

              <motion.div variants={rise} className="mt-6 flex flex-wrap items-center gap-6">
                <div>
                  <div className="text-xl sm:text-2xl font-extrabold text-white">
                    {latest === null ? '—' : latest.toLocaleString('ms-MY')}
                    <span className="text-gold-400">+</span>
                  </div>
                  <span className="text-[11px] text-white/45">Sijil dikeluarkan</span>
                </div>
                <div className="h-6 w-px bg-white/20" />
                <div>
                  <div className="text-xl sm:text-2xl font-extrabold text-white">
                    100<span className="text-gold-400">%</span>
                  </div>
                  <span className="text-[11px] text-white/45">Digital & mudah dicapai</span>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 25, rotate: 2 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative mx-auto hidden w-full max-w-[380px] lg:block"
            >
              <div className="absolute -inset-6 rounded-full bg-gold-500/10 blur-2xl" />
              <div className="animate-float relative rotate-[4deg] rounded-2xl bg-[#FAF7EE] p-3.5 shadow-xl">
                <div className="relative min-h-[270px] rounded-sm border-[4px] border-double border-[#B99B62] p-6 text-center text-forest-950">
                  <div className="absolute inset-2 border border-[#D9C394]" />
                  <div className="relative mt-2 text-[9px] font-extrabold tracking-[0.2em] text-gold-500">
                    AKADEMI PRO SILAT
                  </div>
                  <div className="relative mt-6 text-2xl font-extrabold tracking-tight">SIJIL</div>
                  <div className="relative mt-0.5 text-base font-bold tracking-[0.15em]">PENGHARGAAN</div>
                  <div className="relative mx-auto mt-4 h-px w-24 bg-gold-500" />
                  <div className="relative mt-4 text-[9px] text-slate-400">Dengan sukacitanya dianugerahkan kepada</div>
                  <div className="relative mt-2 font-serif text-xl font-bold italic">PESILAT CEMERLANG</div>
                  <div className="relative mt-2 text-[11px] font-semibold text-forest-700">Sijil Kenaikan Bengkung</div>
                  <div className="relative mt-6 flex justify-between text-[8px] text-slate-500">
                    <span>
                      ________________
                      <br />
                      Pengarah Akademi
                    </span>
                    <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-gold-500 font-extrabold text-gold-500">
                      RASMI
                    </span>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-5 -left-6 flex items-center gap-2.5 rounded-xl bg-white p-3 shadow-xl">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-forest-900">Disahkan Digital</div>
                  <div className="text-[10px] text-slate-400">Sijil rasmi anda tersedia</div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 rounded-t-[50%] bg-[#F7F9F7]" />
        </section>

        <SearchResult records={records} loading={loading} searched={searched} q={q} />

        <section id="cara" className="mx-auto max-w-7xl px-4 py-16 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-forest-600">MUDAH & PANTAS</div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-forest-950 sm:text-3xl">
              Semak sijil dalam <span className="text-forest-600">3 langkah.</span>
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
                className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-forest-100 text-forest-800 transition group-hover:bg-forest-800 group-hover:text-white">
                    <s.icon size={20} />
                  </div>
                  <span className="text-3xl font-extrabold text-slate-100">{s.num}</span>
                </div>
                <h3 className="mt-4 text-base font-extrabold text-forest-950">{s.title}</h3>
                <p className="mt-2 text-xs leading-6 text-slate-500">{s.text}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="kelebihan" className="bg-white py-14">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-8 lg:grid-cols-2 lg:items-center lg:px-12">
            <div className="relative flex min-h-[280px] items-center justify-center overflow-hidden rounded-2xl bg-forest-900">
              <div className="dot-grid absolute inset-0 opacity-40" />
              <div className="relative z-10 grid h-[180px] w-[180px] place-items-center rounded-full border border-gold-400/30 bg-white/5">
                <div className="grid h-24 w-24 place-items-center rounded-full bg-gold-500/15 text-gold-400">
                  <ShieldCheck size={52} strokeWidth={1.2} />
                </div>
              </div>
              <div className="absolute bottom-4 left-5 right-5 flex justify-between text-[11px] font-semibold text-white/60">
                <span>PROSIJIL DIGITAL</span>
                <span>MUDAH • SELAMAT • RASMI</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-forest-600">
                DIBINA UNTUK KOMUNITI SILAT
              </div>
              <h2 className="mt-2 max-w-xl text-2xl font-extrabold leading-snug tracking-tight text-forest-950 sm:text-3xl">
                Menghargai setiap usaha dan <span className="text-forest-600">kejayaan pesilat.</span>
              </h2>
              <p className="mt-3 text-xs leading-6 text-slate-500">
                Portal berpusat yang membantu pihak akademi mengurus rekod sijil dan memudahkan ibu bapa mendapatkan dokumen pencapaian pada bila-bila masa.
              </p>
              <div className="mt-5 space-y-3.5">
                {[
                  ['Sijil boleh dimuat turun sebagai PDF', 'Disimpan secara digital supaya mudah dicetak dan dikongsi.'],
                  ['Semakan kesahihan sijil', 'Setiap sijil mempunyai pautan pengesahan tersendiri.'],
                  ['Mesra telefon pintar', 'Akses lancar dari telefon, tablet dan komputer.'],
                ].map(([a, b]) => (
                  <div key={a} className="flex gap-3">
                    <div className="mt-0.5 text-forest-600">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-forest-950">{a}</div>
                      <p className="mt-0.5 text-xs text-slate-500">{b}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="tentang" className="mx-auto max-w-7xl px-4 py-14 sm:px-8 lg:px-12">
          <div className="rounded-2xl bg-forest-900 px-6 py-8 text-center text-white sm:px-10">
            <Quote className="mx-auto text-gold-400" size={26} />
            <h2 className="mx-auto mt-3 max-w-2xl text-balance text-xl font-extrabold leading-snug sm:text-2xl">
              “Setiap langkah di gelanggang membina disiplin, keyakinan dan jati diri.”
            </h2>
            <p className="mt-3 text-xs text-white/50">Mengiktiraf usaha, meraikan pencapaian, menginspirasi generasi.</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-8 lg:px-12">
          <Logo small />
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} ProSijil • Akademi Pro Silat. Hak cipta terpelihara.
          </p>
          <Link to="/admin/login" className="text-xs font-semibold text-forest-700 hover:underline">
            Log masuk admin
          </Link>
        </div>
      </footer>
    </div>
  );
}

export function Verify() {
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
        <Link to="/">
          <Logo />
        </Link>
        <div className="mt-6 sm:mt-8 rounded-2xl border border-slate-100 bg-white p-5 sm:p-7 text-center shadow-soft">
          {loading ? (
            <Loader2 className="mx-auto animate-spin text-forest-800" size={28} />
          ) : record ? (
            <>
              <CheckCircle2 className="mx-auto text-emerald-600" size={44} />
              <div className="mt-3 text-xs font-extrabold uppercase tracking-widest text-emerald-600">SIJIL SAH</div>
              <h1 className="mt-2 text-xl font-extrabold text-forest-950 sm:text-2xl">Pengesahan Sijil</h1>
              <p className="mt-2 text-xs leading-6 text-slate-500">Sijil ini wujud dalam rekod rasmi ProSijil.</p>
              <div className="mt-5 space-y-2.5 rounded-xl bg-canvas p-4 text-left">
                {[
                  ['Nama Pesilat', record.nama_penuh],
                  ['No. KP / ID', record.no_kp_atau_id || '—'],
                  ['Nama Sijil', record.nama_sijil],
                  ['Peringkat', record.peringkat],
                  ['Cawangan', record.cawangan],
                  ['Tarikh Daftar Pesilat', record.tarikh_daftar ? fmtDate(record.tarikh_daftar) : '—'],
                  ['Tarikh Dikeluarkan', fmtDate(record.tarikh_isu)],
                ].map(([key, value]) => (
                  <div key={key} className="flex flex-wrap justify-between gap-1 border-b border-slate-100 pb-2 text-xs">
                    <span className="text-slate-500">{key}</span>
                    <strong className="text-right text-forest-950">{value}</strong>
                  </div>
                ))}
              </div>
              <a
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-forest-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-forest-700"
                href={certDownload(token)}
                download={`${record.nama_penuh}.pdf`}
              >
                <Download size={15} /> Muat Turun Sijil
              </a>
            </>
          ) : (
            <>
              <div className="text-4xl">⚠️</div>
              <h1 className="mt-3 text-lg font-extrabold text-forest-950">Pengesahan Gagal</h1>
              <p className="mt-2 text-xs text-slate-500">{error}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
