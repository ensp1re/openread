import { textToHtml } from "@/lib/pasted-article";
import type { ParsedContent } from "@/types/document";

/** Plain text: blank lines separate paragraphs, and a short first line serves as the title. */
export function parseText(text: string): ParsedContent {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim())?.trim() ?? "";
  const isTitle = firstLine.length > 0 && firstLine.length <= 120;
  return { title: isTitle ? firstLine : "", html: textToHtml(isTitle ? text.replace(firstLine, "") : text) };
}
