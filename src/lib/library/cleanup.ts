import { STORED_ITEM_GRACE_MS } from "@/constants/library";
import type { CleanupInput } from "@/types/library";

/**
 * Stored records no Recent item needs. Kept: records saved in the last minute (another tab may be
 * about to list them) and records whose removal can still be undone.
 */
export function unusedStoredIds({ records, recentIds, pending, now }: CleanupInput): string[] {
  const used = new Set(recentIds);
  return records
    .filter((r) => !used.has(r.id) && now - r.addedAt > STORED_ITEM_GRACE_MS && !((pending[r.id] ?? 0) > now))
    .map((r) => r.id);
}
