import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Save, ShieldCheck, KeyRound, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { PageIntro, Panel, Button, Input, Loading } from '../components/UI';

export function Settings() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pBusy, setPBusy] = useState(false);
  const [pwd, setPwd] = useState({ current_password: '', new_password: '', confirm: '' });

  useEffect(() => {
    api('/admin/settings')
      .then(setData)
      .catch((e) => toast.error(e.message));
  }, []);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api('/admin/settings', { method: 'PUT', body: data });
      toast.success('Tetapan sistem berjaya disimpan.');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

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

  const field = (key, label) => (
    <Input
      label={label}
      value={data[key] || ''}
      onChange={(e) => setData((x) => ({ ...x, [key]: e.target.value }))}
      required
    />
  );

  return (
    <>
      <PageIntro
        eyebrow="KONFIGURASI"
        title="Tetapan Sistem"
        desc="Kemaskini butiran organisasi dan penandatangan yang dipaparkan dalam sijil PDF."
      />

      {!data ? (
        <Loading />
      ) : (
        <div className="grid gap-3.5 sm:gap-4 xl:grid-cols-[1.3fr_0.85fr]">
          <Panel className="p-4 sm:p-5">
            <div className="mb-3.5 flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-700 border border-red-100">
                <FileText size={20} />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-950">Butiran Sijil Rasmi</h2>
                <p className="text-[11px] text-slate-400">Digunakan ketika sistem menjana PDF secara automatik.</p>
              </div>
            </div>

            <form onSubmit={save} className="space-y-3">
              {field('nama_organisasi', 'Nama Organisasi / Akademi')}
              {field('sub_organisasi', 'Subtajuk Organisasi')}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {field('nama_penandatangan', 'Nama Penandatangan')}
                {field('jawatan_penandatangan', 'Jawatan Penandatangan')}
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Warna Tema Sijil</label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="color"
                    aria-label="Pilih warna tema"
                    value={data.tema_warna || '#991b1b'}
                    onChange={(e) => setData((x) => ({ ...x, tema_warna: e.target.value }))}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-slate-200 p-0.5 shadow-2xs"
                  />
                  <input
                    value={data.tema_warna || ''}
                    onChange={(e) => setData((x) => ({ ...x, tema_warna: e.target.value }))}
                    className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono outline-none focus:border-red-600"
                  />
                  <span className="text-[11px] text-slate-400">Warna rasmi PDF (Merah #991b1b)</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <Button type="submit" loading={busy} className="text-xs">
                  <Save size={15} /> Simpan Tetapan
                </Button>
              </div>
            </form>
          </Panel>

          <div className="space-y-3.5">
            <Panel className="p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-red-50 text-red-700 border border-red-100">
                  <KeyRound size={16} />
                </div>
                <div>
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-950">Tukar Kata Laluan</h2>
                  <p className="text-[11px] text-slate-400">Kemaskini kata laluan akaun pentadbir.</p>
                </div>
              </div>

              <form onSubmit={changePassword} className="space-y-2.5">
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
                <Button type="submit" loading={pBusy} variant="secondary" className="w-full text-xs mt-1">
                  <KeyRound size={15} /> Kemaskini Kata Laluan
                </Button>
              </form>
            </Panel>

            <div className="flex gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-3.5">
              <ShieldCheck className="shrink-0 text-amber-700 mt-0.5" size={18} />
              <div>
                <div className="text-xs font-extrabold text-amber-900">Nota Keselamatan</div>
                <p className="mt-1 text-[11px] leading-4 text-amber-900/80">
                  Gunakan kata laluan sekurang-kurangnya 12 aksara. Pastikan JWT_SECRET selamat dalam persekitaran produksi.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
