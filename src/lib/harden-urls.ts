import { parseSrcset } from "@/lib/srcset";

/**
 * Makes a document's URLs safe to show on our own origin: media and links become absolute against the
 * document's own address, relative URLs are dropped when there is none (a file), links open in a new
 * tab, and in-document links keep matching the ids DOMPurify prefixed.
 */
export function hardenUrls(body: HTMLElement, baseUrl: string | null) {
  const absolute = (value: string) => {
    try {
      return new URL(value, baseUrl ?? undefined).href;
    } catch {
      return null;
    }
  };

  // Readability makes URLs absolute, but the simple fallback doesn't; images must not load from our origin.
  for (const el of body.querySelectorAll("img[src], video[src], video[poster], audio[src], source[src]")) {
    for (const attr of ["src", "poster"]) {
      const v = el.getAttribute(attr);
      if (v === null) continue;
      const abs = absolute(v);
      if (abs) el.setAttribute(attr, abs);
      else el.removeAttribute(attr);
    }
  }
  for (const el of body.querySelectorAll("[srcset]")) {
    const set = parseSrcset(el.getAttribute("srcset")!)
      .map(({ url, descriptor }) => {
        const abs = absolute(url);
        return abs ? [abs, descriptor].filter(Boolean).join(" ") : null;
      })
      .filter(Boolean);
    if (set.length) el.setAttribute("srcset", set.join(", "));
    else el.removeAttribute("srcset");
  }

  for (const a of body.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href")!;
    if (href.startsWith("#")) {
      if (href.length > 1 && !href.startsWith("#user-content-")) a.setAttribute("href", `#user-content-${href.slice(1)}`);
      continue;
    }
    try {
      const abs = new URL(href, baseUrl ?? undefined);
      a.setAttribute("href", abs.href);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    } catch {
      a.removeAttribute("href");
    }
  }
}
