import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export const DEMO_QUERY = "My phone uses USB-C. I need a charger with a cable, forty-five dollars all in.";

export async function activeId(page: Page) {
  return page.evaluate(() => document.activeElement?.id ?? "");
}

export async function expectNoAxeViolations(page: Page, label: string) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
  const summary = r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  expect(summary, `axe violations on ${label}`).toEqual([]);
  return r;
}

// Keyboard-only: skip link → search box → type → submit.
export async function searchByKeyboard(page: Page, query = DEMO_QUERY) {
  await page.goto("/");
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement?.textContent)).toBe("Skip to main content");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  expect(await activeId(page)).toBe("q");
  await page.keyboard.type(query);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.locator("#results-title")).toBeFocused();
}

// From the focused results heading: Tab into the first product's options, move to the
// Lightning bundle with the arrow keys, and add it to the order.
export async function chooseLightningByKeyboard(page: Page) {
  await page.keyboard.press("Tab");
  expect(await activeId(page)).toBe("opt-v-charger-30w-bundle-c"); // the suggested option is preselected
  await page.keyboard.press("ArrowDown");
  expect(await activeId(page)).toBe("opt-v-charger-30w-bundle-l");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toHaveText(/Add to order and review/);
  await page.keyboard.press("Enter");
  await page.waitForURL("**/review");
  // Focus moves to the problem once the page's script has run; wait for it, as a shopper would.
  await expect(page.locator("#problem-0")).toBeFocused();
}

// Signature flow up to an approvable order: Lightning bundle chosen, then fixed in one press.
export async function reachApprovedQuote(page: Page) {
  await searchByKeyboard(page);
  await chooseLightningByKeyboard(page);
  await page.locator("#fix-0").click();
  await expect(page.locator("#fixed-panel")).toBeVisible();
}
