import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { Logo, Button, Input } from '../components/UI';
import { useLang, LanguageSwitcher, LiveClock } from '../lib/i18n';

export function Login({ onLogin }) {
  const { t, lang } = useLang();
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api('/auth/login', { method: 'POST', body: { username, password } });
      onLogin(r.user);
      toast.success(lang === 'eng' ? 'Login successful. Welcome back!' : 'Log masuk berjaya. Selamat kembali!');
      nav('/admin');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-[#FBFBFD] overflow-hidden selection:bg-red-500 selection:text-white">
      {/* Ambient Visual Background Elements - Makes the page feel rich, aesthetic & not empty */}
      <div className="dot-grid absolute inset-0 opacity-20 pointer-events-none" />
      
      {/* Soft blurred ambient glow orbs with theme red */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-red-600/10 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-[520px] w-[520px] rounded-full bg-rose-500/10 blur-[130px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[650px] w-[650px] rounded-full bg-red-500/5 blur-[120px]" />

      {/* Decorative concentric rings - Apple keynote / aesthetic minimalist geometry */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[720px] w-[720px] rounded-full border border-red-500/10" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[960px] w-[960px] rounded-full border border-red-500/5" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[1200px] w-[1200px] rounded-full border border-red-500/3" />

      {/* KOTAK BESAR YANG TRANSPARENT (Large Frosted Glass Card) */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[500px] sm:max-w-[520px] rounded-3xl border border-white/80 bg-white/75 p-6 sm:p-9 md:p-10 backdrop-blur-2xl shadow-[0_25px_65px_-12px_rgba(185,28,28,0.12),0_0_0_1px_rgba(255,255,255,0.9)_inset,0_10px_25px_-5px_rgba(0,0,0,0.04)] transition-all"
      >
        {/* Top Action Row inside the card */}
        <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-200/60 pb-4">
          <Link
            to="/"
            className="group inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/60 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-red-200 hover:bg-red-50/80 hover:text-red-700 shadow-2xs backdrop-blur-sm"
          >
            <ArrowLeft size={13} className="text-slate-400 group-hover:text-red-700 transition" />
            <span>{t('authBackHome')}</span>
          </Link>

          <div className="flex items-center gap-2">
            <LiveClock compact={true} className="hidden sm:inline-flex" />
            <LanguageSwitcher />
          </div>
        </div>

        {/* Brand Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2.5">
          <Logo />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200/90 bg-red-50/80 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-red-700 shadow-2xs">
            <ShieldCheck size={12} className="text-red-700" />
            {t('authPortalEyebrow')}
          </span>
        </div>

        {/* Welcome Section */}
        <div className="mb-6">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-red-700">
            {t('authWelcomeEyebrow')}
          </div>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
            {t('authLoginTitle')}
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
            {t('authLoginDesc')}
          </p>
        </div>

        {/* Form Inputs */}
        <form className="space-y-4" onSubmit={submit}>
          <Input
            label={t('authUsernameLabel')}
            autoComplete="username"
            placeholder={lang === 'eng' ? 'Enter administrator username' : 'Masukkan nama pengguna pentadbir'}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <div className="relative">
            <Input
              label={t('authPasswordLabel')}
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder={lang === 'eng' ? 'Enter administrator password' : 'Masukkan kata laluan pentadbir'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute bottom-2.5 right-3.5 text-slate-400 hover:text-red-700 transition p-1"
              aria-label={lang === 'eng' ? 'Toggle password visibility' : 'Tunjuk atau sembunyi kata laluan'}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <Button
            type="submit"
            loading={busy}
            className="mt-2 w-full !py-3 text-xs sm:text-sm font-extrabold shadow-md hover:shadow-lg transition-all"
          >
            {t('authSignInBtn')} <ArrowRight size={15} />
          </Button>
        </form>

        {/* Security Notice Box */}
        <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50/70 p-3.5 text-xs leading-5 text-red-900 shadow-2xs">
          <Lock className="mt-0.5 shrink-0 text-red-700" size={15} />
          <span>
            {lang === 'eng'
              ? 'Restricted to authorized academy personnel only. Sessions automatically terminate after 8 hours.'
              : 'Khas untuk kakitangan yang diberi kuasa sahaja. Sesi ditamatkan automatik selepas 8 jam.'}
          </span>
        </div>
      </motion.div>

      {/* Subtle Footer Subtitle underneath card */}
      <div className="relative z-10 mt-5 text-center text-xs font-semibold text-slate-500">
        {t('authSystemSubtitle')}
      </div>
    </div>
  );
}
