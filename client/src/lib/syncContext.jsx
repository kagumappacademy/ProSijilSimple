import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { useLang } from './i18n';
import { BrandLoader } from '../components/Loading';

const SyncContext = createContext({
  isRefreshing: false,
  setRefreshing: () => {},
});

export function SyncProvider({ children }) {
  const { lang } = useLang();
  const [activeCount, setActiveCount] = useState(0);
  const activeCountRef = useRef(0);
  const minTimerRef = useRef(null);
  const [visible, setVisible] = useState(false);

  const setRefreshing = useCallback((active) => {
    const next = active ? activeCountRef.current + 1 : Math.max(0, activeCountRef.current - 1);
    activeCountRef.current = next;
    setActiveCount(next);
    clearTimeout(minTimerRef.current);
    if (next > 0) setVisible(true);
    else minTimerRef.current = setTimeout(() => { if (activeCountRef.current === 0) setVisible(false); }, 600);
  }, []);
  useEffect(() => () => clearTimeout(minTimerRef.current), []);

  return (
    <SyncContext.Provider value={{ isRefreshing: activeCount > 0, setRefreshing }}>
      {children}
      <div role="status" aria-live="polite" aria-hidden={!visible} aria-busy={activeCount > 0} data-visible={visible} className="sync-indicator select-none">
        <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200/90 bg-white/95 px-3 py-2.5 shadow-lg shadow-slate-900/5 backdrop-blur-md">
          <BrandLoader size="xs" interactive={false} />
          <div className="flex flex-col text-left">
            <span className="text-[11px] font-bold text-slate-800 leading-tight">
              {lang === 'eng' ? 'Updating your workspace' : 'Mengemas kini paparan'}
            </span>
            <span className="text-[9px] font-semibold text-slate-400 leading-tight">
              {lang === 'eng' ? 'Loading the latest records' : 'Memuatkan rekod terkini'}
            </span>
          </div>
          <div className="sync-indicator__activity text-red-700" aria-hidden="true"><span /><span /><span /></div>
        </div>
      </div>
    </SyncContext.Provider>
  );
}

export function useSync() {
  return useContext(SyncContext);
}
