import { expect, test, type Page } from "@playwright/test";

const ESSAY = Array.from(
  { length: 60 },
  (_, i) => `Paragraph ${i + 1}. A long essay needs enough text to scroll, so this sentence repeats the idea in plain words.`,
).join("\n\n");

async function paste(page: Page, title: string) {
  await page.goto("/paste");
  await page.getByLabel("Title (optional)").fill(title);
  await page.getByLabel("Article text").fill(ESSAY);
  await page.getByRole("button", { name: "Read" }).click();
  await expect(page).toHaveURL(/\/file\/[0-9a-f]{64}$/);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
}

const recent = (page: Page) => page.getByRole("region", { name: "Recent" });

test("pasted text is listed in Recent and reopens at the saved position", async ({ page }) => {
  await paste(page, "Essay one");
  const fileUrl = page.url();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.5));
  await page.waitForTimeout(700); // position is saved 400ms after scrolling stops

  await page.goto("/");
  const row = recent(page).getByRole("listitem").filter({ hasText: "Essay one" });
  await expect(row).toContainText("Pasted text");
  await expect(row).toContainText(/\d+%/);
  await expect(row).toContainText("just now");

  // Opening it again asks, even in the same tab: that's a decision to read, not a return.
  await row.getByRole("link").click();
  await expect(page).toHaveURL(fileUrl);
  await page.getByRole("region", { name: "Pick up where you left off?" }).getByRole("button", { name: "Continue reading" }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY / document.documentElement.scrollHeight)).toBeGreaterThan(0.4);

  // Back from the home page is a return: the place comes back without a question.
  await page.waitForTimeout(700);
  // The bar has hidden itself while reading; click its link the way the app would, client-side.
  await page.locator(".topbar-home").evaluate((a: HTMLAnchorElement) => a.click());
  await expect(page).toHaveURL("/");
  await page.goBack();
  await expect(page).toHaveURL(fileUrl);
  await expect.poll(() => page.evaluate(() => window.scrollY / document.documentElement.scrollHeight)).toBeGreaterThan(0.4);
  await expect(page.getByRole("region", { name: "Pick up where you left off?" })).toBeHidden();
});

test("the list survives closing the tab: a new page shows the same items", async ({ context, page }) => {
  await paste(page, "Survives");
  await page.close();
  const again = await context.newPage();
  await again.goto("/");
  await expect(recent(again).getByRole("link", { name: /Survives/ })).toBeVisible();
});

test("remove with Undo, and Clear all", async ({ page }) => {
  await paste(page, "Keep me");
  await paste(page, "Remove me");
  await page.goto("/");

  await recent(page).getByRole("button", { name: "Remove Remove me from Recent" }).click();
  await expect(recent(page).getByRole("link", { name: /Remove me/ })).toHaveCount(0);
  await recent(page).getByRole("button", { name: "Undo" }).click();
  await expect(recent(page).getByRole("link", { name: /Remove me/ })).toBeVisible();

  await recent(page).getByRole("button", { name: "Clear all" }).click();
  await expect(recent(page).getByRole("link")).toHaveCount(0);
  await expect(recent(page).getByRole("status")).toContainText("Cleared Recent.");
  await page.waitForTimeout(5500);
  await expect(recent(page)).toHaveCount(0);

  // Stored text is deleted once Undo expires.
  await page.goBack();
  await expect(page.getByRole("heading", { name: "This item isn’t saved in this browser." })).toBeVisible();
});

test("live: a read article is listed with its site", async ({ page }) => {
  test.skip(!process.env.LIVE, "network test; run with LIVE=1");
  await page.goto("/read?url=https://www.paulgraham.com/powerful.html");
  await expect(page.getByRole("heading", { level: 1, name: "Making Startups Powerful" })).toBeVisible();
  await page.goto("/");
  await expect(recent(page).getByRole("listitem").filter({ hasText: "Making Startups Powerful" })).toContainText("paulgraham.com");
});

