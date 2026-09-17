"use client";

import { useEffect, useRef, useState } from "react";
import { PDF_WORKER_URL } from "@/constants/files";
import type { PdfPagesProps } from "@/types/reader";

/**
 * The PDF as it was made: each page drawn to a canvas as it comes into view. Reflowed text is easier
 * to read, but tables, formulas and figures only survive here.
 */
export function PdfPages({ blob, onBack }: PdfPagesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let task: { destroy: () => Promise<void> } | null = null;
    const observers: IntersectionObserver[] = [];

    const render = async () => {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
      const loading = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
      task = loading;
      const pdf = await loading.promise;
      if (cancelled) return;
      setPageCount(pdf.numPages);

      const container = containerRef.current;
      if (!container) return;
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const canvas = entry.target as HTMLCanvasElement;
            observer.unobserve(canvas);
            void (async () => {
              const page = await pdf.getPage(Number(canvas.dataset.page));
              const width = Math.min(container.clientWidth, 1000);
              const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width });
              canvas.width = Math.floor(viewport.width * devicePixelRatio);
              canvas.height = Math.floor(viewport.height * devicePixelRatio);
              canvas.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
              const context = canvas.getContext("2d");
              if (!context) return;
              context.scale(devicePixelRatio, devicePixelRatio);
              await page.render({ canvas, canvasContext: context, viewport }).promise;
              page.cleanup();
            })();
          }
        },
        { rootMargin: "800px" },
      );
      observers.push(observer);
      for (const canvas of container.querySelectorAll("canvas")) observer.observe(canvas);
    };

    render().catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      observers.forEach((o) => o.disconnect());
      void task?.destroy();
    };
  }, [blob, pageCount]);

  return (
    <div className="pdf-pages">
      <p className="pdf-notice">
        The original pages.{" "}
        <button type="button" className="text-button" onClick={onBack}>
          Back to the text
        </button>
      </p>
      {failed && <p className="pdf-notice">These pages couldn&rsquo;t be drawn.</p>}
      <div ref={containerRef} className="pdf-page-list">
        {Array.from({ length: pageCount }, (_, i) => (
          <canvas key={i} data-page={i + 1} aria-label={`Page ${i + 1}`} role="img" />
        ))}
      </div>
    </div>
  );
}
