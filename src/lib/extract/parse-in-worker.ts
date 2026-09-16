import { availableParallelism } from "node:os";
import { Worker } from "node:worker_threads";
import { PARSE_TIMEOUT_MS, PARSE_WORKER_MEMORY_MB } from "@/constants/extract";
import { createLimiter } from "@/lib/limiter";
import type { Article } from "@/types/article";
import type { ParseJob, ParseOutcome } from "@/types/fetch";

// Each parse can use a few hundred MB; cap how many run at once so a burst can't exhaust memory.
const limit = createLimiter(Math.max(1, Math.min(4, Math.floor(availableParallelism() / 2))));

/**
 * jsdom and Readability are synchronous and can take tens of seconds on small malformed pages.
 * Running them in a worker keeps the server responsive, and terminate() enforces a hard time limit.
 * The time limit starts when the job gets a slot, not while it waits in the queue.
 */
export function parseInWorker(job: ParseJob): Promise<ParseOutcome> {
  return limit(
    () =>
      new Promise<ParseOutcome>((resolve) => {
        const worker = new Worker(new URL("./parse-worker.ts", import.meta.url), {
          workerData: job,
          resourceLimits: { maxOldGenerationSizeMb: PARSE_WORKER_MEMORY_MB },
        });
        const timer = setTimeout(() => {
          resolve({ ok: false, timedOut: true });
          void worker.terminate();
        }, PARSE_TIMEOUT_MS);
        // The first resolve wins; the rest are no-ops.
        const finish = (article: Article | null) => {
          clearTimeout(timer);
          resolve({ ok: true, article });
        };
        worker.once("message", (article: Article | null) => {
          finish(article);
          void worker.terminate();
        });
        // Running out of memory is a page-size problem, reported and cached like a timeout.
        worker.once("error", (err: NodeJS.ErrnoException) => {
          if (err.code === "ERR_WORKER_OUT_OF_MEMORY") {
            clearTimeout(timer);
            resolve({ ok: false, timedOut: true });
          } else finish(null);
        });
        worker.once("exit", () => finish(null));
      }),
  );
}
