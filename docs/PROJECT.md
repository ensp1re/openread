# OpenRead

Anyone with an article link gets that article in a calm, well-typeset page to read, with no account.

Discovery: tier 2 (outside users; reading-comfort choices need evidence), checked 2026-09-17. Evidence: [RESEARCH.md](RESEARCH.md).

## Users and jobs

- Reader: when I find a long article on a cluttered site, I want to paste its link and read it in a quiet page, so I can read for 30–120 minutes without strain or distraction. (V-44, V-45, V-47)
- Reader who can't get extraction to work: when a site blocks extraction or needs a login, I want to paste the text myself, so I can still read it comfortably. (V-44)

## Scope

- First release: R-1 to R-9.
- Later: justified text option (V-4, V-11 advise against as default); letter/word spacing controls (V-5); remembering a reading list (needs storage; conflicts with D-5).
- Out: accounts, library, highlights, sync, RSS, AI summaries (V-47, D-5); Bionic Reading and paragraph dimming (V-40).

## Domain

| Term | Meaning | Relations | States and rules |
|---|---|---|---|
| Article | Title, dek, byline, site name, published date, sanitized body HTML, word count, reading minutes | Built from a fetched page or pasted text | Body is always sanitized; reading minutes = prose words / 238 (V-9), code excluded |
| Extraction | Fetch a public URL and turn the page into an Article | Uses Readability, then a simpler main-landmark fallback | Fails with one error code: invalid-url, blocked-host, fetch-failed, http-error, not-html, too-large, timeout, no-content |
| Preferences | Theme, font, text size, line spacing, column width, progress on/off | Stored in this browser only | Unknown stored values fall back to defaults |
| Focus mode | Reading state with no top bar and no progress line | Toggled per visit | The bar returns only at the top of the page |
| Reading position | Scroll fraction saved per article URL | localStorage, newest 100 kept | Restored when between 2% and 98% |

## Requirements

| ID | Requirement | Acceptance (Given / When / Then) | Check | Based on |
|---|---|---|---|---|
| R-1 | Pasting a link and pressing Enter opens the reader for that article. | Given the home page, when a user enters a URL and presses Enter, then the browser goes to `/read?url=<url>` and shows the article title as the page's h1. | e2e, live | V-44 |
| R-2 | Extraction keeps article structure and removes unsafe or unrelated markup. | Given a page with scripts, event handlers, javascript: links, lazy images, tracking pixels and `<font>` footnotes, when parsed, then scripts/handlers/javascript: links are gone, lazy images have real src, 1×1 images are removed, and footnote markers stay inside their paragraph. | unit | V-46 |
| R-3 | The server never fetches private or local network addresses. | Given URLs for 127.0.0.1, ::1, localhost, 10/8, 169.254.169.254, when fetched, then the result is blocked-host and no connection is made to those addresses. | unit | security |
| R-4 | Default typography follows the research ranges. | Given default settings, when an article is shown, then body text is 20px on desktop and 18px under 600px wide, line-height 1.6 (1.55 on phones), and the serif column holds about 60–70 characters per line. | manual: browser measurement 66–71 cpl; e2e for font size change | V-1..V-4, V-6, V-10 |
| R-5 | Four themes with body contrast between 10:1 and 15:1 and secondary text ≥ 4.5:1, links underlined. | Given each theme, when the reader and the settings panel are open, then axe reports no WCAG 2.2 A/AA violations. | a11y | V-20..V-27 |
| R-6 | A small settings panel changes theme, font, size, line spacing and width, and the choice persists in this browser. | Given the panel, when the user picks Sepia, Relaxed, Narrow, Extra large, then `<html>` data attributes change immediately and the theme is still Sepia after navigating home. | e2e | V-6, V-42 |
| R-7 | Chrome stays out of the way while reading. | Given a long article, when the user scrolls down past 120px, then the top bar hides; when they scroll up more than 48px, it returns; in focus mode the bar and progress line are hidden and Esc leaves focus mode. | e2e | V-41, V-45 |
| R-8 | Keyboard shortcuts: s settings, t theme, +/− size, f focus, j/k scroll, n new, ? help, Esc close. | Given the reader on desktop, when the user presses +, −, s, Esc, f, Esc, ?, then size grows and shrinks back, the panel opens and closes with focus returned to its button, focus mode toggles, and the shortcuts dialog opens. | e2e | V-42 |
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
| D-11 | Deploy on Vercel (project aterli/openread, connected to GitHub); jsdom pinned to 26.x because jsdom 30's dependencies `require()` ES modules, which Vercel's Node runtime refused | user | 2026-09-17 | request; seen in production logs |
| D-10 | Parse in a worker thread: 20s hard limit (8s timed out a 3MB Wikipedia page on Vercel), at most min(4, cores/2) at once, 1GB heap; input caps 4MB and 75k tags (parse in the request thread; caps only) | agent default | 2026-09-17 | Security review: 45KB of malformed nesting blocked jsdom for 11s+; caps alone can't bound parse time. Caps sized so a page at both caps parses in ~5s under 1GB; large Wikipedia pages (~3MB, 43k tags) still work |

## Assumptions

| ID | We believe that | Wrong if | Test and threshold | Owner | Status |
|---|---|---|---|---|---|
| A-1 | Readability extracts most long-form articles well enough | More than 2 of 10 varied real articles lose body text or images | Live run on varied URLs (PG, Substack, Wikipedia incl. United States/India, tech blogs, Martin Fowler, Cloudflare) | agent | holds: all public pages tried extracted; Medium returns 403 (bot blocking, handled by R-9) |
| A-2 | A browser-like User-Agent is acceptable and needed for many sites | Sites complain or block it | Watch error codes after launch | user | open |
| A-3 | 20px/1.6/66 cpl defaults feel right for most readers over long sessions | Users mostly change size or width on first use | Needs real usage; no analytics by design | user | open |
