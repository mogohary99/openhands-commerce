import { expect, test } from "@playwright/test";
import { chooseLightningByKeyboard, searchByKeyboard } from "./helpers";

test("pages send a nonce CSP and the whole signature flow runs with no CSP violations", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (m) => {
    if (/Content Security Policy|Refused to (execute|load|apply)/i.test(m.text())) violations.push(m.text());
  });
  const res = await page.goto("/");
  const csp = res!.headers()["content-security-policy"] ?? "";
  expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
  expect(csp).not.toContain("unsafe-eval");
  expect(csp).toContain("frame-ancestors 'none'");
  // The nonce in the header is the one on Next's scripts, and it changes per request.
  const nonce = /'nonce-([^']+)'/.exec(csp)![1]!;
  expect(await page.locator(`script[nonce]`).count()).toBeGreaterThan(0);
  const again = (await page.request.get("/")).headers()["content-security-policy"];
  expect(again).not.toContain(nonce);

  await searchByKeyboard(page);
  await chooseLightningByKeyboard(page);
  await expect(page.locator("#problem-0")).toBeFocused(); // hydrated: focus was moved by script
  await page.locator("#approve-button").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#fix-0")).toBeFocused(); // client JS ran under the CSP
  await page.keyboard.press("Enter");
  await expect(page.locator("#fixed-panel")).toBeFocused();
  expect(violations).toEqual([]);
});

test("API responses carry a deny-all CSP", async ({ request }) => {
  const r = await request.get("/api/health");
  expect(r.headers()["content-security-policy"]).toBe("default-src 'none'; frame-ancestors 'none'");
});

test("webhook endpoint throttles bursts with 429 and Retry-After", async ({ request }) => {
  let last = 0;
  let retryAfter: string | undefined;
  for (let i = 0; i < 125; i++) {
    const r = await request.post("/api/paypal/webhook", { data: "{}", headers: { "x-forwarded-for": "203.0.113.99" } });
    last = r.status();
    retryAfter = r.headers()["retry-after"];
    if (last === 429) break;
  }
  expect(last).toBe(429);
  expect(retryAfter).toBe("60");
});
