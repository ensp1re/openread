import { LIBRARY_STORE, RECENT_KIND, RECENT_PENDING_KEY } from "@/constants/library";
import { unusedStoredIds } from "@/lib/library/cleanup";
import { sha256Hex } from "@/lib/hash";
import { libraryDb, requestPersistentStorage } from "@/lib/library/db";
import { removePosition } from "@/lib/library/position";
import { recentStore } from "@/lib/library/recent";
import type { PendingRemovals, RecentItem, StoredItem, StoredText } from "@/types/library";

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
export async function forgetItem(item: Pick<RecentItem, "id" | "kind">) {
  removePosition(item.id);
  setPending([item.id], null);
  if (item.kind === RECENT_KIND.URL) return;
  const storedId = item.id.slice(STORED_PREFIX.length);
  await Promise.all([libraryDb.delete(LIBRARY_STORE.ITEMS, storedId), libraryDb.delete(LIBRARY_STORE.PARSED, storedId)]);
}

function readPending(): PendingRemovals {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_PENDING_KEY) ?? "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

/** Marks removals that can still be undone (until), or clears them (null). Other tabs' cleanup respects it. */
export function setPending(recentIds: readonly string[], until: number | null) {
  const next: Record<string, number> = { ...readPending() };
  for (const id of recentIds) {
    if (until === null) delete next[id];
    else next[id] = until;
  }
  try {
    localStorage.setItem(RECENT_PENDING_KEY, JSON.stringify(next));
  } catch {
    // Without storage there is nothing to protect.
  }
}

/**
 * Finishes removals whose Undo window ended in a tab that closed, and deletes stored content that
 * nothing lists any more.
 */
export async function collectUnusedItems() {
  const now = Date.now();
  const recent = recentStore.get();
  const listed = new Set(recent.map((i) => i.id));
  const pending = readPending();
  for (const [id, until] of Object.entries(pending)) {
    if (until <= now && !listed.has(id)) {
      removePosition(id);
      setPending([id], null);
    }
  }

  const pendingStored = Object.fromEntries(
    Object.entries(pending).filter(([id]) => id.startsWith(STORED_PREFIX)).map(([id, until]) => [id.slice(STORED_PREFIX.length), until]),
  );
  const recentIds = [...listed].filter((id) => id.startsWith(STORED_PREFIX)).map((id) => id.slice(STORED_PREFIX.length));
  const records = await libraryDb.all<StoredItem>(LIBRARY_STORE.ITEMS);
  const unused = unusedStoredIds({ records, recentIds, pending: pendingStored, now });
  await Promise.all(unused.map((id) => forgetItem({ id: STORED_PREFIX + id, kind: RECENT_KIND.FILE })));

  // Parsed documents whose file record is gone.
  const kept = new Set(records.map((r) => r.id).filter((id) => !unused.includes(id)));
  const parsed = await libraryDb.keys(LIBRARY_STORE.PARSED);
  await Promise.all(parsed.filter((k) => !kept.has(String(k))).map((k) => libraryDb.delete(LIBRARY_STORE.PARSED, String(k))));
}
