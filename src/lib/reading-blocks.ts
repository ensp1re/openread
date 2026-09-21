/**
 * The paragraphs, list items, headings and figures a reader's eye moves through. A reading place is
 * kept as one of these rather than as a scroll offset, so it survives a change of text size or
 * column width, and the page can show the words that were being read.
 */
const BLOCKS = "p, li, dt, dd, h2, h3, h4, h5, h6, blockquote, pre, figure, table";

/** Innermost blocks only: a list item holding a paragraph counts once, as the paragraph. */
export function readingBlocks(root: Element | null | undefined): Element[] {
  if (!root) return [];
  return [...root.querySelectorAll(BLOCKS)].filter((el) => !el.querySelector(BLOCKS));
}

const pageTop = (el: Element) => el.getBoundingClientRect().top + window.scrollY;

/** Index of the last block that starts at or above `line`, a y position on the page. */
export function blockAtLine(blocks: readonly Element[], line: number): number {
  let lo = 0;
  let hi = blocks.length - 1;
  let found = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (pageTop(blocks[mid]) <= line) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found;
}

/** Scroll position that puts the block's first line on the reading line. */
export function scrollTopFor(block: Element, readingLine: number): number {
  return pageTop(block) - window.innerHeight * readingLine;
}

/** The opening words of a block, cut at a word boundary. */
export function openingWords(el: Element | undefined, max = 140): string {
  const text = (el?.textContent ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max * 0.6)).replace(/[\s,.;:–—-]+$/, "")}…`;
}
