import "server-only";
import type { Catalog } from "./catalog";
import { EMPTY_SHOPPING_FOR, toUserConstraints } from "./constraints";
import { uuidv5 } from "./ids";
import { fromPayPalValue } from "./money";
import {
  approvalLink,
  firstCapture,
  orderBodyFromQuote,
  type PayPalApi,
  PayPalError,
  type PayPalOrder,
  PayPalUnreachableError,
  type WebhookHeaders,
} from "./paypal";
import type { OrderRow, Store } from "./store";
import { verifyCart, type VerificationResult } from "./verify";

// The payment state machine. Only an explicit shopper click reaches beginPayment();
// the AI layer has no import path to this module.

export interface CheckoutDeps {
  store: Store;
  catalog: Catalog;
  paypal: PayPalApi | null; // null when sandbox credentials are not configured
  baseUrl: string;
  now?: () => Date;
}

// A PayPal order the shopper never approved is not reused after this long; we create a fresh one.
const REUSE_ORDER_FOR_MS = 2 * 60 * 60 * 1000;

export function verifySessionCart(deps: CheckoutDeps, sessionId: string, cartLines = deps.store.getOpenCart(sessionId)?.lines ?? []): VerificationResult {
  const shopping = deps.store.getShopping(sessionId)?.shoppingFor ?? EMPTY_SHOPPING_FOR;
  return verifyCart(deps.catalog, cartLines, toUserConstraints(shopping));
}

export type BeginResult =
  | { kind: "redirect"; url: string; orderId: string }
  | { kind: "empty" }
  | { kind: "blocked" }
  | { kind: "changed" }
  | { kind: "unavailable" }
  | { kind: "in_progress"; orderId: string }
  | { kind: "already_paid"; orderId: string }
  | { kind: "error"; reason: string };

export async function beginPayment(deps: CheckoutDeps, sessionId: string, approvedQuoteHash: string): Promise<BeginResult> {
  const { store } = deps;
  const now = deps.now ?? (() => new Date());
  const cart = store.getOpenCart(sessionId);
  if (!cart || cart.lines.length === 0) return { kind: "empty" };

  // Re-verify on the server at the moment of approval. The browser sends only the hash
  // of the quote it displayed, never prices; if anything changed, the shopper reviews again.
  const v = verifySessionCart(deps, sessionId, cart.lines);
  if (!v.ok) return { kind: "blocked" };
  if (v.quoteHash !== approvedQuoteHash) return { kind: "changed" };
  if (!deps.paypal) return { kind: "unavailable" };

  const paid = store.completedOrderForCart(cart.id);
  if (paid) return { kind: "already_paid", orderId: paid.id };

  // Everything from here to the PayPal call is synchronous, so two simultaneous clicks
  // cannot both insert a row: the second one sees the first one's row.
  let row = store.latestOrderFor(cart.id, v.quoteHash);
  if (row) {
    const age = now().getTime() - new Date(row.createdAt).getTime();
    switch (row.state) {
      case "COMPLETED":
        return { kind: "already_paid", orderId: row.id };
      case "CAPTURING":
      case "PENDING":
      case "CAPTURE_UNKNOWN":
        return { kind: "in_progress", orderId: row.id };
      case "PAYPAL_CREATED":
      case "CANCELLED":
      case "DECLINED":
        if (row.approveUrl && age < REUSE_ORDER_FOR_MS) {
          store.transition(row.id, [row.state], "PAYPAL_CREATED");
          store.audit("approval.reused_paypal_order", { sessionId, orderId: row.id }, { paypalOrderId: row.paypalOrderId });
          return { kind: "redirect", url: row.approveUrl, orderId: row.id };
        }
        row = store.insertOrder({ sessionId, cartId: cart.id, quoteHash: v.quoteHash, quote: v.quote, attempt: row.attempt + 1 });
        break;
      case "APPROVED_BY_USER":
        break; // a previous create may be in flight or failed in transit; retrying with the same request id is safe
      default:
        row = store.insertOrder({ sessionId, cartId: cart.id, quoteHash: v.quoteHash, quote: v.quote, attempt: row.attempt + 1 });
    }
  } else {
    row = store.insertOrder({ sessionId, cartId: cart.id, quoteHash: v.quoteHash, quote: v.quote, attempt: 1 });
  }
  store.audit("approval.recorded", { sessionId, orderId: row.id }, { quoteHash: v.quoteHash, totalCents: v.quote.totalCents });

  const requestId = uuidv5(`create:${cart.id}:${v.quoteHash}:${row.attempt}`);
  const body = orderBodyFromQuote(v.quote, {
    quoteHash: v.quoteHash,
    invoiceId: `ohc-${cart.id}`, // PayPal refuses to capture a second order with an already-paid invoice id
    returnUrl: `${deps.baseUrl}/checkout/return`,
    cancelUrl: `${deps.baseUrl}/checkout/cancel`,
  });
  try {
    const res = await deps.paypal.createOrder(body, requestId);
    const url = approvalLink(res.body);
    if (!url) throw new PayPalError(res.status, "NO_APPROVAL_LINK", res.debugId, null);
    store.updateOrder(row.id, { state: "PAYPAL_CREATED", paypalOrderId: res.body.id, approveUrl: url, debugId: res.debugId });
    store.audit("paypal.order_created", { sessionId, orderId: row.id }, { paypalOrderId: res.body.id, status: res.body.status, debugId: res.debugId });
    return { kind: "redirect", url, orderId: row.id };
  } catch (err) {
    if (err instanceof PayPalUnreachableError) {
      store.audit("paypal.create_unreachable", { sessionId, orderId: row.id });
      return { kind: "error", reason: "unreachable" };
    }
    const e = err instanceof PayPalError ? err : null;
    store.updateOrder(row.id, { state: "FAILED", statusReason: e?.issue ?? "CREATE_FAILED", debugId: e?.debugId ?? null });
    store.audit("paypal.create_failed", { sessionId, orderId: row.id }, { status: e?.status, issue: e?.issue, debugId: e?.debugId });
    return { kind: "error", reason: e?.issue ?? "create_failed" };
  }
}

