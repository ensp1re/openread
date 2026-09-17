import { describe, expect, it } from "vitest";
import { bookFromOutline, pdfIsBook } from "./pdf-document";
import type { PdfOutlineEntry } from "@/types/pdf";

const pages = Array.from({ length: 10 }, (_, i) => `<div data-page="${i + 1}">Page ${i + 1}</div>`);
const texts = Array.from({ length: 10 }, (_, i) => `Page ${i + 1} text`);

describe("bookFromOutline", () => {
  it("cuts the pages at the bookmarks", () => {
    const outline: PdfOutlineEntry[] = [
      { title: "One", page: 2, depth: 2 },
      { title: "Two", page: 6, depth: 2 },
    ];
    const book = bookFromOutline("A Paper", null, pages, texts, outline);
    expect(book.chapters.map((c) => c.title)).toEqual(["Beginning", "One", "Two"]);
    expect(book.chapters[1].content).toContain("Page 2");
    expect(book.chapters[1].content).toContain("Page 5");
    expect(book.chapters[2].content).toContain("Page 6");
  });

  it("keeps sections that start on the same page as the chapter before them", () => {
    const outline: PdfOutlineEntry[] = [
      { title: "Introduction", page: 1, depth: 2 },
      { title: "Background", page: 1, depth: 2 },
      { title: "Model", page: 3, depth: 2 },
    ];
    const book = bookFromOutline("A Paper", null, pages, texts, outline);
    expect(book.chapters.every((c) => c.wordCount > 0)).toBe(true);
    expect(book.toc.map((t) => t.title)).toContain("Background");
    expect(book.chapters[0].content).toContain("Page 1");
  });

  it("splits a long PDF without bookmarks into page ranges", () => {
    const many = Array.from({ length: 60 }, (_, i) => `<div>Page ${i + 1}</div>`);
    const manyTexts = Array.from({ length: 60 }, (_, i) => `Page ${i + 1} text`);
    const book = bookFromOutline("A Report", null, many, manyTexts, []);
    expect(book.chapters.length).toBeGreaterThan(3);
    expect(book.chapters[0].title).toMatch(/Pages 1/);
  });
});

describe("pdfIsBook", () => {
  it("is a book with two bookmarks, or when simply long", () => {
    expect(pdfIsBook(4, [{ title: "a", page: 1, depth: 2 }, { title: "b", page: 2, depth: 2 }])).toBe(true);
    expect(pdfIsBook(60, [])).toBe(true);
    expect(pdfIsBook(4, [])).toBe(false);
  });
});
