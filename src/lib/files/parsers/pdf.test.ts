// @vitest-environment jsdom
import { Blob } from "node:buffer";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { FILE_ERROR, FILE_FORMAT } from "@/constants/files";
import { parseFile } from "@/lib/files/parse";

const fixture = (name: string) => new Blob([readFileSync(`test/fixtures/${name}`)]) as unknown as globalThis.Blob;
// Node can't fetch /pdf.worker.min.mjs; point pdf.js at the installed file instead.
const pdfWorkerSrc = pathToFileURL(createRequire(import.meta.url).resolve("pdfjs-dist/build/pdf.worker.min.mjs")).href;
const open = (name: string, password?: string) =>
  parseFile(fixture(name), { name, format: FILE_FORMAT.PDF, size: 10_000 }, { password, pdfWorkerSrc });

describe("PDF", () => {
  it("reflows a two-column page in reading order, without the running head", async () => {
    const r = await open("two-column.pdf");
    if (!r.ok || r.doc.kind !== "article") throw new Error(r.ok ? "expected an article" : r.code);
    const { content } = r.doc.article;
    expect(content).not.toContain("A Journal of Typography");
    expect(content).toContain("misunderstood, as this sentence shows");
    const first = content.indexOf("Column 1 line 3");
    const second = content.indexOf("Column 2 line 1");
    expect(first).toBeGreaterThan(0);
    expect(second).toBeGreaterThan(first);
    expect(content).toContain("Reading on Screens");
  });

  it("keeps a marker for each page, so the original can be found", async () => {
    const r = await open("two-column.pdf");
    if (!r.ok || r.doc.kind !== "article") throw new Error("expected an article");
    expect(r.doc.article.content).toContain('id="user-content-pdf-page-1"');
    expect(r.doc.article.content).toContain('id="user-content-pdf-page-3"');
  });

  it("asks for a password when the PDF has one", async () => {
    expect(await open("locked.pdf")).toEqual({ ok: false, code: FILE_ERROR.NEEDS_PASSWORD });
  });

  it("says when a PDF is a scan with no text in it", async () => {
    expect(await open("scanned.pdf")).toEqual({ ok: false, code: FILE_ERROR.NO_TEXT });
  });
});
