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
  ExternalLink,
  Layers,
  FileCheck,
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

function Sidebar({ close, logout, user }) {
  const { t } = useLang();

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
      <div className="flex-1 px-3 py-4 space-y-5">
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
