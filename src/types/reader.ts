import type { ReactNode, RefObject } from "react";
import type { Article } from "@/types/article";
import type { Book } from "@/types/document";
import type { RecentSeed } from "@/types/library";
import type { Preferences } from "@/types/preferences";

/** The PDF this document was reflowed from, and how to show its pages instead. */
export interface OriginalView {
  readonly label: string;
  readonly onView: () => void;
  /** Set when the reader has just come back from the pages, so focus returns to this link. */
  readonly returning?: boolean;
}

export interface ReaderProps {
  readonly article: Article;
  readonly original?: OriginalView;
  /** Lists the article under Recent and keys its saved position; without it the URL is the key. */
  readonly recent?: RecentSeed;
}

export interface ReaderChromeOptions {
  /** URL or `file:<id>`; also the Recent id. */
  readonly positionKey: string | null;
  readonly recent?: RecentSeed;
  /** Minutes for what is on screen: the article, or the current chapter. */
  readonly readingMinutes: number;
  readonly contentRef: RefObject<HTMLElement | null>;
  readonly chapter?: number;
  /** Turns progress through the current chapter into progress through the whole book. */
  readonly bookProgress?: (fraction: number) => number;
  /** Keys the reader handles itself; return true when the key was used. */
  readonly onKey?: (key: string) => boolean;
}

export type ReaderChromeState = ReturnType<typeof import("@/components/reader/use-reader-chrome").useReaderChrome>;

export interface ReaderChromeProps {
  readonly chrome: ReaderChromeState;
  readonly showProgress?: boolean;
  /** Right of the bar, e.g. "8 min left". */
  readonly status?: ReactNode;
  /** Left of the bar, next to the wordmark, e.g. the Contents button. */
  readonly leading?: ReactNode;
  readonly children: ReactNode;
}

export interface BookReaderProps {
  readonly book: Book;
  readonly original?: OriginalView;
  readonly chapter: number;
  readonly onChapterChange: (chapter: number) => void;
  readonly recent: RecentSeed;
  /** Shown before the first chapter, the first time a book is opened. */
  readonly showTitlePage: boolean;
  readonly onStart: () => void;
}

export interface ContentsDrawerProps {
  readonly book: Book;
  readonly chapter: number;
  readonly onSelect: (chapter: number, anchor?: string) => void;
  readonly onClose: () => void;
}

export interface SettingsPanelProps {
  readonly preferences: Preferences;
  readonly onChange: (next: Preferences) => void;
  /** returnFocus is false when focus already moved somewhere the user chose. */
  readonly onClose: (returnFocus?: boolean) => void;
  readonly focusMode: boolean;
  readonly onToggleFocus: () => void;
  readonly onShowShortcuts: () => void;
}

export interface OptionGroupProps<T extends string> {
  readonly legend: string;
  readonly name: string;
  readonly value: T;
  readonly options: readonly { readonly value: T; readonly label: string; readonly short?: string }[];
  readonly onChange: (value: T) => void;
}

export interface ShortcutsDialogProps {
  readonly onClose: () => void;
}

export interface PdfPagesProps {
  readonly blob: Blob;
  readonly onBack: () => void;
  readonly backLabel?: string;
}

export interface PasswordPromptProps {
  readonly name: string;
  readonly wrong: boolean;
  readonly onSubmit: (password: string) => void;
}
