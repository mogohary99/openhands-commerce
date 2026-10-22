import assert from "node:assert/strict";
import { test } from "node:test";
import { verifyCart } from "../../lib/verify";
import { loadTestCatalog } from "./helpers";

const catalog = loadTestCatalog();
const codes = (r: ReturnType<typeof verifyCart>) => r.findings.map((f) => f.code).sort();

test("demo: Lightning bundle for a USB-C phone is blocked with a USB-C suggestion", () => {
  const r = verifyCart(catalog, [{ variantId: "v-charger-30w-bundle-l", quantity: 1, quotedPriceCents: 3199 }], { budgetCents: 4500, deviceConnector: "USB-C" });
  assert.equal(r.ok, false);
  assert.deepEqual(codes(r), ["CONNECTOR_MISMATCH"]);
  assert.equal(r.findings[0]!.title, "The cable will not fit your phone");
  assert.equal(r.findings[0]!.lineIndex, 0);
  assert.deepEqual(r.findings[0]!.suggestedVariantIds, ["v-charger-30w-bundle-c"]);
  // 31.99 + 5.99 shipping + 8.25% tax (2.64) = 40.62
  assert.deepEqual([r.quote.itemTotalCents, r.quote.shippingCents, r.quote.taxCents, r.quote.totalCents], [3199, 599, 264, 4062]);
});

test("demo: corrected cart passes and gets a different quote hash", () => {
  const bad = verifyCart(catalog, [{ variantId: "v-charger-30w-bundle-l", quantity: 1 }], { budgetCents: 4500, deviceConnector: "USB-C" });
  const good = verifyCart(catalog, [{ variantId: "v-charger-30w-bundle-c", quantity: 1 }], { budgetCents: 4500, deviceConnector: "USB-C" });
  assert.equal(good.ok, true);
  assert.equal(good.findings.length, 0);
  assert.notEqual(good.quoteHash, bad.quoteHash);
});

test("quote hash is stable for the same cart and changes with quantity", () => {
  const a = verifyCart(catalog, [{ variantId: "v-charger-30w-bundle-c", quantity: 1 }], {});
  const b = verifyCart(catalog, [{ variantId: "v-charger-30w-bundle-c", quantity: 1 }], {});
  const c = verifyCart(catalog, [{ variantId: "v-charger-30w-bundle-c", quantity: 2 }], {});
  assert.equal(a.quoteHash, b.quoteHash);
  assert.notEqual(a.quoteHash, c.quoteHash);
});

test("empty cart is never ok", () => {
  assert.equal(verifyCart(catalog, [], {}).ok, false);
});

test("all-in budget includes shipping and tax", () => {
  const r = verifyCart(catalog, [{ variantId: "v-charger-30w-bundle-c", quantity: 1 }], { budgetCents: 3500 });
  assert.deepEqual(codes(r), ["OVER_BUDGET"]);
  assert.match(r.findings[0]!.message, /\$40\.62.*\$5\.62 over your \$35\.00 budget/);
});

test("free shipping threshold applies", () => {
  const r = verifyCart(catalog, [{ variantId: "v-headphones-black", quantity: 1 }], {});
  assert.equal(r.quote.shippingCents, 0);
  assert.equal(r.quote.totalCents, 8999 + Math.round(8999 * 0.0825));
});

test("price drift since the shopper chose blocks until reconfirmed", () => {
  const r = verifyCart(catalog, [{ variantId: "v-scale-talking-en", quantity: 1, quotedPriceCents: 2999 }], {});
  assert.deepEqual(codes(r), ["PRICE_CHANGED"]);
});

test("out of stock, unknown item, invalid and unusual quantities", () => {
  const r = verifyCart(
    catalog,
    [
      { variantId: "v-charger-20w", quantity: 1 },
      { variantId: "v-does-not-exist", quantity: 1 },
      { variantId: "v-cable-c-c-1m", quantity: 0 },
      { variantId: "v-cable-c-c-2m", quantity: 5 },
    ],
    {},
  );
  assert.deepEqual(codes(r), ["INVALID_QUANTITY", "OUT_OF_STOCK", "UNKNOWN_ITEM", "UNUSUAL_QUANTITY"]);
  assert.equal(r.ok, false);
});

test("voice language mismatch on talking scale", () => {
  const r = verifyCart(catalog, [{ variantId: "v-scale-talking-es", quantity: 1 }], { voiceLanguage: "en" });
  assert.deepEqual(codes(r), ["LANGUAGE_MISMATCH"]);
  assert.deepEqual(r.findings[0]!.suggestedVariantIds, ["v-scale-talking-en"]);
  assert.match(r.findings[0]!.message, /speaks Spanish, but you asked for English/);
});
