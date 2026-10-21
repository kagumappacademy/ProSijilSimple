import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, CheckCircle2, AlertCircle, Award, Layers, Search, CalendarDays, Filter, ArrowRight, CheckSquare, Square, RefreshCw, FileText } from 'lucide-react';
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
      const res = await api('/admin/students?limit=9999&page=1');
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

  // Filter students
  const filteredStudents = students.filter(s => {
    if (selectedBranch && s.cawangan !== selectedBranch) return false;
    if (selectedLevel && s.peringkat !== selectedLevel) return false;
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
    const match = currentTemplatesForName.find(
      t => t.peringkat.trim().toLowerCase() === student.peringkat.trim().toLowerCase()
    );
    if (match) return match;
    const universal = currentTemplatesForName.find(
      t => t.peringkat.trim().toLowerCase() === 'semua peringkat'
    );
    return universal || null;
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

  // Handle batch generation
  async function handleGenerate() {
    const idsToGenerate = filteredStudents
      .map(s => s.id)
      .filter(id => selectedIds.has(id));

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
      <Panel className="p-6 sm:p-8 mb-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-5 mb-5">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-forest-100 text-forest-700">
            <Sparkles size={24}/>
          </div>
          <div>
            <h2 className="text-base font-extrabold text-forest-950">Langkah 1: Pilih Templat & Tarikh Sijil</h2>
            <p className="text-xs text-slate-400 mt-0.5">Sistem akan memilih fail templat PDF yang sepadan dengan peringkat setiap pesilat.</p>
          </div>
        </div>

        {templateNames.length === 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
            <AlertCircle size={32} className="mx-auto text-amber-600 mb-2"/>
            <h3 className="font-bold text-amber-950 text-sm">Tiada Templat Sijil Ditemui</h3>
            <p className="text-xs text-amber-800 mt-1 max-w-md mx-auto">
              Sila muat naik sekurang-kurangnya satu fail templat PDF pada menu Templat Sijil terlebih dahulu.
            </p>
            <Link
              to="/admin/templates"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-forest-900 px-4 py-2 text-xs font-bold text-white hover:bg-forest-700"
            >
              <Layers size={14}/> Pergi ke Menu Templat Sijil
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-600">Pilih Tajuk / Kumpulan Templat *</label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-forest-950 outline-none focus:border-forest-600 focus:ring-4 focus:ring-forest-100"
                value={selectedTemplateName}
                onChange={e => setSelectedTemplateName(e.target.value)}
              >
                {templateNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>

              <div className="mt-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Peringkat yang mempunyai fail templat:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {currentTemplatesForName.map(t => (
                    <Chip key={t.id} color="emerald">
                      {t.peringkat}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Input
                label="Tarikh Dikeluarkan pada Sijil *"
                type="date"
                required
                value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
              />
              <div className="mt-3 rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                <strong>Spesifikasi Janaan:</strong> Nama pesilat akan dicetak di atas garisan nama Page 1 menggunakan fon <strong>Lora (Saiz 20, #c1362d)</strong>, dan Page 2 dikekalkan sepenuhnya.
              </div>
            </div>
          </div>
        )}
      </Panel>

      {/* Pemilihan Pesilat */}
      <Panel>
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Award className="text-forest-700" size={20}/>
              <h2 className="text-sm font-extrabold text-forest-950">Langkah 2: Pilih Pesilat untuk Dijana</h2>
              <Chip color="gold">{selectedIds.size} dipilih</Chip>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Tandakan pesilat yang layak menerima sijil ini.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Cari pesilat..."
            />
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600 outline-none"
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
            >
              <option value="">Semua Cawangan</option>
              {branches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600 outline-none"
              value={selectedLevel}
              onChange={e => setSelectedLevel(e.target.value)}
            >
              <option value="">Semua Peringkat</option>
              {levels.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick select buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FBFCFA] px-5 py-3 border-b border-slate-100 text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={selectAllFiltered}
              className="font-bold text-forest-800 hover:underline inline-flex items-center gap-1.5"
            >
              <CheckSquare size={15}/> Pilih Semua ({filteredStudents.length})
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={deselectAllFiltered}
              className="font-bold text-slate-500 hover:underline inline-flex items-center gap-1.5"
            >
              <Square size={15}/> Nyahpilih Semua
            </button>
          </div>
          <span className="text-slate-400">
            Memaparkan {filteredStudents.length} daripada {students.length} pesilat
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-[#FBFCFA] text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-400">
                <tr>
                  <th className="w-12 px-5 py-4 text-center">Pilih</th>
                  <th className="px-5 py-4">Nama Pesilat</th>
                  <th className="px-5 py-4">No. KP / ID</th>
                  <th className="px-5 py-4">Cawangan</th>
                  <th className="px-5 py-4">Peringkat</th>
                  <th className="px-5 py-4">Padanan Templat</th>
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
                      className={`cursor-pointer transition ${isChecked ? 'bg-forest-100/35' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-5 py-4 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(student.id)}
                          className="h-4 w-4 rounded text-forest-700 focus:ring-forest-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-5 py-4 font-bold text-forest-950">
                        {student.nama_penuh}
                      </td>
                      <td className="px-5 py-4 text-xs font-mono text-slate-600">
                        {student.no_kp_atau_id}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600">
                        {student.cawangan}
                      </td>
                      <td className="px-5 py-4">
                        <Chip color="gold">{student.peringkat}</Chip>
                      </td>
                      <td className="px-5 py-4 text-xs">
                        {matchedTemplate ? (
                          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                            <CheckCircle2 size={13}/> Templat Sedia ({matchedTemplate.peringkat})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                            <AlertCircle size={13}/> Tiada Templat Padan
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

        {/* Tindakan Janaan */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-[#FCFDFB] p-6 rounded-b-[22px]">
          <div>
            <div className="font-extrabold text-forest-950 text-base">
              {selectedIds.size} pesilat sedia untuk janaan sijil
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Sijil yang dijana akan dimasukkan terus ke dalam senarai sijil pelajar dan boleh disemak di portal awam.
            </p>
          </div>

          <Button
            onClick={handleGenerate}
            loading={generating}
            disabled={selectedIds.size === 0 || templateNames.length === 0}
            className="!px-6 !py-3 text-base shadow-lg"
          >
            <Sparkles size={18}/> Jana Sijil Sekarang
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
