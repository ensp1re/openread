import { Readability } from "@mozilla/readability";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import { WORDS_PER_MINUTE } from "@/constants/extract";
import { hardenUrls } from "@/lib/harden-urls";
import { parseSrcset } from "@/lib/srcset";
import { sanitizeToDom } from "@/lib/sanitize";
import { splitSiteSuffix } from "@/lib/title";
import type { Article, SrcsetCandidate } from "@/types/article";

const MIN_TEXT_LENGTH = 200;

const LAZY_SRC_ATTRS = ["data-src", "data-lazy-src", "data-original", "data-url", "data-hi-res-src"];

/** Copies lazy-loading attributes into src/srcset so images survive without the site's JavaScript. */
function restoreLazyImages(doc: Document) {
  for (const img of doc.querySelectorAll("img")) {
    const src = img.getAttribute("src") ?? "";
    if (!src || src.startsWith("data:")) {
      const lazy = LAZY_SRC_ATTRS.map((a) => img.getAttribute(a)).find(Boolean);
      if (lazy) img.setAttribute("src", lazy);
    }
    const lazySet = img.getAttribute("data-srcset") ?? img.getAttribute("data-lazy-srcset");
    if (lazySet && !img.getAttribute("srcset")) img.setAttribute("srcset", lazySet);
  }
  for (const source of doc.querySelectorAll("source[data-srcset]")) {
    source.setAttribute("srcset", source.getAttribute("data-srcset")!);
  }
}

/**
 * Readability joins <br><br>-separated text into paragraphs only across inline elements, and it
 * doesn't count <font> as inline. Old hand-written pages (paulgraham.com) wrap footnote markers in
 * <font>, which would otherwise split a paragraph in two.
 */
function replaceFontTags(doc: Document) {
  for (const font of doc.querySelectorAll("font")) {
    const span = doc.createElement("span");
    span.append(...font.childNodes);
    font.replaceWith(span);
  }
}

const normalize = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/** Fallback when Readability finds nothing: the page's main landmark with page chrome removed. */
function simpleExtract(doc: Document): string | null {
  const root = doc.querySelector("article, main, [role=main]") ?? doc.body;
  if (!root) return null;
  root
    .querySelectorAll("nav, header, footer, aside, script, style, noscript, form, iframe, [role=navigation], [aria-hidden=true]")
    .forEach((el) => el.remove());
  return (root.textContent ?? "").trim().length >= MIN_TEXT_LENGTH ? root.innerHTML : null;
}

const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December";
const LEADING_DATE = new RegExp(`^\\s*((?:${MONTHS})(?:\\s+\\d{1,2},)?\\s+\\d{4})\\s*$`);

/** Essays without date metadata often open with a bare "September 2026" line; lift it into the metadata.
 * Only a text node that is nothing but the date is taken, so "March 2020 was…" stays intact. */
function takeLeadingDate(body: HTMLElement): string | null {
  const walker = body.ownerDocument.createTreeWalker(body, 4 /* NodeFilter.SHOW_TEXT */);
  let node = walker.nextNode();
  while (node && !node.textContent?.trim()) node = walker.nextNode();
  const match = node && LEADING_DATE.exec(node.textContent!);
  if (!node || !match) return null;

  // Climb out of non-block wrappers: <strong>March 2020</strong>, <cite>…</cite>.
  let top: Node = node;
  while (top.parentElement && top.parentElement !== body && !BLOCK.has(top.parentElement.tagName)) {
    if (top.parentElement.textContent!.trim() !== match[1]) break;
    top = top.parentElement;
  }
  // The date must stand on its own line: followed by <br>, a block, or nothing. "March 2020 was…" is prose.
  let next = top.nextSibling;
  while (next && next.nodeType === 3 && !next.textContent!.trim()) next = next.nextSibling;
  const nextIsBreak = !next || (next.nodeType === 1 && (next.nodeName === "BR" || BLOCK.has(next.nodeName)));
  if (!nextIsBreak) return null;
  // Inside a wrapper that has more text ("<span>March 2020 update</span>") the regex already refused it;
  // a date that is the whole content of a heading is a section title, not the article date.
  if (top.parentElement && /^H[1-6]$/.test(top.parentElement.nodeName)) return null;

  if (top === node) node.textContent = "";
  else (top as Element).remove();
  return match[1];
}

