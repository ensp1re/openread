import type { Article } from "@/types/article";
import type { RecentSeed } from "@/types/library";
import type { Preferences } from "@/types/preferences";

export interface ReaderProps {
  readonly article: Article;
  /** Lists the article under Recent and keys its saved position; without it the URL is the key. */
  readonly recent?: RecentSeed;
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
