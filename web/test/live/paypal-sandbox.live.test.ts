import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { handleWebhook } from "../../lib/checkout";
import { orderBodyFromQuote, createPayPalClient, PayPalError, approvalLink } from "../../lib/paypal";
import { Store } from "../../lib/store";
import { verifyCart } from "../../lib/verify";
import { loadTestCatalog } from "../unit/helpers";

// LIVE: our production PayPal client against api-m.sandbox.paypal.com. No mocks of PayPal.
// Failure responses are produced by PayPal's own negative-testing header
// (PayPal-Mock-Response), which this file adds only to the requests that ask for it.
const keys = { clientId: process.env.PAYPAL_CLIENT_ID ?? "", clientSecret: process.env.PAYPAL_CLIENT_SECRET ?? "" };
const skip = !keys.clientId || !keys.clientSecret ? "PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not set (sandbox)" : false;

let mock: string | null = null;
const sent: Array<{ url: string; requestId: string | null }> = [];
const fetchWithMock: typeof fetch = (input, init) => {
  const headers = { ...(init?.headers as Record<string, string>) };
  if (mock && String(input).includes("/v2/")) headers["PayPal-Mock-Response"] = JSON.stringify({ mock_application_codes: mock });
  sent.push({ url: String(input), requestId: headers["PayPal-Request-Id"] ?? null });
  return fetch(input, { ...init, headers });
};
const paypal = createPayPalClient({ ...keys, fetchImpl: fetchWithMock, retries: 2 });

const catalog = loadTestCatalog();
const v = verifyCart(catalog, [{ variantId: "v-charger-30w-bundle-c", quantity: 1 }], { budgetCents: 4500, deviceConnector: "USB-C" });
const body = (invoiceId = `ohc-live-${randomUUID()}`) =>
  orderBodyFromQuote(v.quote, { quoteHash: v.quoteHash, invoiceId, returnUrl: "http://localhost:3000/checkout/return", cancelUrl: "http://localhost:3000/checkout/cancel" });
const issueOf = (e: unknown) => (e instanceof PayPalError ? `${e.status} ${e.issue}` : String(e));

test("LIVE: create order from verified quote; same PayPal-Request-Id returns the same order", { skip }, async () => {
  const rid = randomUUID();
  const b = body();
  const a = await paypal.createOrder(b, rid);
  assert.ok(a.status === 200 || a.status === 201, `HTTP ${a.status}`);
  assert.equal(a.body.purchase_units?.[0]?.amount?.value, "40.62");
  assert.equal(a.body.purchase_units?.[0]?.custom_id, v.quoteHash);
  assert.match(approvalLink(a.body) ?? "", /^https:\/\/www\.sandbox\.paypal\.com\/checkoutnow\?token=/);
  const replay = await paypal.createOrder(b, rid);
  assert.equal(replay.body.id, a.body.id);
  console.log(`# order ${a.body.id} status ${a.body.status} debug ${a.debugId}`);
});

test("LIVE: capture before buyer approval is refused (ORDER_NOT_APPROVED)", { skip }, async () => {
  const o = await paypal.createOrder(body(), randomUUID());
  await assert.rejects(paypal.captureOrder(o.body.id, randomUUID()), (e) => issueOf(e) === "422 ORDER_NOT_APPROVED");
});

for (const code of ["INSTRUMENT_DECLINED", "TRANSACTION_REFUSED", "MAX_NUMBER_OF_PAYMENT_ATTEMPTS_EXCEEDED", "PAYER_ACTION_REQUIRED"]) {
  test(`LIVE negative test: capture → 422 ${code} is parsed into PayPalError`, { skip }, async () => {
    const o = await paypal.createOrder(body(), randomUUID());
    mock = code;
    try {
      await assert.rejects(paypal.captureOrder(o.body.id, randomUUID()), (e) => issueOf(e) === `422 ${code}` && (e as PayPalError).debugId !== null);
    } finally {
      mock = null;
    }
  });
}

test("LIVE negative test: capture → 500 is retried with the identical PayPal-Request-Id, then surfaced as 500", { skip }, async () => {
  const o = await paypal.createOrder(body(), randomUUID());
  const rid = randomUUID();
  mock = "INTERNAL_SERVER_ERROR";
  sent.length = 0;
  try {
    await assert.rejects(paypal.captureOrder(o.body.id, rid), (e) => e instanceof PayPalError && e.status === 500);
  } finally {
    mock = null;
  }
  const captures = sent.filter((s) => s.url.endsWith("/capture"));
  assert.equal(captures.length, 3);
  assert.ok(captures.every((c) => c.requestId === rid));
});

test("LIVE: tampered line quantity is rejected by PayPal (ITEM_TOTAL_MISMATCH)", { skip }, async () => {
  const b = body();
  b.purchase_units[0]!.items[0]!.quantity = "2";
  await assert.rejects(paypal.createOrder(b, randomUUID()), (e) => issueOf(e) === "422 ITEM_TOTAL_MISMATCH");
});

test("LIVE: currency switched to EUR is rejected by PayPal (MULTI_CURRENCY_ORDER)", { skip }, async () => {
  const b = body();
  b.purchase_units[0]!.amount.currency_code = "EUR";
  await assert.rejects(paypal.createOrder(b, randomUUID()), (e) => issueOf(e) === "422 MULTI_CURRENCY_ORDER");
});

test("LIVE: unknown/expired order id → 404 INVALID_RESOURCE_ID", { skip }, async () => {
  await assert.rejects(paypal.getOrder("0ABCDEF123456789X"), (e) => issueOf(e) === "404 INVALID_RESOURCE_ID");
});

test("LIVE: forged webhook is rejected — PayPal's verify API refuses it and we return 400", { skip }, async () => {
  const deps = { store: new Store(":memory:"), catalog, paypal, baseUrl: "http://localhost:3000" };
  const raw = JSON.stringify({ id: "WH-FORGED-1", event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { supplementary_data: { related_ids: { order_id: "X" } } } });
  const out = await handleWebhook(
    deps,
    raw,
    { authAlgo: "SHA256withRSA", certUrl: "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-fake", transmissionId: randomUUID(), transmissionSig: "forged", transmissionTime: new Date().toISOString() },
    "1AB23456CD789012E",
  );
  assert.equal(out.status, 400);
  assert.equal(deps.store.recordWebhookEvent("WH-FORGED-1", "x", null), true, "forged event must not have been recorded");
});
