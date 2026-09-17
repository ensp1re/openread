// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_RECENT_ITEMS, RECENT_KIND, RECENT_STORAGE_KEY } from "@/constants/library";
import type { RecentSeed } from "@/types/library";

const seed = (n: number): RecentSeed => ({ id: `https://example.com/${n}`, kind: RECENT_KIND.URL, title: `T${n}`, source: "example.com", href: `/read?url=${n}` });

async function freshStore() {
  vi.resetModules();
  return (await import("./recent")).recentStore;
}

describe("recentStore", () => {
  beforeEach(() => localStorage.clear());

  it("adds newest first, moves a reopened item to the top and keeps its progress", async () => {
    const store = await freshStore();
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    store.open(seed(1));
    vi.setSystemTime(2000);
    store.open(seed(2));
    store.setProgress(seed(1).id, 0.42);
    vi.setSystemTime(3000);
    store.open(seed(1));
    vi.useRealTimers();
    expect(store.get().map((i) => i.title)).toEqual(["T1", "T2"]);
    expect(store.get()[0].progress).toBe(0.42);
  });

  it("keeps at most the newest 50 items and persists them", async () => {
    const store = await freshStore();
    vi.useFakeTimers();
    for (let n = 0; n < MAX_RECENT_ITEMS + 5; n++) {
      vi.setSystemTime(n * 1000 + 1);
      store.open(seed(n));
    }
    vi.useRealTimers();
    expect(store.get()).toHaveLength(MAX_RECENT_ITEMS);
    expect(store.get()[0].title).toBe(`T${MAX_RECENT_ITEMS + 4}`);
    const reloaded = await freshStore();
    expect(reloaded.get()).toHaveLength(MAX_RECENT_ITEMS);
  });

  it("removes, restores (Undo) and clears", async () => {
    const store = await freshStore();
    store.open(seed(1));
    store.open(seed(2));
    const [first] = store.get();
    store.remove(first.id);
    expect(store.get()).toHaveLength(1);
    store.restore([first]);
    expect(store.get().map((i) => i.id)).toContain(first.id);
    store.clear();
    expect(store.get()).toHaveLength(0);
  });

  it("writes on top of the latest stored list, not an old in-memory copy (another tab added an item)", async () => {
    const store = await freshStore();
    store.open(seed(1));
    expect(store.get()).toHaveLength(1);
    // Another tab adds an item; this tab has no subscriber, so it never saw a storage event.
    const other = JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY)!);
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify([{ ...seed(2), progress: 0, openedAt: Date.now() + 1 }, ...other]));
    store.setProgress(seed(1).id, 0.5);
    expect(JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY)!).map((i: { title: string }) => i.title).sort()).toEqual(["T1", "T2"]);
    store.remove(seed(1).id);
    expect(JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY)!).map((i: { title: string }) => i.title)).toEqual(["T2"]);
  });

  it("notices localStorage.clear() in another tab", async () => {
    const store = await freshStore();
    store.open(seed(1));
    const off = store.subscribe(() => {});
    localStorage.clear();
    window.dispatchEvent(new StorageEvent("storage", { key: null }));
    expect(store.get()).toEqual([]);
    off();
  });

  it("ignores corrupt storage and picks up changes from another tab", async () => {
    localStorage.setItem(RECENT_STORAGE_KEY, "{not json");
    const store = await freshStore();
    expect(store.get()).toEqual([]);
    const listener = vi.fn();
    const off = store.subscribe(listener);
    const other = [{ ...seed(9), progress: 0.5, openedAt: 5 }];
    localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(other));
    window.dispatchEvent(new StorageEvent("storage", { key: RECENT_STORAGE_KEY }));
    expect(listener).toHaveBeenCalled();
    expect(store.get()[0].title).toBe("T9");
    off();
  });
});
