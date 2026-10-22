import "server-only";
import { toPayPalValue } from "./money";
import type { Quote } from "./verify";

// Server-only PayPal Orders v2 client. The sandbox base URL is hard-coded on purpose:
// this application must never be able to move real money.
export const PAYPAL_BASE = "https://api-m.sandbox.paypal.com";

export const hasPayPalCredentials = () => Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);

export interface PayPalResponse<T = unknown> {
  status: number;
  debugId: string | null;
  body: T;
}

// Minimal shapes of the Orders v2 fields we read. Anything else is ignored.
export interface PayPalLink {
  href: string;
  rel: string;
  method?: string;
}
export interface PayPalCapture {
  id: string;
  status: "COMPLETED" | "DECLINED" | "PARTIALLY_REFUNDED" | "PENDING" | "REFUNDED" | "FAILED";
  amount: { currency_code: string; value: string };
  status_details?: { reason?: string };
  create_time?: string;
}
export interface PayPalOrder {
  id: string;
  status: "CREATED" | "SAVED" | "APPROVED" | "VOIDED" | "COMPLETED" | "PAYER_ACTION_REQUIRED";
  links?: PayPalLink[];
  purchase_units?: Array<{
    custom_id?: string;
    invoice_id?: string;
    amount?: { currency_code: string; value: string };
    payments?: { captures?: PayPalCapture[] };
  }>;
}
export interface PayPalErrorBody {
  name?: string;
  message?: string;
  debug_id?: string;
  details?: Array<{ issue?: string; description?: string }>;
  links?: PayPalLink[];
}

export class PayPalError extends Error {
  constructor(
    readonly status: number,
    readonly issue: string | null,
    readonly debugId: string | null,
    readonly body: PayPalErrorBody | null,
  ) {
    super(`PayPal HTTP ${status}${issue ? ` ${issue}` : ""}${debugId ? ` (debug_id ${debugId})` : ""}`);
  }
}

// Transport failure after retries: the request may or may not have reached PayPal.
export class PayPalUnreachableError extends Error {}

export interface WebhookHeaders {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSig: string;
  transmissionTime: string;
}

export interface PayPalApi {
  createOrder(body: unknown, requestId: string): Promise<PayPalResponse<PayPalOrder>>;
  getOrder(orderId: string): Promise<PayPalResponse<PayPalOrder>>;
  captureOrder(orderId: string, requestId: string): Promise<PayPalResponse<PayPalOrder>>;
  verifyWebhookSignature(rawBody: string, headers: WebhookHeaders, webhookId: string): Promise<boolean>;
}

type FetchLike = typeof fetch;

export interface ClientOptions {
  clientId: string;
  clientSecret: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  retries?: number;
  sleep?: (ms: number) => Promise<void>;
}

