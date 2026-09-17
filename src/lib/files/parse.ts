import DOMPurify from "dompurify";
import { decodeHtml } from "@/lib/decode";
import { hardenUrls } from "@/lib/harden-urls";
import { isBook } from "@/lib/files/classify";
import { demoteHeadings, splitChapters } from "@/lib/files/split-chapters";
import { sanitizeToDom } from "@/lib/sanitize";
import { FILE_ERROR, FILE_FORMAT, PARSER_VERSION } from "@/constants/files";
import { WORDS_PER_MINUTE } from "@/constants/extract";
import type { Article } from "@/types/article";
import type { Book, DocumentSource, ParseResult, ParsedContent, ReadableDoc } from "@/types/document";

export { PARSER_VERSION };

/** Files carry no Content-Type, so the bytes and any meta charset decide (Windows "Save as" is often not UTF-8). */
const decode = (buffer: ArrayBuffer) => decodeHtml(new Uint8Array(buffer), "");

const nameWithoutExtension = (name: string) => name.replace(/\.[^.]+$/, "");

function toDocument(content: ParsedContent, source: DocumentSource): ReadableDoc {
  // No document address: relative URLs are dropped rather than resolved against this app.
  const body = sanitizeToDom(DOMPurify, content.html);
  hardenUrls(body, null);
  const title = content.title.trim() || nameWithoutExtension(source.name);
  // The reader prints the title as the page's h1; the document's own headings sit under it.
  demoteHeadings(body);
  // splitChapters moves the body's nodes into chapters, so keep the whole document first.
  const html = body.innerHTML;
  const text = body.textContent ?? "";
  const { chapters, toc, anchors } = splitChapters(body, title);

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
/** Chapters built by a parser still go through the sanitizer before they are shown. */
function sanitizeBook(book: Book): ReadableDoc {
  const chapters = book.chapters.map((chapter) => {
    const body = sanitizeToDom(DOMPurify, chapter.content);
    hardenUrls(body, null);
    return { ...chapter, content: body.innerHTML };
  });
  return { kind: "book", book: { ...book, chapters } };
}

export async function parseFile(
  file: Blob,
  source: DocumentSource,
  /** pdfWorkerSrc is only passed by tests, which can't reach /pdf.worker.min.mjs. */
  options: { password?: string; pdfWorkerSrc?: string } = {},
): Promise<ParseResult> {
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
      case FILE_FORMAT.PDF: {
        const { parsePdf, PdfPasswordNeeded, PdfHasNoText } = await import("./parsers/pdf");
        try {
          const pdf = await parsePdf(file, options.password, options.pdfWorkerSrc);
          const { bookFromOutline, pdfIsBook } = await import("./pdf-document");
          const title = pdf.title.trim() || nameWithoutExtension(source.name);
          if (pdfIsBook(pdf.pageCount, pdf.outline) && pdf.outline.some((e) => e.depth === 2)) {
            const book = bookFromOutline(title, pdf.author ?? null, pdf.pageBodies, pdf.pageTexts, pdf.outline);
            return { ok: true, doc: sanitizeBook(book) };
          }
          content = pdf;
          break;
        } catch (error) {
          if (error instanceof PdfPasswordNeeded) return { ok: false, code: FILE_ERROR.NEEDS_PASSWORD };
          if (error instanceof PdfHasNoText) return { ok: false, code: FILE_ERROR.NO_TEXT };
          throw error;
        }
      }
      case FILE_FORMAT.DOCX: {
        const { parseDocx } = await import("./parsers/docx");
        content = await parseDocx(file);
        break;
      }
      case FILE_FORMAT.EPUB: {
        const { parseEpub } = await import("./parsers/epub");
        const result = await parseEpub(file);
        return result.ok ? { ok: true, doc: { kind: "book", book: result.book } } : result;
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
