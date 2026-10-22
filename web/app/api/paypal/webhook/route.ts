import { NextResponse } from "next/server";
import { handleWebhook } from "@/lib/checkout";
import { getDeps } from "@/lib/runtime";

export const dynamic = "force-dynamic";

// PayPal webhooks. Every event is verified with PayPal's verify-webhook-signature API
// before it is read; without PAYPAL_WEBHOOK_ID configured, all events are rejected.
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 256_000) return NextResponse.json({ message: "Too large" }, { status: 413 });
  const h = req.headers;
  const out = await handleWebhook(
    getDeps(),
    raw,
    {
      authAlgo: h.get("paypal-auth-algo") ?? undefined,
      certUrl: h.get("paypal-cert-url") ?? undefined,
      transmissionId: h.get("paypal-transmission-id") ?? undefined,
      transmissionSig: h.get("paypal-transmission-sig") ?? undefined,
      transmissionTime: h.get("paypal-transmission-time") ?? undefined,
    },
    process.env.PAYPAL_WEBHOOK_ID || undefined,
  );
  return NextResponse.json({ message: out.message }, { status: out.status });
}
