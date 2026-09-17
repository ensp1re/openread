import DOMPurify from "dompurify";
import { decodeHtml } from "@/lib/decode";
import { hardenUrls } from "@/lib/harden-urls";
import { isBook } from "@/lib/files/classify";
import { splitChapters } from "@/lib/files/split-chapters";
import { sanitizeToDom } from "@/lib/sanitize";
import { FILE_ERROR, FILE_FORMAT, PARSER_VERSION } from "@/constants/files";
import { WORDS_PER_MINUTE } from "@/constants/extract";
import type { Article } from "@/types/article";
import type { DocumentSource, ParseResult, ParsedContent, ReadableDoc } from "@/types/document";

export { PARSER_VERSION };

/** Files carry no Content-Type, so the bytes and any meta charset decide (Windows "Save as" is often not UTF-8). */
const decode = (buffer: ArrayBuffer) => decodeHtml(new Uint8Array(buffer), "");

const nameWithoutExtension = (name: string) => name.replace(/\.[^.]+$/, "");

function toDocument(content: ParsedContent, source: DocumentSource): ReadableDoc {
  // No document address: relative URLs are dropped rather than resolved against this app.
  const body = sanitizeToDom(DOMPurify, content.html);
  hardenUrls(body, null);
  const title = content.title.trim() || nameWithoutExtension(source.name);
  // splitChapters moves the body's nodes into chapters, so keep the whole document first.
  const html = body.innerHTML;
  const text = body.textContent ?? "";
  const { chapters, toc, anchors } = splitChapters(body);

  if (!isBook(chapters)) return { kind: "article", article: toArticle(content, source, html, text) };

  const wordCount = chapters.reduce((sum, c) => sum + c.wordCount, 0);
  return {
    kind: "book",
    book: {
      title,
      author: content.author ?? null,
      lang: content.lang ?? null,
      dir: null,
      toc,
      chapters,
      anchors,
      wordCount,
      readingMinutes: Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE)),
    },
  };
}

function toArticle(content: ParsedContent, source: DocumentSource, html: string, text: string): Article {
  const words = text.split(/\s+/).filter(Boolean).length;
  return {
    url: null,
    title: content.title.trim() || nameWithoutExtension(source.name),
    dek: null,
    byline: content.author ?? null,
    siteName: null,
    published: null,
    lang: content.lang ?? null,
    dir: null,
    content: html,
    wordCount: words,
    readingMinutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
  };
}

/** Turns a file into something the reader can show. Each format's parser is loaded on demand. */
export async function parseFile(file: Blob, source: DocumentSource): Promise<ParseResult> {
  try {
    let content: ParsedContent;
    switch (source.format) {
      case FILE_FORMAT.TEXT: {
        const { parseText } = await import("./parsers/text");
        content = parseText(decode(await file.arrayBuffer()));
        break;
      }
      case FILE_FORMAT.MARKDOWN: {
        const { parseMarkdown } = await import("./parsers/markdown");
        content = parseMarkdown(decode(await file.arrayBuffer()));
        break;
      }
      case FILE_FORMAT.HTML: {
        const { parseHtml } = await import("./parsers/html");
        content = parseHtml(decode(await file.arrayBuffer()), source);
        break;
      }
      default:
        return { ok: false, code: FILE_ERROR.UNSUPPORTED };
    }
    const doc = toDocument(content, source);
    const words = doc.kind === "article" ? doc.article.wordCount : doc.book.wordCount;
    if (words === 0) return { ok: false, code: FILE_ERROR.EMPTY };
    return { ok: true, doc };
  } catch {
    return { ok: false, code: FILE_ERROR.UNREADABLE };
  }
}
