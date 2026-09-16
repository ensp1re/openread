import { expect, test, type Page } from "@playwright/test";

const ESSAY = Array.from(
  { length: 30 },
  (_, i) => `Paragraph ${i + 1}. A long essay needs enough text to scroll, so this sentence repeats the idea in plain words for the test.`,
).join("\n\n");

async function openPasted(page: Page) {
  await page.goto("/paste");
  await page.getByLabel("Title (optional)").fill("A pasted essay");
  await page.getByLabel("Article text").fill(ESSAY);
  await page.getByRole("button", { name: "Read" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "A pasted essay" })).toBeVisible();
}

test("home page submits the link to the reader", async ({ page }) => {
  await page.goto("/");
  const input = page.getByLabel("Article link");
  await input.fill("http://127.0.0.1/private");
  await input.press("Enter");
  await expect(page).toHaveURL(/\/read\?url=http/);
  await expect(page.getByRole("heading", { name: "Couldn’t extract this article." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Paste the article text" })).toBeVisible();
});

test("pasted text opens in the reader with reading time", async ({ page }) => {
  await openPasted(page);
  await expect(page.locator(".prose p")).toHaveCount(30);
  await expect(page.locator(".article-meta")).toHaveText("3 min read");
});

test("the reader never scrolls sideways", async ({ page }) => {
  await openPasted(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("settings change the theme and persist across visits", async ({ page, isMobile }) => {
  await openPasted(page);
  await page.getByRole("button", { name: "Reading settings" }).click();
  const panel = page.getByRole("dialog", { name: "Reading settings" });
  await panel.getByRole("radio", { name: "Sepia" }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "sepia");
  await panel.getByRole("radio", { name: "Relaxed" }).check();
  await expect(page.locator("html")).toHaveAttribute("data-leading", "relaxed");
  if (!isMobile) {
    await panel.getByRole("radio", { name: "Narrow" }).check();
    await panel.getByRole("radio", { name: "Extra large" }).check();
    await expect(page.locator("html")).toHaveAttribute("data-size", "xl");
    await expect(page.locator("html")).toHaveAttribute("data-width", "narrow");
  }
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "sepia");
});

test("keyboard: settings, text size, focus mode and shortcuts", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard shortcuts are a desktop feature");
  await openPasted(page);
  const size = () => page.locator(".article").evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  const before = await size();
  await page.keyboard.press("+");
  expect(await size()).toBeGreaterThan(before);
  await page.keyboard.press("-");
  expect(await size()).toBe(before);

  await page.keyboard.press("s");
  await expect(page.getByRole("dialog", { name: "Reading settings" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Reading settings" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Reading settings" })).toBeFocused();

  await page.keyboard.press("f");
  await expect(page.locator(".reader")).toHaveAttribute("data-focus", "true");
  await expect(page.locator(".progress-track")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.locator(".reader")).not.toHaveAttribute("data-focus", "true");

  await page.keyboard.press("?");
  await expect(page.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeVisible();
});

test("the top bar hides while reading down and returns when scrolling up", async ({ page }) => {
  await openPasted(page);
  const bar = page.locator(".topbar");
  await page.mouse.move(10, 500);
  await page.evaluate(() => window.scrollTo(0, 1200));
  await expect(bar).toHaveAttribute("data-hidden", "true");
  await page.evaluate(() => window.scrollTo(0, 1000));
  await expect(bar).not.toHaveAttribute("data-hidden", "true");
});

test("live: the Paul Graham essay is extracted and readable", async ({ page }) => {
  test.skip(!process.env.LIVE, "network test; run with LIVE=1");
  await page.goto("/read?url=https://www.paulgraham.com/powerful.html");
  await expect(page.getByRole("heading", { level: 1, name: "Making Startups Powerful" })).toBeVisible();
  await expect(page.locator(".article-meta")).toContainText("September 2026");
  expect(await page.locator(".prose p").count()).toBeGreaterThan(20);
});
