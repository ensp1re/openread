import type { SrcsetCandidate } from "@/types/article";

/**
 * srcset per the HTML spec: a URL is everything up to whitespace (so it may contain commas);
 * trailing commas end the candidate, otherwise a descriptor runs up to the next comma.
 */
export function parseSrcset(value: string): SrcsetCandidate[] {
  const out: SrcsetCandidate[] = [];
  let i = 0;
  while (i < value.length) {
    while (i < value.length && /[\s,]/.test(value[i])) i++;
    const start = i;
    while (i < value.length && !/\s/.test(value[i])) i++;
    let url = value.slice(start, i);
    let descriptor = "";
    if (url.endsWith(",")) {
      url = url.replace(/,+$/, "");
    } else {
      const d = i;
      while (i < value.length && value[i] !== ",") i++;
      descriptor = value.slice(d, i).trim();
    }
    if (url) out.push({ url, descriptor });
  }
  return out;
}
