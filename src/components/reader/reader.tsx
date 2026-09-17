"use client";

import Link from "next/link";
import { useRef } from "react";
import type { ReaderProps } from "@/types/reader";
import { OriginalLink } from "./original-link";
import { ReaderChrome } from "./reader-chrome";
import { useReaderChrome } from "./use-reader-chrome";

export function Reader({ article, recent, original }: ReaderProps) {
  const articleRef = useRef<HTMLElement>(null);
  const positionKey = recent?.id ?? article.url;
  const chrome = useReaderChrome({ positionKey, recent, readingMinutes: article.readingMinutes, contentRef: articleRef });

  const host = article.url ? new URL(article.url).hostname.replace(/^www\./, "") : null;
  const source = article.siteName ?? host;
  const { minutesLeft } = chrome;

  return (
    <div className="reader" data-focus={chrome.focusMode || undefined}>
      <ReaderChrome chrome={chrome} status={minutesLeft > 0 ? `${minutesLeft} min left` : "Finished"}>
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

            {original && <OriginalLink original={original} />}

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
      </ReaderChrome>
    </div>
  );
}
