"use client";

import { useEffect, useRef } from "react";
import type { ContentsDrawerProps } from "@/types/reader";

/** The book's chapters: a drawer beside the text on wide screens, a sheet on phones. */
export function ContentsDrawer({ book, chapter, onSelect, onClose }: ContentsDrawerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>("[aria-current='true']")?.focus();
  }, []);

  return (
    <>
      {/* Dims the text behind, so the drawer reads as a layer rather than sitting on the words. */}
      <div className="contents-scrim" aria-hidden="true" onClick={onClose} />
      <div
        ref={ref}
        id="book-contents"
        role="dialog"
        aria-label="Contents"
        className="contents-panel"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <p className="contents-title">{book.title}</p>
        <ol className="contents-list">
          {book.toc.map((entry) => (
            <li key={`${entry.chapter}-${entry.title}`} data-depth={entry.depth}>
              <button
                type="button"
                aria-current={entry.chapter === chapter ? "true" : undefined}
                onClick={() => onSelect(entry.chapter)}
              >
                <span className="contents-entry-title">{entry.title}</span>
                <span className="contents-entry-minutes">{book.chapters[entry.chapter]?.readingMinutes} min</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
