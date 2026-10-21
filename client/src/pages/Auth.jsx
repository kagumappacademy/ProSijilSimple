import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { Logo, Button, Input } from '../components/UI';
import { useLanguage } from '../lib/i18n';
import { LanguageToggle } from '../components/LanguageToggle';
import { ThemeToggle } from '../components/ThemeToggle';

export function Login({ onLogin }) {
  const { t, lang } = useLanguage();
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
      toast.success(lang === 'en' ? 'Login successful. Welcome back!' : 'Log masuk berjaya. Selamat kembali!');
      nav('/admin');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-canvas dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 lg:grid-cols-2 transition-colors">
      <aside className="mesh-bg relative hidden flex-col justify-between overflow-hidden p-8 lg:p-10 xl:p-12 text-white lg:flex">
        <div className="dot-grid absolute inset-0 opacity-20" />
        <div className="pointer-events-none absolute -bottom-28 -right-28 h-[400px] w-[400px] rounded-full border-[50px] border-white/5" />
        <div className="relative flex items-center justify-between">
          <Link to="/">
            <Logo light />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle className="border-white/20 bg-white/10 text-white" />
            <ThemeToggle className="border-white/20 bg-white/10 text-white hover:bg-white/20" />
          </div>
        </div>
        <div className="relative max-w-lg">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-white/10 px-3.5 py-1.5 text-xs font-semibold tracking-wider text-rose-200 backdrop-blur-sm">
            <ShieldCheck size={14} /> {lang === 'en' ? 'ADMIN PORTAL' : 'PORTAL PENTADBIR'}
          </div>
          <h1 className="text-3xl lg:text-4xl xl:text-5xl font-extrabold leading-tight tracking-tight">
            {lang === 'en' ? (
              <>Manage certificates with <span className="text-rose-300">ease & clarity.</span></>
            ) : (
              <>Urus sijil dengan lebih <span className="text-rose-300">mudah & teratur.</span></>
            )}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-white/70">
            {lang === 'en'
              ? 'One platform to manage student records, issue verified certificates, and empower your academy.'
              : 'Satu platform untuk mengurus rekod pesilat, mengeluarkan sijil, dan memperkasakan akademi silat anda.'}
          </p>
        </div>
        <div className="relative border-t border-white/15 pt-4 text-xs text-white/40">
          Akademi ProSilat • {t('brand.subtitle', 'Sistem Pengurusan Sijil Digital')}
        </div>
      </aside>

      <main className="flex min-h-screen items-center justify-center p-5 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[390px]"
        >
          <div className="mb-5 flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-red-700 transition"
            >
              <ArrowLeft size={14} /> {lang === 'en' ? 'Back to Home' : 'Ke Halaman Utama'}
            </Link>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-red-600 dark:text-red-400">
              {lang === 'en' ? 'WELCOME BACK' : 'SELAMAT KEMBALI'}
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 dark:text-slate-100 sm:text-3xl">
              {lang === 'en' ? 'Admin Login' : 'Log Masuk Admin'}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {lang === 'en' ? 'Enter administrator credentials to proceed.' : 'Masukkan maklumat akaun pentadbir untuk meneruskan.'}
            </p>
          </div>

          <form className="space-y-3.5" onSubmit={submit}>
            <Input
              label={lang === 'en' ? 'Username' : 'Nama Pengguna'}
              autoComplete="username"
              placeholder={lang === 'en' ? 'Enter username' : 'Masukkan username'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <div className="relative">
              <Input
                label={lang === 'en' ? 'Password' : 'Kata Laluan'}
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder={lang === 'en' ? 'Enter password' : 'Masukkan kata laluan'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute bottom-2.5 right-3.5 text-slate-400 hover:text-slate-600"
                aria-label="Tunjuk atau sembunyi kata laluan"
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <Button type="submit" loading={busy} className="mt-2 w-full text-xs">
              {lang === 'en' ? 'Login' : 'Log Masuk'} <ArrowRight size={15} />
            </Button>
          </form>

          <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 p-3 text-xs leading-5 text-red-900 dark:text-red-300 border border-red-100 dark:border-red-900/50">
            <Lock className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" size={15} />
            <span>
              {lang === 'en'
                ? 'Authorized personnel only. Session ends automatically after 8 hours.'
                : 'Khas untuk kakitangan yang diberi kuasa sahaja. Sesi ditamatkan automatik selepas 8 jam.'}
            </span>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
