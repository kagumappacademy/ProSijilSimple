import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, CheckCircle2, AlertCircle, Award, Layers, Search, CalendarDays, Filter, ArrowRight, CheckSquare, Square, RefreshCw, FileText, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { api, fmtDate } from '../lib/api';
import { PageIntro, Panel, Button, Input, Chip, Loading, Empty, SearchField } from '../components/UI';

export function GenerateCerts() {
  const navigate = useNavigate();

  // Template Groups
  const [templateGroups, setTemplateGroups] = useState({});
  const [allTemplates, setAllTemplates] = useState([]);
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));

  // Students list & filters
  const [students, setStudents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [levels, setLevels] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);

  // Load templates
  const loadTemplates = useCallback(async () => {
    try {
      const res = await api('/admin/templates/groups');
      setTemplateGroups(res.groups || {});
      setAllTemplates(res.templates || []);
      const keys = Object.keys(res.groups || {});
      if (keys.length > 0 && !selectedTemplateName) {
        setSelectedTemplateName(keys[0]);
      }
    } catch (err) {
      toast.error('Gagal memuat senarai templat: ' + err.message);
    }
  }, [selectedTemplateName]);

  // Load students
  const loadStudents = useCallback(async () => {
    try {
      // Get all students for batch selection
      const res = await api('/admin/students?limit=10000&page=1');
      setStudents(res.rows || []);
      setBranches(res.branches || []);
      setLevels(res.levels || []);
      // Default select all eligible students
      const allIds = new Set((res.rows || []).map(s => s.id));
      setSelectedIds(allIds);
    } catch (err) {
      toast.error('Gagal memuat senarai pesilat: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
    loadStudents();
  }, [loadTemplates, loadStudents]);

  const norm = s => String(s || '').trim().toLowerCase().replace(/^ujian\s+/i, '').replace(/\s+/g, ' ');

  // Count students by level for badges and dropdown
  const countByLevel = React.useMemo(() => {
    const counts = {};
    for (const s of students) {
      const k = norm(s.peringkat);
      counts[k] = (counts[k] || 0) + 1;
    }
    return counts;
  }, [students]);

  const getStudentCountForLevel = (lvl) => {
    return countByLevel[norm(lvl)] || 0;
  };

  // Filter students
  const filteredStudents = students.filter(s => {
    if (selectedBranch && s.cawangan !== selectedBranch) return false;
    if (selectedLevel) {
      const normLevel = norm(selectedLevel);
      if (norm(s.peringkat) !== normLevel && s.peringkat !== selectedLevel) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.nama_penuh.toLowerCase().includes(q);
      const matchId = s.no_kp_atau_id.toLowerCase().includes(q);
      if (!matchName && !matchId) return false;
    }
    return true;
  });

  // Check matching template for student based on currently selected template name
  const currentTemplatesForName = templateGroups[selectedTemplateName] || [];

  function getMatchingTemplate(student) {
    if (!currentTemplatesForName.length) return null;
    const sNorm = norm(student.peringkat);
    const match = currentTemplatesForName.find(
      t => norm(t.peringkat) === sNorm || t.peringkat.trim().toLowerCase() === student.peringkat.trim().toLowerCase()
    );
    if (match) return match;
    const universal = currentTemplatesForName.find(
      t => t.peringkat.trim().toLowerCase() === 'semua peringkat'
    );
    return universal || null;
  }

  // Handle rank level filter change & auto select
  function handleSelectLevelChange(level) {
    setSelectedLevel(level);
    if (level) {
      const normLevel = norm(level);
      const matching = students.filter(s => norm(s.peringkat) === normLevel || s.peringkat === level);
      setSelectedIds(new Set(matching.map(s => s.id)));
    } else {
      setSelectedIds(new Set(students.map(s => s.id)));
    }
  }

  function handleSelectLevelChip(level) {
    if (selectedLevel === level || (selectedLevel && norm(selectedLevel) === norm(level))) {
      handleSelectLevelChange('');
    } else {
      handleSelectLevelChange(level);
    }
  }

  // Toggle selection
  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelectedIds(prev => {
      const next = new Set(prev);
      for (const s of filteredStudents) next.add(s.id);
      return next;
    });
  }

  function deselectAllFiltered() {
    setSelectedIds(prev => {
      const next = new Set(prev);
      for (const s of filteredStudents) next.delete(s.id);
      return next;
    });
  }

  const idsToGenerate = filteredStudents
    .map(s => s.id)
    .filter(id => selectedIds.has(id));

  // Handle batch generation
  async function handleGenerate() {
    if (idsToGenerate.length === 0) {
      return toast.error('Sila pilih sekurang-kurangnya seorang pesilat untuk dijana sijil.');
    }
    if (!selectedTemplateName) {
      return toast.error('Sila pilih nama templat sijil terlebih dahulu.');
    }

    setGenerating(true);
    setResult(null);

    try {
      const res = await api('/admin/templates/generate-batch', {
        method: 'POST',
        body: {
          pesilat_ids: idsToGenerate,
          nama_template: selectedTemplateName,
          tarikh_isu: issueDate
        }
      });
      setResult(res);
      if (res.successCount > 0) {
        toast.success(`Berjaya menjana ${res.successCount} sijil digital!`);
        // Muat semula senarai untuk kemaskini sijil_count
        loadStudents();
      }
      if (res.failedCount > 0) {
        toast.warning(`${res.failedCount} pesilat dilangkau kerana tiada templat sepadan.`);
      }
    } catch (err) {
      toast.error('Ralat janaan sijil: ' + err.message);
    } finally {
      setGenerating(false);
    }
  }

  const templateNames = Object.keys(templateGroups);

  return (
    <>
      <PageIntro
        eyebrow="JANAAN AUTOMATIK"
        title="Janaan Sijil Pukal"
        desc="Pilih pesilat dan sistem akan memadankan templat PDF mengikut peringkat, menukar nama pada Page 1 secara automatik dan mendaftarkannya ke dalam rekod sijil pesilat."
        actions={
          <Link
            to="/admin/templates"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-forest-900 transition hover:bg-slate-50"
          >
            <Layers size={17}/> Urus Templat PDF
          </Link>
        }
      />

      {/* Konfigurasi Templat & Tarikh */}
      <Panel className="p-3.5 sm:p-4 mb-3">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-2.5 mb-3">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-forest-100 text-forest-700 shrink-0">
            <Sparkles size={16}/>
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-extrabold text-forest-950">Langkah 1: Tetapan Templat & Tarikh Sijil</h2>
            <p className="text-[10px] sm:text-xs text-slate-400">Padanan automatik templat PDF mengikut peringkat setiap pesilat.</p>
          </div>
        </div>

        {templateNames.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
            <AlertCircle size={24} className="mx-auto text-amber-600 mb-1.5"/>
            <h3 className="font-bold text-amber-950 text-xs">Tiada Templat Sijil Ditemui</h3>
            <p className="text-[11px] text-amber-800 mt-1 max-w-md mx-auto">
              Sila muat naik sekurang-kurangnya satu fail templat PDF pada menu Templat Sijil terlebih dahulu.
            </p>
            <Link
              to="/admin/templates"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-forest-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-forest-700"
            >
              <Layers size={13}/> Menu Templat Sijil
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-12 items-start">
            <div className="lg:col-span-7">
              <label className="mb-1 block text-[11px] font-bold text-slate-600">Tajuk / Kumpulan Templat *</label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-forest-950 outline-none focus:border-forest-600"
                value={selectedTemplateName}
                onChange={e => setSelectedTemplateName(e.target.value)}
              >
                {templateNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>

              <div className="mt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Peringkat templat tersedia (Klik untuk tapis & pilih):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelectLevelChange('')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                      !selectedLevel
                        ? 'bg-forest-900 text-white border-forest-900 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Semua ({students.length})
                  </button>
                  {currentTemplatesForName.map(t => {
                    const isSelected = norm(selectedLevel) === norm(t.peringkat);
                    const count = getStudentCountForLevel(t.peringkat);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSelectLevelChip(t.peringkat)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition inline-flex items-center gap-1 ${
                          isSelected
                            ? 'bg-forest-900 text-white border-forest-900 shadow-2xs ring-1 ring-forest-400/40'
                            : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        <span>{t.peringkat}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-emerald-200/80 text-emerald-900'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              <Input
                label="Tarikh Sijil *"
                type="date"
                required
                value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
              />
              <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                <strong>Spesifikasi:</strong> Fon <strong>Lora Saiz 20 (#c1362d)</strong>, Page 1 automatik 1/2 baris berpusat di atas garisan, Page 2 kekal.
              </div>
            </div>
          </div>
        )}
      </Panel>

      {/* Pemilihan Pesilat */}
      <Panel className="flex flex-col">
        <div className="flex flex-col gap-2.5 border-b border-slate-100 p-3 sm:px-4 sm:py-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <Award className="text-forest-700 shrink-0" size={18}/>
            <h2 className="text-xs sm:text-sm font-extrabold text-forest-950">Langkah 2: Pilih Pesilat untuk Dijana</h2>
            <Chip color="gold">{idsToGenerate.length} dipilih</Chip>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full lg:w-auto">
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Cari pesilat..."
            />
            <select
              aria-label="Tapis cawangan"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none"
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
            >
              <option value="">Semua Cawangan</option>
              {branches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <select
              aria-label="Tapis peringkat"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none"
              value={selectedLevel}
              onChange={e => handleSelectLevelChange(e.target.value)}
            >
              <option value="">Semua Peringkat ({students.length})</option>
              {levels.map(l => (
                <option key={l} value={l}>
                  {l} ({getStudentCountForLevel(l)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedLevel && (
          <div className="px-4 py-2 bg-forest-50/70 border-b border-forest-100 flex items-center justify-between text-xs text-forest-900">
            <span className="inline-flex items-center gap-1.5 text-[11px]">
              <Filter size={13} className="text-forest-700"/>
              Tapisan Aktif: <strong>{selectedLevel}</strong> ({filteredStudents.length} pelajar)
            </span>
            <button
              onClick={() => handleSelectLevelChange('')}
              className="text-forest-700 hover:text-forest-900 font-bold hover:underline text-[11px]"
            >
              Kosongkan Tapisan
            </button>
          </div>
        )}

        {/* Quick select buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#FBFCFA] px-4 py-2 border-b border-slate-100 text-xs">
          <div className="flex items-center gap-2.5 text-[11px]">
            <button
              onClick={selectAllFiltered}
              className="font-bold text-forest-800 hover:underline inline-flex items-center gap-1"
            >
              <CheckSquare size={13}/> Pilih Semua ({filteredStudents.length})
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={deselectAllFiltered}
              className="font-bold text-slate-500 hover:underline inline-flex items-center gap-1"
            >
              <Square size={13}/> Nyahpilih Semua
            </button>
          </div>
          <span className="text-[11px] text-slate-400">
            {filteredStudents.length} / {students.length} pesilat
          </span>
        </div>

        {loading ? (
          <Loading/>
        ) : filteredStudents.length === 0 ? (
          <Empty
            title="Tiada pesilat ditemui"
            message="Sila ubah carian atau kriteria tapisan cawangan/peringkat."
          />
        ) : (
          <div className="overflow-x-auto max-h-[calc(100vh-340px)] overflow-y-auto">
            <table className="w-full min-w-[780px] text-left text-xs sm:text-sm">
              <thead className="sticky top-0 z-10 bg-[#FBFCFA] text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-400 border-b border-slate-100 shadow-2xs">
                <tr>
                  <th className="w-10 px-3.5 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={filteredStudents.length > 0 && filteredStudents.every(s => selectedIds.has(s.id))}
                      onChange={e => {
                        if (e.target.checked) selectAllFiltered();
                        else deselectAllFiltered();
                      }}
                      title="Pilih / Nyahpilih semua pesilat dalam paparan"
                      className="h-3.5 w-3.5 rounded text-forest-700 focus:ring-forest-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-3.5 py-2">Nama Pesilat</th>
                  <th className="px-3.5 py-2">No. KP / ID</th>
                  <th className="px-3.5 py-2">Cawangan</th>
                  <th className="px-3.5 py-2">Peringkat</th>
                  <th className="px-3.5 py-2">Padanan Templat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map(student => {
                  const isChecked = selectedIds.has(student.id);
                  const matchedTemplate = getMatchingTemplate(student);

                  return (
                    <tr
                      key={student.id}
                      onClick={() => toggleSelect(student.id)}
                      className={`cursor-pointer transition ${isChecked ? 'bg-forest-100/30' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-3.5 py-2 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(student.id)}
                          className="h-3.5 w-3.5 rounded text-forest-700 focus:ring-forest-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-3.5 py-2 font-bold text-forest-950 text-xs sm:text-sm">
                        {student.nama_penuh}
                      </td>
                      <td className="px-3.5 py-2 text-xs font-mono text-slate-600 whitespace-nowrap">
                        {student.no_kp_atau_id}
                      </td>
                      <td className="px-3.5 py-2 text-xs text-slate-600 whitespace-nowrap">
                        {student.cawangan}
                      </td>
                      <td className="px-3.5 py-2 whitespace-nowrap">
                        <Chip color="gold">{student.peringkat}</Chip>
                      </td>
                      <td className="px-3.5 py-2 text-xs whitespace-nowrap">
                        {matchedTemplate ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 text-[10px]">
                            <CheckCircle2 size={12}/> Templat Sedia ({matchedTemplate.peringkat})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 text-[10px]">
                            <AlertCircle size={12}/> Tiada Templat
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tindakan Janaan: Fixed at bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 bg-[#FCFDFB] p-3 sm:px-4 sm:py-3 rounded-b-2xl">
          <div className="text-center sm:text-left">
            <div className="font-extrabold text-forest-950 text-xs sm:text-sm">
              {idsToGenerate.length} pesilat dipilih untuk janaan sijil
            </div>
            <p className="text-[10px] text-slate-400">
              Sijil dijana automatik mengikut peringkat dan didaftarkan ke profil pelajar.
            </p>
          </div>

          <Button
            onClick={handleGenerate}
            loading={generating}
            disabled={idsToGenerate.length === 0 || templateNames.length === 0}
            className="w-full sm:w-auto !px-5 !py-2.5 text-xs sm:text-sm font-bold shadow-md"
          >
            <Sparkles size={16}/> {generating ? `Menjana ${idsToGenerate.length} Sijil...` : `Jana ${idsToGenerate.length} Sijil Sekarang`}
          </Button>
        </div>
      </Panel>

      {/* Keputusan Janaan Sijil */}
      {result && (
        <Panel className="mt-7 border-emerald-200 bg-emerald-50/50 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-600 text-white">
              <CheckCircle2 size={26}/>
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-forest-950">Janaan Sijil Selesai!</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sebanyak <strong>{result.successCount}</strong> sijil telah berjaya dijana dan didaftarkan ke pangkalan data.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl bg-white p-4 border border-emerald-100 shadow-sm">
              <div className="text-2xl font-extrabold text-forest-950">{result.total}</div>
              <div className="text-xs text-slate-400 mt-1">Jumlah Dipilih</div>
            </div>
            <div className="rounded-xl bg-white p-4 border border-emerald-100 shadow-sm">
              <div className="text-2xl font-extrabold text-emerald-600">{result.successCount}</div>
              <div className="text-xs text-slate-400 mt-1">Berjaya Dijana</div>
            </div>
            <div className="rounded-xl bg-white p-4 border border-emerald-100 shadow-sm col-span-2 sm:col-span-1">
              <div className="text-2xl font-extrabold text-amber-600">{result.failedCount}</div>
              <div className="text-xs text-slate-400 mt-1">Dilangkau (Tiada Templat)</div>
            </div>
          </div>

          {result.failed?.length > 0 && (
            <div className="rounded-xl bg-white p-4 border border-amber-200 mb-6 text-xs text-amber-900">
              <div className="font-bold mb-2 flex items-center gap-1.5 text-amber-800">
                <AlertCircle size={15}/> Senarai pesilat yang tidak dapat dijana:
              </div>
              <ul className="space-y-1 pl-4 list-disc">
                {result.failed.map((f, i) => (
                  <li key={i}>
                    <strong>{f.nama}</strong> ({f.peringkat}): {f.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.generatedTokens?.length > 0 && (
            <div className="rounded-xl bg-white p-4 border border-emerald-100 mb-6 text-xs">
              <div className="font-bold mb-3 text-forest-950 flex items-center justify-between">
                <span>Senarai Fail Sijil PDF Dijana ({result.generatedTokens.length} fail mengikut nama pesilat):</span>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
                {result.generatedTokens.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between pt-2 first:pt-0 gap-2">
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <FileText size={15} className="text-forest-700 shrink-0"/>
                      <span className="font-semibold text-slate-800 truncate" title={`${item.nama}.pdf`}>
                        {item.nama}.pdf
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`/api/public/certificates/${item.token}/download?preview=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-forest-100 text-slate-700 font-bold inline-flex items-center gap-1"
                        title="Lihat Sijil"
                      >
                        <Eye size={13}/> Lihat
                      </a>
                      <a
                        href={`/api/public/certificates/${item.token}/download`}
                        download={`${item.nama}.pdf`}
                        className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold inline-flex items-center gap-1"
                        title="Muat Turun PDF"
                      >
                        <Download size={13}/> Muat Turun
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Link
              to="/admin/sijil"
              className="inline-flex items-center gap-2 rounded-xl bg-forest-900 px-5 py-3 text-xs font-bold text-white transition hover:bg-forest-700"
            >
              <Award size={16}/> Lihat Rekod Sijil Baharu <ArrowRight size={15}/>
            </Link>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-xs font-bold text-forest-900 transition hover:bg-slate-50"
            >
              Semak di Portal Awam
            </a>
          </div>
        </Panel>
      )}
    </>
  );
}
