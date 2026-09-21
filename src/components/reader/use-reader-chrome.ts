"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SIZE_OPTIONS, THEME, THEME_OPTIONS } from "@/constants/preferences";
import { BAR_ALWAYS_VISIBLE_ABOVE_PX, BAR_REVEAL_SCROLL_UP_PX } from "@/constants/reader";
import { glideBy } from "@/lib/glide";
import { readPosition, savePosition } from "@/lib/library/position";
import { recentStore } from "@/lib/library/recent";
import { preferencesStore, syncThemeColor } from "@/lib/preferences";
import type { Preferences } from "@/types/preferences";
import type { ReaderChromeOptions } from "@/types/reader";

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
}: ReaderChromeOptions) {
  const router = useRouter();
  const prefs = useSyncExternalStore(preferencesStore.subscribe, preferencesStore.get, preferencesStore.getServer);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [barHidden, setBarHidden] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState(readingMinutes);
  const [announcement, setAnnouncement] = useState("");
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

  // List it under Recent, then restore where the reader left off in this chapter.
  useEffect(() => {
    if (recent) recentStore.open(recent);
    if (!positionKey) return;
    const f = readPosition(positionKey, chapter)?.fraction ?? 0;
    if (f > 0.02 && f < 0.98) {
      requestAnimationFrame(() => window.scrollTo({ top: f * document.documentElement.scrollHeight }));
    }
    // The seed object is recreated on every render; its id identifies it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionKey, recent?.id, chapter]);

  // One scroll listener drives the progress line, time left, bar visibility and the saved position.
  useEffect(() => {
    let lastY = window.scrollY;
    let upDistance = 0;
    let frame = 0;
    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    let fraction = 0;

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

      // Only real scrolling saves: the first measurement at the top would overwrite "Finished" with 0.
      if (positionKey && scrolled) {
        clearTimeout(saveTimer);
        const key = positionKey;
        saveTimer = setTimeout(() => {
          savePosition(key, { fraction: y / document.documentElement.scrollHeight, chapter });
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
  }, [closeSettings, exit, focusMode, settingsOpen, setPrefs, toggleFocus, contentRef]);

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
  };
}
