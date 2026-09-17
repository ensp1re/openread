"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BookReader } from "@/components/book/book-reader";
import { readPosition, savePosition } from "@/lib/library/position";
import { FILE_ERROR_MESSAGE } from "@/constants/errors";
import { PARSER_VERSION } from "@/constants/files";
import { RECENT_KIND } from "@/constants/library";
import { fileSourceLabel } from "@/lib/files/open";
import { loadParsed, saveParsed } from "@/lib/library/files";
import { loadStoredItem, storedRecentId, itemHref } from "@/lib/library/items";
import { buildPastedArticle } from "@/lib/pasted-article";
import type { FileErrorCode, ReadableDoc, StoredFileRecord } from "@/types/document";
import type { StoredText } from "@/types/library";
import type { StoredItemViewProps } from "@/types/pages";
import { Reader } from "./reader/reader";

type LoadState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "failed"; code: FileErrorCode }
  | { status: "ready"; item: StoredText }
  | { status: "file"; record: StoredFileRecord; doc: ReadableDoc };

/** Reuses the cached parse; a new parser version re-reads the file. */
async function openStoredFile(record: StoredFileRecord): Promise<LoadState> {
  const cached = await loadParsed(record.id).catch(() => undefined);
  if (cached?.version === PARSER_VERSION) return { status: "file", record, doc: cached.doc };
  const { parseFile } = await import("@/lib/files/parse");
  const parsed = await parseFile(record.blob, { name: record.name, format: record.format, size: record.size });
  if (!parsed.ok) return { status: "failed", code: parsed.code };
  await saveParsed(record.id, PARSER_VERSION, parsed.doc).catch(() => {});
  return { status: "file", record, doc: parsed.doc };
}

/** Opens something saved in this browser: pasted text now, files later. */
export function StoredItemView({ id }: StoredItemViewProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const chapterParam = params.get("chapter");

  const setChapter = useCallback(
    (chapter: number) => router.push(`/file/${id}?chapter=${chapter}`, { scroll: false }),
    [id, router],
  );

  useEffect(() => {
    let alive = true;
    loadStoredItem(id)
      .then(async (item) => {
        if (!item) return { status: "missing" } as LoadState;
        return item.kind === "file" ? await openStoredFile(item) : ({ status: "ready", item } as LoadState);
      })
      .then((next) => alive && setState(next))
      .catch(() => alive && setState({ status: "missing" }));
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    const title =
      state.status === "ready" ? state.item.title : state.status === "file" ? (state.doc.kind === "article" ? state.doc.article.title : state.doc.book.title) : null;
    if (title !== null) document.title = `${title || "Untitled"} · OpenRead`;
  }, [state]);

  if (state.status === "loading") {
    return (
      <main className="loading" aria-busy="true">
        <p role="status">Opening…</p>
      </main>
    );
  }

  if (state.status === "missing") {
    return (
      <main className="notice">
        <div className="notice-inner">
          <Link href="/" className="notice-home">
            OpenRead
          </Link>
          <h1>This item isn&rsquo;t saved in this browser.</h1>
          <p className="notice-detail">
            It may have been removed from Recent, or the browser cleared its storage. Safari clears it after 7 days without a visit.
          </p>
          <ul className="notice-actions">
            <li>
              <Link href="/">Go to the home page</Link>
            </li>
          </ul>
        </div>
      </main>
    );
  }

  if (state.status === "failed") {
    return (
      <main className="notice">
        <div className="notice-inner">
          <Link href="/" className="notice-home">
            OpenRead
          </Link>
          <h1>Couldn&rsquo;t open this file.</h1>
          <p className="notice-detail">{FILE_ERROR_MESSAGE[state.code]}</p>
          <ul className="notice-actions">
            <li>
              <Link href="/">Open something else</Link>
            </li>
          </ul>
        </div>
      </main>
    );
  }

  if (state.status === "file") {
    const { record, doc } = state;
    const recent = {
      id: storedRecentId(record.id),
      kind: RECENT_KIND.FILE,
      title: doc.kind === "article" ? doc.article.title : doc.book.title,
      source: fileSourceLabel(record),
      href: itemHref(record.id),
    };
    if (doc.kind === "article") return <Reader article={doc.article} recent={recent} />;

    // No chapter in the URL: carry on where the book was left, or show its title page.
    const saved = readPosition(recent.id);
    // Whole numbers only: book.chapters[2.5] is undefined and would blank the page.
    const chapter = chapterParam !== null ? Math.trunc(Number(chapterParam)) || 0 : (saved?.chapter ?? 0);
    return (
      <BookReader
        book={doc.book}
        chapter={Math.min(Math.max(0, chapter), doc.book.chapters.length - 1)}
        onChapterChange={setChapter}
        recent={recent}
        showTitlePage={chapterParam === null && !saved}
        onStart={() => {
          savePosition(recent.id, { fraction: 0, chapter: 0 });
          setChapter(0);
        }}
      />
    );
  }

  const { item } = state;
  const article = buildPastedArticle(item.title, item.html, item.sourceUrl);
  const host = item.sourceUrl ? new URL(item.sourceUrl).hostname.replace(/^www\./, "") : null;
  return (
    <Reader
      article={article}
      recent={{
        id: storedRecentId(item.id),
        kind: RECENT_KIND.TEXT,
        title: article.title,
        source: host ? `Pasted from ${host}` : "Pasted text",
        href: itemHref(item.id),
      }}
    />
  );
}
