// Manual end-to-end sandbox checkout: create order from a verified quote, open the
// approve link as a *sandbox* buyer, then this script captures and verifies.
// Usage: node --env-file=.env.local --import tsx scripts/sandbox-checkout.ts
import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { loadCatalog } from "../src/catalog.ts";
import { captureOrder, createOrder, getAccessToken, getOrder, orderBodyFromQuote } from "../src/paypal.ts";
import { formatUsd, verifyCart } from "../src/verify.ts";

const { catalog } = loadCatalog();
const v = verifyCart(catalog, [{ variantId: "v-charger-30w-bundle-c", quantity: 1 }], { budgetCents: 4500, deviceConnector: "USB-C" });
if (!v.ok) throw new Error("Cart failed verification; refusing to create an order");

const token = await getAccessToken();
const created = await createOrder(token, orderBodyFromQuote(v.quote, v.quoteHash));
const id = created.body.id as string;
const approve = created.body.links.find((l: { rel: string }) => l.rel === "approve" || l.rel === "payer-action").href;
console.log(`Order ${id} for ${formatUsd(v.quote.totalCents)} created. Approve as a SANDBOX buyer:\n${approve}`);

for (let i = 0; i < 120; i++) {
  const o = await getOrder(token, id);
  if (o.body.status === "APPROVED") break;
  if (i === 119) throw new Error(`Timed out; last status ${o.body.status}`);
  await sleep(5000);
}
const captureId = randomUUID();
const cap = await captureOrder(token, id, captureId);
const replay = await captureOrder(token, id, captureId); // idempotent replay must not double-capture
const c = cap.body.purchase_units[0].payments.captures[0];
console.log({ httpStatus: cap.status, orderStatus: cap.body.status, captureStatus: c.status, amount: c.amount, replayStatus: replay.status, replayCaptureId: replay.body?.purchase_units?.[0]?.payments?.captures?.[0]?.id, captureIdMatches: replay.body?.purchase_units?.[0]?.payments?.captures?.[0]?.id === c.id, debugId: cap.debugId });
if (c.amount.value !== (v.quote.totalCents / 100).toFixed(2)) throw new Error("Captured amount differs from verified quote");
