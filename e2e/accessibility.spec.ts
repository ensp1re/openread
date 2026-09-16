import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const TEXT = Array.from({ length: 8 }, (_, i) => `Paragraph ${i + 1} with a [link](x) and enough words to read.`).join("\n\n");

async function violations(page: import("@playwright/test").Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

test("home and error pages have no WCAG A/AA violations", async ({ page }) => {
  await page.goto("/");
  expect(await violations(page)).toEqual([]);
  await page.goto("/read?url=http://127.0.0.1/");
  expect(await violations(page)).toEqual([]);
});

for (const theme of ["light", "sepia", "soft", "dark"]) {
  test(`reader in ${theme} theme has no WCAG A/AA violations, settings open`, async ({ page }) => {
    // Reduced motion removes the panel's fade-in, so contrast is measured at full opacity.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript((t) => localStorage.setItem("openread:preferences", JSON.stringify({ theme: t })), theme);
    await page.goto("/paste");
    await page.getByLabel("Article text").fill(TEXT);
    await page.getByRole("button", { name: "Read" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    expect(await violations(page)).toEqual([]);
    await page.getByRole("button", { name: "Reading settings" }).click();
    expect(await violations(page)).toEqual([]);
  });
}
