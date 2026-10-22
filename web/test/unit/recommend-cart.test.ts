import assert from "node:assert/strict";
import { test } from "node:test";
import { acceptCurrentPrice, addVariant, applySuggestedVariant, removeLine, setQuantity } from "../../lib/cart";
import { recommend } from "../../lib/recommend";
import { loadTestCatalog } from "./helpers";

const catalog = loadTestCatalog();
const demo = { category: "chargers" as const, budgetCents: 4500, deviceConnector: "USB-C" as const, voiceLanguage: null, wantsCable: true };

test("recommendations: at most 3, matching product first, Lightning option flagged", () => {
  const recs = recommend(catalog, demo);
  assert.ok(recs.length <= 3);
  assert.equal(recs[0]!.product.id, "p-charger-30w");
  assert.equal(recs[0]!.bestVariantId, "v-charger-30w-bundle-c");
  const lightning = recs[0]!.options.find((o) => o.variant.id === "v-charger-30w-bundle-l")!;
  assert.deepEqual(lightning.blockingCodes, ["CONNECTOR_MISMATCH"]);
  assert.equal(recs[0]!.options.find((o) => o.variant.id === "v-charger-30w-bundle-c")!.allInCents, 4062);
  // out-of-stock product sorts last
  assert.equal(recs.at(-1)!.product.id, "p-charger-20w-budget");
});

test("every recommendation reason cites a real catalog fact or the price", () => {
  for (const r of recommend(catalog, demo)) {
    const keys = new Set([...Object.keys(r.product.facts), ...r.product.variants.flatMap((v) => Object.keys(v.facts)), "priceCents"]);
    for (const reason of r.reasons) assert.ok(keys.has(reason.factKey), `${r.product.id}: ${reason.factKey}`);
  }
});

test("addVariant records the catalog price and merges repeats", () => {
  const a = addVariant(catalog, [], "v-charger-30w-bundle-l");
  assert.ok(a.ok);
  assert.deepEqual(a.lines, [{ variantId: "v-charger-30w-bundle-l", quantity: 1, quotedPriceCents: 3199 }]);
  const b = addVariant(catalog, a.lines, "v-charger-30w-bundle-l");
  assert.ok(b.ok);
  assert.equal(b.lines[0]!.quantity, 2);
  assert.equal(addVariant(catalog, [], "v-nope").ok, false);
});

test("one-click fix only accepts the engine's own suggestion", () => {
  const lines = [{ variantId: "v-charger-30w-bundle-l", quantity: 1, quotedPriceCents: 3199 }];
  const c = { budgetCents: 4500, deviceConnector: "USB-C" };
  const good = applySuggestedVariant(catalog, lines, c, 0, "CONNECTOR_MISMATCH", "v-charger-30w-bundle-c");
  assert.ok(good.ok);
  assert.deepEqual(good.lines, [{ variantId: "v-charger-30w-bundle-c", quantity: 1, quotedPriceCents: 3199 }]);
  assert.equal(applySuggestedVariant(catalog, lines, c, 0, "CONNECTOR_MISMATCH", "v-headphones-black").ok, false);
  assert.equal(applySuggestedVariant(catalog, lines, c, 0, "OVER_BUDGET", "v-charger-30w-bundle-c").ok, false);
});

test("quantity, remove and accept-price operations validate input", () => {
  const lines = [{ variantId: "v-scale-talking-en", quantity: 1, quotedPriceCents: 2999 }];
  assert.equal(setQuantity(lines, 0, 11).ok, false);
  assert.equal(setQuantity(lines, 3, 1).ok, false);
  const q = setQuantity(lines, 0, 2);
  assert.ok(q.ok && q.lines[0]!.quantity === 2);
  const p = acceptCurrentPrice(catalog, lines, 0);
  assert.ok(p.ok && p.lines[0]!.quotedPriceCents === 3499);
  const rm = removeLine(lines, 0);
  assert.ok(rm.ok && rm.lines.length === 0);
});
