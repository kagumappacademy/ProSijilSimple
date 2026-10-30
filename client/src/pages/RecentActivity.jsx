import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Award,
  GraduationCap,
  Layers,
  Settings,
  RotateCw,
  Trash2,
  Search,
  Clock,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { PageIntro, Panel, Button, SearchField, Modal, Loading, Empty } from '../components/UI';
import { useLang } from '../lib/i18n';
import { useSync } from '../lib/syncContext';

function getActivityMeta(type) {
  switch (type) {
    case 'certificate':
      return {
        icon: Award,
        label: 'Sijil & Janaan',
        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        dotColor: 'bg-emerald-500',
        accentColor: 'text-emerald-700',
      };
    case 'student':
      return {
        icon: GraduationCap,
        label: 'Pesilat',
        badgeBg: 'bg-blue-50 text-blue-700 border-blue-200/80',
        dotColor: 'bg-blue-500',
        accentColor: 'text-blue-700',
      };
    case 'template':
      return {
        icon: Layers,
        label: 'Templat Sijil',
        badgeBg: 'bg-purple-50 text-purple-700 border-purple-200/80',
        dotColor: 'bg-purple-500',
        accentColor: 'text-purple-700',
      };
    case 'settings':
      return {
        icon: Settings,
        label: 'Tetapan Sistem',
        badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
        dotColor: 'bg-slate-500',
        accentColor: 'text-slate-700',
      };
    default:
      return {
        icon: Activity,
        label: 'Sistem',
        badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
        dotColor: 'bg-slate-500',
        accentColor: 'text-slate-700',
      };
  }
}

function formatTimeAgo(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString.includes('T') ? dateString : dateString.replace(' ', 'T') + 'Z');
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (isNaN(diffSec) || diffSec < 45) return 'Baru tadi';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m lalu`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}j lalu`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay === 1) return 'Semalam';
    if (diffDay < 7) return `${diffDay}h lalu`;
    return date.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

function formatFullDateTime(dateString) {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString.includes('T') ? dateString : dateString.replace(' ', 'T') + 'Z');
    return d.toLocaleString('ms-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateString;
  }
}

function renderDiff(before, after) {
  if (before === undefined || before === null || after === undefined || after === null) return null;
  const diff = Number(after) - Number(before);
  if (diff > 0) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
        +{diff}
      </span>
    );
  }
  if (diff < 0) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 shrink-0">
        {diff}
      </span>
    );
  }
  return (
    <span className="text-[10px] text-slate-400 font-medium px-0.5 shrink-0">
      (=)
    </span>
  );
}

