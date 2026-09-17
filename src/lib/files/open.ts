import { FILE_ERROR, FILE_FORMAT_LABEL, MAX_FILE_BYTES, PARSER_VERSION } from "@/constants/files";
import { RECENT_KIND } from "@/constants/library";
import { itemHref, storedRecentId } from "@/lib/library/items";
import { loadParsed, saveFile, saveParsed } from "@/lib/library/files";
import { recentStore } from "@/lib/library/recent";
import { libraryDb } from "@/lib/library/db";
import { LIBRARY_STORE } from "@/constants/library";
import type { FileErrorCode, StoredFileRecord } from "@/types/document";

export type OpenFileResult = { ok: true; href: string } | { ok: false; code: FileErrorCode | "storage"; detail?: string };

const sizeLabel = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export const fileSourceLabel = (record: Pick<StoredFileRecord, "format" | "size">) =>
  `${FILE_FORMAT_LABEL[record.format]} · ${sizeLabel(record.size)}`;

/** Stores the file, parses it (reusing a cached parse), lists it under Recent and says where to go. */
export async function openFile(file: File): Promise<OpenFileResult> {
  let saved;
  try {
    saved = await saveFile(file);
  } catch {
    return { ok: false, code: "storage" };
  }
  if (!saved.ok) {
    const label = saved.format ? FILE_FORMAT_LABEL[saved.format] : null;
    if (saved.code === FILE_ERROR.NOT_YET && label) return { ...saved, detail: `OpenRead can't open ${label} files yet.` };
    if (saved.code === FILE_ERROR.TOO_LARGE && label) {
      return { ...saved, detail: `This ${label} file is too large to open (the limit is ${Math.round(MAX_FILE_BYTES[saved.format!] / 1024 / 1024)} MB).` };
    }
    return saved;
  }

  const { record, created } = saved;
  const cached = await loadParsed(record.id).catch(() => undefined);
  let doc = cached?.version === PARSER_VERSION ? cached.doc : null;
  if (!doc) {
    // Loaded here, not at module level: the home page shouldn't carry DOMPurify and the format parsers.
    const { parseFile } = await import("@/lib/files/parse");
    const parsed = await parseFile(record.blob, { name: record.name, format: record.format, size: record.size });
    if (!parsed.ok) {
      // Nothing readable: drop what this open added, but keep a file that was already stored.
      if (created) await libraryDb.delete(LIBRARY_STORE.ITEMS, record.id).catch(() => {});
      return parsed;
    }
    doc = parsed.doc;
    await saveParsed(record.id, PARSER_VERSION, doc).catch(() => {});
  }

  recentStore.open({
    id: storedRecentId(record.id),
    kind: RECENT_KIND.FILE,
    title: doc.kind === "article" ? doc.article.title : doc.book.title,
    source: fileSourceLabel(record),
    href: itemHref(record.id),
  });
  return { ok: true, href: itemHref(record.id) };
}
