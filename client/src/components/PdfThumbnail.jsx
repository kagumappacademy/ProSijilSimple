import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { RotateCw } from 'lucide-react';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

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

        const totalPages = pdf.numPages || 1;
        const targetPage = Math.min(Math.max(1, pageNum), totalPages);
        const page = await pdf.getPage(targetPage);
        if (!active) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        const viewport = page.getViewport({ scale: scale || 0.7 });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

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
          // If first attempt failed on mobile network hiccup, auto-retry once after 1s
          if (attempt === 0) {
            setTimeout(() => {
              if (active) setAttempt(1);
            }, 1000);
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
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50/95 backdrop-blur-2xs text-slate-400 p-2 text-center select-none">
          <div className="relative flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-red-600 animate-spin" />
            <img
              src="/logo-prosijil.png"
              alt="ProSijil"
              className="absolute h-4 w-4 object-contain"
            />
          </div>
          <span className="mt-2 text-[9.5px] font-bold text-slate-500 tracking-tight">Memuatkan sijil...</span>
        </div>
      )}

      {error ? (
        <div className="flex h-full w-full flex-col items-center justify-center p-2.5 text-center bg-amber-50/40">
          <div className="rounded-xl border border-amber-200 bg-white p-2.5 shadow-xs w-full max-w-[140px]">
            <div className="text-[10px] font-bold text-slate-900 truncate" title={title}>{title}</div>
            <div className="mt-0.5 text-[8.5px] text-slate-400">Pratonton gagal dimuat</div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAttempt((a) => a + 1);
              }}
              className="mt-2 inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-700 hover:bg-red-100 transition border border-red-200/60"
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
