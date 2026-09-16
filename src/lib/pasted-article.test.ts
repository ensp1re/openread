import { describe, expect, it } from "vitest";
import { buildPastedArticle, textToHtml } from "./pasted-article";

describe("textToHtml", () => {
  it("splits on blank lines and escapes markup", () => {
    expect(textToHtml("One\nstill one\n\n<b>Two</b>")).toBe("<p>One still one</p><p>&#60;b&#62;Two&#60;/b&#62;</p>");
  });
  it("treats every line as a paragraph when there are no blank lines", () => {
    expect(textToHtml("A\nB\r\nC")).toBe("<p>A</p><p>B</p><p>C</p>");
  });
});

describe("buildPastedArticle", () => {
  it("defaults the title and computes reading time", () => {
    const a = buildPastedArticle("  ", textToHtml("word ".repeat(476)), null);
    expect(a.title).toBe("Untitled");
    expect(a.wordCount).toBe(476);
    expect(a.readingMinutes).toBe(2);
  });
});
