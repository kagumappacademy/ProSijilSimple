import bcrypt from 'bcryptjs';
import { db } from '../src/db.js';
const args=process.argv.slice(2);
const get=flag=>{const i=args.indexOf(flag);return i>=0?args[i+1]:null;};
const username=get('--username');const password=get('--password');
if(!username||!password){console.error('Penggunaan: npm run admin:create -- --username admin --password "kata-laluan-12-aksara"');process.exit(1);}
if(!/^[a-zA-Z0-9_.-]{3,40}$/.test(username)){console.error('Username 3–40 aksara: huruf, nombor, _, -, .');process.exit(1);}
if(password.length<12||password.length>128){console.error('Kata laluan mestilah 12–128 aksara.');process.exit(1);}
const hash=bcrypt.hashSync(password,12);
try{
 db.prepare('INSERT INTO admin_users(username,password_hash) VALUES (?,?) ON CONFLICT(username) DO UPDATE SET password_hash=excluded.password_hash').run(username,hash);
 console.log('Admin berjaya disediakan:',username);
}catch(e){console.error('Gagal:',e.message);process.exit(1);}
