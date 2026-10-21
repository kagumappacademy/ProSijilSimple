import React, { useState } from 'react';
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
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Layers,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { Logo } from './UI';
import { useLang, LanguageSwitcher, LiveClock } from '../lib/i18n';

const NAV_CONFIG = [
  { to: '/admin', icon: LayoutDashboard, key: 'dashboard', end: true },
  { to: '/admin/pesilat', icon: GraduationCap, key: 'studentsMenu' },
  { to: '/admin/templates', icon: Layers, key: 'templatesMenu' },
  { to: '/admin/jana-sijil', icon: Sparkles, key: 'generateMenu' },
  { to: '/admin/sijil', icon: Award, key: 'certsMenu' },
  { to: '/admin/import', icon: FileUp, key: 'importMenu' },
  { to: '/admin/tetapan', icon: Settings, key: 'settingsMenu' },
];

function Sidebar({ close, logout, user }) {
  const { t } = useLang();

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white">
      {/* Top red accent line */}
      <div className="h-1 w-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 shrink-0" />

      {/* Brand Header */}
      <div className="relative flex items-center justify-center border-b border-slate-100 px-4 py-3.5 bg-[#FCFDFB]">
        <Link to="/" onClick={close} className="flex items-center justify-center mx-auto text-center">
          <Logo small center />
        </Link>
        {close && (
          <button
            onClick={close}
            aria-label={t('closeMenu')}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700 lg:hidden transition"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Menu Navigation */}
      <div className="flex-1 px-3 py-3.5">
        <div className="flex items-center gap-2 px-3 mb-2">
          <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
          <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-red-700">
            {t('mainMenu')}
          </span>
        </div>
        <nav className="space-y-1">
          {NAV_CONFIG.map(({ to, icon: Icon, key, end }) => {
            const label = t(key);
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={close}
                className={({ isActive }) =>
                  `group flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-red-700 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:bg-red-50 hover:text-red-700'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={16}
                      className={`shrink-0 transition-colors ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-red-700'
                      }`}
                    />
                    <span className="flex-1 truncate">{label}</span>
                    <ChevronRight
                      size={13}
                      className={`shrink-0 transition-all ${
                        isActive
                          ? 'text-white/80 opacity-100'
                          : 'opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 text-red-600'
                      }`}
                    />
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="my-3.5 h-px bg-slate-100" />

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          onClick={close}
          className="group flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-700 transition border border-transparent hover:border-red-100"
        >
          <ExternalLink size={16} className="shrink-0 text-slate-400 group-hover:text-red-700 transition" />
          <span className="truncate">{t('viewPublicPortal')}</span>
        </a>
      </div>

      {/* User profile at bottom */}
      <div className="p-3 mt-auto border-t border-slate-100 bg-[#FCFDFB]">
        <div className="rounded-xl border border-red-100 bg-red-50/60 p-2.5 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-red-700 text-xs font-extrabold text-white shadow-xs shrink-0">
              {(user?.username || 'A')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-slate-900">{user?.username || 'Admin'}</div>
              <div className="text-[10px] font-semibold text-red-700">{t('adminRole')}</div>
            </div>
            <button
              onClick={logout}
              aria-label={t('logout')}
              title={t('logout')}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-100 hover:text-red-700 transition"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
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
    <div className="min-h-screen bg-[#FBFBFD]">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[230px] bg-white lg:block shadow-sm border-r border-slate-200/80">
        <Sidebar user={user} logout={logout} />
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-[90] bg-slate-950/50 backdrop-blur-xs lg:hidden"
          onClick={() => setOpen(false)}
        >
          <aside className="h-full w-[260px] bg-white shadow-2xl border-r border-slate-200" onClick={(e) => e.stopPropagation()}>
            <Sidebar user={user} close={() => setOpen(false)} logout={logout} />
          </aside>
        </div>
      )}

      <div className="lg:pl-[230px]">
        {/* Sticky Header with Clock, Language Switcher, Title, and Profile */}
        <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-slate-200/70 bg-white/85 px-4 sm:px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              className="rounded-xl border border-slate-200 p-2 text-slate-700 lg:hidden hover:bg-slate-50 transition"
              onClick={() => setOpen(true)}
              aria-label={t('openMenu')}
            >
              <Menu size={18} />
            </button>
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {t('brandName')} / {t('adminTitle')}
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-slate-950 leading-tight">{name}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Real-time Live Clock & Date */}
            <LiveClock showDate={true} />

            {/* Language Switcher [ BM | ENG ] */}
            <LanguageSwitcher />

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            <div className="hidden items-center gap-1.5 text-xs font-semibold text-slate-500 xl:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t('systemActive')}</span>
            </div>

            <div className="grid h-8 w-8 place-items-center rounded-xl bg-red-50 text-xs font-extrabold text-red-700 border border-red-100">
              {(user?.username || 'A')[0].toUpperCase()}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] p-3 sm:p-5 lg:p-6 pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
