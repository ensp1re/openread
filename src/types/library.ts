import type { LIBRARY_STORE, RECENT_KIND } from "@/constants/library";

type ValueOf<T> = T[keyof T];

export type RecentKind = ValueOf<typeof RECENT_KIND>;
export type LibraryStoreName = ValueOf<typeof LIBRARY_STORE>;

/** What a reader knows when it opens something; the store adds progress and time. */
export interface RecentSeed {
  /** Also the reading-position key: the article URL, or `file:<sha256>` for stored items. */
  readonly id: string;
  readonly kind: RecentKind;
  readonly title: string;
  /** Site name, file type or "Pasted text". */
  readonly source: string | null;
  readonly href: string;
}

export interface RecentItem extends RecentSeed {
  /** 0–1 through the whole item. */
  readonly progress: number;
  readonly openedAt: number;
}

export interface SavedPosition {
  /** Scroll fraction within the article or chapter. */
  readonly fraction: number;
  readonly chapter: number;
}

/** Pasted text kept in IndexedDB so Recent can reopen it. */
export interface StoredText {
  readonly id: string;
  readonly kind: "text";
  readonly title: string;
  /** Sanitized HTML. */
  readonly html: string;
  readonly sourceUrl: string | null;
  readonly addedAt: number;
}

export type StoredItem = StoredText;

/** Recent id → time its Undo window ends. Shared across tabs through localStorage. */
export type PendingRemovals = Readonly<Record<string, number>>;

export interface CleanupInput {
  readonly records: readonly { readonly id: string; readonly addedAt: number }[];
  /** Stored ids (without the `file:` prefix) that Recent still lists. */
  readonly recentIds: readonly string[];
  /** Stored id → Undo deadline. */
  readonly pending: PendingRemovals;
  readonly now: number;
}
