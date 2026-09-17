export const normalizeText = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/** "Line length | Butterick's Practical Typography" → title "Line length", site "Butterick's Practical Typography". */
export function splitSiteSuffix(
  title: string,
  candidates: (string | null | undefined)[],
  /** A heading that states the real title; when it matches the part before the separator, split there. */
  heading?: string | null,
): { title: string; site: string | null } {
  const m = /^(.{8,}?)\s+[|—–·-]\s+([^|—–·]{2,60})$/.exec(title);
  if (!m) return { title, site: null };
  if (heading && normalizeText(heading) === normalizeText(m[1])) return { title: m[1].trim(), site: m[2].trim() };
  const suffix = normalizeText(m[2]);
  const hit = candidates.some((c) => {
    const n = c ? normalizeText(c) : "";
    return n.length > 1 && (n === suffix || n.includes(suffix) || suffix.includes(n));
  });
  return hit ? { title: m[1].trim(), site: m[2].trim() } : { title, site: null };
}
