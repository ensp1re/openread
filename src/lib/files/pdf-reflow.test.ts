import { describe, expect, it } from "vitest";
import type { PdfLine, PdfTextItem } from "@/types/pdf";
import { blocksToHtml, dropRunningHeads, orderColumns, titleFromFirstPage, toBlocks, toLines } from "./pdf-reflow";

const item = (text: string, x: number, y: number, size = 10, width = text.length * 5): PdfTextItem => ({ text, x, y, size, width });
const line = (text: string, x: number, y: number, size = 10, width = text.length * 5): PdfLine => ({ text, x, y, size, width });

describe("toLines", () => {
  it("joins runs on the same baseline and keeps reading order", () => {
    const lines = toLines([item("world", 80, 700), item("Hello", 40, 700), item("Next line", 40, 686)]);
    expect(lines.map((l) => l.text)).toEqual(["Hello world", "Next line"]);
  });

  it("doesn't insert a space inside a word split into runs", () => {
    const lines = toLines([item("Type", 40, 700, 10, 20), item("setting", 60, 700, 10, 35)]);
    expect(lines[0].text).toBe("Typesetting");
  });
});

describe("orderColumns", () => {
  it("reads the left column before the right", () => {
    const left = Array.from({ length: 5 }, (_, i) => line(`left ${i}`, 50, 700 - i * 12, 10, 200));
    const right = Array.from({ length: 5 }, (_, i) => line(`right ${i}`, 320, 700 - i * 12, 10, 200));
    const ordered = orderColumns([...left, ...right].sort((a, b) => b.y - a.y || a.x - b.x), 612);
    expect(ordered.map((l) => l.text)).toEqual(["left 0", "left 1", "left 2", "left 3", "left 4", "right 0", "right 1", "right 2", "right 3", "right 4"]);
  });

  it("leaves a single column alone", () => {
    const lines = Array.from({ length: 8 }, (_, i) => line(`line ${i}`, 50, 700 - i * 12, 10, 500));
    expect(orderColumns(lines, 612).map((l) => l.text)).toEqual(lines.map((l) => l.text));
  });
});

describe("dropRunningHeads", () => {
  it("removes headers, footers and page numbers that repeat", () => {
    const pages = [1, 2, 3, 4].map((n) => [
      line("A Journal of Typography", 50, 760),
      line(`Body text on page ${n}, which is different every time.`, 50, 400),
      line(`${n}`, 300, 30),
    ]);
    const cleaned = dropRunningHeads(pages, 792);
    expect(cleaned.flat().map((l) => l.text)).toEqual(pages.map((p) => p[1].text));
  });

  it("keeps a heading that only appears once near the top", () => {
    const pages = [[line("Introduction", 50, 760), line("Body.", 50, 400)], [line("Body two.", 50, 400)]];
    expect(dropRunningHeads(pages, 792).flat().map((l) => l.text)).toEqual(["Introduction", "Body.", "Body two."]);
  });
});

describe("toBlocks", () => {
  it("joins wrapped lines into a paragraph and rejoins a hyphenated word", () => {
    const lines = [line("The quick brown fox jumped over the lazy dog and kept run-", 50, 700), line("ning through the field until it reached the fence.", 50, 688)];
    const blocks = toBlocks([{ number: 1, lines }]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].text).toContain("kept running through");
  });

  it("starts a new paragraph after a wide gap or an indent", () => {
    const lines = [line("First paragraph line one.", 50, 700), line("First paragraph line two.", 50, 688), line("Second paragraph after a gap.", 50, 640)];
    expect(toBlocks([{ number: 1, lines }]).map((b) => b.text)).toEqual(["First paragraph line one. First paragraph line two.", "Second paragraph after a gap."]);
  });

  it("marks larger short lines as headings", () => {
    const lines = [line("A Section Title", 50, 700, 18), line("Body text of the section, in the usual size.", 50, 670, 10), line("More body text following on.", 50, 658, 10)];
    const blocks = toBlocks([{ number: 1, lines }]);
    expect(blocks[0]).toMatchObject({ type: "heading", text: "A Section Title" });
    expect(blocks[1].type).toBe("paragraph");
  });
});

describe("blocksToHtml", () => {
  it("escapes text and uses the heading level", () => {
    expect(blocksToHtml([{ type: "heading", text: "A & B", level: 2 }, { type: "paragraph", text: "<script>" }])).toBe(
      "<h2>A &#38; B</h2><p>&#60;script&#62;</p>",
    );
  });
});

describe("columns sharing a baseline", () => {
  it("splits runs separated by the gutter into separate lines", () => {
    const lines = toLines([item("Left column text", 60, 700, 10, 120), item("Right column text", 320, 700, 10, 120)]);
    expect(lines.map((l) => l.text)).toEqual(["Left column text", "Right column text"]);
  });
});

describe("titleFromFirstPage", () => {
  it("takes the largest lines at the top of page one", () => {
    const lines = [
      line("Attention Is All You Need", 150, 720, 18),
      line("Ashish Vaswani", 150, 690, 11),
      ...Array.from({ length: 6 }, (_, i) => line(`Body line ${i}`, 60, 640 - i * 12, 10)),
    ];
    expect(titleFromFirstPage(lines, 792)).toBe("Attention Is All You Need");
  });

  it("ignores large text further down the page, such as a sideways stamp", () => {
    const lines = [
      line("The Real Title", 150, 740, 18),
      line("arXiv:1706.03762v7", 20, 400, 18),
      ...Array.from({ length: 6 }, (_, i) => line(`Body line ${i}`, 60, 640 - i * 12, 10)),
    ];
    expect(titleFromFirstPage(lines, 792)).toBe("The Real Title");
  });

  it("says nothing when the page is all one size", () => {
    expect(titleFromFirstPage(Array.from({ length: 6 }, (_, i) => line(`Line ${i}`, 60, 700 - i * 12, 10)), 792)).toBe("");
  });
});
