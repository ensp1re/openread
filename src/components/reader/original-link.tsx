"use client";

import { useEffect, useRef } from "react";
import type { OriginalView } from "@/types/reader";

/** The way from reflowed text to the original pages, and where focus lands on the way back. */
export function OriginalLink({ original }: { readonly original: OriginalView }) {
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (original.returning) button.current?.focus({ preventScroll: true });
  }, [original.returning]);

  return (
    <p className="pdf-notice">
      Reflowed from the PDF.{" "}
      <button ref={button} type="button" className="text-button" onClick={original.onView}>
        {original.label}
      </button>
    </p>
  );
}
