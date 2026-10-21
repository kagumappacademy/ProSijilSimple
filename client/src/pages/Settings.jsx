import React, { useState } from 'react';
import { ShieldCheck, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { PageIntro, Panel, Button, Input } from '../components/UI';

export function Settings() {
  const [pBusy, setPBusy] = useState(false);
  const [pwd, setPwd] = useState({ current_password: '', new_password: '', confirm: '' });

  async function changePassword(e) {
    e.preventDefault();
    if (pwd.new_password !== pwd.confirm) {
      return toast.error('Pengesahan kata laluan tidak sepadan.');
    }
    setPBusy(true);
    try {
      await api('/auth/password', { method: 'POST', body: pwd });
      toast.success('Kata laluan berjaya ditukar. Sila log masuk semula.');
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
        eyebrow="KESELAMATAN & AKAUN"
        title="Tetapan Sistem"
        desc="Kemaskini kata laluan dan urus keselamatan akaun pentadbir sistem."
      />

      <div className="max-w-xl mx-auto space-y-4">
        <Panel className="p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-red-50 text-red-700 border border-red-100">
              <KeyRound size={20} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-950">Tukar Kata Laluan</h2>
              <p className="text-xs text-slate-400">Kemaskini kata laluan akaun pentadbir untuk keselamatan akaun.</p>
            </div>
          </div>

          <form onSubmit={changePassword} className="space-y-3.5">
            <Input
              type="password"
              label="Kata Laluan Semasa"
              autoComplete="current-password"
              required
              value={pwd.current_password}
              onChange={(e) => setPwd((x) => ({ ...x, current_password: e.target.value }))}
            />
            <Input
              type="password"
              label="Kata Laluan Baharu"
              autoComplete="new-password"
              required
              minLength={12}
              value={pwd.new_password}
              onChange={(e) => setPwd((x) => ({ ...x, new_password: e.target.value }))}
            />
            <Input
              type="password"
              label="Sahkan Kata Laluan Baharu"
              autoComplete="new-password"
              required
              minLength={12}
              value={pwd.confirm}
              onChange={(e) => setPwd((x) => ({ ...x, confirm: e.target.value }))}
            />
            <div className="pt-2">
              <Button type="submit" loading={pBusy} className="w-full text-xs">
                <KeyRound size={15} /> Kemaskini Kata Laluan
              </Button>
            </div>
          </form>
        </Panel>

        <div className="flex gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4">
          <ShieldCheck className="shrink-0 text-amber-700 mt-0.5" size={20} />
          <div>
            <div className="text-xs font-extrabold text-amber-900">Nota Keselamatan</div>
            <p className="mt-1 text-xs leading-5 text-amber-900/80">
              Gunakan kata laluan sekurang-kurangnya 12 aksara dengan gabungan huruf besar, huruf kecil, angka, dan simbol. Pastikan JWT_SECRET kekal selamat dalam persekitaran produksi.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
