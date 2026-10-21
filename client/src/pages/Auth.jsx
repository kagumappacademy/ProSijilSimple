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
    <div className="grid min-h-screen bg-canvas lg:grid-cols-2">
      <aside className="mesh-bg relative hidden flex-col justify-between overflow-hidden p-8 lg:p-10 xl:p-12 text-white lg:flex">
        <div className="dot-grid absolute inset-0 opacity-20" />
        <div className="pointer-events-none absolute -bottom-28 -right-28 h-[400px] w-[400px] rounded-full border-[50px] border-white/5" />
        <div className="relative flex items-center justify-between">
          <Link to="/">
            <Logo light />
          </Link>
          <div className="flex items-center gap-2">
            <LiveClock light showDate={true} />
            <LanguageSwitcher light />
          </div>
        </div>
        <div className="relative max-w-lg">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-white/10 px-3.5 py-1.5 text-xs font-semibold tracking-wider text-rose-200 backdrop-blur-sm">
            <ShieldCheck size={14} /> {t('authPortalEyebrow')}
          </div>
          <h1 className="text-3xl lg:text-4xl xl:text-5xl font-extrabold leading-tight tracking-tight">
            {t('authHeroTitle1')} <span className="text-rose-300">{t('authHeroTitle2')}</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-white/70">
            {t('authHeroDesc')}
          </p>
        </div>
        <div className="relative border-t border-white/15 pt-4 text-xs text-white/40">
          {t('authSystemSubtitle')}
        </div>
      </aside>

      <main className="flex min-h-screen items-center justify-center p-5 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[390px]"
        >
          <div className="mb-5 flex items-center justify-between gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-red-700"
            >
              <ArrowLeft size={14} /> {t('authBackHome')}
            </Link>
            <div className="flex items-center gap-1.5">
              <LanguageSwitcher />
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-red-600">
              {t('authWelcomeEyebrow')}
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              {t('authLoginTitle')}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {t('authLoginDesc')}
            </p>
          </div>

          <form className="space-y-3.5" onSubmit={submit}>
            <Input
              label={t('authUsernameLabel')}
              autoComplete="username"
              placeholder={lang === 'eng' ? 'Enter username' : 'Masukkan username'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <div className="relative">
              <Input
                label={t('authPasswordLabel')}
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder={lang === 'eng' ? 'Enter password' : 'Masukkan kata laluan'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute bottom-2.5 right-3.5 text-slate-400 hover:text-slate-600"
                aria-label={lang === 'eng' ? 'Show or hide password' : 'Tunjuk atau sembunyi kata laluan'}
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <Button type="submit" loading={busy} className="mt-2 w-full text-xs">
              {t('authSignInBtn')} <ArrowRight size={15} />
            </Button>
          </form>

          <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-red-50 p-3 text-xs leading-5 text-red-900 border border-red-100">
            <Lock className="mt-0.5 shrink-0 text-red-600" size={15} />
            <span>
              {lang === 'eng'
                ? 'Restricted to authorized personnel only. Sessions automatically terminate after 8 hours.'
                : 'Khas untuk kakitangan yang diberi kuasa sahaja. Sesi ditamatkan automatik selepas 8 jam.'}
            </span>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
