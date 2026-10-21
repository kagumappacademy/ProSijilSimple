import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: path.join(projectRoot, '.env') });
export const port = Number(process.env.PORT || 4000);
export const production = process.env.NODE_ENV === 'production';
export const dataDir = path.resolve(projectRoot, process.env.DATA_DIR || './server/data');
export const portalUrl = (process.env.PORTAL_URL || 'http://localhost:5173').replace(/\/$/, '');
export const jwtSecret = process.env.JWT_SECRET || '';
if (production && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET mesti sekurang-kurangnya 32 aksara dalam production.');
}
