"use client";

import { useEffect, useRef } from "react";
import {
  DEFAULT_PREFERENCES,
  FONT_OPTIONS,
  LEADING_OPTIONS,
  SIZE_OPTIONS,
  THEME_OPTIONS,
  WIDTH_OPTIONS,
} from "@/constants/preferences";
import type { SettingsPanelProps } from "@/types/reader";
import { OptionGroup } from "./option-group";

export function SettingsPanel({ preferences: p, onChange, onClose, focusMode, onToggleFocus, onShowShortcuts }: SettingsPanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = ref.current;
    panel?.querySelector<HTMLInputElement>("input:checked")?.focus();
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Element;
      if (panel && !panel.contains(target) && !target.closest("[data-settings-toggle]")) onClose();
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [onClose]);

  return (
    <div
      ref={ref}
      id="reading-settings"
      role="dialog"
      aria-label="Reading settings"
      className="settings-panel"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <OptionGroup legend="Theme" name="theme" value={p.theme} options={THEME_OPTIONS} onChange={(theme) => onChange({ ...p, theme })} />
      <OptionGroup legend="Font" name="font" value={p.font} options={FONT_OPTIONS} onChange={(font) => onChange({ ...p, font })} />
      <OptionGroup legend="Text size" name="size" value={p.size} options={SIZE_OPTIONS} onChange={(size) => onChange({ ...p, size })} />
      <OptionGroup legend="Line spacing" name="leading" value={p.leading} options={LEADING_OPTIONS} onChange={(leading) => onChange({ ...p, leading })} />
      <div className="settings-width">
        <OptionGroup legend="Column width" name="width" value={p.width} options={WIDTH_OPTIONS} onChange={(width) => onChange({ ...p, width })} />
      </div>

      <label className="settings-switch">
        <span>Show reading progress</span>
        <input type="checkbox" role="switch" checked={p.progress} onChange={(e) => onChange({ ...p, progress: e.target.checked })} />
      </label>

      <label className="settings-switch">
        <span>Focus mode</span>
        <input type="checkbox" role="switch" checked={focusMode} onChange={onToggleFocus} />
      </label>

      <div className="settings-footer">
        <button type="button" className="text-button shortcuts-link" onClick={onShowShortcuts}>
          Keyboard shortcuts
        </button>
        <button type="button" className="text-button" onClick={() => onChange(DEFAULT_PREFERENCES)}>
          Reset
        </button>
      </div>
    </div>
  );
}
