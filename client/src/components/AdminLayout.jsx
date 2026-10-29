import React, { useState, useEffect, useCallback } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  Award,
  FileUp,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
  Layers,
  FileCheck,
  Activity,
  RotateCw,
  Clock,
  Trash2,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { Logo } from './UI';
import { useLang, LanguageSwitcher, LiveClock } from '../lib/i18n';

const NAV_CONFIG = [
  { to: '/admin', icon: LayoutDashboard, key: 'dashboard', end: true },
  { to: '/admin/pesilat', icon: GraduationCap, key: 'studentsMenu' },
  { to: '/admin/templates', icon: Layers, key: 'templatesMenu' },
  { to: '/admin/jana-sijil', icon: FileCheck, key: 'generateMenu' },
  { to: '/admin/sijil', icon: Award, key: 'certsMenu' },
  { to: '/admin/import', icon: FileUp, key: 'importMenu' },
  { to: '/admin/tetapan', icon: Settings, key: 'settingsMenu' },
];

function getActivityMeta(type) {
  switch (type) {
    case 'certificate':
      return {
        icon: Award,
        badgeClass: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
        label: 'Sijil',
      };
    case 'student':
      return {
        icon: GraduationCap,
        badgeClass: 'bg-blue-50 text-blue-600 border border-blue-100',
        label: 'Pesilat',
      };
    case 'template':
      return {
        icon: Layers,
        badgeClass: 'bg-purple-50 text-purple-600 border border-purple-100',
        label: 'Templat',
      };
    case 'settings':
      return {
        icon: Settings,
        badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200',
        label: 'Tetapan',
      };
    default:
      return {
        icon: Activity,
        badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200',
        label: 'Sistem',
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

function ActivityLogModal({ open, onClose }) {
  const { t } = useLang();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === 'all'
        ? '/admin/recent-activity?limit=50'
        : `/admin/recent-activity?limit=50&type=${filter}`;
      const res = await api(url);
      setActivities(res.activities || []);
    } catch {
      toast.error('Gagal memuat log aktiviti.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (!open) return;
    loadActivities();
  }, [open, loadActivities]);

  async function handleClear() {
    try {
      await api('/admin/recent-activity', { method: 'DELETE' });
      toast.success('Log aktiviti berjaya dikosongkan.');
      setActivities([]);
      setConfirmClear(false);
    } catch {
      toast.error('Gagal membersihkan log aktiviti.');
    }
  }

  if (!open) return null;

  const filtered = activities.filter((act) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (act.title && act.title.toLowerCase().includes(q)) ||
      (act.detail && act.detail.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-white shadow-xs">
              <Activity size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {t('activityLogTitle')}
              </h3>
              <p className="text-[11px] text-slate-500">
                {t('activityLogDesc')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 space-y-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'certificate', label: 'Sijil' },
              { id: 'student', label: 'Pesilat' },
              { id: 'template', label: 'Templat' },
              { id: 'settings', label: 'Tetapan' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                  filter === tab.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari dalam log aktiviti..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
            />
          </div>
        </div>

        {/* Activities List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="space-y-2 py-4">
              <div className="h-12 bg-slate-100 animate-pulse rounded-xl" />
              <div className="h-12 bg-slate-100 animate-pulse rounded-xl" />
              <div className="h-12 bg-slate-100 animate-pulse rounded-xl" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Clock size={28} className="mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">Tiada rekod aktiviti dijumpai</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Semua tindakan pengurusan sistem direkod secara automatik di sini.</p>
            </div>
          ) : (
            filtered.map((act) => {
              const { icon: Icon, badgeClass, label: typeLabel } = getActivityMeta(act.type);
              return (
                <div
                  key={act.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:border-slate-200 transition-all hover:shadow-2xs"
                >
                  <div className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${badgeClass}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {act.title}
                        </span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 shrink-0 uppercase tracking-wide">
                          {typeLabel}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-slate-400 shrink-0">
                        {formatTimeAgo(act.created_at)}
                      </span>
                    </div>
                    {act.detail && (
                      <p className="text-[11px] text-slate-600 mt-1 font-normal leading-relaxed">
                        {act.detail}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-50">
                      <span>{act.created_at}</span>
                      {act.target_url && (
                        <Link
                          to={act.target_url}
                          onClick={onClose}
                          className="font-semibold text-red-700 hover:text-red-800 flex items-center gap-1"
                        >
                          Buka Halaman &rarr;
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          {confirmClear ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-red-700">Pasti padam semua log?</span>
              <button
                onClick={handleClear}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
              >
                Ya, Padam
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              disabled={activities.length === 0}
              className="text-[11px] font-semibold text-slate-400 hover:text-red-700 disabled:opacity-40 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={13} />
              {t('clearActivityLog')}
            </button>
          )}

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ close, logout, user }) {
  const { t } = useLang();
  const location = useLocation();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);

  const fetchActivities = useCallback(async (isManual = false) => {
    try {
      if (isManual) setLoading(true);
      const res = await api('/admin/recent-activity?limit=3');
      setActivities(res.activities || []);
    } catch {
      // Senyap jika ralat rangkaian latar belakang
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(() => {
      fetchActivities();
    }, 25000);
    return () => clearInterval(interval);
  }, [fetchActivities, location.pathname]);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white border-r border-slate-200">
      {/* Brand Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
        <Link to="/" onClick={close} className="flex items-center text-left min-w-0">
          <Logo small />
        </Link>
        {close && (
          <button
            onClick={close}
            aria-label={t('closeMenu')}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Menu Navigation */}
      <div className="flex-1 px-3 py-4 space-y-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 px-3 mb-2">
            {t('mainMenu')}
          </div>
          <nav className="space-y-0.5">
            {NAV_CONFIG.map(({ to, icon: Icon, key, end }) => {
              const label = t(key);
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={close}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs transition-colors duration-150 ${
                      isActive
                        ? 'bg-slate-900 text-white font-semibold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={16}
                        className={`shrink-0 ${
                          isActive ? 'text-white' : 'text-slate-400'
                        }`}
                      />
                      <span className="flex-1 truncate">{label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="pt-3 border-t border-slate-100">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={close}
            className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <ExternalLink size={15} className="shrink-0 text-slate-400" />
              <span className="truncate">{t('viewPublicPortal')}</span>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Portal
            </span>
          </a>
        </div>

        {/* Aktiviti Terkini (Recent Activity) */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between px-2 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                {t('recentActivity')}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fetchActivities(true)}
                disabled={loading}
                title="Muat semula aktiviti"
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <RotateCw size={11} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                type="button"
                onClick={() => setShowLogModal(true)}
                title="Buka log aktiviti penuh"
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Log
              </button>
            </div>
          </div>

          <div className="space-y-1">
            {loading && activities.length === 0 ? (
              <div className="space-y-1.5 px-2 py-1">
                <div className="h-8 bg-slate-100 animate-pulse rounded-lg" />
                <div className="h-8 bg-slate-100 animate-pulse rounded-lg" />
              </div>
            ) : activities.length === 0 ? (
              <div className="px-2 py-3 text-center rounded-lg bg-slate-50 border border-dashed border-slate-200">
                <Clock size={15} className="mx-auto text-slate-300 mb-1" />
                <p className="text-[10px] text-slate-400 font-medium">
                  {t('noRecentActivity')}
                </p>
              </div>
            ) : (
              <>
                {activities.slice(0, 3).map((act) => {
                  const { icon: Icon, badgeClass } = getActivityMeta(act.type);
                  return (
                    <Link
                      key={act.id}
                      to={act.target_url || '/admin'}
                      onClick={close}
                      className="group flex items-start gap-2 rounded-lg p-2 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
                    >
                      <div className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md ${badgeClass}`}>
                        <Icon size={12} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate text-[11px] font-semibold text-slate-800 group-hover:text-red-700 transition-colors">
                            {act.title}
                          </span>
                          <span className="shrink-0 text-[9px] font-medium text-slate-400">
                            {formatTimeAgo(act.created_at)}
                          </span>
                        </div>
                        {act.detail && (
                          <p className="truncate text-[10px] text-slate-500 font-normal leading-tight mt-0.5">
                            {act.detail}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setShowLogModal(true)}
                  className="w-full text-center py-1.5 text-[10px] font-semibold text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
                >
                  {t('viewAllActivities')} &rarr;
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* User profile at bottom */}
      <div className="p-3 mt-auto border-t border-slate-100 bg-slate-50/50">
        <div className="rounded-lg border border-slate-200/80 bg-white p-2.5 shadow-2xs flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-xs font-bold text-white shrink-0">
            {(user?.username || 'A')[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-slate-900">{user?.username || 'Admin'}</div>
            <div className="text-[10px] font-medium text-slate-500">{t('adminRole')}</div>
          </div>
          <button
            onClick={logout}
            aria-label={t('logout')}
            title={t('logout')}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-700 transition-colors cursor-pointer"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {showLogModal && (
        <ActivityLogModal open={showLogModal} onClose={() => setShowLogModal(false)} />
      )}
    </div>
  );
}

export function AdminLayout({ user, onLogout }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      onLogout();
      toast.success(t('logoutSuccess'));
      nav('/admin/login');
    }
  }

  const currentItem = NAV_CONFIG.find((i) => i.to === loc.pathname);
  const name = currentItem ? t(currentItem.key) : t('adminTitle');

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 antialiased">
      {/* Desktop Sidebar (Clean, architectural line) */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[240px] bg-white lg:block">
        <Sidebar user={user} logout={logout} />
      </aside>

      {/* Mobile Drawer Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[90] bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={() => setOpen(false)}
        >
          <aside
            className="h-full w-[250px] bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar user={user} close={() => setOpen(false)} logout={logout} />
          </aside>
        </div>
      )}

      {/* Main Workspace */}
      <div className="lg:pl-[240px] w-full max-w-full min-w-0 overflow-x-hidden">
        {/* Apple / Google Minimalist Clean Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
            <button
              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 lg:hidden hover:bg-slate-50 transition-colors shrink-0 cursor-pointer"
              onClick={() => setOpen(true)}
              aria-label={t('openMenu')}
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-bold text-slate-900 leading-tight truncate">
                {name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Real-time Live Clock */}
            <div className="hidden md:flex">
              <LiveClock showDate={true} />
            </div>

            {/* Language Switcher [ BM | ENG ] */}
            <LanguageSwitcher />

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            {/* Active System Indicator */}
            <div className="hidden items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md xl:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              <span className="text-[11px]">{t('systemActive')}</span>
            </div>

            {/* User Avatar */}
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-slate-900 text-xs font-bold text-white shrink-0">
              {(user?.username || 'A')[0].toUpperCase()}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1380px] p-4 sm:p-6 lg:p-7 pb-16 min-w-0 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
