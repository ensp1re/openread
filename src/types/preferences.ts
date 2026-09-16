import type { FONT, LEADING, TEXT_SIZE, THEME, WIDTH } from "@/constants/preferences";

type ValueOf<T> = T[keyof T];

export type Theme = ValueOf<typeof THEME>;
export type Font = ValueOf<typeof FONT>;
export type TextSize = ValueOf<typeof TEXT_SIZE>;
export type Leading = ValueOf<typeof LEADING>;
export type Width = ValueOf<typeof WIDTH>;

export interface Preferences {
  readonly theme: Theme;
  readonly font: Font;
  readonly size: TextSize;
  readonly leading: Leading;
  readonly width: Width;
  readonly progress: boolean;
}
