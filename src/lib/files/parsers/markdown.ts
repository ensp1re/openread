import { marked } from "marked";
import type { DocumentSource, ParsedContent } from "@/types/document";

/** Markdown: the first top-level heading is the title. Read from the tokens, so a "#" inside a code fence isn't one. */
export function parseMarkdown(text: string, source: DocumentSource): ParsedContent {
  const tokens = marked.lexer(text);
  const h1s = tokens.filter((t) => t.type === "heading" && t.depth === 1) as { text?: string }[];
  // Several h1s means they are the book's parts, not its title; keep them as structure.
  const title = h1s.length === 1 ? h1s[0].text?.trim() : undefined;
  const html = marked.parse(text, { async: false, gfm: true });
  return { title: title || source.name, html: title ? html.replace(/<h1[^>]*>[\s\S]*?<\/h1>/, "") : html };
}
