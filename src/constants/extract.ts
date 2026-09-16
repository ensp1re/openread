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
/**
 * Input caps and the worker memory limit must agree: a page at both caps must still parse within the limit.
 * Large Wikipedia articles are 2–3.2MB with ~43k tags; a 4.9MB/96k-tag page needed more than 768MB.
 */
export const MAX_HTML_BYTES = 4 * 1024 * 1024;
export const MAX_HTML_TAGS = 75_000;
export const MAX_REDIRECTS = 5;
/** Hard limit for parsing one page in the worker. Typical articles take under a second; a page at the caps ~5s. */
export const PARSE_TIMEOUT_MS = 8_000;
export const PARSE_WORKER_MEMORY_MB = 1024;

/** Brysbaert (2019) meta-analysis: adult silent reading of non-fiction averages ~238 wpm. */
export const WORDS_PER_MINUTE = 238;
