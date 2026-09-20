import { parsePublicUrl } from "@/lib/url";

const stripTrailingSlash = (s: string) => s.replace(/\/$/, "");

/** Path segments of a link, decoded. Malformed escapes mean the short form can't be trusted. */
function pathSegments(pathname: string): string[] | null {
  const parts = pathname.split("/").filter(Boolean);
  const out: string[] = [];
  for (const part of parts) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(part);
    } catch {
      return null;
    }
    // A slash inside a segment would split into two when the router hands the path back.
    if (decoded === "" || decoded.includes("/")) return null;
    out.push(decoded);
  }
  return out;
}

/**
 * The address of the article, written the way a person would say it: no scheme, no "www.", nothing
 * percent-encoded. Only used when it leads back to exactly the same page; anything with a query,
 * a port or plain http keeps the long `?url=` form.
 */
export function readSegments(input: string): string[] | null {
  const url = parsePublicUrl(input);
  if (!url || url.protocol !== "https:" || url.search || url.hash || url.port) return null;
  const host = url.hostname.replace(/^www\./, "");
  const path = pathSegments(url.pathname);
  if (!path) return null;

  const segments = [host, ...path];
  const canonical = new URL(url.href);
  canonical.hostname = host;
  return stripTrailingSlash(canonical.href) === stripTrailingSlash(urlFromSegments(segments) ?? "") ? segments : null;
}

/** The reverse: the path in the address bar back to the link to fetch. */
export function urlFromSegments(segments: readonly string[]): string | null {
  const [host, ...rest] = segments;
  if (!host) return null;
  const url = parsePublicUrl(`https://${host}/${rest.map(encodeURIComponent).join("/")}`);
  // Anything that moved — a host with a slash, a login, a port — is not the address it looked like.
  return url && url.hostname === host.toLowerCase() && url.port === "" ? url.href : null;
}

/** Where the reader for a link lives. */
export function readPath(input: string, simple = false): string {
  const segments = readSegments(input);
  if (segments) return `/read/${segments.map(encodeURIComponent).join("/")}${simple ? "?mode=simple" : ""}`;
  return `/read?url=${encodeURIComponent(input)}${simple ? "&mode=simple" : ""}`;
}

/**
 * The link out of a `/read?url=…` query, read from the raw query string rather than as a parameter.
 * People paste an article's address straight after `url=` without encoding it, and a parameter
 * reader would cut that address at its first `&` and turn every `+` into a space.
 */
export function readQuery(search: string): { url: string; simple: boolean } {
  const at = search.search(/[?&]url=/);
  if (at === -1) return { url: "", simple: false };
  let raw = search.slice(at + 5);
  // Our own mode is only ever added after the link, so a trailing one is ours and the rest is theirs.
  const mode = /&mode=([^&]*)$/.exec(raw);
  if (mode) raw = raw.slice(0, mode.index);
  let url = raw;
  try {
    url = decodeURIComponent(raw);
  } catch {
    // A stray % that isn't an escape: take the link exactly as it was written.
  }
  const simple = mode ? mode[1] === "simple" : new URLSearchParams(search).get("mode")?.trim() === "simple";
  return { url: url.trim(), simple };
}
