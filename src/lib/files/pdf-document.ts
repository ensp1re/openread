import { WORDS_PER_MINUTE } from "@/constants/extract";
import { PDF_BOOK_MIN_PAGES, PDF_PAGES_PER_CHAPTER } from "@/constants/files";
import { toChapter } from "@/lib/files/split-chapters";
import type { Book, Chapter, TocEntry } from "@/types/document";
import type { PdfOutlineEntry } from "@/types/pdf";

const pageAnchor = (page: number) => `user-content-pdf-page-${page}`;

/** Splits the reflowed pages at the PDF's own bookmarks; sub-bookmarks become contents entries. */
export function bookFromOutline(
  title: string,
  author: string | null,
  pageBodies: readonly string[],
  pageTexts: readonly string[],
  outline: readonly PdfOutlineEntry[],
): Book {
  // Several bookmarks can start on one page; the first becomes the chapter, the rest are sections.
  const topLevel = outline.filter((e) => e.depth === 2);
  const tops = topLevel.filter((e, i) => i === 0 || e.page !== topLevel[i - 1].page);
  const sections = outline.filter((e) => !tops.includes(e));
  const starts = tops.map((e) => e.page);
  const chapters: Chapter[] = [];
  const toc: TocEntry[] = [];
  const anchors: Record<string, number> = {};

  const pushChapter = (chapterTitle: string, from: number, to: number) => {
    const index = chapters.length;
    const body = pageBodies.slice(from - 1, to).join("");
    const text = pageTexts.slice(from - 1, to).join(" ");
    chapters.push(toChapter(index, chapterTitle, body, text));
    toc.push({ title: chapterTitle, chapter: index });
    for (let page = from; page <= to; page++) anchors[pageAnchor(page)] = index;
    for (const sub of sections.filter((e) => e.page >= from && e.page <= to)) {
      toc.push({ title: sub.title, chapter: index, anchor: pageAnchor(sub.page), depth: 3 });
    }
  };

  if (tops.length === 0) {
    // No bookmarks: a long PDF is still easier to read in pieces than as one endless page.
    for (let from = 1; from <= pageBodies.length; from += PDF_PAGES_PER_CHAPTER) {
      const to = Math.min(pageBodies.length, from + PDF_PAGES_PER_CHAPTER - 1);
      pushChapter(from === to ? `Page ${from}` : `Pages ${from}–${to}`, from, to);
    }
  } else {
    if (starts[0] > 1) pushChapter("Beginning", 1, starts[0] - 1);
    tops.forEach((entry, i) => pushChapter(entry.title, entry.page, (tops[i + 1]?.page ?? pageBodies.length + 1) - 1));
  }

  const wordCount = chapters.reduce((sum, c) => sum + c.wordCount, 0);
  return {
    title,
    author,
    lang: null,
    dir: null,
    toc,
    chapters,
    anchors,
    wordCount,
    readingMinutes: Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE)),
  };
}

/** A PDF is a book when it says so with bookmarks, or when it is simply long. */
export const pdfIsBook = (pageCount: number, outline: readonly PdfOutlineEntry[]) =>
  outline.filter((e) => e.depth === 2).length >= 2 || pageCount >= PDF_BOOK_MIN_PAGES;
