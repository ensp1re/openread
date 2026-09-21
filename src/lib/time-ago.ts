const TIME = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 86400_000],
  ["month", 30 * 86400_000],
  ["week", 7 * 86400_000],
  ["day", 86400_000],
  ["hour", 3600_000],
  ["minute", 60_000],
];

/** "2 days ago", "yesterday", "just now". */
export function ago(at: number): string {
  const diff = at - Date.now();
  for (const [unit, ms] of UNITS) if (Math.abs(diff) >= ms) return TIME.format(Math.round(diff / ms), unit);
  return "just now";
}
