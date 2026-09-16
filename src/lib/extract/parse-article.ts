import { Readability } from "@mozilla/readability";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import { WORDS_PER_MINUTE } from "@/constants/extract";
import type { Article } from "@/types/article";

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
const LEADING_DATE = new RegExp(`^\\s*((?:${MONTHS})(?:\\s+\\d{1,2},)?\\s+\\d{4})\\b`);

/** Essays without date metadata often open with a bare "September 2026" line; lift it into the metadata. */
function takeLeadingDate(body: HTMLElement): string | null {
  const walker = body.ownerDocument.createTreeWalker(body, 4 /* NodeFilter.SHOW_TEXT */);
  let node = walker.nextNode();
  while (node && !node.textContent?.trim()) node = walker.nextNode();
  const match = node && LEADING_DATE.exec(node.textContent!);
  if (!node || !match) return null;
  node.textContent = node.textContent!.slice(match[0].length);
  return match[1];
}

function sanitize(html: string, baseUrl: string | null, title: string): { html: string; leadingDate: string | null } {
  const { window } = new JSDOM("", { url: baseUrl ?? "https://invalid.local/" });
  const purify = createDOMPurify(window);
  const body = purify.sanitize(html, {
    FORBID_TAGS: ["style", "form", "input", "button", "textarea", "select", "iframe", "object", "embed", "dialog"],
    FORBID_ATTR: ["style", "class", "align", "bgcolor", "color", "face", "size", "border"],
    RETURN_DOM: true,
  }) as HTMLElement;
  const doc = window.document;

  // Readability usually drops a heading that repeats the title; catch the ones it misses.
  const firstHeading = body.querySelector("h1, h2");
  if (firstHeading && normalize(firstHeading.textContent ?? "") === normalize(title)) firstHeading.remove();

  // Some sites (paulgraham.com) render the title as an image; the reader already shows it as text.
  for (const img of body.querySelectorAll("img[alt]")) {
    if (normalize(img.getAttribute("alt")!) === normalize(title)) img.remove();
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
    img.setAttribute("loading", "lazy");
    img.setAttribute("decoding", "async");
    if (!img.hasAttribute("alt")) img.setAttribute("alt", "");
  }

  for (const a of body.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href")!;
    if (href.startsWith("#")) continue;
    try {
      const abs = new URL(href, baseUrl ?? undefined);
      a.setAttribute("href", abs.href);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    } catch {
      a.removeAttribute("href");
    }
  }

  for (const table of body.querySelectorAll("table")) {
    const wrap = doc.createElement("div");
    wrap.setAttribute("data-table", "");
    table.replaceWith(wrap);
    wrap.append(table);
  }

  const leadingDate = takeLeadingDate(body);

  for (const el of body.querySelectorAll("p, div, span")) {
    if (!el.textContent?.trim() && !el.querySelector("img, picture, video, svg, math, br, hr")) el.remove();
  }

  return { html: body.innerHTML, leadingDate };
}

/** "Line length | Butterick's Practical Typography" → title "Line length", site "Butterick's Practical Typography". */
function splitSiteSuffix(title: string, candidates: (string | null | undefined)[]): { title: string; site: string | null } {
  const m = /^(.{8,}?)\s+[|—–·-]\s+([^|—–·]{2,60})$/.exec(title);
  if (!m) return { title, site: null };
  const suffix = normalize(m[2]);
  const hit = candidates.some((c) => {
    const n = c ? normalize(c) : "";
    return n.length > 1 && (n === suffix || n.includes(suffix) || suffix.includes(n));
  });
  return hit ? { title: m[1].trim(), site: m[2].trim() } : { title, site: null };
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
  const { html: body, leadingDate } = sanitize(content, url, title);
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
    published: formatDate(parsed?.publishedTime) ?? leadingDate,
    lang: parsed?.lang || doc.documentElement.lang || null,
    dir: parsed?.dir || null,
    content: body,
    wordCount: words,
    readingMinutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
  };
}
