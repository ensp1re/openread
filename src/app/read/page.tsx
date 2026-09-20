import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readPath } from "@/lib/read-path";
import type { ReadPageProps, ReadSearchParams } from "@/types/pages";
import { ReadArticle, readMetadata } from "./read-article";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

async function read(searchParams: Promise<ReadSearchParams>) {
  const params = await searchParams;
  const url = first(params.url);
  const simple = first(params.mode) === "simple";
  // Links a person can read are kept at /read/<site>/<path>; this form stays for everything else.
  return { url, simple, pretty: url ? readPath(url, simple) : null };
}

export async function generateMetadata({ searchParams }: ReadPageProps): Promise<Metadata> {
  const { url, simple, pretty } = await read(searchParams);
  // Don't extract the article only to throw the page away a moment later.
  if (!url || pretty?.startsWith("/read/")) return { robots: { index: false } };
  return readMetadata(url, simple);
}

export default async function ReadPage({ searchParams }: ReadPageProps) {
  const { url, simple, pretty } = await read(searchParams);
  if (!url || !pretty) redirect("/");
  if (pretty.startsWith("/read/")) redirect(pretty);
  return <ReadArticle url={url} simple={simple} />;
}
