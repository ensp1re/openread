# OpenRead

Paste an article link, or open a book from your device. Read it in a quiet, carefully typeset page.

No account, no tracking, nothing stored on a server. Files never leave your browser, and your settings and your place in each one stay there too.

## What it does

### Articles

- Extracts the article with Mozilla Readability (the library behind Firefox Reader View), sanitizes it, and keeps headings, lists, quotes, code, images and captions.
- Sets it in Literata at 20px (18px on phones), line height 1.6, about 66 characters per line.
- Four themes: Light, Sepia, Soft and Dark, plus Auto, which follows your system. Body text contrast is 10–15:1, not the harsh 21:1 of pure black on white.
- A small settings panel: font (Serif, Sans, Legible), text size, line spacing, column width, reading progress, focus mode.
- The top bar hides while you read down and comes back when you scroll up.
- Remembers where you stopped in each article.
- If a site blocks extraction: retry, try simpler extraction, paste the text yourself, or open the original.

### Books and documents

Open a file from the home page, or drop it anywhere on the page. Nothing is uploaded: the file is read and kept in your own browser.

| Format | What you get |
|---|---|
| EPUB | Chapters, the book's own contents, cover, author, images. DRM-protected and fixed-layout books are refused with a plain message |
| PDF | The text reflowed into the reading column, with the original pages one click away. Chapters come from the PDF's bookmarks. A locked PDF asks for its password; a scan opens as pages |
| Word (.docx) | Headings, lists, tables, footnotes and images |
| Markdown, HTML, text | Read as they are; long ones are split into chapters |

A long document opens in the **book reader**: a title page, one chapter at a time, a contents drawer, and Next/Previous at the end of each chapter. Short ones stay in the article reader.

### Recent

Every link, file and pasted text you open is listed on the home page, with how far you got, and reopens exactly there. Remove one with × (Undo for 5 seconds), or clear the list. Removing a file deletes it from the browser.

Files live in your browser's own storage. Safari clears that after 7 days without a visit, unless you add the site to your Home Screen.

Every default value is backed by a source in [docs/RESEARCH.md](docs/RESEARCH.md).

## Keyboard

| Key | Action |
|---|---|
| `s` | Reading settings |
| `t` | Next theme |
| `+` / `-` | Larger / smaller text |
| `f` | Focus mode |
| `j` / `k` | Scroll down / up |
| `c` | Contents (books) |
| `]` / `[` | Next / previous chapter |
| `n` | Read another article |
| `?` | Shortcuts |
| `Esc` | Close panel, leave focus mode |

## Run it

```bash
pnpm install
```

```bash
pnpm dev
```

Open http://localhost:3000.

## Checks

```bash
pnpm lint && pnpm typecheck && pnpm test
```

```bash
pnpm exec playwright install chromium && pnpm test:e2e
```

`pnpm test:live` runs extraction against real articles (needs network).

## Stack

Next.js 16 (App Router), React 19, Tailwind CSS 4, TypeScript.

Articles are extracted on the server with @mozilla/readability, jsdom and undici, in a worker thread with a time limit. Files are read in your browser with fflate (EPUB), pdfjs-dist (PDF), mammoth (Word) and marked (Markdown), and every document passes through DOMPurify before it is shown. Vitest and Playwright with axe for tests. Husky runs lint, typecheck and unit tests before each commit.
