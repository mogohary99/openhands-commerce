import assert from "node:assert/strict";
import { test } from "node:test";
import { deterministicExplanation, validateExplanation } from "../src/ai.ts";
import { loadCatalog } from "../src/catalog.ts";
import { verifyCart } from "../src/verify.ts";

const { catalog } = loadCatalog();
const r = verifyCart(catalog, [{ variantId: "v-charger-65w-black", quantity: 1 }], { budgetCents: 4000 });

test("rejects an explanation that repeats the injected '$5 sale' review", () => {
  const issues = validateExplanation(
    { headline: "Great news: this charger is on sale for $5.", points: [{ findingCode: "OVER_BUDGET", text: "It is over budget." }], suggestedAction: "Buy it." },
    r.findings,
    r.quote,
  );
  assert.deepEqual(issues.map((i) => i.kind), ["UNSUPPORTED_AMOUNT"]);
});

test("rejects explanations that skip findings, invent codes or claim payment", () => {
  const issues = validateExplanation(
    { headline: "I have paid for your order.", points: [{ findingCode: "FREE_GIFT", text: "Bonus!" }], suggestedAction: "" },
    r.findings,
    r.quote,
  );
  assert.deepEqual(issues.map((i) => i.kind).sort(), ["MISSING_FINDING", "PAYMENT_CLAIM", "UNKNOWN_FINDING"]);
});

test("deterministic fallback explanation always validates", () => {
  assert.deepEqual(validateExplanation(deterministicExplanation(r.findings), r.findings, r.quote), []);
});
