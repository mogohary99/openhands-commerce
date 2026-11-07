# OpenHands Commerce — web app

Next.js 16 (App Router) + TypeScript, SQLite (better-sqlite3), PayPal Orders v2 **sandbox**, optional Claude Opus 5.5.

```bash
cd web
cp .env.example .env.local   # sandbox keys only; never commit
npm ci
npm run dev                  # http://localhost:3000 (or: npm run build && npm start)
```

| Command | What it runs |
|---|---|
| `npm run typecheck` | `tsc --noEmit` (strict, `noUncheckedIndexedAccess`) |
| `npm test` | Unit tests: verification, parser, recommendations, cart ops, AI-output validator, PayPal client, checkout state machine, webhooks (fake PayPal, in-memory SQLite) |
| `npm run test:live` | Real PayPal Sandbox (11 tests) and real Claude (7 tests); each group is skipped, with the reason printed, when its keys are missing |
| `npm run test:e2e` | Playwright (system Chrome) against `next start` on :3100 — keyboard-only signature flow, axe (WCAG 2.2 AA tags), 320 px reflow + text spacing, 44 px targets, reduced motion, and LIVE sandbox tests (skipped without keys) |

Run `npm run build` before `npm run test:e2e`.

Environment variables: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` (sandbox), `PAYPAL_WEBHOOK_ID` (webhook endpoint rejects all events without it), `ANTHROPIC_API_KEY` (optional; without it the app uses rule-based understanding and says so on screen), `APP_BASE_URL`, `DATABASE_PATH` (SQLite file; hosted: on the persistent disk), `AI_TIMEOUT_MS` (default 12000), `AI_MAX_CALLS_PER_HOUR` (server-wide Claude budget, default 120; above it the rules text is used), `CATALOG_PATH` (optional alternative catalog file), and for the live buyer E2E only `PAYPAL_SANDBOX_BUYER_EMAIL` / `PAYPAL_SANDBOX_BUYER_PASSWORD`. All are listed in `.env.example`. To run the browser suite against a deployed site: `HOSTED_URL=https://… npm run test:e2e`. `/api/health` reports which are configured, never their values.

Payment flow: Approve (server re-verifies, quote-hash bound) → PayPal order created from the server quote (`PayPal-Request-Id` = UUIDv5 of cart+quote) → shopper approves on PayPal (full-page redirect) → `/checkout/return` re-checks status `APPROVED`, amount, `custom_id`, and the live catalog → capture (idempotent request id) → receipt only if capture status is `COMPLETED` with the approved amount.

## For judges

Everything runs on PayPal **Sandbox**: test accounts and test money, never real money. The API base URL is hard-coded to `https://api-m.sandbox.paypal.com` in [`lib/paypal.ts`](lib/paypal.ts) (`PAYPAL_BASE`), with no environment override, and a unit test (`test/unit/boundaries.test.ts`) fails if that changes. Never use a real PayPal login anywhere in this app.

### 1. Prerequisites

- Node **20.9 or later** (`node -v`) and npm.
- `better-sqlite3` is a native module. `npm ci` normally downloads a prebuilt binary; if none matches your platform it compiles one, which needs Python 3 and a C++ toolchain: Xcode Command Line Tools on macOS (`xcode-select --install`), `build-essential` on Debian/Ubuntu.
- Google Chrome, only for `npm run test:e2e` (Playwright uses the system Chrome).

### 2. Your own PayPal Sandbox app (free)

