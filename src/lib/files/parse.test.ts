// @vitest-environment jsdom
import { Blob } from "node:buffer";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FILE_ERROR, FILE_FORMAT } from "@/constants/files";
import type { DocumentSource, FileFormat } from "@/types/document";
import { parseFile } from "./parse";

// jsdom's Blob has no arrayBuffer(); Node's does, like a real browser File.
const fixture = (name: string) => new Blob([readFileSync(`test/fixtures/${name}`)]) as unknown as globalThis.Blob;
const source = (name: string, format: FileFormat): DocumentSource => ({ name, format, size: 1000 });

const article = async (name: string, format: FileFormat) => {
  const r = await parseFile(fixture(name), source(name, format));
  if (!r.ok) throw new Error(`parse failed: ${r.code}`);
  if (r.doc.kind !== "article") throw new Error("expected an article");
  return r.doc.article;
};

describe("parseFile", () => {
  it("reads plain text, taking the first line as the title", async () => {
    const a = await article("notes.txt", FILE_FORMAT.TEXT);
    expect(a.title).toBe("Notes on quiet reading");
    expect(a.content.match(/<p>/g)).toHaveLength(2);
    expect(a.content).not.toContain("Notes on quiet reading");
    expect(a.wordCount).toBeGreaterThan(30);
  });

  it("reads Markdown into headings, lists, quotes and code", async () => {
    const a = await article("guide.md", FILE_FORMAT.MARKDOWN);
    expect(a.title).toBe("A short guide");
    expect(a.content).toContain("<h2>A section</h2>");
    expect(a.content).toContain("<li>one</li>");
    expect(a.content).toContain("<blockquote>");
    expect(a.content).toContain("<code");
    expect(a.content).toContain('href="https://example.com/page"');
    expect(a.content).not.toContain("<h1>");
  });

  it("reads a saved web page and drops its navigation", async () => {
    const a = await article("page.html", FILE_FORMAT.HTML);
    expect(a.title).toBe("Saved page");
    expect(a.content).toContain("first paragraph of a saved web page");
    expect(a.content).not.toContain("Footer junk");
    expect(a.content).not.toContain("About");
  });

  it("removes scripts, handlers, javascript: links and frames from any file", async () => {
    const a = await article("page.html", FILE_FORMAT.HTML);
    expect(a.content).not.toMatch(/script|onclick|onerror|javascript:|iframe/i);
    expect(a.content).toContain('href="https://example.com/x"');
  });

  it("reports formats it can't open yet and files with no text", async () => {
    expect(await parseFile(fixture("notes.txt"), source("paper.pdf", FILE_FORMAT.PDF))).toEqual({ ok: false, code: FILE_ERROR.UNSUPPORTED });
    expect(await parseFile(fixture("notes.txt"), source("book.epub", FILE_FORMAT.EPUB))).toEqual({ ok: false, code: FILE_ERROR.UNREADABLE });
    expect(await parseFile(new Blob(["   "]) as unknown as globalThis.Blob, source("empty.txt", FILE_FORMAT.TEXT))).toEqual({ ok: false, code: FILE_ERROR.EMPTY });
  });
});

describe("review fixes", () => {
  it("takes the Markdown title from a real heading, not a comment inside a code fence", async () => {
    const md = ["Intro paragraph.", "", "```sh", "# install the thing", "npm i", "```", "", "# The Real Title", "", "Body text."].join("\n");
    const r = await parseFile(new Blob([md]) as unknown as globalThis.Blob, source("readme.md", FILE_FORMAT.MARKDOWN));
    if (!r.ok || r.doc.kind !== "article") throw new Error("parse failed");
    expect(r.doc.article.title).toBe("The Real Title");
    expect(r.doc.article.content).toContain("install the thing");
    expect(r.doc.article.content).not.toContain("<h1>");
  });

  it("keeps a document's own h1 when no heading matches the title", async () => {
    const md = "Just a paragraph, with no heading at all, long enough to be read as content.";
    const r = await parseFile(new Blob([md]) as unknown as globalThis.Blob, source("plain.md", FILE_FORMAT.MARKDOWN));
    if (!r.ok || r.doc.kind !== "article") throw new Error("parse failed");
    expect(r.doc.article.title).toBe("plain");
  });

  it("reads files saved in an older encoding, not only UTF-8", async () => {
    const cp1252 = Uint8Array.from([..."Caf"].map((c) => c.charCodeAt(0)), (n) => n);
    const bytes = Uint8Array.from([...cp1252, 0xe9, ...new TextEncoder().encode(" notes\n\nA second paragraph with enough words in it to read.")]);
    const r = await parseFile(new Blob([bytes]) as unknown as globalThis.Blob, source("cafe.txt", FILE_FORMAT.TEXT));
    if (!r.ok || r.doc.kind !== "article") throw new Error("parse failed");
    expect(r.doc.article.title).toBe("Café notes");
  });

  it("drops relative URLs instead of resolving them against the app, and matches #fragment links to prefixed ids", async () => {
    const html = `<!doctype html><html><body><article>
      <p id="fn1">${"A paragraph with plenty of words so the extractor keeps this block as content. ".repeat(3)}</p>
      <p><a href="/settings">relative link</a> <a href="#fn1">footnote</a> <a href="https://example.com/x">external</a></p>
      <p><img src="/local.png" width="600" height="400" alt="relative image"></p>
      ${"<p>More text to be sure this is the article body and not page chrome around it.</p>".repeat(3)}
      </article></body></html>`;
    const r = await parseFile(new Blob([html]) as unknown as globalThis.Blob, source("saved.html", FILE_FORMAT.HTML));
    if (!r.ok || r.doc.kind !== "article") throw new Error("parse failed");
    const { content } = r.doc.article;
    expect(content).not.toContain('href="/settings"');
    expect(content).not.toContain('src="/local.png"');
    expect(content).toContain('href="#user-content-fn1"');
    expect(content).toMatch(/href="https:\/\/example\.com\/x"[^>]*rel="noopener noreferrer"/);
  });
});

describe("media URLs", () => {
  it("keeps only http(s) and inline images in src and srcset", async () => {
    const body = `<p>${"Enough words in this paragraph for the extractor to treat it as the article body. ".repeat(4)}</p>
      <p><img src="https://ok.example/a.png" srcset="https://ok.example/a.png 1x, javascript:alert(1) 2x, data:text/html;base64,PHNjcmlwdD4= 3x, data:image/gif;base64,R0lGOD 4x" width="600" height="400" alt=""></p>
      ${"<p>More body text, so this block is clearly the content of the page.</p>".repeat(3)}`;
    const r = await parseFile(new Blob([`<!doctype html><html><body><article>${body}</article></body></html>`]) as unknown as globalThis.Blob, source("m.html", FILE_FORMAT.HTML));
    if (!r.ok || r.doc.kind !== "article") throw new Error("parse failed");
    expect(r.doc.article.content).not.toContain("javascript:");
    expect(r.doc.article.content).not.toContain("data:text/html");
    expect(r.doc.article.content).toContain("data:image/gif");
    expect(r.doc.article.content).toContain("https://ok.example/a.png 1x");
  });
});
