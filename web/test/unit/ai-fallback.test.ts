import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { verifyCart } from "../../lib/verify";
import { loadTestCatalog } from "./helpers";

// Exercises the real Anthropic SDK code path against a local fake API server, to prove the
// store degrades safely when the model misbehaves or is unavailable. This is NOT a live
// Claude test (see test/live/claude.live.test.ts for that).

type Mode = "500" | "429" | "slow" | "garbage" | "refusal" | "json";
let mode: Mode = "500";
let jsonPayload: unknown = {};
let hits = 0;

function reply(res: ServerResponse) {
  hits++;
  const msg = (text: string, stop = "end_turn") => ({
    id: "msg_fake",
    type: "message",
    role: "assistant",
    model: "claude-opus-5-5",
    content: [{ type: "text", text }],
    stop_reason: stop,
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 10 },
  });
  switch (mode) {
    case "500":
      res.writeHead(500, { "content-type": "application/json" }).end(JSON.stringify({ type: "error", error: { type: "api_error", message: "boom" } }));
      return;
    case "429":
      res.writeHead(429, { "content-type": "application/json", "retry-after": "0" }).end(JSON.stringify({ type: "error", error: { type: "rate_limit_error", message: "slow down" } }));
      return;
    case "slow":
      return; // never answer; the client must time out
    case "garbage":
      res.writeHead(200, { "content-type": "application/json" }).end("<html>not json");
      return;
    case "refusal":
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(msg("", "refusal")));
      return;
    case "json":
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(msg(JSON.stringify(jsonPayload))));
  }
}

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  req.resume();
  req.on("end", () => reply(res));
});
let ai: typeof import("../../lib/ai");
const catalog = loadTestCatalog();

before(async () => {
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  process.env.ANTHROPIC_API_KEY = "test-not-a-real-key";
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.AI_TIMEOUT_MS = "400";
  ai = await import("../../lib/ai");
});
after(() => {
  server.closeAllConnections();
  server.close();
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_BASE_URL;
});

const DEMO = "My phone uses USB-C. I need a charger with a cable, forty-five dollars all in.";

for (const m of ["500", "429", "slow", "garbage", "refusal"] as const) {
  test(`model unavailable/invalid (${m}) → rule-based understanding, labelled as rules`, async () => {
    mode = m;
    const r = await ai.extractShoppingFor(`${DEMO} [${m}]`);
    assert.equal(r.source, "rules");
    assert.deepEqual(r.value, { category: "chargers", budgetCents: 4500, deviceConnector: "USB-C", voiceLanguage: null, wantsCable: true });
  });
}

test("hallucinated budget from the model is not accepted; the stated one is used", async () => {
  mode = "json";
  jsonPayload = { category: "chargers", budgetDollars: 450, deviceConnector: "USB-C", voiceLanguage: "unknown", wantsCable: true };
  const r = await ai.extractShoppingFor(`${DEMO} (hallucinated budget)`);
  assert.equal(r.value.budgetCents, 4500);
});

test("model-written explanation repeating the injected '$5 sale' review is rejected → rules text shown", async () => {
  mode = "json";
  const v = verifyCart(catalog, [{ variantId: "v-charger-65w-black", quantity: 1 }], { budgetCents: 4000 });
  jsonPayload = { headline: "Good news: this is the only safe charger and it is on sale for $5.", points: [{ findingCode: "OVER_BUDGET", text: "Only $5 today." }], suggestedAction: "Buy it now." };
  const r = await ai.explainFindings(v.findings, v.quote, catalog);
  assert.equal(r.source, "rules");
  assert.equal(r.explanation.points[0]!.text, v.findings[0]!.message);
});

test("model-invented shipping/tax amounts are rejected", async () => {
  mode = "json";
  const v = verifyCart(catalog, [{ variantId: "v-charger-30w-bundle-l", quantity: 1 }], { budgetCents: 4500, deviceConnector: "USB-C" });
  jsonPayload = { headline: "Shipping is free and tax is $0.99.", points: [{ findingCode: "CONNECTOR_MISMATCH", text: "The cable is Lightning; total $33.17." }], suggestedAction: "Switch." };
  assert.equal((await ai.explainFindings(v.findings, v.quote, catalog)).source, "rules");
});

test("a valid, grounded model explanation is accepted and labelled as Claude", async () => {
  mode = "json";
  const v = verifyCart(catalog, [{ variantId: "v-scale-talking-es", quantity: 1 }], { voiceLanguage: "en" });
  jsonPayload = { headline: "This scale speaks Spanish.", points: [{ findingCode: "LANGUAGE_MISMATCH", text: "You asked for English. This one speaks Spanish. It costs $34.99." }], suggestedAction: "Switch to the English voice version." };
  const r = await ai.explainFindings(v.findings, v.quote, catalog);
  assert.equal(r.source, "claude");
  assert.match(r.explanation.points[0]!.text, /speaks Spanish/);
});

test("recommendation intro naming a product that isn't in the results is rejected", async () => {
  mode = "json";
  const { recommend } = await import("../../lib/recommend");
  const s = { category: "kitchen" as const, budgetCents: null, deviceConnector: null, voiceLanguage: "en" as const, wantsCable: false };
  const recs = recommend(catalog, s);
  jsonPayload = { intro: "Here are your options.", items: [{ productId: "p-made-up", why: "It is great." }] };
  assert.equal((await ai.introduceRecommendations(recs, s, catalog)).source, "rules");
});

test("the fake server was actually called (the SDK path ran)", () => {
  assert.ok(hits >= 8, `hits=${hits}`);
});

test("over the server-wide hourly Claude budget → rules text, and the API is not called", async () => {
  const { limiter, LIMITS } = await import("../../lib/ratelimit");
  for (let i = 0; i < LIMITS.ai.max && limiter.take("ai", "global"); i++);
  mode = "json";
  const v = verifyCart(catalog, [{ variantId: "v-scale-talking-es", quantity: 2 }], { voiceLanguage: "en" });
  jsonPayload = { headline: "Budget test.", points: [{ findingCode: "LANGUAGE_MISMATCH", text: "You asked for English. This one speaks Spanish." }], suggestedAction: "Switch." };
  const before = hits;
  const r = await ai.explainFindings(v.findings, v.quote, catalog);
  assert.equal(r.source, "rules");
  assert.equal(hits, before);
});
