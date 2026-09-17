import { expect, test, type Page } from "@playwright/test";

const fixture = (name: string) => `test/fixtures/${name}`;
const recent = (page: Page) => page.getByRole("region", { name: "Recent" });

async function open(page: Page, name: string) {
  await page.goto("/");
  await page.setInputFiles("input[type=file]", fixture(name));
  await page.waitForURL(/\/file\/[0-9a-f]{64}$/);
  await expect(page.locator(".article-title")).toBeVisible();
}

test("opens a text file and lists it under Recent", async ({ page }) => {
  await open(page, "notes.txt");
  await expect(page).toHaveURL(/\/file\/[0-9a-f]{64}$/);
  await expect(page.getByRole("heading", { level: 1, name: "Notes on quiet reading" })).toBeVisible();
  await expect(page.locator(".prose p")).toHaveCount(2);

  await page.goto("/");
  const row = recent(page).getByRole("listitem").filter({ hasText: "Notes on quiet reading" });
  await expect(row).toContainText("Text ·");
});

test("opens Markdown with its structure intact", async ({ page }) => {
  await open(page, "guide.md");
  await expect(page.getByRole("heading", { level: 1, name: "A short guide" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "A section" })).toBeVisible();
  await expect(page.locator(".prose blockquote")).toBeVisible();
  await expect(page.locator(".prose pre")).toBeVisible();
});

test("opens a saved web page without its navigation or scripts", async ({ page }) => {
  const dialogs: string[] = [];
  page.on("dialog", (d) => {
    dialogs.push(d.message());
    void d.dismiss();
  });
  await open(page, "page.html");
  await expect(page.getByRole("heading", { level: 1, name: "Saved page" })).toBeVisible();
  await expect(page.locator(".prose")).not.toContainText("Footer junk");
  await expect(page.locator(".prose iframe")).toHaveCount(0);
  await page.locator(".prose").getByRole("link").first().click({ trial: true });
  expect(dialogs).toEqual([]);
});

test("the same file opened twice is one Recent entry", async ({ page }) => {
  await open(page, "notes.txt");
  const url = page.url();
  await open(page, "notes.txt");
  await expect(page).toHaveURL(url);
  await page.goto("/");
  await expect(recent(page).getByRole("listitem").filter({ hasText: "Notes on quiet reading" })).toHaveCount(1);
});

test("a stored file reopens after a reload, at the saved position", async ({ page }) => {
  await open(page, "guide.md");
  const url = page.url();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "A short guide" })).toBeVisible();
  expect(page.url()).toBe(url);
});

test("an unsupported file is refused and nothing is stored", async ({ page }) => {
  await page.goto("/");
  await page.setInputFiles("input[type=file]", fixture("not-a-document.exe"));
  await expect(page.locator(".file-error")).toContainText("EPUB, PDF, Word, Markdown, HTML and text");
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(async () => {
    const db: IDBDatabase = await new Promise((r) => {
      const req = indexedDB.open("openread", 1);
      req.onsuccess = () => r(req.result);
    });
    return new Promise((r) => {
      db.transaction("items", "readonly").objectStore("items").count().onsuccess = (e) => r((e.target as IDBRequest).result);
    });
  })).toBe(0);
});

test("removing a file from Recent deletes it from this browser", async ({ page }) => {
  await open(page, "notes.txt");
  const url = page.url();
  await page.goto("/");
  await recent(page).getByRole("button", { name: /^Remove Notes on quiet reading/ }).click();
  await page.waitForTimeout(5500);
  await page.goto(url);
  await expect(page.getByRole("heading", { name: "This item isn’t saved in this browser." })).toBeVisible();
});

test("opens a real EPUB as a book, with its contents and chapters", async ({ page }) => {
  await open(page, "alice-epub3.epub");
  await expect(page.getByRole("heading", { level: 1, name: /Alice/i })).toBeVisible();
  await expect(page.locator(".title-page")).toContainText("Lewis Carroll");
  await page.getByRole("button", { name: "Start reading" }).click();
  await page.getByRole("button", { name: "Contents" }).click();
  const contents = page.getByRole("dialog", { name: "Contents" });
  await expect(contents.getByRole("listitem").first()).toBeVisible();
  await contents.getByRole("button", { name: /Rabbit-Hole/i }).click();
  await expect(page.locator(".prose")).toContainText(/rabbit/i);

  await page.goto("/");
  await expect(page.getByRole("region", { name: "Recent" }).getByRole("listitem").filter({ hasText: /Alice/i })).toContainText("EPUB ·");
});

test("an EPUB with DRM is refused and nothing is stored", async ({ page }) => {
  await page.goto("/");
  await page.setInputFiles("input[type=file]", "test/fixtures/drm.epub");
  await expect(page.locator(".file-error")).toContainText("protected by DRM");
  expect(await page.evaluate(async () => {
    const db: IDBDatabase = await new Promise((r) => {
      const req = indexedDB.open("openread", 1);
      req.onsuccess = () => r(req.result);
    });
    return new Promise((r) => {
      db.transaction("items", "readonly").objectStore("items").count().onsuccess = (e) => r((e.target as IDBRequest).result);
    });
  })).toBe(0);
});

test("opens a Word document", async ({ page }) => {
  await open(page, "report.docx");
  await expect(page.getByRole("heading", { level: 1, name: "Notes on a Word document" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "First section" })).toBeVisible();
  await expect(page.locator(".prose")).toContainText("A paragraph in a Word document");
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Recent" }).getByRole("listitem").filter({ hasText: "Notes on a Word document" })).toContainText("Word document ·");
});
