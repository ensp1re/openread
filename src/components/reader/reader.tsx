"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { POSITION_STORAGE_PREFIX, SIZE_OPTIONS, THEME, THEME_OPTIONS } from "@/constants/preferences";
import {
  BAR_ALWAYS_VISIBLE_ABOVE_PX,
  BAR_REVEAL_SCROLL_UP_PX,
  MAX_SAVED_POSITIONS,
} from "@/constants/reader";
import { preferencesStore } from "@/lib/preferences";
import type { Preferences } from "@/types/preferences";
import type { ReaderProps } from "@/types/reader";
import { SettingsPanel } from "./settings-panel";
import { ShortcutsDialog } from "./shortcuts-dialog";

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable ||
    /^(TEXTAREA|SELECT)$/.test(t.tagName) ||
    (t instanceof HTMLInputElement && !["radio", "checkbox"].includes(t.type)));

function savePosition(url: string, fraction: number) {
  try {
    localStorage.setItem(POSITION_STORAGE_PREFIX + url, JSON.stringify({ f: fraction, at: Date.now() }));
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(POSITION_STORAGE_PREFIX));
    if (keys.length > MAX_SAVED_POSITIONS) {
      const oldest = keys
        .map((k) => ({ k, at: Number(JSON.parse(localStorage.getItem(k) ?? "{}").at) || 0 }))
        .sort((a, b) => a.at - b.at)[0];
      localStorage.removeItem(oldest.k);
    }
  } catch {
    // Storage unavailable: position simply isn't remembered.
  }
}

function readPosition(url: string): number {
  try {
    return Number(JSON.parse(localStorage.getItem(POSITION_STORAGE_PREFIX + url) ?? "{}").f) || 0;
  } catch {
    return 0;
  }
}

function nextTheme(p: Preferences): Preferences["theme"] {
  const cycle = THEME_OPTIONS.map((o) => o.value).filter((v) => v !== THEME.AUTO);
  if (p.theme === THEME.AUTO) {
    return matchMedia("(prefers-color-scheme: dark)").matches ? THEME.LIGHT : THEME.SEPIA;
  }
  return cycle[(cycle.indexOf(p.theme) + 1) % cycle.length];
}

function stepSize(p: Preferences, step: 1 | -1): Preferences["size"] {
  const sizes = SIZE_OPTIONS.map((o) => o.value);
  const i = Math.min(sizes.length - 1, Math.max(0, sizes.indexOf(p.size) + step));
  return sizes[i];
}

