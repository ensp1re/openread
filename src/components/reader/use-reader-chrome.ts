"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SIZE_OPTIONS, THEME, THEME_OPTIONS } from "@/constants/preferences";
import {
  BAR_ALWAYS_VISIBLE_ABOVE_PX,
  BAR_REVEAL_SCROLL_UP_PX,
  HISTORY_RETURN_MS,
  READING_LINE,
  RESUME_MARK_MS,
  RESUME_RANGE,
} from "@/constants/reader";
import { glideBy, glideTo } from "@/lib/glide";
import { readPosition, savePosition } from "@/lib/library/position";
import { blockAtLine, openingWords, readingBlocks, scrollTopFor } from "@/lib/reading-blocks";
import { recentStore } from "@/lib/library/recent";
import { preferencesStore, syncThemeColor } from "@/lib/preferences";
import type { Preferences } from "@/types/preferences";
import type { ReaderChromeOptions, ResumeOffer } from "@/types/reader";

const blocksOf = (content: HTMLElement | null) => readingBlocks(content?.querySelector(".prose"));

/** Marks the paragraph returned to, briefly, so the eye finds it; focus goes there for screen readers. */
function markBlock(el: Element) {
  if (!(el instanceof HTMLElement)) return;
  el.classList.add("resume-mark");
  el.tabIndex = -1;
  el.focus({ preventScroll: true });
  setTimeout(() => el.classList.add("resume-mark-out"), RESUME_MARK_MS);
  setTimeout(() => {
    el.classList.remove("resume-mark", "resume-mark-out");
    el.removeAttribute("tabindex");
  }, RESUME_MARK_MS + 800);
}

// Back and Forward return to a page; they aren't a decision to open it, so they get no question.
// The address is kept too: a different item opened just after pressing Back is still a fresh open.
let historyMove = { href: "", at: -Infinity };
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => (historyMove = { href: location.href, at: performance.now() }));
}
let firstReaderInDocument = true;

/** True when this reader appeared because of a reload, Back or Forward rather than a fresh open. */
function isReturn(): boolean {
  if (historyMove.href === location.href && performance.now() - historyMove.at < HISTORY_RETURN_MS) return true;
  // Only the first reader in a page load can have been reloaded; later ones came by a link.
  if (!firstReaderInDocument) return false;
  firstReaderInDocument = false;
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return !!nav && nav.name === location.href && (nav.type === "reload" || nav.type === "back_forward");
}

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

/**
 * Everything both readers share: settings, focus mode, the auto-hiding bar, keyboard shortcuts,
 * the progress line, time left, and saving the reading position. The article reader passes one
 * article; the book reader passes the current chapter and maps it onto whole-book progress.
 */
