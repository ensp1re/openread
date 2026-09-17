// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { MAX_SAVED_POSITIONS } from "@/constants/reader";
import { readPosition, removePosition, savePosition } from "./position";

describe("reading positions", () => {
  beforeEach(() => localStorage.clear());

  it("saves and reads by URL or stored-file key, including the chapter", () => {
    savePosition("https://example.com/a", { fraction: 0.3, chapter: 0 });
    savePosition("file:abc", { fraction: 0.7, chapter: 4 });
    expect(readPosition("https://example.com/a")).toEqual({ fraction: 0.3, chapter: 0 });
    expect(readPosition("file:abc")).toEqual({ fraction: 0.7, chapter: 4 });
    removePosition("file:abc");
    expect(readPosition("file:abc")).toBeNull();
  });

  it("reads positions saved before chapters existed", () => {
    localStorage.setItem("openread:position:https://example.com/old", JSON.stringify({ f: 0.5, at: 1 }));
    expect(readPosition("https://example.com/old")).toEqual({ fraction: 0.5, chapter: 0 });
  });

  it("keeps only the newest 100 positions", () => {
    for (let i = 0; i <= MAX_SAVED_POSITIONS; i++) savePosition(`k${i}`, { fraction: 0.1, chapter: 0 });
    expect(Object.keys(localStorage).filter((k) => k.startsWith("openread:position:"))).toHaveLength(MAX_SAVED_POSITIONS);
  });
});
