import {test} from 'node:test';
import assert from 'node:assert/strict';
import {templateCollections,certificateCollections,certificateBatches,certificateBatchKey} from '../../client/src/lib/certificateGroups.js';

test('Template collections keep identical titles in different certificate categories separate',()=>{
  const groups=templateCollections([{id:1,nama_template:'Program Akademi',kategori:'penyertaan',peringkat:'Semua Peringkat'},{id:2,nama_template:'Program Akademi',kategori:'penghargaan',peringkat:'Semua Peringkat'}]);
  assert.equal(groups.length,2);assert.notEqual(groups[0].key,groups[1].key);
});

test('Two generation runs with the same title and date remain two batches, including across branch filters',()=>{
  const rows=Array.from({length:291},(_,index)=>({id:index+1,nama_sijil:'Tajuk sijil',template_name:'Program Akademi',kategori:'penyertaan',tarikh_isu:'2026-11-04',created_at:'2026-11-04 12:00:00',cawangan:index%2?'Skudai':'Kulai',batch_id:index<290?'run-one':'run-two'}));
  assert.equal(certificateCollections(rows).length,1);assert.equal(certificateBatches(rows).length,2);
  const visible=rows.filter(row=>row.cawangan==='Skudai'),batchKey=certificateBatchKey(visible[0]);
  const full=certificateBatches(rows).find(batch=>batch.key===batchKey);assert.equal(full.rows.length,290);
  assert.equal(new Set(full.rows.map(row=>row.id)).size,290);assert.ok(!full.rows.some(row=>row.id===291));
});

test('Legacy records are explicitly unbatched, grouped by title and date, while preserving category boundaries',()=>{
  const base={nama_sijil:'Rekod lama',kategori:'penyertaan',tarikh_isu:'2026-11-04',jenis:'uploaded'};
  const groups=certificateBatches([{...base,id:1},{...base,id:2},{...base,id:3,tarikh_isu:'2026-11-05'},{...base,id:4,kategori:'penghargaan'}]);
  assert.equal(groups.length,3);assert.ok(groups.every(group=>group.id===null&&group.key.startsWith('unbatched:')));
  assert.equal(groups.find(group=>group.rows.some(row=>row.id===1)).rows.length,2);
});
