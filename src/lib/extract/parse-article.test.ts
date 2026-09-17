import { describe, expect, it } from "vitest";
import { parseArticle, parseSrcset } from "./parse-article";

describe("parseSrcset", () => {
  it("follows the HTML spec for commas inside URLs and missing spaces", () => {
    expect(parseSrcset("/a.png 1x,/b.png 2x, /w_400,h_300/c.png 400w, /d.png,")).toEqual([
      { url: "/a.png", descriptor: "1x" },
      { url: "/b.png", descriptor: "2x" },
      { url: "/w_400,h_300/c.png", descriptor: "400w" },
      { url: "/d.png", descriptor: "" },
    ]);
  });
});

const para = (n: number) =>
  `Paragraph ${n} talks at some length about an idea, so the extractor has enough real prose to score this block as the article body.`;

// Shaped like paulgraham.com: <font> wrappers, <br><br> paragraphs, a title image, a bare date line.
const PG_LIKE = `<html><head><title>Making Things Powerful</title></head><body>
<table><tr><td><img src="nav.gif" width="69" height="357"></td><td width="435">
<img src="title.gif" width="220" height="18" alt="Making Things Powerful"><br><br>
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
    expect(a.content).toMatch(/flows through you\.\s*(<span>)?\[<a href="#user-content-f1n"[^>]*>(<span>)?1(<\/span>)?<\/a>\]/);
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
    expect(a.content).toContain("data-wide");
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

describe("parseArticle review fixes", () => {
  const wrap = (body: string, head = "<title>How we rebuilt the engine</title>") =>
    `<html><head>${head}</head><body><article>${body}</article></body></html>`;

  it("does not cut a date that starts a real sentence, or when the page has a date", () => {
    const a = parseArticle(wrap(`<p>March 2020 was when everything changed. ${para(1)}</p><p>${para(2)}</p><h2>June 2024 update</h2><p>${para(3)}</p>`), "https://example.com/a")!;
    expect(a.content).toContain("March 2020 was when everything changed");
    expect(a.content).toContain("June 2024 update");
    expect(a.published).toBeNull();
    const b = parseArticle(wrap(`<p><strong>March 2020</strong> was when it all changed. ${para(1)}</p><p>${para(2)} ${para(3)}</p>`), "https://example.com/b")!;
    expect(b.content).toContain("<strong>March 2020</strong> was when");
    const c = parseArticle(wrap(`<p><cite>March 2020</cite> was when it all changed. ${para(1)}</p><p>${para(2)} ${para(3)}</p>`), "https://example.com/c", { simple: true })!;
    expect(c.content).toContain("<cite>March 2020</cite> was when");
    const d = parseArticle(wrap(`<h3>March 2020</h3><p>${para(1)} ${para(2)}</p><p>${para(3)}</p>`), "https://example.com/d", { simple: true })!;
    expect(d.content).toContain("<h3>March 2020</h3>");
  });

  it("keeps a hero image without size attributes even when its alt repeats the title", () => {
    const a = parseArticle(wrap(`<img src="/hero.jpg" alt="How we rebuilt the engine"><p>${para(1)} ${para(2)}</p><p>${para(3)}</p>`), "https://example.com/a", { simple: true })!;
    expect(a.content).toContain("https://example.com/hero.jpg");
  });

  it("keeps a lead image whose alt repeats the title when text comes before it", () => {
    const a = parseArticle(wrap(`<p>${para(1)}</p><figure><img src="/hero.jpg" alt="How we rebuilt the engine" width="1200" height="600"><figcaption>Hero</figcaption></figure><p>${para(2)} ${para(3)}</p>`), "https://example.com/a")!;
    expect(a.content).toContain("https://example.com/hero.jpg");
  });

  it("makes image, video and srcset URLs absolute in simple mode", () => {
    const a = parseArticle(wrap(`<p>${para(1)} ${para(2)}</p><img src="/rel.png" srcset="/a.png 1x,/b.png 2x, /w_400,h_300/c.png 400w" width="600" height="400"><p>${para(3)}</p>`), "https://example.com/post/", { simple: true })!;
    expect(a.content).toContain('src="https://example.com/rel.png"');
    expect(a.content).toContain('srcset="https://example.com/a.png 1x, https://example.com/b.png 2x, https://example.com/w_400,h_300/c.png 400w"');
  });

  it("keeps empty footnote targets and audio, and prefixes ids so they can't collide with the app", () => {
    const a = parseArticle(wrap(`<p id="reading-settings">${para(1)} <a href="#fn1">1</a></p><p>${para(2)}</p><div><audio controls src="/a.mp3"></audio></div><p>${para(3)}</p><span id="fn1"></span><span><a name="fn2"></a></span><p>Note one.</p>`), "https://example.com/a", { simple: true })!;
    expect(a.content).not.toContain('id="reading-settings"');
    expect(a.content).toContain('id="user-content-fn1"');
    expect(a.content).toContain('href="#user-content-fn1"');
    expect(a.content).toContain("<audio");
    expect(a.content).toContain('name="user-content-fn2"');
  });

  it("returns null instead of throwing on pathologically nested HTML", { timeout: 30_000 }, () => {
    const deep = "<div>".repeat(200_000) + para(1) + "</div>".repeat(200_000);
    expect(() => parseArticle(wrap(deep), "https://example.com/a")).not.toThrow();
  });
});
