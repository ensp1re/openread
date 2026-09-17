import { WORDS_PER_MINUTE } from "@/constants/extract";
import type { Chapter, TocEntry } from "@/types/document";

const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;

export function toChapter(index: number, title: string, content: string, text: string): Chapter {
  const wordCount = countWords(text);
  return { index, title, content, wordCount, readingMinutes: Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE)) };
}

/** "Chapter 4", "IV.", "Part One" on their own line — how plain-text books mark a new chapter. */
const CHAPTER_HEADING = /^\s*((chapter|part|book|section)\b[^.]{0,60}|[IVXLC]{1,7}\.?)\s*$/i;

/**
 * Splits a document into chapters at its top-level headings, and marks headings that read like
 * chapter openings in plain text. Everything before the first heading becomes an opening section.
 */
export function splitChapters(body: HTMLElement): { chapters: Chapter[]; toc: TocEntry[]; anchors: Record<string, number> } {
  const doc = body.ownerDocument;
  const headings = [...body.querySelectorAll("h1, h2")].filter((h) => (h.textContent ?? "").trim().length > 0);

  // A plain-text book has no headings; promote lines that look like chapter openings.
  if (headings.length === 0) {
    for (const p of body.querySelectorAll("p")) {
      const text = (p.textContent ?? "").trim();
      if (text.length <= 60 && CHAPTER_HEADING.test(text)) {
        const h = doc.createElement("h2");
        h.textContent = text;
        p.replaceWith(h);
      }
    }
    headings.push(...[...body.querySelectorAll("h2")]);
  }

  const chapters: Chapter[] = [];
  const toc: TocEntry[] = [];
  const anchors: Record<string, number> = {};
  let current = doc.createElement("div");
  let title = "";
  let level = 2;

  const flush = () => {
    const text = (current.textContent ?? "").trim();
    if (!text && !current.querySelector("img, figure, table")) return;
    const index = chapters.length;
    for (const el of current.querySelectorAll("[id]")) anchors[el.id] = index;
    chapters.push(toChapter(index, title || (chapters.length === 0 ? "Beginning" : `Chapter ${index + 1}`), current.innerHTML, text));
    if (title) toc.push({ title, chapter: index, ...(level > 2 ? { depth: level } : {}) });
    else if (index === 0) toc.push({ title: "Beginning", chapter: 0 });
  };

  for (const node of [...body.childNodes]) {
    // Element nodes only; DOMPurify's document has no window, so `instanceof HTMLElement` can't be used.
    if (node.nodeType === 1 && /^H[12]$/.test((node as Element).tagName) && headings.includes(node as Element)) {
      const heading = node as Element;
      flush();
      current = doc.createElement("div");
      title = (heading.textContent ?? "").trim();
      level = Number(heading.tagName[1]);
      if (heading.id) anchors[heading.id] = chapters.length;
      continue;
    }
    current.append(node);
  }
  flush();

  return { chapters, toc, anchors };
}
