import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { beginPayment, type CheckoutDeps, completePayment, handleWebhook, reconcile, verifySessionCart } from "../../lib/checkout";
import { Store } from "../../lib/store";
import { FakePayPal, loadTestCatalog } from "./helpers";

// Render Free has an ephemeral filesystem: the SQLite file is gone after a restart,
// spin-down or deploy. Simulate that between "buyer approved at PayPal" and "return
// arrives", and check nothing is captured and nothing reads as paid.
const SID = "session-a";
const demoFor = { category: "chargers" as const, budgetCents: 4500, deviceConnector: "USB-C" as const, voiceLanguage: null, wantsCable: true };
const H = { authAlgo: "SHA256withRSA", certUrl: "https://api.sandbox.paypal.com/cert", transmissionId: "t", transmissionSig: "s", transmissionTime: "2026-10-23T00:00:00Z" };

test("database wiped after PayPal approval: return, webhook and recheck capture nothing", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ohc-ephemeral-"));
  const file = path.join(dir, "openhands.sqlite");
  try {
    const paypal = new FakePayPal();
    const before = new Store(file);
    const deps: CheckoutDeps = { store: before, catalog: loadTestCatalog(), paypal, baseUrl: "http://localhost:3000" };
    before.saveShopping(SID, "demo", demoFor, "rules");
    const cart = before.getOrCreateOpenCart(SID);
    before.saveCartLines(cart.id, [{ variantId: "v-charger-30w-bundle-c", quantity: 1, quotedPriceCents: 3199 }]);
    const begun = await beginPayment(deps, SID, verifySessionCart(deps, SID).quoteHash);
    assert.equal(begun.kind, "redirect");
    const token = [...paypal.orders.keys()][0]!;
    const oldOrderId = (begun as { orderId: string }).orderId;
    paypal.approve(token);

    // Instance restarts on an empty filesystem.
    before.db.close();
    rmSync(dir, { recursive: true, force: true });
    const after = new Store(file);
    const fresh: CheckoutDeps = { ...deps, store: after };

    // Same session cookie, same PayPal token: unknown order, so no capture call.
    assert.deepEqual(await completePayment(fresh, SID, token), { kind: "not_found" });
    // A verified capture webhook for that order finds no row and triggers nothing.
    const evt = JSON.stringify({ id: "WH-1", event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { supplementary_data: { related_ids: { order_id: token } } } });
    assert.equal((await handleWebhook(fresh, evt, H, "WHID")).status, 200);
    // "Check again" on an old receipt link: no row, nothing to reconcile.
    assert.deepEqual(await reconcile(fresh, oldOrderId), { kind: "not_found" });

    assert.equal(paypal.count("capture"), 0);
    assert.equal(after.getOrder(oldOrderId), null); // the receipt page 404s instead of showing "paid"
    assert.equal(after.getOrderByPayPalId(token), null);
    after.db.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
