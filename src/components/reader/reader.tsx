"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SIZE_OPTIONS, THEME, THEME_OPTIONS } from "@/constants/preferences";
import { BAR_ALWAYS_VISIBLE_ABOVE_PX, BAR_REVEAL_SCROLL_UP_PX } from "@/constants/reader";
import { readPosition, savePosition } from "@/lib/library/position";
import { recentStore } from "@/lib/library/recent";
import { preferencesStore, syncThemeColor } from "@/lib/preferences";
import type { Preferences } from "@/types/preferences";
import type { ReaderProps } from "@/types/reader";
import { SettingsPanel } from "./settings-panel";
import { ShortcutsDialog } from "./shortcuts-dialog";

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable ||
    /^(TEXTAREA|SELECT)$/.test(t.tagName) ||
    (t instanceof HTMLInputElement && !["radio", "checkbox"].includes(t.type)));

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

export function Reader({ article, recent }: ReaderProps) {
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
  const closeSettings = useCallback((returnFocus = true) => {
    setSettingsOpen(false);
    if (returnFocus) settingsButtonRef.current?.focus({ preventScroll: true });
  }, []);
  const closeShortcuts = useCallback(() => setShortcutsOpen(false), []);
  const exit = useCallback(() => router.push("/"), [router]);
  const positionKey = recent?.id ?? article.url;

  const focusModeRef = useRef(focusMode);
  const toggleFocus = useCallback(() => {
    const on = !focusModeRef.current;
    focusModeRef.current = on;
    setFocusMode(on);
    setBarHidden(on && window.scrollY >= BAR_ALWAYS_VISIBLE_ABOVE_PX);
    setAnnouncement(on ? "Focus mode on. Press Escape to leave." : "Focus mode off");
    setSettingsOpen(false);
  }, []);

  // Keep the browser bar in step with the page, also when Auto follows a system theme change.
  useEffect(() => {
    syncThemeColor();
    const media = matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", syncThemeColor);
    return () => media.removeEventListener("change", syncThemeColor);
  }, []);

  // List it under Recent, then restore where the reader left off.
  useEffect(() => {
    if (recent) recentStore.open(recent);
    if (!positionKey) return;
    const f = readPosition(positionKey)?.fraction ?? 0;
    if (f > 0.02 && f < 0.98) {
      requestAnimationFrame(() => window.scrollTo({ top: f * document.documentElement.scrollHeight }));
    }
    // The seed object is recreated on every render; its id identifies it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionKey, recent?.id]);

  // One scroll listener drives the progress line, time left, bar visibility and saved position.
  useEffect(() => {
    let lastY = window.scrollY;
    let upDistance = 0;
    let frame = 0;
    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    let lastProgress = 0;

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
        lastProgress = progress;
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

      if (positionKey) {
        clearTimeout(saveTimer);
        const key = positionKey;
        saveTimer = setTimeout(() => {
          savePosition(key, { fraction: y / document.documentElement.scrollHeight, chapter: 0 });
          recentStore.setProgress(key, lastProgress);
        }, 400);
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
    // Re-run when the progress line is re-created, so it doesn't start empty.
  }, [positionKey, article.readingMinutes, prefs.progress, focusMode]);

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
      // Read the DOM, not state: a key pressed right after the dialog closes must not see a stale value.
      if (document.querySelector("dialog[open]")) return;
      const p = preferencesStore.get();
      const lineStep = articleRef.current ? parseFloat(getComputedStyle(articleRef.current).lineHeight) * 3 : 96;
      switch (e.key) {
        case "s":
          if (settingsOpen) closeSettings();
          else {
            setSettingsOpen(true);
            setBarHidden(false);
          }
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
  }, [closeSettings, exit, focusMode, settingsOpen, setPrefs, toggleFocus]);

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
          <Link href="/" className="topbar-home">
            OpenRead
          </Link>
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
        {settingsOpen && <div className="settings-scrim" aria-hidden="true" onClick={() => closeSettings()} />}
        {settingsOpen && (
          <SettingsPanel
            preferences={prefs}
            onChange={setPrefs}
            onClose={closeSettings}
            focusMode={focusMode}
            onToggleFocus={toggleFocus}
            onShowShortcuts={() => {
              // Focus the toggle first, so closing the dialog returns focus there instead of to <body>.
              settingsButtonRef.current?.focus({ preventScroll: true });
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
          <Link href="/">Read another article</Link>
        </footer>
      </main>

      {shortcutsOpen && <ShortcutsDialog onClose={closeShortcuts} />}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
