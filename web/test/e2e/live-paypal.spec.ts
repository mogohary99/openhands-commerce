import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { uuidv5 } from "../../lib/ids";
import { chooseLightningByKeyboard, searchByKeyboard } from "./helpers";

// LIVE tests against PayPal Sandbox. They create real sandbox orders (test money only)
// and are skipped, with the reason printed, when credentials are absent.
const hasKeys = Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
const buyer = { email: process.env.PAYPAL_SANDBOX_BUYER_EMAIL, password: process.env.PAYPAL_SANDBOX_BUYER_PASSWORD };
const SANDBOX = "https://api-m.sandbox.paypal.com";

async function paypalToken() {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const t = await fetch(`${SANDBOX}/v1/oauth2/token`, { method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
  return ((await t.json()) as { access_token: string }).access_token;
}

async function paypalGetOrder(id: string) {
  const r = await fetch(`${SANDBOX}/v2/checkout/orders/${id}`, { headers: { Authorization: `Bearer ${await paypalToken()}` } });
  return { status: r.status, body: (await r.json()) as any };
}

// A capture request straight to PayPal, bypassing our app, to prove PayPal itself refuses a second capture.
async function paypalCapture(id: string, requestId: string) {
  const r = await fetch(`${SANDBOX}/v2/checkout/orders/${id}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await paypalToken()}`, "Content-Type": "application/json", "PayPal-Request-Id": requestId },
  });
  return { status: r.status, body: (await r.json()) as any };
}

async function reachApprovedQuote(page: import("@playwright/test").Page) {
  await searchByKeyboard(page);
  await chooseLightningByKeyboard(page);
  await page.locator("#fix-0").click();
  await expect(page.locator("#fixed-panel")).toBeVisible();
}

