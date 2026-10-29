import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../server/src/db.js';
import { isTursoConfigured, getTursoClient } from '../server/src/turso.js';

async function generateThumbnails() {
  console.log('[Thumbnail Generator] Memulakan...');

  // 1. Ambil semua templat dari SQLite tempatan
  const templates = db.prepare('SELECT id, nama_template, peringkat, file_base64 FROM template_sijil').all();
  console.log(`[Thumbnail Generator] Dijumpai ${templates.length} templat.`);

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const userDataDir = 'C:\\Users\\syafi\\AppData\\Local\\Temp\\edge_cdp_thumbs';
  fs.mkdirSync(userDataDir, { recursive: true });

  const proc = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${userDataDir}`
  ]);

  try {
    await new Promise(r => setTimeout(r, 2000));
    
    // Buka target tab baru
    const targetRes = await fetch('http://127.0.0.1:9222/json/new', { method: 'PUT' });
    const target = await targetRes.json();
    const wsUrl = target.webSocketDebuggerUrl;

    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let idCounter = 1;
    const callbacks = new Map();
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        callbacks.get(msg.id)(msg);
        callbacks.delete(msg.id);
      }
    };

    function sendCmd(method, params = {}) {
      return new Promise((resolve) => {
        const id = idCounter++;
        callbacks.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await sendCmd('Page.enable');
    await sendCmd('Runtime.enable');

    // Buat fail HTML sementara untuk render PDF.js
    const htmlPath = path.resolve('server/temp_pdf_render.html');
    fs.writeFileSync(htmlPath, `<!DOCTYPE html>
<html>
<head>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
</head>
<body>
  <canvas id="c"></canvas>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    window.renderPdfBase64 = async function(b64) {
      const bin = atob(b64);
      const len = bin.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
      const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
      const page = await doc.getPage(1);
      const viewport = page.getViewport({ scale: 0.5 });
      const canvas = document.getElementById('c');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;
      return canvas.toDataURL('image/jpeg', 0.82);
    };
    window.isReady = true;
  </script>
</body>
</html>`);

    const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
    await sendCmd('Page.navigate', { url: fileUrl });
    
    // Tunggu sehingga PDF.js sedia
    for (let i = 0; i < 30; i++) {
      const check = await sendCmd('Runtime.evaluate', { expression: 'typeof window.renderPdfBase64 === "function"' });
      if (check.result?.result?.value === true) break;
      await new Promise(r => setTimeout(r, 500));
    }
    console.log('[Thumbnail Generator] PDF.js sedia dalam enjin Edge.');

    let turso = null;
    if (isTursoConfigured()) {
      turso = getTursoClient();
    }

    for (const t of templates) {
      if (!t.file_base64) {
        console.warn(`[Skip] Templat ID ${t.id} (${t.peringkat}) tiada file_base64`);
        continue;
      }
      console.log(`[Processing] ID ${t.id}: ${t.nama_template} - ${t.peringkat}...`);
      
      const evalRes = await sendCmd('Runtime.evaluate', {
        expression: `window.renderPdfBase64(${JSON.stringify(t.file_base64)})`,
        awaitPromise: true,
        returnByValue: true
      });

      const thumbDataUrl = evalRes.result?.result?.value;
      if (thumbDataUrl && thumbDataUrl.startsWith('data:image/')) {
        console.log(`  -> Berjaya hasilkan thumbnail (${thumbDataUrl.length} aksara / ~${Math.round(thumbDataUrl.length/1024)} KB)`);
        
        // Simpan ke SQLite tempatan
        db.prepare('UPDATE template_sijil SET thumbnail_base64=? WHERE id=?').run(thumbDataUrl, t.id);

        // Simpan ke Turso Cloud
        if (turso) {
          try {
            await turso.execute({
              sql: 'UPDATE template_sijil SET thumbnail_base64=? WHERE id=?',
              args: [thumbDataUrl, t.id]
            });
            console.log(`  -> Berjaya dikemas kini ke Turso Cloud`);
          } catch (te) {
            console.warn(`  -> Gagal ke Turso Cloud:`, te.message);
          }
        }
      } else {
        console.error(`  -> Ralat render:`, evalRes.result);
      }
    }

    // Bersihkan fail temp
    try { fs.unlinkSync(htmlPath); } catch (_) {}
    ws.close();
    console.log('[Thumbnail Generator] Selesai sepenuhnya!');
  } finally {
    proc.kill('SIGKILL');
  }
}

generateThumbnails().catch(console.error);
