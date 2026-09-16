export const THEME = { AUTO: "auto", LIGHT: "light", SEPIA: "sepia", SOFT: "soft", DARK: "dark" } as const;
export const FONT = { SERIF: "serif", SANS: "sans", LEGIBLE: "legible" } as const;
export const TEXT_SIZE = { S: "s", M: "m", L: "l", XL: "xl" } as const;
export const LEADING = { TIGHT: "tight", DEFAULT: "default", RELAXED: "relaxed" } as const;
export const WIDTH = { NARROW: "narrow", DEFAULT: "default", WIDE: "wide" } as const;

export const PREFERENCES_STORAGE_KEY = "openread:preferences";
export const POSITION_STORAGE_PREFIX = "openread:position:";

export const DEFAULT_PREFERENCES = {
  theme: THEME.AUTO,
  font: FONT.SERIF,
  size: TEXT_SIZE.M,
  leading: LEADING.DEFAULT,
  width: WIDTH.DEFAULT,
  progress: true,
} as const;

export const THEME_OPTIONS = [
  { value: THEME.AUTO, label: "Auto" },
  { value: THEME.LIGHT, label: "Light" },
  { value: THEME.SEPIA, label: "Sepia" },
  { value: THEME.SOFT, label: "Soft" },
  { value: THEME.DARK, label: "Dark" },
] as const;

export const FONT_OPTIONS = [
  { value: FONT.SERIF, label: "Serif" },
  { value: FONT.SANS, label: "Sans" },
  { value: FONT.LEGIBLE, label: "Legible" },
] as const;

export const SIZE_OPTIONS = [
  { value: TEXT_SIZE.S, label: "Small", short: "A" },
  { value: TEXT_SIZE.M, label: "Default", short: "A" },
  { value: TEXT_SIZE.L, label: "Large", short: "A" },
  { value: TEXT_SIZE.XL, label: "Extra large", short: "A" },
] as const;

export const LEADING_OPTIONS = [
  { value: LEADING.TIGHT, label: "Tight" },
  { value: LEADING.DEFAULT, label: "Default" },
  { value: LEADING.RELAXED, label: "Relaxed" },
] as const;

export const WIDTH_OPTIONS = [
  { value: WIDTH.NARROW, label: "Narrow" },
  { value: WIDTH.DEFAULT, label: "Default" },
  { value: WIDTH.WIDE, label: "Wide" },
] as const;
