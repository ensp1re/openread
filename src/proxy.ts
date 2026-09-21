import { NextResponse, type NextRequest } from "next/server";
import { readPath, readQuery } from "@/lib/read-path";

/**
 * `/read?url=…` is the address the home page form posts to, the one older links use, and the one
 * people paste an article's address onto by hand. This tidies all three into the address the reader
 * keeps: the short `/read/<site>/<path>` when that leads back to the same page, and a properly
 * written `?url=` when it doesn't.
 *
 * It happens here, before anything renders, because the page streams its frame first — a redirect
 * after that becomes a meta refresh the reader sits through.
 */
export function proxy(request: NextRequest) {
  const { url, simple } = readQuery(request.nextUrl.search);
  if (!url) return NextResponse.next();

  const target = readPath(url, simple);
  // Already the address we'd send them to; rendering it is the whole point.
  if (target === `${request.nextUrl.pathname}${request.nextUrl.search}`) return NextResponse.next();
  return NextResponse.redirect(new URL(target, request.url), 307);
}

export const config = { matcher: "/read" };
