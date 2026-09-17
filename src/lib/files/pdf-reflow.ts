import type { PdfBlock, PdfLine, PdfPage, PdfTextItem } from "@/types/pdf";

const percentile = (values: number[], p: number) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
};

const median = (values: number[]) => percentile(values, 0.5);

const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
/** Page numbers differ on every page; comparing without digits finds the repeated header text. */
const withoutNumbers = (s: string) => normalize(s).replace(/\d+/g, "#").toLowerCase();

/** Groups a page's text runs into lines: same baseline, left to right. */
export function toLines(items: readonly PdfTextItem[]): PdfLine[] {
  const sorted = [...items].filter((i) => i.text.trim()).sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: PdfLine[] = [];
  for (const item of sorted) {
    const last = lines.at(-1);
    const gap = last ? item.x - (last.x + last.width) : 0;
    // Same baseline, but a gap this wide is the space between columns, not between words.
    if (last && Math.abs(last.y - item.y) <= Math.max(1, item.size * 0.4) && gap < item.size * 3) {
      // Runs on the same baseline: keep the gap only when the glyphs don't already touch.
      last.text += gap > item.size * 0.2 && !last.text.endsWith(" ") ? ` ${item.text}` : item.text;
      last.width = item.x + item.width - last.x;
      last.size = Math.max(last.size, item.size);
      continue;
    }
    lines.push({ text: item.text, x: item.x, y: item.y, width: item.width, size: item.size });
  }
  return lines.map((l) => ({ ...l, text: normalize(l.text) })).filter((l) => l.text);
}

/**
 * Two-column pages read as one interleaved mess unless the columns are separated: when the lines'
 * left edges fall into two groups with a clear gap, the left column is read before the right.
 */
export function orderColumns(lines: readonly PdfLine[], pageWidth: number): PdfLine[] {
  if (lines.length < 6) return [...lines];
  const starts = [...lines].map((l) => l.x).sort((a, b) => a - b);
  let split = 0;
  let widest = 0;
  for (let i = 1; i < starts.length; i++) {
    const gap = starts[i] - starts[i - 1];
    if (gap > widest) {
      widest = gap;
      split = (starts[i] + starts[i - 1]) / 2;
    }
  }
  if (widest < pageWidth * 0.15 || split < pageWidth * 0.25 || split > pageWidth * 0.75) return [...lines];

  const left = lines.filter((l) => l.x < split);
  const right = lines.filter((l) => l.x >= split);
  if (left.length === 0 || right.length === 0) return [...lines];
  // A line that reaches into the right column (a title across the page) belongs to neither.
  const rightEdge = Math.min(...right.map((l) => l.x));
  const spanning = left.filter((l) => l.x + l.width > rightEdge + pageWidth * 0.05);
  if (spanning.length > lines.length / 3) return [...lines];
  return [...left.filter((l) => !spanning.includes(l)), ...right].map((l) => l);
}

/** Header and footer lines repeat across pages; they are page furniture, not text. */
export function dropRunningHeads(pages: readonly PdfLine[][], pageHeight: number): PdfLine[][] {
  const counts = new Map<string, number>();
  const edge = pageHeight * 0.08;
  for (const lines of pages) {
    const seen = new Set<string>();
    for (const line of lines) {
      if (line.y > pageHeight - edge || line.y < edge) seen.add(withoutNumbers(line.text));
    }
    for (const key of seen) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const repeated = new Set([...counts].filter(([, n]) => n >= Math.max(2, pages.length * 0.5)).map(([key]) => key));
  return pages.map((lines) =>
    lines.filter((line) => {
      const nearEdge = line.y > pageHeight - edge || line.y < edge;
      if (!nearEdge) return true;
      if (repeated.has(withoutNumbers(line.text))) return false;
      // A bare page number is furniture too.
      return !/^[#\s.,-]*$/.test(withoutNumbers(line.text));
    }),
  );
}

/** Joins lines into paragraphs and marks the larger ones as headings. */
export function toBlocks(pages: readonly PdfPage[]): PdfBlock[] {
  const all = pages.flatMap((p) => p.lines);
  if (all.length === 0) return [];
  const bodySize = median(all.map((l) => l.size));
  const gaps: number[] = [];
  for (const page of pages) {
    for (let i = 1; i < page.lines.length; i++) {
      const gap = page.lines[i - 1].y - page.lines[i].y;
      if (gap > 0) gaps.push(gap);
    }
  }
  // The 25th percentile is a normal line gap; the median would be pulled up by paragraph breaks.
  const lineGap = percentile(gaps, 0.25) || bodySize * 1.2;
  const leftEdge = median(all.map((l) => l.x));

  const blocks: PdfBlock[] = [];
  let current: { text: string; size: number } | null = null;
  const flush = () => {
    if (!current) return;
    const text = normalize(current.text);
    if (text) {
      const heading = current.size > bodySize * 1.15 && text.length < 90;
      blocks.push({ type: heading ? "heading" : "paragraph", text, level: heading ? (current.size > bodySize * 1.5 ? 2 : 3) : undefined });
    }
    current = null;
  };

  for (const page of pages) {
    page.lines.forEach((line, i) => {
      const previous = i > 0 ? page.lines[i - 1] : null;
      const gap = previous ? previous.y - line.y : Infinity;
      const isHeading = line.size > bodySize * 1.15 && line.text.length < 90;
      const startsParagraph =
        !current ||
        isHeading ||
        (current && Math.abs(line.size - current.size) > bodySize * 0.15) ||
        gap > lineGap * 1.6 ||
        line.x > leftEdge + line.size * 0.8;

      if (startsParagraph) {
        flush();
        current = { text: line.text, size: line.size };
        return;
      }
      // A word split across lines is joined without its hyphen.
      const joined = current!.text.endsWith("-") && /^[a-z]/.test(line.text) ? current!.text.slice(0, -1) + line.text : `${current!.text} ${line.text}`;
      current = { text: joined, size: Math.max(current!.size, line.size) };
    });
    flush();
  }
  flush();
  return blocks;
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Wraps a page so the reader can tell which page a passage came from. */
export const pageHtml = (number: number, blocks: readonly PdfBlock[]) =>
  `<div data-page="${number}" id="user-content-pdf-page-${number}">${blocksToHtml(blocks)}</div>`;

export const blocksToHtml = (blocks: readonly PdfBlock[]) =>
  blocks.map((b) => (b.type === "heading" ? `<h${b.level ?? 3}>${escape(b.text)}</h${b.level ?? 3}>` : `<p>${escape(b.text)}</p>`)).join("");

/**
 * A PDF often has no title in its metadata, but the first page usually opens with one set larger
 * than everything around it. Only the top of the page counts, so a sideways stamp or the abstract
 * can't be mistaken for it.
 */
export function titleFromFirstPage(lines: readonly PdfLine[], pageHeight: number): string {
  const top = lines.filter((l) => l.y > pageHeight * 0.7);
  if (top.length === 0) return "";
  const bodySize = median(lines.map((l) => l.size));
  const biggest = Math.max(...top.map((l) => l.size));
  if (biggest < bodySize * 1.2) return "";
  const parts: string[] = [];
  for (const line of top) {
    if (Math.abs(line.size - biggest) > 0.5) {
      if (parts.length > 0) break;
      continue;
    }
    parts.push(line.text);
  }
  const title = normalize(parts.join(" "));
  return title.length >= 3 && title.length <= 200 ? title : "";
}
