"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  const [state, setState] = useState<LoadState>({ status: "loading" });

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
    const article = doc.kind === "article" ? doc.article : null;
    if (!article) return null;
    return (
      <Reader
        article={article}
        recent={{
          id: storedRecentId(record.id),
          kind: RECENT_KIND.FILE,
          title: article.title,
          source: fileSourceLabel(record),
          href: itemHref(record.id),
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
