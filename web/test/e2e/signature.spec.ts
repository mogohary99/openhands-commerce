import { expect, test } from "@playwright/test";
import { activeId, chooseLightningByKeyboard, expectNoAxeViolations, searchByKeyboard } from "./helpers";

test("signature moment, keyboard only: incompatible cable is caught, payment blocked, fixed in one keystroke", async ({ page }) => {
  await searchByKeyboard(page);

  // The assistant's understanding is visible and editable.
  const card = page.locator("#shopping-for");
  await expect(card.locator("#budget")).toHaveValue("45.00");
  await expect(card.locator('input[name="connector"][value="USB-C"]')).toBeChecked();
  await expectNoAxeViolations(page, "results");

  await chooseLightningByKeyboard(page);

  // Focus lands on the problem, whose name and description carry the whole message.
  const problem = page.locator("#problem-0");
  await expect(problem).toBeFocused();
  await expect(problem.locator("h2")).toHaveText("The cable will not fit your phone");
  await expect(problem).toContainText("Lightning");
  await expect(problem).toHaveAttribute("aria-labelledby", "problem-0-title");
  await expect(page.locator("#approve-button")).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator("#pay-status")).toContainText("Payment is blocked");
  await expectNoAxeViolations(page, "review (blocked)");

  // "Approve anyway": nothing happens except an explanation and focus moving to the fix.
  await page.locator("#approve-button").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#fix-0")).toBeFocused();
  await expect(page.locator("#sr-status")).toHaveText(/Payment is blocked\. The cable will not fit your phone/);
  expect(page.url()).toMatch(/\/review$/);
  await expect(page.locator("#fix-0")).toHaveText("Switch to the USB-C cable bundle (same price)");

  // One keystroke fixes it.
  await page.keyboard.press("Enter");
  await expect(page.locator("#fixed-panel")).toBeFocused();
  await expect(page.locator("#fixed-panel")).toContainText("Your order now matches");
  await expect(page.locator("#fixed-panel")).toContainText("Total $40.62 — within your $45.00 budget.");
  await expect(page.locator("#problem-0")).toHaveCount(0);
  await expect(page.locator("#approve-button")).not.toHaveAttribute("aria-disabled", "true");
  await expect(page.locator("#approve-button")).toHaveText("Approve and pay $40.62 with PayPal");
  await expect(page.locator(".lines")).toContainText("White + 1 m USB-C to USB-C cable");
  await expectNoAxeViolations(page, "review (fixed)");
});

test("server refuses a blocked cart even if the client-side guard is bypassed", async ({ page }) => {
  await searchByKeyboard(page);
  await chooseLightningByKeyboard(page);
  // Remove the client guard and submit the form directly.
  await page.evaluate(() => {
    const b = document.getElementById("approve-button")!;
    b.removeAttribute("aria-disabled");
    const clone = b.cloneNode(true) as HTMLButtonElement; // drops React's click handler
    b.replaceWith(clone);
  });
  await page.locator("#approve-button").click();
  await page.waitForURL("**/review?notice=blocked");
  await expect(page.locator("#problem-0")).toBeVisible();
  await expect(page.locator("#review-notice")).toContainText("Nothing was charged");
  // Focus moves once the page has its title (FocusOnMount); wait for it as a shopper would.
  await expect(page.locator("#problem-0")).toBeFocused();
});

test("over-budget and quantity changes are re-verified on the server", async ({ page }) => {
  await searchByKeyboard(page);
  await page.locator("#opt-v-charger-30w-bundle-c").check();
  await page.getByRole("button", { name: /Add to order and review\W+VoltLine 30W/ }).click();
  await page.waitForURL("**/review");
  await expect(page.locator("#problem-0")).toHaveCount(0);
  await page.locator("#qty-0").selectOption("2");
  await page.getByRole("button", { name: /Update\s+quantity of VoltLine 30W/ }).click();
  await expect(page.locator("#problem-0 h2")).toHaveText("This is over your budget");
  await expect(page.locator("#problem-0")).toContainText("$75.25"); // 2 × 31.99 = 63.98, + 5.99 shipping + 5.28 tax
  await expect(page.locator("#approve-button")).toHaveAttribute("aria-disabled", "true");
});

test("prompt-injected customer review is shown as an unverified review, never as a price", async ({ page }) => {
  await searchByKeyboard(page);
  const card = page.locator("article", { hasText: "VoltLine 65W Dual-Port Charger" });
  await card.locator("summary").click();
  await expect(card).toContainText("Written by customers. Not checked by us");
  await expect(card).toContainText("$38.99");
  await expect(card.locator(".price")).not.toContainText("$5.00");
});
