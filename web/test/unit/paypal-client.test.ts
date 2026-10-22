import assert from "node:assert/strict";
import { test } from "node:test";
import { uuidv5 } from "../../lib/ids";
import { fromPayPalValue } from "../../lib/money";
import { createPayPalClient, PAYPAL_BASE, PayPalError, PayPalUnreachableError } from "../../lib/paypal";

type Call = { url: string; init: RequestInit };
function fakeFetch(responses: Array<() => Response>) {
  const calls: Call[] = [];
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const next = responses.shift();
    if (!next) throw new Error("no more responses");
    return next();
  }) as unknown as typeof fetch;
  return { impl, calls };
}
const token = () => new Response(JSON.stringify({ access_token: "tok", expires_in: 32400 }), { status: 200 });
const json = (status: number, body: unknown) => () => new Response(JSON.stringify(body), { status, headers: { "paypal-debug-id": "d1" } });
const opts = (impl: typeof fetch) => ({ clientId: "id", clientSecret: "secret", fetchImpl: impl, sleep: async () => {} });

test("base URL is the sandbox and cannot be changed by configuration", () => {
  assert.equal(PAYPAL_BASE, "https://api-m.sandbox.paypal.com");
});

test("retries 5xx with the identical PayPal-Request-Id, and caches the OAuth token", async () => {
  const f = fakeFetch([token, json(503, {}), json(201, { id: "O1", status: "CREATED" }), json(200, { id: "O1", status: "CREATED" })]);
  const c = createPayPalClient(opts(f.impl));
  const r = await c.createOrder({}, "req-1");
  assert.equal(r.body.id, "O1");
  await c.getOrder("O1");
  const posts = f.calls.filter((x) => x.url.endsWith("/v2/checkout/orders"));
  assert.equal(posts.length, 2);
  assert.ok(posts.every((p) => (p.init.headers as Record<string, string>)["PayPal-Request-Id"] === "req-1"));
  assert.equal(f.calls.filter((x) => x.url.endsWith("/v1/oauth2/token")).length, 1);
});

test("maps PayPal 422 issues to PayPalError with debug id", async () => {
  const f = fakeFetch([token, json(422, { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "INSTRUMENT_DECLINED" }] })]);
  const c = createPayPalClient(opts(f.impl));
  await assert.rejects(c.captureOrder("O1", "cap-1"), (e: unknown) => e instanceof PayPalError && e.issue === "INSTRUMENT_DECLINED" && e.debugId === "d1");
});

test("network failures after retries surface as PayPalUnreachableError", async () => {
  const boom = () => {
    throw new TypeError("fetch failed");
  };
  const f = fakeFetch([token, boom, boom, boom]);
  const c = createPayPalClient(opts(f.impl));
  await assert.rejects(c.getOrder("O1"), PayPalUnreachableError);
});

test("webhook verification splices the raw body byte-for-byte", async () => {
  const f = fakeFetch([token, json(200, { verification_status: "SUCCESS" })]);
  const c = createPayPalClient(opts(f.impl));
  const raw = '{"id":"WH-1",  "event_type":"X"}';
  const ok = await c.verifyWebhookSignature(raw, { authAlgo: "a", certUrl: "c", transmissionId: "i", transmissionSig: "s", transmissionTime: "t" }, "WHID");
  assert.equal(ok, true);
  assert.ok(String(f.calls[1]!.init.body).endsWith(`"webhook_event":${raw}}`));
});

test("uuidv5 matches the RFC 4122 test vector and is deterministic", () => {
  assert.equal(uuidv5("www.example.com", "6ba7b810-9dad-11d1-80b4-00c04fd430c8"), "2ed6657d-e927-568b-95e1-2665a8aea6a2");
  assert.equal(uuidv5("x"), uuidv5("x"));
  assert.notEqual(uuidv5("x"), uuidv5("y"));
});

test("PayPal amount strings convert to exact cents", () => {
  assert.equal(fromPayPalValue("40.62"), 4062);
  assert.equal(fromPayPalValue("40.6"), 4060);
  assert.equal(fromPayPalValue("40"), 4000);
  assert.throws(() => fromPayPalValue("4e1"));
});
