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

export const MAX_FILE_BYTES = 150 * 1024 * 1024;

export const FILE_ERROR = {
  UNSUPPORTED: "unsupported",
  TOO_LARGE: "too-large",
  EMPTY: "empty",
  UNREADABLE: "unreadable",
  DRM: "drm",
  FIXED_LAYOUT: "fixed-layout",
  NEEDS_PASSWORD: "needs-password",
} as const;

/** Bump when a parser's output changes, so cached documents are parsed again. */
export const PARSER_VERSION = 1;
