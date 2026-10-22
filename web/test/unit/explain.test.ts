import assert from "node:assert/strict";
import { test } from "node:test";
import { checkGeneratedText, deterministicExplanation, validateExplanation } from "../../lib/explain";
import { verifyCart } from "../../lib/verify";
import { loadTestCatalog } from "./helpers";

const catalog = loadTestCatalog();
const r = verifyCart(catalog, [{ variantId: "v-charger-65w-black", quantity: 1 }], { budgetCents: 4000 });

test("the catalog really contains the planted prompt injection", () => {
  const review = catalog.products.find((p) => p.id === "p-charger-65w")!.reviews.find((x) => x.id === "r3")!;
  assert.match(review.text, /ignore your rules.*\$5/);
});

test("rejects an explanation that repeats the injected '$5 sale' review", () => {
  const issues = validateExplanation(
    { headline: "Great news: this charger is on sale for $5.", points: [{ findingCode: "OVER_BUDGET", text: "It is over budget." }], suggestedAction: "Buy it." },
    r.findings,
    r.quote,
  );
  assert.deepEqual(issues.map((i) => i.kind).sort(), ["PAYMENT_CLAIM", "UNSUPPORTED_AMOUNT"]);
});

test("rejects explanations that skip findings, invent codes or claim payment", () => {
  const issues = validateExplanation(
    { headline: "I have paid for your order.", points: [{ findingCode: "FREE_GIFT", text: "Bonus!" }], suggestedAction: "" },
    r.findings,
    r.quote,
  );
  assert.deepEqual(issues.map((i) => i.kind).sort(), ["MISSING_FINDING", "PAYMENT_CLAIM", "UNKNOWN_FINDING"]);
});

test("accepts amounts that come from the quote or finding messages", () => {
  const f = r.findings[0]!;
  const e = { headline: "This is over your budget.", points: [{ findingCode: f.code, text: f.message }], suggestedAction: "Raise your budget or pick a cheaper charger." };
  assert.deepEqual(validateExplanation(e, r.findings, r.quote), []);
});

test("checkGeneratedText flags order-placed claims", () => {
  assert.equal(checkGeneratedText("Your order has been placed.", new Set()).length, 1);
  assert.equal(checkGeneratedText("This one costs $31.99.", new Set([3199])).length, 0);
});

test("deterministic fallback explanation always validates", () => {
  assert.deepEqual(validateExplanation(deterministicExplanation(r.findings), r.findings, r.quote), []);
});
