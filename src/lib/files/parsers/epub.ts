import DOMPurify from "dompurify";
import { unzip } from "fflate";
import { WORDS_PER_MINUTE } from "@/constants/extract";
import { EPUB_IMAGE_BUDGET_BYTES, EPUB_MAX_IMAGE_BYTES, EPUB_MAX_UNZIPPED_BYTES, FILE_ERROR } from "@/constants/files";
import { toChapter } from "@/lib/files/split-chapters";
import { hardenUrls } from "@/lib/harden-urls";
import { sanitizeToDom } from "@/lib/sanitize";
import type { Book, Chapter, FileErrorCode, TocEntry } from "@/types/document";

type Entries = Record<string, Uint8Array>;
export type EpubResult = { ok: true; book: Book } | { ok: false; code: FileErrorCode };

const text = (bytes: Uint8Array) => new TextDecoder("utf-8").decode(bytes);
const xml = (source: string) => new DOMParser().parseFromString(source, "application/xml");

/** Resolves an href against the file it appears in, as a zip path: "OEBPS/ch1.xhtml" + "../img/a.png". */
function resolvePath(from: string, href: string): string {
  const base = from.split("/").slice(0, -1);
  const parts = decodeURIComponent(href.split("#")[0]).split("/");
  for (const part of parts) {
    if (part === "." || part === "") continue;
    if (part === "..") base.pop();
    else base.push(part);
  }
  return base.join("/");
}

const TOO_LARGE_MESSAGE = "openread: book inflates too far";

class TooLarge extends Error {
  constructor() {
    super(TOO_LARGE_MESSAGE);
  }
}

/** Reads the zip, refusing a book that inflates past `maxBytes` (a zip bomb). */
export function readZip(bytes: Uint8Array, maxBytes = EPUB_MAX_UNZIPPED_BYTES): Promise<Entries> {
  let total = 0;
  return new Promise((resolve, reject) => {
    // Fonts, styles and scripts are never used: the reader supplies its own typography.
    unzip(
      bytes,
      {
        filter: (f) => {
          if (/\.(otf|ttf|woff2?|css|js)$/i.test(f.name)) return false;
          total += f.originalSize;
          // A zip bomb inflates far beyond the file's own size; stop reading it.
          if (total > maxBytes) throw new TooLarge();
          return true;
        },
      },
      (err, entries) => (err ? reject(err) : resolve(entries)),
    );
  });
}

const findEntry = (entries: Entries, name: string) =>
  Object.keys(entries).find((key) => key.toLowerCase() === name.toLowerCase());

/** Adobe, Apple and Readium mark protected books; font obfuscation alone is not DRM. */
function drmCode(entries: Entries): FileErrorCode | null {
  for (const name of ["META-INF/rights.xml", "META-INF/sinf.xml", "META-INF/license.lcpl"]) {
    if (findEntry(entries, name)) return FILE_ERROR.DRM;
  }
  const key = findEntry(entries, "META-INF/encryption.xml");
  if (!key) return null;
  const doc = xml(text(entries[key]));
  // Unreadable or unrecognised: assume it protects something rather than show scrambled text.
  if (doc.querySelector("parsererror")) return FILE_ERROR.DRM;
  const methods = [...doc.getElementsByTagName("*")].filter((el) => el.localName === "EncryptionMethod");
  if (methods.length === 0) return FILE_ERROR.DRM;
  const obfuscation = ["http://www.idpf.org/2008/embedding", "http://ns.adobe.com/pdf/enc#RC"];
  return methods.some((m) => {
    const algorithm = m.getAttribute("Algorithm") ?? "";
    return algorithm && !obfuscation.includes(algorithm);
  })
    ? FILE_ERROR.DRM
    : null;
}

/** Pages with a fixed size (comics, picture books) can't be reflowed into a reading column. */
function isFixedLayout(entries: Entries, opf: Document): boolean {
  const metas = [...opf.querySelectorAll("meta")];
  if (metas.some((m) => m.getAttribute("property") === "rendition:layout" && m.textContent?.trim() === "pre-paginated")) return true;
  if (metas.some((m) => m.getAttribute("name") === "rendition:layout" && m.getAttribute("content")?.trim() === "pre-paginated")) return true;
  const itemrefs = [...opf.querySelectorAll("spine > itemref")];
  if (itemrefs.length > 0 && itemrefs.every((ref) => (ref.getAttribute("properties") ?? "").includes("rendition:layout-pre-paginated"))) return true;
  const apple = findEntry(entries, "META-INF/com.apple.ibooks.display-options.xml");
  return !!apple && /fixed-layout[^>]*>\s*true/i.test(text(entries[apple]));
}

const IMAGE_TYPES: Readonly<Record<string, string>> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
};

/** The manifest usually names the type; fall back to the file's extension when it doesn't. */
function imageType(path: string, declared: string): string {
  if (declared.startsWith("image/")) return declared;
  const ext = path.toLowerCase().split(".").pop() ?? "";
  return Object.hasOwn(IMAGE_TYPES, ext) ? IMAGE_TYPES[ext] : "image/jpeg";
}

