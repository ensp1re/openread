import { describe, expect, it } from "vitest";
import { fetchPage } from "./fetch-page";
import { parseArticle } from "./parse-article";

// The worker in parse-in-worker.ts needs the Next bundler, so this calls fetch and parse directly.
async function extractArticle(url: string) {
  const f = await fetchPage(url);
  if (!f.ok) return f;
  const article = parseArticle(f.page.html, f.page.url);
  return article ? { ok: true as const, article } : { ok: false as const, code: "no-content" };
}

// Network test against real articles. Run with: LIVE=1 pnpm vitest run src/lib/extract/live.test.ts
const URLS = (process.env.LIVE_URLS ?? "https://www.paulgraham.com/powerful.html").split(",");

describe.skipIf(!process.env.LIVE)("live extraction", () => {
  for (const url of URLS) {
    it(url, { timeout: 30_000 }, async () => {
      const r = await extractArticle(url);
      if (!r.ok) console.log(url, r);
      else {
        const { content, ...meta } = r.article;
        console.log(JSON.stringify(meta), content.length, (content.match(/<(h2|h3|img|blockquote|pre|figure|figcaption|table|ul|ol)\b/g) ?? []).join(""));
      }
      expect(r.ok).toBe(true);
      // "�" means the page's encoding was guessed wrong (see decodeHtml).
      if (r.ok) expect(`${r.article.title} ${r.article.content}`).not.toContain("\uFFFD");
    });
  }
});
