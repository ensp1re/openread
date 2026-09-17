/** Shared by fetched pages and opened files: bytes in, text out, the way a browser decodes them. */
const CHARSET_SNIFF_BYTES = 16 * 1024;

/** True if the bytes contain at least one well-formed UTF-8 multi-byte character. */
function hasUtf8Multibyte(bytes: Uint8Array): boolean {
  const cont = (i: number) => i < bytes.length && (bytes[i] & 0xc0) === 0x80;
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b < 0xc2 || b > 0xf4) continue;
    const need = b < 0xe0 ? 1 : b < 0xf0 ? 2 : 3;
    let ok = true;
    for (let k = 1; k <= need; k++) ok &&= cont(i + k);
    if (ok) return true;
  }
  return false;
}

function declaredCharset(contentType: string, bytes: Uint8Array): string | null {
  const fromHeader = /charset=["']?([\w.:-]+)/i.exec(contentType)?.[1];
  if (fromHeader) return fromHeader.toLowerCase();
  const head = new TextDecoder("windows-1252").decode(bytes.subarray(0, CHARSET_SNIFF_BYTES));
  return /<meta[^>]+charset\s*=\s*["']?([\w.:-]+)/i.exec(head)?.[1]?.toLowerCase() ?? null;
}

/**
 * Turns page bytes into text the way browsers do, so accented letters and dashes never become "�".
 * Many older pages (28 of 246 paulgraham.com essays) are Windows-1252 but declare no charset, or even claim UTF-8.
 * 1. A byte-order mark wins. 2. A declared non-UTF-8 charset is trusted.
 * 3. Otherwise strict UTF-8; if that fails and the page has no real UTF-8 characters, it is Windows-1252.
 */
export function decodeHtml(bytes: Uint8Array, contentType: string): string {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return new TextDecoder("utf-8").decode(bytes);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes);

  const declared = declaredCharset(contentType, bytes);
  if (declared && !/^utf-?8$/.test(declared)) {
    try {
      return new TextDecoder(declared).decode(bytes);
    } catch {
      // Unknown label: fall through to detection.
    }
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder(hasUtf8Multibyte(bytes) ? "utf-8" : "windows-1252").decode(bytes);
  }
}
