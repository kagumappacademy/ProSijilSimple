import React, { useEffect, useId, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

export function BrandLoader({ size = 'md' }) {
  const [imageFailed, setImageFailed] = useState(false);
  const gradientId='loader-ring-'+useId().replaceAll(':','');
  return <div className={`brand-loader brand-loader--${size}`} aria-hidden="true">
    <div className="brand-loader__ring">
      <svg viewBox="0 0 100 100" fill="none" focusable="false">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="var(--loader-ring-soft)"/>
            <stop offset="1" stopColor="var(--loader-ring-accent)"/>
          </linearGradient>
        </defs>
        <circle className="brand-loader__track" cx="50" cy="50" r="46"/>
        <circle className="brand-loader__arc" cx="50" cy="50" r="46" pathLength="100" stroke={`url(#${gradientId})`} strokeDasharray="28 72" strokeLinecap="round"/>
      </svg>
    </div>
    <div className="brand-loader__rotor">
      {['front', 'back'].map(face => <div key={face} className={`brand-loader__face brand-loader__face--${face}`}>
        {imageFailed ? <span className="brand-loader__fallback">P</span> : <img src="/logo-prosijil.png" alt="" draggable="false" onError={() => setImageFailed(true)} />}
      </div>)}
    </div>
  </div>;
}

function LoadingOverlay({ label, children }) {
  const overlayRef = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    overlayRef.current?.focus({ preventScroll: true });
    const containFocus = event => { if (event.key === 'Tab') event.preventDefault(); };
    document.addEventListener('keydown', containFocus);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', containFocus);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);
  return <div ref={overlayRef} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} className="loading-overlay">
    <div className="loading-card border border-slate-200 bg-white/95">{children}</div>
  </div>;
}

export function Loading({ text = 'Sedang memuatkan data...', subtext, size = 'md', fullScreen = false, className = '' }) {
  const content = <div role="status" aria-live="polite" aria-atomic="true" aria-busy="true" className={`loading-content loading-content--${size} ${className}`}>
    <BrandLoader size={size} />
    <div className="loading-content__copy">
      <p className="loading-content__title text-slate-900">{text}</p>
      {subtext && <p className="loading-content__subtitle text-slate-500">{subtext}</p>}
    </div>
  </div>;
  return fullScreen ? <LoadingOverlay label={text}>{content}</LoadingOverlay> : content;
}

export function LoadingProsijil(props) {
  return <Loading {...props} fullScreen />;
}

export function ProcessingModal({ open = false, title = 'Sedang Memproses Data...', subtitle = 'Sila tunggu sebentar sementara sistem memproses data anda.' }) {
  return open ? <Loading fullScreen size="lg" text={title} subtext={subtitle} /> : null;
}

export function AuthFeedback({ success, title, subtitle, badge }) {
  return <LoadingOverlay label={title}>
    <div role="status" aria-live="polite" aria-atomic="true" aria-busy={!success} className={`loading-content auth-feedback ${success ? 'auth-feedback--success' : ''}`}>
      <div className="auth-feedback__art" aria-hidden="true">
        {success ? <div className="auth-feedback__success text-emerald-700 bg-emerald-50 border border-emerald-200"><ShieldCheck size={52} strokeWidth={1.6} /></div> : <BrandLoader size="lg" />}
      </div>
      <span className={`auth-feedback__badge ${success ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{badge}</span>
      <div className="loading-content__copy">
        <h2 className="loading-content__title text-slate-900">{title}</h2>
        <p className="loading-content__subtitle text-slate-500">{subtitle}</p>
      </div>
    </div>
  </LoadingOverlay>;
}
