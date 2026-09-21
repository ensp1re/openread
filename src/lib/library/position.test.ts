// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { MAX_SAVED_POSITIONS } from "@/constants/reader";
import { readPosition, removePosition, saveChapter, savePosition } from "./position";

describe("reading positions", () => {
  beforeEach(() => localStorage.clear());

  it("saves and reads by URL or stored-file key, including the chapter", () => {
    savePosition("https://example.com/a", { fraction: 0.3, chapter: 0 });
    savePosition("file:abc", { fraction: 0.7, chapter: 4 });
    expect(readPosition("https://example.com/a")).toMatchObject({ fraction: 0.3, chapter: 0 });
    expect(readPosition("file:abc")).toMatchObject({ fraction: 0.7, chapter: 4 });
    removePosition("file:abc");
    expect(readPosition("file:abc")).toBeNull();
  });

  it("reads positions saved before chapters existed", () => {
    localStorage.setItem("openread:position:https://example.com/old", JSON.stringify({ f: 0.5, at: 1 }));
    expect(readPosition("https://example.com/old")).toMatchObject({ fraction: 0.5, chapter: 0 });
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

describe("the paragraph being read", () => {
  beforeEach(() => localStorage.clear());

  it("is kept per chapter alongside the fraction, with when it was saved", () => {
    savePosition("file:b", { fraction: 0.4, chapter: 2, block: 17 });
    savePosition("file:b", { fraction: 0.1, chapter: 5, block: 3 });
    expect(readPosition("file:b", 2)).toMatchObject({ fraction: 0.4, block: 17 });
    expect(readPosition("file:b", 5)).toMatchObject({ fraction: 0.1, block: 3 });
    expect(readPosition("file:b")?.at).toBeGreaterThan(0);
    // Moving to a chapter keeps the paragraph saved for it.
    saveChapter("file:b", 2);
    expect(readPosition("file:b")).toMatchObject({ chapter: 2, block: 17 });
  });

  it("is absent, not wrong, in places saved before it existed or when malformed", () => {
    localStorage.setItem("openread:position:https://example.com/old", JSON.stringify({ f: 0.5, c: 0, at: 1 }));
    expect(readPosition("https://example.com/old", 0)?.block).toBeUndefined();
    localStorage.setItem("openread:position:https://example.com/bad", JSON.stringify({ f: 0.5, c: 0, b: -3, p: 7, at: 1 }));
    expect(readPosition("https://example.com/bad", 0)).toMatchObject({ block: undefined, progress: undefined });
  });

  it("isn't left behind, stale, by a save that couldn't find one", () => {
    savePosition("file:s", { fraction: 0.3, chapter: 1, block: 9, progress: 0.35 });
    savePosition("file:s", { fraction: 0.6, chapter: 1 });
    expect(readPosition("file:s", 1)).toMatchObject({ fraction: 0.6, block: undefined, progress: undefined });
  });
});

describe("progress", () => {
  beforeEach(() => localStorage.clear());

  it("is kept per chapter, so a chapter read to its end reads as finished though its scroll fraction can't", () => {
    // At the very bottom the scroll fraction is short of 1 by a screen; progress is what the line shows.
    savePosition("file:p", { fraction: 0.84, chapter: 3, block: 40, progress: 1 });
    savePosition("file:p", { fraction: 0.2, chapter: 4, block: 5, progress: 0.25 });
    expect(readPosition("file:p", 3)).toMatchObject({ fraction: 0.84, progress: 1 });
    expect(readPosition("file:p", 4)).toMatchObject({ progress: 0.25 });
    saveChapter("file:p", 3);
    expect(readPosition("file:p")).toMatchObject({ chapter: 3, progress: 1 });
  });
});
