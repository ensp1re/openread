import { describe, expect, it } from "vitest";
import { parseArticle } from "./parse-article";

const para = (n: number) =>
  `Paragraph ${n} talks at some length about an idea, so the extractor has enough real prose to score this block as the article body.`;

// Shaped like paulgraham.com: <font> wrappers, <br><br> paragraphs, a title image, a bare date line.
const PG_LIKE = `<html><head><title>Making Things Powerful</title></head><body>
<table><tr><td><img src="nav.gif" width="69" height="357"></td><td width="435">
<img src="title.gif" alt="Making Things Powerful"><br><br>
<font size="2" face="verdana">September 2026<br><br>
${para(1)} ${para(2)} It's always good when money flows through you.
<font color=#dddddd>[<a href="#f1n"><font color=#dddddd>1</font></a>]</font><br /><br />
${para(3)} ${para(4)}<br><br>${para(5)} ${para(6)}<br><br>
<b>Notes</b><br><br>[<a name="f1n"><font color=#000000>1</font></a>] A footnote.
</font></td></tr></table></body></html>`;

describe("parseArticle", () => {
  it("keeps footnote markers inside their paragraph and lifts the date line", () => {
    const a = parseArticle(PG_LIKE, "https://www.paulgraham.com/x.html")!;
    expect(a.title).toBe("Making Things Powerful");
    expect(a.published).toBe("September 2026");
    expect(a.content).not.toContain("September 2026");
    expect(a.content).not.toContain("title.gif");
    expect(a.content).toMatch(/flows through you\.\s*(<span>)?\[<a href="#f1n"[^>]*>(<span>)?1(<\/span>)?<\/a>\]/);
    expect(a.content).not.toMatch(/<p>\s*(<span><\/span>)?\s*<\/p>/);
  });

  it("removes scripts, event handlers and javascript: links", () => {
    const html = `<html><head><title>Safe</title></head><body><article><h1>Safe</h1>
      <p>${para(1)} <a href="javascript:alert(1)">bad link</a></p>
      <p onclick="alert(1)">${para(2)}</p><script>alert(1)</script>
      <img src="/a.png" onerror="alert(1)" width="600" height="400">
      <p>${para(3)} <a href="/relative">relative</a></p></article></body></html>`;
    const a = parseArticle(html, "https://example.com/post")!;
    expect(a.content).not.toMatch(/script|onclick|onerror|javascript:/i);
    expect(a.content).toContain('href="https://example.com/relative"');
    expect(a.content).toContain('src="https://example.com/a.png"');
    expect(a.content).toContain('loading="lazy"');
  });

  it("restores lazy-loaded images and drops tracking pixels", () => {
    const html = `<html><head><title>Images</title></head><body><article>
      <p>${para(1)} ${para(2)}</p>
      <figure><img src="data:image/gif;base64,R0lGOD" data-src="https://cdn.example.com/photo.jpg" alt="Photo"><figcaption>A caption</figcaption></figure>
      <p>${para(3)} ${para(4)}</p><img src="https://t.example.com/p.gif" width="1" height="1">
      </article></body></html>`;
    const a = parseArticle(html, "https://example.com/p")!;
    expect(a.content).toContain('src="https://cdn.example.com/photo.jpg"');
    expect(a.content).toContain("<figcaption>A caption</figcaption>");
    expect(a.content).not.toContain("t.example.com");
  });

  it("splits a site name off the title and ignores a description that repeats it", () => {
    const html = `<html><head><title>Line length | Practical Typography</title>
      <meta name="description" content="Practical Typography"></head>
      <body><article><p>${para(1)} ${para(2)}</p><p>${para(3)}</p></article></body></html>`;
    const a = parseArticle(html, "https://practicaltypography.com/line-length.html")!;
    expect(a.title).toBe("Line length");
    expect(a.siteName).toBe("Practical Typography");
    expect(a.dek).toBeNull();
  });

  it("counts reading time from prose only, not code blocks", () => {
    const code = "const x = 1;\n".repeat(2000);
    const prose = Array.from({ length: 20 }, (_, i) => `<p>${para(i)}</p>`).join("");
    const html = `<html><head><title>Code</title></head><body><article>${prose}<pre><code>${code}</code></pre></article></body></html>`;
    const a = parseArticle(html, "https://example.com/code")!;
    expect(a.content).toContain("<pre>");
    expect(a.wordCount).toBeLessThan(600);
    expect(a.readingMinutes).toBe(Math.max(1, Math.round(a.wordCount / 238)));
  });

  it("returns null when the page has no article text", () => {
    expect(parseArticle("<html><body><nav>Home</nav><p>Hi</p></body></html>", "https://example.com")).toBeNull();
  });
});
