"use client";

import { useEffect, useRef } from "react";
import { SHORTCUTS } from "@/constants/reader";
import type { ShortcutsDialogProps } from "@/types/reader";

export function ShortcutsDialog({ onClose }: ShortcutsDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  // A native listener: React's onClose prop did not fire when <form method="dialog"> closed the dialog.
  // No close() in cleanup: removing the element already closes it, and a close event would re-trigger onClose.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.addEventListener("close", onClose);
    if (!dialog.open) dialog.showModal();
    return () => dialog.removeEventListener("close", onClose);
  }, [onClose]);

  return (
    <dialog ref={ref} className="shortcuts-dialog" aria-labelledby="shortcuts-title" onClick={(e) => e.target === ref.current && onClose()}>
      <h2 id="shortcuts-title">Keyboard shortcuts</h2>
      <dl>
        {SHORTCUTS.map((s) => (
          <div key={s.label}>
            <dt>
              {s.keys.map((k) => (
                <kbd key={k}>{k}</kbd>
              ))}
            </dt>
            <dd>{s.label}</dd>
          </div>
        ))}
      </dl>
      <form method="dialog">
        <button className="text-button">Close</button>
      </form>
    </dialog>
  );
}
