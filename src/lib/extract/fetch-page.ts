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
import { decodeHtml } from "@/lib/decode";
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

/**
 * A link can be written without "www." — as the reader's own address always is — while only the www
 * host exists. One retry there costs a lookup and saves an error page.
 */
export async function fetchPage(input: string): Promise<FetchPageResult> {
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  const result = await fetchOnce(input, signal);
  if (result.ok || result.code !== EXTRACT_ERROR.FETCH_FAILED) return result;

  const url = parsePublicUrl(input);
  if (!url || url.hostname.startsWith("www.") || url.hostname.split(".").length !== 2) return result;
  url.hostname = `www.${url.hostname}`;
  const retry = await fetchOnce(url.href, signal);
  return retry.ok ? retry : result;
}

async function fetchOnce(input: string, signal: AbortSignal): Promise<FetchPageResult> {
  let url = parsePublicUrl(input);
  if (!url) return { ok: false, code: EXTRACT_ERROR.INVALID_URL };

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
