import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES } from "@/constants/preferences";
import { makeBackup, parseBackup } from "./backup";

describe("backup", () => {
  const prefs = { ...DEFAULT_PREFERENCES, theme: "dark", size: "xl" } as const;
  const log = { "2026-10-01": 600 };

  it("reads back what it writes", () => {
    const text = JSON.stringify(makeBackup(prefs, log, new Date("2026-10-16T12:00:00Z")));
    expect(parseBackup(text)).toEqual({ preferences: prefs, readingTime: log });
  });

  it("refuses anything that isn't an OpenRead export", () => {
    expect(parseBackup("not json")).toBeNull();
    expect(parseBackup("null")).toBeNull();
    expect(parseBackup(JSON.stringify({ preferences: prefs, readingTime: log }))).toBeNull();
    expect(parseBackup(JSON.stringify({ ...makeBackup(prefs, log), version: 99 }))).toBeNull();
  });

  it("cleans every value in an export that was edited by hand", () => {
    const text = JSON.stringify({ ...makeBackup(prefs, log), preferences: { theme: "neon" }, readingTime: { "2026-10-01": "x", bad: 5 } });
    expect(parseBackup(text)).toEqual({ preferences: DEFAULT_PREFERENCES, readingTime: {} });
  });
});
