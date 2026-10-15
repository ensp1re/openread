export const RECENT_KIND = { URL: "url", FILE: "file", TEXT: "text" } as const;

export const RECENT_STORAGE_KEY = "openread:recent";
export const MAX_RECENT_ITEMS = 50;
export const RECENT_VISIBLE_ITEMS = 8;
export const RECENT_UNDO_MS = 5000;
export const RECENT_PENDING_KEY = "openread:recent-pending";
/** While someone hovers or focuses Undo the countdown pauses; other tabs hold off this long. */
export const RECENT_UNDO_PAUSE_MS = 60_000;
/** Stored content this new is never cleaned up: another tab may be about to list it. */
export const STORED_ITEM_GRACE_MS = 60_000;

export const LIBRARY_DB_NAME = "openread";
export const LIBRARY_DB_VERSION = 1;
export const LIBRARY_STORE = { ITEMS: "items", PARSED: "parsed" } as const;

export const READING_TIME_STORAGE_KEY = "openread:reading-time";
/** Reading time is added in steps this long, while the reader is visible and in use. */
export const READING_TICK_MS = 10_000;
/** Without a scroll, key or pointer move for this long, the reader is taken to be away. */
export const READING_IDLE_MS = 120_000;
export const READING_CHART_DAYS = 30;
/** A day has no more seconds than this; larger imported values are clamped. */
export const SECONDS_PER_DAY = 86_400;

export const BACKUP_APP = "openread";
export const BACKUP_VERSION = 1;
