import { LIBRARY_DB_NAME, LIBRARY_DB_VERSION, LIBRARY_STORE } from "@/constants/library";
import type { LibraryStoreName } from "@/types/library";

let opening: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(LIBRARY_DB_NAME, LIBRARY_DB_VERSION);
    req.onupgradeneeded = () => {
      for (const name of Object.values(LIBRARY_STORE)) {
        if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      opening = null;
      reject(req.error);
    };
  });
  return opening;
}

function run<T>(store: LibraryStoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        tx.oncomplete = () => resolve(req.result as T);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

/** Minimal IndexedDB access for the local library: whole records by id. */
export const libraryDb = {
  get: <T>(store: LibraryStoreName, id: string) => run<T | undefined>(store, "readonly", (s) => s.get(id)),
  put: <T extends { id: string }>(store: LibraryStoreName, value: T) => run<IDBValidKey>(store, "readwrite", (s) => s.put(value)),
  delete: (store: LibraryStoreName, id: string) => run<undefined>(store, "readwrite", (s) => s.delete(id)),
  keys: (store: LibraryStoreName) => run<IDBValidKey[]>(store, "readonly", (s) => s.getAllKeys()),
  all: <T>(store: LibraryStoreName) => run<T[]>(store, "readonly", (s) => s.getAll()),
};

/** Asks the browser not to evict saved items under storage pressure (granted silently or by heuristics). */
export function requestPersistentStorage() {
  void navigator.storage?.persist?.().catch(() => false);
}
