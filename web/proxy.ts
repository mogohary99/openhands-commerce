import { type NextRequest, NextResponse } from "next/server";
import { buildCsp, newNonce } from "@/lib/csp";

// Adds a fresh CSP nonce to every page request. Every page is dynamically rendered (the
// layout reads the session cookie), so Next.js can stamp the nonce on its scripts.
export function proxy(request: NextRequest) {
  const nonce = newNonce();
  // Read at request time, not build time, so one build works locally and when hosted.
  const https = (process.env.APP_BASE_URL ?? "").startsWith("https://");
  const csp = buildCsp(nonce, { dev: process.env.NODE_ENV === "development", https });
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", csp);
  if (https) res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return res;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
