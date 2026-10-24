// TEST FIXTURE, not a payment: writes an order row straight into the E2E database so the
// receipt page can be rendered in each state for accessibility checks. The ids are
// obviously fake ("FIXTURE…") and PayPal is never called.
// Usage: node --conditions=react-server --import tsx test/e2e/fixtures/seed-receipt.ts <db> <sessionId> <state>
import { Store, type OrderState } from "../../../lib/store";
import { verifyCart } from "../../../lib/verify";
import { loadTestCatalog } from "../../unit/helpers";

const [db, sessionId, state] = process.argv.slice(2) as [string, string, OrderState];
const store = new Store(db);
const v = verifyCart(loadTestCatalog(), [{ variantId: "v-charger-30w-bundle-c", quantity: 1 }], { budgetCents: 4500, deviceConnector: "USB-C" });
const cart = store.getOrCreateOpenCart(sessionId);
const order = store.insertOrder({ sessionId, cartId: cart.id, quoteHash: v.quoteHash, quote: v.quote, attempt: Date.now() });
const paypalOrderId = `FIXTURE${Date.now()}`;
store.updateOrder(order.id, {
  state,
  paypalOrderId,
  ...(state === "COMPLETED" ? { captureId: "FIXTURECAPTURE0001", captureStatus: "COMPLETED", captureAmountCents: v.quote.totalCents, verifiedAt: new Date().toISOString() } : {}),
  ...(state === "PENDING" ? { captureId: "FIXTURECAPTURE0002", captureStatus: "PENDING", statusReason: "PENDING_REVIEW" } : {}),
});
console.log(order.id);
