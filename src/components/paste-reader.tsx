"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { itemHref, saveText } from "@/lib/library/items";
import { sanitizePastedHtml, textToHtml } from "@/lib/pasted-article";
import { parsePublicUrl } from "@/lib/url";

export function PasteReader() {
  const sourceUrl = parsePublicUrl(useSearchParams().get("url") ?? "")?.href ?? null;
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Rich HTML from the clipboard keeps headings, lists and links; plain text is the fallback.
  const pastedHtml = useRef<string | null>(null);

  return (
    <main className="notice">
      <div className="notice-inner">
        <Link href="/" className="notice-home">
          OpenRead
        </Link>
        <h1>Paste the article</h1>
        <p className="notice-detail">Copy the text from the page and paste it below. Formatting such as headings and links is kept when possible.</p>

        <form
          className="paste-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            const text = String(data.get("text") ?? "");
            if (!text.trim()) return;
            const html = pastedHtml.current ? sanitizePastedHtml(pastedHtml.current) : textToHtml(text);
            setSaving(true);
            try {
              // Saved in this browser so Recent can reopen it after the tab closes.
              const id = await saveText(String(data.get("title") ?? "").trim(), html, sourceUrl);
              router.push(itemHref(id));
            } catch {
              setSaving(false);
              setError("This browser didn't allow saving the text (private mode or storage turned off).");
            }
          }}
        >
          <label htmlFor="title">Title (optional)</label>
          <input id="title" name="title" type="text" autoComplete="off" />
          <label htmlFor="text">Article text</label>
          <textarea
            id="text"
            name="text"
            required
            onPaste={(e) => {
              const html = e.clipboardData.getData("text/html");
              const whole = !e.currentTarget.value || e.currentTarget.selectionEnd - e.currentTarget.selectionStart === e.currentTarget.value.length;
              pastedHtml.current = html && whole ? html : null;
            }}
            onInput={(e) => {
              if (!(e.nativeEvent as InputEvent).inputType?.startsWith("insertFromPaste")) pastedHtml.current = null;
            }}
          />
          <p className="paste-hint">The text is kept in this browser so you can reopen it from Recent. Nothing is uploaded.</p>
          {error && (
            <p className="paste-hint" role="alert">
              {error}
            </p>
          )}
          <button type="submit" disabled={saving}>
            {saving ? "Opening…" : "Read"}
          </button>
        </form>
      </div>
    </main>
  );
}
