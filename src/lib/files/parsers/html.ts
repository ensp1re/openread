import { Readability } from "@mozilla/readability";
import { splitSiteSuffix } from "@/lib/title";
import type { DocumentSource, ParsedContent } from "@/types/document";

/** A saved web page: Readability picks the article out of the page chrome, as it does for URLs. */
export function parseHtml(html: string, source: DocumentSource): ParsedContent {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const title = doc.title?.trim();
  const parsed = new Readability(doc.cloneNode(true) as Document).parse();
  const body = parsed?.content && (parsed.textContent ?? "").trim().length > 200 ? parsed.content : (doc.body?.innerHTML ?? "");
  // "Saved page — Example" → "Saved page", as for extracted URLs.
  const withoutSite = splitSiteSuffix(
    (parsed?.title || title || source.name).trim(),
    [parsed?.siteName, source.name.replace(/\.[a-z]+$/i, "")],
    doc.querySelector("h1")?.textContent,
  );
  return { title: withoutSite.title, html: body, author: parsed?.byline ?? null, lang: doc.documentElement.lang || null };
}
