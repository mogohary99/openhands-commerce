import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";

// Anonymous shopping session: a random 128-bit id in an httpOnly cookie. All cart and
// order state lives on the server, keyed by this id.
const COOKIE = "ohc_sid";
const VALID = /^[A-Za-z0-9_-]{22}$/;

export async function readSessionId(): Promise<string | null> {
  const v = (await cookies()).get(COOKIE)?.value;
  return v && VALID.test(v) ? v : null;
}

// Only callable from Server Actions and Route Handlers (where cookies can be set).
export async function ensureSessionId(): Promise<string> {
  const existing = await readSessionId();
  if (existing) return existing;
  const id = randomBytes(16).toString("base64url");
  (await cookies()).set(COOKIE, id, {
    httpOnly: true,
    // Lax so the cookie comes back on PayPal's top-level redirect to our return URL.
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && (process.env.APP_BASE_URL ?? "").startsWith("https://"),
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return id;
}
