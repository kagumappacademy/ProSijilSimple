import {db,defaultSettings,getSettings} from './db.js';
import {studentClient} from './studentStore.js';

export async function readStoredSettings(){
  const remote=await studentClient();
  if(!remote)return getSettings();
  const result=await remote.execute('SELECT key,value FROM settings');
  return {...defaultSettings,...Object.fromEntries(result.rows.map(row=>[row.key,row.value]))};
}

export async function saveStoredSettings(values){
  const queries=Object.entries(values).map(args=>({sql:'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',args}));
  const remote=await studentClient();
  if(queries.length){
    if(remote)await remote.batch(queries,'write');
    else{
      db.exec('BEGIN');
      try{for(const {sql,args} of queries)db.prepare(sql).run(...args);db.exec('COMMIT');}
      catch(error){db.exec('ROLLBACK');throw error;}
    }
  }
  return readStoredSettings();
}
