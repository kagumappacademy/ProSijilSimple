import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardList, FileUp, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button, Chip } from './UI';
import { useLang } from '../lib/i18n';
import { matchStudentList, parseStudentList } from '../lib/studentSelection';

export function BulkStudentPicker({ students, loading, onApply }) {
  const { lang } = useLang();
  const english = lang === 'eng';
  const [text, setText] = useState('');
  const [entries, setEntries] = useState(null);
  const [resolutions, setResolutions] = useState({});
  const [mode, setMode] = useState('replace');
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const fileInput = useRef(null);
  const readVersion = useRef(0);
  useEffect(() => () => { readVersion.current++; }, []);
  const report = useMemo(() => entries ? matchStudentList(entries, students) : null, [entries, students]);
  const resolved = useMemo(() => {
    if (!report) return { ids: [], remaining: 0, duplicates: 0 };
    const ids = new Set(report.matches.map(student => student.id));
    let remaining = 0, duplicates = report.duplicateCount;
    for (const entry of report.ambiguous) {
      const choice = entry.candidates.find(student => String(student.id) === resolutions[entry.line]);
      if (!choice) remaining++;
      else if (ids.has(choice.id)) duplicates++;
      else ids.add(choice.id);
    }
    return { ids: [...ids], remaining, duplicates };
  }, [report, resolutions]);

  function updateText(value) {
    readVersion.current++;
    setReading(false); setText(value); setEntries(null); setResolutions({}); setError('');
  }

  async function readFile(file) {
    if (!file) return;
    const version = ++readVersion.current;
    setEntries(null); setResolutions({}); setError('');
    if (!/\.(txt|csv|tsv)$/i.test(file.name)) {
      setReading(false);
      setError(english ? 'Use a TXT, CSV or TSV file. For Excel, copy and paste the name column.' : 'Gunakan fail TXT, CSV atau TSV. Untuk Excel, salin dan tampal lajur nama.');
      return;
    }
    if (file.size > 1024 * 1024) {
      setReading(false);
      setError(english ? 'The list file must be 1MB or smaller.' : 'Fail senarai mestilah 1MB atau lebih kecil.');
      return;
    }
    setReading(true);
    try {
      const value = await file.text();
      if (version === readVersion.current) setText(value);
    } catch {
      if (version === readVersion.current) setError(english ? 'Unable to read the file. Try pasting the list.' : 'Fail tidak dapat dibaca. Cuba tampal senarai nama.');
    } finally {
      if (version === readVersion.current) setReading(false);
    }
  }

  function review() {
    try {
      const parsed = parseStudentList(text);
      if (!parsed.length) {
        setError(english ? 'Enter at least one name or ID.' : 'Masukkan sekurang-kurangnya satu nama atau ID.');
        return;
      }
      setError(''); setResolutions({}); setEntries(parsed);
    } catch (failure) {
      const messages = {
        missing_header: english ? 'For multiple columns, include headers: nama_penuh, no_kp_atau_id, cawangan. Or paste only the name column.' : 'Untuk berbilang lajur, sertakan tajuk: nama_penuh, no_kp_atau_id, cawangan. Atau tampal lajur nama sahaja.',
        unclosed_quote: english ? 'A CSV quotation mark is not closed. Check the file or paste the name column.' : 'Tanda petikan CSV tidak ditutup. Semak fail atau tampal lajur nama.',
        too_many_rows: english ? 'Use no more than 10,000 entries per list.' : 'Gunakan maksimum 10,000 baris bagi setiap senarai.',
      };
      setError(messages[failure.message] || (english ? 'Unable to read the list.' : 'Senarai tidak dapat dibaca.'));
    }
  }

  const ready = report && resolved.ids.length > 0 && !report.unmatched.length && !resolved.remaining;
  return <section aria-label={english ? 'Bulk student selection' : 'Pemilihan pesilat secara pukal'} className="m-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:m-4 sm:p-4">
    <div className="mb-3 flex items-start gap-2">
      <ClipboardList size={18} className="mt-0.5 shrink-0 text-red-700" aria-hidden="true" />
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-slate-900">{english ? 'Paste or drop a name list' : 'Tampal atau seret senarai nama'}</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">{english
          ? 'One full name or IC / ID per line. Copy from Excel or drop a TXT / CSV / TSV file. Matching checks all branches and levels, including records outside the current filters.'
          : 'Satu nama penuh atau No. KP / ID setiap baris. Salin dari Excel atau seret fail TXT / CSV / TSV. Padanan menyemak semua cawangan dan peringkat, termasuk rekod di luar tapisan semasa.'}</p>
      </div>
    </div>
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-700">{english ? 'Name or ID list' : 'Senarai nama atau ID'}</span>
      <textarea value={text} onChange={event => updateText(event.target.value)} disabled={reading} rows={5}
        maxLength={1024 * 1024} spellCheck={false}
        placeholder={'1. MUHAMMAD ADAM BIN ABDULLAH\n2. SITI NUR AISYAH BINTI ALI\n030101-01-1234'}
        onDragOver={event => event.preventDefault()}
        onDrop={event => {
          event.preventDefault();
          if (event.dataTransfer.files.length) readFile(event.dataTransfer.files[0]);
          else updateText(event.dataTransfer.getData('text/plain'));
        }}
        className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs leading-relaxed text-slate-900 outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 disabled:opacity-60" />
    </label>
    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{english
      ? 'CSV columns: nama_penuh, no_kp_atau_id, cawangan (name or ID required; branch optional). Names match exactly, ignoring case and extra spaces.'
      : 'Lajur CSV: nama_penuh, no_kp_atau_id, cawangan (nama atau ID diperlukan; cawangan pilihan). Nama dipadankan tepat tanpa mengira huruf besar/kecil dan ruang berlebihan.'}</p>
    <div className="mt-3 flex flex-wrap gap-2">
      <input ref={fileInput} type="file" accept=".txt,.csv,.tsv" className="hidden" aria-label={english ? 'Name list file' : 'Fail senarai nama'}
        onChange={event => { readFile(event.target.files?.[0]); event.target.value = ''; }} />
      <Button type="button" variant="secondary" disabled={reading} onClick={() => fileInput.current?.click()}><FileUp size={14} />{english ? 'Choose file' : 'Pilih Fail'}</Button>
      <Button type="button" onClick={review} disabled={loading || reading || !text.trim()} loading={reading}><ClipboardList size={14} aria-hidden="true" />{english ? 'Match names' : 'Padankan Nama'}</Button>
      {text && <Button type="button" variant="ghost" onClick={() => updateText('')}>{english ? 'Clear list' : 'Kosongkan Senarai'}</Button>}
    </div>
    {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</p>}
    {report && <div className="mt-4 space-y-3 border-t border-slate-200 pt-3" aria-live="polite">
      <div className="flex flex-wrap gap-2">
        <Chip color="emerald">{resolved.ids.length} {english ? 'students matched' : 'pesilat sepadan'}</Chip>
        <Chip color={report.unmatched.length ? 'rose' : 'slate'}>{report.unmatched.length} {english ? 'not found' : 'tidak ditemui'}</Chip>
        <Chip color={resolved.remaining ? 'gold' : 'slate'}>{resolved.remaining} {english ? 'need a choice' : 'perlu dipastikan'}</Chip>
      </div>
      <p className="text-xs text-slate-600">{entries.length} {english ? 'entries checked.' : 'baris disemak.'} {resolved.duplicates > 0 && `${resolved.duplicates} ${english ? 'repeated entries will not create duplicate selections.' : 'baris berulang tidak menggandakan pilihan.'}`}</p>
      {report.unmatched.length > 0 && <div className="rounded-lg border border-red-200 bg-white p-3">
        <p className="mb-2 flex items-center gap-1 text-xs font-bold text-red-800"><AlertCircle size={14} />{english ? 'Correct these entries before applying' : 'Betulkan nama ini sebelum menggunakan senarai'}</p>
        <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-slate-700">{report.unmatched.map(entry => <li key={entry.line} className="break-words">{english ? 'Line' : 'Baris'} {entry.line}: {entry.label || (english ? 'Name / ID is empty' : 'Nama / ID kosong')}</li>)}</ul>
      </div>}
      {report.ambiguous.length > 0 && <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border border-amber-200 bg-white p-3">
        <p className="text-xs font-bold text-amber-900">{english ? 'Multiple records match. Choose the correct student for each entry.' : 'Beberapa rekod sepadan. Pilih pesilat yang betul bagi setiap baris.'}</p>
        {report.ambiguous.map(entry => <fieldset key={entry.line} className="space-y-2 rounded-lg border border-slate-200 p-2">
          <legend className="max-w-full break-words px-1 text-xs font-semibold text-slate-900">{english ? 'Line' : 'Baris'} {entry.line}: {entry.label}</legend>
          {entry.candidates.map(student => <label key={student.id} className="flex cursor-pointer items-start gap-2 rounded-md p-1 text-xs text-slate-700 hover:bg-slate-50">
            <input type="radio" name={'bulk-student-line-' + entry.line} value={student.id} checked={resolutions[entry.line] === String(student.id)}
              onChange={() => setResolutions(previous => ({ ...previous, [entry.line]: String(student.id) }))} className="mt-0.5 accent-red-700" />
            <span className="min-w-0 break-words"><strong>{student.nama_penuh}</strong><span className="mt-0.5 block">{student.no_kp_atau_id || '—'} · {student.cawangan} · {student.peringkat}</span></span>
          </label>)}
        </fieldset>)}
      </div>}
      <label className="block text-xs font-semibold text-slate-700">
        <span className="mb-1 block">{english ? 'Apply selection' : 'Cara Gunakan Pilihan'}</span>
        <select value={mode} onChange={event => setMode(event.target.value)} className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 sm:w-auto">
          <option value="replace">{english ? 'Replace current selection' : 'Gantikan pilihan sedia ada'}</option>
          <option value="add">{english ? 'Add to current selection' : 'Tambah kepada pilihan sedia ada'}</option>
        </select>
      </label>
      {!ready && <p className="text-xs text-amber-900">{english ? 'Resolve all missing or ambiguous entries to avoid leaving anyone out.' : 'Selesaikan semua nama yang tidak ditemui atau mempunyai beberapa padanan supaya tiada pesilat tertinggal.'}</p>}
      <p className="text-[11px] text-slate-500">{english ? 'Applying the list clears the display filters so you can review every selection.' : 'Menggunakan senarai akan mengosongkan tapisan paparan supaya semua pilihan boleh disemak.'}</p>
      <Button type="button" disabled={!ready || loading} onClick={() => onApply(resolved.ids, mode)} className="w-full sm:w-auto"><CheckCircle2 size={14} />{english ? `Use ${resolved.ids.length} Students & Preview` : `Gunakan ${resolved.ids.length} Pesilat & Pratonton`}</Button>
    </div>}
  </section>;
}
