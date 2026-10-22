import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";

// Architectural guarantees, checked from source so they can't silently regress.
const src = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const imports = (p: string) => [...src(p).matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]!);

test("the AI module cannot reach payments: no import of paypal, checkout, store or session", () => {
  const bad = imports("lib/ai.ts").filter((i) => /paypal|checkout|store|session|runtime/.test(i));
  assert.deepEqual(bad, []);
});

test("the AI module gives the model no tools", () => {
  assert.doesNotMatch(src("lib/ai.ts"), /\btools\s*:/);
});

test("the PayPal base URL is the sandbox, hard-coded, with no env override", () => {
  const p = src("lib/paypal.ts");
  assert.match(p, /PAYPAL_BASE = "https:\/\/api-m\.sandbox\.paypal\.com"/);
  assert.doesNotMatch(p, /api-m\.paypal\.com/);
  assert.doesNotMatch(p, /process\.env\.PAYPAL_(BASE|API|URL|ENV)/);
});

test("no client component imports server-only modules (secrets stay on the server)", () => {
  const files = [...readdirSync(new URL("../../components", import.meta.url)).map((f) => `components/${f}`)];
  for (const f of files) {
    if (!/\.tsx?$/.test(f) || !src(f).startsWith('"use client"')) continue;
    const bad = imports(f).filter((i) => /lib\/(paypal|checkout|store|session|runtime|ai)/.test(i));
    assert.deepEqual(bad, [], f);
  }
});

test("order bodies are only built from a verified quote (single call site)", () => {
  const calls = ["lib/checkout.ts", "app/actions.ts"].flatMap((f) => [...src(f).matchAll(/orderBodyFromQuote\(/g)].map(() => f));
  assert.deepEqual(calls, ["lib/checkout.ts"]);
  assert.match(src("lib/checkout.ts"), /const v = verifySessionCart\(deps, sessionId, cart\.lines\);\s*\n\s*if \(!v\.ok\) return \{ kind: "blocked" \};/);
});
