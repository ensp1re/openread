// @vitest-environment jsdom
import { Blob } from "node:buffer";
import { readFileSync } from "node:fs";
import { strFromU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { FILE_ERROR } from "@/constants/files";
import { parseEpub } from "./epub";

const fixture = (name: string) => new Blob([readFileSync(`test/fixtures/${name}`)]) as unknown as globalThis.Blob;

const chapter = (title: string, body: string) =>
  `<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${title}</title></head><body>${body}</body></html>`;

/** Builds a small EPUB in memory, so awkward shapes can be tested without binary fixtures. */
function makeEpub(extra: Record<string, string> = {}, opfExtra = "") {
  const files: Record<string, Uint8Array> = {};
  const put = (path: string, content: string) => (files[path] = new TextEncoder().encode(content));
  put("mimetype", "application/epub+zip");
  put("META-INF/container.xml", `<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="OEBPS/book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
  put(
    "OEBPS/book.opf",
    `<package xmlns="http://www.idpf.org/2007/opf" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>A Small Book</dc:title><dc:creator>A Writer</dc:creator><dc:language>en</dc:language>${opfExtra}</metadata>
     <manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="c1" href="text/one.xhtml" media-type="application/xhtml+xml"/><item id="c2" href="text/two.xhtml" media-type="application/xhtml+xml"/></manifest>
     <spine><itemref idref="c1"/><itemref idref="c2"/></spine></package>`,
  );
  put("OEBPS/nav.xhtml", chapter("Contents", `<nav epub:type="toc"><ol><li><a href="text/one.xhtml">First chapter</a></li><li><a href="text/two.xhtml">Second chapter</a><ol><li><a href="text/two.xhtml#part">A section</a></li></ol></li></ol></nav>`));
  put("OEBPS/text/one.xhtml", chapter("One", `<h1>Ignored heading</h1><p>The first chapter, with a <a href="two.xhtml#part">link to the second</a> and a <a href="https://example.com/x">link out</a>.</p><script>alert(1)</script>`));
  put("OEBPS/text/two.xhtml", chapter("Two", `<p id="part">The second chapter.</p><img src="../images/a.gif" alt="A picture"/>`));
  files["OEBPS/images/a.gif"] = Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
  for (const [path, content] of Object.entries(extra)) put(path, content);
  return new Blob([zipSync(files)]) as unknown as globalThis.Blob;
}

describe("parseEpub", () => {
  it("reads metadata, spine chapters, contents and images", async () => {
    const r = await parseEpub(makeEpub());
    if (!r.ok) throw new Error(r.code);
    const { book } = r;
    expect(book.title).toBe("A Small Book");
    expect(book.author).toBe("A Writer");
    expect(book.lang).toBe("en");
    expect(book.chapters.map((c) => c.title)).toEqual(["First chapter", "Second chapter"]);
    expect(book.toc.map((t) => [t.title, t.chapter, t.depth ?? 2])).toEqual([
      ["First chapter", 0, 2],
      ["Second chapter", 1, 2],
      ["A section", 1, 3],
    ]);
    expect(book.chapters[1].content).toContain("data:image/gif;base64,");
  });

  it("turns a link to another file into an in-book link", async () => {
    const r = await parseEpub(makeEpub());
    if (!r.ok) throw new Error(r.code);
    expect(r.book.chapters[0].content).toContain('href="#user-content-part"');
    expect(r.book.anchors["user-content-part"]).toBe(1);
    expect(r.book.chapters[0].content).toContain('href="https://example.com/x"');
  });

  it("drops scripts and styles from the book", async () => {
    const r = await parseEpub(makeEpub());
    if (!r.ok) throw new Error(r.code);
    expect(r.book.chapters.map((c) => c.content).join("")).not.toMatch(/script|onerror|<style/i);
  });

  it.each([
    ["META-INF/rights.xml", "<rights/>"],
    ["META-INF/sinf.xml", "<sinf/>"],
    ["META-INF/license.lcpl", "{}"],
    ["META-INF/encryption.xml", `<encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><EncryptedData><EncryptionMethod Algorithm="http://www.w3.org/2001/04/xmlenc#aes128-cbc"/></EncryptedData></encryption>`],
  ])("refuses a book protected by DRM (%s)", async (path, content) => {
    const r = await parseEpub(makeEpub({ [path]: content }));
    expect(r).toEqual({ ok: false, code: FILE_ERROR.DRM });
  });

  it("allows font obfuscation, which is not DRM", async () => {
    const encryption = `<encryption xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><EncryptedData><EncryptionMethod Algorithm="http://www.idpf.org/2008/embedding"/></EncryptedData></encryption>`;
    const r = await parseEpub(makeEpub({ "META-INF/encryption.xml": encryption }));
    expect(r.ok).toBe(true);
  });

  it("refuses a fixed-layout book, which can't be reflowed", async () => {
    const r = await parseEpub(makeEpub({}, `<meta property="rendition:layout">pre-paginated</meta>`));
    expect(r).toEqual({ ok: false, code: FILE_ERROR.FIXED_LAYOUT });
  });

  it("reads a real EPUB 3 and EPUB 2 of the same book", async () => {
    for (const name of ["alice-epub3.epub", "alice-epub2.epub"]) {
      const r = await parseEpub(fixture(name));
      if (!r.ok) throw new Error(`${name}: ${r.code}`);
      expect(r.book.title).toMatch(/Alice/i);
      expect(r.book.author).toMatch(/Carroll/i);
      expect(r.book.chapters.length).toBeGreaterThan(10);
      expect(r.book.wordCount).toBeGreaterThan(20_000);
      expect(r.book.toc.length).toBeGreaterThan(10);
      expect(r.book.chapters.some((c) => /rabbit/i.test(c.content))).toBe(true);
    }
  });
});

describe("zip helper", () => {
  it("builds what the tests expect", () => {
    expect(strFromU8(new TextEncoder().encode("ok"))).toBe("ok");
  });
});

describe("chapter headings", () => {
  it("removes the book's own heading when it repeats the chapter title the reader shows", async () => {
    const r = await parseEpub(fixture("alice-epub3.epub"));
    if (!r.ok) throw new Error(r.code);
    const chapter = r.book.chapters.find((c) => /Rabbit-Hole/i.test(c.title))!;
    expect(chapter.title).toMatch(/Rabbit-Hole/i);
    expect(chapter.content).not.toMatch(/<h[12][^>]*>\s*CHAPTER I\./i);
    expect(chapter.content).toContain("Alice was beginning to get very tired");
  });
});
