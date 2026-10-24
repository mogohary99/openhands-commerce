import { expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { uuidv5 } from "../../lib/ids";

// Independent checks straight against PayPal Sandbox's Orders v2 API, shared by the
// automated buyer test and the manual (owner logs in at PayPal) purchase run.
export const SANDBOX = "https://api-m.sandbox.paypal.com";
export const EXPECTED = { value: "40.62", currency: "USD", shipping: "5.99", tax: "2.64" };

export async function paypalToken() {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const t = await fetch(`${SANDBOX}/v1/oauth2/token`, { method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
  return ((await t.json()) as { access_token: string }).access_token;
}

export async function paypalGetOrder(id: string) {
  const r = await fetch(`${SANDBOX}/v2/checkout/orders/${id}`, { headers: { Authorization: `Bearer ${await paypalToken()}` } });
  return { status: r.status, body: (await r.json()) as any };
}

// A capture request straight to PayPal, bypassing our app, to prove PayPal itself refuses a second capture.
export async function paypalCapture(id: string, requestId: string) {
  const r = await fetch(`${SANDBOX}/v2/checkout/orders/${id}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await paypalToken()}`, "Content-Type": "application/json", "PayPal-Request-Id": requestId },
  });
  return { status: r.status, body: (await r.json()) as any };
}

// Run once the browser is on the receipt after a real buyer approval. Verifies the capture
// with PayPal, then tries every way of charging twice, and writes the evidence file.
export async function verifyCapturedPurchase(page: Page, token: string, mode: "automated-buyer" | "manual-buyer") {
  await expect(page.locator("#receipt-title")).toHaveText(`Payment complete: $${EXPECTED.value}`);
  await expect(page.locator("#receipt-title")).toBeFocused();
  const captureId = (await page.locator("dt:has-text('PayPal capture ID') + dd").textContent())!.trim();

  // The receipt explains how the payment was verified.
  await expect(page.locator("#proof-title")).toHaveText("How this payment was checked");
  await expect(page.locator(".proof")).toContainText(`completed for $${EXPECTED.value} ${EXPECTED.currency}`);

  // Independent confirmation straight from PayPal's API.
  const o = await paypalGetOrder(token);
  expect(o.status).toBe(200);
  expect(o.body.status).toBe("COMPLETED");
  const unit = o.body.purchase_units[0];
  expect(unit.amount.currency_code).toBe(EXPECTED.currency);
  expect(unit.amount.value).toBe(EXPECTED.value);
  expect(unit.amount.breakdown.shipping.value).toBe(EXPECTED.shipping);
  expect(unit.amount.breakdown.tax_total.value).toBe(EXPECTED.tax);
  expect(unit.custom_id).toMatch(/^[0-9a-f]{64}$/);
  const caps = unit.payments.captures;
  expect(caps).toHaveLength(1);
  const cap = caps[0];
  expect(cap.status).toBe("COMPLETED");
  expect(cap.id).toBe(captureId);
  expect(cap.amount.currency_code).toBe(EXPECTED.currency);
  expect(cap.amount.value).toBe(EXPECTED.value);

  // Refreshing the receipt, replaying the return URL (with and without PayerID), and
  // approving again from the store must not capture a second time.
  await page.reload();
  await expect(page.locator("#receipt-title")).toHaveText(`Payment complete: $${EXPECTED.value}`);
  for (const q of [`token=${token}`, `token=${token}&PayerID=REPLAY`]) {
    await page.goto(`/checkout/return?${q}`);
    await page.waitForURL(/\/receipt\//);
    await expect(page.locator("#receipt-title")).toHaveText(`Payment complete: $${EXPECTED.value}`);
  }
  await page.goto("/review");
  await expect(page.locator("#review-title")).toHaveText("Your order is empty"); // purchased cart is closed

  // Repeating the capture at PayPal: the app's own request id returns the same capture
  // (idempotent replay); a fresh request id is refused as already captured.
  const replay = await paypalCapture(token, uuidv5(`capture:${token}`));
  expect([200, 201]).toContain(replay.status);
  expect(replay.body.purchase_units[0].payments.captures[0].id).toBe(captureId);
  const fresh = await paypalCapture(token, crypto.randomUUID());
  expect(fresh.status).toBe(422);
  expect(fresh.body.details?.[0]?.issue).toBe("ORDER_ALREADY_CAPTURED");

  const final = await paypalGetOrder(token);
  expect(final.body.status).toBe("COMPLETED");
  expect(final.body.purchase_units[0].payments.captures).toHaveLength(1);

  // Evidence for docs/qa-report.md: ids and statuses only, never credentials or tokens.
  // Written outside test-results/, which Playwright empties on every run.
  const evidence = {
    ranAt: new Date().toISOString(),
    mode,
    environment: "PayPal Sandbox (api-m.sandbox.paypal.com)",
    paypalOrderId: token,
    paypalOrderStatus: final.body.status,
    orderAmount: { value: unit.amount.value, currency: unit.amount.currency_code, shipping: unit.amount.breakdown.shipping.value, tax: unit.amount.breakdown.tax_total.value },
    captureId,
    captureStatus: cap.status,
    captureAmount: cap.amount,
    capturesAfterReplays: final.body.purchase_units[0].payments.captures.length,
    receiptReloadAndReturnReplays: "receipt unchanged, no second capture",
    sameRequestIdReplay: { status: replay.status, captureId: replay.body.purchase_units[0].payments.captures[0].id },
    freshRequestIdCapture: { status: fresh.status, issue: fresh.body.details?.[0]?.issue },
    debugIdOfFreshCapture: fresh.body.debug_id ?? null,
  };
  const dir = path.resolve("../docs/evidence");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `sandbox-purchase-${mode}.json`), JSON.stringify(evidence, null, 2) + "\n");
  return evidence;
}
