import type { ExtractErrorCode } from "@/types/article";

export interface UrlFormProps {
  readonly defaultValue?: string;
  readonly autoFocus?: boolean;
}

export interface ReadSearchParams {
  readonly url?: string | string[];
  readonly mode?: string | string[];
}

export interface ReadPageProps {
  readonly searchParams: Promise<ReadSearchParams>;
}

export interface ExtractErrorProps {
  readonly url: string;
  readonly code: ExtractErrorCode;
  readonly status?: number;
  readonly simple: boolean;
}