export function useReaderChrome({
  positionKey,
  recent,
  readingMinutes,
  contentRef,
  chapter = 0,
  bookProgress,
  onKey,
  returning = false,
}: ReaderChromeOptions) {
  const router = useRouter();
  const prefs = useSyncExternalStore(preferencesStore.subscribe, preferencesStore.get, preferencesStore.getServer);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [barHidden, setBarHidden] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState(readingMinutes);
  const [announcement, setAnnouncement] = useState("");
  const [resume, setResume] = useState<ResumeOffer | null>(null);
  // While a place is on offer and the reader hasn't moved on, it must not be overwritten.
  const holdPlace = useRef<{ fromY: number; block?: number; fraction: number } | null>(null);
  // Whether to ask, decided once per item (Strict Mode runs effects twice), and the chapter it opened at.
  const visit = useRef<{ key: string; ask: boolean; chapter: number } | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const focusModeRef = useRef(focusMode);
  // Held in a ref: the reader passes a new function whenever its chapter changes, and rebuilding the
  // key listener each time is needless churn.
  const onKeyRef = useRef(onKey);

  const setPrefs = useCallback((next: Preferences) => preferencesStore.set(next), []);
  const closeSettings = useCallback((returnFocus = true) => {
    setSettingsOpen(false);
    if (returnFocus) settingsButtonRef.current?.focus({ preventScroll: true });
  }, []);
  const closeShortcuts = useCallback(() => setShortcutsOpen(false), []);
  const exit = useCallback(() => router.push("/"), [router]);

  const toggleFocus = useCallback(() => {
    const on = !focusModeRef.current;
    focusModeRef.current = on;
    setFocusMode(on);
    setBarHidden(on && window.scrollY >= BAR_ALWAYS_VISIBLE_ABOVE_PX);
    setAnnouncement(on ? "Focus mode on. Press Escape to leave." : "Focus mode off");
    setSettingsOpen(false);
  }, []);

  useEffect(() => {
    onKeyRef.current = onKey;
  }, [onKey]);

  // Keep the browser bar in step with the page, also when Auto follows a system theme change.
  useEffect(() => {
    syncThemeColor();
    const media = matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", syncThemeColor);
    return () => media.removeEventListener("change", syncThemeColor);
  }, []);

  // List it under Recent, then offer the place left last time, or quietly return to it.
  useEffect(() => {
    if (recent) recentStore.open(recent);
    if (!positionKey) return;

    if (visit.current?.key !== positionKey) visit.current = { key: positionKey, ask: !returning && !isReturn(), chapter };
    // Only the chapter the item opened at is offered; moving between chapters returns quietly.
    const offer = visit.current.ask && visit.current.chapter === chapter;
    if (visit.current.chapter !== chapter) visit.current.ask = false;
    // A link to a place in the text wins over the place left last time.
    if (location.hash) return;

    const saved = readPosition(positionKey, chapter);
    const read = saved?.progress ?? saved?.fraction ?? 0;
    if (!saved || read <= RESUME_RANGE.MIN || read >= RESUME_RANGE.MAX) return;

    const frame = requestAnimationFrame(() => {
      const blocks = blocksOf(contentRef.current);
      const block = saved.block ?? blockAtLine(blocks, saved.fraction * document.documentElement.scrollHeight + window.innerHeight * READING_LINE);
      if (!offer) {
        const el = blocks[block];
        window.scrollTo({ top: el ? scrollTopFor(el, READING_LINE) : saved.fraction * document.documentElement.scrollHeight });
        return;
      }
      holdPlace.current = { fromY: window.scrollY, block, fraction: saved.fraction };
      const listed = recentStore.get().find((i) => i.id === positionKey)?.progress;
      const percent = Math.max(1, Math.round((listed || (bookProgress ? bookProgress(read) : read)) * 100));
      const inBook = !!bookProgress;
      setResume({ percent, at: saved.at, words: openingWords(blocks[block]), inBook });
      setAnnouncement(`You were ${percent}% through. Continue reading, or go to the ${inBook ? "start of the chapter" : "start"}.`);
    });
    return () => {
      cancelAnimationFrame(frame);
      // Another chapter or item: whatever was on offer belonged to this one.
      holdPlace.current = null;
      setResume(null);
    };
    // The seed object is recreated on every render; its id identifies it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionKey, recent?.id, chapter]);

  const continueReading = useCallback(() => {
    const place = holdPlace.current;
    holdPlace.current = null;
    setResume(null);
    if (!place) return;
    const el = place.block === undefined ? undefined : blocksOf(contentRef.current)[place.block];
    glideTo(el ? scrollTopFor(el, READING_LINE) : place.fraction * document.documentElement.scrollHeight);
    if (el) markBlock(el);
  }, [contentRef]);

  const startOver = useCallback(() => {
    holdPlace.current = null;
    setResume(null);
    if (positionKey) {
      savePosition(positionKey, { fraction: 0, chapter, block: 0, progress: 0 });
      recentStore.setProgress(positionKey, bookProgress ? bookProgress(0) : 0);
    }
    glideTo(0);
    document.getElementById("article")?.focus({ preventScroll: true });
  }, [positionKey, chapter, bookProgress]);

  // Not now: the card goes, the place stays until the reader moves on.
  const dismissResume = useCallback(() => {
    setResume(null);
    // Focus leaves the card with it; if it was somewhere else (Esc from a link), it stays there.
    if (document.activeElement?.closest(".resume-card")) document.getElementById("article")?.focus({ preventScroll: true });
  }, []);

  // One scroll listener drives the progress line, time left, bar visibility and the saved position.
  useEffect(() => {
    let lastY = window.scrollY;
    let upDistance = 0;
    let frame = 0;
    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    let fraction = 0;
    // Found on first save and again if the text is replaced (the PDF view swaps it).
    let blocks: Element[] = [];

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const el = contentRef.current;
      if (el) {
        const top = el.getBoundingClientRect().top + y;
        const span = Math.max(1, el.offsetHeight - window.innerHeight * 0.6);
        fraction = Math.min(1, Math.max(0, (y - top + window.innerHeight * 0.4) / span));
        if (progressRef.current) progressRef.current.style.transform = `scaleX(${fraction})`;
        setMinutesLeft(Math.ceil(readingMinutes * (1 - fraction)));
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

      // Reading on for a screen from where the offer was made is an answer too: from here, then.
      const held = holdPlace.current;
      if (held && Math.abs(y - held.fromY) > window.innerHeight) {
        holdPlace.current = null;
        setResume(null);
      }

      // Only real scrolling saves: the first measurement at the top would overwrite "Finished" with 0.
      if (positionKey && scrolled && !holdPlace.current) {
        clearTimeout(saveTimer);
        const key = positionKey;
        saveTimer = setTimeout(() => {
          const scrollY = window.scrollY;
          if (!blocks[0]?.isConnected) blocks = blocksOf(contentRef.current);
          const block = blocks.length ? blockAtLine(blocks, scrollY + window.innerHeight * READING_LINE) : undefined;
          savePosition(key, { fraction: scrollY / document.documentElement.scrollHeight, chapter, block, progress: fraction });
          recentStore.setProgress(key, bookProgress ? bookProgress(fraction) : fraction);
        }, 400);
      }
    };

    let scrolled = false;
    const onScroll = () => {
      scrolled = true;
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
  }, [positionKey, readingMinutes, prefs.progress, focusMode, chapter, bookProgress, contentRef]);

  // Moving the pointer to the top edge brings the bar back without scrolling.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.clientY < 56) setBarHidden(false);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      // Read the DOM, not state: a key pressed right after the dialog closes must not see a stale value.
      if (document.querySelector("dialog[open]")) return;
      const p = preferencesStore.get();
      const lineStep = contentRef.current ? parseFloat(getComputedStyle(contentRef.current).lineHeight) * 3 : 96;
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
          glideBy(lineStep);
          break;
        case "k":
          glideBy(-lineStep);
          break;
        case "n":
          exit();
          break;
        case "?":
          setShortcutsOpen(true);
          break;
        case "Escape":
          if (settingsOpen) closeSettings();
          // Focus mode hides the card, so Esc there means leaving focus mode.
          else if (resume && !focusMode) dismissResume();
          else if (focusMode) toggleFocus();
          else if (!onKeyRef.current?.(e.key)) return;
          break;
        default:
          // Reader-specific keys: Contents and chapter navigation in the book reader.
          if (!onKeyRef.current?.(e.key)) return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeSettings, exit, focusMode, settingsOpen, setPrefs, toggleFocus, contentRef, resume, dismissResume]);

  return {
    prefs,
    settingsOpen,
    setSettingsOpen,
    closeSettings,
    shortcutsOpen,
    setShortcutsOpen,
    closeShortcuts,
    focusMode,
    toggleFocus,
    barVisible: settingsOpen || !barHidden,
    minutesLeft,
    announcement,
    setAnnouncement,
    progressRef,
    settingsButtonRef,
    setPrefs,
    resume,
    continueReading,
    startOver,
    dismissResume,
  };
}
