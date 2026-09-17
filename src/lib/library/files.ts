import { LIBRARY_STORE } from "@/constants/library";
import { FILE_ERROR, MAX_FILE_BYTES, READABLE_FORMATS } from "@/constants/files";
import { detectFormat } from "@/lib/files/detect";
import { libraryDb, requestPersistentStorage } from "@/lib/library/db";
import type { FileErrorCode, FileFormat, ParsedRecord, ReadableDoc, StoredFileRecord } from "@/types/document";

export type CheckFileResult = { ok: true; format: FileFormat } | { ok: false; code: FileErrorCode; format?: FileFormat };

/** Whether this file can be opened at all: checked before anything is read or stored. */
export async function checkFile(file: File): Promise<CheckFileResult> {
  if (file.size === 0) return { ok: false, code: FILE_ERROR.EMPTY };

  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const format = detectFormat(file.name, head);
  if (!format) return { ok: false, code: FILE_ERROR.UNSUPPORTED };
  // Checked before anything is stored, so a file OpenRead can't read is never written and deleted again.
  if (!READABLE_FORMATS.includes(format)) return { ok: false, code: FILE_ERROR.NOT_YET, format };
  if (file.size > MAX_FILE_BYTES[format]) return { ok: false, code: FILE_ERROR.TOO_LARGE, format };

  return { ok: true, format };
}

/** Keeps the file in this browser under the SHA-256 of its bytes, once it is known to be readable. */
export async function storeFile(file: File, id: string, format: FileFormat): Promise<StoredFileRecord> {
  const existing = await libraryDb.get<StoredFileRecord>(LIBRARY_STORE.ITEMS, id).catch(() => undefined);
  const record: StoredFileRecord =
    existing ?? {
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
  return record;
}

export const loadParsed = (id: string) => libraryDb.get<ParsedRecord>(LIBRARY_STORE.PARSED, id);

export async function saveParsed(id: string, version: number, doc: ReadableDoc) {
  await libraryDb.put<ParsedRecord>(LIBRARY_STORE.PARSED, { id, version, doc });
}
