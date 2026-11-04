import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { Toaster } from 'sonner';
import { useLang } from './i18n';

const AdminAppearanceContext = createContext({ theme: 'light', toggleTheme: () => {} });

export function AdminAppearanceProvider({ user, children }) {
  const { pathname } = useLocation();
  const active = Boolean(user) && (pathname === '/admin' || pathname.startsWith('/admin/')) && pathname !== '/admin/login';
  // Deliberately keep this in memory: every reload/new visit starts in light mode,
  // regardless of a device's preference or any previously selected theme.
  const [selectedTheme, setSelectedTheme] = useState('light');
  useEffect(() => { if (!active) setSelectedTheme('light'); }, [active]);
  const theme = active ? selectedTheme : 'light';
  const toggleTheme = useCallback(() => setSelectedTheme(previous => previous === 'light' ? 'dark' : 'light'), []);
  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);
  return <AdminAppearanceContext.Provider value={value}>
    <div data-admin-theme={active ? theme : undefined}>
      <Toaster theme={theme} position="top-right" richColors closeButton duration={4000} />
      {children}
    </div>
  </AdminAppearanceContext.Provider>;
}

export function AdminThemeSwitch() {
  const { theme, toggleTheme } = useContext(AdminAppearanceContext);
  const { lang } = useLang();
  const dark = theme === 'dark';
  const label = lang === 'eng' ? 'Dark mode' : 'Mod gelap';
  const action = lang === 'eng' ? `Switch to ${dark ? 'light' : 'dark'} mode` : `Tukar ke mod ${dark ? 'cerah' : 'gelap'}`;
  return <button type="button" role="switch" aria-checked={dark} aria-label={label}
    title={action} onClick={toggleTheme}
    className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2">
    {dark ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
    <span className="hidden sm:inline">{dark ? 'Dark' : 'Light'}</span>
  </button>;
}
