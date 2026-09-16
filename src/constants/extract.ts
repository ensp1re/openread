export const EXTRACT_ERROR = {
  INVALID_URL: "invalid-url",
  BLOCKED_HOST: "blocked-host",
  FETCH_FAILED: "fetch-failed",
  HTTP_ERROR: "http-error",
  NOT_HTML: "not-html",
  TOO_LARGE: "too-large",
  TIMEOUT: "timeout",
  NO_CONTENT: "no-content",
} as const;

export const FETCH_TIMEOUT_MS = 15_000;
export const MAX_HTML_BYTES = 8 * 1024 * 1024;
export const MAX_REDIRECTS = 5;

/** Brysbaert (2019) meta-analysis: adult silent reading of non-fiction averages ~238 wpm. */
export const WORDS_PER_MINUTE = 238;
