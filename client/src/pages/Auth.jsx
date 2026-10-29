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
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-50 selection:bg-red-600 selection:text-white">
      {/* Centered minimalist login container */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-[440px] rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs"
      >
        {/* Top Action Row inside the card */}
        <div className="mb-6 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <Link
            to="/"
            className="group inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft size={13} className="text-slate-400 group-hover:text-slate-900 transition" />
            <span>{t('authBackHome')}</span>
          </Link>

          <div className="flex items-center gap-2">
            <LiveClock compact={true} className="hidden sm:inline-flex" />
            <LanguageSwitcher />
          </div>
        </div>

        {/* Brand Header */}
        <div className="mb-6 flex items-center justify-between gap-2.5">
          <Logo />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700">
            <ShieldCheck size={12} className="text-slate-500" />
            {t('authPortalEyebrow')}
          </span>
        </div>

        {/* Welcome Section */}
        <div className="mb-6">
          <div className="text-[10px] font-bold uppercase tracking-wider text-red-700">
            {t('authWelcomeEyebrow')}
          </div>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
            {t('authLoginTitle')}
          </h2>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
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
              className="absolute bottom-2.5 right-3.5 text-slate-400 hover:text-slate-700 transition p-1"
              aria-label={lang === 'eng' ? 'Toggle password visibility' : 'Tunjuk atau sembunyi kata laluan'}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <Button
            type="submit"
            loading={busy}
            className="mt-2 w-full !py-2.5 text-xs sm:text-sm font-bold shadow-xs hover:bg-red-800 transition"
          >
            {t('authSignInBtn')} <ArrowRight size={15} />
          </Button>
        </form>

        {/* Security Notice Box */}
        <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
          <Lock className="mt-0.5 shrink-0 text-slate-400" size={14} />
          <span>
            {lang === 'eng'
              ? 'Restricted to authorized academy personnel only. Sessions automatically terminate after 8 hours.'
              : 'Khas untuk kakitangan yang diberi kuasa sahaja. Sesi ditamatkan automatik selepas 8 jam.'}
          </span>
        </div>
      </motion.div>

      {/* Subtle Footer Subtitle underneath card */}
      <div className="mt-6 text-center text-xs text-slate-400 font-medium">
        {t('authSystemSubtitle')}
      </div>
    </div>
  );
}