export type CaptureResult =
  | { kind: "completed"; orderId: string }
  | { kind: "pending"; orderId: string }
  | { kind: "declined"; orderId: string; retryUrl: string | null }
  | { kind: "not_approved"; orderId: string }
  | { kind: "needs_reapproval"; orderId: string }
  | { kind: "in_progress"; orderId: string }
  | { kind: "unknown"; orderId: string }
  | { kind: "mismatch"; orderId: string }
  | { kind: "refused"; orderId: string } // PayPal refused; this PayPal order can't be retried
  | { kind: "expired"; orderId: string } // PayPal no longer knows this order
  | { kind: "not_found" }
  | { kind: "error"; orderId: string; reason: string };

const CAPTURABLE = ["PAYPAL_CREATED", "CANCELLED", "DECLINED", "CAPTURE_UNKNOWN"] as const;
// A CAPTURING lock older than this means the process died mid-capture. The outcome is
// unknown, so it becomes CAPTURE_UNKNOWN and is resolved by asking PayPal (same request id).
export const STALE_CAPTURE_LOCK_MS = 2 * 60 * 1000;

// Called when PayPal sends the shopper back to our return_url.
export async function completePayment(deps: CheckoutDeps, sessionId: string, paypalOrderId: string): Promise<CaptureResult> {
  const row = deps.store.getOrderByPayPalId(paypalOrderId);
  // An order can only be captured from the session that approved it.
  if (!row || row.sessionId !== sessionId || !deps.paypal) return { kind: "not_found" };
  return captureRow(deps, row);
}

