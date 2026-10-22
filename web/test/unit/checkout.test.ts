import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { beginPayment, cancelPayment, type CheckoutDeps, completePayment, handleWebhook, reconcile, verifySessionCart } from "../../lib/checkout";
import { Store } from "../../lib/store";
import { FakePayPal, loadTestCatalog } from "./helpers";

const SID = "session-a";
const demoFor = { category: "chargers" as const, budgetCents: 4500, deviceConnector: "USB-C" as const, voiceLanguage: null, wantsCable: true };
let paypal: FakePayPal;
let deps: CheckoutDeps;

function setup(variantId = "v-charger-30w-bundle-c") {
  paypal = new FakePayPal();
  const store = new Store(":memory:");
  deps = { store, catalog: loadTestCatalog(), paypal, baseUrl: "http://localhost:3000" };
  store.saveShopping(SID, "demo", demoFor, "rules");
  const cart = store.getOrCreateOpenCart(SID);
  store.saveCartLines(cart.id, [{ variantId, quantity: 1, quotedPriceCents: 3199 }]);
  return cart;
}
const hash = () => verifySessionCart(deps, SID).quoteHash;

beforeEach(() => setup());

test("blocked cart (Lightning bundle for USB-C phone) never reaches PayPal", async () => {
  setup("v-charger-30w-bundle-l");
  const r = await beginPayment(deps, SID, hash());
  assert.equal(r.kind, "blocked");
  assert.equal(paypal.calls.length, 0);
});

test("approval bound to the quote: a stale hash is refused", async () => {
  const r = await beginPayment(deps, SID, "0".repeat(64));
  assert.equal(r.kind, "changed");
  assert.equal(paypal.calls.length, 0);
});

test("order body comes only from the server quote, with breakdown that sums", async () => {
  const r = await beginPayment(deps, SID, hash());
  assert.equal(r.kind, "redirect");
  const body = [...paypal.orders.values()][0]!._body;
  const pu = body.purchase_units[0];
  assert.equal(pu.amount.value, "40.62");
  assert.deepEqual(pu.amount.breakdown, {
    item_total: { currency_code: "USD", value: "31.99" },
    shipping: { currency_code: "USD", value: "5.99" },
    tax_total: { currency_code: "USD", value: "2.64" },
  });
  assert.equal(pu.custom_id, hash());
  assert.equal(body.payment_source.paypal.experience_context.return_url, "http://localhost:3000/checkout/return");
  assert.equal(body.payment_source.paypal.experience_context.cancel_url, "http://localhost:3000/checkout/cancel");
});

test("double click: concurrent approvals create exactly one PayPal order", async () => {
  const h = hash();
  const [a, b, c] = await Promise.all([beginPayment(deps, SID, h), beginPayment(deps, SID, h), beginPayment(deps, SID, h)]);
  assert.equal(paypal.orders.size, 1);
  assert.ok(a.kind === "redirect" && b.kind === "redirect" && c.kind === "redirect");
  assert.equal(a.url, b.url);
  assert.equal(new Set(paypal.calls.filter((x) => x.op === "create").map((x) => x.requestId)).size, 1);
  // A later click reuses the stored approval link without calling PayPal again.
  const before = paypal.count("create");
  const again = await beginPayment(deps, SID, h);
  assert.equal(again.kind, "redirect");
  assert.equal(paypal.count("create"), before);
});

test("happy path: approve at PayPal → capture → COMPLETED with verified amount; cart closed", async () => {
  const r = await beginPayment(deps, SID, hash());
  assert.ok(r.kind === "redirect");
  const ppId = deps.store.getOrder(r.orderId)!.paypalOrderId!;
  paypal.approve(ppId);
  const c = await completePayment(deps, SID, ppId);
  assert.equal(c.kind, "completed");
  const row = deps.store.getOrder(r.orderId)!;
  assert.equal(row.state, "COMPLETED");
  assert.equal(row.captureAmountCents, 4062);
  assert.equal(row.captureId, `CAP-${ppId}`);
  assert.equal(deps.store.getOpenCart(SID), null);
  // Returning to the same URL again (refresh, back button) does not capture twice.
  const again = await completePayment(deps, SID, ppId);
  assert.equal(again.kind, "completed");
  assert.equal(paypal.count("capture"), 1);
});

