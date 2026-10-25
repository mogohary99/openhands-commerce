import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { beginPayment, type CheckoutDeps, completePayment, handleWebhook, reconcile, STALE_CAPTURE_LOCK_MS, verifySessionCart } from "../../lib/checkout";
import { Store } from "../../lib/store";
import { FakePayPal, loadTestCatalog } from "./helpers";

// Regression tests for failure modes found or confirmed against the live PayPal sandbox
// on 2026-10-23 (PayPal-Mock-Response negative testing). Error shapes match the real ones.

const SID = "s-fail";
let paypal: FakePayPal;
let deps: CheckoutDeps;
let clock = Date.parse("2026-10-23T12:00:00Z");

beforeEach(() => {
  paypal = new FakePayPal();
  const store = new Store(":memory:", () => new Date(clock));
  deps = { store, catalog: loadTestCatalog(), paypal, baseUrl: "http://localhost:3000", now: () => new Date(clock) };
  store.saveShopping(SID, "demo", { category: "chargers", budgetCents: 4500, deviceConnector: "USB-C", voiceLanguage: null, wantsCable: true }, "rules");
  const cart = store.getOrCreateOpenCart(SID);
  store.saveCartLines(cart.id, [{ variantId: "v-charger-30w-bundle-c", quantity: 1, quotedPriceCents: 3199 }]);
});

async function approvedOrder() {
  const r = await beginPayment(deps, SID, verifySessionCart(deps, SID).quoteHash);
  assert.ok(r.kind === "redirect");
  const ppId = deps.store.getOrder(r.orderId)!.paypalOrderId!;
  paypal.approve(ppId);
  return { orderId: r.orderId, ppId };
}

for (const issue of ["TRANSACTION_REFUSED", "MAX_NUMBER_OF_PAYMENT_ATTEMPTS_EXCEEDED", "COMPLIANCE_VIOLATION"]) {
  test(`${issue} (422) → refused, nothing paid, next approval starts a new PayPal order`, async () => {
    const { orderId, ppId } = await approvedOrder();
    paypal.captureError = { status: 422, issue };
    assert.equal((await completePayment(deps, SID, ppId)).kind, "refused");
    assert.equal(deps.store.getOrder(orderId)!.state, "FAILED");
    paypal.captureError = null;
    const again = await beginPayment(deps, SID, verifySessionCart(deps, SID).quoteHash);
    assert.ok(again.kind === "redirect" && again.orderId !== orderId);
    assert.equal(paypal.orders.size, 2);
  });
}

// Seen live on 2026-10-25: a real sandbox buyer approved, and capture returned 422
// COMPLIANCE_VIOLATION (orders 3EW601627R616202L, 91U83791YC987840L; PayPal shows 0 captures).
// It used to fall through to the generic "PayPal couldn't start the payment… try again" notice.
test("COMPLIANCE_VIOLATION: replaying the return URL afterwards still says refused, and captures nothing more", async () => {
  const { orderId, ppId } = await approvedOrder();
  paypal.captureError = { status: 422, issue: "COMPLIANCE_VIOLATION" };
  assert.equal((await completePayment(deps, SID, ppId)).kind, "refused");
  const captures = paypal.calls.filter((c) => c.op === "capture").length;
  assert.equal((await completePayment(deps, SID, ppId)).kind, "refused");
  assert.equal(paypal.calls.filter((c) => c.op === "capture").length, captures);
  assert.equal(deps.store.getOrder(orderId)!.statusReason, "COMPLIANCE_VIOLATION");
});

test("HTTP 500 on capture → CAPTURE_UNKNOWN (not FAILED); reconcile captures once with the same request id", async () => {
  const { orderId, ppId } = await approvedOrder();
  paypal.captureError = { status: 500, issue: "INTERNAL_SERVER_ERROR" };
  assert.equal((await completePayment(deps, SID, ppId)).kind, "unknown");
  assert.equal(deps.store.getOrder(orderId)!.state, "CAPTURE_UNKNOWN");
  paypal.captureError = null;
  assert.equal((await reconcile(deps, orderId)).kind, "completed");
  const ids = paypal.calls.filter((c) => c.op === "capture").map((c) => c.requestId);
  assert.equal(new Set(ids).size, 1);
});

