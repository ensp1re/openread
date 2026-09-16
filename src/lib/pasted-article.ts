import DOMPurify from "dompurify";
import { WORDS_PER_MINUTE } from "@/constants/extract";
import type { Article } from "@/types/article";

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Blank lines separate paragraphs; without any, every line is a paragraph. */
export function textToHtml(text: string): string {
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  const blocks = /\n\s*\n/.test(normalized) ? normalized.split(/\n\s*\n/) : normalized.split("\n");
  return blocks
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => `<p>${escape(b).replace(/\n/g, " ")}</p>`)
    .join("");
}

export function sanitizePastedHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "pre", "code", "em", "i", "strong", "b", "a", "img", "figure", "figcaption", "hr", "sup", "sub", "table", "thead", "tbody", "tr", "th", "td"],
    ALLOWED_ATTR: ["href", "src", "alt", "title"],
  });
}

export function buildPastedArticle(title: string, html: string, url: string | null): Article {
  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return {
    url,
    title: title.trim() || "Untitled",
    dek: null,
    byline: null,
    siteName: null,
    published: null,
    lang: null,
    dir: null,
    content: html,
    wordCount: words,
    readingMinutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
  };
}