test("keyboard focus follows remove and Undo", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard");
  await paste(page, "Focus one");
  await paste(page, "Focus two");
  await page.goto("/");
  await recent(page).getByRole("button", { name: "Remove Focus two from Recent" }).focus();
  await page.keyboard.press("Enter");
  await expect(recent(page).getByRole("button", { name: "Undo" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(recent(page).getByRole("link", { name: /Focus two/ })).toBeFocused();
});

test("a finished item still shows Finished after reopening it", async ({ page }) => {
  await paste(page, "Read to the end");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(700);
  await page.goto("/");
  const row = recent(page).getByRole("listitem").filter({ hasText: "Read to the end" });
  await expect(row).toContainText("Finished");
  await row.getByRole("link").click();
  await expect(page.getByRole("heading", { level: 1, name: "Read to the end" })).toBeVisible();
  await page.waitForTimeout(700);
  await page.goto("/");
  await expect(recent(page).getByRole("listitem").filter({ hasText: "Read to the end" })).toContainText("Finished");
});

test("pasting still works when the browser blocks storage", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", { get: () => ({ open: () => { throw new Error("blocked"); } }) });
  });
  await page.goto("/paste");
  await page.getByLabel("Title (optional)").fill("Unsaved");
  await page.getByLabel("Article text").fill(ESSAY);
  await page.getByRole("button", { name: "Read" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Unsaved" })).toBeVisible();
  await expect(page.getByText("isn’t saved", { exact: false })).toBeVisible();
});

test("removing in one tab is safe while another tab opens the home page during Undo", async ({ context, page }) => {
  await paste(page, "Two tabs");
  const fileUrl = page.url();
  await page.goto("/");
  await recent(page).getByRole("button", { name: "Remove Two tabs from Recent" }).click();
  const other = await context.newPage();
  await other.goto("/");
  await other.waitForTimeout(500);
  await recent(page).getByRole("button", { name: "Undo" }).click();
  await page.goto(fileUrl);
  await expect(page.getByRole("heading", { level: 1, name: "Two tabs" })).toBeVisible();
});

test("hovering Undo keeps an older item restorable, even if another tab cleans up", async ({ context, page }) => {
  await paste(page, "Older item");
  const fileUrl = page.url();
  await page.goto("/");
  // Age the stored record past the 60s grace, as a normal reading session would.
  await page.evaluate(async () => {
    const db: IDBDatabase = await new Promise((r) => {
      const req = indexedDB.open("openread", 1);
      req.onsuccess = () => r(req.result);
    });
    await new Promise((r) => {
      const store = db.transaction("items", "readwrite").objectStore("items");
      store.getAll().onsuccess = (e) => {
        for (const rec of (e.target as IDBRequest).result) store.put({ ...rec, addedAt: Date.now() - 600_000 });
        r(null);
      };
    });
  });

  await recent(page).getByRole("button", { name: "Remove Older item from Recent" }).click();
  await recent(page).getByRole("button", { name: "Undo" }).hover();
  await page.waitForTimeout(7000); // longer than the Undo window, which the hover pauses

  const other = await context.newPage();
  await other.goto("/");
  await other.waitForTimeout(500);

  await recent(page).getByRole("button", { name: "Undo" }).click();
  await page.goto(fileUrl);
  await expect(page.getByRole("heading", { level: 1, name: "Older item" })).toBeVisible();
});

test.describe("coming back to something half-read", () => {
  const card = (page: Page) => page.getByRole("region", { name: "Pick up where you left off?" });
  const scrolled = (page: Page) => page.evaluate(() => window.scrollY / document.documentElement.scrollHeight);

  /** Reads half an essay, then opens it again in a fresh tab, the way a closed tab is reopened. */
  async function leaveHalfRead(page: Page, title: string) {
    await paste(page, title);
    const url = page.url();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.5));
    await page.waitForTimeout(700); // position is saved 400ms after scrolling stops
    return url;
  }
  async function reopen(page: Page, url: string) {
    const tab = await page.context().newPage();
    await tab.goto(url);
    await expect(tab.getByRole("heading", { level: 1 })).toBeVisible();
    return tab;
  }

  test("opens at the top and offers the place, with the words that were being read", async ({ page }) => {
    const tab = await reopen(page, await leaveHalfRead(page, "Half read"));
    await expect(card(tab)).toBeVisible();
    await expect(card(tab)).toContainText(/\d+% read · just now/);
    await expect(card(tab).locator(".resume-words")).toContainText(/^Paragraph \d+\. A long essay/);
    expect(await tab.evaluate(() => window.scrollY)).toBe(0);

    const words = (await card(tab).locator(".resume-words").textContent())!.slice(0, 14);
    await card(tab).getByRole("button", { name: "Continue reading" }).click();
    await expect(card(tab)).toBeHidden();
    await expect.poll(() => scrolled(tab)).toBeGreaterThan(0.4);
    // The paragraph returned to is the one quoted, is marked, and holds focus for screen readers.
    const mark = tab.locator(".prose .resume-mark");
    await expect(mark).toHaveText(new RegExp(`^${words.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    await expect(mark).toBeFocused();
    await expect(tab.locator(".prose .resume-mark")).toHaveCount(0, { timeout: 5000 });
  });

  test("Start over forgets the place", async ({ page }) => {
    const url = await leaveHalfRead(page, "Start again");
    const tab = await reopen(page, url);
    await card(tab).getByRole("button", { name: "Start over" }).click();
    await expect(card(tab)).toBeHidden();
    expect(await tab.evaluate(() => window.scrollY)).toBe(0);

    const later = await reopen(page, url);
    await later.waitForTimeout(500);
    await expect(card(later)).toBeHidden();
    expect(await later.evaluate(() => window.scrollY)).toBe(0);
  });

  test("Not now keeps the place for next time, and so does reading a little at the top", async ({ page }) => {
    const url = await leaveHalfRead(page, "Not now");
    const tab = await reopen(page, url);
    await card(tab).getByRole("button", { name: "Not now" }).click();
    await expect(card(tab)).toBeHidden();
    expect(await tab.evaluate(() => window.scrollY)).toBe(0);
    await tab.evaluate(() => window.scrollBy(0, 60));
    await tab.waitForTimeout(700);

    const later = await reopen(page, url);
    await expect(card(later)).toBeVisible();
    await card(later).getByRole("button", { name: "Continue reading" }).click();
    await expect.poll(() => scrolled(later)).toBeGreaterThan(0.4);
  });

  test("reading on for a screen answers it: the card goes and the new place is kept", async ({ page }) => {
    const url = await leaveHalfRead(page, "Read on");
    const tab = await reopen(page, url);
    await expect(card(tab)).toBeVisible();
    await tab.evaluate(() => window.scrollBy(0, window.innerHeight * 1.5));
    await expect(card(tab)).toBeHidden();
    await tab.waitForTimeout(700);
    const nowAt = await scrolled(tab);
    expect(nowAt).toBeLessThan(0.4);

    const later = await reopen(page, url);
    await card(later).getByRole("button", { name: "Continue reading" }).click();
    await expect.poll(async () => Math.abs((await scrolled(later)) - nowAt)).toBeLessThan(0.1);
  });

  test("Escape closes it without moving", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard");
    const tab = await reopen(page, await leaveHalfRead(page, "Escape"));
    await expect(card(tab)).toBeVisible();
    await tab.keyboard.press("Escape");
    await expect(card(tab)).toBeHidden();
    expect(await tab.evaluate(() => window.scrollY)).toBe(0);
  });

  test("something read to the end isn't offered; it opens at the top", async ({ page }) => {
    const url = await leaveHalfRead(page, "Finished one");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(700);
    const tab = await reopen(page, url);
    await tab.waitForTimeout(500);
    await expect(card(tab)).toBeHidden();
    expect(await tab.evaluate(() => window.scrollY)).toBe(0);
  });

  test("pressing Back and then opening a different item still asks about that item", async ({ page }) => {
    await leaveHalfRead(page, "Alpha");
    await leaveHalfRead(page, "Beta");
    await page.goto("/");
    await recent(page).getByRole("link", { name: /Beta/ }).click();
    await card(page).getByRole("button", { name: "Not now" }).click();
    await page.goBack();
    await expect(page).toHaveURL("/");
    await recent(page).getByRole("link", { name: /Alpha/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Alpha" })).toBeVisible();
    await expect(card(page)).toBeVisible();
  });

  test("in focus mode the card is out of sight, and Escape leaves focus mode", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard");
    const tab = await reopen(page, await leaveHalfRead(page, "Focus"));
    await expect(card(tab)).toBeVisible();
    await tab.keyboard.press("f");
    await expect(card(tab)).toBeHidden();
    await tab.keyboard.press("Escape");
    await expect(tab.locator(".reader")).not.toHaveAttribute("data-focus", "true");
    // The offer is still there once the reader is back.
    await expect(card(tab)).toBeVisible();
  });

  test("a reload in the same tab returns to the place without asking", async ({ page }) => {
    const tab = await reopen(page, await leaveHalfRead(page, "Reload"));
    await expect(card(tab)).toBeVisible();
    await tab.reload();
    await expect(tab.getByRole("heading", { level: 1, name: "Reload" })).toBeVisible();
    await expect.poll(() => scrolled(tab)).toBeGreaterThan(0.4);
    await expect(card(tab)).toBeHidden();
  });
});
