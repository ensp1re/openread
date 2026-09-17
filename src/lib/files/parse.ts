import DOMPurify from "dompurify";
import { decodeHtml } from "@/lib/decode";
import { hardenUrls } from "@/lib/harden-urls";
import { sanitizeToDom } from "@/lib/sanitize";
import { FILE_ERROR, FILE_FORMAT, PARSER_VERSION } from "@/constants/files";
import { WORDS_PER_MINUTE } from "@/constants/extract";
import type { Article } from "@/types/article";
import type { DocumentSource, ParseResult, ParsedContent } from "@/types/document";

export { PARSER_VERSION };

/** Files carry no Content-Type, so the bytes and any meta charset decide (Windows "Save as" is often not UTF-8). */
const decode = (buffer: ArrayBuffer) => decodeHtml(new Uint8Array(buffer), "");

function toArticle(content: ParsedContent, source: DocumentSource): Article {
  const body = sanitizeToDom(DOMPurify, content.html);
  // No document address: relative URLs are dropped rather than resolved against this app.
  hardenUrls(body, null);
  const html = body.innerHTML;
  const words = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return {
    url: null,
    title: content.title.trim() || source.name,
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
        content = parseText(decode(await file.arrayBuffer()), source);
        break;
      }
      case FILE_FORMAT.MARKDOWN: {
        const { parseMarkdown } = await import("./parsers/markdown");
        content = parseMarkdown(decode(await file.arrayBuffer()), source);
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
    const article = toArticle(content, source);
    if (article.wordCount === 0) return { ok: false, code: FILE_ERROR.EMPTY };
    return { ok: true, doc: { kind: "article", article } };
  } catch {
    return { ok: false, code: FILE_ERROR.UNREADABLE };
  }
}
