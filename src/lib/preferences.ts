import {
  DEFAULT_PREFERENCES,
  FONT_OPTIONS,
  LEADING_OPTIONS,
  PREFERENCES_STORAGE_KEY,
  SIZE_OPTIONS,
  THEME_OPTIONS,
  WIDTH_OPTIONS,
} from "@/constants/preferences";
import type { Preferences } from "@/types/preferences";

const pick = <T extends string>(options: readonly { value: T }[], value: unknown, fallback: T): T =>
  options.some((o) => o.value === value) ? (value as T) : fallback;

/** Validates stored preferences; anything unknown falls back to the default. */
export function normalizePreferences(raw: unknown): Preferences {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_PREFERENCES;
  return {
    theme: pick(THEME_OPTIONS, r.theme, d.theme),
    font: pick(FONT_OPTIONS, r.font, d.font),
    size: pick(SIZE_OPTIONS, r.size, d.size),
    leading: pick(LEADING_OPTIONS, r.leading, d.leading),
    width: pick(WIDTH_OPTIONS, r.width, d.width),
    progress: typeof r.progress === "boolean" ? r.progress : d.progress,
  };
}

export function loadPreferences(): Preferences {
  try {
    return normalizePreferences(JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? "null"));
  } catch {
    return normalizePreferences(null);
  }
}

export function savePreferences(p: Preferences) {
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(p));
  } catch {
    // Private mode or blocked storage: settings still apply for this visit.
  }
}

export function applyPreferences(p: Preferences) {
  const el = document.documentElement;
  el.dataset.theme = p.theme;
  el.dataset.font = p.font;
  el.dataset.size = p.size;
  el.dataset.leading = p.leading;
  el.dataset.width = p.width;
}

/** Runs before first paint (inline in <head>) so stored settings never flash the defaults. */
export const PREFERENCES_BOOT_SCRIPT = `try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(
  PREFERENCES_STORAGE_KEY,
)})||"{}"),e=document.documentElement;["theme","font","size","leading","width"].forEach(function(k){if(typeof p[k]==="string")e.dataset[k]=p[k]})}catch(_){}`;

// A tiny store so every component reads the same preferences via useSyncExternalStore.
let current: Preferences | null = null;
const listeners = new Set<() => void>();
const SERVER_PREFERENCES = normalizePreferences(null);

export const preferencesStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get(): Preferences {
    current ??= loadPreferences();
    return current;
  },
  getServer: (): Preferences => SERVER_PREFERENCES,
  set(next: Preferences) {
    current = next;
    savePreferences(next);
    applyPreferences(next);
    listeners.forEach((l) => l());
  },
};