async function captureRow(deps: CheckoutDeps, row: OrderRow): Promise<CaptureResult> {
  const { store } = deps;
  const paypal = deps.paypal!;
  const ids = { sessionId: row.sessionId, orderId: row.id };
  const now = (deps.now ?? (() => new Date()))().getTime();
  if (row.state === "CAPTURING" && now - new Date(row.updatedAt).getTime() > STALE_CAPTURE_LOCK_MS) {
    if (store.transition(row.id, ["CAPTURING"], "CAPTURE_UNKNOWN")) store.audit("capture.stale_lock_recovered", ids);
  }
  if (!store.transition(row.id, [...CAPTURABLE], "CAPTURING")) return stateResult(store.getOrder(row.id)!);

  try {
    const current = await paypal.getOrder(row.paypalOrderId!);
    if (current.body.status === "COMPLETED") return finalize(deps, row, current.body, "already_completed");
    if (current.body.status !== "APPROVED") {
      store.updateOrder(row.id, { state: "PAYPAL_CREATED" });
      store.audit("capture.skipped_not_approved", ids, { paypalStatus: current.body.status });
      return { kind: "not_approved", orderId: row.id };
    }

    // Assert PayPal holds exactly what the shopper approved before moving any money.
    const pu = current.body.purchase_units?.[0];
    const amountOk = pu?.amount?.currency_code === "USD" && fromPayPalValue(pu.amount.value) === row.quote.totalCents;
    if (!amountOk || pu?.custom_id !== row.quoteHash) {
      store.updateOrder(row.id, { state: "FAILED", statusReason: "ORDER_MISMATCH" });
      store.audit("capture.refused_mismatch", ids, { amount: pu?.amount, customIdMatches: pu?.custom_id === row.quoteHash });
      return { kind: "mismatch", orderId: row.id };
    }

    // Re-verify the cart against the live catalog: a price or stock change after approval
    // means the shopper must approve again. Nothing is captured.
    const cart = store.getCart(row.cartId);
    const v = verifySessionCart(deps, row.sessionId, cart?.lines ?? []);
    if (!v.ok || v.quoteHash !== row.quoteHash) {
      store.updateOrder(row.id, { state: "NEEDS_REAPPROVAL", statusReason: v.ok ? "QUOTE_CHANGED" : "VERIFICATION_BLOCKED" });
      store.audit("capture.refused_reverify", ids, { ok: v.ok });
      return { kind: "needs_reapproval", orderId: row.id };
    }

    const captured = await paypal.captureOrder(row.paypalOrderId!, uuidv5(`capture:${row.paypalOrderId}`));
    return finalize(deps, row, captured.body, "captured", captured.debugId);
  } catch (err) {
    if (err instanceof PayPalUnreachableError) {
      store.updateOrder(row.id, { state: "CAPTURE_UNKNOWN", statusReason: "UNREACHABLE" });
      store.audit("capture.unknown", ids);
      return { kind: "unknown", orderId: row.id };
    }
    if (err instanceof PayPalError) {
      store.audit("capture.paypal_error", ids, { status: err.status, issue: err.issue, debugId: err.debugId });
      // A 5xx on capture means PayPal may or may not have captured: never treat as failed.
      if (err.status >= 500) {
        store.updateOrder(row.id, { state: "CAPTURE_UNKNOWN", statusReason: `HTTP_${err.status}`, debugId: err.debugId });
        return { kind: "unknown", orderId: row.id };
      }
      switch (err.issue) {
        case "TRANSACTION_REFUSED":
        case "MAX_NUMBER_OF_PAYMENT_ATTEMPTS_EXCEEDED":
        case "COMPLIANCE_VIOLATION": // seen live 2026-10-25 after a real sandbox buyer approval
          store.updateOrder(row.id, { state: "FAILED", statusReason: err.issue, debugId: err.debugId });
          return { kind: "refused", orderId: row.id };
        case "INVALID_RESOURCE_ID":
        case "RESOURCE_NOT_FOUND":
          store.updateOrder(row.id, { state: "FAILED", statusReason: "PAYPAL_ORDER_EXPIRED", debugId: err.debugId });
          return { kind: "expired", orderId: row.id };
        case "INSTRUMENT_DECLINED":
        case "PAYER_ACTION_REQUIRED": {
          const retryUrl = err.body?.links?.find((l) => l.rel === "redirect" || l.rel === "payer-action")?.href ?? row.approveUrl;
          store.updateOrder(row.id, { state: "DECLINED", statusReason: err.issue, debugId: err.debugId });
          return { kind: "declined", orderId: row.id, retryUrl };
        }
        case "ORDER_ALREADY_CAPTURED": {
          const o = await paypal.getOrder(row.paypalOrderId!);
          return finalize(deps, row, o.body, "already_captured");
        }
        case "ORDER_NOT_APPROVED":
          store.updateOrder(row.id, { state: "PAYPAL_CREATED" });
          return { kind: "not_approved", orderId: row.id };
        default:
          store.updateOrder(row.id, { state: "FAILED", statusReason: err.issue ?? `HTTP_${err.status}`, debugId: err.debugId });
          return { kind: "error", orderId: row.id, reason: err.issue ?? "capture_failed" };
      }
    }
    store.updateOrder(row.id, { state: "CAPTURE_UNKNOWN", statusReason: "UNEXPECTED_ERROR" });
    store.audit("capture.unexpected_error", ids, { message: err instanceof Error ? err.message.slice(0, 200) : "unknown" });
    return { kind: "unknown", orderId: row.id };
  }
}

