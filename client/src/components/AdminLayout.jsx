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
    <div className="flex h-full flex-col overflow-y-auto bg-white/95 backdrop-blur-xl">
      {/* Brand Header */}
      <div className="relative flex items-center justify-between border-b border-slate-100/90 px-4 py-4">
        <Link to="/" onClick={close} className="flex items-center mx-auto text-left group">
          <Logo small center />
        </Link>
        {close && (
          <button
            onClick={close}
            aria-label={t('closeMenu')}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden transition cursor-pointer"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Menu Navigation */}
      <div className="flex-1 px-3 py-4 space-y-4">
        <div>
          <div className="flex items-center gap-1.5 px-3 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
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
                    `group flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-[0_2px_10px_-2px_rgba(220,38,38,0.35)] font-bold'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-950 active:scale-[0.98]'
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
                            : 'opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 text-slate-400'
                        }`}
                      />
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={close}
            className="group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100/80 hover:text-slate-950 transition border border-transparent hover:border-slate-200/60"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <ExternalLink size={15} className="shrink-0 text-slate-400 group-hover:text-red-700 transition" />
              <span className="truncate">{t('viewPublicPortal')}</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-600">
              Web
            </span>
          </a>
        </div>
      </div>

      {/* User profile at bottom */}
      <div className="p-3 mt-auto border-t border-slate-100 bg-[#FCFDFB]">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-2.5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-tr from-red-600 to-rose-600 text-xs font-black text-white shadow-xs shrink-0">
              {(user?.username || 'A')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-slate-900">{user?.username || 'Admin'}</div>
              <div className="text-[10px] font-semibold text-red-700 tracking-tight">{t('adminRole')}</div>
            </div>
            <button
              onClick={logout}
              aria-label={t('logout')}
              title={t('logout')}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700 transition cursor-pointer"
            >
              <LogOut size={15} />
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
    <div className="min-h-screen bg-[#F8F9FB] antialiased">
      {/* Desktop Sidebar (Apple macOS style) */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[235px] bg-white lg:block shadow-[0_2px_12px_rgba(0,0,0,0.03)] border-r border-slate-200/70">
        <Sidebar user={user} logout={logout} />
      </aside>

      {/* Mobile Drawer Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[90] bg-slate-950/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setOpen(false)}
        >
          <aside
            className="h-full w-[265px] bg-white shadow-2xl border-r border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar user={user} close={() => setOpen(false)} logout={logout} />
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="lg:pl-[235px] w-full max-w-full min-w-0 overflow-x-hidden">
        {/* Apple-style Frosted Sticky Header */}
        <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between border-b border-slate-200/60 bg-white/75 px-3.5 sm:px-6 backdrop-blur-xl transition-all">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 mr-2">
            <button
              className="rounded-xl border border-slate-200/80 bg-white/80 p-2 text-slate-700 lg:hidden hover:bg-slate-100 transition shadow-2xs shrink-0 cursor-pointer"
              onClick={() => setOpen(true)}
              aria-label={t('openMenu')}
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="hidden sm:block text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                {t('brandName')} / {t('adminTitle')}
              </div>
              <h1 className="text-xs sm:text-sm font-black text-slate-950 leading-tight truncate tracking-tight">
                {name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Real-time Live Clock in subtle pill */}
            <div className="hidden md:flex">
              <LiveClock showDate={true} />
            </div>

            {/* Language Switcher [ BM | ENG ] */}
            <LanguageSwitcher />

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            {/* Active System Pulse */}
            <div className="hidden items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-full xl:flex shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold">{t('systemActive')}</span>
            </div>

            {/* User Avatar Circle */}
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-tr from-red-600 to-rose-600 text-xs font-black text-white shadow-xs shrink-0">
              {(user?.username || 'A')[0].toUpperCase()}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] p-3.5 sm:p-5 lg:p-6 pb-12 min-w-0 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
