import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Award,
  MapPin,
  ArrowUpRight,
  Plus,
  CalendarDays,
  ChevronRight,
  Layers,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, fmtDate } from '../lib/api';
import { PageIntro, Panel, Loading, Empty, Chip } from '../components/UI';
import { useLang } from '../lib/i18n';
import { useSync } from '../lib/syncContext';
import { getCertCategory, getCategoryMeta } from '../lib/certTypes';

function NumberCard({ title, value, icon: Icon, tint, badge }) {
  const { lang } = useLang();
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <div className="mt-1.5 text-3xl font-bold tracking-tight text-slate-900">
            {value.toLocaleString(lang === 'eng' ? 'en-US' : 'ms-MY')}
          </div>
          {badge && (
            <div className="mt-2 text-xs font-medium text-slate-400">
              {badge}
            </div>
          )}
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-lg ${tint}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function BreakdownCard({ title, rows, icon: Icon }) {
  const max = Math.max(...rows.map((x) => x.total), 1);
  return (
    <div className="rounded-xl bg-white p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3 min-w-0 w-full overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider truncate flex items-center gap-2">
          {Icon && <Icon size={14} className="text-slate-500 shrink-0" />}
          <span>{title}</span>
        </h4>
        <span className="text-[11px] font-semibold text-slate-400 font-mono">
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
                  <span className="font-medium text-slate-700 text-xs truncate min-w-0 flex-1 block" title={labelText}>
                    {labelText}
                  </span>
                  <span className="font-semibold text-slate-900 font-mono text-xs shrink-0 tabular-nums">
                    {r.total}
                  </span>
                </div>
                <div className="h-1.5 w-full min-w-0 overflow-hidden rounded-full bg-slate-100">
                  <div
                    style={{ width: `${Math.min(100, (r.total / max) * 100)}%` }}
                    className="h-full rounded-full bg-red-700 transition-all duration-300"
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 font-normal">
          Tiada data
        </div>
      )}
    </div>
  );
}

