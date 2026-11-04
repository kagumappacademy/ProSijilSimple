import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

export function BrandLoader({ size = 'md', interactive = true }) {
  const [imageFailed, setImageFailed] = useState(false);
  function tilt(event) {
    if (!interactive || event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--loader-tilt-x', `${((event.clientY - bounds.top) / bounds.height - 0.5) * -18}deg`);
    event.currentTarget.style.setProperty('--loader-tilt-y', `${((event.clientX - bounds.left) / bounds.width - 0.5) * 18}deg`);
  }
  function resetTilt(event) {
    event.currentTarget.style.setProperty('--loader-tilt-x', '0deg');
    event.currentTarget.style.setProperty('--loader-tilt-y', '0deg');
  }
  return <div className={`brand-loader brand-loader--${size}`} aria-hidden="true"
    onPointerMove={tilt} onPointerLeave={resetTilt} onPointerCancel={resetTilt}>
    <div className="brand-loader__halo" />
    <div className="brand-loader__orbit" />
    <div className="brand-loader__arc" />
    <div className="brand-loader__arc brand-loader__arc--inner" />
    <div className="brand-loader__tilt">
      <div className="brand-loader__coin">
        {['front', 'back'].map(face => <div key={face} className={`brand-loader__face brand-loader__face--${face}`}>
          {imageFailed ? <span className="brand-loader__fallback">P</span> : <img src="/logo-prosijil.png" alt="" draggable="false" onError={() => setImageFailed(true)} />}
        </div>)}
      </div>
    </div>
    <div className="brand-loader__shadow" />
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

function LoadingRail({ complete = false }) {
  return <div className={`loading-rail bg-slate-100 ${complete ? 'loading-rail--complete' : ''}`} aria-hidden="true"><span /></div>;
}

export function Loading({ text = 'Sedang memuatkan data...', subtext, size = 'md', fullScreen = false, className = '' }) {
  const content = <div role="status" aria-live="polite" aria-atomic="true" aria-busy="true" className={`loading-content loading-content--${size} ${className}`}>
    <BrandLoader size={size} />
    <div className="loading-content__copy">
      <p className="loading-content__title text-slate-900">{text}</p>
      {subtext && <p className="loading-content__subtitle text-slate-500">{subtext}</p>}
    </div>
    <div className="loading-dots text-red-700" aria-hidden="true"><span /><span /><span /></div>
    <LoadingRail />
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
      <LoadingRail complete={success} />
    </div>
  </LoadingOverlay>;
}
