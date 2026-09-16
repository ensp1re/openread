import type { Article, ExtractErrorCode } from "@/types/article";

export interface FetchedPage {
  readonly url: string;
  readonly html: string;
}

export type FetchPageResult =
  | { readonly ok: true; readonly page: FetchedPage }
  | { readonly ok: false; readonly code: ExtractErrorCode; readonly status?: number };

export interface ParseJob {
  readonly html: string;
  readonly url: string | null;
  readonly options: { readonly simple?: boolean };
}

export type ParseOutcome =
  | { readonly ok: true; readonly article: Article | null }
  | { readonly ok: false; readonly timedOut: true };
