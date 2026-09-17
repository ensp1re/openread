import { LIBRARY_STORE, RECENT_KIND } from "@/constants/library";
import { sha256Hex } from "@/lib/hash";
import { libraryDb, requestPersistentStorage } from "@/lib/library/db";
import { removePosition } from "@/lib/library/position";
import { recentStore } from "@/lib/library/recent";
import type { RecentItem, StoredItem, StoredText } from "@/types/library";

const STORED_PREFIX = "file:";

export const storedRecentId = (storedId: string) => STORED_PREFIX + storedId;
export const itemHref = (storedId: string) => `/file/${storedId}`;

/** Saves pasted text (already sanitized) and returns its id. The same text always gets the same id. */
export async function saveText(title: string, html: string, sourceUrl: string | null): Promise<string> {
  const id = await sha256Hex(`${title}\n${html}`);
  const record: StoredText = { id, kind: RECENT_KIND.TEXT, title, html, sourceUrl, addedAt: Date.now() };
  await libraryDb.put(LIBRARY_STORE.ITEMS, record);
  requestPersistentStorage();
  return id;
}

export const loadStoredItem = (id: string) => libraryDb.get<StoredItem>(LIBRARY_STORE.ITEMS, id);

/** Deletes everything kept for a Recent item: saved position, and stored content for files and text. */
export async function forgetItem(item: RecentItem) {
  removePosition(item.id);
  if (item.kind === RECENT_KIND.URL) return;
  const storedId = item.id.slice(STORED_PREFIX.length);
  await Promise.all([libraryDb.delete(LIBRARY_STORE.ITEMS, storedId), libraryDb.delete(LIBRARY_STORE.PARSED, storedId)]);
}

/** Removes stored content no Recent item points to (e.g. the tab closed during an Undo window). */
export async function collectUnusedItems() {
  const used = new Set(recentStore.get().filter((i) => i.id.startsWith(STORED_PREFIX)).map((i) => i.id.slice(STORED_PREFIX.length)));
  for (const store of [LIBRARY_STORE.ITEMS, LIBRARY_STORE.PARSED]) {
    const keys = await libraryDb.keys(store);
    await Promise.all(keys.filter((k) => !used.has(String(k))).map((k) => libraryDb.delete(store, String(k))));
  }
}
