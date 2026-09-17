import { PDF_WORKER_URL } from "@/constants/files";
import { dropRunningHeads, orderColumns, pageHtml, titleFromFirstPage, toBlocks, toLines } from "@/lib/files/pdf-reflow";
import type { ParsedContent } from "@/types/document";
import type { PdfLine, PdfOutlineEntry, PdfPage } from "@/types/pdf";

export class PdfPasswordNeeded extends Error {}
export class PdfHasNoText extends Error {}

type PdfModule = typeof import("pdfjs-dist");

async function loadPdfjs(workerSrc: string): Promise<PdfModule> {
  const pdfjs = await import("pdfjs-dist");
  // The worker is copied into /public on install; pdf.js can't resolve its own under Turbopack.
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  return pdfjs;
}

/** The PDF's bookmarks, flattened, with the page each one points at. */
async function readOutline(pdf: Awaited<ReturnType<PdfModule["getDocument"]>["promise"]>): Promise<PdfOutlineEntry[]> {
  const outline = await pdf.getOutline().catch(() => null);
  if (!outline) return [];
  const entries: PdfOutlineEntry[] = [];
  const walk = async (items: typeof outline, depth: number) => {
    for (const item of items) {
      let page = 0;
      try {
        const destination = typeof item.dest === "string" ? await pdf.getDestination(item.dest) : item.dest;
        const ref = Array.isArray(destination) ? destination[0] : null;
        if (ref) page = (await pdf.getPageIndex(ref as Parameters<typeof pdf.getPageIndex>[0])) + 1;
      } catch {
        // A bookmark that doesn't resolve is skipped rather than failing the book.
      }
      if (page > 0 && item.title?.trim()) entries.push({ title: item.title.trim(), page, depth });
      if (item.items?.length) await walk(item.items, depth + 1);
    }
  };
  await walk(outline, 2);
  return entries;
}

export interface PdfDocument extends ParsedContent {
  readonly pageCount: number;
  readonly outline: readonly PdfOutlineEntry[];
  /** One entry per page, so a book can be cut at its bookmarks. */
  readonly pageBodies: readonly string[];
  readonly pageTexts: readonly string[];
}

/**
 * Reflows a PDF into paragraphs: PDF.js gives positioned runs, which become lines, then columns in
 * reading order, then paragraphs with running heads removed. The original pages stay one click away,
 * because this is an approximation and tables, maths and figures don't survive it.
 */
export async function parsePdf(file: Blob, password?: string, workerSrc = PDF_WORKER_URL): Promise<PdfDocument> {
  const pdfjs = await loadPdfjs(workerSrc);
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), password });
  let pdf;
  try {
    pdf = await task.promise;
  } catch (error) {
    if ((error as { name?: string }).name === "PasswordException") throw new PdfPasswordNeeded();
    throw error;
  }

  const pageLines: PdfLine[][] = [];
  let pageHeight = 0;
  for (let number = 1; number <= pdf.numPages; number++) {
    const page = await pdf.getPage(number);
    const viewport = page.getViewport({ scale: 1 });
    pageHeight = Math.max(pageHeight, viewport.height);
    const content = await page.getTextContent();
    const items = content.items
      .filter((i): i is Extract<typeof i, { str: string }> => "str" in i)
      .map((i) => ({
        text: i.str,
        x: i.transform[4],
        y: i.transform[5],
        width: i.width,
        size: Math.abs(i.transform[3]) || i.height || 10,
      }));
    pageLines.push(orderColumns(toLines(items), viewport.width));
    page.cleanup();
  }

  const cleaned = dropRunningHeads(pageLines, pageHeight || 792);
  const pages: PdfPage[] = cleaned.map((lines, i) => ({ number: i + 1, lines }));
  if (pages.every((p) => p.lines.length === 0)) {
    await task.destroy();
    throw new PdfHasNoText();
  }

  const pageBodies = pages.map((page) => pageHtml(page.number, toBlocks([page])));
  const pageTexts = pages.map((page) => page.lines.map((l) => l.text).join(" "));

  const info = await pdf.getMetadata().catch(() => null);
  const metadata = info?.info as { Title?: string; Author?: string } | undefined;
  const outline = await readOutline(pdf);
  const pageCount = pdf.numPages;
  await task.destroy();

  return {
    // Papers and reports usually have no title in their metadata, but do print one on page one.
    title: metadata?.Title?.trim() || titleFromFirstPage(pages[0]?.lines ?? [], pageHeight || 792),
    author: metadata?.Author?.trim() || null,
    html: pageBodies.join(""),
    pageCount,
    outline,
    pageBodies,
    pageTexts,
  };
}
