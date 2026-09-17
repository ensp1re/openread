// Builds the small PDFs the tests use. Run: node scripts/make-pdf-fixtures.mjs
import { writeFileSync } from "node:fs";

const escape = (s) => s.replace(/([()\\])/g, "\\$1");

/** A page of positioned text lines: [{ text, x, y, size }]. */
function textStream(lines) {
  return lines
    .map(({ text, x, y, size = 10 }) => `BT /F1 ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escape(text)}) Tj ET`)
    .join("\n");
}

function buildPdf(pages, { encrypted = false } = {}) {
  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length;
  };

  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds = [];
  const contentIds = pages.map((lines) => {
    const stream = textStream(lines);
    return add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  const pagesId = objects.length + pages.length + 1;
  pages.forEach((_, i) => {
    pageIds.push(
      add(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`,
      ),
    );
  });
  const realPagesId = add(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
  const catalogId = add(`<< /Type /Catalog /Pages ${realPagesId} 0 R >>`);
  const encryptId = encrypted
    ? add(`<< /Filter /Standard /V 1 /R 2 /O <${"ab".repeat(16)}> /U <${"cd".repeat(16)}> /P -44 >>`)
    : null;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const startxref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R${encryptId ? ` /Encrypt ${encryptId} 0 R /ID [<11> <22>]` : ""} >>\nstartxref\n${startxref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

// Lines are kept inside their column: about 40 characters at 10pt is 200 units wide.
const body = (column, page) =>
  Array.from({ length: 18 }, (_, i) => ({
    text:
      i === 0 && column === 0
        ? "Reading rests on measures often mis-"
        : i === 1 && column === 0
          ? "understood, as this sentence shows."
          : `Column ${column + 1} line ${i + 1} on page ${page}.`,
    x: column === 0 ? 60 : 330,
    y: 700 - i * 14,
    size: 10,
  }));

const twoColumnPages = [1, 2, 3].map((page) => [
  { text: "A Journal of Typography", x: 60, y: 760, size: 9 },
  { text: `${page}`, x: 300, y: 36, size: 9 },
  { text: page === 1 ? "Reading on Screens" : `Section ${page}`, x: 60, y: 730, size: 16 },
  ...body(0, page),
  ...body(1, page),
]);

writeFileSync("test/fixtures/two-column.pdf", buildPdf(twoColumnPages));
writeFileSync("test/fixtures/scanned.pdf", buildPdf([[]]));
writeFileSync("test/fixtures/locked.pdf", buildPdf([[{ text: "Secret", x: 60, y: 700 }]], { encrypted: true }));
console.log("wrote two-column.pdf, scanned.pdf, locked.pdf");