function imageDataUrl(entries: Entries, path: string, mediaType: string, budget: { left: number }): string | null {
  const bytes = entries[path];
  if (!bytes || bytes.length > EPUB_MAX_IMAGE_BYTES || bytes.length > budget.left) return null;
  budget.left -= bytes.length;
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${imageType(path, mediaType)};base64,${btoa(binary)}`;
}

function tocFromNav(doc: Document, navPath: string, chapterOf: (path: string) => number | undefined): TocEntry[] {
  const nav = [...doc.querySelectorAll("nav")].find((n) => n.getAttribute("epub:type") === "toc") ?? doc.querySelector("nav");
  const entries: TocEntry[] = [];
  const walk = (list: Element, depth: number) => {
    for (const li of [...list.children].filter((c) => c.tagName.toLowerCase() === "li")) {
      const link = li.querySelector("a");
      const href = link?.getAttribute("href");
      const chapter = href ? chapterOf(resolvePath(navPath, href)) : undefined;
      if (link && chapter !== undefined) {
        const anchor = href?.includes("#") ? `user-content-${href.split("#")[1]}` : undefined;
        entries.push({ title: (link.textContent ?? "").trim(), chapter, anchor, ...(depth > 2 ? { depth } : {}) });
      }
      const sub = li.querySelector("ol, ul");
      if (sub) walk(sub, depth + 1);
    }
  };
  const list = nav?.querySelector("ol, ul");
  if (list) walk(list, 2);
  return entries;
}

function tocFromNcx(doc: Document, ncxPath: string, chapterOf: (path: string) => number | undefined): TocEntry[] {
  const entries: TocEntry[] = [];
  const walk = (parent: Element, depth: number) => {
    for (const point of [...parent.children].filter((c) => c.tagName.toLowerCase() === "navpoint")) {
      const href = point.querySelector("content")?.getAttribute("src");
      const chapter = href ? chapterOf(resolvePath(ncxPath, href)) : undefined;
      if (chapter !== undefined) {
        const anchor = href?.includes("#") ? `user-content-${href.split("#")[1]}` : undefined;
        entries.push({ title: (point.querySelector("navLabel text")?.textContent ?? "").trim(), chapter, anchor, ...(depth > 2 ? { depth } : {}) });
      }
      walk(point, depth + 1);
    }
  };
  const map = doc.querySelector("navMap");
  if (map) walk(map, 2);
  return entries;
}

/**
 * Reads an EPUB into chapters the reader can show: the spine becomes chapters, the nav document or
 * NCX becomes the contents, images are inlined within a budget, and links between files become
 * in-book links. Styles and fonts are dropped; the reader supplies its own typography.
 */
export async function parseEpub(file: Blob, maxUnzippedBytes = EPUB_MAX_UNZIPPED_BYTES): Promise<EpubResult> {
  let entries: Entries;
  try {
    entries = await readZip(new Uint8Array(await file.arrayBuffer()), maxUnzippedBytes);
  } catch (e) {
    // fflate reports the filter's error as its own; the message identifies it.
    if (e instanceof TooLarge || String((e as Error)?.message) === TOO_LARGE_MESSAGE) return { ok: false, code: FILE_ERROR.TOO_LARGE };
    throw e;
  }

  const drm = drmCode(entries);
  if (drm) return { ok: false, code: drm };

  const containerKey = findEntry(entries, "META-INF/container.xml");
  const container = containerKey ? entries[containerKey] : undefined;
  if (!container) return { ok: false, code: FILE_ERROR.UNREADABLE };
  const opfPath = xml(text(container)).querySelector("rootfile")?.getAttribute("full-path");
  if (!opfPath || !entries[opfPath]) return { ok: false, code: FILE_ERROR.UNREADABLE };

  const opf = xml(text(entries[opfPath]));
  if (isFixedLayout(entries, opf)) return { ok: false, code: FILE_ERROR.FIXED_LAYOUT };

  const manifest = new Map<string, { path: string; type: string; properties: string }>();
  for (const item of opf.querySelectorAll("manifest > item")) {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    if (!id || !href) continue;
    manifest.set(id, {
      path: resolvePath(opfPath, href),
      type: item.getAttribute("media-type") ?? "",
      properties: item.getAttribute("properties") ?? "",
    });
  }

  // linear="no" marks auxiliary pages (notes, colophon); they stay, so links into them still work.
  const spine = [...opf.querySelectorAll("spine > itemref")]
    .map((ref) => manifest.get(ref.getAttribute("idref") ?? ""))
    .filter((item): item is NonNullable<typeof item> => !!item && /xhtml|html/.test(item.type));
  if (spine.length === 0) return { ok: false, code: FILE_ERROR.EMPTY };

  const chapterOfPath = new Map<string, number>();
  // First entry wins: a file listed twice in the spine should link to its first appearance.
  spine.forEach((item, index) => {
    if (!chapterOfPath.has(item.path)) chapterOfPath.set(item.path, index);
  });
  const budget = { left: EPUB_IMAGE_BUDGET_BYTES };
  const chapters: Chapter[] = [];
  const anchors: Record<string, number> = {};

  spine.forEach((item, index) => {
    const source = entries[item.path];
    if (!source) {
      chapters.push(toChapter(index, `Chapter ${index + 1}`, "", ""));
      return;
    }
    const body = sanitizeToDom(DOMPurify, xml(text(source)).body?.innerHTML ?? text(source));

    for (const img of body.querySelectorAll("img[src], image, image[href]")) {
      const src = img.getAttribute("src") || img.getAttribute("xlink:href") || img.getAttribute("href") || "";
      const path = resolvePath(item.path, src);
      const type = [...manifest.values()].find((m) => m.path === path)?.type ?? "";
      const url = imageDataUrl(entries, path, type, budget);
      if (!url) {
        img.remove();
        continue;
      }
      // SVG uses href/xlink:href, HTML uses src.
      img.setAttribute("src", url);
      if (img.tagName.toLowerCase() === "image") {
        img.setAttribute("href", url);
        img.setAttribute("xlink:href", url);
      }
    }

    // Anything else that would fetch from the network: a book must not report when it is opened.
    for (const el of body.querySelectorAll("video, audio, source, track, iframe, [srcset]")) {
      if (el.hasAttribute("srcset") && el.tagName.toLowerCase() === "img") el.removeAttribute("srcset");
      else el.remove();
    }

    // Links to other files in the book become in-book links the reader can follow.
    for (const link of body.querySelectorAll("a[href]")) {
      const href = link.getAttribute("href") ?? "";
      if (/^[a-z]+:/i.test(href) || href.startsWith("#")) continue;
      const target = chapterOfPath.get(resolvePath(item.path, href));
      if (target === undefined) {
        link.removeAttribute("href");
        continue;
      }
      const fragment = href.includes("#") ? `user-content-${href.split("#")[1]}` : `openread-chapter-${target}`;
      link.setAttribute("href", `#${fragment}`);
      link.removeAttribute("target");
      link.removeAttribute("rel");
      if (!href.includes("#")) anchors[fragment] = target;
    }

    // After the book's own links are rewritten: hardening drops anything still pointing outside.
    hardenUrls(body, null);

    for (const el of body.querySelectorAll("[id]")) anchors[el.id] = index;
    anchors[`openread-chapter-${index}`] = index;

    const heading = body.querySelector("h1, h2, h3");
    const title = (heading?.textContent ?? "").trim();
    chapters.push(toChapter(index, title || `Chapter ${index + 1}`, body.innerHTML, (body.textContent ?? "").trim()));
  });

  const chapterOf = (path: string) => chapterOfPath.get(path);
  const navItem = [...manifest.values()].find((m) => m.properties.split(/\s+/).includes("nav"));
  const ncxItem = manifest.get(opf.querySelector("spine")?.getAttribute("toc") ?? "");
  let toc: TocEntry[] = [];
  if (navItem && entries[navItem.path]) {
    toc = tocFromNav(new DOMParser().parseFromString(text(entries[navItem.path]), "text/html"), navItem.path, chapterOf);
  }
  if (toc.length === 0 && ncxItem && entries[ncxItem.path]) {
    toc = tocFromNcx(xml(text(entries[ncxItem.path])), ncxItem.path, chapterOf);
  }
  if (toc.length === 0) toc = chapters.map((c) => ({ title: c.title, chapter: c.index }));

  // A contents entry names its chapter better than the first heading in the file does.
  for (const entry of toc) {
    if (!entry.anchor && entry.title && chapters[entry.chapter]) {
      chapters[entry.chapter] = { ...chapters[entry.chapter], title: entry.title };
    }
  }

  // The reader prints the chapter title itself; the book's own heading would repeat it.
  const flat = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  chapters.forEach((c, index) => {
    const holder = document.createElement("div");
    holder.innerHTML = c.content;
    const heading = holder.querySelector("h1, h2, h3");
    if (!heading || !flat(heading.textContent ?? "")) return;
    if (flat(heading.textContent ?? "") !== flat(c.title)) return;
    // Only when it opens the chapter: a heading further down is part of the text.
    if (holder.firstElementChild !== heading && !holder.firstElementChild?.contains(heading)) return;
    heading.remove();
    chapters[index] = { ...c, content: holder.innerHTML };
  });

  // Dublin Core elements are namespaced (dc:title), which a CSS selector can't match.
  const metadata = opf.querySelector("metadata");
  const meta = (name: string) =>
    [...(metadata?.children ?? [])].find((el) => el.localName === name)?.textContent?.trim() || null;
  const cover = [...manifest.values()].find((m) => m.properties.split(/\s+/).includes("cover-image"));
  const wordCount = chapters.reduce((sum, c) => sum + c.wordCount, 0);
  if (wordCount === 0) return { ok: false, code: FILE_ERROR.EMPTY };

  return {
    ok: true,
    book: {
      title: meta("title") ?? "Untitled",
      author: meta("creator"),
      lang: meta("language"),
      dir: null,
      cover: cover ? imageDataUrl(entries, cover.path, cover.type, { left: EPUB_MAX_IMAGE_BYTES }) : null,
      toc,
      chapters,
      anchors,
      wordCount,
      readingMinutes: Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE)),
    },
  };
}
