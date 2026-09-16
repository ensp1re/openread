import type { Article } from "@/types/article";
import type { Preferences } from "@/types/preferences";

export interface ReaderProps {
  readonly article: Article;
  /** Where "New article" goes; the paste page resets its own state instead of navigating. */
  readonly onExit?: () => void;
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
