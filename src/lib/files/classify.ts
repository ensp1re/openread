import { BOOK_MIN_SECTIONS, BOOK_MIN_WORDS } from "@/constants/files";
import type { Chapter } from "@/types/document";

/**
 * A book gets the chapter reader; anything shorter reads better as one page.
 * Long enough to need a way back (≈50 minutes) and actually divided into parts.
 */
export function isBook(chapters: readonly Chapter[]): boolean {
  const words = chapters.reduce((sum, c) => sum + c.wordCount, 0);
  return chapters.length >= BOOK_MIN_SECTIONS && words >= BOOK_MIN_WORDS;
}