test("capture is refused if the shopper has not approved at PayPal", async () => {
  const r = await beginPayment(deps, SID, hash());
  assert.ok(r.kind === "redirect");
  const ppId = deps.store.getOrder(r.orderId)!.paypalOrderId!;
  const c = await completePayment(deps, SID, ppId);
  assert.equal(c.kind, "not_approved");
  assert.equal(paypal.count("capture"), 0);
  assert.equal(deps.store.getOrder(r.orderId)!.state, "PAYPAL_CREATED");
});

test("another session cannot capture someone else's order", async () => {
  const r = await beginPayment(deps, SID, hash());
  assert.ok(r.kind === "redirect");
  const ppId = deps.store.getOrder(r.orderId)!.paypalOrderId!;
  paypal.approve(ppId);
  assert.equal((await completePayment(deps, "session-evil", ppId)).kind, "not_found");
  assert.equal(paypal.count("capture"), 0);
});

test("amount at PayPal differs from approved quote → no capture", async () => {
  const r = await beginPayment(deps, SID, hash());
  assert.ok(r.kind === "redirect");
  const ppId = deps.store.getOrder(r.orderId)!.paypalOrderId!;
  paypal.tamperAmount = "1.00";
  paypal.approve(ppId);
  assert.equal((await completePayment(deps, SID, ppId)).kind, "mismatch");
  assert.equal(paypal.count("capture"), 0);
});

test("catalog price change after approval → needs re-approval, no capture", async () => {
  const r = await beginPayment(deps, SID, hash());
  assert.ok(r.kind === "redirect");
  const ppId = deps.store.getOrder(r.orderId)!.paypalOrderId!;
  paypal.approve(ppId);
  deps.catalog.products[0]!.variants[1]!.priceCents = 3599; // the bundle-c variant
  assert.equal((await completePayment(deps, SID, ppId)).kind, "needs_reapproval");
  assert.equal(paypal.count("capture"), 0);
  deps.catalog.products[0]!.variants[1]!.priceCents = 3199;
});

test("INSTRUMENT_DECLINED → DECLINED with a retry link; nothing recorded as paid", async () => {
  const r = await beginPayment(deps, SID, hash());
  assert.ok(r.kind === "redirect");
  const ppId = deps.store.getOrder(r.orderId)!.paypalOrderId!;
  paypal.approve(ppId);
  paypal.captureBehavior = "declined_422";
  const c = await completePayment(deps, SID, ppId);
  assert.equal(c.kind, "declined");
  assert.ok(c.kind === "declined" && c.retryUrl?.includes(ppId));
  assert.equal(deps.store.getOrder(r.orderId)!.state, "DECLINED");
  assert.ok(deps.store.getOpenCart(SID), "cart is kept");
  // Shopper picks another funding source at PayPal and comes back: capture succeeds.
  paypal.captureBehavior = "complete";
  assert.equal((await completePayment(deps, SID, ppId)).kind, "completed");
});

test("PENDING capture is not shown as paid; webhook-triggered reconcile can complete it", async () => {
  const r = await beginPayment(deps, SID, hash());
  assert.ok(r.kind === "redirect");
  const ppId = deps.store.getOrder(r.orderId)!.paypalOrderId!;
  paypal.approve(ppId);
  paypal.captureBehavior = "pending";
  assert.equal((await completePayment(deps, SID, ppId)).kind, "pending");
  assert.equal(deps.store.getOrder(r.orderId)!.state, "PENDING");
  paypal.orders.get(ppId)!.purchase_units![0]!.payments!.captures![0]!.status = "COMPLETED";
  assert.equal((await reconcile(deps, r.orderId)).kind, "completed");
});

test("capture DECLINED status in a 201 response is treated as declined", async () => {
  const r = await beginPayment(deps, SID, hash());
  assert.ok(r.kind === "redirect");
  const ppId = deps.store.getOrder(r.orderId)!.paypalOrderId!;
  paypal.approve(ppId);
  paypal.captureBehavior = "capture_declined";
  assert.equal((await completePayment(deps, SID, ppId)).kind, "declined");
});

