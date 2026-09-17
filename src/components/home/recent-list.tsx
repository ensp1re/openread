"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { RECENT_UNDO_MS, RECENT_UNDO_PAUSE_MS, RECENT_VISIBLE_ITEMS } from "@/constants/library";
import { collectUnusedItems, forgetItem, setPending } from "@/lib/library/items";
import { recentStore } from "@/lib/library/recent";
import type { RecentItem } from "@/types/library";
import type { UndoState } from "@/types/pages";

const TIME = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 86400_000],
  ["month", 30 * 86400_000],
  ["week", 7 * 86400_000],
  ["day", 86400_000],
  ["hour", 3600_000],
  ["minute", 60_000],
];

function ago(at: number): string {
  const diff = at - Date.now();
  for (const [unit, ms] of UNITS) if (Math.abs(diff) >= ms) return TIME.format(Math.round(diff / ms), unit);
  return "just now";
}

function progressLabel(p: number): string | null {
  if (p >= 0.98) return "Finished";
  return p >= 0.01 ? `${Math.round(p * 100)}%` : null;
}

export function RecentList() {
  const items = useSyncExternalStore(recentStore.subscribe, recentStore.get, recentStore.getServer);
  const [showAll, setShowAll] = useState(false);
  const [undo, setUndo] = useState<UndoState | null>(null);
  const pending = useRef<UndoState | null>(null);
  const undoButton = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Focus moved there by code must not pause the Undo window; only a person hovering or tabbing to it does.
  const movingFocus = useRef(false);

  // Stored content is deleted only after the Undo window, so Undo can bring it back.
  const finish = (state: UndoState | null) => {
    if (!state) return;
    clearTimeout(state.timer);
    state.items.forEach((i) => void forgetItem(i).catch(() => {}));
  };

  const startTimer = (state: UndoState): UndoState => {
    clearTimeout(state.timer);
    const next = {
      ...state,
      timer: setTimeout(() => {
        finish(pending.current);
        pending.current = null;
        setUndo(null);
      }, RECENT_UNDO_MS),
    };
    // Other tabs must not clean up this content while it can still be restored.
    setPending(next.items.map((i) => i.id), Date.now() + RECENT_UNDO_MS + 1000);
    pending.current = next;
    return next;
  };

  const removeWithUndo = (removed: readonly RecentItem[], message: string) => {
    finish(pending.current);
    removed.forEach((i) => recentStore.remove(i.id));
    setUndo(startTimer({ items: removed, message, timer: undefined as unknown as ReturnType<typeof setTimeout> }));
  };

  // Pausing must also hold off other tabs' cleanup, or they would finalize a removal still on screen.
  const pauseTimer = () => {
    const state = pending.current;
    if (!state) return;
    clearTimeout(state.timer);
    setPending(state.items.map((i) => i.id), Date.now() + RECENT_UNDO_PAUSE_MS);
  };

  const restore = () => {
    if (!undo) return;
    clearTimeout(pending.current?.timer);
    recentStore.restore(undo.items);
    setPending(undo.items.map((i) => i.id), null);
    pending.current = null;
    setUndo(null);
    const id = undo.items[0]?.id;
    // The store update re-renders synchronously; focus the restored row on the next frame.
    requestAnimationFrame(() => {
      const row = listRef.current?.querySelector<HTMLAnchorElement>(`a[data-id="${CSS.escape(id ?? "")}"]`);
      // A restored row past the visible 8 isn't rendered; fall back to the section heading.
      (row ?? headingRef.current)?.focus();
    });
  };

  // The removed row's button is gone; keep keyboard focus on what comes next.
  const undoShown = undo !== null;
  useEffect(() => {
    if (!undoShown || !undoButton.current) return;
    movingFocus.current = true;
    undoButton.current.focus();
    movingFocus.current = false;
  }, [undoShown]);

  useEffect(() => {
    void collectUnusedItems().catch(() => {});
    // Leaving the page makes a pending removal final.
    return () => finish(pending.current);
  }, []);

  if (items.length === 0 && !undo) return null;
  const visible = showAll ? items : items.slice(0, RECENT_VISIBLE_ITEMS);

  return (
    <section className="recent" aria-labelledby="recent-title">
      <div className="recent-head">
        <h2 id="recent-title" ref={headingRef} tabIndex={-1}>
          Recent
        </h2>
        {items.length > 0 && (
          <button type="button" className="text-button" onClick={() => removeWithUndo(items, "Cleared Recent.")}>
            Clear all
          </button>
        )}
      </div>

      <p className="recent-undo" role="status">
        {undo && (
          <>
            {undo.message}{" "}
            <button
              ref={undoButton}
              type="button"
              className="text-button"
              onClick={restore}
              // The Undo window waits while someone is on the button.
              onFocus={() => !movingFocus.current && pauseTimer()}
              onMouseEnter={pauseTimer}
              onBlur={() => pending.current && (pending.current = startTimer(pending.current))}
              onMouseLeave={() => pending.current && (pending.current = startTimer(pending.current))}
            >
              Undo
            </button>
          </>
        )}
      </p>

      <ol ref={listRef} className="recent-list">
        {visible.map((item) => {
          const progress = progressLabel(item.progress);
          return (
            <li key={item.id}>
              <Link href={item.href} className="recent-link" data-id={item.id}>
                <span className="recent-title">{item.title || "Untitled"}</span>
                <span className="recent-meta">{[item.source, progress, ago(item.openedAt)].filter(Boolean).join(" · ")}</span>
              </Link>
              <button
                type="button"
                className="recent-remove"
                aria-label={`Remove ${item.title || "Untitled"} from Recent`}
                onClick={() => removeWithUndo([item], `Removed “${item.title || "Untitled"}”.`)}
              >
                <span aria-hidden="true">×</span>
              </button>
            </li>
          );
        })}
      </ol>

      {items.length > RECENT_VISIBLE_ITEMS && (
        <button type="button" className="text-button" onClick={() => setShowAll((s) => !s)}>
          {showAll ? "Show fewer" : `Show all ${items.length}`}
        </button>
      )}
    </section>
  );
}
