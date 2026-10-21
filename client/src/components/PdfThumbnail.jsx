import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

export function PdfThumbnail({ url, className = '', title = 'Sijil' }) {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let renderTask = null;
    const abortCtrl = new AbortController();

    async function renderPage() {
      setLoading(true);
      setError(false);
      try {
        const response = await fetch(url, {
          credentials: 'same-origin',
          signal: abortCtrl.signal,
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const arrayBuffer = await response.arrayBuffer();
        if (!active) return;

        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
        });
        const pdf = await loadingTask.promise;
        if (!active) return;

        const page = await pdf.getPage(1);
        if (!active) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        // A4 ratio scale
        const viewport = page.getViewport({ scale: 0.55 });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        renderTask = page.render({
          canvasContext: context,
          viewport: viewport,
        });

        await renderTask.promise;
        if (active) setLoading(false);
      } catch (err) {
        if (err.name !== 'AbortError' && active) {
          console.warn('PDF thumbnail fallback:', err);
          setError(true);
          setLoading(false);
        }
      }
    }

    renderPage();

    return () => {
      active = false;
      abortCtrl.abort();
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch (_) {}
      }
    };
  }, [url]);

  return (
    <div className={`relative overflow-hidden bg-slate-50 flex items-center justify-center ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/90 text-slate-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
          <span className="mt-1.5 text-[10px] font-semibold text-slate-500">Memuatkan sijil...</span>
        </div>
      )}

      {error ? (
        <div className="flex h-full w-full flex-col items-center justify-center p-3 text-center bg-amber-50/40">
          <div className="rounded-xl border border-amber-200 bg-white p-3 shadow-xs">
            <div className="text-[11px] font-bold text-slate-950">{title}</div>
            <div className="mt-1 text-[9px] text-slate-400">Klik untuk melihat fail PDF</div>
          </div>
        </div>
      ) : (
        <canvas ref={canvasRef} className="h-full w-full object-contain pointer-events-none" />
      )}
    </div>
  );
}