export function Reader({ article, onExit }: ReaderProps) {
  const router = useRouter();
  const prefs = useSyncExternalStore(preferencesStore.subscribe, preferencesStore.get, preferencesStore.getServer);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [barHidden, setBarHidden] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState(article.readingMinutes);
  const [announcement, setAnnouncement] = useState("");
  const articleRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  const host = article.url ? new URL(article.url).hostname.replace(/^www\./, "") : null;
  const source = article.siteName ?? host;

  const setPrefs = useCallback((next: Preferences) => preferencesStore.set(next), []);
  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    settingsButtonRef.current?.focus({ preventScroll: true });
  }, []);
  const exit = useCallback(() => (onExit ? onExit() : router.push("/")), [onExit, router]);

  const focusModeRef = useRef(focusMode);
  const toggleFocus = useCallback(() => {
    const on = !focusModeRef.current;
    focusModeRef.current = on;
    setFocusMode(on);
    setBarHidden(on && window.scrollY >= BAR_ALWAYS_VISIBLE_ABOVE_PX);
    setAnnouncement(on ? "Focus mode on. Press Escape to leave." : "Focus mode off");
    setSettingsOpen(false);
  }, []);

  // Restore where the reader left off in this article.
  useEffect(() => {
    if (!article.url) return;
    const f = readPosition(article.url);
    if (f > 0.02 && f < 0.98) {
      requestAnimationFrame(() => window.scrollTo({ top: f * document.documentElement.scrollHeight }));
    }
  }, [article.url]);

  // One scroll listener drives the progress line, time left, bar visibility and saved position.
  useEffect(() => {
    let lastY = window.scrollY;
    let upDistance = 0;
    let frame = 0;
    let saveTimer: ReturnType<typeof setTimeout> | undefined;

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const el = articleRef.current;
      if (el) {
        const top = el.getBoundingClientRect().top + y;
        const span = Math.max(1, el.offsetHeight - window.innerHeight * 0.6);
        const progress = Math.min(1, Math.max(0, (y - top + window.innerHeight * 0.4) / span));
        if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`;
        setMinutesLeft(Math.ceil(article.readingMinutes * (1 - progress)));
      }

      if (y < BAR_ALWAYS_VISIBLE_ABOVE_PX) {
        setBarHidden(false);
        upDistance = 0;
      } else if (y > lastY) {
        setBarHidden(true);
        upDistance = 0;
      } else if (y < lastY) {
        upDistance += lastY - y;
        // Focus mode keeps the bar away until the reader returns to the top.
        if (upDistance > BAR_REVEAL_SCROLL_UP_PX && !focusModeRef.current) setBarHidden(false);
      }
      lastY = y;

      if (article.url) {
        clearTimeout(saveTimer);
        const url = article.url;
        saveTimer = setTimeout(() => savePosition(url, y / document.documentElement.scrollHeight), 400);
      }
    };

    const onScroll = () => {
      frame ||= requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(saveTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [article.url, article.readingMinutes]);

  // Moving the pointer to the top edge brings the bar back without scrolling.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.clientY < 56) setBarHidden(false);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (shortcutsOpen) return;
      const p = preferencesStore.get();
      const lineStep = articleRef.current ? parseFloat(getComputedStyle(articleRef.current).lineHeight) * 3 : 96;
      switch (e.key) {
        case "s":
          setSettingsOpen((o) => !o);
          setBarHidden(false);
          break;
        case "t":
          setPrefs({ ...p, theme: nextTheme(p) });
          break;
        case "+":
        case "=":
          setPrefs({ ...p, size: stepSize(p, 1) });
          break;
        case "-":
        case "_":
          setPrefs({ ...p, size: stepSize(p, -1) });
          break;
        case "f":
          toggleFocus();
          break;
        case "j":
          window.scrollBy({ top: lineStep });
          break;
        case "k":
          window.scrollBy({ top: -lineStep });
          break;
        case "n":
          exit();
          break;
        case "?":
          setShortcutsOpen(true);
          break;
        case "Escape":
          if (settingsOpen) closeSettings();
          else if (focusMode) toggleFocus();
          else return;
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeSettings, exit, focusMode, settingsOpen, setPrefs, shortcutsOpen, toggleFocus]);

  const barVisible = settingsOpen || !barHidden;

  return (
    <div className="reader" data-focus={focusMode || undefined}>
      <a href="#article" className="skip-link">
        Skip to article
      </a>

      {prefs.progress && !focusMode && (
        <div className="progress-track" aria-hidden="true">
          <div ref={progressRef} className="progress-fill" />
        </div>
      )}

      <header className="topbar" data-hidden={!barVisible || undefined}>
        <div className="topbar-inner">
          {onExit ? (
            <button type="button" className="topbar-home" onClick={onExit}>
              OpenRead
            </button>
          ) : (
            <Link href="/" className="topbar-home">
              OpenRead
            </Link>
          )}
          <div className="topbar-actions">
            {prefs.progress && !focusMode && (
              <span className="topbar-status" aria-live="off">
                {minutesLeft > 0 ? `${minutesLeft} min left` : "Finished"}
              </span>
            )}
            {focusMode && (
              <button type="button" className="text-button" onClick={toggleFocus}>
                Exit focus
              </button>
            )}
            <button
              ref={settingsButtonRef}
              type="button"
              className="settings-toggle"
              data-settings-toggle
              aria-expanded={settingsOpen}
              aria-controls="reading-settings"
              aria-label="Reading settings"
              title="Reading settings (S)"
              onClick={() => setSettingsOpen((o) => !o)}
            >
              <span aria-hidden="true">
                <span className="aa-small">A</span>A
              </span>
            </button>
          </div>
        </div>
        {settingsOpen && (
          <SettingsPanel
            preferences={prefs}
            onChange={setPrefs}
            onClose={closeSettings}
            focusMode={focusMode}
            onToggleFocus={toggleFocus}
            onShowShortcuts={() => {
              setSettingsOpen(false);
              setShortcutsOpen(true);
            }}
          />
        )}
      </header>

      <main id="article" tabIndex={-1} className="reader-main">
        <article ref={articleRef} lang={article.lang ?? undefined} dir={article.dir ?? undefined} className="article">
          <header className="article-header">
            {source && (
              <p className="article-source">
                {article.url ? (
                  <a href={article.url} target="_blank" rel="noopener noreferrer">
                    {source}
                  </a>
                ) : (
                  source
                )}
              </p>
            )}
            <h1 className="article-title">{article.title}</h1>
            {article.dek && <p className="article-dek">{article.dek}</p>}
            <p className="article-meta">
              {[article.byline, article.published, `${article.readingMinutes} min read`].filter(Boolean).join(" · ")}
            </p>
          </header>

          <div className="prose" dangerouslySetInnerHTML={{ __html: article.content }} />
        </article>

        <footer className="article-end">
          {article.url && (
            <a href={article.url} target="_blank" rel="noopener noreferrer">
              Open the original{host ? ` on ${host}` : ""}
            </a>
          )}
          {onExit ? (
            <button type="button" className="text-button" onClick={onExit}>
              Read another article
            </button>
          ) : (
            <Link href="/">Read another article</Link>
          )}
        </footer>
      </main>

      {shortcutsOpen && <ShortcutsDialog onClose={() => setShortcutsOpen(false)} />}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
