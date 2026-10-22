import { randomUUID } from "node:crypto";
import type { Quote } from "./verify.ts";

// Server-only PayPal Orders v2 client. Sandbox base URL is hard-coded on purpose:
// this spike must never be able to move real money.
const BASE = "https://api-m.sandbox.paypal.com";

export function hasSandboxCredentials(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

export async function getAccessToken(): Promise<string> {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not set");
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`OAuth failed: HTTP ${res.status}`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

const usd = (cents: number) => ({ currency_code: "USD", value: (cents / 100).toFixed(2) });

// Builds the Orders v2 body exclusively from a server-verified quote.
export function orderBodyFromQuote(quote: Quote, quoteHash: string) {
  return {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: "default",
        custom_id: quoteHash.slice(0, 127),
        description: "OpenHands Demo Store (sandbox)",
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
  };
}

export interface PayPalResponse<T = any> {
  status: number;
  debugId: string | null;
  body: T;
}

async function call<T>(method: string, path: string, token: string, body?: unknown, headers: Record<string, string> = {}): Promise<PayPalResponse<T>> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, debugId: res.headers.get("paypal-debug-id"), body: text ? JSON.parse(text) : null };
}

export function createOrder(token: string, body: unknown, requestId: string = randomUUID(), extraHeaders: Record<string, string> = {}) {
  return call<any>("POST", "/v2/checkout/orders", token, body, {
    "PayPal-Request-Id": requestId,
    Prefer: "return=representation",
    ...extraHeaders,
  });
}

export function getOrder(token: string, orderId: string) {
  return call<any>("GET", `/v2/checkout/orders/${encodeURIComponent(orderId)}`, token);
}

export function captureOrder(token: string, orderId: string, requestId: string, extraHeaders: Record<string, string> = {}) {
  return call<any>("POST", `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, token, undefined, {
    "PayPal-Request-Id": requestId,
    Prefer: "return=representation",
    ...extraHeaders,
  });
}
