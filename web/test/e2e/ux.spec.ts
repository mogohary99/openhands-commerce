import { expect, test } from "@playwright/test";
import { chooseLightningByKeyboard, expectNoAxeViolations, searchByKeyboard } from "./helpers";

test("progress steps mark the current step for assistive technology", async ({ page }) => {
  await page.goto("/");
  const steps = page.getByRole("navigation", { name: "Progress" });
  await expect(steps.locator('[aria-current="step"]')).toHaveText(/Describe/);
  await searchByKeyboard(page);
  await chooseLightningByKeyboard(page);
  await expect(steps.locator('[aria-current="step"]')).toHaveText(/Check/);
  await expect(steps.getByText("Describe (done)", { exact: false })).toHaveCount(1);
});

test("comparison table: real row and column headers, values from the catalog", async ({ page }) => {
  await searchByKeyboard(page);
  const table = page.locator(".compare-table");
  await expect(table.locator('thead th[scope="col"]')).toHaveCount(3);
  await expect(table.locator('thead th[scope="col"]').first()).toHaveText("VoltLine 30W USB-C Wall Charger");
  const row = (label: string) => table.locator("tbody tr", { has: page.locator(`th[scope="row"]`, { hasText: label }) });
  await expect(row("Lowest price, all in").locator("td").first()).toHaveText("$33.04");
  await expect(row("Has an option that passes our checks").locator("td")).toHaveText(["Yes", "No", "No"]);
  await expect(row("Power").locator("td")).toHaveText(["30 W", "65 W", "20 W"]);
  // The scroll container is keyboard reachable and named, so sideways scrolling works without a mouse.
  await expect(page.getByRole("region", { name: "Compare side by side" })).toHaveAttribute("tabindex", "0");
  await expectNoAxeViolations(page, "results with comparison");
});

test("read-aloud is offered on the problem, after the fix, and never auto-plays", async ({ page }) => {
  await searchByKeyboard(page);
  await chooseLightningByKeyboard(page);
  const read = page.locator("#problem-0").getByRole("button", { name: "Read this problem aloud" });
  await expect(read).toBeVisible();
  expect(await page.evaluate(() => window.speechSynthesis.speaking)).toBe(false);
  // Keyboard order inside the panel: fix first, then remove, then read aloud.
  const order = await page.locator("#problem-0 button").allTextContents();
  expect(order[0]).toBe("Switch to the USB-C cable bundle (same price)");
  expect(order.at(-1)).toContain("Read this problem aloud");
});

test("home shows a labelled example check before any search", async ({ page }) => {
  await page.goto("/");
  const fig = page.getByRole("figure", { name: "What a check looks like" });
  await expect(fig).toContainText("Caught before you pay");
  await expect(fig).toContainText("An example.");
});
