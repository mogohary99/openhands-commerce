import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { expectNoAxeViolations, searchByKeyboard } from "./helpers";

// Receipt states rendered from FIXTURE order rows (see fixtures/seed-receipt.ts), so the
// receipt can be checked without a PayPal capture. This verifies our page only; it says
// nothing about whether a real capture works (that's live-paypal / manual-purchase).
function seed(sessionId: string, state: string) {
  return execFileSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "test/e2e/fixtures/seed-receipt.ts", ".data/e2e.sqlite", sessionId, state], { encoding: "utf8" }).trim();
}

const CASES = [
  { state: "COMPLETED", title: "Payment complete: $40.62" },
  { state: "PENDING", title: "Payment pending — not paid yet" },
  { state: "CAPTURE_UNKNOWN", title: "We're confirming your payment with PayPal" },
  { state: "FAILED", title: "This order is not paid" },
] as const;

for (const c of CASES) {
  test(`receipt (${c.state}, fixture): title focused, says whether you paid, axe clean light and dark`, async ({ page, context }) => {
    await searchByKeyboard(page); // creates the session cookie
    const sid = (await context.cookies()).find((k) => k.name === "ohc_sid")!.value;
    const id = seed(sid, c.state);
    await page.goto(`/receipt/${id}`);
    await expect(page.locator("#receipt-title")).toBeFocused();
    await expect(page.locator("#receipt-title")).toHaveText(c.title);
    expect(await page.title()).toContain("Receipt");
    await expect(page.locator('[aria-current="step"]')).toHaveCount(1);
    await expectNoAxeViolations(page, `receipt ${c.state} (light)`);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.reload(); // let the 150 ms button colour transitions settle; axe samples computed colours
    await expect(page.locator("#receipt-title")).toBeFocused();
    await expectNoAxeViolations(page, `receipt ${c.state} (dark)`);
  });
}

test("a receipt is only shown to the session that owns it", async ({ page, context, browser }) => {
  await searchByKeyboard(page);
  const sid = (await context.cookies()).find((k) => k.name === "ohc_sid")!.value;
  const id = seed(sid, "COMPLETED");
  const other = await browser.newContext({ baseURL: "http://localhost:3100" });
  const p2 = await other.newPage();
  const r = await p2.goto(`/receipt/${id}`);
  expect(r!.status()).toBe(404);
  await expect(p2.locator("body")).not.toContainText("FIXTURECAPTURE");
  await other.close();
});

test("receipt (COMPLETED, fixture) at 400% zoom equivalent and in forced colors: ids wrap, no horizontal scrolling", async ({ page, context }) => {
  await searchByKeyboard(page);
  const sid = (await context.cookies()).find((k) => k.name === "ohc_sid")!.value;
  const id = seed(sid, "COMPLETED");
  await page.setViewportSize({ width: 320, height: 256 });
  for (const forcedColors of ["none", "active"] as const) {
    await page.emulateMedia({ forcedColors });
    await page.goto(`/receipt/${id}`);
    await expect(page.locator("#receipt-title")).toBeFocused();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `horizontal overflow (forced colors ${forcedColors})`).toBeLessThanOrEqual(0);
    await expect(page.locator("dt:has-text('PayPal capture ID') + dd")).toBeVisible();
  }
});
