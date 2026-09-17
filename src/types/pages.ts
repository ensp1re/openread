import type { ExtractErrorCode } from "@/types/article";
import type { RecentItem } from "@/types/library";

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

export interface FilePageProps {
  readonly params: Promise<{ id: string }>;
}

export interface StoredItemViewProps {
  readonly id: string;
}

export interface UndoState {
  readonly items: readonly RecentItem[];
  readonly message: string;
  readonly timer: ReturnType<typeof setTimeout>;
}
