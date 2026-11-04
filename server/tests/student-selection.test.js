import test from 'node:test';
import assert from 'node:assert/strict';
import { matchStudentList, parseStudentList } from '../../client/src/lib/studentSelection.js';

const students = [
  { id: 1, nama_penuh: 'MUHAMMAD ADAM BIN ABDULLAH', no_kp_atau_id: '030101-01-1234', cawangan: 'Skudai', peringkat: 'Merah 1' },
  { id: 2, nama_penuh: 'SITI NUR AISYAH', no_kp_atau_id: 'PS-002', cawangan: 'Bangi', peringkat: 'Hijau 2' },
  { id: 3, nama_penuh: 'ALI BIN ABU', no_kp_atau_id: 'PS-003', cawangan: 'Skudai', peringkat: 'Kuning 1' },
  { id: 4, nama_penuh: 'ALI BIN ABU', no_kp_atau_id: 'PS-004', cawangan: 'Bangi', peringkat: 'Hijau 3' },
  { id: 5, nama_penuh: "NUR A’ISYAH, JUNIOR", no_kp_atau_id: 'PS-005', cawangan: 'Bangi', peringkat: 'Hijau 3' },
];
const match = text => matchStudentList(parseStudentList(text), students);

test('bulk list accepts numbering, bullets, BOM, blank lines and mixed line endings', () => {
  const result = match('\uFEFF\r\n1. muhammad   adam bin abdullah\r\n\n• siti nur aisyah\n3) 030101011234\r- PS002\r\n');
  assert.deepEqual(result.matches.map(student => student.id), [1, 2]);
  assert.equal(result.duplicateCount, 2);
  assert.deepEqual(result.unmatched, []);
  assert.equal(parseStudentList('\n\nmissing name')[0].line, 3);
});

test('bulk list accepts Excel names and a copied numbered column', () => {
  assert.deepEqual(match('1\tSITI NUR AISYAH\n2\tMUHAMMAD ADAM BIN ABDULLAH').matches.map(student => student.id), [2, 1]);
  assert.equal(match('Nama Penuh\r\nSITI NUR AISYAH').matches[0].id, 2);
});

test('bulk CSV accepts quoted commas and matches apostrophe variants', () => {
  const result = match('\uFEFF"nama_penuh","no_kp_atau_id","cawangan"\r\n"NUR A\'ISYAH, JUNIOR","PS005","bangi"\r\n');
  assert.deepEqual(result.matches.map(student => student.id), [5]);
  assert.deepEqual(result.unmatched, []);
  assert.equal(match('"nama_penuh"\n"SITI NUR AISYAH"').matches[0].id, 2);
});

test('bulk CSV supports name or ID headers and optional branch in tab / semicolon files', () => {
  assert.equal(match('No. KP\tcawangan\nPS004\tbangi').matches[0].id, 4);
  assert.equal(match('Nama Peserta;Nama Cawangan\nALI BIN ABU;Skudai').matches[0].id, 3);
  assert.equal(match('id\n030101011234').matches[0].id, 1);
});

test('bulk matching reports unknown or partial names instead of guessing', () => {
  const result = match('SITI\nNAMA TIDAK WUJUD\nSITI NUR AISYAH');
  assert.deepEqual(result.matches.map(student => student.id), [2]);
  assert.deepEqual(result.unmatched.map(entry => entry.line), [1, 2]);
});

test('duplicate names require a choice unless branch or ID disambiguates them', () => {
  const result = match('ALI BIN ABU');
  assert.deepEqual(result.matches, []);
  assert.deepEqual(result.ambiguous[0].candidates.map(student => student.id), [3, 4]);
  assert.equal(match('nama_penuh,cawangan\nali bin abu,Bangi').matches[0].id, 4);
  assert.equal(match('nama_penuh,no_kp_atau_id\nali bin abu,PS003').matches[0].id, 3);
});

test('a contradictory name, ID or branch never selects another student', () => {
  assert.equal(match('nama_penuh,no_kp_atau_id\nSITI NUR AISYAH,PS003').unmatched.length, 1);
  assert.equal(match('no_kp_atau_id,cawangan\nPS003,Bangi').unmatched.length, 1);
  assert.equal(match('nama_penuh,no_kp_atau_id\nSITI NUR AISYAH,PS-NOT-FOUND').unmatched.length, 1);
});

test('bulk matching deduplicates names and IDs referring to the same student', () => {
  const result = match('SITI NUR AISYAH\nsiti nur aisyah\nPS-002\nPS002');
  assert.deepEqual(result.matches.map(student => student.id), [2]);
  assert.equal(result.duplicateCount, 3);
});

test('a token matching one student name and another ID stays ambiguous', () => {
  const result = matchStudentList(parseStudentList('PS002'), [...students, { id: 6, nama_penuh: 'PS002', no_kp_atau_id: 'PS006' }]);
  assert.equal(result.ambiguous.length, 1);
  assert.deepEqual(result.ambiguous[0].candidates.map(student => student.id), [6, 2]);
});

test('bulk parser flags malformed CSV, missing multi-column headers and oversized lists', () => {
  assert.throws(() => parseStudentList('nama_penuh,id\n"SITI,PS002'), /unclosed_quote/);
  assert.throws(() => parseStudentList('SITI NUR AISYAH,PS002'), /missing_header/);
  assert.throws(() => parseStudentList(Array.from({ length: 10002 }, () => 'SITI').join('\n')), /too_many_rows/);
  assert.deepEqual(parseStudentList(' \n\r\n'), []);
});

test('all 290 names match uniquely across branches and pages, with no missing entries', () => {
  const manyStudents = Array.from({ length: 290 }, (_, index) => ({ id: index + 1, nama_penuh: `PESILAT NOMBOR ${index + 1}`, no_kp_atau_id: `PS-${index + 1}`, cawangan: index % 2 ? 'Bangi' : 'Skudai' }));
  const entries = parseStudentList(manyStudents.map((student, index) => `${index + 1}. ${student.nama_penuh.toLowerCase()}`).join('\r\n'));
  const result = matchStudentList(entries, manyStudents);
  assert.equal(result.matches.length, 290);
  assert.equal(new Set(result.matches.map(student => student.id)).size, 290);
  assert.equal(result.unmatched.length, 0);
  assert.equal(result.ambiguous.length, 0);
  assert.equal(result.duplicateCount, 0);
});
