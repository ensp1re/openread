import { describe, expect, it } from "vitest";
import { createLimiter } from "./limiter";

describe("createLimiter", () => {
  it("never runs more than max tasks at once and runs all of them", async () => {
    const limit = createLimiter(2);
    let running = 0;
    let peak = 0;
    const task = (ms: number) => async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, ms));
      running--;
      return ms;
    };
    const results = await Promise.all([5, 1, 3, 2, 4].map((ms) => limit(task(ms))));
    expect(results).toEqual([5, 1, 3, 2, 4]);
    expect(peak).toBe(2);
  });

  it("hands a freed slot to the waiting task, not to a caller that arrives in between", async () => {
    const limit = createLimiter(1);
    const order: string[] = [];
    let running = 0;
    let peak = 0;
    let c: Promise<void> | undefined;
    // C calls limit() in the microtask right after A's promise resolves: the window where a slot could be stolen.
    const hold = (name: string) => () =>
      new Promise<void>((resolve) => {
        running++;
        peak = Math.max(peak, running);
        order.push(name);
        setTimeout(() => {
          running--;
          resolve();
          if (name === "A") void Promise.resolve().then(() => (c = limit(hold("C"))));
        }, 2);
      });
    await Promise.all([limit(hold("A")), limit(hold("B"))]);
    await c;
    expect(peak).toBe(1);
    expect(order).toEqual(["A", "B", "C"]);
  });

  it("frees the slot when a task throws", async () => {
    const limit = createLimiter(1);
    await expect(limit(async () => { throw new Error("x"); })).rejects.toThrow("x");
    expect(await limit(async () => 1)).toBe(1);
  });
});
