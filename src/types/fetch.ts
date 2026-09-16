import type { ExtractErrorCode } from "@/types/article";

export interface FetchedPage {
  readonly url: string;
  readonly html: string;
}

export type FetchPageResult =
  | { readonly ok: true; readonly page: FetchedPage }
  | { readonly ok: false; readonly code: ExtractErrorCode; readonly status?: number };
