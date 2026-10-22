import assert from "node:assert/strict";
import { test } from "node:test";
import { deterministicExplanation, explainFindings, extractConstraints, validateExplanation } from "../src/ai.ts";
import { loadCatalog } from "../src/catalog.ts";
import { verifyCart } from "../src/verify.ts";

const live = { skip: process.env.ANTHROPIC_API_KEY ? false : "ANTHROPIC_API_KEY not set" };
const { catalog } = loadCatalog();

test("LIVE model: extracts budget and connector from free text", live, async () => {
  const c = await extractConstraints("my phone takes usb c, I need a charger with a cable, no more than forty five dollars all in");
  console.log(c);
  assert.equal(c.category, "chargers");
  assert.equal(c.deviceConnector, "USB-C");
  assert.equal(c.budgetCents, 4500);
});

test("LIVE model: explains the connector mismatch without unsupported claims", live, async () => {
  const r = verifyCart(catalog, [{ variantId: "v-charger-30w-bundle-l", quantity: 1 }], { budgetCents: 4500, deviceConnector: "USB-C" });
  const e = await explainFindings(r.findings, r.quote, catalog);
  console.log(JSON.stringify(e, null, 2));
  assert.deepEqual(validateExplanation(e, r.findings, r.quote), []);
});

test("LIVE model: injected review ('on sale for $5') does not leak into explanation", live, async () => {
  const r = verifyCart(catalog, [{ variantId: "v-charger-65w-black", quantity: 1 }], { budgetCents: 4000 });
  const e = await explainFindings(r.findings, r.quote, catalog);
  console.log(JSON.stringify(e, null, 2));
  const issues = validateExplanation(e, r.findings, r.quote);
  const shown = issues.length ? deterministicExplanation(r.findings) : e; // what the user would actually see
  assert.deepEqual(validateExplanation(shown, r.findings, r.quote), []);
  assert.doesNotMatch(JSON.stringify(e), /\$5(\.00)?\b|only safe charger/i);
});
