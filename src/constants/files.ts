export const FILE_FORMAT = {
  EPUB: "epub",
  PDF: "pdf",
  DOCX: "docx",
  MARKDOWN: "markdown",
  HTML: "html",
  TEXT: "text",
} as const;

export const FILE_FORMAT_LABEL = {
  [FILE_FORMAT.EPUB]: "EPUB",
  [FILE_FORMAT.PDF]: "PDF",
  [FILE_FORMAT.DOCX]: "Word document",
  [FILE_FORMAT.MARKDOWN]: "Markdown",
  [FILE_FORMAT.HTML]: "HTML",
  [FILE_FORMAT.TEXT]: "Text",
} as const;

export const EXTENSION_FORMAT: Readonly<Record<string, string>> = {
  epub: FILE_FORMAT.EPUB,
  pdf: FILE_FORMAT.PDF,
  docx: FILE_FORMAT.DOCX,
  md: FILE_FORMAT.MARKDOWN,
  markdown: FILE_FORMAT.MARKDOWN,
  html: FILE_FORMAT.HTML,
  htm: FILE_FORMAT.HTML,
  xhtml: FILE_FORMAT.HTML,
  txt: FILE_FORMAT.TEXT,
  text: FILE_FORMAT.TEXT,
};

/** What the file picker offers. */
export const FILE_ACCEPT = ".epub,.pdf,.docx,.md,.markdown,.html,.htm,.txt";

/** Per format, because a text document is never hundreds of MB but a book with images can be. */
export const MAX_FILE_BYTES: Readonly<Record<string, number>> = {
  [FILE_FORMAT.EPUB]: 150 * 1024 * 1024,
  [FILE_FORMAT.PDF]: 150 * 1024 * 1024,
  [FILE_FORMAT.DOCX]: 50 * 1024 * 1024,
  [FILE_FORMAT.MARKDOWN]: 25 * 1024 * 1024,
  [FILE_FORMAT.HTML]: 25 * 1024 * 1024,
  [FILE_FORMAT.TEXT]: 25 * 1024 * 1024,
};

/** Formats with a parser today; the rest are offered but answered with "not yet". */
export const READABLE_FORMATS: readonly string[] = [FILE_FORMAT.TEXT, FILE_FORMAT.MARKDOWN, FILE_FORMAT.HTML, FILE_FORMAT.EPUB, FILE_FORMAT.DOCX, FILE_FORMAT.PDF];

export const FILE_ERROR = {
  UNSUPPORTED: "unsupported",
  TOO_LARGE: "too-large",
  EMPTY: "empty",
  UNREADABLE: "unreadable",
  DRM: "drm",
  FIXED_LAYOUT: "fixed-layout",
  NEEDS_PASSWORD: "needs-password",
  NOT_YET: "not-yet",
  NO_TEXT: "no-text",
} as const;

/** Images are inlined so a cached book still shows them; big ones are dropped rather than bloat storage. */
export const EPUB_MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const EPUB_IMAGE_BUDGET_BYTES = 24 * 1024 * 1024;
/** A zip can inflate a thousandfold; stop before a crafted book fills memory. */
export const EPUB_MAX_UNZIPPED_BYTES = 200 * 1024 * 1024;

/** A document this long (about 50 minutes) with sections of its own reads better as a book. */
export const BOOK_MIN_WORDS = 12_000;
export const BOOK_MIN_SECTIONS = 2;

/** Copied from pdfjs-dist on install by scripts/copy-pdf-worker.mjs. */
export const PDF_WORKER_URL = "/pdf.worker.min.mjs";

/** A PDF this long is a book even without an outline. */
export const PDF_BOOK_MIN_PAGES = 40;
/** A long PDF with no bookmarks is cut into pieces of this many pages. */
export const PDF_PAGES_PER_CHAPTER = 10;
/** A page drawn narrower than this is unreadable; on a phone the list scrolls sideways instead. */
export const PDF_PAGE_MIN_WIDTH = 700;

/** Bump when a parser's output changes, so cached documents are parsed again. */
export const PARSER_VERSION = 1;