test.describe("LIVE PayPal Sandbox", () => {
  test.skip(!hasKeys, "PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not set (sandbox)");

  test("approve creates one real sandbox order from the server quote; double click reuses it; cancel charges nothing", async ({ page }) => {
    await reachApprovedQuote(page);
    const approve = page.locator("#approve-button");
    // Double click: both submissions must land on the same PayPal order.
    await Promise.all([page.waitForURL(/sandbox\.paypal\.com/, { timeout: 45_000 }), approve.dblclick()]);
    const token = new URL(page.url()).searchParams.get("token")!;
    expect(token).toMatch(/^[A-Z0-9]{10,40}$/);
    test.info().annotations.push({ type: "paypal-order", description: token });

    const o = await paypalGetOrder(token);
    expect(o.status).toBe(200);
    expect(["CREATED", "PAYER_ACTION_REQUIRED"]).toContain(o.body.status);
    expect(o.body.purchase_units[0].amount.value).toBe("40.62");
    expect(o.body.purchase_units[0].amount.breakdown.shipping.value).toBe("5.99");
    expect(o.body.purchase_units[0].amount.breakdown.tax_total.value).toBe("2.64");
    expect(o.body.purchase_units[0].custom_id).toMatch(/^[0-9a-f]{64}$/);

    // Approving again from the store reuses the same PayPal order.
    await page.goto("/review");
    await Promise.all([page.waitForURL(/sandbox\.paypal\.com/, { timeout: 45_000 }), page.locator("#approve-button").click()]);
    expect(new URL(page.url()).searchParams.get("token")).toBe(token);

    // Shopper cancels at PayPal → back to the store, nothing charged, cart kept.
    await page.goto(`/checkout/cancel?token=${token}`);
    await expect(page.locator("#review-notice")).toContainText("You cancelled at PayPal. Nothing was charged.");
    await expect(page.locator("#review-notice")).toBeFocused();

    // Returning to the success URL without approving at PayPal must not capture.
    await page.goto(`/checkout/return?token=${token}&PayerID=FAKE`);
    await expect(page.locator("#review-notice")).toContainText("PayPal hasn't confirmed your approval");
    const after = await paypalGetOrder(token);
    expect(after.body.purchase_units[0].payments?.captures ?? []).toHaveLength(0);
  });

  test("full purchase as the sandbox buyer → verified receipt", async ({ page }) => {
    test.skip(!buyer.email || !buyer.password, "PAYPAL_SANDBOX_BUYER_EMAIL / PAYPAL_SANDBOX_BUYER_PASSWORD not set (sandbox personal account)");
    test.setTimeout(240_000);
    await reachApprovedQuote(page);
    await Promise.all([page.waitForURL(/sandbox\.paypal\.com/, { timeout: 45_000 }), page.locator("#approve-button").click()]);
    const token = new URL(page.url()).searchParams.get("token")!;

    // PayPal's hosted sandbox login. Selectors are PayPal's, not ours.
    const email = page.locator("#email");
    await email.waitFor({ timeout: 60_000 });
    await email.fill(buyer.email!);
    if (await page.locator("#btnNext").isVisible().catch(() => false)) await page.locator("#btnNext").click();
    await page.locator("#password").fill(buyer.password!);
    await page.locator("#btnLogin").click();
    const pay = page.locator('#payment-submit-btn, [data-testid="submit-button-initial"], button:has-text("Complete Purchase"), button:has-text("Pay Now")').first();
    await pay.waitFor({ timeout: 90_000 });
    await pay.click();

    await page.waitForURL(/localhost:3100\/receipt\//, { timeout: 90_000 });
    await expect(page.locator("#receipt-title")).toHaveText("Payment complete: $40.62");
    await expect(page.locator("#receipt-title")).toBeFocused();
    const captureId = (await page.locator("dt:has-text('PayPal capture ID') + dd").textContent())!.trim();
    test.info().annotations.push({ type: "paypal-order", description: token }, { type: "paypal-capture", description: captureId });

    // The receipt explains how the payment was verified.
    await expect(page.locator("#proof-title")).toHaveText("How this payment was checked");
    await expect(page.locator(".proof")).toContainText("completed for $40.62 USD");

    // Independent confirmation straight from PayPal's API.
    const o = await paypalGetOrder(token);
    expect(o.status).toBe(200);
    expect(o.body.status).toBe("COMPLETED");
    const caps = o.body.purchase_units[0].payments.captures;
    expect(caps).toHaveLength(1);
    const cap = caps[0];
    expect(cap.status).toBe("COMPLETED");
    expect(cap.id).toBe(captureId);
    expect(cap.amount.currency_code).toBe("USD");
    expect(cap.amount.value).toBe("40.62");
    expect(o.body.purchase_units[0].custom_id).toMatch(/^[0-9a-f]{64}$/);

    // Refreshing the receipt, replaying the return URL (with and without PayerID), and
    // approving again from the store must not capture a second time.
    await page.reload();
    await expect(page.locator("#receipt-title")).toHaveText("Payment complete: $40.62");
    for (const q of [`token=${token}`, `token=${token}&PayerID=REPLAY`]) {
      await page.goto(`/checkout/return?${q}`);
      await page.waitForURL(/\/receipt\//);
      await expect(page.locator("#receipt-title")).toHaveText("Payment complete: $40.62");
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
    expect(final.body.purchase_units[0].payments.captures).toHaveLength(1);

    // Evidence for docs/qa-report.md: ids and statuses only, never credentials or tokens.
    mkdirSync("test-results", { recursive: true });
    writeFileSync(
      "test-results/live-purchase.json",
      JSON.stringify(
        {
          ranAt: new Date().toISOString(),
          paypalOrderId: token,
          paypalOrderStatus: final.body.status,
          captureId,
          captureStatus: cap.status,
          amount: cap.amount,
          capturesAfterReplays: final.body.purchase_units[0].payments.captures.length,
          sameRequestIdReplay: { status: replay.status, captureId: replay.body.purchase_units[0].payments.captures[0].id },
          freshRequestIdCapture: { status: fresh.status, issue: fresh.body.details?.[0]?.issue },
          debugIdOfFreshCapture: fresh.body.debug_id ?? null,
        },
        null,
        2,
      ),
    );
  });
});
