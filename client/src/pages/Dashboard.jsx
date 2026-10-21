import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { GraduationCap, Award, MapPin, ArrowUpRight, Plus, TrendingUp, CalendarDays, ChevronRight, Layers, Sparkles } from 'lucide-react';
import { api, fmtDate } from '../lib/api';
import { PageIntro, Panel, Loading, Empty } from '../components/UI';
import { useLanguage } from '../lib/i18n';

function NumberCard({ title, value, icon: Icon, tint, index }) {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:bg-slate-900 dark:border-slate-800 p-3.5 sm:p-4 shadow-apple dark:shadow-none"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
          <div className="mt-1 text-2xl sm:text-3xl font-extrabold leading-none tracking-tight text-slate-950 dark:text-slate-100">
            {value.toLocaleString()}
          </div>
          <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400">
            <TrendingUp size={12} /> {t('dash.officialRecord', 'Rekod rasmi')}
          </div>
        </div>
        <div className={`grid h-11 w-11 place-items-center rounded-xl p-2.5 ${tint}`}>
          <Icon size={22} />
        </div>
      </div>
    </motion.div>
  );
}

function BreakdownCard({ title, rows }) {
  const max = Math.max(...rows.map((x) => x.total), 1);
  return (
    <div className="space-y-2.5">
      <h4 className="text-xs font-extrabold text-slate-950 dark:text-slate-100 uppercase tracking-wider">{title}</h4>
      {rows.length ? (
        <div className="space-y-2">
          {rows.slice(0, 5).map((r, i) => (
            <div key={i}>
              <div className="mb-1 flex justify-between gap-2 text-[11px]">
                <span className="max-w-[78%] truncate font-semibold text-slate-600 dark:text-slate-300" title={r.name}>
                  {r.name}
                </span>
                <span className="font-extrabold text-slate-900 dark:text-slate-100">{r.total}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: (r.total / max) * 100 + '%' }}
                  transition={{ duration: 0.5, delay: i * 0.04 }}
                  className="h-full rounded-full bg-gradient-to-r from-red-600 to-rose-400"
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty title="Belum ada data" />
      )}
    </div>
  );
}

export function Dashboard() {
  const [data, setData] = useState(null);
  const { t, lang } = useLanguage();

  useEffect(() => {
    api('/admin/dashboard')
      .then(setData)
      .catch(() => {});
  }, []);

  const dateLocale = lang === 'en' ? 'en-US' : 'ms-MY';
  const dateFormatted = new Date().toLocaleDateString(dateLocale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <>
      <PageIntro
        eyebrow={t('dash.eyebrow', 'RINGKASAN & STATISTIK')}
        title={lang === 'en' ? 'Welcome back 👋' : 'Selamat kembali 👋'}
        desc={`${t('dash.desc', 'Pantau bilangan pesilat, status pengeluaran sijil digital, dan rekod terkini.')} • ${dateFormatted}`}
      />

      {!data ? (
        <Loading />
      ) : (
        <div className="space-y-3.5 sm:space-y-4">
          {/* Top 3 Stat Cards */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
            <NumberCard
              index={0}
              title={t('dash.totalStudents', 'Jumlah Pesilat')}
              value={data.pesilat}
              icon={GraduationCap}
              tint="bg-red-50 text-red-700 border border-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/50"
            />
            <NumberCard
              index={1}
              title={t('dash.issuedCerts', 'Sijil Dikeluarkan')}
              value={data.sijil}
              icon={Award}
              tint="bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50"
            />
            <NumberCard
              index={2}
              title={t('dash.totalBranches', 'Jumlah Cawangan')}
              value={data.branches}
              icon={MapPin}
              tint="bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
            />
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <Link
              to="/admin/pesilat"
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white dark:bg-slate-900 dark:border-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-slate-100 transition hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 shadow-2xs active:scale-[0.98]"
            >
              <div className="flex items-center gap-2">
                <Plus size={16} className="text-red-700 dark:text-red-400" />
                <span className="text-xs font-bold">{t('dash.btnManageStudents', 'Urus Pesilat')}</span>
              </div>
              <ArrowUpRight size={14} className="opacity-50 text-slate-400" />
            </Link>

            <Link
              to="/admin/templates"
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white dark:bg-slate-900 dark:border-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-slate-100 transition hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 shadow-2xs active:scale-[0.98]"
            >
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-red-700 dark:text-red-400" />
                <span className="text-xs font-bold">{t('dash.btnTemplates', 'Templat Sijil')}</span>
              </div>
              <ArrowUpRight size={14} className="opacity-50 text-slate-400" />
            </Link>

            <Link
              to="/admin/jana-sijil"
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white dark:bg-slate-900 dark:border-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-slate-100 transition hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 shadow-2xs active:scale-[0.98]"
            >
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-red-700 dark:text-red-400" />
                <span className="text-xs font-bold">{t('dash.btnBatchGenerate', 'Jana Sijil Pukal')}</span>
              </div>
              <ArrowUpRight size={14} className="opacity-50 text-slate-400" />
            </Link>

            <Link
              to="/admin/sijil"
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white dark:bg-slate-900 dark:border-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-slate-100 transition hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 shadow-2xs active:scale-[0.98]"
            >
              <div className="flex items-center gap-2">
                <Award size={16} className="text-red-700 dark:text-red-400" />
                <span className="text-xs font-bold">{t('dash.btnCertList', 'Senarai Sijil')}</span>
              </div>
              <ArrowUpRight size={14} className="opacity-50 text-slate-400" />
            </Link>
          </div>

          {/* 2-Column Split: Analytics (Left) & Recent Certificates (Right) */}
          <div className="grid gap-3.5 lg:grid-cols-12">
            {/* Left Column: Breakdowns */}
            <Panel className="p-4 lg:col-span-7">
              <div className="grid gap-4 sm:grid-cols-2">
                <BreakdownCard title={t('dash.byRank', 'Mengikut Peringkat')} rows={data.byLevel} />
                <BreakdownCard title={t('dash.byBranch', 'Mengikut Cawangan')} rows={data.byBranch} />
              </div>
            </Panel>

            {/* Right Column: Sijil Terkini */}
            <Panel className="lg:col-span-5 flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-3 sm:px-4">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-950 dark:text-slate-100 uppercase tracking-wider">
                    {t('dash.recentCerts', 'Sijil Terkini')}
                  </h3>
                </div>
                <Link
                  to="/admin/sijil"
                  className="flex items-center gap-0.5 text-xs font-bold text-red-700 dark:text-red-400 hover:underline"
                >
                  {t('dash.all', 'Semua')} <ChevronRight size={14} />
                </Link>
              </div>

              {data.recent.length ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[260px] overflow-y-auto">
                  {data.recent.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-red-50 text-red-700 border border-red-100 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50 shrink-0">
                        <Award size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">{r.nama_penuh}</div>
                        <div className="truncate text-[10px] text-slate-400">
                          {r.nama_sijil} • {r.cawangan}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0">
                        <CalendarDays size={11} />
                        <span>{fmtDate(r.tarikh_isu)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty title={t('dash.noCerts', 'Belum ada sijil')} message={t('dash.noCertsDesc', 'Keluarkan sijil pertama melalui menu Pengurusan Sijil.')} />
              )}
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
