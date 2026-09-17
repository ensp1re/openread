import type { FILE_ERROR, FILE_FORMAT } from "@/constants/files";
import type { Article } from "@/types/article";

type ValueOf<T> = T[keyof T];

export type FileFormat = ValueOf<typeof FILE_FORMAT>;
export type FileErrorCode = ValueOf<typeof FILE_ERROR>;

export interface DocumentSource {
  readonly name: string;
  readonly format: FileFormat;
  readonly size: number;
}

export interface ParsedContent {
  readonly title: string;
  /** Unsanitized HTML from the format parser; the caller sanitizes it. */
  readonly html: string;
  readonly author?: string | null;
  readonly lang?: string | null;
}

export interface TocEntry {
  readonly title: string;
  readonly chapter: number;
  /** Heading level, for nested entries. */
  readonly depth?: number;
  /** Id inside the chapter, for entries that point at a heading. */
  readonly anchor?: string;
  readonly children?: readonly TocEntry[];
}

export interface Chapter {
  readonly index: number;
  readonly title: string;
  /** Sanitized HTML. */
  readonly content: string;
  readonly wordCount: number;
  readonly readingMinutes: number;
}

export interface Book {
  readonly title: string;
  readonly author: string | null;
  readonly lang: string | null;
  readonly dir: string | null;
  readonly toc: readonly TocEntry[];
  readonly chapters: readonly Chapter[];
  readonly wordCount: number;
  readonly readingMinutes: number;
  /** Element id → the chapter it sits in, so in-book links can jump across chapters. */
  readonly anchors: Readonly<Record<string, number>>;
}

export type ReadableDoc =
  | { readonly kind: "article"; readonly article: Article }
  | { readonly kind: "book"; readonly book: Book };

export type ParseResult =
  | { readonly ok: true; readonly doc: ReadableDoc }
  | { readonly ok: false; readonly code: FileErrorCode };

export interface ParsedRecord {
  readonly id: string;
  readonly version: number;
  readonly doc: ReadableDoc;
}

export interface StoredFileRecord {
  readonly id: string;
  readonly kind: "file";
  readonly name: string;
  readonly format: FileFormat;
  readonly size: number;
  readonly blob: Blob;
  readonly addedAt: number;
}
