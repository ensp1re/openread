import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { BlockList, isIP } from "node:net";
import { Agent, fetch } from "undici";
import {
  EXTRACT_ERROR,
  FETCH_TIMEOUT_MS,
  MAX_HTML_BYTES,
  MAX_HTML_TAGS,
  MAX_REDIRECTS,
} from "@/constants/extract";
import { parsePublicUrl } from "@/lib/url";
import type { FetchedPage, FetchPageResult } from "@/types/fetch";

// The server fetches URLs typed by anyone, so it must never reach private networks (SSRF).
const blocked = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.168.0.0", 16],
  ["198.18.0.0", 15], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked.addSubnet(net, prefix, "ipv4");
for (const [net, prefix] of [
  // Also IPv4-compatible (::/96), SIIT, NAT64, 6to4 and Teredo forms that can carry an IPv4 address.
  ["::", 96], ["::1", 128], ["::ffff:0:0:0", 96], ["fc00::", 7], ["fe80::", 10], ["fec0::", 10], ["ff00::", 8],
  ["64:ff9b::", 96], ["64:ff9b:1::", 48], ["2002::", 16], ["2001::", 32],
] as const) blocked.addSubnet(net, prefix, "ipv6");

export function isBlockedAddress(address: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  const ip = mapped ? mapped[1] : address;
  const family = isIP(ip);
  if (family === 0) return true;
  return blocked.check(ip, family === 4 ? "ipv4" : "ipv6");
}

// Checked at connect time, so a DNS answer cannot change between the check and the request.
const agent = new Agent({
  connect: {
    lookup(hostname, options, callback) {
      dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
        if (err) return callback(err, "", 0);
        const list = addresses as unknown as LookupAddress[];
        if (list.length === 0 || list.some((a) => isBlockedAddress(a.address))) {
          return callback(Object.assign(new Error("blocked host"), { code: "EBLOCKED" }), "", 0);
        }
        if (options.all) return (callback as unknown as (e: null, a: LookupAddress[]) => void)(null, list);
        callback(null, list[0].address, list[0].family);
      });
    },
  },
});

/** jsdom parsing is synchronous; a page with too many elements would block every other request. */
export function isTooComplex(html: string): boolean {
  let tags = 0;
  for (let i = html.indexOf("<"); i !== -1; i = html.indexOf("<", i + 1)) {
    if (++tags > MAX_HTML_TAGS) return true;
  }
  return false;
}

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

export async function fetchPage(input: string): Promise<FetchPageResult> {
  let url = parsePublicUrl(input);
  if (!url) return { ok: false, code: EXTRACT_ERROR.INVALID_URL };

  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const host = url.hostname.replace(/^\[|\]$/g, "");
      if (isIP(host) && isBlockedAddress(host)) return { ok: false, code: EXTRACT_ERROR.BLOCKED_HOST };

      const res = await fetch(url, {
        dispatcher: agent,
        redirect: "manual",
        signal,
        headers: {
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
          accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
          "accept-language": "en-US,en;q=0.9",
        },
      });

      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        await res.body?.cancel();
        const next = parsePublicUrl(new URL(res.headers.get("location")!, url).href);
        if (!next) return { ok: false, code: EXTRACT_ERROR.INVALID_URL };
        url = next;
        continue;
      }
      if (!res.ok) {
        await res.body?.cancel();
        return { ok: false, code: EXTRACT_ERROR.HTTP_ERROR, status: res.status };
      }

      const contentType = res.headers.get("content-type") ?? "";
      if (contentType && !/html|xml/i.test(contentType)) {
        await res.body?.cancel();
        return { ok: false, code: EXTRACT_ERROR.NOT_HTML };
      }
      if (Number(res.headers.get("content-length") ?? 0) > MAX_HTML_BYTES) {
        await res.body?.cancel();
        return { ok: false, code: EXTRACT_ERROR.TOO_LARGE };
      }

      const chunks: Uint8Array[] = [];
      let size = 0;
      for await (const chunk of res.body ?? []) {
        size += chunk.byteLength;
        if (size > MAX_HTML_BYTES) return { ok: false, code: EXTRACT_ERROR.TOO_LARGE };
        chunks.push(chunk);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const c of chunks) {
        bytes.set(c, offset);
        offset += c.byteLength;
      }
      const page: FetchedPage = { url: url.href, html: decodeHtml(bytes, contentType) };
      if (isTooComplex(page.html)) return { ok: false, code: EXTRACT_ERROR.TOO_LARGE };
      return { ok: true, page };
    }
    return { ok: false, code: EXTRACT_ERROR.FETCH_FAILED };
  } catch (err) {
    if (signal.aborted) return { ok: false, code: EXTRACT_ERROR.TIMEOUT };
    const code = (err as { cause?: { code?: string } }).cause?.code;
    if (code === "EBLOCKED") return { ok: false, code: EXTRACT_ERROR.BLOCKED_HOST };
    return { ok: false, code: EXTRACT_ERROR.FETCH_FAILED };
  }
}
