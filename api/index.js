import app from '../server/src/app.js';
import { syncWithTursoIfAvailable } from '../server/src/db.js';

let syncPromise = null;

export default async function handler(req, res) {
  if (!syncPromise) {
    syncPromise = syncWithTursoIfAvailable().catch((err) => {
      console.warn('Vercel cold start sync warning:', err.message);
    });
  }
  await syncPromise;
  return app(req, res);
}
