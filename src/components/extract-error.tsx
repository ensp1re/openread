import Link from "next/link";
import { EXTRACT_ERROR_MESSAGE, HTTP_STATUS_HINT } from "@/constants/errors";
import { EXTRACT_ERROR } from "@/constants/extract";
import type { ExtractErrorProps } from "@/types/pages";
import { UrlForm } from "./url-form";

export function ExtractError({ url, code, status, simple }: ExtractErrorProps) {
  const detail =
    code === EXTRACT_ERROR.HTTP_ERROR && status
      ? (HTTP_STATUS_HINT[status] ?? `The site answered with an error (${status}).`)
      : EXTRACT_ERROR_MESSAGE[code];
  const canOpen = code !== EXTRACT_ERROR.INVALID_URL && code !== EXTRACT_ERROR.BLOCKED_HOST;
  const q = encodeURIComponent(url);

  return (
    <main className="notice">
      <div className="notice-inner">
        <Link href="/" className="notice-home">
          OpenRead
        </Link>
        <h1>Couldn&rsquo;t extract this article.</h1>
        <p className="notice-detail">{detail}</p>
        {url && <p className="notice-url">{url}</p>}

        <ul className="notice-actions">
          {canOpen && (
            <li>
              <Link href={`/read?url=${q}${simple ? "&mode=simple" : ""}`} prefetch={false}>
                Try again
              </Link>
            </li>
          )}
          {canOpen && !simple && code === EXTRACT_ERROR.NO_CONTENT && (
            <li>
              <Link href={`/read?url=${q}&mode=simple`} prefetch={false}>
                Try simpler extraction
              </Link>
              <span> — keeps more of the page, including some clutter</span>
            </li>
          )}
          <li>
            <Link href={`/paste${canOpen ? `?url=${q}` : ""}`}>Paste the article text</Link>
            <span> — copy it from the site and read it here</span>
          </li>
          {canOpen && (
            <li>
              <a href={url} target="_blank" rel="noopener noreferrer">
                Open the original page
              </a>
            </li>
          )}
        </ul>

        <div className="notice-form">
          <p>Or try a different link</p>
          <UrlForm />
        </div>
      </div>
    </main>
  );
}
