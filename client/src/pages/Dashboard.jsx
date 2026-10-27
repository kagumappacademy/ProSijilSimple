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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-apple"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{title}</p>
          <div className="mt-1 text-2xl sm:text-3xl font-extrabold leading-none tracking-tight text-slate-950">
            {value.toLocaleString(lang === 'eng' ? 'en-US' : 'ms-MY')}
          </div>
          <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-red-600">
            <TrendingUp size={12} /> {lang === 'eng' ? 'Official records' : 'Rekod rasmi'}
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
    <div className="space-y-2.5 min-w-0 w-full overflow-hidden">
      <h4 className="text-xs font-extrabold text-slate-950 uppercase tracking-wider truncate">{title}</h4>
      {rows.length ? (
        <div className="space-y-2 min-w-0 w-full">
          {rows.map((r, idx) => {
            const labelText = r.name || r.label || 'Lain-lain';
            return (
              <div key={r.name || r.label || idx} className="group min-w-0 w-full">
                <div className="flex items-center justify-between text-xs gap-2 min-w-0 w-full">
                  <span className="font-semibold text-slate-700 truncate min-w-0 flex-1 block" title={labelText}>
                    {labelText}
                  </span>
                  <span className="font-bold text-slate-900 font-mono text-[11px] shrink-0 tabular-nums">{r.total}</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full min-w-0 overflow-hidden rounded-full bg-slate-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (r.total / max) * 100)}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="h-full max-w-full rounded-full bg-gradient-to-r from-red-600 to-rose-700"
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
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
        <div className="space-y-3.5 sm:space-y-4 w-full max-w-full min-w-0">
          {/* Top 3 Stat Cards */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 w-full min-w-0">
            <NumberCard
              index={0}
              title={t('statStudents')}
              value={data.pesilat}
              icon={GraduationCap}
              tint="bg-red-50 text-red-700 border border-red-100"
            />
            <NumberCard
              index={1}
              title={t('statCerts')}
              value={data.sijil}
              icon={Award}
              tint="bg-rose-50 text-rose-700 border border-rose-100"
            />
            <NumberCard
              index={2}
              title={t('statBranches')}
              value={data.branches}
              icon={MapPin}
              tint="bg-slate-100 text-slate-700 border border-slate-200"
            />
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 w-full min-w-0">
            <Link
              to="/admin/pesilat"
              className="flex items-center justify-between gap-1.5 sm:gap-2 rounded-xl border border-slate-200/90 bg-white px-3 sm:px-3.5 py-2.5 text-slate-900 transition hover:bg-slate-50 hover:border-slate-300 shadow-2xs active:scale-[0.98] min-w-0 overflow-hidden"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 truncate">
                <Plus size={16} className="text-red-700 shrink-0" />
                <span className="text-xs font-bold truncate">{t('btnManageStudents')}</span>
              </div>
              <ArrowUpRight size={14} className="opacity-50 text-slate-400 shrink-0" />
            </Link>

            <Link
              to="/admin/templates"
              className="flex items-center justify-between gap-1.5 sm:gap-2 rounded-xl border border-slate-200/90 bg-white px-3 sm:px-3.5 py-2.5 text-slate-900 transition hover:bg-slate-50 hover:border-slate-300 shadow-2xs active:scale-[0.98] min-w-0 overflow-hidden"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 truncate">
                <Layers size={16} className="text-red-700 shrink-0" />
                <span className="text-xs font-bold truncate">{t('btnTemplates')}</span>
              </div>
              <ArrowUpRight size={14} className="opacity-50 text-slate-400 shrink-0" />
            </Link>

            <Link
              to="/admin/jana-sijil"
              className="flex items-center justify-between gap-1.5 sm:gap-2 rounded-xl border border-slate-200/90 bg-white px-3 sm:px-3.5 py-2.5 text-slate-900 transition hover:bg-slate-50 hover:border-slate-300 shadow-2xs active:scale-[0.98] min-w-0 overflow-hidden"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 truncate">
                <Sparkles size={16} className="text-red-700 shrink-0" />
                <span className="text-xs font-bold truncate">{t('btnBatchGenerate')}</span>
              </div>
              <ArrowUpRight size={14} className="opacity-50 text-slate-400 shrink-0" />
            </Link>

            <Link
              to="/admin/sijil"
              className="flex items-center justify-between gap-1.5 sm:gap-2 rounded-xl border border-slate-200/90 bg-white px-3 sm:px-3.5 py-2.5 text-slate-900 transition hover:bg-slate-50 hover:border-slate-300 shadow-2xs active:scale-[0.98] min-w-0 overflow-hidden"
            >
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 truncate">
                <Award size={16} className="text-red-700 shrink-0" />
                <span className="text-xs font-bold truncate">{t('btnCertList')}</span>
              </div>
              <ArrowUpRight size={14} className="opacity-50 text-slate-400 shrink-0" />
            </Link>
          </div>

          {/* 2-Column Split: Analytics (Left) & Recent Certificates (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 w-full max-w-full min-w-0">
            {/* Left Column: Breakdowns */}
            <Panel className="p-3.5 sm:p-4 lg:col-span-7 min-w-0 w-full max-w-full overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0 w-full">
                <BreakdownCard title={t('analyticsRank')} rows={data.byLevel} />
                <BreakdownCard title={t('analyticsBranch')} rows={data.byBranch} />
              </div>
            </Panel>

            {/* Right Column: Sijil Terkini */}
            <Panel className="lg:col-span-5 flex flex-col min-w-0 w-full max-w-full overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 p-3 sm:px-4 min-w-0">
                <div className="min-w-0 truncate">
                  <h3 className="text-xs font-extrabold text-slate-950 uppercase tracking-wider truncate">{t('recentCerts')}</h3>
                </div>
                <Link
                  to="/admin/sijil"
                  className="flex items-center gap-0.5 text-xs font-bold text-red-700 hover:underline shrink-0"
                >
                  {t('viewAll')} <ChevronRight size={14} />
                </Link>
              </div>

              {data.recent.length ? (
                <div className="divide-y divide-slate-100 max-h-[290px] overflow-y-auto w-full min-w-0">
                  {data.recent.map((r) => {
                    const cat = getCertCategory(r);
                    const catMeta = getCategoryMeta(cat);
                    return (
                      <div key={r.id} className="flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 hover:bg-slate-50 transition min-w-0 w-full">
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-red-50 text-red-700 shrink-0 border border-red-100 text-sm">
                          {catMeta.emoji || <Award size={15} />}
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          {/* Student Name: preserved without change */}
                          <div className="truncate text-xs font-bold text-slate-900" title={r.nama_penuh}>{r.nama_penuh}</div>
                          <div className="truncate text-[10px] text-slate-400" title={`${r.nama_sijil} • ${r.cawangan}`}>
                            {r.nama_sijil} • {r.cawangan}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 shrink-0 font-medium">
                          <CalendarDays size={11} className="shrink-0" />
                          <span>{fmtDate(r.tarikh_isu)}</span>
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
