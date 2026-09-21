# OpenRead

Anyone with an article link gets that article in a calm, well-typeset page to read, with no account.

Discovery: tier 2 (outside users; reading-comfort choices need evidence), checked 2026-09-17. Evidence: [RESEARCH.md](RESEARCH.md).

## Users and jobs

- Reader: when I find a long article on a cluttered site, I want to paste its link and read it in a quiet page, so I can read for 30–120 minutes without strain or distraction. (V-44, V-45, V-47)
- Reader with their own books: when I have an EPUB, PDF or DOCX, I want to open it without uploading it anywhere, so I can read it chapter by chapter and come back to my place. (V-60, V-63)
- Reader who closes tabs: when I close a tab by accident, I want the link or file listed on the home page, so I can reopen it where I stopped. (V-45)
- Reader who can't get extraction to work: when a site blocks extraction or needs a login, I want to paste the text myself, so I can still read it comfortably. (V-44)

## Scope

- First release: R-1 to R-9.
- Books, documents and Recent (2026-09-17): R-10 to R-16.
- Later: MOBI/AZW3/FB2 via foliate-js, ODT (D-17); page-turn mode, highlights, full-text search (D-13); justified text option (V-4, V-11 advise against as default); letter/word spacing controls (V-5); remembering a reading list (needs storage; conflicts with D-5).
- Out: RTF and CBZ (stale libraries, image-only comics don't fit a typography reader); accounts, library, highlights, sync, RSS, AI summaries (V-47, D-5); Bionic Reading and paragraph dimming (V-40).

## Domain

| Term | Meaning | Relations | States and rules |
|---|---|---|---|
| Article | Title, dek, byline, site name, published date, sanitized body HTML, word count, reading minutes | Built from a fetched page or pasted text | Body is always sanitized; reading minutes = prose words / 238 (V-9), code excluded |
| Extraction | Fetch a public URL and turn the page into an Article | Uses Readability, then a simpler main-landmark fallback | Fails with one error code: invalid-url, blocked-host, fetch-failed, http-error, not-html, too-large, timeout, no-content |
| Preferences | Theme, font, text size, line spacing, column width, progress on/off | Stored in this browser only | Unknown stored values fall back to defaults |
| Focus mode | Reading state with no top bar and no progress line | Toggled per visit | The bar returns only at the top of the page |
| Reading position | Scroll fraction saved per article URL or `file:<id>` (plus chapter for books) | localStorage, newest 100 kept | Restored when between 2% and 98% |
| Recent item | A link, file or pasted text the reader opened | localStorage, newest 50; file bytes live in IndexedDB | Opening again moves it to the top; removing it also deletes the stored file and position |
| Stored file | File bytes plus parsed document, keyed by SHA-256 of the bytes | IndexedDB (`files`, `parsed`) | Parsed cache is discarded when the parser version changes |
| Readable document | Either an article or a book | Built by a format parser | EPUB is always a book; others are books with ≥ 2 sections and ≥ 12,000 words, or PDFs ≥ 40 pages |
| Book | Title, author, contents, chapters (each shaped like an article) | Read in the book reader | One chapter on screen at a time |

## Requirements

| ID | Requirement | Acceptance (Given / When / Then) | Check | Based on |
|---|---|---|---|---|
| R-1 | Pasting a link and pressing Enter opens the reader for that article, at an address that reads like the article's own. | Given the home page, when a user enters `https://www.highagency.com/` and presses Enter, then the browser goes to `/read/highagency.com` and shows the article title as the page's h1; a link the short form would change (plain http, a query, a port) keeps `/read?url=<url>`, which always redirects to the short form when it can. A link pasted onto `/read?url=` without encoding is kept whole, including everything after its first `&`. | e2e, unit | V-44 |
| R-2 | Extraction keeps article structure and removes unsafe or unrelated markup. | Given a page with scripts, event handlers, javascript: links, lazy images, tracking pixels and `<font>` footnotes, when parsed, then scripts/handlers/javascript: links are gone, lazy images have real src, 1×1 images are removed, and footnote markers stay inside their paragraph. | unit | V-46 |
| R-3 | The server never fetches private or local network addresses. | Given URLs for 127.0.0.1, ::1, localhost, 10/8, 169.254.169.254, when fetched, then the result is blocked-host and no connection is made to those addresses. | unit | security |
| R-4 | Default typography follows the research ranges. | Given default settings, when an article is shown, then body text is 20px on desktop and 18px under 600px wide, line-height 1.6 (1.55 on phones), and the serif column holds about 60–70 characters per line. | manual: browser measurement 66–71 cpl; e2e for font size change | V-1..V-4, V-6, V-10 |
| R-5 | Four themes with body contrast between 10:1 and 15:1 and secondary text ≥ 4.5:1, links underlined. | Given each theme, when the reader and the settings panel are open, then axe reports no WCAG 2.2 A/AA violations. | a11y | V-20..V-27 |
| R-6 | A small settings panel changes theme, font, size, line spacing and width, and the choice persists in this browser. | Given the panel, when the user picks Sepia, Relaxed, Narrow, Extra large, then `<html>` data attributes change immediately and the theme is still Sepia after navigating home. | e2e | V-6, V-42 |
| R-7 | Chrome stays out of the way while reading. | Given a long article, when the user scrolls down past 120px, then the top bar hides; when they scroll up more than 48px, it returns; in focus mode the bar and progress line are hidden and Esc leaves focus mode. | e2e | V-41, V-45 |
| R-8 | Keyboard shortcuts: s settings, t theme, +/− size, f focus, j/k scroll, n new, ? help, Esc close. | Given the reader on desktop, when the user presses +, −, s, Esc, f, Esc, ?, then size grows and shrinks back, the panel opens and closes with focus returned to its button, focus mode toggles, and the shortcuts dialog opens. | e2e | V-42 |
| R-10 | Links and pasted text the reader opens are listed under Recent on the home page and reopen at the saved position. | Given an article read to 40%, when the home page opens, then Recent lists its title, site, "40%" and when it was opened; clicking it reopens the article at the same place; × removes it with Undo for 5s; Clear all empties the list; pasted text is listed and reopens. | recent-e2e, library-unit | V-45 |
| R-11 | A supported file picked or dropped on the home page opens in the reader without leaving the browser. | Given a .txt, .md, .html, .epub, .docx or .pdf ≤ 150 MB, when picked or dropped, then it opens (short → article reader, long → book reader), is stored in IndexedDB under its SHA-256, and appears in Recent; an unsupported type or a bigger file shows a plain message and nothing is stored. | files-e2e, library-unit | D-12, V-61 |
| R-12 | Long documents open in a book reader, one chapter at a time. | Given a book, when opened, then a title page shows (first time) or the saved chapter and position; Contents lists chapters with the current one marked; Next/Previous and `]`/`[` move chapters; `c` opens Contents; in-book links go to the right chapter and anchor; top bar shows minutes left in the chapter. | book-e2e, files-unit | D-13, V-43 |
| R-13 | EPUB 2 and 3 books open with their chapters, contents, metadata and images; DRM and fixed-layout books get a clear message. | Given a Standard Ebooks EPUB 3 and an EPUB 2, when opened, then chapter count, contents titles, title, author and images match the book; given an EPUB with META-INF/rights.xml, then the message says it is DRM-protected and nothing is shown. | files-unit, files-e2e | D-14, V-62 |
| R-14 | DOCX documents open with headings, lists, tables, footnotes and images. | Given a DOCX with Heading 1 sections, when opened, then headings become chapters (if long) or h2 sections (if short), and images show. | files-unit | D-15 |
| R-15 | PDFs open as reflowed text with an original-pages view. | Given a two-column PDF with running headers and a hyphenated line end, when opened, then text reads in column order, headers are gone, the hyphen is joined; the outline (if any) becomes Contents; "View original pages" shows the pages; a password PDF asks for the password; a PDF without text opens in the original view with a note. | files-unit, files-e2e | D-16, V-64 |
| R-16 | All document HTML is sanitized before display. | Given a file containing scripts, event handlers, javascript: links, styles and iframes, when opened in any format, then none of them reach the page. | files-unit | D-2 |
| R-17 | Coming back to something half-read offers to continue there, without blocking the page. | Given an article or chapter left between 3% and 97%, when it is opened in a new tab, then it opens at the top with a non-modal card showing the percentage, when it was read, and the opening words of the paragraph where reading stopped; Continue brings that paragraph into view and marks it briefly; Start over clears the saved place; Close or scrolling a screen hides the card and keeps the saved place until the reader moves on. Reloading, going back, or reopening in the same tab restores the place silently. | recent-e2e, book-e2e, a11y, library-unit | V-66, V-67 |
| R-18 | `j` and `k` scroll smoothly. | Given the reader, when `j` or `k` is pressed, then the page glides three lines instead of jumping; repeated or held presses add to one continuous glide; any other scrolling cancels it; with reduced motion the step is instant. | e2e | V-68 |
| R-9 | When extraction fails, the user gets a plain explanation and ways forward, never a stack trace. | Given a blocked or failing URL, when the reader route runs, then the page says "Couldn't extract this article.", explains the cause, and offers retry, simpler extraction (for no-content), paste the text, and open the original. Pasted text renders in the same reader with markup escaped. | e2e, unit | V-44 |

## Decisions

| ID | Decision (alternatives considered) | By | Date | Because |
|---|---|---|---|---|
| D-1 | Next.js 16 App Router + React 19 + Tailwind 4, pnpm, Husky pre-commit (Astro, Vite SPA) | user | 2026-09-17 | request |
| D-2 | @mozilla/readability + jsdom on the server, DOMPurify on the output, main-landmark fallback (Defuddle, Postlight parser, trafilatura) | agent default | 2026-09-17 | V-46: maintained, used by Firefox; Defuddle still "work in progress"; Postlight unmaintained; trafilatura is Python |
| D-3 | Literata as default serif (opsz axis), system UI sans, Atkinson Hyperlegible Next as "Legible"; system monospace for code (Source Serif 4, Newsreader, Inter webfont) | agent default | 2026-09-17 | V-6, V-7; system sans costs no download |
| D-4 | Reading CSS as tokens in `src/app/globals.css` driven by `data-*` attributes on `<html>`; Tailwind provides reset and build, not article styling (Tailwind typography plugin) | agent default | 2026-09-17 | extracted HTML can't carry utility classes; one token file keeps tuning in one place |
| D-5 | No accounts, no database; preferences and reading position in localStorage; pasted text never leaves the tab | user | 2026-09-17 | request, V-47 |
| D-6 | No paragraph-focus/Bionic mode; focus mode only removes chrome | agent default | 2026-09-17 | V-40 |
| D-7 | Theme changes apply instantly, no color transition | agent default | 2026-09-17 | A transition swapped heading color before the background, making the title unreadable mid-change (seen in testing) |
| D-8 | Undici fetch with DNS lookup checked at connect time, manual redirects re-validated, 15s timeout; IPv6 forms that embed IPv4 blocked | agent default | 2026-09-17 | R-3; prevents DNS-rebinding between check and connect (security review) |
| D-9 | In-memory 10-minute cache of successful and too-large results, 50 entries per server process | agent default | 2026-09-17 | Metadata and page render share one fetch; repeated slow URLs don't re-run a worker; many instances would need a shared cache |
| D-12 | Parse files in the browser; store bytes and parsed documents in IndexedDB keyed by SHA-256; Recent metadata in localStorage (server upload; accounts) | user + agent default | 2026-09-17 | Vercel 4.5 MB body limit (V-61), privacy, D-5 |
| D-13 | Books scroll one chapter at a time; no page turns (pagination; both) | user | 2026-09-17 | Simplest reliable layout on phones; same typography as articles |
| D-14 | EPUB parsed by our own code on fflate (epub.js: stagnant iframe renderer; foliate-js: unstable API) | agent default | 2026-09-17 | V-60 |
| D-15 | DOCX via mammoth, Markdown via marked, HTML files via Readability, all lazy-loaded (docx-preview: page-faithful styling fights our typography) | agent default | 2026-09-17 | V-63 |
| D-16 | PDF via lazy pdfjs-dist with our own reflow and an original-pages toggle; worker served from /public (pdf2md: second pdf.js copy; reflow only) | user + agent default | 2026-09-17 | V-64 |
| D-17 | First formats EPUB, PDF, DOCX, TXT, MD, HTML; MOBI/AZW3/FB2 and ODT later | user | 2026-09-17 | request |
| D-18 | A document is a book at ≥ 2 sections and ≥ 12,000 words, a PDF also at ≥ 40 pages; a PDF without bookmarks is cut into 10-page chapters | agent default | 2026-09-18 | A contents drawer should earn its place; a long PDF still needs a way back |
| D-19 | EPUB images are inlined as data URLs within a 24MB budget; remote media is removed from books | agent default | 2026-09-18 | A cached book must still show its pictures, and opening a book must not tell a server (security review) |
| D-20 | Files are parsed before they are stored, and a password-opened PDF is never cached | agent default | 2026-09-18 | Nothing unreadable is kept; unlocking a PDF once must not leave its text readable (security review) |
| D-11 | Deploy on Vercel (project aterli/openread, connected to GitHub); jsdom pinned to 26.x because jsdom 30's dependencies `require()` ES modules, which Vercel's Node runtime refused | user | 2026-09-17 | request; seen in production logs |
| D-10 | Parse in a worker thread: 20s hard limit (8s timed out a 3MB Wikipedia page on Vercel), at most min(4, cores/2) at once, 1GB heap; input caps 4MB and 75k tags (parse in the request thread; caps only) | agent default | 2026-09-17 | Security review: 45KB of malformed nesting blocked jsdom for 11s+; caps alone can't bound parse time. Caps sized so a page at both caps parses in ~5s under 1GB; large Wikipedia pages (~3MB, 43k tags) still work |

## Assumptions

| ID | We believe that | Wrong if | Test and threshold | Owner | Status |
|---|---|---|---|---|---|
| A-1 | Readability extracts most long-form articles well enough | More than 2 of 10 varied real articles lose body text or images | Live run on varied URLs (PG, Substack, Wikipedia incl. United States/India, tech blogs, Martin Fowler, Cloudflare) | agent | holds: all public pages tried extracted; Medium returns 403 (bot blocking, handled by R-9) |
| A-2 | A browser-like User-Agent is acceptable and needed for many sites | Sites complain or block it | Watch error codes after launch | user | open |
| A-3 | 20px/1.6/66 cpl defaults feel right for most readers over long sessions | Users mostly change size or width on first use | Needs real usage; no analytics by design | user | open |
