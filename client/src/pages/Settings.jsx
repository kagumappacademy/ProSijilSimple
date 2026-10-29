import React, { useState } from 'react';
import { ShieldCheck, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { PageIntro, Panel, Button, Input } from '../components/UI';
import { useLang } from '../lib/i18n';

export function Settings() {
  const { t, lang } = useLang();
  const [pBusy, setPBusy] = useState(false);
  const [pwd, setPwd] = useState({ current_password: '', new_password: '', confirm: '' });

  async function changePassword(e) {
    e.preventDefault();
    if (pwd.new_password !== pwd.confirm) {
      return toast.error(lang === 'eng' ? 'Password confirmation does not match.' : 'Pengesahan kata laluan tidak sepadan.');
    }
    setPBusy(true);
    try {
      await api('/auth/password', { method: 'POST', body: pwd });
      toast.success(lang === 'eng' ? 'Password changed successfully. Please log in again.' : 'Kata laluan berjaya ditukar. Sila log masuk semula.');
      window.location.href = '/admin/login';
    } catch (e) {
      toast.error(e.message);
    } finally {
      setPBusy(false);
    }
  }

  return (
    <>
      <PageIntro
        eyebrow={t('settingsEyebrow')}
        title={t('settingsTitle')}
        desc={t('settingsDesc')}
      />

      <div className="max-w-xl mx-auto space-y-4">
        <Panel className="p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-red-700 border border-red-100">
              <KeyRound size={20} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-950">
                {t('changePasswordTitle')}
              </h2>
              <p className="text-xs text-slate-400">
                {t('changePasswordDesc')}
              </p>
            </div>
          </div>

          <form onSubmit={changePassword} className="space-y-3.5">
            <Input
              type="password"
              label={t('currentPasswordLabel')}
              autoComplete="current-password"
              required
              value={pwd.current_password}
              onChange={(e) => setPwd((x) => ({ ...x, current_password: e.target.value }))}
            />
            <Input
              type="password"
              label={t('newPasswordLabel')}
              autoComplete="new-password"
              required
              minLength={12}
              value={pwd.new_password}
              onChange={(e) => setPwd((x) => ({ ...x, new_password: e.target.value }))}
            />
            <Input
              type="password"
              label={t('confirmPasswordLabel')}
              autoComplete="new-password"
              required
              minLength={12}
              value={pwd.confirm}
              onChange={(e) => setPwd((x) => ({ ...x, confirm: e.target.value }))}
            />
            <div className="pt-2">
              <Button type="submit" loading={pBusy} className="w-full text-xs">
                <KeyRound size={15} /> {t('btnUpdatePassword')}
              </Button>
            </div>
          </form>
        </Panel>

        <div className="flex gap-3 rounded-3xl border border-amber-200/60 bg-amber-50/60 p-5 shadow-2xs">
          <ShieldCheck className="shrink-0 text-amber-700 mt-0.5" size={20} />
          <div>
            <div className="text-xs font-extrabold text-amber-900">{t('securityNoticeTitle')}</div>
            <p className="mt-1 text-xs leading-5 text-amber-900/80">
              {t('securityNoticeDesc')}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
