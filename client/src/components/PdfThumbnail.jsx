import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { RotateCw, FileText, Sparkles } from 'lucide-react';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

// In-memory buffer cache to avoid re-fetching the same template repeatedly on mobile
const pdfBufferCache = new Map();

export function PdfThumbnail({ url, className = '', title = 'Sijil', scale = 0.7, pageNum = 1 }) {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let renderTask = null;
    const abortCtrl = new AbortController();

    async function renderPage() {
      setLoading(true);
      setError(false);
      try {
        let arrayBuffer = pdfBufferCache.get(url);
        if (!arrayBuffer) {
          const response = await fetch(url, {
            credentials: 'same-origin',
            signal: abortCtrl.signal,
          });
          if (!response.ok) throw new Error('HTTP ' + response.status);
          arrayBuffer = await response.arrayBuffer();
          if (arrayBuffer && arrayBuffer.byteLength > 0) {
            pdfBufferCache.set(url, arrayBuffer);
          }
        }

        if (!active) return;

        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
        });
        const pdf = await loadingTask.promise;
        if (!active) return;

        const totalPages = pdf.numPages || 1;
        const targetPage = Math.min(Math.max(1, pageNum), totalPages);
        const page = await pdf.getPage(targetPage);
        if (!active) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d', { alpha: false });
        const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
        const viewport = page.getViewport({ scale: (scale || 0.7) * dpr });

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.style.width = '100%';
        canvas.style.height = '100%';

        renderTask = page.render({
          canvasContext: context,
          viewport: viewport,
        });

        await renderTask.promise;
        if (active) {
          setLoading(false);
          setError(false);
        }
      } catch (err) {
        if (err.name !== 'AbortError' && active) {
          console.warn('PDF thumbnail load error:', err);
          // If first attempt failed on mobile network or canvas race, auto-retry once after 800ms
          if (attempt < 2) {
            const timer = setTimeout(() => {
              if (active) setAttempt((a) => a + 1);
            }, 800);
            return () => clearTimeout(timer);
          } else {
            setError(true);
            setLoading(false);
          }
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
  }, [url, scale, pageNum, attempt]);

  return (
    <div className={`relative overflow-hidden bg-slate-50 flex items-center justify-center ${className}`}>
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50/95 text-slate-400 p-2 text-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
          <span className="mt-1.5 text-[9px] font-bold text-slate-500">Memuatkan sijil...</span>
        </div>
      )}

      {error ? (
        <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center bg-gradient-to-b from-red-50/30 to-slate-50">
          <div className="rounded-xl border border-red-100 bg-white p-2.5 shadow-2xs w-full max-w-[130px] flex flex-col items-center">
            <div className="h-7 w-7 rounded-lg bg-red-50 text-red-700 grid place-items-center mb-1">
              <FileText size={14} />
            </div>
            <div className="text-[9.5px] font-extrabold text-slate-900 truncate w-full" title={title}>
              {title}
            </div>
            <span className="mt-0.5 text-[8.5px] font-semibold text-slate-400">PDF Rasmi</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                pdfBufferCache.delete(url);
                setAttempt(0);
              }}
              className="mt-2 inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[8.5px] font-bold text-red-700 hover:bg-red-100 transition border border-red-200/60 active:scale-95"
            >
              <RotateCw size={9} />
              <span>Muat Semula</span>
            </button>
          </div>
        </div>
      ) : (
        <canvas ref={canvasRef} className="h-full w-full object-contain pointer-events-none" />
      )}
    </div>
  );
}
