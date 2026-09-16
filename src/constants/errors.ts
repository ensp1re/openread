import { EXTRACT_ERROR } from "@/constants/extract";
import type { ExtractErrorCode } from "@/types/article";

export const EXTRACT_ERROR_MESSAGE: Record<ExtractErrorCode, string> = {
  [EXTRACT_ERROR.INVALID_URL]: "That doesn't look like a web address. Check the link and try again.",
  [EXTRACT_ERROR.BLOCKED_HOST]: "This address points to a private or local network, which OpenRead doesn't open.",
  [EXTRACT_ERROR.FETCH_FAILED]: "The site couldn't be reached. It may be down, or the address may be wrong.",
  [EXTRACT_ERROR.HTTP_ERROR]: "The site refused the request.",
  [EXTRACT_ERROR.NOT_HTML]: "This link isn't a web page (it may be a PDF, image or download).",
  [EXTRACT_ERROR.TOO_LARGE]: "This page is too large to process.",
  [EXTRACT_ERROR.TIMEOUT]: "The site took too long to respond.",
  [EXTRACT_ERROR.NO_CONTENT]: "The page loaded, but no article text was found. It may need JavaScript, a login, or a subscription.",
};

export const HTTP_STATUS_HINT: Record<number, string> = {
  401: "The article is behind a login.",
  402: "The article is behind a paywall.",
  403: "The site blocks automated reading. Many large platforms do this.",
  404: "The page wasn't found. Check the link.",
  429: "The site is limiting requests. Try again in a minute.",
};
