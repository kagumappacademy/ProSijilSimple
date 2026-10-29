import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Award,
  MapPin,
  ArrowUpRight,
  Plus,
  TrendingUp,
  CalendarDays,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api, fmtDate } from '../lib/api';
import { PageIntro, Panel, Loading, Empty, Chip } from '../components/UI';
import { useLang } from '../lib/i18n';
import { getCertCategory, getCategoryMeta } from '../lib/certTypes';

function NumberCard({ title, value, icon: Icon, tint, index }) {
  const { lang } = useLang();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, ease: 'easeOut' }}
      className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/70 bg-white/95 backdrop-blur-sm p-4 sm:p-5 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
          <div className="mt-1.5 text-3xl sm:text-4xl font-black leading-none tracking-tight text-slate-950">
            {value.toLocaleString(lang === 'eng' ? 'en-US' : 'ms-MY')}
          </div>
          <div className="mt-2.5 inline-flex items-center gap-1.5 text-[10.5px] font-bold text-red-700 bg-red-50/80 px-2 py-0.5 rounded-full border border-red-100">
            <TrendingUp size={11} className="text-red-700" />
            <span>{lang === 'eng' ? 'Official Database' : 'Pangkalan Rasmi'}</span>
          </div>
        </div>
        <div className={`grid h-12 w-12 place-items-center rounded-2xl shadow-2xs group-hover:scale-105 transition-transform duration-300 ${tint}`}>
          <Icon size={22} />
        </div>
      </div>
    </motion.div>
  );
}

