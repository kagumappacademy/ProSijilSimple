import React, { useState } from 'react';
import { FileUp, Download, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight, Info, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { PageIntro, Panel, Button, Chip, ProcessingModal } from '../components/UI';
import { useLang } from '../lib/i18n';

const demo = '\uFEFFnama_penuh,no_kp_atau_id,peringkat,cawangan\r\n"Muhammad Adam Bin Ali",,"Ujian Awan Putih Cula Merah 1","Skudai"\r\n"Siti Aisyah Binti Ahmad","010203041234","Ujian Awan Putih Cula Kuning 2","Kulai"\r\n';

function csvDownload() {
  const blob = new Blob([demo], { type: 'text/csv;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = 'template-import-pesilat.csv';
  a.click();
  URL.revokeObjectURL(href);
}

export function ImportCSV() {
  const { t, lang } = useLang();
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [drag, setDrag] = useState(false);

  async function submit() {
    if (!file) return toast.error(lang === 'eng' ? 'Please select a CSV file first.' : 'Sila pilih fail CSV terlebih dahulu.');
    const body = new FormData();
    body.append('file', file);
    setBusy(true);
    setResult(null);
    try {
      const r = await api('/admin/students/import', { method: 'POST', body });
      setResult(r);
      toast.success(lang === 'eng' ? `Import completed: ${r.inserted} new records.` : `Import selesai: ${r.inserted} rekod baharu.`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageIntro
        eyebrow={t('importEyebrow')}
        title={t('importTitle')}
        desc={t('importDesc')}
        action={
          <Button variant="secondary" onClick={csvDownload} className="text-xs">
            <Download size={15} /> {t('btnDownloadSampleCsv')}
          </Button>
        }
      />

      <div className="grid gap-3.5 sm:gap-4 xl:grid-cols-[1.3fr_1fr]">
        <Panel className="p-4 sm:p-5">
          <div className="mb-3.5 flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-700 border border-red-100">
              <FileUp size={20} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-950">
                {lang === 'eng' ? 'Upload CSV File' : 'Muat Naik Fail CSV'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {lang === 'eng' ? 'Format .csv (UTF-8), max 10MB.' : 'Format .csv (UTF-8), maksimum 10MB.'}
              </p>
            </div>
          </div>

          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              const f = e.dataTransfer.files?.[0];
              if (f) setFile(f);
            }}
            className={`flex min-h-[160px] sm:min-h-[190px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 sm:p-6 text-center transition ${
              drag
                ? 'border-red-600 bg-red-50'
                : 'border-slate-200/80 bg-slate-50/50 hover:border-red-400 hover:bg-white'
            }`}
          >
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-white text-red-700 shadow-xs border border-slate-100">
              <UploadCloud size={24} />
            </div>
            <h3 className="mt-3 text-sm font-extrabold text-slate-950">
              {file ? file.name : t('dropCsvTitle')}
            </h3>
            <p className="mt-1 text-xs text-slate-400">{t('dropCsvDesc')}</p>
            {file && (
              <span className="mt-2.5 rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold text-red-700 border border-red-200">
                {(file.size / 1024).toFixed(1)} KB • {lang === 'eng' ? 'File Selected' : 'Fail Dipilih'}
              </span>
            )}
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>

          <div className="mt-3.5 flex flex-wrap justify-end gap-2.5">
            {file && (
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-xs font-semibold text-slate-400 hover:text-rose-600 px-3 py-2"
              >
                {t('btnCancel')}
              </button>
            )}
            <Button onClick={submit} loading={busy} disabled={!file} className="text-xs">
              <FileUp size={15} /> {t('btnUploadProcess')}
            </Button>
          </div>

          {result && (
            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-800">
                <CheckCircle2 size={17} /> Import Selesai
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[
                  ['Jumlah', result.total],
                  ['Berjaya', result.inserted],
                  ['Dilangkau', result.skipped],
                ].map(([label, count]) => (
                  <div key={label} className="rounded-lg bg-white p-2.5 shadow-xs border border-emerald-100/60">
                    <div className="text-lg font-extrabold text-slate-900">{count}</div>
                    <div className="text-[10px] text-slate-500">{label}</div>
                  </div>
                ))}
              </div>
              {result.errors?.length > 0 && (
                <div className="mt-3 text-[11px] leading-5 text-amber-900">
                  <strong>Perhatian:</strong>
                  {result.errors.map((s, i) => (
                    <div key={i}>• {s}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Panel>

        <div className="space-y-3.5">
          <Panel className="p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-red-700" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-950">
                Panduan Format CSV
              </h3>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Sistem menyokong nama kolum BM atau format standard:
            </p>

            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-red-900 text-white">
                  <tr>
                    <th className="py-2 px-3 font-semibold text-[11px]">Kolum</th>
                    <th className="py-2 px-3 font-semibold text-[11px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    ['Nama Peserta / nama_penuh', 'Wajib', 'emerald'],
                    ['Nama Cawangan / cawangan', 'Pilihan', 'slate'],
                    ['Peringkat / peringkat', 'Pilihan', 'slate'],
                    ['No. KP / no_kp_atau_id', 'Pilihan', 'slate'],
                  ].map(([name, val, color]) => (
                    <tr key={name}>
                      <td className="py-1.5 px-3 font-medium text-slate-700 text-xs">{name}</td>
                      <td className="py-1.5 px-3">
                        <Chip color={color} className="text-[10px] px-2 py-0.5">
                          {val}
                        </Chip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex gap-2.5 rounded-xl bg-red-50/80 p-3 text-xs leading-5 text-red-900 border border-red-100">
              <Info size={16} className="mt-0.5 shrink-0 text-red-600" />
              <span>Jika tiada No. KP / ID, sistem akan menjana ID unik secara automatik (contoh: PS-A1B2C3D4).</span>
            </div>
          </Panel>

          <Panel className="p-4 sm:p-5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-950">
              Proses Ringkas 3 Langkah
            </h3>
            <div className="mt-3 space-y-2.5">
              {[
                ['1', 'Sediakan fail CSV', 'Gunakan templat CSV UTF-8.'],
                ['2', 'Muat naik fail', 'Nama, cawangan & peringkat dikesan.'],
                ['3', 'Semak rekod', 'Rekod pendua dilangkau secara pintar.'],
              ].map(([n, title, desc]) => (
                <div key={n} className="flex items-center gap-2.5">
                  <div className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-red-50 text-[11px] font-extrabold text-red-700 border border-red-100">
                    {n}
                  </div>
                  <div className="flex-1 text-xs">
                    <span className="font-bold text-slate-900">{title}</span>
                    <span className="text-slate-400"> — {desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <ProcessingModal
        open={busy}
        title={lang === 'eng' ? 'Importing Student Records...' : 'Sedang Mengimport Rekod Pesilat...'}
        subtitle={lang === 'eng' ? 'Validating CSV records and syncing with database...' : 'Menentusahkan baris CSV & menyegerakkan ke pangkalan data...'}
      />
    </>
  );
}
