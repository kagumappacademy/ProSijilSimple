import app from '../server/src/app.js';
import { syncWithTursoIfAvailable } from '../server/src/db.js';

let lastSync = 0;
let inFlightSync = null;

async function ensureFreshTursoData(force = false) {
  const now = Date.now();
  // Sync on cold start, if forced, or at least every 45 seconds for warm instances
  if (force || !lastSync || now - lastSync > 45_000) {
    if (!inFlightSync) {
      inFlightSync = syncWithTursoIfAvailable()
        .then(() => {
          lastSync = Date.now();
        })
        .catch((err) => {
          console.warn('Vercel sync warning:', err.message);
        })
        .finally(() => {
          inFlightSync = null;
        });
    }
    await inFlightSync;
  }
}

export default async function handler(req, res) {
  try {
    const force = req.query?.force_sync === '1';
    await ensureFreshTursoData(force);

    // In Vercel serverless rewrites, req.url may be rewritten to '/api' or '/api/index.js'
    // Ensure Express receives the actual requested path
    if (req.url === '/api' || req.url === '/api/' || req.url === '/api/index.js' || req.url.startsWith('/api/index.js?')) {
      const actualPath = req.headers['x-matched-path'] || req.headers['x-invoke-path'] || req.originalUrl;
      if (actualPath && actualPath.startsWith('/api/')) {
        req.url = actualPath;
      }
    }

    return app(req, res);
  } catch (error) {
    console.error('[API Serverless Error]:', error);
    return res.status(500).json({
      error: error.message || 'Ralat pelayan Vercel semasa memproses permintaan.',
      details: error.stack
    });
  }
}
