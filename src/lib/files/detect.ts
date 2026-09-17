import { EXTENSION_FORMAT, FILE_FORMAT } from "@/constants/files";
import type { FileFormat } from "@/types/document";

const ZIP = [0x50, 0x4b, 0x03, 0x04];
const PDF = [0x25, 0x50, 0x44, 0x46];

const startsWith = (bytes: Uint8Array, magic: number[]) => magic.every((b, i) => bytes[i] === b);

export const extensionOf = (name: string) => name.toLowerCase().split(".").pop() ?? "";

/**
 * The extension decides, because EPUB and DOCX are both zips and text formats have no magic bytes.
 * The first bytes only overrule an extension that contradicts them (a PDF named .txt).
 */
export function detectFormat(name: string, head: Uint8Array): FileFormat | null {
  const ext = extensionOf(name);
  // Own keys only: a file named "notes.constructor" must not pick up an inherited property.
  const byExtension = Object.hasOwn(EXTENSION_FORMAT, ext) ? (EXTENSION_FORMAT[ext] as FileFormat) : undefined;
  if (startsWith(head, PDF)) return FILE_FORMAT.PDF;
  if (startsWith(head, ZIP)) return byExtension === FILE_FORMAT.DOCX ? FILE_FORMAT.DOCX : FILE_FORMAT.EPUB;
  // A zip-only format can't be a text file whatever the name says.
  if (byExtension === FILE_FORMAT.EPUB || byExtension === FILE_FORMAT.DOCX || byExtension === FILE_FORMAT.PDF) return null;
  return byExtension ?? null;
}
