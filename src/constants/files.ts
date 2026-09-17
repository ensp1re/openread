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
export const READABLE_FORMATS: readonly string[] = [FILE_FORMAT.TEXT, FILE_FORMAT.MARKDOWN, FILE_FORMAT.HTML];

export const FILE_ERROR = {
  UNSUPPORTED: "unsupported",
  TOO_LARGE: "too-large",
  EMPTY: "empty",
  UNREADABLE: "unreadable",
  DRM: "drm",
  FIXED_LAYOUT: "fixed-layout",
  NEEDS_PASSWORD: "needs-password",
  NOT_YET: "not-yet",
} as const;

/** Bump when a parser's output changes, so cached documents are parsed again. */
export const PARSER_VERSION = 1;
