import { marked } from "marked";
import type { DocumentSource, ParsedContent } from "@/types/document";

/** Markdown: the first heading is the title, the rest becomes HTML. */
export function parseMarkdown(text: string, source: DocumentSource): ParsedContent {
  const html = marked.parse(text, { async: false, gfm: true });
  const heading = /^#\s+(.+)$/m.exec(text)?.[1]?.trim();
  return { title: heading || source.name, html: heading ? html.replace(/<h1[^>]*>[\s\S]*?<\/h1>/, "") : html };
}
