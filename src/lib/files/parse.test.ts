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
    expect(await parseFile(fixture("notes.txt"), source("book.epub", FILE_FORMAT.EPUB))).toEqual({ ok: false, code: FILE_ERROR.UNSUPPORTED });
    expect(await parseFile(new Blob(["   "]) as unknown as globalThis.Blob, source("empty.txt", FILE_FORMAT.TEXT))).toEqual({ ok: false, code: FILE_ERROR.EMPTY });
  });
});
