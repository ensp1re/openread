"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { FILE_ERROR_MESSAGE, STORAGE_ERROR_MESSAGE } from "@/constants/errors";
import { FILE_ACCEPT } from "@/constants/files";
import { openFile } from "@/lib/files/open";

/** Opens a book or document from this device: a picker, and dropping a file anywhere on the page. */
export function FileOpener() {
  const router = useRouter();
  const inputId = useId();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dropping, setDropping] = useState(false);
  const dragDepth = useRef(0);

  const handle = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy(file.name);
    const result = await openFile(file);
    if (result.ok) {
      router.push(result.href);
      return;
    }
    setBusy(null);
    setError(result.detail ?? (result.code === "storage" ? STORAGE_ERROR_MESSAGE : (FILE_ERROR_MESSAGE[result.code] ?? FILE_ERROR_MESSAGE.unreadable)));
  };

  useEffect(() => {
    const hasFile = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const onEnter = (e: DragEvent) => {
      if (!hasFile(e)) return;
      dragDepth.current++;
      setDropping(true);
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFile(e)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDropping(false);
    };
    const onOver = (e: DragEvent) => hasFile(e) && e.preventDefault();
    const onDrop = (e: DragEvent) => {
      if (!hasFile(e)) return;
      e.preventDefault();
      dragDepth.current = 0;
      setDropping(false);
      const files = e.dataTransfer?.files;
      if (files && files.length > 1) {
        setError("Drop one file at a time.");
        return;
      }
      void handle(files?.[0]);
    };
    // A drag cancelled with Escape fires dragend, not dragleave; without this the overlay would stick.
    const onEnd = () => {
      dragDepth.current = 0;
      setDropping(false);
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    window.addEventListener("dragend", onEnd);
    return () => {
      window.removeEventListener("dragend", onEnd);
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
    // handle() only reads refs and setState; it never changes between renders in a way that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="file-opener">
      <input
        id={inputId}
        type="file"
        className="sr-only"
        accept={FILE_ACCEPT}
        onChange={(e) => {
          void handle(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <label htmlFor={inputId} className="file-button">
        {busy ? `Opening ${busy}…` : "Open a book or document"}
      </label>
      <p className="file-hint">EPUB, PDF, Word, Markdown, HTML or text — it stays on this device.</p>
      {error && (
        <p className="file-error" role="alert">
          {error}
        </p>
      )}
      {dropping && (
        <div className="drop-overlay" aria-hidden="true">
          <span>Drop to open</span>
        </div>
      )}
    </div>
  );
}
