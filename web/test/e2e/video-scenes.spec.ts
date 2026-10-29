import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DEMO_QUERY } from "./helpers";

// Raw footage for the demo video: `npm run video:scenes`. These are real recordings of the
// running app, driven by the keyboard at a human pace, silent (narration is added in editing).
// No scene here shows a payment: the PayPal login and the receipt must be recorded from a real
// buyer approval (`npm run purchase:manual`), never staged.
const enabled = process.env.RECORD_SCENES === "1";
const OUT = path.resolve("../docs/video/scenes");

test.use({ viewport: { width: 1280, height: 800 }, video: { mode: "on", size: { width: 1280, height: 800 } } });
test.skip(!enabled, "recording only: npm run video:scenes");

const pause = (page: Page, ms = 900) => page.waitForTimeout(ms);

async function save(page: Page, name: string) {
  mkdirSync(OUT, { recursive: true });
  await pause(page, 1500);
  const video = page.video()!;
  await page.close();
  await video.saveAs(path.join(OUT, `${name}.webm`));
}

async function toBlockedReview(page: Page, typeDelay: number) {
  await page.goto("/");
  await pause(page, 1500);
  await page.keyboard.press("Tab"); // skip link
  await pause(page);
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await pause(page, 500);
  await page.keyboard.type(DEMO_QUERY, { delay: typeDelay });
  await pause(page);
  await page.keyboard.press("Tab");
  await pause(page, 500);
  await page.keyboard.press("Enter");
  await expect(page.locator("#results-title")).toBeFocused();
  await pause(page, 2500);
  await page.locator(".shopping-for, [aria-labelledby*='shopping']").first().scrollIntoViewIfNeeded().catch(() => {});
  await page.keyboard.press("Tab");
  await pause(page);
  await page.keyboard.press("ArrowDown"); // the Lightning bundle
  await pause(page, 1200);
  await page.keyboard.press("Tab");
  await pause(page);
  await page.keyboard.press("Enter");
  await page.waitForURL("**/review");
  await expect(page.locator("#problem-0")).toBeFocused();
}

test("scene 1: request → results → wrong cable → blocked → one-key fix → $40.62", async ({ page }) => {
  test.setTimeout(180_000);
  await toBlockedReview(page, 45);
  await pause(page, 4000); // the problem panel, read on screen
  // Show who wrote the explanation ("Explanation written by Claude…" or "…explained by our rules").
  // Scrolling doesn't move keyboard focus; the next focus() scrolls back.
  await page.locator("p.small.muted", { hasText: /written by Claude|explained by our rules/ }).first().scrollIntoViewIfNeeded();
  await pause(page, 3500);
  await page.locator("#approve-button").focus();
  await pause(page, 1500);
  await page.keyboard.press("Enter"); // blocked: nothing is charged, focus returns to the problem
  await expect(page.locator("#problem-0")).toBeFocused();
  await pause(page, 2500);
  await page.keyboard.press("Tab"); // the fix is the next stop
  await expect(page.locator("#fix-0")).toBeFocused();
  await pause(page, 2000);
  await page.keyboard.press("Enter");
  await expect(page.locator("#fixed-panel")).toBeFocused();
  await pause(page, 4000);
  await page.keyboard.press("Tab");
  await pause(page, 2500); // Approve and pay $40.62, now available — the take stops before PayPal
  await save(page, "1-signature-moment");
});

test("scene 2: cold open — the blocked order, problem focused", async ({ page }) => {
  test.setTimeout(120_000);
  await toBlockedReview(page, 0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator("#problem-0").focus();
  await pause(page, 6000);
  await save(page, "2-cold-open-blocked");
});

test("scene 3: cancel at PayPal → nothing charged, order kept", async ({ page }) => {
  test.setTimeout(150_000);
  await toBlockedReview(page, 0);
  await page.locator("#fix-0").click();
  await expect(page.locator("#fixed-panel")).toBeVisible();
  await pause(page, 1500);
  await Promise.all([page.waitForURL(/sandbox\.paypal\.com/, { timeout: 60_000, waitUntil: "commit" }), page.locator("#approve-button").click()]);
  const cancel = page.getByRole("link", { name: /Cancel and return/ });
  await cancel.waitFor({ timeout: 45_000 });
  await pause(page, 2500);
  await cancel.click();
  await page.waitForURL(/\/review/);
  await expect(page.locator(":focus")).toContainText(/cancelled at PayPal/i);
  await pause(page, 4000);
  await save(page, "3-cancel-nothing-charged");
});

test("scene 4: forced colours (high contrast)", async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ forcedColors: "active" });
  await toBlockedReview(page, 0);
  await pause(page, 4000);
  await save(page, "4-forced-colours");
});

test.describe("400% zoom", () => {
  // 320×200 CSS px rendered at 4× is what a 1280×800 window shows at 400% browser zoom. Video
  // records CSS pixels (a 320×200 clip), so this scene is captured as full-resolution 1280×800
  // screenshots of each real step instead; `video:assemble` turns them into a clip.
  test.use({ viewport: { width: 320, height: 200 }, deviceScaleFactor: 4 });
  test("scene 5: 400% zoom — the problem and the fix still reflow", async ({ page }) => {
    test.setTimeout(120_000);
    const dir = path.join(OUT, "5-zoom-400");
    mkdirSync(dir, { recursive: true });
    let n = 0;
    const shot = () => page.screenshot({ path: path.join(dir, `${String(++n).padStart(2, "0")}.png`) });
    await toBlockedReview(page, 0);
    await shot(); // the problem, focused
    await page.keyboard.press("Tab");
    await shot(); // the fix is the next stop
    await page.keyboard.press("Enter");
    await expect(page.locator("#fixed-panel")).toBeFocused();
    await shot(); // "Your order now matches"
    await page.keyboard.press("Tab");
    await shot(); // Approve, now available
  });
});
