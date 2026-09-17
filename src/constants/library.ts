export const RECENT_KIND = { URL: "url", FILE: "file", TEXT: "text" } as const;

export const RECENT_STORAGE_KEY = "openread:recent";
export const MAX_RECENT_ITEMS = 50;
export const RECENT_VISIBLE_ITEMS = 8;
export const RECENT_UNDO_MS = 5000;

export const LIBRARY_DB_NAME = "openread";
export const LIBRARY_DB_VERSION = 1;
export const LIBRARY_STORE = { ITEMS: "items", PARSED: "parsed" } as const;
