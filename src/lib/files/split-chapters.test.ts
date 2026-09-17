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

describe("splitChapters: heading levels", () => {
  it("splits at parts when a book has several h1s, and lists their sections underneath", () => {
    const { chapters, toc } = splitChapters(
      dom("<h1>Part I</h1><h2>One</h2><p>a</p><h2>Two</h2><p>b</p><h1>Part II</h1><h2>Three</h2><p>c</p>"),
    );
    expect(chapters.map((c) => c.title)).toEqual(["Part I", "Part II"]);
    expect(toc.map((t) => [t.title, t.chapter, t.depth ?? 2])).toEqual([
      ["Part I", 0, 2],
      ["One", 0, 3],
      ["Two", 0, 3],
      ["Part II", 1, 2],
      ["Three", 1, 3],
    ]);
  });

  it("drops a leading h1 that is the book's own title and splits at its sections", () => {
    const { chapters } = splitChapters(dom("<h1>Book Title</h1><p>front matter</p><h2>One</h2><p>a</p><h2>Two</h2><p>b</p>"));
    expect(chapters.map((c) => c.title)).toEqual(["Beginning", "One", "Two"]);
    expect(chapters[0].content).not.toContain("Book Title");
    expect(chapters[0].content).toContain("front matter");
  });

  it("gives sections an id so contents entries can jump to them", () => {
    const { toc, anchors } = splitChapters(dom("<h1>Part I</h1><h2>One</h2><p>a</p><h1>Part II</h1><h2>Two</h2><p>b</p>"));
    const section = toc.find((t) => t.title === "Two")!;
    expect(section.anchor).toBeTruthy();
    expect(anchors[section.anchor!]).toBe(1);
  });
});
