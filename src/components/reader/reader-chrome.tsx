"use client";

import Link from "next/link";
import type { ReaderChromeProps } from "@/types/reader";
import { ResumeCard } from "./resume-card";
import { SettingsPanel } from "./settings-panel";
import { ShortcutsDialog } from "./shortcuts-dialog";

/** The top bar, progress line and panels, shared by the article and book readers. */
export function ReaderChrome({ chrome, showProgress, status, leading, children }: ReaderChromeProps) {
  const {
    prefs,
    settingsOpen,
    setSettingsOpen,
    closeSettings,
    shortcutsOpen,
    setShortcutsOpen,
    closeShortcuts,
    focusMode,
    toggleFocus,
    barVisible,
    announcement,
    progressRef,
    settingsButtonRef,
    setPrefs,
    resume,
    continueReading,
    startOver,
    dismissResume,
  } = chrome;
  const progressVisible = prefs.progress && showProgress !== false && !focusMode;

  return (
    <>
      <a href="#article" className="skip-link">
        Skip to article
      </a>

      {progressVisible && (
        <div className="progress-track" aria-hidden="true">
          <div ref={progressRef} className="progress-fill" />
        </div>
      )}

      <header className="topbar" data-hidden={!barVisible || undefined}>
        <div className="topbar-inner">
          <div className="topbar-start">
            <Link href="/" className="topbar-home">
              OpenRead
            </Link>
            {leading}
          </div>
          <div className="topbar-actions">
            {progressVisible && status && (
              <span className="topbar-status" aria-live="off">
                {status}
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

      {/* After the bar in reading order, so Tab reaches it before the text; placed at the bottom by CSS. */}
      {resume && !focusMode && <ResumeCard offer={resume} onContinue={continueReading} onStartOver={startOver} onDismiss={dismissResume} />}

      {children}

      {shortcutsOpen && <ShortcutsDialog onClose={closeShortcuts} />}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </>
  );
}
