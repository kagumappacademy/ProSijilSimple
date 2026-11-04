import jwt from 'jsonwebtoken';
import { readRows } from './studentStore.js';
import { production, jwtSecret } from './config.js';
const key = jwtSecret || 'development_only_key_do_not_use_in_production';
export const cookieName = 'prosijil_admin';
export const cookieOptions = {
 httpOnly: true, secure: production, sameSite: 'lax', path: '/', maxAge: 8 * 60 * 60 * 1000
};
export function setSession(res, admin) {
 const token = jwt.sign({ sub: String(admin.id), username: admin.username }, key, { expiresIn: '8h', issuer: 'prosijil' });
 res.cookie(cookieName, token, cookieOptions);
}
export async function requireAdmin(req, res, next) {
 let payload;
 try {
   const token = req.cookies?.[cookieName];
   if (!token) return res.status(401).json({ error: 'Sila log masuk sebagai admin.' });
   payload = jwt.verify(token, key, { issuer: 'prosijil' });
   if(!Number.isSafeInteger(Number(payload.sub))||Number(payload.sub)<=0)return res.status(401).json({error:'Sesi tidak sah.'});
 } catch { return res.status(401).json({ error: 'Sesi tamat. Sila log masuk semula.' }); }
 try {
   const [admin] = await readRows('SELECT id, username FROM admin_users WHERE id=?',[Number(payload.sub)]);
   if (!admin) return res.status(401).json({ error: 'Sesi tidak sah.' });
   req.admin = admin;
   next();
 } catch(error) { next(Object.assign(new Error('Sesi pentadbir tidak dapat disemak buat masa ini. Sila cuba lagi.'),{status:503,cause:error})); }
}
