import { describe, expect, it } from "vitest";
import { extractArticle } from ".";

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
    });
  }
});
