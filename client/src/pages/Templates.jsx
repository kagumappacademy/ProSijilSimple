import React, { useCallback, useEffect, useState } from 'react';
import { Layers, Plus, UploadCloud, Eye, Trash2, FileText, CheckCircle2, AlertCircle, Play, Download, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { api, fmtDate } from '../lib/api';
import { PageIntro, Panel, Button, Input, Select, Modal, Confirm, Loading, Empty, Chip } from '../components/UI';

const LEVEL_LIST = [
  'Ujian Awan Putih Cula Merah 1',
  'Ujian Awan Putih Cula Merah 2',
  'Ujian Awan Putih Cula Merah 3',
  'Ujian Awan Putih Cula Hijau 1',
  'Ujian Awan Putih Cula Hijau 2',
  'Ujian Awan Putih Cula Hijau 3',
  'Ujian Awan Putih Cula Kuning 1',
  'Ujian Awan Putih Cula Kuning 2',
  'Ujian Awan Putih Cula Kuning 3',
  'Ujian Awan Putih Cula Hitam 1',
  'Ujian Awan Putih Cula Hitam 2',
  'Ujian Awan Putih Cula Hitam 3'
];

function UploadTemplateModal({ open, onClose, onSaved }) {
  const [file, setFile] = useState(null);
  const [nama, setNama] = useState('Sijil Ujian Kenaikan Tali Pinggang (Penggal 1/2026)');
  const [peringkat, setPeringkat] = useState('Ujian Awan Putih Cula Merah 1');
  const [keterangan, setKeterangan] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setNama('Sijil Ujian Kenaikan Tali Pinggang (Penggal 1/2026)');
      setPeringkat('Ujian Awan Putih Cula Merah 1');
      setKeterangan('');
    }
  }, [open]);

  async function submit(e) {
    e.preventDefault();
    if (!file) return toast.error('Sila pilih fail PDF templat.');
    if (!file.name.toLowerCase().endsWith('.pdf')) return toast.error('Fail mestilah format .pdf.');
    if (nama.trim().length < 3) return toast.error('Sila masukkan nama templat sijil.');

    const form = new FormData();
    form.append('file', file);
    form.append('nama_template', nama.trim());
    form.append('peringkat', peringkat);
    form.append('keterangan', keterangan.trim());

    setBusy(true);
    try {
      await api('/admin/templates', { method: 'POST', body: form });
      toast.success('Templat sijil berjaya dimuat naik!');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Muat Naik Templat Sijil (PDF)" wide>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-2 block text-xs font-bold text-slate-600">Fail Templat PDF (2 Muka Surat) *</label>
          <label className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-5 text-center transition hover:border-forest-600">
            <UploadCloud size={30} className="text-forest-700 mb-2"/>
            <div className="text-sm font-bold text-forest-950">
              {file ? file.name : 'Pilih fail PDF templat sijil'}
            </div>
            <p className="mt-1 text-xs text-slate-400">PDF standard (sehingga 10MB). Pastikan muka surat 1 mengandungi ruangan nama.</p>
            {file && (
              <span className="mt-2 text-xs font-semibold text-forest-700 bg-forest-100 px-3 py-1 rounded-full">
                {(file.size / 1024).toFixed(1)} KB • Sedia dimuat naik
              </span>
            )}
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="sr-only"
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>

        <Input
          label="Nama Templat Sijil *"
          required
          placeholder="Contoh: Sijil Ujian Kenaikan Tali Pinggang (Penggal 1/2026)"
          value={nama}
          onChange={e => setNama(e.target.value)}
        />

        <div>
          <label className="mb-2 block text-xs font-bold text-slate-600">Padanan Peringkat Pesilat *</label>
          <select
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-forest-600 focus:ring-4 focus:ring-forest-100"
            value={peringkat}
            onChange={e => setPeringkat(e.target.value)}
          >
            {LEVEL_LIST.map(lvl => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] text-slate-400">
            Sistem akan memilih templat ini secara automatik apabila pesilat mempunyai peringkat di atas.
          </p>
        </div>

        <Input
          label="Keterangan / Catatan (Pilihan)"
          placeholder="Contoh: Digunakan untuk sesi peperiksaan penggal pertama"
          value={keterangan}
          onChange={e => setKeterangan(e.target.value)}
        />

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 text-xs text-emerald-900 leading-relaxed">
          <strong>Peraturan Janaan Automatik:</strong>
          <ul className="mt-1.5 list-disc list-inside space-y-1 text-emerald-800">
            <li><strong>Page 1:</strong> Nama pesilat akan dimasukkan di atas garisan nama dengan <strong>fon Lora</strong>, saiz <strong>20</strong>, warna merah <strong>#c1362d</strong>.</li>
            <li><strong>Page 2:</strong> Dikekalkan sepenuhnya tanpa sebarang perubahan.</li>
          </ul>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
          <Button type="submit" loading={busy}>
            <UploadCloud size={16}/> Muat Naik Templat
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function TestGenerateModal({ open, onClose, template }) {
  const [name, setName] = useState('MUHAMMAD ADAM BIN ALI');
  const [testing, setTesting] = useState(false);

  if (!template) return null;

  async function handleTest() {
    if (!name.trim()) return toast.error('Sila masukkan nama untuk ujian.');
    setTesting(true);
    try {
      const response = await fetch('/api/admin/templates/test-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: template.id,
          student_name: name.trim()
        })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Gagal menjana ujian');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast.success('Ujian janaan PDF dibuka di tab baharu.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTesting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Uji Cuba Janaan Templat">
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 p-4 border border-slate-200">
          <div className="font-bold text-forest-950 text-sm">{template.nama_template}</div>
          <div className="text-xs text-slate-500 mt-1">Peringkat: {template.peringkat}</div>
        </div>

        <Input
          label="Nama Pesilat untuk Diuji"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Masukkan nama contoh..."
        />

        <p className="text-xs text-slate-500 leading-relaxed">
          Ujian ini akan menjana dokumen PDF dengan nama di Page 1 menggunakan fon Lora 20 (#c1362d) dan membuka terus di pelayar untuk semakan anda.
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Tutup</Button>
          <Button type="button" loading={testing} onClick={handleTest}>
            <Play size={16}/> Jana & Buka PDF
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function Templates() {
  const [data, setData] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [testTarget, setTestTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadTemplates = useCallback(() => {
    api('/admin/templates')
      .then(setData)
      .catch(err => toast.error(err.message));
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api('/admin/templates/' + deleteTarget.id, { method: 'DELETE' });
      toast.success('Templat berjaya dipadam.');
      setDeleteTarget(null);
      loadTemplates();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageIntro
        eyebrow="TEMPLAT PDF"
        title="Templat Sijil Rasmi"
        desc="Fail templat PDF (2 muka surat) mengikut peringkat untuk janaan automatik."
        actions={
          <Button onClick={() => setUploadOpen(true)} className="!px-3.5 !py-2 text-xs">
            <Plus size={16}/> Muat Naik Templat
          </Button>
        }
      />

      <Panel className="flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 p-3 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2">
            <Layers className="text-forest-700 shrink-0" size={18}/>
            <div className="text-xs sm:text-sm font-extrabold text-forest-950">Senarai Templat Sijil</div>
            <Chip color="emerald">{data?.rows?.length || 0} templat</Chip>
          </div>
        </div>

        {!data ? (
          <Loading/>
        ) : data.rows.length === 0 ? (
          <Empty
            icon={Layers}
            title="Belum ada templat sijil"
            message="Klik butang 'Muat Naik Templat' untuk menambah fail PDF templat sijil pertama."
          />
        ) : (
          <div className="overflow-x-auto max-h-[calc(100vh-230px)] overflow-y-auto">
            <table className="w-full min-w-[760px] text-left text-xs sm:text-sm">
              <thead className="sticky top-0 z-10 bg-[#FBFCFA] text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-400 border-b border-slate-100 shadow-2xs">
                <tr>
                  <th className="px-3.5 py-2.5">Nama Templat</th>
                  <th className="px-3.5 py-2.5">Peringkat / Bengkung</th>
                  <th className="px-3.5 py-2.5">Fail PDF</th>
                  <th className="px-3.5 py-2.5">Tarikh Muat Naik</th>
                  <th className="px-3.5 py-2.5 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.rows.map(item => (
                  <tr key={item.id} className="transition hover:bg-slate-50">
                    <td className="px-3.5 py-2.5">
                      <div className="font-bold text-forest-950 text-xs sm:text-sm">{item.nama_template}</div>
                      {item.keterangan && (
                        <div className="text-[10px] text-slate-400 mt-0.5">{item.keterangan}</div>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <Chip color="gold">{item.peringkat}</Chip>
                    </td>
                    <td className="px-3.5 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1 font-medium">
                        <FileText size={14} className="text-forest-700 shrink-0"/>
                        <span className="truncate max-w-[180px]" title={item.file_name}>{item.file_name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {(item.file_size / 1024).toFixed(1)} KB
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                      {fmtDate(item.created_at.slice(0, 10))}
                    </td>
                    <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <a
                          href={`/api/admin/templates/${item.id}/preview`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Lihat fail PDF asal"
                          className="rounded-lg bg-slate-100 p-1.5 text-slate-600 transition hover:bg-forest-100 hover:text-forest-800"
                        >
                          <Eye size={14}/>
                        </a>
                        <button
                          onClick={() => setTestTarget(item)}
                          title="Uji janaan nama pada templat"
                          className="rounded-lg bg-emerald-50 p-1.5 text-emerald-700 transition hover:bg-emerald-100"
                        >
                          <Play size={14}/>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          title="Padam templat"
                          className="rounded-lg bg-rose-50 p-1.5 text-rose-600 transition hover:bg-rose-100"
                        >
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <UploadTemplateModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSaved={loadTemplates}
      />

      <TestGenerateModal
        open={!!testTarget}
        onClose={() => setTestTarget(null)}
        template={testTarget}
      />

      <Confirm
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        busy={deleting}
        title="Padam templat sijil ini?"
        message={`Templat “${deleteTarget?.nama_template || ''}” (${deleteTarget?.peringkat || ''}) akan dipadam daripada sistem.`}
      />
    </>
  );
}
