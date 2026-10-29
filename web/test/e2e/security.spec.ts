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
  await expect(page.locator("#problem-0")).toBeFocused(); // client JS ran under the CSP: no navigation, focus moved back
  expect(page.url()).toMatch(/\/review$/);
  await page.keyboard.press("Tab");
  await expect(page.locator("#fix-0")).toBeFocused();
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

test("a server-wide webhook ceiling holds even with a made-up X-Forwarded-For on every request", async ({ request }) => {
  let limited = false;
  for (let i = 0; i < 700 && !limited; i++) {
    const r = await request.post("/api/paypal/webhook", { data: "{}", headers: { "x-forwarded-for": `198.51.${i >> 8}.${i & 255}` } });
    limited = r.status() === 429;
  }
  expect(limited).toBe(true);
});

// CSRF: Server Actions check that Origin matches the host. Proven both ways with the same
// form fields, so the test can't pass just because the request was malformed.
test("a cross-site form post to a Server Action is refused; the same post from our origin works", async ({ page }) => {
  await page.goto("/");
  await page.fill("#q", "My phone uses USB-C. I need a charger with a cable, forty-five dollars all in.");
  await page.getByRole("button", { name: "Find options" }).click();
  await page.locator("#opt-v-charger-30w-bundle-c").check();
  await page.getByRole("button", { name: /Add to order and review\W+VoltLine 30W/ }).click();
  await page.waitForURL("**/review");
  await expect(page.locator(".lines li")).toHaveCount(1);

  // The fields of the item's "Remove" form as the server renders it (before hydration React
  // swaps the form's action out), i.e. what a no-JS browser or a forged page would post.
  const html = await (await page.request.get("/review")).text();
  const form = [...html.matchAll(/<form[^>]*>([\s\S]*?)<\/form>/g)].map((m) => m[1] ?? "").find((f) => /name="line"/.test(f) && />Remove</.test(f))!;
  expect(form, "server-rendered Remove form").toBeTruthy();
  const multipart = Object.fromEntries([...form.matchAll(/<input[^>]*type="hidden"[^>]*>/g)].map((m) => [m[0].match(/name="([^"]+)"/)![1], m[0].match(/value="([^"]*)"/)?.[1] ?? ""]));
  expect(Object.keys(multipart).some((k) => k.startsWith("$ACTION_ID_"))).toBe(true);

  const evil = await page.request.post("/review", { multipart, headers: { Origin: "https://evil.example" }, maxRedirects: 0 });
  expect(evil.status()).toBeGreaterThanOrEqual(400);
  await page.reload();
  await expect(page.locator(".lines li")).toHaveCount(1); // nothing removed

  const own = await page.request.post("/review", { multipart, headers: { Origin: "http://localhost:3100" }, maxRedirects: 0 });
  expect(own.status()).toBeLessThan(400);
  await page.reload();
  await expect(page.locator("#review-title")).toHaveText("Your order is empty");
});