test("network failure during capture → CAPTURE_UNKNOWN; reconcile retries with the same request id", async () => {
  const r = await beginPayment(deps, SID, hash());
  assert.ok(r.kind === "redirect");
  const ppId = deps.store.getOrder(r.orderId)!.paypalOrderId!;
  paypal.approve(ppId);
  paypal.captureBehavior = "unreachable";
  assert.equal((await completePayment(deps, SID, ppId)).kind, "unknown");
  assert.equal(deps.store.getOrder(r.orderId)!.state, "CAPTURE_UNKNOWN");
  paypal.captureBehavior = "complete";
  assert.equal((await reconcile(deps, r.orderId)).kind, "completed");
  const ids = paypal.calls.filter((c) => c.op === "capture").map((c) => c.requestId);
  assert.equal(new Set(ids).size, 1);
});

test("concurrent returns from PayPal capture once", async () => {
  const r = await beginPayment(deps, SID, hash());
  assert.ok(r.kind === "redirect");
  const ppId = deps.store.getOrder(r.orderId)!.paypalOrderId!;
  paypal.approve(ppId);
  const results = await Promise.all([completePayment(deps, SID, ppId), completePayment(deps, SID, ppId)]);
  assert.deepEqual(results.map((x) => x.kind).sort(), ["completed", "in_progress"]);
  assert.equal(paypal.count("capture"), 1);
});

test("cancel at PayPal keeps the cart and the order can be resumed", async () => {
  const r = await beginPayment(deps, SID, hash());
  assert.ok(r.kind === "redirect");
  const ppId = deps.store.getOrder(r.orderId)!.paypalOrderId!;
  assert.equal(cancelPayment(deps, SID, ppId), true);
  assert.equal(deps.store.getOrder(r.orderId)!.state, "CANCELLED");
  assert.ok(deps.store.getOpenCart(SID));
  const again = await beginPayment(deps, SID, hash());
  assert.ok(again.kind === "redirect" && again.orderId === r.orderId);
  assert.equal(paypal.orders.size, 1);
});

test("payments unavailable without credentials — says so instead of pretending", async () => {
  deps.paypal = null;
  assert.equal((await beginPayment(deps, SID, hash())).kind, "unavailable");
});

const H = { authAlgo: "SHA256withRSA", certUrl: "https://api.sandbox.paypal.com/cert", transmissionId: "t1", transmissionSig: "sig", transmissionTime: "2026-10-23T00:00:00Z" };

test("webhook: rejected when not configured, unsigned, or signature invalid", async () => {
  const body = JSON.stringify({ id: "WH-1", event_type: "PAYMENT.CAPTURE.COMPLETED", resource: {} });
  assert.equal((await handleWebhook(deps, body, H, undefined)).status, 503);
  assert.equal((await handleWebhook(deps, body, { ...H, transmissionSig: undefined }, "WHID")).status, 400);
  paypal.webhookValid = false;
  assert.equal((await handleWebhook(deps, body, H, "WHID")).status, 400);
});

test("webhook: verified event reconciles from PayPal's API and duplicates are ignored", async () => {
  const r = await beginPayment(deps, SID, hash());
  assert.ok(r.kind === "redirect");
  const ppId = deps.store.getOrder(r.orderId)!.paypalOrderId!;
  paypal.approve(ppId);
  paypal.captureBehavior = "pending";
  await completePayment(deps, SID, ppId);
  paypal.orders.get(ppId)!.purchase_units![0]!.payments!.captures![0]!.status = "COMPLETED";
  const body = JSON.stringify({ id: "WH-2", event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { id: `CAP-${ppId}`, supplementary_data: { related_ids: { order_id: ppId } } } });
  assert.deepEqual(await handleWebhook(deps, body, H, "WHID"), { status: 200, message: "OK" });
  assert.equal(deps.store.getOrder(r.orderId)!.state, "COMPLETED");
  assert.equal((await handleWebhook(deps, body, H, "WHID")).message, "Duplicate event ignored");
});

test("webhook payload claiming COMPLETED cannot mark an unpaid order as paid", async () => {
  const r = await beginPayment(deps, SID, hash());
  assert.ok(r.kind === "redirect");
  const ppId = deps.store.getOrder(r.orderId)!.paypalOrderId!;
  const body = JSON.stringify({ id: "WH-3", event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { status: "COMPLETED", supplementary_data: { related_ids: { order_id: ppId } } } });
  await handleWebhook(deps, body, H, "WHID");
  assert.equal(deps.store.getOrder(r.orderId)!.state, "PAYPAL_CREATED");
});
