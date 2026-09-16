import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES } from "@/constants/preferences";
import { normalizePreferences } from "./preferences";

describe("normalizePreferences", () => {
  it("falls back to defaults for missing or unknown values", () => {
    expect(normalizePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(normalizePreferences({ theme: "neon", size: 3, progress: "yes" })).toEqual(DEFAULT_PREFERENCES);
  });
  it("keeps valid values", () => {
    const p = { theme: "sepia", font: "legible", size: "xl", leading: "relaxed", width: "narrow", progress: false };
    expect(normalizePreferences(p)).toEqual(p);
  });
});
