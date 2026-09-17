import { FILE_ERROR, FILE_FORMAT_LABEL, MAX_FILE_BYTES, PARSER_VERSION } from "@/constants/files";
import { RECENT_KIND } from "@/constants/library";
import { sha256Hex } from "@/lib/hash";
import { checkFile, loadParsed, saveParsed, storeFile } from "@/lib/library/files";
import { itemHref, storedRecentId } from "@/lib/library/items";
import { recentStore } from "@/lib/library/recent";
import type { FileErrorCode, ReadableDoc, StoredFileRecord } from "@/types/document";

export type OpenFileResult = { ok: true; href: string } | { ok: false; code: FileErrorCode | "storage"; detail?: string };

const sizeLabel = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export const fileSourceLabel = (record: Pick<StoredFileRecord, "format" | "size">) =>
  `${FILE_FORMAT_LABEL[record.format]} · ${sizeLabel(record.size)}`;

/**
 * Reads the file, then keeps it: a file OpenRead can't open is never written to this browser.
 * A file opened before is recognised by its hash and reuses the parse kept with it.
 */
export async function openFile(file: File): Promise<OpenFileResult> {
  const checked = await checkFile(file).catch(() => null);
  if (!checked) return { ok: false, code: "storage" };
  if (!checked.ok) {
    const label = checked.format ? FILE_FORMAT_LABEL[checked.format] : null;
    if (checked.code === FILE_ERROR.NOT_YET && label) return { ...checked, detail: `OpenRead can't open ${label} files yet.` };
    if (checked.code === FILE_ERROR.TOO_LARGE && label) {
      return { ...checked, detail: `This ${label} file is too large to open (the limit is ${Math.round(MAX_FILE_BYTES[checked.format!] / 1024 / 1024)} MB).` };
    }
    return checked;
  }

  const { format } = checked;
  const id = await sha256Hex(await file.arrayBuffer());
  const cached = await loadParsed(id).catch(() => undefined);
  let doc: ReadableDoc | null = cached?.version === PARSER_VERSION ? cached.doc : null;

  if (!doc) {
    // Loaded here, not at module level: the home page shouldn't carry DOMPurify and the format parsers.
    const { parseFile } = await import("@/lib/files/parse");
    const parsed = await parseFile(file, { name: file.name, format, size: file.size });
    if (!parsed.ok) {
      // A locked or scanned PDF is still readable — the reader asks for the password, or shows the
      // pages — so it is kept; anything else is not stored at all.
      if (parsed.code !== FILE_ERROR.NEEDS_PASSWORD && parsed.code !== FILE_ERROR.NO_TEXT) return parsed;
      const record = await storeFile(file, id, format).catch(() => null);
      if (!record) return { ok: false, code: "storage" };
      recentStore.open({
        id: storedRecentId(record.id),
        kind: RECENT_KIND.FILE,
        title: file.name.replace(/\.[^.]+$/, ""),
        source: fileSourceLabel(record),
        href: itemHref(record.id),
      });
      return { ok: true, href: itemHref(record.id) };
    }
    doc = parsed.doc;
  }

  let record: StoredFileRecord;
  try {
    record = await storeFile(file, id, format);
    await saveParsed(id, PARSER_VERSION, doc);
  } catch {
    return { ok: false, code: "storage" };
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
