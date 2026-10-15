import { BACKUP_APP, BACKUP_VERSION } from "@/constants/library";
import { loadReadingLog, mergeReadingLogs, normalizeReadingLog, saveReadingLog } from "@/lib/reading-time";
import { normalizePreferences, preferencesStore } from "@/lib/preferences";
import type { Backup, ReadingLog } from "@/types/library";
import type { Preferences } from "@/types/preferences";

export function makeBackup(preferences: Preferences, readingTime: ReadingLog, now = new Date()): Backup {
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), preferences, readingTime };
}

/** The file is untrusted: anything that isn't an OpenRead export is null, and every value is checked. */
export function parseBackup(text: string): Pick<Backup, "preferences" | "readingTime"> | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.app !== BACKUP_APP || r.version !== BACKUP_VERSION) return null;
  return { preferences: normalizePreferences(r.preferences), readingTime: normalizeReadingLog(r.readingTime) };
}

export function downloadBackup() {
  const backup = makeBackup(preferencesStore.get(), loadReadingLog());
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `openread-${backup.exportedAt.slice(0, 10)}.json`;
  a.click();
  // Revoking in the same task can cancel the download in some Safari and Firefox versions.
  setTimeout(() => URL.revokeObjectURL(url));
}

/** Applies a backup file and says what happened, in words for the settings panel. */
export async function importBackup(file: File): Promise<string> {
  const backup = parseBackup(await file.text());
  if (!backup) return "That file isn’t an OpenRead export. Nothing was changed.";
  preferencesStore.set(backup.preferences);
  saveReadingLog(mergeReadingLogs(loadReadingLog(), backup.readingTime));
  const days = Object.keys(backup.readingTime).length;
  return `Imported settings${days ? ` and ${days} ${days === 1 ? "day" : "days"} of reading time` : ""}.`;
}
