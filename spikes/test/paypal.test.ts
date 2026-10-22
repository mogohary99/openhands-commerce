import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { loadCatalog } from "../src/catalog.ts";
import { captureOrder, createOrder, getAccessToken, getOrder, hasSandboxCredentials, orderBodyFromQuote } from "../src/paypal.ts";
import { verifyCart } from "../src/verify.ts";

const { catalog } = loadCatalog();
const verified = verifyCart(catalog, [{ variantId: "v-charger-30w-bundle-c", quantity: 1 }], { budgetCents: 4500, deviceConnector: "USB-C" });
const body = orderBodyFromQuote(verified.quote, verified.quoteHash);

test("order body is derived only from the verified quote and sums correctly", () => {
  const pu = body.purchase_units[0];
  const b = pu.amount.breakdown;
  const sum = [b.item_total, b.shipping, b.tax_total].reduce((s, a) => s + Math.round(Number(a.value) * 100), 0);
  assert.equal(pu.amount.value, "40.62");
  assert.equal(sum, 4062);
  const items = pu.items.reduce((s, i) => s + Math.round(Number(i.unit_amount.value) * 100) * Number(i.quantity), 0);
  assert.equal(items, 3199);
});

const live = { skip: hasSandboxCredentials() ? false : "PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not set (sandbox)" };

test("LIVE sandbox: create, idempotent replay, get, capture-before-approval refused, tampered totals refused", live, async () => {
  const token = await getAccessToken();
  const requestId = randomUUID();

  const created = await createOrder(token, body, requestId);
  console.log("create", created.status, created.body?.id, created.body?.status, "debug_id", created.debugId);
  assert.ok([200, 201].includes(created.status));
  assert.equal(created.body.status, "CREATED");
  assert.equal(created.body.purchase_units[0].amount.value, "40.62");

  const replay = await createOrder(token, body, requestId);
  console.log("replay", replay.status, replay.body?.id);
  assert.equal(replay.body.id, created.body.id, "same PayPal-Request-Id must not create a second order");

  const fetched = await getOrder(token, created.body.id);
  assert.equal(fetched.body.status, "CREATED");
  const approve = fetched.body.links.find((l: { rel: string }) => l.rel === "approve" || l.rel === "payer-action");
  console.log("approve link rel:", approve?.rel);
  assert.ok(approve);

  const early = await captureOrder(token, created.body.id, randomUUID());
  console.log("capture-before-approval", early.status, early.body?.details?.[0]?.issue);
  assert.equal(early.status, 422);

  const tampered = structuredClone(body);
  tampered.purchase_units[0].amount.value = "1.00"; // breakdown no longer sums
  const bad = await createOrder(token, tampered, randomUUID());
  console.log("tampered", bad.status, bad.body?.details?.[0]?.issue);
  assert.equal(bad.status, 422);
});
