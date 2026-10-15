import { READING_TIME_STORAGE_KEY, SECONDS_PER_DAY } from "@/constants/library";
import type { ReadingLog } from "@/types/library";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The local calendar day, so "today" is the reader's today, not UTC's. */
export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Keeps only day keys with a sane number of seconds; stored or imported data is not trusted. */
export function normalizeReadingLog(raw: unknown): ReadingLog {
  const log: Record<string, number> = {};
  if (!raw || typeof raw !== "object") return log;
  for (const [day, s] of Object.entries(raw)) {
    if (DAY.test(day) && typeof s === "number" && Number.isFinite(s) && s > 0) log[day] = Math.min(s, SECONDS_PER_DAY);
  }
  return log;
}

/** Larger value per day: importing the same file twice, or into a browser with its own history, never double-counts. */
export function mergeReadingLogs(a: ReadingLog, b: ReadingLog): ReadingLog {
  const out: Record<string, number> = { ...a };
  for (const [day, s] of Object.entries(b)) out[day] = Math.max(out[day] ?? 0, s);
  return out;
}

/** Minutes read on each of the last `days` days, oldest first, ending today. */
export function minutesPerDay(log: ReadingLog, days: number, today = new Date()): number[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1 - i));
    return (log[dayKey(d)] ?? 0) / 60;
  });
}

/** "45 min", "3 h 20 min". */
export function formatMinutes(minutes: number): string {
  const m = Math.round(minutes);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`;
}

// Parsed once per stored string, so useSyncExternalStore gets the same object until it changes.
let cache: { raw: string | null; log: ReadingLog } | null = null;
const listeners = new Set<() => void>();
const EMPTY: ReadingLog = {};

export function loadReadingLog(): ReadingLog {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(READING_TIME_STORAGE_KEY);
  } catch {
    // Blocked storage: nothing recorded.
  }
  if (cache?.raw !== raw) {
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw ?? "null");
    } catch {
      // A damaged value starts the history over rather than breaking the page.
    }
    cache = { raw, log: normalizeReadingLog(parsed) };
  }
  return cache.log;
}

export function saveReadingLog(log: ReadingLog) {
  try {
    localStorage.setItem(READING_TIME_STORAGE_KEY, JSON.stringify(log));
  } catch {
    // Private mode or a full quota: this visit's time is not kept.
  }
  listeners.forEach((l) => l());
}

export function addReadingSeconds(seconds: number, now = new Date()) {
  const log = loadReadingLog();
  const day = dayKey(now);
  saveReadingLog({ ...log, [day]: Math.min((log[day] ?? 0) + seconds, SECONDS_PER_DAY) });
}

export const readingLogStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    // Another tab reading at the same time updates this one's chart.
    window.addEventListener("storage", listener);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", listener);
    };
  },
  get: loadReadingLog,
  getServer: (): ReadingLog => EMPTY,
};
