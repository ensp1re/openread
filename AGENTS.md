<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# OpenRead

Paste an article URL, read it in a calm, typeset page. No accounts, no database. Product rows: [docs/PROJECT.md](docs/PROJECT.md); evidence behind every reading value: [docs/RESEARCH.md](docs/RESEARCH.md).

## Commands

- Setup: `pnpm install` then `pnpm exec playwright install chromium`
- Dev: `pnpm dev` (http://localhost:3000)
- Checks: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e` (builds and starts on port 3219)
- Real articles over the network: `pnpm test:live`, or `LIVE=1 pnpm test:e2e`
- Pre-commit (Husky): lint, typecheck, unit tests

## Project rules

- Reading values (sizes, leading, widths, colors) live only as CSS variables in `src/app/globals.css`. Change a value there and update its V- reference; never hardcode one in a component.
- Any theme color change must keep body text 10–15:1 and secondary ≥ 4.5:1; `e2e/accessibility.spec.ts` must stay green.
- Bump `PARSER_VERSION` (src/constants/files.ts) whenever a parser's output changes or DOMPurify is upgraded: parsed documents are cached in IndexedDB and would otherwise keep old sanitizer output.
- Extracted HTML is untrusted: everything rendered with `dangerouslySetInnerHTML` goes through DOMPurify (`src/lib/extract/parse-article.ts`, `src/lib/pasted-article.ts`).
- Server fetches go only through `fetchPage` in `src/lib/extract/fetch-page.ts`, which blocks private networks. Don't add another fetch path for user URLs.
- TypeScript layout: named types in `src/types/<domain>.ts`, finite values as `as const` objects in `src/constants/<domain>.ts` with unions derived in types.
- No feature that needs an account or server-side storage (D-5). No paragraph-dimming or bionic modes (D-6).

<!-- harness:start (installed by harness-bootstrap; keep project notes outside these markers) -->
## Harness

Run `python3 scripts/harness.py status` before anything else in a session, and again whenever your context was compacted or restarted. It prints the task in progress with its acceptance, checks and must-not-change list, the last verify and review results with log paths, recent notes, how the last session ended, and the next step, so you do not need to read `docs/tasks.json`, old run logs, or the runner's source. `python3 scripts/harness.py <command> -h` explains any command.

- `docs/PROJECT.md`: users, scope, domain terms and rules, requirements (R-), decisions (D-), assumptions (A-), open questions (Q-). Read the rows a task's refs name, not the whole file.
- `docs/RESEARCH.md`, if present: cited facts (V-) behind the decisions. Open it for scope or domain questions only.
- `docs/config.json`: the checks `verify` and `wrapup` run. `docs/runs/`: check logs, not committed.

**Definition of done.** A task is done only when every acceptance line is proven by a test or check that passed in `verify` together with the required checks, nothing on its must-not-change list changed, an independent review passed if the task asks for one, and the work is committed with `done ID --proof` naming the test behind each line. The runner refuses `done` until these hold.

Task loop, one task at a time:
1. `start ID` for the task `status` suggests.
2. For each acceptance line, write or extend a test and see it fail. Make the smallest change that passes. Run the relevant check directly while you work.
3. Missing information? If a search can answer it, use at most 5 searches on primary sources, add the facts as V- rows (URL, date) and the choice as a D- row, `edit` the acceptance if it changed, and continue. If only the user can answer, `block ID --reason "question: ..."` and take another ready task.
4. `verify ID`. On failure, read the printed log tail, fix the cause, verify again. After 3 failed verifies with no new idea, `note` what you tried and `block` the task.
5. Task marked for review: someone with fresh context (a subagent or a new session that did not write the code) reads `show ID` and `git diff`, then records `review ID --pass` or `--fail` with `--summary "findings"`. A failed review returns the task to step 2.
6. Commit, then `done ID --proof "1=<test for line 1>" ...`. Take the next ready task unless the user limited the work.

Stay in scope: other work you notice becomes `add "<behavior>" --accept "..." --check ID`; do not fold it into the current change.

New feature requests:
- Small and clear (one behavior whose Given/When/Then you can write without guessing): add an R- row to `docs/PROJECT.md`, then `add` the task with `--accept`, `--check`, `--ref R-n`, and `--keep` for what must not change.
- Large or unclear, or touching money, personal data or security: define it before building. Use the harness-bootstrap skill if it is installed; otherwise ask the user at most 3 questions with a recommended default each, record the answers as D-, A- or Q- rows, and split the feature into tasks.
- If a task is in progress, new work waits in the queue. If the user wants it first, `block` the current task with `--reason "paused for F0NN"`.

When scope or an assumption changes: update its rows in `docs/PROJECT.md` (replace outdated rows; git keeps the history), find what depends on them with `grep -n "<ID>" docs/PROJECT.md` and `list`, then `edit` affected tasks (their evidence goes stale), `reopen` passing work that must change, `drop ID --reason "..."` work that is no longer wanted, and `add` new work.

Keep context small: use `status` and `show` instead of state files, read log tails, and open only the rows a task needs. When your context is more than half full, `note ID "<done / next>"` so a compaction or restart loses nothing. Before you stop, run `wrapup --note "<done / next>"`: it runs the required checks, looks for debug leftovers and uncommitted work, and records how the session ended. Fix what it reports, or leave the report for the next session. Push or open pull requests only when the user asked for it.
<!-- harness:end -->
