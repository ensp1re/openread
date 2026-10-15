import { describe, expect, it } from "vitest";
import { dayKey, formatMinutes, mergeReadingLogs, minutesPerDay, normalizeReadingLog } from "./reading-time";

describe("reading time", () => {
  it("keys days by the local calendar", () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("drops bad keys and values, and clamps a day to 24 hours", () => {
    expect(normalizeReadingLog({ "2026-10-01": 600, "2026-10-02": -5, "2026-10-03": "9", nope: 60, "2026-10-04": 1e9 })).toEqual({
      "2026-10-01": 600,
      "2026-10-04": 86_400,
    });
    expect(normalizeReadingLog(null)).toEqual({});
    expect(normalizeReadingLog([1, 2])).toEqual({});
  });

  it("merges by keeping the larger value per day, so importing twice doesn't double-count", () => {
    const a = { "2026-10-01": 600, "2026-10-02": 60 };
    const b = { "2026-10-01": 300, "2026-10-03": 120 };
    const merged = mergeReadingLogs(a, b);
    expect(merged).toEqual({ "2026-10-01": 600, "2026-10-02": 60, "2026-10-03": 120 });
    expect(mergeReadingLogs(merged, b)).toEqual(merged);
  });

  it("lists minutes per day, oldest first, ending today, across a month boundary", () => {
    const log = { "2026-09-30": 120, "2026-10-02": 1800 };
    expect(minutesPerDay(log, 3, new Date(2026, 9, 2, 8))).toEqual([2, 0, 30]);
  });

  it("formats minutes and hours", () => {
    expect(formatMinutes(44.6)).toBe("45 min");
    expect(formatMinutes(120)).toBe("2 h");
    expect(formatMinutes(200)).toBe("3 h 20 min");
  });
});
