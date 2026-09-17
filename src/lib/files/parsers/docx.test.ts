// @vitest-environment jsdom
import { Blob } from "node:buffer";
import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { FILE_FORMAT } from "@/constants/files";
import { parseFile } from "@/lib/files/parse";

const put = (files: Record<string, Uint8Array>, path: string, content: string) => (files[path] = new TextEncoder().encode(content));

/** A small but real .docx: headings, a list, a table, a footnote, an image and a core title. */
function makeDocx(body: string, title = "A Word Document") {
  const files: Record<string, Uint8Array> = {};
  put(files, "[Content_Types].xml", `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content_types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`);
  put(files, "_rels/.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`);
  put(files, "docProps/core.xml", `<?xml version="1.0"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${title}</dc:title><dc:creator>A Writer</dc:creator></cp:coreProperties>`);
  put(files, "word/_rels/document.xml.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdImg" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/a.png"/><Relationship Id="rIdFn" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes" Target="footnotes.xml"/><Relationship Id="rIdNum" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>`);
  put(files, "word/numbering.xml", `<?xml version="1.0"?><w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`);
  put(files, "word/footnotes.xml", `<?xml version="1.0"?><w:footnotes xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:footnote w:id="1"><w:p><w:r><w:t>A footnote at the end.</w:t></w:r></w:p></w:footnote></w:footnotes>`);
  files["word/media/a.png"] = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  put(files, "word/document.xml", `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}</w:body></w:document>`);
  return new Blob([zipSync(files)]) as unknown as globalThis.Blob;
}

const heading = (level: number, text: string) => `<w:p><w:pPr><w:pStyle w:val="Heading${level}"/></w:pPr><w:r><w:t>${text}</w:t></w:r></w:p>`;
const para = (text: string) => `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;
const listItem = (text: string) => `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>${text}</w:t></w:r></w:p>`;
const table = `<w:tbl><w:tr><w:tc>${para("Cell one")}</w:tc><w:tc>${para("Cell two")}</w:tc></w:tr></w:tbl>`;
const footnoteRef = `<w:p><w:r><w:t>With a note</w:t></w:r><w:r><w:footnoteReference w:id="1"/></w:r></w:p>`;
const image = `<w:p><w:r><w:drawing><wp:inline><a:graphic><a:graphicData><pic:pic><pic:blipFill><a:blip r:embed="rIdImg"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;

const openDocx = async (body: string, title?: string) => {
  const r = await parseFile(makeDocx(body, title), { name: "doc.docx", format: FILE_FORMAT.DOCX, size: 5000 });
  if (!r.ok) throw new Error(r.code);
  return r.doc;
};

describe("parseDocx", () => {
  it("keeps headings, lists, tables, footnotes and images", async () => {
    const doc = await openDocx([heading(1, "A section"), para("Some text in the document."), listItem("First"), listItem("Second"), table, footnoteRef, image].join(""));
    if (doc.kind !== "article") throw new Error("expected an article");
    const { content } = doc.article;
    expect(doc.article.title).toBe("A Word Document");
    expect(doc.article.byline).toBe("A Writer");
    expect(content).toContain("A section");
    expect(content).toContain("<li>First</li>");
    expect(content).toContain("<td>");
    expect(content).toContain("Cell one");
    expect(content).toContain("A footnote at the end.");
    expect(content).toContain("data:image/png;base64,");
  });

  it("opens a long document with Heading 1 sections as a book", async () => {
    const chapters = Array.from({ length: 10 }, (_, i) => [heading(1, `Chapter ${i + 1}`), ...Array.from({ length: 10 }, () => para("word ".repeat(150)))].join("")).join("");
    const doc = await openDocx(chapters);
    if (doc.kind !== "book") throw new Error("expected a book");
    expect(doc.book.chapters).toHaveLength(10);
    expect(doc.book.chapters[0].title).toBe("Chapter 1");
    expect(doc.book.title).toBe("A Word Document");
  });

  it("falls back to the file name when the document has no title", async () => {
    const doc = await openDocx(para("Just a line of text in a document with no title of its own."), "");
    if (doc.kind !== "article") throw new Error("expected an article");
    expect(doc.article.title).toBe("doc");
  });
});
