import { MAX_RECENT_ITEMS, RECENT_STORAGE_KEY } from "@/constants/library";
import type { RecentItem, RecentSeed } from "@/types/library";

const EMPTY: readonly RecentItem[] = [];
let current: readonly RecentItem[] | null = null;
const listeners = new Set<() => void>();

function isItem(v: unknown): v is RecentItem {
  const i = v as RecentItem;
  return !!i && typeof i.id === "string" && typeof i.title === "string" && typeof i.href === "string" && typeof i.openedAt === "number";
}

function load(): readonly RecentItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter(isItem) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function commit(next: readonly RecentItem[]) {
  current = [...next].sort((a, b) => b.openedAt - a.openedAt).slice(0, MAX_RECENT_ITEMS);
  try {
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Storage full or blocked: the list still works for this visit.
  }
  listeners.forEach((l) => l());
}

/**
 * Recent links, files and pasted text, newest first. Same store shape as preferencesStore.
 * Every write starts from what is stored now, not from this tab's copy: a reader tab has no
 * subscriber, never sees storage events, and would otherwise overwrite other tabs' changes.
 */
export const recentStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    // Another tab changed the list.
    const onStorage = (e: StorageEvent) => {
      // key is null when another tab called localStorage.clear().
      if (e.key !== null && e.key !== RECENT_STORAGE_KEY) return;
      current = load();
      listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  },
  get(): readonly RecentItem[] {
    current ??= load();
    return current;
  },
  getServer: (): readonly RecentItem[] => EMPTY,

  /** Adds the item, or moves it to the top keeping its progress. */
  open(seed: RecentSeed) {
    const list = load();
    const prev = list.find((i) => i.id === seed.id);
    commit([{ ...seed, progress: prev?.progress ?? 0, openedAt: Date.now() }, ...list.filter((i) => i.id !== seed.id)]);
  },
  setProgress(id: string, progress: number) {
    const list = load();
    const prev = list.find((i) => i.id === id);
    const rounded = Math.round(Math.min(1, Math.max(0, progress)) * 1000) / 1000;
    if (!prev || prev.progress === rounded) return;
    commit(list.map((i) => (i.id === id ? { ...i, progress: rounded } : i)));
  },
  remove(id: string) {
    commit(load().filter((i) => i.id !== id));
  },
  /** Puts back items removed moments ago (Undo). */
  restore(items: readonly RecentItem[]) {
    const ids = new Set(items.map((i) => i.id));
    commit([...items, ...load().filter((i) => !ids.has(i.id))]);
  },
  clear() {
    commit(EMPTY);
  },
};