// Record the outcome strictly from PayPal's capture object. A receipt is only possible
// when PayPal says COMPLETED and the captured amount equals the approved total.
function finalize(deps: CheckoutDeps, row: OrderRow, order: PayPalOrder, how: string, debugId: string | null = null): CaptureResult {
  const { store } = deps;
  const ids = { sessionId: row.sessionId, orderId: row.id };
  const cap = firstCapture(order);
  if (!cap) {
    store.updateOrder(row.id, { state: "CAPTURE_UNKNOWN", statusReason: "NO_CAPTURE_IN_RESPONSE" });
    return { kind: "unknown", orderId: row.id };
  }
  const amountCents = fromPayPalValue(cap.amount.value);
  const base = { captureId: cap.id, captureStatus: cap.status, captureAmountCents: amountCents, debugId: debugId ?? row.debugId };
  switch (cap.status) {
    case "COMPLETED":
      if (cap.amount.currency_code !== "USD" || amountCents !== row.quote.totalCents) {
        store.updateOrder(row.id, { ...base, state: "FAILED", statusReason: "CAPTURE_AMOUNT_MISMATCH" });
        store.audit("capture.amount_mismatch", ids, { amountCents, expected: row.quote.totalCents });
        return { kind: "mismatch", orderId: row.id };
      }
      store.updateOrder(row.id, { ...base, state: "COMPLETED", statusReason: null, verifiedAt: new Date().toISOString() });
      store.markCartPurchased(row.cartId);
      store.audit("capture.completed", ids, { captureId: cap.id, amountCents, how });
      return { kind: "completed", orderId: row.id };
    case "PENDING":
      store.updateOrder(row.id, { ...base, state: "PENDING", statusReason: cap.status_details?.reason ?? "PENDING" });
      store.audit("capture.pending", ids, { captureId: cap.id, reason: cap.status_details?.reason });
      return { kind: "pending", orderId: row.id };
    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      store.updateOrder(row.id, { ...base, state: "REFUNDED" });
      store.audit("capture.refunded", ids, { captureId: cap.id });
      return stateResult(store.getOrder(row.id)!);
    default:
      store.updateOrder(row.id, { ...base, state: "DECLINED", statusReason: cap.status });
      store.audit("capture.declined", ids, { captureId: cap.id, status: cap.status });
      return { kind: "declined", orderId: row.id, retryUrl: row.approveUrl };
  }
}

// PayPal declined to move money after approval: nothing was captured, and a new approval starts a new order.
const REFUSED_ISSUES = new Set(["TRANSACTION_REFUSED", "MAX_NUMBER_OF_PAYMENT_ATTEMPTS_EXCEEDED", "COMPLIANCE_VIOLATION"]);

