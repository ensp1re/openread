"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReaderChrome } from "@/components/reader/reader-chrome";
import { useReaderChrome } from "@/components/reader/use-reader-chrome";
import { saveChapter } from "@/lib/library/position";
import type { BookReaderProps } from "@/types/reader";
import { ContentsDrawer } from "./contents-drawer";

export function BookReader({ book, chapter, onChapterChange, recent, showTitlePage, onStart }: BookReaderProps) {
  const contentRef = useRef<HTMLElement>(null);
  const contentsButtonRef = useRef<HTMLButtonElement>(null);
  const [contentsOpen, setContentsOpen] = useState(false);
  const current = book.chapters[Math.min(chapter, book.chapters.length - 1)];

  // Words before this chapter, so the chapter's own progress becomes progress through the book.
  const wordsBefore = useMemo(
    () => book.chapters.slice(0, current.index).reduce((sum, c) => sum + c.wordCount, 0),
    [book.chapters, current.index],
  );
  const bookProgress = useCallback(
    (fraction: number) => (book.wordCount === 0 ? 0 : (wordsBefore + fraction * current.wordCount) / book.wordCount),
    [book.wordCount, wordsBefore, current.wordCount],
  );

  // Where to scroll once the chapter this anchor lives in has rendered.
  const pendingAnchor = useRef<string | undefined>(undefined);

  const go = useCallback(
    (next: number, anchor?: string) => {
      if (next < 0 || next >= book.chapters.length) return;
      setContentsOpen(false);
      if (next === current.index) {
        if (anchor) document.getElementById(anchor)?.scrollIntoView();
        else window.scrollTo(0, 0);
        return;
      }
      pendingAnchor.current = anchor;
      onChapterChange(next);
      window.scrollTo(0, 0);
    },
    [book.chapters.length, current.index, onChapterChange],
  );

  const onKey = useCallback(
    (key: string) => {
      if (key === "c") {
        setContentsOpen((open) => !open);
        return true;
      }
      if (key === "]") {
        go(current.index + 1);
        return true;
      }
      if (key === "[") {
        go(current.index - 1);
        return true;
      }
      if (key === "Escape" && contentsOpen) {
        setContentsOpen(false);
        contentsButtonRef.current?.focus();
        return true;
      }
      return false;
    },
    [contentsOpen, current.index, go],
  );

  const chrome = useReaderChrome({
    positionKey: recent.id,
    recent,
    readingMinutes: current.readingMinutes,
    contentRef,
    chapter: current.index,
    bookProgress,
    onKey,
  });

  // A new chapter: put focus and the screen reader at the start of the text, not on a button far below.
  const firstRender = useRef(true);
  const { setAnnouncement } = chrome;
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    document.getElementById("article")?.focus({ preventScroll: true });
    // The chapter is on screen now, so a section or footnote we were sent to can be reached.
    const anchor = pendingAnchor.current;
    pendingAnchor.current = undefined;
    if (anchor) document.getElementById(anchor)?.scrollIntoView();
    setAnnouncement(`${current.title}. Chapter ${current.index + 1} of ${book.chapters.length}.`);
    // Record the chapter straight away, so a book read without scrolling doesn't show its title page
    // again. Only the chapter: the fraction saved for it must survive leaving and coming back.
    saveChapter(recent.id, current.index);
  }, [current.index, current.title, book.chapters.length, setAnnouncement, recent.id]);

  // An in-book link may point at an id in another chapter; follow it there.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a[href^='#']");
      const id = link?.getAttribute("href")?.slice(1);
      if (!id) return;
      const target = book.anchors[id];
      if (target === undefined || target === current.index) return;
      e.preventDefault();
      pendingAnchor.current = id;
      onChapterChange(target);
      window.scrollTo(0, 0);
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [book.anchors, current.index, onChapterChange]);

  const { minutesLeft } = chrome;
  const previous = book.chapters[current.index - 1];
  const next = book.chapters[current.index + 1];

  if (showTitlePage) {
    return (
      <div className="reader">
        <ReaderChrome chrome={chrome} showProgress={false}>
          <main id="article" tabIndex={-1} className="reader-main">
            <div className="title-page">
              <h1 className="article-title">{book.title}</h1>
              {book.author && <p className="article-dek">{book.author}</p>}
              <p className="article-meta">
                {book.chapters.length} chapters · {book.readingMinutes} min read
              </p>
              <div className="title-page-actions">
                <button type="button" className="primary-button" onClick={onStart}>
                  Start reading
                </button>
                <button type="button" className="text-button" onClick={() => setContentsOpen(true)}>
                  Contents
                </button>
              </div>
            </div>
            {contentsOpen && (
              <ContentsDrawer book={book} chapter={current.index} onSelect={go} onClose={() => setContentsOpen(false)} />
            )}
          </main>
        </ReaderChrome>
      </div>
    );
  }

  return (
    <div className="reader" data-focus={chrome.focusMode || undefined}>
      <ReaderChrome
        chrome={chrome}
        status={minutesLeft > 0 ? `${minutesLeft} min left in chapter` : "End of chapter"}
        leading={
          <button
            ref={contentsButtonRef}
            type="button"
            className="contents-toggle"
            aria-expanded={contentsOpen}
            aria-controls="book-contents"
            title="Contents (C)"
            onClick={() => setContentsOpen((open) => !open)}
          >
            Contents
          </button>
        }
      >
        <main id="article" tabIndex={-1} className="reader-main">
          <article ref={contentRef} lang={book.lang ?? undefined} dir={book.dir ?? undefined} className="article">
            <header className="article-header">
              <p className="article-source">
                {book.title}
                {book.author ? ` · ${book.author}` : ""}
              </p>
              <h1 className="article-title">{current.title}</h1>
              <p className="article-meta">
                {current.index + 1} of {book.chapters.length} · {current.readingMinutes} min
              </p>
            </header>

            <div className="prose" dangerouslySetInnerHTML={{ __html: current.content }} />
          </article>

          <nav className="chapter-nav" aria-label="Chapters">
            {previous && (
              <button type="button" className="chapter-link" onClick={() => go(previous.index)}>
                <span className="chapter-link-label">Previous</span>
                <span className="chapter-link-title">{previous.title}</span>
              </button>
            )}
            {next && (
              <button type="button" className="chapter-link chapter-next" onClick={() => go(next.index)}>
                <span className="chapter-link-label">Next</span>
                <span className="chapter-link-title">{next.title}</span>
              </button>
            )}
            {!next && (
              <p className="chapter-end">
                End of the book. <Link href="/">Read something else</Link>.
              </p>
            )}
          </nav>

          {contentsOpen && (
            <ContentsDrawer
              book={book}
              chapter={current.index}
              onSelect={go}
              onClose={() => {
                setContentsOpen(false);
                contentsButtonRef.current?.focus();
              }}
            />
          )}
        </main>
      </ReaderChrome>
    </div>
  );
}
