const NAME_HEADERS = new Set(['nama', 'nama penuh', 'nama pesilat', 'nama peserta', 'nama penuh pesilat', 'name', 'full name']);
const ID_HEADERS = new Set(['no kp atau id', 'no kp', 'no kp/id', 'no kad pengenalan', 'kad pengenalan', 'no id', 'id', 'ic', 'nric', 'student id']);
const BRANCH_HEADERS = new Set(['cawangan', 'nama cawangan', 'branch']);

export function normalizeStudentName(value) {
  return String(value ?? '').normalize('NFKC').replace(/[‘’`]/g, "'").trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeId(value) {
  return normalizeStudentName(value).replace(/[\s-]+/g, '');
}

function stripListMarker(value) {
  return String(value).trim().replace(/^(?:\d{1,5}[.)]\s*|\d{1,5}\s+[-–]\s+|[-*•]\s+)/u, '').trim();
}

function readRows(text) {
  const source = String(text ?? '').replace(/^\uFEFF/, '');
  const firstLine = source.split(/\r?\n/).find(line => line.trim()) || '';
  // Separators inside quoted CSV fields do not determine the file's delimiter.
  const unquoted = firstLine.replace(/"(?:[^"]|"")*"/g, '');
  const delimiter = ['\t', ';', ','].find(char => unquoted.includes(char));
  const rows = [];
  let cells = [], value = '', quoted = false, line = 1, rowLine = 1;
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === '"') {
      if (quoted && source[index + 1] === '"') { value += '"'; index++; }
      else if (quoted || !value.trim()) quoted = !quoted;
      else value += char;
    } else if (char === delimiter && !quoted) {
      cells.push(value.trim()); value = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[index + 1] === '\n') index++;
      cells.push(value.trim()); rows.push({ cells, line: rowLine });
      cells = []; value = ''; line++; rowLine = line;
    } else {
      value += char;
      if (char === '\n') line++;
    }
  }
  if (quoted) throw new Error('unclosed_quote');
  cells.push(value.trim()); rows.push({ cells, line: rowLine });
  return rows;
}

export function parseStudentList(text) {
  const rows = readRows(text).filter(row => row.cells.some(cell => cell.trim()));
  if (rows.length === 0) return [];
  if (rows.length > 10001) throw new Error('too_many_rows');
  const headers = rows[0].cells.map(cell => normalizeStudentName(cell).replace(/[_-]+/g, ' ').replace(/\./g, '').replace(/\s*\/\s*/g, '/'));
  const nameColumn = headers.findIndex(header => NAME_HEADERS.has(header));
  const idColumn = headers.findIndex(header => ID_HEADERS.has(header));
  const branchColumn = headers.findIndex(header => BRANCH_HEADERS.has(header));
  const hasHeader = nameColumn >= 0 || idColumn >= 0;
  const entries = (hasHeader ? rows.slice(1) : rows).map(row => {
    const cell = index => index >= 0 ? String(row.cells[index] ?? '').trim() : '';
    if (hasHeader) {
      const name = stripListMarker(cell(nameColumn)), identifier = cell(idColumn), branch = cell(branchColumn);
      return { line: row.line, name, identifier, branch, label: [name, identifier, branch].filter(Boolean).join(' · ') };
    }
    // A copied two-column numbered list is also accepted without a header.
    const numbered = row.cells.length === 2 && /^\d{1,5}[.)]?$/.test(cell(0));
    if (row.cells.length > 1 && !numbered) throw new Error('missing_header');
    const token = stripListMarker(cell(numbered ? 1 : 0));
    return { line: row.line, token, label: token };
  });
  if (entries.length > 10000) throw new Error('too_many_rows');
  return entries;
}

export function matchStudentList(entries, students) {
  const byName = new Map(), byId = new Map();
  const add = (map, key, student) => {
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(student);
  };
  for (const student of students) {
    add(byName, normalizeStudentName(student.nama_penuh), student);
    add(byId, normalizeId(student.no_kp_atau_id), student);
  }
  const matches = [], unmatched = [], ambiguous = [], selected = new Set();
  let duplicateCount = 0;
  for (const entry of entries) {
    let candidates;
    if (entry.token !== undefined) {
      candidates = [...new Map([
        ...(byName.get(normalizeStudentName(entry.token)) || []),
        ...(byId.get(normalizeId(entry.token)) || []),
      ].map(student => [student.id, student])).values()];
    } else {
      candidates = entry.identifier ? byId.get(normalizeId(entry.identifier)) || [] : byName.get(normalizeStudentName(entry.name)) || [];
      if (entry.name) candidates = candidates.filter(student => normalizeStudentName(student.nama_penuh) === normalizeStudentName(entry.name));
      if (entry.branch) candidates = candidates.filter(student => normalizeStudentName(student.cawangan) === normalizeStudentName(entry.branch));
    }
    if (candidates.length === 0) unmatched.push(entry);
    else if (candidates.length > 1) ambiguous.push({ ...entry, candidates });
    else if (selected.has(candidates[0].id)) duplicateCount++;
    else { selected.add(candidates[0].id); matches.push(candidates[0]); }
  }
  return { matches, unmatched, ambiguous, duplicateCount };
}
