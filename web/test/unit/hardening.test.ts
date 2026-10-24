import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCsp, newNonce } from "../../lib/csp";
import { clientKey, LIMITS, RateLimiter } from "../../lib/ratelimit";

test("rate limiter allows up to max per window, then refuses until the window resets", () => {
  let t = 0;
  const rl = new RateLimiter(() => t);
  for (let i = 0; i < LIMITS.approve.max; i++) assert.equal(rl.take("approve", "s1"), true);
  assert.equal(rl.take("approve", "s1"), false);
  assert.equal(rl.take("approve", "s2"), true, "other sessions are unaffected");
  assert.equal(rl.take("search", "s1"), true, "limits are per action");
  t += LIMITS.approve.windowMs;
  assert.equal(rl.take("approve", "s1"), true);
});

test("client key uses only the first forwarded hop", () => {
  assert.equal(clientKey(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })), "203.0.113.7");
  assert.equal(clientKey(new Headers({ "fly-client-ip": "198.51.100.2", "x-forwarded-for": "1.1.1.1" })), "198.51.100.2");
  assert.equal(clientKey(new Headers()), "local");
});

test("CSP: nonce-only scripts, no eval in production, PayPal Sandbox as the only external form target", () => {
  const n = newNonce();
  assert.match(n, /^[A-Za-z0-9+/]{22}==$/);
  assert.notEqual(n, newNonce());
  const csp = buildCsp(n, { dev: false, https: true });
  const dir = Object.fromEntries(csp.split("; ").map((d) => [d.split(" ")[0], d.split(" ").slice(1)]));
  assert.deepEqual(dir["script-src"], ["'self'", `'nonce-${n}'`, "'strict-dynamic'"]);
  assert.ok(!csp.includes("unsafe-eval"));
  assert.ok(!dir["script-src"]!.includes("'unsafe-inline'"));
  assert.deepEqual(dir["form-action"], ["'self'", "https://www.sandbox.paypal.com"]);
  assert.ok(!csp.includes("www.paypal.com"), "no live PayPal host");
  assert.deepEqual(dir["frame-ancestors"], ["'none'"]);
  assert.deepEqual(dir["object-src"], ["'none'"]);
  assert.ok("upgrade-insecure-requests" in dir);
  assert.ok(!("upgrade-insecure-requests" in Object.fromEntries(buildCsp(n, { dev: false, https: false }).split("; ").map((d) => [d, 1]))));
  assert.match(buildCsp(n, { dev: true, https: false }), /'unsafe-eval'/);
});