function BreakdownCard({ title, rows, icon: Icon }) {
  const max = Math.max(...rows.map((x) => x.total), 1);
  return (
    <div className="rounded-2xl sm:rounded-3xl bg-white/95 p-4 sm:p-5 border border-slate-200/70 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] space-y-3 min-w-0 w-full overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <h4 className="text-xs font-black text-slate-950 uppercase tracking-wider truncate flex items-center gap-2">
          {Icon && (
            <div className="grid h-6 w-6 place-items-center rounded-lg bg-red-50 text-red-700">
              <Icon size={13} />
            </div>
          )}
          <span>{title}</span>
        </h4>
        <span className="text-[10.5px] font-bold text-slate-400 font-mono bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200/60">
          {rows.reduce((acc, x) => acc + x.total, 0)} rekod
        </span>
      </div>
      {rows.length ? (
        <div className="space-y-2.5 min-w-0 w-full">
          {rows.map((r, idx) => {
            const labelText = r.name || r.label || 'Lain-lain';
            return (
              <div key={r.name || r.label || idx} className="group min-w-0 w-full">
                <div className="flex items-center justify-between text-xs gap-2 min-w-0 w-full mb-1">
                  <span className="font-semibold text-slate-700 text-[11px] truncate min-w-0 flex-1 block" title={labelText}>
                    {labelText}
                  </span>
                  <span className="font-black text-slate-900 font-mono text-[11px] shrink-0 tabular-nums">
                    {r.total}
                  </span>
                </div>
                <div className="h-2 w-full min-w-0 overflow-hidden rounded-full bg-slate-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (r.total / max) * 100)}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-red-650"
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
          Tiada data
        </div>
      )}
    </div>
  );
}

export function Dashboard() {
  const { t, lang } = useLang();
  const [data, setData] = useState(null);

  useEffect(() => {
    api('/admin/dashboard')
      .then(setData)
      .catch(() => {});
  }, []);

  return (
    <>
      <PageIntro
        eyebrow={t('overviewEyebrow')}
        title={t('overviewTitle')}
        desc={t('overviewDesc')}
      />

      {!data ? (
        <Loading />
      ) : (
        <div className="space-y-4 sm:space-y-5 w-full max-w-full min-w-0">
          {/* Top 3 Stat Cards (Apple Health / Analytics style) */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3 w-full min-w-0">
            <NumberCard
              index={0}
              title={t('statStudents')}
              value={data.pesilat}
              icon={GraduationCap}
              tint="bg-gradient-to-tr from-red-500 to-rose-600 text-white"
            />
            <NumberCard
              index={1}
              title={t('statCerts')}
              value={data.sijil}
              icon={Award}
              tint="bg-gradient-to-tr from-rose-500 to-pink-600 text-white"
            />
            <NumberCard
              index={2}
              title={t('statBranches')}
              value={data.branches}
              icon={MapPin}
              tint="bg-gradient-to-tr from-slate-700 to-slate-900 text-white"
            />
          </div>

          {/* Quick Action Navigation Tiles (Material 3 / Apple Shortcuts style) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 w-full min-w-0">
            <Link
              to="/admin/pesilat"
              className="group flex items-center justify-between gap-2 rounded-2xl border border-slate-200/70 bg-white/90 hover:bg-white p-3 sm:p-3.5 shadow-2xs hover:shadow-apple hover:-translate-y-0.5 transition-all duration-200 cursor-pointer min-w-0 overflow-hidden"
            >
              <div className="flex items-center gap-2.5 min-w-0 truncate">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-red-50 group-hover:bg-red-600 text-red-700 group-hover:text-white transition-colors duration-200 shrink-0">
                  <Plus size={16} />
                </div>
                <span className="text-xs font-bold text-slate-900 truncate">{t('btnManageStudents')}</span>
              </div>
              <ArrowUpRight size={14} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 text-slate-400 group-hover:text-red-700 transition-all shrink-0" />
            </Link>

            <Link
              to="/admin/templates"
              className="group flex items-center justify-between gap-2 rounded-2xl border border-slate-200/70 bg-white/90 hover:bg-white p-3 sm:p-3.5 shadow-2xs hover:shadow-apple hover:-translate-y-0.5 transition-all duration-200 cursor-pointer min-w-0 overflow-hidden"
            >
              <div className="flex items-center gap-2.5 min-w-0 truncate">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-red-50 group-hover:bg-red-600 text-red-700 group-hover:text-white transition-colors duration-200 shrink-0">
                  <Layers size={16} />
                </div>
                <span className="text-xs font-bold text-slate-900 truncate">{t('btnTemplates')}</span>
              </div>
              <ArrowUpRight size={14} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 text-slate-400 group-hover:text-red-700 transition-all shrink-0" />
            </Link>

            <Link
              to="/admin/jana-sijil"
              className="group flex items-center justify-between gap-2 rounded-2xl border border-slate-200/70 bg-white/90 hover:bg-white p-3 sm:p-3.5 shadow-2xs hover:shadow-apple hover:-translate-y-0.5 transition-all duration-200 cursor-pointer min-w-0 overflow-hidden"
            >
              <div className="flex items-center gap-2.5 min-w-0 truncate">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-red-50 group-hover:bg-red-600 text-red-700 group-hover:text-white transition-colors duration-200 shrink-0">
                  <Sparkles size={16} />
                </div>
                <span className="text-xs font-bold text-slate-900 truncate">{t('btnBatchGenerate')}</span>
              </div>
              <ArrowUpRight size={14} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 text-slate-400 group-hover:text-red-700 transition-all shrink-0" />
            </Link>

            <Link
              to="/admin/sijil"
              className="group flex items-center justify-between gap-2 rounded-2xl border border-slate-200/70 bg-white/90 hover:bg-white p-3 sm:p-3.5 shadow-2xs hover:shadow-apple hover:-translate-y-0.5 transition-all duration-200 cursor-pointer min-w-0 overflow-hidden"
            >
              <div className="flex items-center gap-2.5 min-w-0 truncate">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-red-50 group-hover:bg-red-600 text-red-700 group-hover:text-white transition-colors duration-200 shrink-0">
                  <Award size={16} />
                </div>
                <span className="text-xs font-bold text-slate-900 truncate">{t('btnCertList')}</span>
              </div>
              <ArrowUpRight size={14} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 text-slate-400 group-hover:text-red-700 transition-all shrink-0" />
            </Link>
          </div>

          {/* 2-Column Split: Analytics (Left) & Recent Certificates (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 w-full max-w-full min-w-0">
            {/* Left Column: Breakdowns */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5 min-w-0 w-full">
              <BreakdownCard title={t('analyticsRank')} rows={data.byLevel} icon={Award} />
              <BreakdownCard title={t('analyticsBranch')} rows={data.byBranch} icon={MapPin} />
            </div>

            {/* Right Column: Sijil Terkini */}
            <Panel className="lg:col-span-5 flex flex-col min-w-0 w-full max-w-full overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:px-5 min-w-0">
                <div className="min-w-0 truncate">
                  <h3 className="text-xs font-black text-slate-950 uppercase tracking-wider truncate flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-600" />
                    <span>{t('recentCerts')}</span>
                  </h3>
                </div>
                <Link
                  to="/admin/sijil"
                  className="inline-flex items-center gap-1 text-xs font-bold text-red-700 hover:text-red-800 transition shrink-0"
                >
                  <span>{t('viewAll')}</span>
                  <ChevronRight size={14} />
                </Link>
              </div>

              {data.recent.length ? (
                <div className="divide-y divide-slate-100 max-h-[340px] overflow-y-auto w-full min-w-0 p-1">
                  {data.recent.map((r) => {
                    const cat = getCertCategory(r);
                    const catMeta = getCategoryMeta(cat);
                    return (
                      <div
                        key={r.id}
                        className="flex items-start gap-3 p-3 sm:px-4 rounded-xl hover:bg-slate-50/80 transition duration-150 min-w-0 w-full"
                      >
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-50 text-red-700 shrink-0 border border-slate-200/70 text-sm mt-0.5 shadow-2xs">
                          {catMeta.emoji || <Award size={15} />}
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden space-y-0.5">
                          <div className="flex items-center justify-between gap-1.5 min-w-0">
                            <span className="truncate text-xs font-bold text-slate-950 block" title={r.nama_penuh}>
                              {r.nama_penuh}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 shrink-0 font-medium font-mono">
                              <CalendarDays size={10} className="shrink-0 text-slate-400" />
                              <span>{fmtDate(r.tarikh_isu)}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 truncate" title={`${r.nama_sijil} • ${r.cawangan}`}>
                            <span className={`inline-flex items-center px-1.5 py-0.2 rounded-md text-[8.5px] font-bold border ${catMeta.badge}`}>
                              {catMeta.shortLabel}
                            </span>
                            <span className="truncate text-slate-500 font-medium">{r.cawangan}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty title={t('noCertsYet')} message={t('noCertsYetDesc')} />
              )}
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
