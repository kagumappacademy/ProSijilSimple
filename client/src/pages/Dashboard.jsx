import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { GraduationCap, Award, MapPin, ArrowUpRight, Plus, TrendingUp, CalendarDays, ChevronRight, Layers, Sparkles } from 'lucide-react';
import { api, fmtDate } from '../lib/api';
import { PageIntro, Panel, Loading, Empty } from '../components/UI';
import { useLang } from '../lib/appContext';

function NumberCard({ title, value, icon: Icon, tint, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-4 shadow-apple dark:shadow-none"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
          <div className="mt-1 text-2xl sm:text-3xl font-extrabold leading-none tracking-tight text-slate-950 dark:text-white">
            {value.toLocaleString('ms-MY')}
          </div>
          <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400">
            <TrendingUp size={12} /> Rekod rasmi
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
      <h4 className="text-xs font-extrabold text-slate-950 dark:text-white uppercase tracking-wider">{title}</h4>
      {rows.length ? (
        <div className="space-y-2">
          {rows.slice(0, 5).map((r, i) => (
            <div key={i}>
              <div className="mb-1 flex justify-between gap-2 text-[11px]">
                <span className="max-w-[78%] truncate font-semibold text-slate-600 dark:text-slate-400" title={r.name}>
                  {r.name}
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white">{r.total}</span>
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
  const { lang } = useLang();

  useEffect(() => {
    api('/admin/dashboard')
      .then(setData)
      .catch(() => {});
  }, []);

  const date = new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'ms-MY', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <>
      <PageIntro
        eyebrow="PAPAN PEMUKA"
        title="Selamat kembali 👋"
        desc={`Ringkasan pengurusan sijil & pesilat • ${date}`}
      />

      {!data ? (
        <Loading />
      ) : (
        <div className="space-y-3.5 sm:space-y-4">
          {/* Top 3 Stat Cards */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
            <NumberCard
              index={0}
              title="Jumlah Pesilat"
              value={data.pesilat}
              icon={GraduationCap}
              tint="bg-red-50 text-red-700 border border-red-100"
            />
            <NumberCard
              index={1}
              title="Sijil Dikeluarkan"
              value={data.sijil}
              icon={Award}
              tint="bg-rose-50 text-rose-700 border border-rose-100"
            />
            <NumberCard
              index={2}
              title="Jumlah Cawangan"
              value={data.branches}
              icon={MapPin}
              tint="bg-slate-100 text-slate-700 border border-slate-200"
            />
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <Link
              to="/admin/pesilat"
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-slate-900 dark:text-slate-100 transition hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs active:scale-[0.98]"
            >
              <div className="flex items-center gap-2">
                <Plus size={16} className="text-red-700 dark:text-red-400" />
                <span className="text-xs font-bold">Urus Pesilat</span>
              </div>
              <ArrowUpRight size={14} className="opacity-50 text-slate-400 dark:text-slate-500" />
            </Link>

            <Link
              to="/admin/templates"
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-slate-900 dark:text-slate-100 transition hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs active:scale-[0.98]"
            >
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-red-700 dark:text-red-400" />
                <span className="text-xs font-bold">Templat Sijil</span>
              </div>
              <ArrowUpRight size={14} className="opacity-50 text-slate-400 dark:text-slate-500" />
            </Link>

            <Link
              to="/admin/jana-sijil"
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-slate-900 dark:text-slate-100 transition hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs active:scale-[0.98]"
            >
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-red-700 dark:text-red-400" />
                <span className="text-xs font-bold">Jana Sijil Pukal</span>
              </div>
              <ArrowUpRight size={14} className="opacity-50 text-slate-400 dark:text-slate-500" />
            </Link>

            <Link
              to="/admin/sijil"
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-slate-900 dark:text-slate-100 transition hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs active:scale-[0.98]"
            >
              <div className="flex items-center gap-2">
                <Award size={16} className="text-red-700 dark:text-red-400" />
                <span className="text-xs font-bold">Senarai Sijil</span>
              </div>
              <ArrowUpRight size={14} className="opacity-50 text-slate-400 dark:text-slate-500" />
            </Link>
          </div>

          {/* 2-Column Split: Analytics (Left) & Recent Certificates (Right) */}
          <div className="grid gap-3.5 lg:grid-cols-12">
            {/* Left Column: Breakdowns */}
            <Panel className="p-4 lg:col-span-7">
              <div className="grid gap-4 sm:grid-cols-2">
                <BreakdownCard title="Mengikut Peringkat" rows={data.byLevel} />
                <BreakdownCard title="Mengikut Cawangan" rows={data.byBranch} />
              </div>
            </Panel>

            {/* Right Column: Sijil Terkini */}
            <Panel className="lg:col-span-5 flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-3 sm:px-4">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-950 dark:text-white uppercase tracking-wider">Sijil Terkini</h3>
                </div>
                <Link
                  to="/admin/sijil"
                  className="flex items-center gap-0.5 text-xs font-bold text-red-700 dark:text-red-400 hover:underline"
                >
                  Semua <ChevronRight size={14} />
                </Link>
              </div>

              {data.recent.length ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[260px] overflow-y-auto">
                  {data.recent.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 shrink-0 border border-red-100 dark:border-red-900/50">
                        <Award size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold text-slate-900 dark:text-white student-name" data-no-translate="true" translate="no">{r.nama_penuh}</div>
                        <div className="truncate text-[10px] text-slate-400 dark:text-slate-500">
                          {r.nama_sijil} • {r.cawangan}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                        <CalendarDays size={11} />
                        <span>{fmtDate(r.tarikh_isu)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty title="Belum ada sijil" message="Keluarkan sijil pertama melalui menu Pengurusan Sijil." />
              )}
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
