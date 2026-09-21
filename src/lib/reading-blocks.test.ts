// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { openingWords, readingBlocks } from "./reading-blocks";

const html = (s: string) => {
  const div = document.createElement("div");
  div.innerHTML = s;
  return div;
};

describe("readingBlocks", () => {
  it("counts each place once, as its innermost block", () => {
    const root = html("<h2>A</h2><p>one</p><ul><li><p>two</p></li><li>three</li></ul><blockquote><p>four</p></blockquote><figure><img alt=''></figure>");
    expect(readingBlocks(root).map((el) => el.textContent || el.tagName)).toEqual(["A", "one", "two", "three", "four", "FIGURE"]);
  });

  it("has nothing to offer without text", () => {
    expect(readingBlocks(null)).toEqual([]);
  });
});

describe("openingWords", () => {
  it("keeps short text whole and cuts long text at a word", () => {
    expect(openingWords(html("<p>Short   and\n plain.</p>").firstElementChild!)).toBe("Short and plain.");
    const long = openingWords(html(`<p>${"word ".repeat(60)}</p>`).firstElementChild!, 40);
    expect(long.endsWith("word…")).toBe(true);
    expect(long.length).toBeLessThanOrEqual(41);
  });
});
