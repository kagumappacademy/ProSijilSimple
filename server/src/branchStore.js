import {db} from './db.js';
import {readRows,studentClient} from './studentStore.js';
import {SEED_BRANCHES_SQL} from './branchSchema.js';

async function catalogClient(){
 const remote=await studentClient();
 if(remote)await remote.execute(SEED_BRANCHES_SQL);
 else db.exec(SEED_BRANCHES_SQL);
 return remote;
}

export async function listBranches(){
 await catalogClient();
 return readRows(`SELECT c.*,
   (SELECT count(*) FROM pesilat p WHERE trim(p.cawangan)=c.nama_cawangan COLLATE NOCASE) AS pesilat_count,
   (SELECT count(*) FROM sijil s JOIN pesilat p ON p.id=s.pesilat_id
    WHERE trim(p.cawangan)=c.nama_cawangan COLLATE NOCASE) AS sijil_count
   FROM cawangan c ORDER BY c.nama_cawangan COLLATE NOCASE`);
}

export async function saveBranch(body,id=null){
 const name=String(body.nama_cawangan??'').trim().replace(/\s+/g,' ');
 const description=String(body.keterangan??'').trim();
 if(name.length<2 || name.length>160)throw Object.assign(new Error('Nama cawangan mestilah 2 hingga 160 aksara.'),{status:400});
 if(description.length>500)throw Object.assign(new Error('Keterangan cawangan maksimum 500 aksara.'),{status:400});
 const remote=await catalogClient();
 if(!id){
  const sql='INSERT INTO cawangan(nama_cawangan,keterangan) VALUES(?,?) RETURNING *';
  return remote?(await remote.execute({sql,args:[name,description]})).rows[0]:db.prepare(sql).get(name,description);
 }
 // Rename the catalog entry and every member in one transaction. A duplicate
 // name rolls the entire operation back, including all student changes.
 const statements=[
  {sql:`UPDATE pesilat SET cawangan=?,updated_at=datetime('now')
    WHERE trim(cawangan)=(SELECT nama_cawangan FROM cawangan WHERE id=?) COLLATE NOCASE`,args:[name,id]},
  {sql:"UPDATE cawangan SET nama_cawangan=?,keterangan=?,updated_at=datetime('now') WHERE id=? RETURNING *",args:[name,description,id]},
 ];
 if(remote)return (await remote.batch(statements,'write'))[1].rows[0]||null;
 db.exec('BEGIN');
 try{
  db.prepare(statements[0].sql).run(...statements[0].args);
  const row=db.prepare(statements[1].sql).get(...statements[1].args);
  db.exec('COMMIT');return row||null;
 }catch(error){db.exec('ROLLBACK');throw error;}
}
