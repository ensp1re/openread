import { marked } from "marked";
import type { DocumentSource, ParsedContent } from "@/types/document";

/** Markdown: the first top-level heading is the title. Read from the tokens, so a "#" inside a code fence isn't one. */
export function parseMarkdown(text: string, source: DocumentSource): ParsedContent {
  const tokens = marked.lexer(text);
  const heading = tokens.find((t) => t.type === "heading" && t.depth === 1) as { text?: string } | undefined;
  const title = heading?.text?.trim();
  const html = marked.parse(text, { async: false, gfm: true });
  return { title: title || source.name, html: title ? html.replace(/<h1[^>]*>[\s\S]*?<\/h1>/, "") : html };
}
