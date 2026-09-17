// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { MAX_SAVED_POSITIONS } from "@/constants/reader";
import { readPosition, removePosition, saveChapter, savePosition } from "./position";

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

describe("positions in a book", () => {
  it("keeps a fraction per chapter and remembers the chapter last read", () => {
    savePosition("file:b", { fraction: 0.4, chapter: 2 });
    savePosition("file:b", { fraction: 0.7, chapter: 5 });
    expect(readPosition("file:b")).toMatchObject({ chapter: 5, fraction: 0.7 });
    expect(readPosition("file:b", 2)?.fraction).toBe(0.4);
    expect(readPosition("file:b", 9)?.fraction).toBe(0);
  });

  it("records a new chapter without losing where the others were left", () => {
    savePosition("file:c", { fraction: 0.6, chapter: 1 });
    saveChapter("file:c", 3);
    expect(readPosition("file:c")).toMatchObject({ chapter: 3, fraction: 0 });
    expect(readPosition("file:c", 1)?.fraction).toBe(0.6);
  });
});
