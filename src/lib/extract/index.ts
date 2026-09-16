import { EXTRACT_ERROR } from "@/constants/extract";
import type { ExtractResult } from "@/types/article";
import { fetchPage } from "./fetch-page";
import { parseInWorker } from "./parse-in-worker";

// ponytail: per-process memory cache; use a shared cache (KV/Redis) if this runs on many instances.
const cache = new Map<string, { at: number; result: ExtractResult }>();
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 50;

export async function extractArticle(url: string, options: { simple?: boolean } = {}): Promise<ExtractResult> {
  const key = `${options.simple ? "simple:" : ""}${url}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.result;

  const fetched = await fetchPage(url);
  if (!fetched.ok) return { ok: false, code: fetched.code, status: fetched.status };

  const parsed = await parseInWorker({ html: fetched.page.html, url: fetched.page.url, options });
  const result: ExtractResult = !parsed.ok
    ? { ok: false, code: EXTRACT_ERROR.TOO_LARGE }
    : parsed.article
      ? { ok: true, article: parsed.article }
      : { ok: false, code: EXTRACT_ERROR.NO_CONTENT };

  // Pages that hit the parse time or memory limit are cached too, so repeating a URL can't keep a worker busy.
  if (result.ok || !parsed.ok) {
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
    cache.set(key, { at: Date.now(), result });
  }
  return result;
}
