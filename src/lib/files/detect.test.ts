import { describe, expect, it } from "vitest";
import { FILE_FORMAT } from "@/constants/files";
import { detectFormat } from "./detect";

const bytes = (...b: number[]) => Uint8Array.from(b);
const ZIP = bytes(0x50, 0x4b, 0x03, 0x04);
const PDF = bytes(0x25, 0x50, 0x44, 0x46, 0x2d);
const TEXT = new TextEncoder().encode("Hello");

describe("detectFormat", () => {
  it("uses the extension for text formats", () => {
    expect(detectFormat("notes.txt", TEXT)).toBe(FILE_FORMAT.TEXT);
    expect(detectFormat("guide.MD", TEXT)).toBe(FILE_FORMAT.MARKDOWN);
    expect(detectFormat("page.htm", TEXT)).toBe(FILE_FORMAT.HTML);
  });

  it("tells EPUB and DOCX apart by extension, since both are zips", () => {
    expect(detectFormat("book.epub", ZIP)).toBe(FILE_FORMAT.EPUB);
    expect(detectFormat("report.docx", ZIP)).toBe(FILE_FORMAT.DOCX);
    expect(detectFormat("unknown.zip", ZIP)).toBe(FILE_FORMAT.EPUB);
  });

  it("trusts the bytes when the name lies", () => {
    expect(detectFormat("notes.txt", PDF)).toBe(FILE_FORMAT.PDF);
    expect(detectFormat("book.epub", TEXT)).toBeNull();
  });

  it("rejects everything else", () => {
    expect(detectFormat("app.exe", bytes(0x4d, 0x5a))).toBeNull();
    expect(detectFormat("noextension", TEXT)).toBeNull();
  });
});
