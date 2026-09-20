import type { Metadata } from "next";
import { cache } from "react";
import { ExtractError } from "@/components/extract-error";
import { Reader } from "@/components/reader/reader";
import { RECENT_KIND } from "@/constants/library";
import { extractArticle } from "@/lib/extract";
import { readPath } from "@/lib/read-path";
import type { ReadArticleProps } from "@/types/pages";

// generateMetadata and the page both need the article; fetch it once per request.
const load = cache((url: string, simple: boolean) => extractArticle(url, { simple }));

export async function readMetadata(url: string, simple: boolean): Promise<Metadata> {
  const result = await load(url, simple);
  return { title: result.ok ? result.article.title : "Couldn't extract this article", robots: { index: false } };
}

export async function ReadArticle({ url, simple }: ReadArticleProps) {
  const result = await load(url, simple);
  if (!result.ok) return <ExtractError url={url} code={result.code} status={result.status} simple={simple} />;

  const { article } = result;
  const href = article.url ?? url;
  const source = article.siteName ?? (article.url ? new URL(article.url).hostname.replace(/^www\./, "") : null);
  return (
    <Reader
      article={article}
      recent={{ id: href, kind: RECENT_KIND.URL, title: article.title, source, href: readPath(href, simple) }}
    />
  );
}
