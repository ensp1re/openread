import { describe, expect, it } from "vitest";
import { unusedStoredIds } from "./cleanup";

const DAY = 86400_000;

describe("unusedStoredIds", () => {
  const now = 10 * DAY;
  it("deletes records no Recent item points to", () => {
    expect(unusedStoredIds({ records: [{ id: "a", addedAt: 0 }, { id: "b", addedAt: 0 }], recentIds: ["b"], pending: {}, now })).toEqual(["a"]);
  });
  it("keeps records saved in the last minute (another tab is about to open them)", () => {
    expect(unusedStoredIds({ records: [{ id: "a", addedAt: now - 30_000 }], recentIds: [], pending: {}, now })).toEqual([]);
  });
  it("keeps records whose removal can still be undone", () => {
    expect(unusedStoredIds({ records: [{ id: "a", addedAt: 0 }], recentIds: [], pending: { a: now + 3000 }, now })).toEqual([]);
    expect(unusedStoredIds({ records: [{ id: "a", addedAt: 0 }], recentIds: [], pending: { a: now - 1 }, now })).toEqual(["a"]);
  });
});
