import { POSITION_STORAGE_PREFIX } from "@/constants/preferences";
import { MAX_SAVED_POSITIONS } from "@/constants/reader";
import type { SavedPosition, StoredPosition } from "@/types/library";

const storageKey = (key: string) => POSITION_STORAGE_PREFIX + key;

function read(key: string): StoredPosition | null {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey(key)) ?? "null");
    return raw && typeof raw === "object" ? raw : null;
  } catch {
    return null;
  }
}

function write(key: string, value: StoredPosition) {
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(value));
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(POSITION_STORAGE_PREFIX));
    if (keys.length > MAX_SAVED_POSITIONS) {
      const oldest = keys
        .map((k) => ({ k, at: Number(JSON.parse(localStorage.getItem(k) ?? "{}").at) || 0 }))
        .sort((a, b) => a.at - b.at)[0];
      localStorage.removeItem(oldest.k);
    }
  } catch {
    // Storage unavailable: position simply isn't remembered.
  }
}

/**
 * Saves where the reader is; `key` is an article URL or `file:<sha256>`. A book keeps one fraction
 * per chapter, so leaving a chapter and coming back returns to the same place. Newest 100 keys kept.
 */
export function savePosition(key: string, position: SavedPosition) {
  const previous = read(key);
  write(key, {
    f: position.fraction,
    c: position.chapter,
    m: { ...previous?.m, [position.chapter]: position.fraction },
    at: Date.now(),
  });
}

/** Records the chapter being read without touching any saved fraction. */
export function saveChapter(key: string, chapter: number) {
  const previous = read(key);
  write(key, { f: previous?.m?.[chapter] ?? 0, c: chapter, m: previous?.m, at: Date.now() });
}

export function readPosition(key: string, chapter?: number): SavedPosition | null {
  const raw = read(key);
  if (!raw) return null;
  const c = Number(raw.c) || 0;
  if (chapter === undefined) return { chapter: c, fraction: Number(raw.f) || 0 };
  return { chapter, fraction: Number(raw.m?.[chapter] ?? (c === chapter ? raw.f : 0)) || 0 };
}

export function removePosition(key: string) {
  try {
    localStorage.removeItem(storageKey(key));
  } catch {
    // Nothing to remove.
  }
}
