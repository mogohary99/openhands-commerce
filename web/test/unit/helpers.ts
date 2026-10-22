import { readFileSync } from "node:fs";
import { type Catalog, parseCatalog } from "../../lib/catalog";
import type { PayPalApi, PayPalOrder, PayPalResponse, WebhookHeaders } from "../../lib/paypal";

export const catalogRaw = readFileSync(new URL("../../data/catalog.json", import.meta.url), "utf8");
export const loadTestCatalog = (): Catalog => parseCatalog(catalogRaw).catalog;

// In-memory stand-in for PayPal's Orders API. Records every call so tests can assert
// how many orders/captures were attempted and with which request ids.
export class FakePayPal implements PayPalApi {
  orders = new Map<string, PayPalOrder & { _body: any }>();
  byRequestId = new Map<string, string>();
  captureRequestIds = new Map<string, string>();
  calls: Array<{ op: string; id?: string; requestId?: string }> = [];
  next = 1;
  captureBehavior: "complete" | "pending" | "declined_422" | "unreachable" | "capture_declined" = "complete";
  webhookValid: boolean | "paypal_400" | "unreachable" = true;
  // Recorded from live sandbox negative testing (PayPal-Mock-Response), 2026-10-23.
  captureError: { status: number; issue: string } | null = null;
  getError: { status: number; issue: string } | null = null;
  tamperCurrency: string | null = null;
  tamperAmount: string | null = null;

  async createOrder(body: any, requestId: string): Promise<PayPalResponse<PayPalOrder>> {
    this.calls.push({ op: "create", requestId });
    const existing = this.byRequestId.get(requestId);
    if (existing) return { status: 200, debugId: "dbg", body: this.orders.get(existing)! };
    const id = `PP${this.next++}`;
    const pu = body.purchase_units[0];
    const order = {
      id,
      status: "PAYER_ACTION_REQUIRED" as const,
      links: [{ rel: "payer-action", href: `https://www.sandbox.paypal.com/checkoutnow?token=${id}` }],
      purchase_units: [{ custom_id: pu.custom_id, invoice_id: pu.invoice_id, amount: { currency_code: pu.amount.currency_code, value: pu.amount.value } }],
      _body: body,
    };
    this.orders.set(id, order);
    this.byRequestId.set(requestId, id);
    return { status: 201, debugId: "dbg", body: order };
  }
  approve(id: string) {
    const o = this.orders.get(id)!;
    o.status = "APPROVED";
    if (this.tamperAmount) o.purchase_units![0]!.amount!.value = this.tamperAmount;
    if (this.tamperCurrency) o.purchase_units![0]!.amount!.currency_code = this.tamperCurrency;
  }
  async getOrder(id: string): Promise<PayPalResponse<PayPalOrder>> {
    this.calls.push({ op: "get", id });
    if (this.getError) {
      const { PayPalError } = await import("../../lib/paypal");
      throw new PayPalError(this.getError.status, this.getError.issue, "dbg-get", { details: [{ issue: this.getError.issue }] });
    }
    const o = this.orders.get(id);
    if (!o) throw new Error("not found");
    return { status: 200, debugId: "dbg", body: structuredClone(o) };
  }
  async captureOrder(id: string, requestId: string): Promise<PayPalResponse<PayPalOrder>> {
    this.calls.push({ op: "capture", id, requestId });
    const { PayPalError, PayPalUnreachableError } = await import("../../lib/paypal");
    const o = this.orders.get(id)!;
    if (this.captureBehavior === "unreachable") throw new PayPalUnreachableError("timeout");
    if (this.captureError) throw new PayPalError(this.captureError.status, this.captureError.issue, "dbg-mock", { details: [{ issue: this.captureError.issue }], links: [{ rel: "information_link", href: "https://developer.paypal.com" }] });
    if (this.captureBehavior === "declined_422") throw new PayPalError(422, "INSTRUMENT_DECLINED", "dbg-decl", { details: [{ issue: "INSTRUMENT_DECLINED" }] });
    const prior = this.captureRequestIds.get(id);
    if (prior && prior !== requestId) throw new PayPalError(422, "ORDER_ALREADY_CAPTURED", "dbg", null);
    if (o.status === "COMPLETED") return { status: 200, debugId: "dbg", body: structuredClone(o) };
    if (o.status !== "APPROVED") throw new PayPalError(422, "ORDER_NOT_APPROVED", "dbg", null);
    this.captureRequestIds.set(id, requestId);
    const status = this.captureBehavior === "pending" ? "PENDING" : this.captureBehavior === "capture_declined" ? "DECLINED" : "COMPLETED";
    o.status = "COMPLETED";
    o.purchase_units![0]!.payments = {
      captures: [{ id: `CAP-${id}`, status, amount: { ...o.purchase_units![0]!.amount! }, status_details: status === "PENDING" ? { reason: "PENDING_REVIEW" } : undefined }],
    };
    return { status: 201, debugId: "dbg-cap", body: structuredClone(o) };
  }
  async verifyWebhookSignature(_raw: string, _h: WebhookHeaders, _id: string): Promise<boolean> {
    this.calls.push({ op: "verify" });
    const { PayPalError, PayPalUnreachableError } = await import("../../lib/paypal");
    if (this.webhookValid === "paypal_400") throw new PayPalError(400, "VALIDATION_ERROR", "dbg", null);
    if (this.webhookValid === "unreachable") throw new PayPalUnreachableError("down");
    return this.webhookValid;
  }
  count(op: string) {
    return this.calls.filter((c) => c.op === op).length;
  }
}