export function createPayPalClient(opts: ClientOptions): PayPalApi {
  const doFetch = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const retries = opts.retries ?? 2;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let token: { value: string; expiresAt: number } | undefined;

  async function send(url: string, init: RequestInit): Promise<Response> {
    // Retries reuse the identical request (and therefore the same PayPal-Request-Id),
    // so PayPal de-duplicates and a retry can never create a second order or capture.
    let lastErr: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) await sleep(200 * 2 ** (attempt - 1) + Math.floor(Math.random() * 100));
      try {
        const res = await doFetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
        if ((res.status >= 500 || res.status === 429) && attempt < retries) {
          lastErr = new Error(`HTTP ${res.status}`);
          continue;
        }
        return res;
      } catch (err) {
        lastErr = err;
      }
    }
    throw new PayPalUnreachableError(`PayPal unreachable: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
  }

  async function accessToken(): Promise<string> {
    if (token && Date.now() < token.expiresAt) return token.value;
    const res = await send(`${PAYPAL_BASE}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${opts.clientId}:${opts.clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) throw new PayPalError(res.status, "AUTHENTICATION_FAILURE", res.headers.get("paypal-debug-id"), null);
    const json = (await res.json()) as { access_token: string; expires_in: number };
    token = { value: json.access_token, expiresAt: Date.now() + Math.max(0, json.expires_in - 120) * 1000 };
    return token.value;
  }

  async function call<T>(method: string, path: string, body?: string, headers: Record<string, string> = {}): Promise<PayPalResponse<T>> {
    const res = await send(`${PAYPAL_BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json", ...headers },
      body,
    });
    const text = await res.text();
    const debugId = res.headers.get("paypal-debug-id");
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      throw new PayPalError(res.status, "NON_JSON_RESPONSE", debugId, null);
    }
    if (!res.ok) {
      const err = json as PayPalErrorBody | null;
      throw new PayPalError(res.status, err?.details?.[0]?.issue ?? err?.name ?? null, debugId ?? err?.debug_id ?? null, err);
    }
    return { status: res.status, debugId, body: json as T };
  }

  return {
    createOrder: (body, requestId) =>
      call<PayPalOrder>("POST", "/v2/checkout/orders", JSON.stringify(body), { "PayPal-Request-Id": requestId, Prefer: "return=representation" }),
    getOrder: (orderId) => call<PayPalOrder>("GET", `/v2/checkout/orders/${encodeURIComponent(orderId)}`),
    captureOrder: (orderId, requestId) =>
      call<PayPalOrder>("POST", `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, "{}", {
        "PayPal-Request-Id": requestId,
        Prefer: "return=representation",
      }),
    async verifyWebhookSignature(rawBody, h, webhookId) {
      // Splice the raw event body in verbatim: re-serialising it can change bytes and break verification.
      const payload = `{"auth_algo":${JSON.stringify(h.authAlgo)},"cert_url":${JSON.stringify(h.certUrl)},"transmission_id":${JSON.stringify(h.transmissionId)},"transmission_sig":${JSON.stringify(h.transmissionSig)},"transmission_time":${JSON.stringify(h.transmissionTime)},"webhook_id":${JSON.stringify(webhookId)},"webhook_event":${rawBody}}`;
      const res = await call<{ verification_status: string }>("POST", "/v1/notifications/verify-webhook-signature", payload);
      return res.body.verification_status === "SUCCESS";
    },
  };
}

let defaultClient: PayPalApi | undefined;
export function getPayPal(): PayPalApi {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not set");
  return (defaultClient ??= createPayPalClient({ clientId, clientSecret }));
}

const usd = (cents: number) => ({ currency_code: "USD", value: toPayPalValue(cents) });

export interface OrderContext {
  quoteHash: string;
  invoiceId: string;
  returnUrl: string;
  cancelUrl: string;
}

// Builds the Orders v2 body exclusively from a server-verified quote. Nothing from the
// client or the model reaches this function.
export function orderBodyFromQuote(quote: Quote, ctx: OrderContext) {
  return {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: "default",
        custom_id: ctx.quoteHash,
        invoice_id: ctx.invoiceId,
        description: "OpenHands Demo Store (fictional, sandbox)",
        amount: {
          ...usd(quote.totalCents),
          breakdown: {
            item_total: usd(quote.itemTotalCents),
            shipping: usd(quote.shippingCents),
            tax_total: usd(quote.taxCents),
          },
        },
        items: quote.lines.map((l) => ({
          name: `${l.name} - ${l.variantLabel}`.slice(0, 127),
          sku: l.variantId,
          quantity: String(l.quantity),
          unit_amount: usd(l.unitPriceCents),
          category: "PHYSICAL_GOODS",
        })),
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: "OpenHands Demo Store",
          locale: "en-US",
          landing_page: "LOGIN",
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
          payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
          return_url: ctx.returnUrl,
          cancel_url: ctx.cancelUrl,
        },
      },
    },
  };
}

export function approvalLink(order: PayPalOrder): string | null {
  return order.links?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href ?? null;
}

export function firstCapture(order: PayPalOrder): PayPalCapture | undefined {
  return order.purchase_units?.[0]?.payments?.captures?.[0];
}
