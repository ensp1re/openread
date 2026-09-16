import type { EXTRACT_ERROR } from "@/constants/extract";

export interface Article {
  readonly url: string | null;
  readonly title: string;
  readonly dek: string | null;
  readonly byline: string | null;
  readonly siteName: string | null;
  /** Human-readable publication date, e.g. "September 17, 2026" or "September 2026". */
  readonly published: string | null;
  readonly lang: string | null;
  readonly dir: string | null;
  /** Sanitized HTML of the article body. */
  readonly content: string;
  readonly wordCount: number;
  readonly readingMinutes: number;
}

export type ExtractErrorCode = (typeof EXTRACT_ERROR)[keyof typeof EXTRACT_ERROR];

export type ExtractResult =
  | { readonly ok: true; readonly article: Article }
  | { readonly ok: false; readonly code: ExtractErrorCode; readonly status?: number };
