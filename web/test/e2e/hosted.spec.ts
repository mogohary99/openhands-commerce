import { expect, test } from "@playwright/test";
import { chooseLightningByKeyboard, expectNoAxeViolations, reachApprovedQuote, searchByKeyboard } from "./helpers";
import { paypalGetOrder } from "./paypal-verify";

// Hosted-only checks (HOSTED_URL=https://… npm run test:e2e). They need the real host: TLS,
// the proxy in front of the app, the persistent configuration and PayPal reaching us.
// Nothing here pays: the PayPal order is created and then cancelled on PayPal's own page.
const BASE = process.env.HOSTED_URL!.replace(/\/$/, "");

test("health: database, PayPal Sandbox, Claude and https configured", async ({ request }) => {
  const r = await request.get("/api/health");
  expect(r.status()).toBe(200);
  expect(r.headers()["cache-control"]).toBe("no-store");
  const h = await r.json();
  expect(h).toMatchObject({ ok: true, database: "ok", paypal: "sandbox-configured", ai: "claude-configured", baseUrl: "https" });
});

test("health: PayPal webhook ID configured", async ({ request }) => {
  expect((await (await request.get("/api/health")).json()).webhooks).toBe("configured");
});

test("plain http is redirected to https; pages send HSTS, nonce CSP and the hardening headers", async ({ request }) => {
  const http = await fetch(BASE.replace(/^https:/, "http:") + "/", { redirect: "manual" });
  expect([301, 302, 307, 308]).toContain(http.status);
  expect(http.headers.get("location") ?? "").toMatch(/^https:\/\//);

  const h = (await request.get("/")).headers();
  expect(h["strict-transport-security"]).toBe("max-age=31536000; includeSubDomains");
  expect(h["content-security-policy"]).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
  expect(h["content-security-policy"]).toContain("upgrade-insecure-requests");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
});

test("session cookie is Secure, HttpOnly and SameSite=Lax", async ({ page, context }) => {
  await searchByKeyboard(page);
  const sid = (await context.cookies()).filter((c) => c.domain.includes(new URL(BASE).hostname));
  expect(sid.length).toBeGreaterThan(0);
  for (const c of sid) expect({ name: c.name, secure: c.secure, httpOnly: c.httpOnly, sameSite: c.sameSite }).toEqual({ name: c.name, secure: true, httpOnly: true, sameSite: "Lax" });
});

test("live Claude on the hosted site: results say they were written by Claude and checked by rules", async ({ page }) => {
  await searchByKeyboard(page);
  await expect(page.locator("#results .badge").first()).toHaveText("Written by Claude, checked by our rules");
});

test("webhook: an unsigned event is refused; a forged signature is refused after PayPal's verification", async ({ request }) => {
  const unsigned = await request.post("/api/paypal/webhook", { data: { id: "WH-FORGED", event_type: "PAYMENT.CAPTURE.COMPLETED" } });
  expect(unsigned.status()).toBe(400);
  expect((await unsigned.json()).message).toBe("Missing PayPal transmission headers");

  const forged = await request.post("/api/paypal/webhook", {
    data: { id: "WH-FORGED-2", event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { id: "0X564302AP931181C" } },
    headers: {
      "paypal-auth-algo": "SHA256withRSA",
      "paypal-cert-url": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360caa42-fca2a594-1d93a270",
      "paypal-transmission-id": "00000000-0000-0000-0000-000000000000",
      "paypal-transmission-sig": "Zm9yZ2Vk",
      "paypal-transmission-time": new Date().toISOString(),
    },
  });
  expect(forged.status()).toBe(400);
  expect((await forged.json()).message).toBe("Signature verification failed");
});

test("rate limits hold when the client sends made-up X-Forwarded-For addresses", async ({ request }) => {
  let limited = false;
  for (let i = 0; i < 130 && !limited; i++) {
    const r = await request.post("/api/paypal/webhook", { data: "{}", headers: { "x-forwarded-for": `198.51.100.${i % 250}` } });
    limited = r.status() === 429;
  }
  expect(limited, "spoofed X-Forwarded-For gave every request a fresh rate-limit bucket").toBe(true);
});

test("PayPal Sandbox: order created from the hosted site, cancelled on PayPal's page, back here with nothing charged", async ({ page }) => {
  await reachApprovedQuote(page);
  await Promise.all([page.waitForURL(/sandbox\.paypal\.com/, { timeout: 60_000, waitUntil: "commit" }), page.locator("#approve-button").click()]);
  const token = new URL(page.url()).searchParams.get("token")!;
  test.info().annotations.push({ type: "paypal-order", description: token });
  const o = await paypalGetOrder(token);
  expect(o.status).toBe(200);
  expect(o.body.purchase_units[0].amount.value).toBe("40.62");

  // PayPal's own "Cancel and return" link. Its target is the cancel_url this host gave PayPal.
  const cancel = page.locator('a:has-text("Cancel and return"), a:has-text("Cancel"), button:has-text("Cancel and return")').first();
  await cancel.waitFor({ timeout: 60_000 });
  await Promise.all([page.waitForURL((u) => u.href.startsWith(`${BASE}/`), { timeout: 60_000 }), cancel.click()]);
  expect(page.url()).toContain(`${BASE}/`);
  await expect(page.locator("#review-notice")).toContainText("Nothing was charged");
  expect((await paypalGetOrder(token)).body.purchase_units[0].payments?.captures ?? []).toHaveLength(0);
});

test.describe("phone-sized screen", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });

  test("signature flow fits the screen with no sideways scrolling, and passes axe", async ({ page }) => {
    const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await searchByKeyboard(page);
    expect(await overflow()).toBeLessThanOrEqual(0);
    await expectNoAxeViolations(page, "hosted results, phone");
    await chooseLightningByKeyboard(page);
    expect(await overflow()).toBeLessThanOrEqual(0);
    await expectNoAxeViolations(page, "hosted blocked review, phone");
    await page.locator("#fix-0").tap();
    await expect(page.locator("#fixed-panel")).toBeVisible();
    await expect(page.locator("#fixed-panel")).toContainText("$40.62");
    expect(await overflow()).toBeLessThanOrEqual(0);
  });
});
