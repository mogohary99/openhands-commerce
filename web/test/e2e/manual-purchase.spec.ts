import { test } from "@playwright/test";
import { reachApprovedQuote } from "./helpers";
import { verifyCapturedPurchase } from "./paypal-verify";

// MANUAL sandbox purchase: `npm run purchase:manual`. Chrome opens on its own temporary
// profile; the script drives the store to PayPal, then the owner logs in at PayPal Sandbox
// with the sandbox *personal* account and presses Pay. Nothing about the buyer is stored.
// After the redirect back, the same checks as the automated buyer test run against PayPal.
const enabled = process.env.MANUAL_PURCHASE === "1";
const hasKeys = Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);

test("manual buyer approval at PayPal Sandbox → capture verified with PayPal", async ({ page }) => {
  test.skip(!enabled, "manual run only: npm run purchase:manual");
  test.skip(!hasKeys, "PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not set (sandbox)");
  test.setTimeout(15 * 60_000);

  await reachApprovedQuote(page);
  await Promise.all([page.waitForURL(/sandbox\.paypal\.com/, { timeout: 45_000 }), page.locator("#approve-button").click()]);
  const token = new URL(page.url()).searchParams.get("token")!;
  console.log(`\nPayPal Sandbox order ${token} created for $40.62 USD.\n` +
    "In the Chrome window: log in with the SANDBOX PERSONAL account (…@personal.example.com), then press Pay / Complete Purchase.\n" +
    "Never use your real PayPal login. Waiting up to 10 minutes…\n");

  await page.waitForURL(/localhost:3100\/receipt\//, { timeout: 10 * 60_000 });
  const evidence = await verifyCapturedPurchase(page, token, "manual-buyer");
  console.log(`\nVERIFIED with PayPal: order ${evidence.paypalOrderId} ${evidence.paypalOrderStatus}, capture ${evidence.captureId} ` +
    `${evidence.captureStatus} ${evidence.captureAmount.value} ${evidence.captureAmount.currency_code}, captures after replays: ${evidence.capturesAfterReplays}.\n` +
    "Evidence: docs/evidence/sandbox-purchase-manual-buyer.json\n");
});
