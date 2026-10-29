import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { useLang } from './i18n';

const SyncContext = createContext({
  isRefreshing: false,
  setRefreshing: () => {},
});

export function SyncProvider({ children }) {
  const { lang } = useLang();
  const [activeCount, setActiveCount] = useState(0);
  const minTimerRef = useRef(null);
  const [visible, setVisible] = useState(false);

  const setRefreshing = useCallback((active) => {
    setActiveCount((prev) => {
      const next = active ? prev + 1 : Math.max(0, prev - 1);
      if (next > 0) {
        setVisible(true);
        if (minTimerRef.current) clearTimeout(minTimerRef.current);
      } else {
        // Kekalkan paparan sekurang-kurangnya 600ms supaya animasi licin dan tidak berkelip
        minTimerRef.current = setTimeout(() => {
          setVisible(false);
        }, 600);
      }
      return next;
    });
  }, []);

  return (
    <SyncContext.Provider value={{ isRefreshing: activeCount > 0, setRefreshing }}>
      {children}
      {/* Floating Bottom-Right Mini Loading Refresh Indicator */}
      <div
        className={`fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50 pointer-events-none select-none transition-all duration-300 ease-out ${
          visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-3 scale-95 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200/90 bg-white/95 px-3 py-2 shadow-lg shadow-slate-900/5 backdrop-blur-md">
          {/* Mini precision circular spinner with ProSijil emblem */}
          <div className="relative flex h-5 w-5 items-center justify-center shrink-0">
            <div
              className="absolute inset-0 rounded-full border-2 border-slate-200 border-t-red-700 animate-spin"
              style={{ animationDuration: '0.8s' }}
            />
            <div className="relative z-10 flex h-3 w-3 items-center justify-center rounded-full bg-white shadow-2xs">
              <img
                src="/logo-prosijil.png"
                alt="ProSijil"
                className="h-2 w-2 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>

          <div className="flex flex-col text-left">
            <span className="text-[11px] font-bold text-slate-800 leading-tight">
              {lang === 'eng' ? 'Refreshing data...' : 'Sedang memuat semula...'}
            </span>
            <span className="text-[9px] font-semibold text-slate-400 leading-tight">
              {lang === 'eng' ? 'Auto-refresh active' : 'Penyegerakan data 15s'}
            </span>
          </div>
        </div>
      </div>
    </SyncContext.Provider>
  );
}

export function useSync() {
  return useContext(SyncContext);
}
