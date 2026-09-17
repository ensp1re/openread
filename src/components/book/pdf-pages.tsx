"use client";

import { useEffect, useRef, useState } from "react";
import { PDF_PAGE_MIN_WIDTH, PDF_WORKER_URL } from "@/constants/files";
import type { PdfPagesProps } from "@/types/reader";

type Pdf = Awaited<ReturnType<Awaited<typeof import("pdfjs-dist")>["getDocument"]>["promise"]>;

/**
 * The PDF as it was made: each page is drawn when it comes into view and released when it leaves,
 * so a long book doesn't fill memory. Reflowed text is easier to read, but tables, formulas and
 * figures only survive here.
 */
export function PdfPages({ blob, onBack, backLabel = "Back to the text" }: PdfPagesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const pdfRef = useRef<Pdf | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [failed, setFailed] = useState(false);

  // Opening the pages is a move, not a side note: put focus where the way back is.
  useEffect(() => backRef.current?.focus({ preventScroll: true }), []);

  useEffect(() => {
    let cancelled = false;
    let task: { destroy: () => Promise<void> } | null = null;

    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
        const loading = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
        task = loading;
        const pdf = await loading.promise;
        if (cancelled) {
          await loading.destroy();
          return;
        }
        pdfRef.current = pdf;
        setPageCount(pdf.numPages);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      pdfRef.current = null;
      void task?.destroy();
    };
  }, [blob]);

  // Draw a page when it comes near, and give its memory back when it goes away.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || pageCount === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const canvas = entry.target as HTMLCanvasElement;
          if (!entry.isIntersecting) {
            canvas.width = 0;
            canvas.height = 0;
            delete canvas.dataset.drawn;
            continue;
          }
          if (canvas.dataset.drawn) continue;
          canvas.dataset.drawn = "true";
          void (async () => {
            const pdf = pdfRef.current;
            if (!pdf) return;
            const page = await pdf.getPage(Number(canvas.dataset.page));
            const width = Math.max(Math.min(container.clientWidth, 1000), PDF_PAGE_MIN_WIDTH);
            const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width });
            canvas.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
            canvas.style.width = `${viewport.width}px`;
            canvas.width = Math.floor(viewport.width * devicePixelRatio);
            canvas.height = Math.floor(viewport.height * devicePixelRatio);
            const context = canvas.getContext("2d");
            if (!context) return;
            context.scale(devicePixelRatio, devicePixelRatio);
            await page.render({ canvas, canvasContext: context, viewport }).promise.catch(() => {});
            page.cleanup();
          })();
        }
      },
      { rootMargin: "600px" },
    );
    for (const canvas of container.querySelectorAll("canvas")) observer.observe(canvas);
    return () => observer.disconnect();
  }, [pageCount]);

  return (
    <div className="pdf-pages">
      <p className="pdf-notice pdf-notice-sticky">
        The original pages.{" "}
        <button ref={backRef} type="button" className="text-button" onClick={onBack}>
          {backLabel}
        </button>
      </p>
      {failed && <p className="pdf-notice">These pages couldn&rsquo;t be drawn.</p>}
      {/* Focusable because it scrolls sideways on phones: a keyboard must be able to reach it. */}
      <div ref={containerRef} className="pdf-page-list" role="group" aria-label="Pages of the document" tabIndex={0}>
        {Array.from({ length: pageCount }, (_, i) => (
          <canvas key={i} data-page={i + 1} aria-label={`Page ${i + 1}`} role="img" />
        ))}
      </div>
    </div>
  );
}
