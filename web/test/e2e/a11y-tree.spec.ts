import { expect, type Page, test } from "@playwright/test";
import { chooseLightningByKeyboard, expectNoAxeViolations, searchByKeyboard } from "./helpers";

// Reads Chrome's computed accessibility tree (what VoiceOver/NVDA/JAWS receive) via CDP.
// This is automated inspection, not a screen-reader test with a person.
async function ax(page: Page, selector: string) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("Accessibility.enable");
  const { result } = (await cdp.send("Runtime.evaluate", { expression: `document.querySelector(${JSON.stringify(selector)})` })) as { result: { objectId?: string } };
  if (!result.objectId) throw new Error(`no element for ${selector}`);
  const { node } = (await cdp.send("DOM.describeNode", { objectId: result.objectId })) as { node: { backendNodeId: number } };
  const { nodes } = (await cdp.send("Accessibility.getPartialAXTree", { backendNodeId: node.backendNodeId, fetchRelatives: false })) as {
    nodes: Array<{ role?: { value: string }; name?: { value: string }; description?: { value: string }; properties?: Array<{ name: string; value: { value: unknown } }> }>;
  };
  const n = nodes[0]!;
  const props = Object.fromEntries((n.properties ?? []).map((p) => [p.name, p.value.value]));
  await cdp.detach();
  return { role: n.role?.value, name: n.name?.value, description: n.description?.value ?? "", props };
}

test("what a screen reader gets at the signature moment", async ({ page }) => {
  await searchByKeyboard(page);
  await chooseLightningByKeyboard(page);

  const panel = await ax(page, "#problem-0");
  expect(panel.role).toBe("region");
  expect(panel.name).toBe("The cable will not fit your phone");
  expect(panel.description).toContain("This bundle includes a Lightning cable, but you said your phone uses USB-C");
  expect(panel.props.focused).toBe(true);

  const approve = await ax(page, "#approve-button");
  expect(approve.role).toBe("button");
  expect(approve.name).toBe("Approve and pay $40.62 with PayPal");
  expect(approve.props.disabled).toBe(true);
  expect(approve.description).toBe("Payment is blocked until the problem above is fixed.");

  const fix = await ax(page, "#fix-0");
  expect(fix.role).toBe("button");
  expect(fix.name).toBe("Switch to the USB-C cable bundle (same price)");

  // Tab order: the fix is the very next stop after the problem panel.
  await page.keyboard.press("Tab");
  await expect(page.locator("#fix-0")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#fixed-panel")).toBeFocused();

  const done = await ax(page, "#fixed-panel");
  expect(done.role).toBe("region");
  expect(done.name).toBe("Your order now matches");
  expect(done.description).toBe("Total $40.62 — within your $45.00 budget.");
  expect(done.props.focused).toBe(true);
  const ready = await ax(page, "#approve-button");
  expect(ready.props.disabled).toBeUndefined();
  expect(ready.description).toContain("you'll log in to PayPal Sandbox and confirm");
});

for (const [notice, text] of [
  ["cancelled", "You cancelled at PayPal. Nothing was charged."],
  ["declined", "PayPal couldn't use that payment method. Nothing was charged."],
  ["refused", "PayPal refused this payment. Nothing was charged."],
  ["expired", "That PayPal checkout expired before it was completed. Nothing was charged."],
  ["reapprove", "Something in your order changed after you approved it, so we did not take payment."],
] as const) {
  test(`recovery state "${notice}" is focused and says nothing was charged`, async ({ page }) => {
    await searchByKeyboard(page);
    await page.locator("#opt-v-charger-30w-bundle-c").check();
    await page.getByRole("button", { name: /Add to order and review\W+VoltLine 30W/ }).click();
    await page.waitForURL("**/review");
    await page.goto(`/review?notice=${notice}`);
    await expect(page.locator("#review-notice")).toBeFocused();
    await expect(page.locator("#review-notice")).toContainText(text);
    await expectNoAxeViolations(page, `review notice ${notice}`);
  });
}

test("unknown return token (replayed or forged callback) charges nothing and explains", async ({ page }) => {
  await page.goto("/");
  await page.goto("/checkout/return?token=9ZZ99999ZZ9999999&PayerID=X");
  await expect(page.locator("#page-notice")).toBeFocused();
  await expect(page.locator("#page-notice")).toContainText("we didn't take any payment");
});

test("forged quantity in the form is refused by the server", async ({ page }) => {
  await searchByKeyboard(page);
  await chooseLightningByKeyboard(page);
  await page.evaluate(() => {
    const opt = document.querySelector<HTMLOptionElement>("#qty-0 option[value='2']")!;
    opt.value = "999";
  });
  await page.locator("#qty-0").selectOption("999");
  await page.getByRole("button", { name: /Update\s+quantity/ }).click();
  await page.waitForURL("**/review?notice=fix_unavailable");
  await expect(page.locator("#qty-0")).toHaveValue("1");
});

test("400% zoom equivalent (320×256 CSS px): whole signature flow works without horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 256 });
  const noH = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await searchByKeyboard(page);
  await noH();
  await chooseLightningByKeyboard(page);
  await noH();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.locator("#fixed-panel")).toBeFocused();
  await noH();
  await expect(page.locator("#approve-button")).toBeVisible();
});

test("forced colors (Windows High Contrast): problem panel keeps a visible border and the fix button is visible", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await searchByKeyboard(page);
  await chooseLightningByKeyboard(page);
  const border = await page.locator("#problem-0").evaluate((el) => getComputedStyle(el).borderLeftWidth);
  expect(parseFloat(border)).toBeGreaterThanOrEqual(8);
  await expect(page.locator("#fix-0")).toBeVisible();
});