export function Dashboard() {
  const { t, lang } = useLang();
  const [data, setData] = useState(null);
  const { setRefreshing: setGlobalRefreshing } = useSync();
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback((isManual = false) => {
    setGlobalRefreshing(true);
    if (isManual) setRefreshing(true);
    return api('/admin/dashboard')
      .then((res) => {
        setData(res);
        if (isManual) toast.success(lang === 'eng' ? 'Dashboard refreshed!' : 'Statistik dashboard berjaya dikemaskini!');
      })
      .catch(() => {})
      .finally(() => {
        if (isManual) setRefreshing(false);
        setGlobalRefreshing(false);
      });
  }, [lang, setGlobalRefreshing]);

  useEffect(() => {
    fetchDashboard(false);
    const timer = setInterval(() => {
      fetchDashboard(false);
    }, 15000);
    return () => clearInterval(timer);
  }, [fetchDashboard]);

  return (
    <>
      <PageIntro
        eyebrow={t('overviewEyebrow')}
        title={t('overviewTitle')}
        desc={t('overviewDesc')}
        action={
          <button
            type="button"
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 shadow-2xs active:scale-95 cursor-pointer disabled:opacity-60"
            title="Muat semula ringkasan statistik (Auto-refresh setiap 15 saat)"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-red-600' : ''} />
            <span>{refreshing ? (lang === 'eng' ? 'Refreshing...' : 'Menyegerak...') : (lang === 'eng' ? 'Refresh' : 'Muat Semula')}</span>
          </button>
        }
      />

      {!data ? (
        <Loading />
      ) : (
        <div className="space-y-4 sm:space-y-5 w-full max-w-full min-w-0">
          {/* Top 3 Stat Cards (Stripe / Apple clean metrics) */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3 w-full min-w-0">
            <NumberCard
              title={t('statStudents')}
              value={data.pesilat}
              icon={GraduationCap}
              tint="bg-slate-100 text-slate-800"
              badge={lang === 'eng' ? 'Registered pesilat' : 'Pesilat berdaftar'}
            />
            <NumberCard
              title={t('statCerts')}
              value={data.sijil}
              icon={Award}
              tint="bg-red-50 text-red-700"
              badge={lang === 'eng' ? 'Verified certificates' : 'Sijil digital disahkan'}
            />
            <NumberCard
              title={t('statBranches')}
              value={data.branches}
              icon={MapPin}
              tint="bg-slate-100 text-slate-800"
              badge={lang === 'eng' ? 'Active branches' : 'Cawangan aktif'}
            />
          </div>

          {/* Quick Action Navigation (Enterprise Navigation Tiles) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 w-full min-w-0">
            <Link
              to="/admin/pesilat"
              className="group flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 p-3 sm:p-3.5 shadow-2xs transition-colors cursor-pointer min-w-0 overflow-hidden"
            >
              <div className="flex items-center gap-2.5 min-w-0 truncate">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors shrink-0">
                  <Plus size={16} />
                </div>
                <span className="text-xs font-semibold text-slate-900 truncate">{t('btnManageStudents')}</span>
              </div>
              <ArrowUpRight size={14} className="text-slate-400 group-hover:text-slate-900 transition-colors shrink-0" />
            </Link>

            <Link
              to="/admin/templates"
              className="group flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 p-3 sm:p-3.5 shadow-2xs transition-colors cursor-pointer min-w-0 overflow-hidden"
            >
              <div className="flex items-center gap-2.5 min-w-0 truncate">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors shrink-0">
                  <Layers size={16} />
                </div>
                <span className="text-xs font-semibold text-slate-900 truncate">{t('btnTemplates')}</span>
              </div>
              <ArrowUpRight size={14} className="text-slate-400 group-hover:text-slate-900 transition-colors shrink-0" />
            </Link>

            <Link
              to="/admin/jana-sijil"
              className="group flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 p-3 sm:p-3.5 shadow-2xs transition-colors cursor-pointer min-w-0 overflow-hidden"
            >
              <div className="flex items-center gap-2.5 min-w-0 truncate">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors shrink-0">
                  <FileCheck size={16} />
                </div>
                <span className="text-xs font-semibold text-slate-900 truncate">{t('btnBatchGenerate')}</span>
              </div>
              <ArrowUpRight size={14} className="text-slate-400 group-hover:text-slate-900 transition-colors shrink-0" />
            </Link>

            <Link
              to="/admin/sijil"
              className="group flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 p-3 sm:p-3.5 shadow-2xs transition-colors cursor-pointer min-w-0 overflow-hidden"
            >
              <div className="flex items-center gap-2.5 min-w-0 truncate">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors shrink-0">
                  <Award size={16} />
                </div>
                <span className="text-xs font-semibold text-slate-900 truncate">{t('btnCertList')}</span>
              </div>
              <ArrowUpRight size={14} className="text-slate-400 group-hover:text-slate-900 transition-colors shrink-0" />
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
              <div className="flex items-center justify-between border-b border-slate-100 p-4 min-w-0">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider truncate">
                  {t('recentCerts')}
                </h3>
                <Link
                  to="/admin/sijil"
                  className="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors shrink-0"
                >
                  <span>{t('viewAll')}</span>
                  <ChevronRight size={14} />
                </Link>
              </div>

              {data.recent.length ? (
                <div className="divide-y divide-slate-100 max-h-[340px] overflow-y-auto w-full min-w-0">
                  {data.recent.map((r) => {
                    const cat = getCertCategory(r);
                    const catMeta = getCategoryMeta(cat);
                    return (
                      <div
                        key={r.id}
                        className="flex items-start gap-3 p-3.5 hover:bg-slate-50 transition-colors min-w-0 w-full"
                      >
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-50 text-slate-600 shrink-0 border border-slate-200 text-xs mt-0.5 font-bold">
                          {catMeta.emoji || <Award size={14} />}
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <div className="flex items-center justify-between gap-1.5 min-w-0">
                            <span className="truncate text-xs font-semibold text-slate-900 block" title={r.nama_penuh}>
                              {r.nama_penuh}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 shrink-0 font-mono">
                              <CalendarDays size={10} className="shrink-0 text-slate-400" />
                              <span>{fmtDate(r.tarikh_isu)}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate mt-0.5" title={`${r.nama_sijil} • ${r.cawangan}`}>
                            <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium border ${catMeta.badge}`}>
                              {catMeta.shortLabel}
                            </span>
                            <span className="truncate text-slate-500">{r.cawangan}</span>
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
