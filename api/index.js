import app from '../server/src/app.js';

export default async function handler(req, res) {
  try {
    // In Vercel serverless rewrites, req.url may be rewritten to '/api' or '/api/index.js'
    // Ensure Express receives the actual requested path
    if (req.url === '/api' || req.url === '/api/' || req.url === '/api/index.js' || req.url.startsWith('/api/index.js?')) {
      const actualPath = req.headers['x-matched-path'] || req.headers['x-invoke-path'] || req.originalUrl;
      if (actualPath && actualPath.startsWith('/api/')) {
        req.url = actualPath;
      }
    }

    // Routes read authoritative records directly; no full database copy per request.
    return app(req, res);
  } catch (error) {
    console.error('[API Serverless Error]:', error);
    return res.status(500).json({
      error: error.message || 'Ralat pelayan Vercel semasa memproses permintaan.',
      details: error.stack
    });
  }
}