test("PayPal no longer knows the order (404 INVALID_RESOURCE_ID) → expired; a fresh approval creates a new order", async () => {
  const { orderId, ppId } = await approvedOrder();
  paypal.getError = { status: 404, issue: "INVALID_RESOURCE_ID" };
  assert.equal((await completePayment(deps, SID, ppId)).kind, "expired");
  assert.equal(deps.store.getOrder(orderId)!.statusReason, "PAYPAL_ORDER_EXPIRED");
  paypal.getError = null;
  const again = await beginPayment(deps, SID, verifySessionCart(deps, SID).quoteHash);
  assert.ok(again.kind === "redirect" && again.orderId !== orderId);
});

test("unexpected currency at PayPal → mismatch, no capture", async () => {
  paypal.tamperCurrency = "EUR";
  const { ppId } = await approvedOrder();
  assert.equal((await completePayment(deps, SID, ppId)).kind, "mismatch");
  assert.equal(paypal.count("capture"), 0);
});

test("a capture lock left by a crashed process is recovered after the stale window, without double capture", async () => {
  const { orderId, ppId } = await approvedOrder();
  assert.ok(deps.store.transition(orderId, ["PAYPAL_CREATED"], "CAPTURING")); // simulate crash mid-capture
  assert.equal((await completePayment(deps, SID, ppId)).kind, "in_progress"); // fresh lock is respected
  clock += STALE_CAPTURE_LOCK_MS + 1000;
  assert.equal((await completePayment(deps, SID, ppId)).kind, "completed");
  assert.equal(paypal.count("capture"), 1);
  assert.ok(deps.store.auditFor(orderId).some((a) => a.event === "capture.stale_lock_recovered"));
});

test("catalog price change between review and approval blocks the approval", async () => {
  const shownHash = verifySessionCart(deps, SID).quoteHash;
  deps.catalog.products[0]!.variants[1]!.priceCents = 3599;
  try {
    assert.equal((await beginPayment(deps, SID, shownHash)).kind, "blocked"); // PRICE_CHANGED vs the price the shopper chose
    assert.equal(paypal.count("create"), 0);
  } finally {
    deps.catalog.products[0]!.variants[1]!.priceCents = 3199;
  }
});

test("forged quantity is refused before PayPal is called", async () => {
  const cart = deps.store.getOpenCart(SID)!;
  deps.store.saveCartLines(cart.id, [{ variantId: "v-charger-30w-bundle-c", quantity: 999, quotedPriceCents: 3199 }]);
  assert.equal((await beginPayment(deps, SID, verifySessionCart(deps, SID).quoteHash)).kind, "blocked");
  assert.equal(paypal.count("create"), 0);
});

const H = { authAlgo: "SHA256withRSA", certUrl: "https://api.sandbox.paypal.com/cert", transmissionId: "t", transmissionSig: "s", transmissionTime: "2026-10-23T00:00:00Z" };
const evt = JSON.stringify({ id: "WH-9", event_type: "PAYMENT.CAPTURE.COMPLETED", resource: {} });

test("webhook: PayPal rejecting the verification request (400, as seen live) is a rejection, not a retryable 502", async () => {
  paypal.webhookValid = "paypal_400";
  assert.equal((await handleWebhook(deps, evt, H, "WHID")).status, 400);
});

test("webhook: PayPal unreachable during verification → 502 so PayPal retries; event not recorded", async () => {
  paypal.webhookValid = "unreachable";
  assert.equal((await handleWebhook(deps, evt, H, "WHID")).status, 502);
  paypal.webhookValid = true;
  assert.equal((await handleWebhook(deps, evt, H, "WHID")).message, "OK"); // the retry is processed, not treated as a duplicate
});
