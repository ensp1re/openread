/** Runs at most `max` async tasks at once; the rest wait in order. */
export function createLimiter(max: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  return async function run<T>(task: () => Promise<T>): Promise<T> {
    // A finishing task hands its slot straight to the next waiter, so a new caller can't take it in between.
    if (active >= max) await new Promise<void>((r) => queue.push(r));
    else active++;
    try {
      return await task();
    } finally {
      const next = queue.shift();
      if (next) next();
      else active--;
    }
  };
}
