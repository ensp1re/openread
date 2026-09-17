import { POSITION_STORAGE_PREFIX } from "@/constants/preferences";
import { MAX_SAVED_POSITIONS } from "@/constants/reader";
import type { SavedPosition } from "@/types/library";

/** Saves where the reader is; `key` is an article URL or `file:<sha256>`. Keeps the newest 100. */
export function savePosition(key: string, position: SavedPosition) {
  try {
    localStorage.setItem(POSITION_STORAGE_PREFIX + key, JSON.stringify({ f: position.fraction, c: position.chapter, at: Date.now() }));
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

export function readPosition(key: string): SavedPosition | null {
  try {
    const raw = JSON.parse(localStorage.getItem(POSITION_STORAGE_PREFIX + key) ?? "null");
    if (!raw) return null;
    return { fraction: Number(raw.f) || 0, chapter: Number(raw.c) || 0 };
  } catch {
    return null;
  }
}

export function removePosition(key: string) {
  try {
    localStorage.removeItem(POSITION_STORAGE_PREFIX + key);
  } catch {
    // Nothing to remove.
  }
}
