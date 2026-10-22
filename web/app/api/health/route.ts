import { NextResponse } from "next/server";
import { isAiConfigured } from "@/lib/ai";
import { getCatalog } from "@/lib/catalog";
import { hasPayPalCredentials } from "@/lib/paypal";

export const dynamic = "force-dynamic";

// Reports which integrations are configured — never their values.
export function GET() {
  const { catalog, sha256 } = getCatalog();
  return NextResponse.json({
    ok: true,
    catalog: { id: catalog.catalogId, version: catalog.version, sha256 },
    paypal: hasPayPalCredentials() ? "sandbox-configured" : "not-configured",
    webhooks: process.env.PAYPAL_WEBHOOK_ID ? "configured" : "not-configured",
    ai: isAiConfigured() ? "claude-configured" : "rules-only",
  });
}
