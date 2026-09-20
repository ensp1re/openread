import type { Metadata } from "next";
import { ExtractError } from "@/components/extract-error";
import { EXTRACT_ERROR } from "@/constants/extract";
import { urlFromSegments } from "@/lib/read-path";
import type { ReadPathPageProps } from "@/types/pages";
import { ReadArticle, readMetadata } from "../read-article";

async function read({ params, searchParams }: ReadPathPageProps) {
  const [{ path }, query] = await Promise.all([params, searchParams]);
  const mode = Array.isArray(query.mode) ? query.mode[0] : query.mode;
  return { path, url: urlFromSegments(path), simple: mode?.trim() === "simple" };
}

export async function generateMetadata(props: ReadPathPageProps): Promise<Metadata> {
  const { url, simple } = await read(props);
  if (!url) return { title: "Couldn't extract this article", robots: { index: false } };
  return readMetadata(url, simple);
}

export default async function ReadPathPage(props: ReadPathPageProps) {
  const { path, url, simple } = await read(props);
  // A hand-edited address that isn't one: the same page as any other link we can't read.
  if (!url) return <ExtractError url={path.join("/")} code={EXTRACT_ERROR.INVALID_URL} simple={simple} />;
  return <ReadArticle url={url} simple={simple} />;
}