1. Sign in at [developer.paypal.com](https://developer.paypal.com) (a free developer account is fine).
2. **Testing Tools → Sandbox Accounts.** PayPal creates a default sandbox **business** account (the merchant) and a default **personal** account (the buyer). If yours are not country **United States**, create one of each with country United States: our earlier non-US sandbox buyer was refused at capture with `COMPLIANCE_VIOLATION` ([`docs/qa-report.md`](../docs/qa-report.md) §3b).
3. **Apps & Credentials → Sandbox → Create App.** Pick type Merchant and the US sandbox business account. Copy the **Client ID** and **Secret**.
4. In `web/.env.local` (git-ignored):

   | Variable | Value |
   |---|---|
   | `PAYPAL_CLIENT_ID` | the sandbox app's Client ID |
   | `PAYPAL_CLIENT_SECRET` | the sandbox app's Secret |
   | `APP_BASE_URL` | `http://localhost:3000` (where PayPal sends the buyer back) |
   | `PAYPAL_WEBHOOK_ID` | leave empty locally (see Troubleshooting) |

5. To approve payments you log in at PayPal Sandbox as the sandbox **personal** account. Its email and generated password are under Sandbox Accounts → the account → View/Edit account.

### 3. Claude (optional)

Set `ANTHROPIC_API_KEY` to use Claude (`claude-opus-5-5`, [`lib/ai.ts`](lib/ai.ts)) for understanding requests and writing explanations. Without a key the app runs rules-only, and the screen says so: "Understood by our rules — please check" on the "Shopping for" card, "From our rules" on the results, and "Found and explained by our rules." on the review page. With a key you see "Understood by Claude — please check" and "Written by Claude, checked by our rules". Either way the server's rules decide whether payment is allowed. `AI_MAX_CALLS_PER_HOUR` (default 120) caps uncached Claude calls server-wide; above it the rules text is used.

### 4. Run it

```bash
cd web
npm ci
cp .env.example .env.local   # then fill in step 2 (and 3)
npm run dev                  # http://localhost:3000
```

Check http://localhost:3000/api/health: `paypal: "sandbox-configured"`, and `ai: "claude-configured"` or `"rules-only"`. It never shows values. `npm run build && npm start` runs the production build instead.

### 5. Demo script (about 2 minutes)

1. On the home page, click the first example under "Or try an example": "My phone uses USB-C. I need a charger with a cable, forty-five dollars all in." (or type it into "Describe what you need" and press "Find options").
2. The "Shopping for" card shows what was understood: budget 45.00, connector USB-C. You can edit it.
3. Under VoltLine 30W USB-C Wall Charger, choose "White + 1 m USB-C to Lightning cable", then "Add to order and review".
4. The review page focuses the problem "The cable will not fit your phone" and says "Payment is blocked until the problem above is fixed." Pressing the approve button now charges nothing.
5. Press the fix right below the problem, "Switch to the USB-C cable bundle (same price)". You see "Your order now matches" and "Total $40.62 — within your $45.00 budget."
6. Press "Approve and pay $40.62 with PayPal". You go to PayPal Sandbox. Log in as your sandbox **personal** account and complete the purchase.
7. Back in the store, the receipt reads "Payment complete: $40.62", and "How this payment was checked" shows that PayPal confirmed the capture `COMPLETED` for that amount.

Keyboard only works throughout: Tab, arrow keys between options, Enter.

### 6. Tests

| Command | Needs | Notes |
|---|---|---|
| `npm test` | nothing | Unit tests, fake PayPal, in-memory SQLite. |
| `npm run test:live` | PayPal sandbox keys; `ANTHROPIC_API_KEY` for the Claude part | Real API calls; groups without keys are skipped. |
| `npm run build && npm run test:e2e` | Chrome; port 3100 free | Starts its own server on :3100 with rules-only text (set `E2E_LIVE_AI=1` to use Claude). |

Skipped by design in `test:e2e`: the automated buyer purchase (unless `PAYPAL_SANDBOX_BUYER_EMAIL` / `PAYPAL_SANDBOX_BUYER_PASSWORD` are set), the manual purchase (`npm run purchase:manual` only) and 5 video-scene recordings (`npm run video:scenes` only). The live PayPal browser test is skipped without sandbox keys. `hosted.spec.ts` runs only with `HOSTED_URL`. `npm run test:all` runs everything in order.

### 7. Troubleshooting

- **Port 3000 in use:** stop the other process, or run `npx next dev -p 3001` (or `PORT=3001 npm start`) and set `APP_BASE_URL=http://localhost:3001` so PayPal returns to the right place.
- **`better-sqlite3` fails to install or load:** install the toolchain above, then `npm rebuild better-sqlite3`. After switching Node versions, delete `node_modules` and run `npm ci` again.
- **"PayPal couldn't start the payment":** usually a 401 from PayPal's token endpoint: the Client ID/Secret are wrong, have stray spaces, or belong to a **Live** app. Use the Sandbox tab's credentials and restart the server after editing `.env.local`.
- **"Payments aren't available on this server":** `PAYPAL_CLIENT_ID` or `PAYPAL_CLIENT_SECRET` is empty.
- **Webhooks are optional locally.** With `PAYPAL_WEBHOOK_ID` empty, `/api/health` shows `webhooks: "not-configured"` and the webhook endpoint rejects events. Purchases still work: the receipt is shown only after the app's own capture call, checked against PayPal's API, returns `COMPLETED` for the approved amount.
- **PayPal Sandbox is slow or times out:** it sometimes is ([`docs/qa-report.md`](../docs/qa-report.md) §3c). Nothing is charged twice; retry.

Evidence from a real sandbox purchase: [`docs/evidence/sandbox-purchase-manual-buyer.json`](../docs/evidence/sandbox-purchase-manual-buyer.json) (order `6DB70558VY7613132`, capture `0X564302AP931181C`, `COMPLETED`, 40.62 USD). Full QA: [`docs/qa-report.md`](../docs/qa-report.md).

**Limits:** the store and its products are fictional demo data (not other merchants), payments are sandbox only, VoiceOver was tested by the developer's AI assistant and not by blind users, and no WCAG certification is claimed.
