import { textToHtml } from "@/lib/pasted-article";
import type { DocumentSource } from "@/types/document";

/** Plain text: blank lines separate paragraphs, and the first non-empty line can serve as a title. */
export function parseText(text: string, source: DocumentSource) {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim())?.trim() ?? "";
  const title = firstLine.length > 0 && firstLine.length <= 120 ? firstLine : source.name;
  const body = title === firstLine ? text.replace(firstLine, "") : text;
  return { title, html: textToHtml(body) };
}
