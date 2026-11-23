"use client";

import { useEffect, useRef, useState } from "react";

import type { ResumeDoc } from "@/lib/core/resume-document";
import type { ResumeOptions } from "@/lib/storage/db";

const RENDER_DELAY_MS = 400;

type PdfJs = typeof import("pdfjs-dist");
let pdfjsPromise: Promise<PdfJs> | null = null;
function loadPdfJs(): Promise<PdfJs> {
  pdfjsPromise ??= import("pdfjs-dist").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    return pdfjs;
  });
  return pdfjsPromise;
}

/**
 * Shows the actual exported PDF, drawn with pdf.js, so what you see is exactly what an
 * employer (and their ATS) gets.
 */
export function PreviewPane({ doc, templateId, options, onPages }: { doc: ResumeDoc; templateId: string; options: ResumeOptions; onPages?: (pages: number) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState(0);
  const [rendering, setRendering] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);

  useEffect(() => {
    const run = ++generation.current;
    setRendering(true);
    const timer = setTimeout(async () => {
      try {
        const [{ renderResumePdf }, pdfjs] = await Promise.all([import("@/lib/pdf/render"), loadPdfJs()]);
        const blob = await renderResumePdf(doc, templateId, options);
        if (run !== generation.current) return;
        const task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
        const pdf = await task.promise;
        if (run !== generation.current || !container.current) { void task.destroy(); return; }

        // Draw into fresh canvases, then swap them in at once so the preview never flickers.
        const width = container.current.clientWidth || 560;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const canvases: HTMLCanvasElement[] = [];
        for (let n = 1; n <= pdf.numPages; n++) {
          const page = await pdf.getPage(n);
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: (Math.min(width, 612) / base.width) * ratio });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.setAttribute("role", "img");
          canvas.setAttribute("aria-label", `Resume preview, page ${n} of ${pdf.numPages}`);
          await page.render({ canvas, viewport }).promise;
          canvases.push(canvas);
        }
        void task.destroy();
        if (run !== generation.current || !container.current) return;

        const host = container.current;
        host.replaceChildren(...canvases.map((canvas, index) => {
          const frame = document.createElement("div");
          frame.className = "preview-page";
          const number = document.createElement("span");
          number.className = "preview-page-number";
          number.textContent = `Page ${index + 1}`;
          frame.append(canvas, number);
          return frame;
        }));
        setPages(canvases.length);
        onPages?.(canvases.length);
        setError("");
      } catch (cause) {
        if (run === generation.current) setError(cause instanceof Error ? cause.message : "The preview couldn't be drawn.");
      } finally {
        if (run === generation.current) setRendering(false);
      }
    }, pages === 0 ? 0 : RENDER_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, templateId, options.pageSize, options.density]);

  return (
    <div className="preview">
      <div className="preview-status" aria-live="polite">
        {pages > 0 ? <span className={`chip${pages > 1 ? " warn" : " matched"}`}>{pages} {pages === 1 ? "page" : "pages"}</span> : null}
        {pages > 1 ? <span className="field-hint">Most recruiters prefer one page under 10 years of experience. Try the Compact density.</span> : null}
        {rendering && pages > 0 ? <span className="label muted">Updating…</span> : null}
      </div>
      {error ? <p className="notice error" role="alert">{error}</p> : null}
      {pages === 0 && !error ? <div className="preview-skeleton" aria-label="Drawing preview" /> : null}
      <div ref={container} className={rendering && pages > 0 ? "preview-rendering" : undefined} style={{ display: "grid", gap: 18, width: "100%", justifyItems: "center" }} />
    </div>
  );
}
