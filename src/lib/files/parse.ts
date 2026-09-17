import DOMPurify from "dompurify";
import { FILE_ERROR, FILE_FORMAT, PARSER_VERSION } from "@/constants/files";
import { WORDS_PER_MINUTE } from "@/constants/extract";
import { sanitizeToHtml } from "@/lib/sanitize";
import type { Article } from "@/types/article";
import type { DocumentSource, ParseResult, ParsedContent } from "@/types/document";

export { PARSER_VERSION };

const decode = (buffer: ArrayBuffer) => new TextDecoder("utf-8").decode(buffer);

function toArticle(content: ParsedContent, source: DocumentSource): Article {
  const html = sanitizeToHtml(DOMPurify, content.html);
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
