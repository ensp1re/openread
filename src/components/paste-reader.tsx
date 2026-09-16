"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { parsePublicUrl } from "@/lib/url";
import { buildPastedArticle, sanitizePastedHtml, textToHtml } from "@/lib/pasted-article";
import type { Article } from "@/types/article";
import { Reader } from "./reader/reader";

export function PasteReader() {
  const sourceUrl = parsePublicUrl(useSearchParams().get("url") ?? "")?.href ?? null;
  const [article, setArticle] = useState<Article | null>(null);
  // Rich HTML from the clipboard keeps headings, lists and links; plain text is the fallback.
  const pastedHtml = useRef<string | null>(null);

  if (article) {
    return (
      <Reader
        article={article}
        onExit={() => {
          setArticle(null);
          window.scrollTo(0, 0);
        }}
      />
    );
  }

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
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            const text = String(data.get("text") ?? "");
            if (!text.trim()) return;
            const html = pastedHtml.current ? sanitizePastedHtml(pastedHtml.current) : textToHtml(text);
            setArticle(buildPastedArticle(String(data.get("title") ?? ""), html, sourceUrl));
            window.scrollTo(0, 0);
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
          <p className="paste-hint">The text stays in this browser tab. Nothing is uploaded.</p>
          <button type="submit">Read</button>
        </form>
      </div>
    </main>
  );
}
