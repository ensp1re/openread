"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RECENT_KIND } from "@/constants/library";
import { loadStoredItem, storedRecentId, itemHref } from "@/lib/library/items";
import { buildPastedArticle } from "@/lib/pasted-article";
import type { StoredItem } from "@/types/library";
import type { StoredItemViewProps } from "@/types/pages";
import { Reader } from "./reader/reader";

type LoadState = { status: "loading" } | { status: "missing" } | { status: "ready"; item: StoredItem };

/** Opens something saved in this browser: pasted text now, files later. */
export function StoredItemView({ id }: StoredItemViewProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    loadStoredItem(id)
      .then((item) => alive && setState(item ? { status: "ready", item } : { status: "missing" }))
      .catch(() => alive && setState({ status: "missing" }));
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (state.status === "ready") document.title = `${state.item.title || "Untitled"} · OpenRead`;
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
