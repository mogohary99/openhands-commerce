import { NextResponse } from "next/server";
import { isAiConfigured } from "@/lib/ai";
import { getCatalog } from "@/lib/catalog";
import { hasPayPalCredentials } from "@/lib/paypal";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

// Reports which integrations are configured — never their values.
// Returns 503 when the database can't be read, so the host stops routing traffic here.
export function GET() {
  const { catalog, sha256 } = getCatalog();
  let database = false;
  try {
    database = getStore().ping();
  } catch {
    database = false;
  }
  return NextResponse.json({
    ok: database,
    database: database ? "ok" : "unavailable",
    catalog: { id: catalog.catalogId, version: catalog.version, sha256 },
    paypal: hasPayPalCredentials() ? "sandbox-configured" : "not-configured",
    webhooks: process.env.PAYPAL_WEBHOOK_ID ? "configured" : "not-configured",
    ai: isAiConfigured() ? "claude-configured" : "rules-only",
    baseUrl: (process.env.APP_BASE_URL ?? "").startsWith("https://") ? "https" : "http",
  }, { status: database ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
