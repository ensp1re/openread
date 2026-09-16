# OpenRead

Paste an article link. Read it in a quiet, carefully typeset page.

No account, no tracking, nothing stored on a server. Settings and your place in each article stay in your browser.

## What it does

- Extracts the article with Mozilla Readability (the library behind Firefox Reader View), sanitizes it, and keeps headings, lists, quotes, code, images and captions.
- Sets it in Literata at 20px (18px on phones), line height 1.6, about 66 characters per line.
- Four themes: Light, Sepia, Soft and Dark, plus Auto, which follows your system. Body text contrast is 10–15:1, not the harsh 21:1 of pure black on white.
- A small settings panel: font (Serif, Sans, Legible), text size, line spacing, column width, reading progress, focus mode.
- The top bar hides while you read down and comes back when you scroll up.
- Remembers where you stopped in each article.
- If a site blocks extraction: retry, try simpler extraction, paste the text yourself, or open the original.

Every default value is backed by a source in [docs/RESEARCH.md](docs/RESEARCH.md).

## Keyboard

| Key | Action |
|---|---|
| `s` | Reading settings |
| `t` | Next theme |
| `+` / `-` | Larger / smaller text |
| `f` | Focus mode |
| `j` / `k` | Scroll down / up |
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

Next.js 16 (App Router), React 19, Tailwind CSS 4, TypeScript, @mozilla/readability, jsdom, DOMPurify, undici. Vitest and Playwright with axe for tests. Husky runs lint, typecheck and unit tests before each commit.
