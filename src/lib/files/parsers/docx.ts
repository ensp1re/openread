import { unzipSync } from "fflate";
import type { ParsedContent } from "@/types/document";

/** A Word document's own title, from its core properties, when the author set one. */
function coreTitle(bytes: Uint8Array): { title: string; author: string | null } {
  try {
    const core = unzipSync(bytes, { filter: (f) => f.name === "docProps/core.xml" })["docProps/core.xml"];
    if (!core) return { title: "", author: null };
    const doc = new DOMParser().parseFromString(new TextDecoder().decode(core), "application/xml");
    const value = (name: string) => [...doc.documentElement.children].find((el) => el.localName === name)?.textContent?.trim() || "";
    return { title: value("title"), author: value("creator") || null };
  } catch {
    return { title: "", author: null };
  }
}

/**
 * Word documents: mammoth maps Word's styles to semantic HTML (headings, lists, tables, footnotes),
 * with images inline, which the caller then sanitizes like any other document.
 */
export async function parseDocx(file: Blob): Promise<ParsedContent> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { convertToHtml } = await import("mammoth");
  const arrayBuffer = new Uint8Array(bytes).buffer;
  // The browser build reads an ArrayBuffer; under Node (tests) the same package wants a Buffer.
  const { value } = await convertToHtml({ arrayBuffer }).catch((error) => {
    if (typeof Buffer === "undefined") throw error;
    return convertToHtml({ buffer: Buffer.from(bytes) } as unknown as { arrayBuffer: ArrayBuffer });
  });
  const { title, author } = coreTitle(bytes);
  return { title, html: value, author };
}
