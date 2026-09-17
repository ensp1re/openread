// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { Blob } from "node:buffer";
import { describe, expect, it } from "vitest";
import { FILE_FORMAT } from "@/constants/files";
import { parseFile } from "./parse";
import { splitChapters } from "./split-chapters";

const dom = (html: string) => {
  const el = document.createElement("div");
  el.innerHTML = html;
  return el;
};

describe("splitChapters", () => {
  it("splits at top-level headings and keeps the text before the first one", () => {
    const { chapters, toc } = splitChapters(dom("<p>Front matter.</p><h2>One</h2><p>First.</p><h2>Two</h2><p>Second.</p>"));
    expect(chapters.map((c) => c.title)).toEqual(["Beginning", "One", "Two"]);
    expect(chapters[1].content).toContain("First.");
    expect(toc.map((t) => t.chapter)).toEqual([0, 1, 2]);
  });

  it("records which chapter each id sits in, for in-book links", () => {
    const { anchors } = splitChapters(dom('<h2>One</h2><p id="a">x</p><h2 id="two">Two</h2><p id="b">y</p>'));
    expect(anchors).toEqual({ a: 0, two: 1, b: 1 });
  });

  it("promotes chapter openings in plain text, which has no headings", () => {
    const { chapters } = splitChapters(dom("<p>Chapter 1</p><p>Text one.</p><p>Chapter 2</p><p>Text two.</p>"));
    expect(chapters.map((c) => c.title)).toEqual(["Chapter 1", "Chapter 2"]);
  });

  it("leaves an ordinary short paragraph alone", () => {
    const { chapters } = splitChapters(dom("<p>Chapter and verse were argued over.</p><p>More text.</p>"));
    expect(chapters).toHaveLength(1);
  });
});

describe("book or article", () => {
  it("opens a long document with chapters as a book", async () => {
    const file = new Blob([readFileSync("test/fixtures/long-book.md")]) as unknown as globalThis.Blob;
    const r = await parseFile(file, { name: "long-book.md", format: FILE_FORMAT.MARKDOWN, size: 100_000 });
    if (!r.ok || r.doc.kind !== "book") throw new Error("expected a book");
    const { book } = r.doc;
    expect(book.title).toBe("The Long Book");
    expect(book.chapters).toHaveLength(13);
    expect(book.toc[1].title).toBe("Chapter 1");
    expect(book.anchors["user-content-note-9"]).toBe(2);
    expect(book.wordCount).toBeGreaterThan(12_000);
    expect(book.chapters[1].readingMinutes).toBeGreaterThan(0);
  });

  it("opens a short document as an article", async () => {
    const file = new Blob([readFileSync("test/fixtures/guide.md")]) as unknown as globalThis.Blob;
    const r = await parseFile(file, { name: "guide.md", format: FILE_FORMAT.MARKDOWN, size: 1000 });
    expect(r.ok && r.doc.kind).toBe("article");
  });
});
