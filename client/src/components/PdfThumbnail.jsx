import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { RotateCw, FileText, Image as ImageIcon } from 'lucide-react';

if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker || 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  } catch (_) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  }
}

// In-memory buffer cache & in-flight deduplication
const pdfBufferCache = new Map();
const inflightPdfFetches = new Map();

async function getPdfBuffer(url) {
  if (pdfBufferCache.has(url)) return pdfBufferCache.get(url);
  if (inflightPdfFetches.has(url)) return inflightPdfFetches.get(url);

  const fetchPromise = (async () => {
    const response = await fetch(url, { credentials: 'same-origin' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const buf = await response.arrayBuffer();
    if (buf && buf.byteLength > 0) {
      pdfBufferCache.set(url, buf);
    }
    return buf;
  })().finally(() => {
    inflightPdfFetches.delete(url);
  });

  inflightPdfFetches.set(url, fetchPromise);
  return fetchPromise;
}

export async function renderPdfBlobToDataUrl(blobOrArrayBuffer, pageNum = 1, scale = 1.3) {
  try {
    const data = blobOrArrayBuffer instanceof ArrayBuffer
      ? new Uint8Array(blobOrArrayBuffer)
      : new Uint8Array(await blobOrArrayBuffer.arrayBuffer());

    const loadingTask = pdfjsLib.getDocument({
      data,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
    });
    const pdf = await loadingTask.promise;
    const targetPage = Math.min(Math.max(1, pageNum), pdf.numPages || 1);
    const page = await pdf.getPage(targetPage);
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    const viewport = page.getViewport({ scale: (scale || 1.3) * dpr });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d', { alpha: false });
    await page.render({ canvasContext: context, viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.88);
  } catch (err) {
    console.warn('renderPdfBlobToDataUrl error:', err);
    throw err;
  }
}

export async function renderPdfUrlToDataUrl(url, pageNum = 1, scale = 1.3) {
  const buf = await getPdfBuffer(url);
  return renderPdfBlobToDataUrl(buf, pageNum, scale);
}

export function PdfThumbnail({
  url,
  thumbnail = null,
  templateId = null,
  className = '',
  title = 'Sijil',
  scale = 0.7,
  pageNum = 1,
}) {
  const canvasRef = useRef(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [localThumb, setLocalThumb] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Check localStorage if no thumbnail prop provided
  const cacheKey = templateId ? `tpl_${templateId}` : (url ? encodeURIComponent(url) : null);
  useEffect(() => {
    if (!thumbnail && cacheKey && typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('pdf_thumb_' + cacheKey);
        if (cached && cached.startsWith('data:image/')) {
          setLocalThumb(cached);
        }
      } catch (_) {}
    }
  }, [thumbnail, cacheKey]);

  // Reset imgFailed and error whenever thumbnail or templateId prop changes
  useEffect(() => {
    if (thumbnail) {
      setImgFailed(false);
      setError(false);
    }
  }, [thumbnail, templateId]);

  // Compute effective image thumbnail (Direct base64 or server-rendered JPEG thumbnail)
  const effectiveThumb = useMemo(() => {
    if (imgFailed) return null;
    const t = thumbnail || localThumb;
    if (t) {
      if (t.startsWith('data:image/') || t.startsWith('http://') || t.startsWith('https://')) {
        return t;
      }
      return `data:image/jpeg;base64,${t}`;
    }
    // Jika tiada base64 dalam props, gunakan endpoint imej thumbnail pelayan secara langsung (0ms render)
    if (templateId) {
      return `/api/admin/templates/${templateId}/thumbnail`;
    }
    return null;
  }, [thumbnail, localThumb, templateId, imgFailed]);

  // If effective thumbnail exists, no need to download or render PDF!
  useEffect(() => {
    if (effectiveThumb) {
      setLoading(false);
      setError(false);
      return;
    }

    if (!url) {
      setError(true);
      return;
    }

    let active = true;
    let renderTask = null;

    async function renderPage() {
      setLoading(true);
      setError(false);

      try {
        const arrayBuffer = await getPdfBuffer(url);
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

          // Save generated thumbnail to localStorage & server for future zero-second loading
          try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
            if (cacheKey) {
              try { localStorage.setItem('pdf_thumb_' + cacheKey, dataUrl); } catch (_) {}
            }
            if (templateId && pageNum === 1) {
              fetch(`/api/admin/templates/${templateId}/thumbnail`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ thumbnail: dataUrl }),
              }).catch(() => {});
            }
          } catch (_) {}
        }
      } catch (err) {
        if (err.name !== 'AbortError' && active) {
          console.warn('PDF thumbnail load error:', err);
          if (attempt < 2) {
            const timer = setTimeout(() => {
              if (active) setAttempt((a) => a + 1);
            }, 600);
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
      if (renderTask) {
        try { renderTask.cancel(); } catch (_) {}
      }
    };
  }, [url, effectiveThumb, scale, pageNum, attempt, cacheKey, templateId]);

  return (
    <div className={`relative overflow-hidden bg-slate-50 flex items-center justify-center select-none ${className}`}>
      {/* 1. Fast path: Direct lightweight image thumbnail (0ms load) */}
      {effectiveThumb ? (
        <img
          src={effectiveThumb}
          alt={title}
          loading="lazy"
          onError={() => setImgFailed(true)}
          className="h-full w-full object-contain pointer-events-none select-none transition-opacity duration-200"
        />
      ) : error ? (
        /* 2. Fallback if PDF fails to render */
        <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center bg-gradient-to-b from-slate-100/60 to-slate-50">
          <div className="rounded-xl border border-slate-200/90 bg-white/95 p-2 shadow-2xs w-full max-w-[130px] flex flex-col items-center">
            <div className="h-6 w-6 rounded-lg bg-red-50 text-red-700 grid place-items-center mb-1">
              <FileText size={13} />
            </div>
            <div className="text-[9px] font-extrabold text-slate-800 truncate w-full" title={title}>
              {title}
            </div>
            <span className="mt-0.5 text-[8px] font-semibold text-slate-400">PDF Rasmi</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (url) pdfBufferCache.delete(url);
                setImgFailed(false);
                setError(false);
                setAttempt(0);
              }}
              className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[8.5px] font-bold text-slate-700 hover:bg-red-50 hover:text-red-700 transition border border-slate-200 active:scale-95 cursor-pointer"
            >
              <RotateCw size={9} />
              <span>Muat Semula</span>
            </button>
          </div>
        </div>
      ) : (
        /* 3. Canvas rendering for fresh PDFs */
        <>
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-[1px] p-2 text-center select-none">
              <div className="h-5 w-5 rounded-full border-2 border-slate-200 border-t-red-600 animate-spin" />
              <span className="mt-1.5 text-[8.5px] font-bold text-slate-400 tracking-tight">Memuatkan...</span>
            </div>
          )}
          <canvas ref={canvasRef} className="h-full w-full object-contain pointer-events-none" />
        </>
      )}
    </div>
  );
}
