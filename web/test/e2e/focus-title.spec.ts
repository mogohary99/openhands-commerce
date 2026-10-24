import { expect, test } from "@playwright/test";
import { chooseLightningByKeyboard, searchByKeyboard } from "./helpers";

// Regression for the 2026-10-24 flake: on the client-side navigation to /review, Next
// commits the page a frame before it re-inserts <title>, and focus used to move to the
// problem panel inside that frame (axe then reported `document-title`). Focus must only
// ever move into a page that already has its name. Repeated to catch the 1-frame window.
for (let run = 1; run <= 5; run++) {
  test(`focus never moves into a page without a title (run ${run})`, async ({ page }) => {
    await page.addInitScript(() => {
      const seen: Array<{ id: string; title: string; path: string }> = ((window as any).__focusTitles = []);
      document.addEventListener("focusin", () => seen.push({ id: document.activeElement?.id ?? "", title: document.title, path: location.pathname }), true);
    });
    await searchByKeyboard(page);
    await chooseLightningByKeyboard(page);
    await page.locator("#fix-0").press("Enter");
    await expect(page.locator("#fixed-panel")).toBeFocused();
    const seen = await page.evaluate(() => (window as any).__focusTitles as Array<{ id: string; title: string; path: string }>);
    const moved = seen.filter((s) => ["results-title", "problem-0", "fixed-panel"].includes(s.id));
    expect(moved.map((s) => s.id)).toEqual(expect.arrayContaining(["problem-0", "fixed-panel"]));
    expect(moved.filter((s) => !s.title), "focus moved while document.title was empty").toEqual([]);
  });
}