const BLOCK = new Set(["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "TD", "TH", "BLOCKQUOTE", "SECTION", "ARTICLE", "HEADER", "FIGURE", "UL", "OL", "PRE", "TABLE", "HR"]);

function sanitize(
  html: string,
  baseUrl: string | null,
  title: string,
  hasDate: boolean,
): { html: string; leadingDate: string | null } {
  const { window } = new JSDOM("", { url: baseUrl ?? "https://invalid.local/" });
  const purify = createDOMPurify(window);
  // Shared with files and pasted text; ids are prefixed so a document can't collide with the app's own.
  const body = sanitizeToDom(purify, html);
  const doc = window.document;

  // Readability usually drops a heading that repeats the title; catch the ones it misses.
  const firstHeading = body.querySelector("h1, h2");
  if (firstHeading && normalize(firstHeading.textContent ?? "") === normalize(title)) firstHeading.remove();

  // Some sites (paulgraham.com) render the title as an image before any text; the reader already shows it.
  // A lead photo whose alt repeats the title comes after text or is large, so it stays.
  const titleImage = [...body.querySelectorAll("img[alt]")].find((img) => normalize(img.getAttribute("alt")!) === normalize(title));
  const tw = Number(titleImage?.getAttribute("width"));
  const th = Number(titleImage?.getAttribute("height"));
  if (titleImage && ((tw > 0 && tw <= 400) || (th > 0 && th <= 100))) {
    const range = doc.createRange();
    range.setStart(body, 0);
    range.setEndBefore(titleImage);
    if (!range.toString().trim()) titleImage.remove();
  }

  for (const h1 of body.querySelectorAll("h1")) {
    const h2 = doc.createElement("h2");
    h2.append(...h1.childNodes);
    h1.replaceWith(h2);
  }

  for (const img of body.querySelectorAll("img")) {
    const w = Number(img.getAttribute("width"));
    const h = Number(img.getAttribute("height"));
    if ((w > 0 && w <= 2) || (h > 0 && h <= 2)) {
      img.remove();
      continue;
    }
    // Content images (not icons) fill the column, so a 410px painting doesn't sit in a corner.
    if (w >= 300) img.setAttribute("data-wide", "");
    img.setAttribute("loading", "lazy");
    img.setAttribute("decoding", "async");
    if (!img.hasAttribute("alt")) img.setAttribute("alt", "");
  }

  hardenUrls(body, baseUrl);

  for (const table of body.querySelectorAll("table")) {
    const wrap = doc.createElement("div");
    wrap.setAttribute("data-table", "");
    table.replaceWith(wrap);
    wrap.append(table);
  }

  const leadingDate = hasDate ? null : takeLeadingDate(body);

  for (const el of body.querySelectorAll("p, div, span")) {
    if (el.id || el.hasAttribute("name") || el.querySelector("[id], [name]")) continue; // footnote targets
    if (!el.textContent?.trim() && !el.querySelector("img, picture, video, audio, svg, math, table, br, hr")) el.remove();
  }

  return { html: body.innerHTML, leadingDate };
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function cleanByline(byline: string | null | undefined): string | null {
  const b = byline?.replace(/^\s*by\s+/i, "").replace(/\s+/g, " ").trim();
  return b && b.length <= 100 ? b : null;
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" });

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : DATE_FORMAT.format(t);
}

export function parseArticle(html: string, url: string | null, options: { simple?: boolean } = {}): Article | null {
  try {
    return parse(html, url, options);
  } catch {
    // Pathological markup (e.g. nesting deep enough to overflow the stack) is treated as "no article".
    return null;
  }
}

function parse(html: string, url: string | null, options: { simple?: boolean }): Article | null {
  const dom = new JSDOM(html, { url: url ?? undefined });
  const doc = dom.window.document;
  restoreLazyImages(doc);
  replaceFontTags(doc);

  const pageTitle = doc.title?.trim() || (url ? new URL(url).hostname : "Untitled");
  const parsed = options.simple ? null : new Readability(doc.cloneNode(true) as Document).parse();

  let content = parsed?.content && (parsed.textContent ?? "").trim().length >= MIN_TEXT_LENGTH ? parsed.content : null;
  content ??= simpleExtract(doc);
  if (!content) return null;

  const hostStem = url ? new URL(url).hostname.replace(/^www\./, "").split(".")[0] : null;
  const rawExcerpt = parsed?.excerpt?.replace(/\s+/g, " ").trim() ?? null;
  const split = splitSiteSuffix((parsed?.title || pageTitle).trim(), [parsed?.siteName, hostStem, rawExcerpt]);
  const title = split.title;
  const metaDate = formatDate(parsed?.publishedTime);
  const { html: body, leadingDate } = sanitize(content, url, title, metaDate !== null);
  const bodyDoc = new JSDOM(body).window.document;
  const text = bodyDoc.body.textContent ?? "";
  // Code is scanned, not read word by word; leave it out of the reading time.
  bodyDoc.querySelectorAll("pre").forEach((pre) => pre.remove());
  const proseText = bodyDoc.body.textContent ?? "";
  if (text.trim().length < MIN_TEXT_LENGTH) return null;

  const excerpt = rawExcerpt && split.site && normalize(rawExcerpt) === normalize(split.site) ? null : rawExcerpt;
  const dek =
    excerpt && excerpt.length >= 20 && excerpt.length < 400 && !normalize(text).includes(normalize(excerpt).slice(0, 80))
      ? excerpt
      : null;

  const words = wordCount(proseText);
  return {
    url,
    title,
    dek,
    byline: cleanByline(parsed?.byline),
    siteName: parsed?.siteName?.trim() || split.site,
    published: metaDate ?? leadingDate,
    lang: parsed?.lang || doc.documentElement.lang || null,
    dir: parsed?.dir || null,
    content: body,
    wordCount: words,
    readingMinutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
  };
}