function stateResult(row: OrderRow): CaptureResult {
  switch (row.state) {
    case "COMPLETED":
      return { kind: "completed", orderId: row.id };
    case "PENDING":
      return { kind: "pending", orderId: row.id };
    case "CAPTURING":
      return { kind: "in_progress", orderId: row.id };
    case "CAPTURE_UNKNOWN":
      return { kind: "unknown", orderId: row.id };
    case "DECLINED":
      return { kind: "declined", orderId: row.id, retryUrl: row.approveUrl };
    case "NEEDS_REAPPROVAL":
      return { kind: "needs_reapproval", orderId: row.id };
    case "FAILED":
      if (row.statusReason && REFUSED_ISSUES.has(row.statusReason)) return { kind: "refused", orderId: row.id };
      return { kind: "error", orderId: row.id, reason: row.statusReason ?? row.state };
    default:
      return { kind: "error", orderId: row.id, reason: row.statusReason ?? row.state };
  }
}

export function cancelPayment(deps: CheckoutDeps, sessionId: string, paypalOrderId: string): boolean {
  const row = deps.store.getOrderByPayPalId(paypalOrderId);
  if (!row || row.sessionId !== sessionId) return false;
  const ok = deps.store.transition(row.id, ["PAYPAL_CREATED", "DECLINED"], "CANCELLED");
  if (ok) deps.store.audit("paypal.cancelled_by_shopper", { sessionId, orderId: row.id });
  return ok;
}

// Ask PayPal for the truth and update our record. Used by "Check again" on the receipt
// and by verified webhooks. Never trusts anything except PayPal's own API response.
export async function reconcile(deps: CheckoutDeps, orderId: string): Promise<CaptureResult> {
  const row = deps.store.getOrder(orderId);
  if (!row?.paypalOrderId || !deps.paypal) return { kind: "not_found" };
  if (row.state === "CAPTURE_UNKNOWN" || row.state === "CAPTURING") return captureRow(deps, row); // same capture request id: safe to repeat
  if (row.state !== "PENDING" && row.state !== "COMPLETED") return stateResult(row);
  const o = await deps.paypal.getOrder(row.paypalOrderId);
  if (!firstCapture(o.body)) return stateResult(row);
  return finalize(deps, row, o.body, "reconciled");
}

// --- Webhooks ---

export interface WebhookOutcome {
  status: number;
  message: string;
}

export async function handleWebhook(
  deps: CheckoutDeps,
  rawBody: string,
  headers: Partial<WebhookHeaders>,
  webhookId: string | undefined,
): Promise<WebhookOutcome> {
  if (!webhookId || !deps.paypal) return { status: 503, message: "Webhook verification is not configured" };
  const h = headers;
  if (!h.authAlgo || !h.certUrl || !h.transmissionId || !h.transmissionSig || !h.transmissionTime) {
    return { status: 400, message: "Missing PayPal transmission headers" };
  }
  let event: { id?: string; event_type?: string; resource?: { id?: string; supplementary_data?: { related_ids?: { order_id?: string } } } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return { status: 400, message: "Body is not JSON" };
  }
  let verified = false;
  try {
    verified = await deps.paypal.verifyWebhookSignature(rawBody, h as WebhookHeaders, webhookId);
  } catch (err) {
    // PayPal rejected the verification request itself (malformed headers, unknown webhook id): not authentic.
    if (err instanceof PayPalError && err.status < 500) return { status: 400, message: "Signature verification failed" };
    return { status: 502, message: "Could not verify signature with PayPal" }; // transient: PayPal retries later
  }
  if (!verified || !event.id || !event.event_type) return { status: 400, message: "Signature verification failed" };

  const type = event.event_type;
  const paypalOrderId = type.startsWith("CHECKOUT.ORDER.") ? (event.resource?.id ?? null) : (event.resource?.supplementary_data?.related_ids?.order_id ?? null);
  if (!deps.store.recordWebhookEvent(event.id, type, paypalOrderId)) return { status: 200, message: "Duplicate event ignored" };

  const row = paypalOrderId ? deps.store.getOrderByPayPalId(paypalOrderId) : null;
  deps.store.audit("webhook.received", { orderId: row?.id }, { eventId: event.id, type });
  if (row && type.startsWith("PAYMENT.CAPTURE.")) {
    // The event only tells us *to look*; the state change comes from PayPal's API.
    await reconcile(deps, row.id).catch(() => undefined);
  }
  return { status: 200, message: "OK" };
}
