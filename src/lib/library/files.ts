import { LIBRARY_STORE } from "@/constants/library";
import { FILE_ERROR, MAX_FILE_BYTES } from "@/constants/files";
import { detectFormat } from "@/lib/files/detect";
import { sha256Hex } from "@/lib/hash";
import { libraryDb, requestPersistentStorage } from "@/lib/library/db";
import type { FileErrorCode, ParsedRecord, ReadableDoc, StoredFileRecord } from "@/types/document";

export type SaveFileResult = { ok: true; record: StoredFileRecord } | { ok: false; code: FileErrorCode };

/** Checks the file, then keeps it in this browser under the SHA-256 of its bytes. */
export async function saveFile(file: File): Promise<SaveFileResult> {
  if (file.size === 0) return { ok: false, code: FILE_ERROR.EMPTY };
  if (file.size > MAX_FILE_BYTES) return { ok: false, code: FILE_ERROR.TOO_LARGE };

  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const format = detectFormat(file.name, head);
  if (!format) return { ok: false, code: FILE_ERROR.UNSUPPORTED };

  const id = await sha256Hex(await file.arrayBuffer());
  const record: StoredFileRecord = {
    id,
    kind: "file",
    name: file.name,
    format,
    size: file.size,
    blob: file.slice(0, file.size, file.type),
    addedAt: Date.now(),
  };
  await libraryDb.put(LIBRARY_STORE.ITEMS, record);
  requestPersistentStorage();
  return { ok: true, record };
}

export const loadParsed = (id: string) => libraryDb.get<ParsedRecord>(LIBRARY_STORE.PARSED, id);

export async function saveParsed(id: string, version: number, doc: ReadableDoc) {
  await libraryDb.put<ParsedRecord>(LIBRARY_STORE.PARSED, { id, version, doc });
}
