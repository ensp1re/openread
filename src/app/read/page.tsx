import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cache } from "react";
import { ExtractError } from "@/components/extract-error";
import { RECENT_KIND } from "@/constants/library";
import { Reader } from "@/components/reader/reader";
import { extractArticle } from "@/lib/extract";
import type { ReadPageProps, ReadSearchParams } from "@/types/pages";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

// generateMetadata and the page both need the article; fetch it once per request.
const load = cache((url: string, simple: boolean) => extractArticle(url, { simple }));

async function read(searchParams: Promise<ReadSearchParams>) {
  const params = await searchParams;
  const url = first(params.url);
  const simple = first(params.mode) === "simple";
  return { url, simple, result: url ? await load(url, simple) : null };
}

export async function generateMetadata({ searchParams }: ReadPageProps): Promise<Metadata> {
  const { result } = await read(searchParams);
  return {
    title: result?.ok ? result.article.title : "Couldn't extract this article",
    robots: { index: false },
  };
}

export default async function ReadPage({ searchParams }: ReadPageProps) {
  const { url, simple, result } = await read(searchParams);
  if (!result) redirect("/");
  if (!result.ok) return <ExtractError url={url} code={result.code} status={result.status} simple={simple} />;
  const { article } = result;
  const source = article.siteName ?? (article.url ? new URL(article.url).hostname.replace(/^www\./, "") : null);
  return (
    <Reader
      article={article}
      recent={{
        id: article.url ?? url,
        kind: RECENT_KIND.URL,
        title: article.title,
        source,
        href: `/read?url=${encodeURIComponent(article.url ?? url)}${simple ? "&mode=simple" : ""}`,
      }}
    />
  );
}
