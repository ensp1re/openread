import { WORDS_PER_MINUTE } from "@/constants/extract";
import type { Chapter, TocEntry } from "@/types/document";

const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;

export function toChapter(index: number, title: string, content: string, text: string): Chapter {
  const wordCount = countWords(text);
  return { index, title, content, wordCount, readingMinutes: Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE)) };
}

/** "Chapter 4", "IV.", "Part One" on their own line — how plain-text books mark a new chapter. */
const CHAPTER_HEADING = /^\s*((chapter|part|book|section)\b[^.]{0,60}|[IVXLC]{1,7}\.?)\s*$/i;

const headingText = (el: Element) => (el.textContent ?? "").trim();

/** A lone h1 at the very start is the book's own title, not its first chapter. */
function isLeadingTitle(body: HTMLElement, heading: Element): boolean {
  for (const node of [...body.childNodes]) {
    if (node === heading) return true;
    if (node.nodeType === 1) return false;
    if ((node.textContent ?? "").trim()) return false;
  }
  return false;
}

/** Plain text has no headings; lines that read like chapter openings become them. */
function promoteTextHeadings(body: HTMLElement) {
  const doc = body.ownerDocument;
  for (const p of body.querySelectorAll("p")) {
    const text = headingText(p);
    if (text.length <= 60 && CHAPTER_HEADING.test(text)) {
      const h = doc.createElement("h2");
      h.textContent = text;
      p.replaceWith(h);
    }
  }
}

/**
 * Splits a document into chapters at one heading level: parts (h1) when a book has several, otherwise
 * sections (h2). Headings of the other level become contents entries inside their chapter, so a book
 * with parts keeps them and a book titled by an h1 doesn't list its own title as chapter one.
 */
export function splitChapters(body: HTMLElement): { chapters: Chapter[]; toc: TocEntry[]; anchors: Record<string, number> } {
  const doc = body.ownerDocument;
  if (body.querySelectorAll("h1, h2").length === 0) promoteTextHeadings(body);

  const h1s = [...body.querySelectorAll("h1")].filter((h) => headingText(h));
  if (h1s.length === 1 && isLeadingTitle(body, h1s[0])) {
    h1s[0].remove();
    h1s.length = 0;
  }
  const boundaryTag = h1s.length >= 2 ? "H1" : "H2";
  const boundaries = new Set(
    [...body.querySelectorAll(boundaryTag.toLowerCase())].filter((h) => headingText(h)),
  );

  const chapters: Chapter[] = [];
  const toc: TocEntry[] = [];
  const anchors: Record<string, number> = {};
  let current = doc.createElement("div");
  let title = "";

  const flush = () => {
    const text = (current.textContent ?? "").trim();
    if (!text && !title && !current.querySelector("img, figure, table")) return;
    const index = chapters.length;
    for (const el of current.querySelectorAll("[id]")) anchors[el.id] = index;
    chapters.push(toChapter(index, title || (index === 0 ? "Beginning" : `Chapter ${index + 1}`), current.innerHTML, text));
    toc.push({ title: title || "Beginning", chapter: index });

    // Headings inside the chapter become contents entries one level down.
    for (const sub of current.querySelectorAll(boundaryTag === "H1" ? "h2" : "h3")) {
      const subTitle = headingText(sub);
      if (!subTitle) continue;
      if (!sub.id) sub.id = `openread-section-${index}-${toc.length}`;
      anchors[sub.id] = index;
      toc.push({ title: subTitle, chapter: index, anchor: sub.id, depth: 3 });
    }
    // Re-read the content now that generated ids are in place.
    chapters[index] = { ...chapters[index], content: current.innerHTML };
  };

  for (const node of [...body.childNodes]) {
    // Element nodes only; DOMPurify's document has no window, so `instanceof HTMLElement` can't be used.
    if (node.nodeType === 1 && boundaries.has(node as Element)) {
      const heading = node as Element;
      flush();
      current = doc.createElement("div");
      title = headingText(heading);
      if (heading.id) anchors[heading.id] = chapters.length;
      continue;
    }
    current.append(node);
  }
  flush();

  return { chapters, toc, anchors };
}
