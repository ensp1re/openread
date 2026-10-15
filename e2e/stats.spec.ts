import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const ESSAY = Array.from({ length: 40 }, (_, i) => `Paragraph ${i + 1}. Enough plain words to fill the page and scroll.`).join("\n\n");
const KEY = "openread:reading-time";

async function paste(page: Page) {
  await page.goto("/paste");
  await page.getByLabel("Article text").fill(ESSAY);
  await page.getByRole("button", { name: "Read" }).click();
  await expect(page).toHaveURL(/\/file\//);
  await expect(page.locator(".prose p").first()).toBeVisible();
}

const today = (page: Page) =>
  page.evaluate((key) => {
    const d = new Date();
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return (JSON.parse(localStorage.getItem(key) ?? "{}") as Record<string, number>)[day] ?? 0;
  }, KEY);

const stats = (page: Page) => page.getByRole("region", { name: /Reading, last 30 days/ });

test("reading time counts only while the reader is visible and in use", async ({ page }) => {
  await page.clock.install();
  await paste(page);

  await page.clock.runFor(30_000);
  expect(await today(page)).toBe(30);

  // Nobody scrolls or types for ten minutes: the count stops 2 minutes after the last activity.
  await page.clock.runFor(600_000);
  const idle = await today(page);
  // Ticks at 10…110s after the last activity count; from 120s on they don't.
  expect(idle).toBeGreaterThanOrEqual(100);
  expect(idle).toBeLessThanOrEqual(120);

  // A hidden tab adds nothing, even right after activity.
  await page.evaluate(() => Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true }));
  await page.mouse.wheel(0, 200);
  await page.clock.runFor(60_000);
  expect(await today(page)).toBe(idle);
});

test("home shows a line of minutes per day and the total, and nothing before any reading", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "OpenRead" })).toBeVisible();
  await expect(stats(page)).toHaveCount(0);

  await page.evaluate((key) => {
    const day = (ago: number) => {
      const d = new Date();
      d.setDate(d.getDate() - ago);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    // 40 days ago is outside the chart and not counted.
    localStorage.setItem(key, JSON.stringify({ [day(0)]: 1200, [day(3)]: 6000, [day(40)]: 9000 }));
  }, KEY);
  await page.reload();

  await expect(stats(page)).toContainText("2 h");
  const chart = stats(page).getByRole("img");
  await expect(chart).toHaveAttribute("aria-label", "Minutes read per day. Today 20 min; most in one day 1 h 40 min.");
  expect((await chart.locator("polyline").getAttribute("points"))?.split(" ")).toHaveLength(30);
});

test("settings and reading time move to another browser through Export and Import", async ({ page, browser }) => {
  await page.addInitScript(
    ([key]) => {
      if (!sessionStorage.getItem("seeded")) {
        sessionStorage.setItem("seeded", "1");
        localStorage.setItem("openread:preferences", JSON.stringify({ theme: "sepia", size: "xl" }));
        localStorage.setItem(key, JSON.stringify({ "2026-01-02": 600 }));
      }
    },
    [KEY],
  );
  await paste(page);
  await page.getByRole("button", { name: "Reading settings" }).click();
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^openread-\d{4}-\d{2}-\d{2}\.json$/);
  const file = await download.path();
  const exported = JSON.parse(readFileSync(file, "utf8"));
  expect(exported).toMatchObject({ app: "openread", version: 1, preferences: { theme: "sepia", size: "xl" } });
  expect(exported.readingTime["2026-01-02"]).toBe(600);

  // A fresh browser, with reading of its own on the same day: the larger value per day is kept.
  const other = await browser.newContext();
  const page2 = await other.newPage();
  await page2.addInitScript((key) => localStorage.setItem(key, JSON.stringify({ "2026-01-02": 60, "2026-01-03": 300 })), KEY);
  await paste(page2);
  await expect(page2.locator("html")).not.toHaveAttribute("data-theme", "sepia");
  await page2.getByRole("button", { name: "Reading settings" }).click();
  const input = page2.getByLabel("Import settings file");

  await input.setInputFiles({ name: "notes.json", mimeType: "application/json", buffer: Buffer.from('{"theme":"dark"}') });
  await expect(page2.getByRole("status").filter({ hasText: "isn’t an OpenRead export" })).toBeVisible();
  await expect(page2.locator("html")).not.toHaveAttribute("data-theme", "dark");
  expect(await page2.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}"), KEY)).toEqual({ "2026-01-02": 60, "2026-01-03": 300 });

  await input.setInputFiles(file);
  await expect(page2.getByRole("status").filter({ hasText: "Imported settings and" })).toBeVisible();
  await expect(page2.locator("html")).toHaveAttribute("data-theme", "sepia");
  await expect(page2.locator("html")).toHaveAttribute("data-size", "xl");
  const log = await page2.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}"), KEY);
  expect(log["2026-01-02"]).toBe(600);
  expect(log["2026-01-03"]).toBe(300);
  await other.close();
});
