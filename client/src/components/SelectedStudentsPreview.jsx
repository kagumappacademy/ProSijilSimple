import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Button, Modal, SearchField } from './UI';
import { useLang } from '../lib/i18n';

export function SelectedStudentsPreview({ students, getMatchingTemplate, onRemove, onClose, disabled = false }) {
  const { lang } = useLang();
  const english = lang === 'eng';
  const [query, setQuery] = useState('');
  const contentRef = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const dialog = contentRef.current?.closest('[role="dialog"]');
    contentRef.current?.querySelector('input')?.focus();
    function onKeyDown(event) {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab' || !dialog) return;
      const controls = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]')];
      const first = controls[0], last = controls[controls.length - 1];
      if (!dialog.contains(document.activeElement)) { event.preventDefault(); first?.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); if (previousFocus?.isConnected) previousFocus.focus(); };
  }, [onClose]);
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return students.filter(student => [student.nama_penuh, student.no_kp_atau_id, student.cawangan, student.peringkat].join(' ').toLowerCase().includes(value));
  }, [students, query]);
  return <Modal open wide onClose={onClose} title={english ? 'Preview Selected Students' : 'Pratonton Pesilat Dipilih'}>
    <div ref={contentRef}>
    <p className="mb-3 text-xs leading-relaxed text-slate-600">{english
      ? `${students.length} students selected for generation, including selections outside the current filters. Review names, IDs, branches and levels below.`
      : `${students.length} pesilat dipilih untuk janaan, termasuk pilihan di luar tapisan semasa. Semak nama, ID, cawangan dan peringkat di bawah.`}</p>
    <SearchField value={query} onChange={setQuery} placeholder={english ? 'Search selected students...' : 'Cari dalam pesilat dipilih...'} />
    <p role="status" className="my-2 text-xs font-semibold text-slate-600">{filtered.length} {english ? 'of' : 'daripada'} {students.length} {english ? 'selected students' : 'pesilat dipilih'}</p>
    <ol className="max-h-[50vh] divide-y divide-slate-200 overflow-y-auto rounded-lg border border-slate-200">
      {filtered.map(student => {
        const template = getMatchingTemplate(student);
        return <li key={student.id} className="flex items-start gap-2 p-3 sm:gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="break-words text-xs font-bold text-slate-950 sm:text-sm">{student.nama_penuh}</p>
            <p className="break-words text-xs text-slate-600">{student.no_kp_atau_id || '—'} · {student.cawangan} · {student.peringkat}</p>
            <p className={`flex items-start gap-1 text-[11px] ${template ? 'text-emerald-800' : 'text-amber-800'}`}>
              {template ? <CheckCircle2 size={13} className="shrink-0" /> : <AlertCircle size={13} className="shrink-0" />}
              <span className="min-w-0 break-words">{template ? (english ? 'Template ready: ' : 'Templat sedia: ') + (template.nama_template || template.peringkat) : (english ? 'No matching template' : 'Tiada templat sepadan')}</span>
            </p>
          </div>
          <button type="button" disabled={disabled} onClick={() => onRemove(student.id)}
            aria-label={(english ? 'Deselect ' : 'Nyahpilih ') + student.nama_penuh + ' (' + (student.no_kp_atau_id || student.id) + ')'}
            title={english ? 'Remove from selection' : 'Buang daripada pilihan'}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 disabled:opacity-40"><X size={16} /></button>
        </li>;
      })}
    </ol>
    {!filtered.length && <p className="py-5 text-center text-xs text-slate-500">{students.length ? (english ? 'No selected students match your search.' : 'Tiada pesilat dipilih sepadan dengan carian.') : (english ? 'No students selected yet.' : 'Belum ada pesilat dipilih.')}</p>}
    <div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><Button type="button" onClick={onClose}>{english ? 'Done Reviewing' : 'Selesai Semakan'}</Button></div>
    </div>
  </Modal>;
}
