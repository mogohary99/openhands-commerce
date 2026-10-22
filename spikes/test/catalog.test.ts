import assert from "node:assert/strict";
import { test } from "node:test";
import { writeFileSync } from "node:fs";
import { loadCatalog, searchCatalog } from "../src/catalog.ts";

test("catalog loads, validates and is content-hashed", () => {
  const { catalog, sha256 } = loadCatalog();
  assert.equal(catalog.products.length, 6);
  assert.match(sha256, /^[0-9a-f]{64}$/);
  assert.equal(loadCatalog().sha256, sha256, "hash is stable across loads");
});

test("search filters by category, price, facts and stock", () => {
  const { catalog } = loadCatalog();
  const hits = searchCatalog(catalog, { category: "chargers", maxPriceCents: 3500, requiredFacts: { outputConnector: "USB-C" }, inStockOnly: true });
  assert.deepEqual(hits.map((h) => h.variant.id), ["v-charger-30w-white", "v-charger-30w-bundle-c", "v-charger-30w-bundle-l"]);
});

test("malformed catalog is rejected rather than served", (t) => {
  const bad = new URL("../catalog/.bad.test.json", import.meta.url);
  writeFileSync(bad, JSON.stringify({ catalogId: "x", products: [{ id: "p", variants: [{ id: "v", priceCents: -1 }] }] }));
  t.after(async () => (await import("node:fs")).rmSync(bad));
  assert.throws(() => loadCatalog(bad));
});
