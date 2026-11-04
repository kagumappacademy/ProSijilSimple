import { db } from './db.js';
import { studentClient } from './studentStore.js';

const statements = [
  // All students contribute to both breakdowns. Do not truncate either dataset.
  'SELECT peringkat,cawangan,count(*) AS total FROM pesilat GROUP BY peringkat,cawangan ORDER BY min(id)',
  'SELECT nama_cawangan FROM cawangan ORDER BY id',
  'SELECT count(*) AS n FROM sijil s JOIN pesilat p ON p.id=s.pesilat_id',
  `SELECT s.id,s.nama_sijil,s.tarikh_isu,s.kategori,s.created_at,p.nama_penuh,p.cawangan
    FROM sijil s JOIN pesilat p ON p.id=s.pesilat_id
    ORDER BY s.created_at DESC,s.id DESC LIMIT 6`,
];
const cleanName = value => String(value ?? '').trim().replace(/\s+/g, ' ');
const keyFor = value => cleanName(value).toLowerCase();
const unassignedBranch = value => !keyFor(value) || keyFor(value) === 'tidak dinyatakan';
const ordered = rows => rows.sort((first, second) => second.total - first.total || first.name.localeCompare(second.name, 'ms'));

export async function readDashboard() {
  const remote = await studentClient();
  let results;
  if (remote) {
    // One read transaction, so concurrent imports/generation cannot mix snapshots.
    results = (await remote.batch(statements, 'read')).map(result => result.rows);
  } else {
    db.exec('BEGIN');
    try {
      results = statements.map(sql => db.prepare(sql).all());
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  const [studentGroups, catalog, certificateCounts, recent] = results;
  const levels = new Map(), branches = new Map();
  // Prefer the catalog's spelling and retain registered branches with no members.
  for (const row of catalog) {
    const name = cleanName(row.nama_cawangan);
    if (!unassignedBranch(name) && !branches.has(keyFor(name))) branches.set(keyFor(name), { name, total: 0 });
  }
  let pesilat = 0, unassignedBranchStudents = 0;
  for (const row of studentGroups) {
    const count = Number(row.total);
    pesilat += count;
    const level = cleanName(row.peringkat) || 'Belum ditetapkan';
    if (!levels.has(keyFor(level))) levels.set(keyFor(level), { name: level, total: 0 });
    levels.get(keyFor(level)).total += count;
    const branch = cleanName(row.cawangan);
    if (unassignedBranch(branch)) { unassignedBranchStudents += count; continue; }
    if (!branches.has(keyFor(branch))) branches.set(keyFor(branch), { name: branch, total: 0 });
    branches.get(keyFor(branch)).total += count;
  }
  const byBranch = [...branches.values()];
  if (unassignedBranchStudents) byBranch.push({ name: 'Tidak dinyatakan', total: unassignedBranchStudents });
  return {
    pesilat, sijil: Number(certificateCounts[0].n), branches: branches.size,
    byLevel: ordered([...levels.values()]), byBranch: ordered(byBranch), recent,
    unassignedBranchStudents, updatedAt: new Date().toISOString(),
  };
}
