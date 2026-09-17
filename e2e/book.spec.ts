import { expect, test, type Page } from "@playwright/test";

async function openBook(page: Page) {
  await page.goto("/");
  await page.setInputFiles("input[type=file]", "test/fixtures/long-book.md");
  await page.waitForURL(/\/file\/[0-9a-f]{64}/);
  await expect(page.getByRole("heading", { level: 1, name: "The Long Book" })).toBeVisible();
}

const contents = (page: Page) => page.getByRole("dialog", { name: "Contents" });

test("a long document opens on its title page and starts at the first chapter", async ({ page }) => {
  await openBook(page);
  await expect(page.locator(".title-page")).toContainText("13 chapters");
  await page.getByRole("button", { name: "Start reading" }).click();
  await expect(page).toHaveURL(/\?chapter=0$/);
  await expect(page.getByRole("heading", { level: 1, name: "Beginning" })).toBeVisible();
  await expect(page.locator(".article-meta")).toContainText("1 of 13");
});

test("Contents lists the chapters and opens the one chosen", async ({ page }) => {
  await openBook(page);
  await page.getByRole("button", { name: "Start reading" }).click();
  await page.getByRole("button", { name: "Contents" }).click();
  await expect(contents(page).getByRole("listitem")).toHaveCount(13);
  await expect(contents(page).getByRole("button", { name: /Beginning/ })).toHaveAttribute("aria-current", "true");
  await contents(page).getByRole("button", { name: /Chapter 3/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Chapter 3" })).toBeVisible();
  await expect(contents(page)).toHaveCount(0);
});

test("Next and Previous move between chapters", async ({ page }) => {
  await openBook(page);
  await page.getByRole("button", { name: "Start reading" }).click();
  await page.getByRole("button", { name: /Next/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Chapter 1" })).toBeVisible();
  await page.getByRole("button", { name: /Previous/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Beginning" })).toBeVisible();
});

test("keyboard: c opens Contents, ] and [ change chapter", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard");
  await openBook(page);
  await page.getByRole("button", { name: "Start reading" }).click();
  await page.keyboard.press("]");
  await expect(page.getByRole("heading", { level: 1, name: "Chapter 1" })).toBeVisible();
  await page.keyboard.press("[");
  await expect(page.getByRole("heading", { level: 1, name: "Beginning" })).toBeVisible();
  await page.keyboard.press("c");
  await expect(contents(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(contents(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Contents" })).toBeFocused();
});

test("a book reopens from Recent at the chapter and place it was left", async ({ page }) => {
  await openBook(page);
  await page.getByRole("button", { name: "Start reading" }).click();
  await page.getByRole("button", { name: "Contents" }).click();
  await contents(page).getByRole("button", { name: /Chapter 4/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Chapter 4" })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.5));
  await page.waitForTimeout(700);

  await page.goto("/");
  const row = page.getByRole("region", { name: "Recent" }).getByRole("listitem").filter({ hasText: "The Long Book" });
  await expect(row).toContainText(/\d+%/);
  await row.getByRole("link").click();
  await expect(page.getByRole("heading", { level: 1, name: "Chapter 4" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY / document.documentElement.scrollHeight)).toBeGreaterThan(0.3);
});

test("an in-book link jumps to the chapter that holds the target", async ({ page }) => {
  await openBook(page);
  await page.goto(`${page.url().split("?")[0]}?chapter=5`);
  await expect(page.getByRole("heading", { level: 1, name: "Chapter 5" })).toBeVisible();
  await page.getByRole("link", { name: "the note in chapter two" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Chapter 2" })).toBeVisible();
});

test("the book reader never scrolls sideways", async ({ page }) => {
  await openBook(page);
  await page.getByRole("button", { name: "Start reading" }).click();
  await page.getByRole("button", { name: "Contents" }).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("a book opened and left without scrolling comes back to its chapter, not the title page", async ({ page }) => {
  await openBook(page);
  await page.getByRole("button", { name: "Start reading" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Beginning" })).toBeVisible();
  await page.goto("/");
  await page.getByRole("region", { name: "Recent" }).getByRole("link", { name: /The Long Book/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Beginning" })).toBeVisible();
  await expect(page.locator(".title-page")).toHaveCount(0);
});

test("the chapter is announced and focus moves to the text", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard");
  await openBook(page);
  await page.getByRole("button", { name: "Start reading" }).click();
  await page.keyboard.press("]");
  await expect(page.getByRole("heading", { level: 1, name: "Chapter 1" })).toBeVisible();
  expect(await page.evaluate(() => document.activeElement?.id)).toBe("article");
  await expect(page.locator("[aria-live=polite]")).toContainText("Chapter 1. Chapter 2 of 13.");
});

test("a contents entry for a section in another chapter lands on that section", async ({ page }) => {
  await page.goto("/");
  await page.setInputFiles("input[type=file]", "test/fixtures/parts-book.md");
  await page.waitForURL(/\/file\/[0-9a-f]{64}/);
  await page.getByRole("button", { name: "Start reading" }).click();
  await page.getByRole("button", { name: "Contents" }).click();
  await contents(page).getByRole("button", { name: "Part 3 Section 2" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Part 3" })).toBeVisible();
  const offset = await page.evaluate(() => {
    const heading = [...document.querySelectorAll(".prose h2")].find((h) => h.textContent?.includes("Part 3 Section 2"));
    return heading ? heading.getBoundingClientRect().top : null;
  });
  expect(offset).not.toBeNull();
  expect(Math.abs(offset!)).toBeLessThan(120); // the section is at the top of the screen, not scrolled past
});