export function RecentActivity() {
  const { t, lang } = useLang();
  const { setRefreshing } = useSync();

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshingLocal] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchActivities = useCallback(async (isManual = false) => {
    if (isManual) setRefreshingLocal(true);
    setRefreshing(true);
    try {
      const url = isManual ? '/admin/recent-activity?limit=150&force_sync=1' : '/admin/recent-activity?limit=150';
      const res = await api(url);
      setActivities(res.activities || []);
      if (isManual) {
        toast.success(lang === 'eng' ? 'Activity log refreshed!' : 'Log aktiviti berjaya dikemaskini!');
      }
    } catch (err) {
      toast.error('Gagal memuat aktiviti: ' + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      if (isManual) setRefreshingLocal(false);
    }
  }, [lang, setRefreshing]);

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(() => {
      fetchActivities();
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchActivities]);

  async function handleClearAll() {
    setClearing(true);
    try {
      await api('/admin/recent-activity', { method: 'DELETE' });
      toast.success(lang === 'eng' ? 'Activity logs cleared.' : 'Log aktiviti berjaya dikosongkan.');
      setActivities([]);
      setConfirmClearOpen(false);
    } catch (err) {
      toast.error(err.message || 'Gagal membersihkan log aktiviti.');
    } finally {
      setClearing(false);
    }
  }

  // Activity counts by category
  const stats = useMemo(() => {
    const certs = activities.filter((a) => a.type === 'certificate').length;
    const students = activities.filter((a) => a.type === 'student').length;
    const templates = activities.filter((a) => a.type === 'template').length;
    const settings = activities.filter((a) => a.type === 'settings').length;
    return { total: activities.length, certs, students, templates, settings };
  }, [activities]);

  // Filtered activities
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (filterType !== 'all' && act.type !== filterType) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (act.title || '').toLowerCase().includes(q);
        const matchDetail = (act.detail || '').toLowerCase().includes(q);
        const matchDate = (act.created_at || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDetail && !matchDate) {
          return false;
        }
      }
      return true;
    });
  }, [activities, filterType, searchQuery]);

  return (
    <>
      <PageIntro
        eyebrow={t('activityEyebrow') || 'LOG & AUDIT SISTEM'}
        title={t('activityTitle') || 'Aktiviti Terkini & Audit Sistem'}
        desc={t('activityDesc') || 'Pemantauan masa nyata bagi semua tindakan pengurusan sijil, pendaftaran pesilat, templat, dan tetapan.'}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white shadow-2xs text-xs font-semibold text-slate-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>{lang === 'eng' ? 'Live Monitoring Active' : 'Pemantauan Masa Nyata'}</span>
            </div>

            <Button
              variant="secondary"
              onClick={() => fetchActivities(true)}
              loading={refreshing}
              className="flex items-center gap-1.5 text-xs font-semibold py-2 px-3"
            >
              <RotateCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span>{lang === 'eng' ? 'Refresh' : 'Muat Semula'}</span>
            </Button>

            <Button
              variant="secondary"
              onClick={() => setConfirmClearOpen(true)}
              disabled={activities.length === 0}
              className="flex items-center gap-1.5 text-xs font-semibold py-2 px-3 text-slate-600 hover:text-red-700 hover:border-red-200"
            >
              <Trash2 size={14} />
              <span>{t('clearActivityLog') || 'Kosongkan Log'}</span>
            </Button>
          </div>
        }
      />

      {/* Metric Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <Panel className="p-4 sm:p-5 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('statTotalActivities') || 'Jumlah Aktiviti'}
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">
              {stats.total}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Semua tindakan direkod</div>
          </div>
          <div className="grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-xl bg-slate-100 text-slate-800 border border-slate-200/80">
            <Activity size={22} />
          </div>
        </Panel>

        <Panel className="p-4 sm:p-5 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              {t('statCertActivities') || 'Sijil & Janaan'}
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-0.5">
              {stats.certs}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Janaan pukal & terbit</div>
          </div>
          <div className="grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
            <Award size={22} />
          </div>
        </Panel>

        <Panel className="p-4 sm:p-5 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
              {t('statStudentActivities') || 'Pendaftaran Pesilat'}
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-700 mt-0.5">
              {stats.students}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Daftar & import CSV</div>
          </div>
          <div className="grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
            <GraduationCap size={22} />
          </div>
        </Panel>

        <Panel className="p-4 sm:p-5 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
              {t('statTemplateActivities') || 'Templat Sijil'}
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-purple-700 mt-0.5">
              {stats.templates}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Muat naik & posisi</div>
          </div>
          <div className="grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-xl bg-purple-50 text-purple-700 border border-purple-100">
            <Layers size={22} />
          </div>
        </Panel>
      </div>

      {/* Main Container */}
      <Panel className="overflow-hidden">
        {/* Filters and Search Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
            {[
              { id: 'all', label: t('allActivities') || 'Semua', count: stats.total },
              { id: 'certificate', label: 'Sijil', count: stats.certs },
              { id: 'student', label: 'Pesilat', count: stats.students },
              { id: 'template', label: 'Templat', count: stats.templates },
              { id: 'settings', label: 'Tetapan', count: stats.settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  filterType === tab.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    filterType === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Field */}
          <div className="w-full md:w-80">
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t('searchActivityPlaceholder') || 'Cari aktiviti, nama pesilat...'}
            />
          </div>
        </div>

        {/* Activity Timeline List */}
        <div className="p-4 sm:p-6">
          {loading && activities.length === 0 ? (
            <div className="space-y-3 py-4">
              <div className="h-16 bg-slate-100 animate-pulse rounded-xl" />
              <div className="h-16 bg-slate-100 animate-pulse rounded-xl" />
              <div className="h-16 bg-slate-100 animate-pulse rounded-xl" />
              <div className="h-16 bg-slate-100 animate-pulse rounded-xl" />
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Clock size={36} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-bold text-slate-700">
                {t('noRecentActivity') || 'Tiada rekod aktiviti dijumpai'}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? 'Tiada aktiviti padan dengan kata kunci carian anda. Sila cuba kata kunci lain.'
                  : 'Semua aktiviti janaan, pendaftaran, dan pengubahsuaian sistem akan direkod secara automatik di sini.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActivities.map((act) => {
                const { icon: Icon, label: catLabel, badgeBg, dotColor, accentColor } = getActivityMeta(act.type);
                return (
                  <div
                    key={act.id}
                    className="group relative flex flex-col gap-3 p-4 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs transition-all duration-150"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        {/* Icon Badge */}
                        <div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${badgeBg}`}>
                          <Icon size={18} />
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 group-hover:text-red-700 transition-colors">
                              {act.title}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border uppercase tracking-wider ${badgeBg}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                              {catLabel}
                            </span>
                          </div>

                          {act.detail && (
                            <p className="text-xs text-slate-600 mt-1 font-normal leading-relaxed">
                              {act.detail}
                            </p>
                          )}

                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2">
                            <span className="flex items-center gap-1">
                              <Clock size={12} className="text-slate-400" />
                              {formatFullDateTime(act.created_at)}
                            </span>
                            <span>•</span>
                            <span className="font-medium text-slate-500">
                              {formatTimeAgo(act.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      {act.target_url && (
                        <div className="self-end sm:self-center shrink-0 pt-1 sm:pt-0">
                          <Link
                            to={act.target_url}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all cursor-pointer shadow-2xs"
                          >
                            <span>{t('openTargetPage') || 'Buka Halaman'}</span>
                            <ArrowUpRight size={13} />
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Snapshot Kiraan Sebelum & Selepas */}
                    <div className="pt-2.5 mt-0.5 border-t border-slate-100 flex flex-wrap items-center gap-2 sm:gap-3">
                      {/* Pelajar */}
                      <div
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                          act.type === 'student'
                            ? 'bg-blue-50/90 border-blue-200 text-blue-950 font-medium'
                            : 'bg-slate-50/80 border-slate-200/70 text-slate-700'
                        }`}
                        title={`${t('studentsCountLabel') || 'Pelajar'}: ${t('beforeCountLabel') || 'Sebelum'} ${act.students_before ?? '-'} ➔ ${t('afterCountLabel') || 'Selepas'} ${act.students_after ?? '-'}`}
                      >
                        <div className="flex items-center gap-1.5 text-blue-700 font-semibold shrink-0">
                          <GraduationCap size={14} />
                          <span className="text-[11px]">{t('studentsCountLabel') || 'Pelajar'}:</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span className="text-slate-500 font-medium" title={t('beforeCountLabel') || 'Sebelum'}>
                            {act.students_before ?? '-'}
                          </span>
                          <span className="text-slate-300 font-sans">&rarr;</span>
                          <span className="font-bold text-slate-900" title={t('afterCountLabel') || 'Selepas'}>
                            {act.students_after ?? '-'}
                          </span>
                        </div>
                        {renderDiff(act.students_before, act.students_after)}
                      </div>

                      {/* Sijil */}
                      <div
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                          act.type === 'certificate'
                            ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950 font-medium'
                            : 'bg-slate-50/80 border-slate-200/70 text-slate-700'
                        }`}
                        title={`${t('certsCountLabel') || 'Sijil'}: ${t('beforeCountLabel') || 'Sebelum'} ${act.certs_before ?? '-'} ➔ ${t('afterCountLabel') || 'Selepas'} ${act.certs_after ?? '-'}`}
                      >
                        <div className="flex items-center gap-1.5 text-emerald-700 font-semibold shrink-0">
                          <Award size={14} />
                          <span className="text-[11px]">{t('certsCountLabel') || 'Sijil'}:</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span className="text-slate-500 font-medium" title={t('beforeCountLabel') || 'Sebelum'}>
                            {act.certs_before ?? '-'}
                          </span>
                          <span className="text-slate-300 font-sans">&rarr;</span>
                          <span className="font-bold text-slate-900" title={t('afterCountLabel') || 'Selepas'}>
                            {act.certs_after ?? '-'}
                          </span>
                        </div>
                        {renderDiff(act.certs_before, act.certs_after)}
                      </div>

                      {/* Templat */}
                      <div
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                          act.type === 'template'
                            ? 'bg-purple-50/90 border-purple-200 text-purple-950 font-medium'
                            : 'bg-slate-50/80 border-slate-200/70 text-slate-700'
                        }`}
                        title={`${t('templatesCountLabel') || 'Templat'}: ${t('beforeCountLabel') || 'Sebelum'} ${act.templates_before ?? '-'} ➔ ${t('afterCountLabel') || 'Selepas'} ${act.templates_after ?? '-'}`}
                      >
                        <div className="flex items-center gap-1.5 text-purple-700 font-semibold shrink-0">
                          <Layers size={14} />
                          <span className="text-[11px]">{t('templatesCountLabel') || 'Templat'}:</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span className="text-slate-500 font-medium" title={t('beforeCountLabel') || 'Sebelum'}>
                            {act.templates_before ?? '-'}
                          </span>
                          <span className="text-slate-300 font-sans">&rarr;</span>
                          <span className="font-bold text-slate-900" title={t('afterCountLabel') || 'Selepas'}>
                            {act.templates_after ?? '-'}
                          </span>
                        </div>
                        {renderDiff(act.templates_before, act.templates_after)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-4 sm:px-6 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs text-slate-500">
          <div>
            Menunjukkan <span className="font-bold text-slate-800">{filteredActivities.length}</span> daripada{' '}
            <span className="font-bold text-slate-800">{activities.length}</span> aktiviti direkodkan.
          </div>
          <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>{t('metricBeforeAfterNote') || 'Kiraan integriti data direkod sebelum & selepas setiap tindakan pentadbir.'}</span>
          </div>
        </div>
      </Panel>

      {/* Confirmation Modal to Clear Logs */}
      {confirmClearOpen && (
        <Modal
          open={confirmClearOpen}
          onClose={() => setConfirmClearOpen(false)}
          title={t('clearActivityLog') || 'Kosongkan Log Aktiviti'}
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {t('clearActivityLogConfirm') || 'Adakah anda pasti ingin memadamkan semua rekod aktiviti pentadbir terkini? Tindakan ini tidak boleh diundur.'}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => setConfirmClearOpen(false)}
                disabled={clearing}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                onClick={handleClearAll}
                loading={clearing}
                className="bg-red-700 hover:bg-red-800 text-white"
              >
                Ya, Kosongkan Semua
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
