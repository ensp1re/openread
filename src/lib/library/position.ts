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
  const { fraction, chapter, block, progress } = position;
  // A field this save doesn't know is dropped for its chapter rather than left behind, stale.
  const perChapter = (map: Readonly<Record<number, number>> | undefined, value: number | undefined) => {
    const next = { ...map };
    if (value === undefined) delete next[chapter];
    else next[chapter] = value;
    return next;
  };
  write(key, {
    f: fraction,
    c: chapter,
    m: { ...previous?.m, [chapter]: fraction },
    b: block,
    mb: perChapter(previous?.mb, block),
    p: progress,
    mp: perChapter(previous?.mp, progress),
    at: Date.now(),
  });
}

/** Records the chapter being read without touching any saved fraction. */
export function saveChapter(key: string, chapter: number) {
  const previous = read(key);
  write(key, {
    f: previous?.m?.[chapter] ?? 0,
    c: chapter,
    m: previous?.m,
    b: previous?.mb?.[chapter],
    mb: previous?.mb,
    p: previous?.mp?.[chapter],
    mp: previous?.mp,
    at: Date.now(),
  });
}

const asBlock = (v: unknown) => (Number.isInteger(v) && (v as number) >= 0 ? (v as number) : undefined);
const asProgress = (v: unknown) => (typeof v === "number" && v >= 0 && v <= 1 ? v : undefined);

export function readPosition(key: string, chapter?: number): SavedPosition | null {
  const raw = read(key);
  if (!raw) return null;
  const c = Number(raw.c) || 0;
  const at = Number(raw.at) || undefined;
  if (chapter === undefined) return { chapter: c, fraction: Number(raw.f) || 0, block: asBlock(raw.b), progress: asProgress(raw.p), at };
  return {
    chapter,
    fraction: Number(raw.m?.[chapter] ?? (c === chapter ? raw.f : 0)) || 0,
    block: asBlock(raw.mb?.[chapter] ?? (c === chapter ? raw.b : undefined)),
    progress: asProgress(raw.mp?.[chapter] ?? (c === chapter ? raw.p : undefined)),
    at,
  };
}

export function removePosition(key: string) {
  try {
    localStorage.removeItem(storageKey(key));
  } catch {
    // Nothing to remove.
  }
}
