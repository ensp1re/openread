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
