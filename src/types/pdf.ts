/** One run of text as PDF.js reports it, in page coordinates (y counts up from the bottom). */
export interface PdfTextItem {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly size: number;
}

export interface PdfLine {
  text: string;
  x: number;
  y: number;
  width: number;
  size: number;
}

export interface PdfPage {
  readonly number: number;
  readonly lines: readonly PdfLine[];
}

export interface PdfBlock {
  readonly type: "heading" | "paragraph";
  readonly text: string;
  readonly level?: number;
}

export interface PdfOutlineEntry {
  readonly title: string;
  readonly page: number;
  readonly depth: number;
}
