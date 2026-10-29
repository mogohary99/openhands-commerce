# OpenHands Commerce — web app

Next.js 16 (App Router) + TypeScript, SQLite (better-sqlite3), PayPal Orders v2 **sandbox**, optional Claude Opus 5.5.

```bash
cd web
cp .env.example .env.local   # sandbox keys only; never commit
npm install
npm run build && npm start   # http://localhost:3000
```

| Command | What it runs |
|---|---|
| `npm run typecheck` | `tsc --noEmit` (strict, `noUncheckedIndexedAccess`) |
| `npm test` | Unit tests: verification, parser, recommendations, cart ops, AI-output validator, PayPal client, checkout state machine, webhooks (fake PayPal, in-memory SQLite) |
| `npm run test:e2e` | Playwright (system Chrome) against `next start` on :3100 — keyboard-only signature flow, axe (WCAG 2.2 AA tags), 320 px reflow + text spacing, 44 px targets, reduced motion, and LIVE sandbox tests (skipped without keys) |

Run `npm run build` before `npm run test:e2e`.

Environment variables: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` (sandbox), `PAYPAL_WEBHOOK_ID` (webhook endpoint rejects all events without it), `ANTHROPIC_API_KEY` (optional; without it the app uses rule-based understanding and says so on screen), `APP_BASE_URL`, `DATABASE_PATH` (SQLite file; hosted: on the persistent disk), `AI_TIMEOUT_MS` (default 12000), `AI_MAX_CALLS_PER_HOUR` (server-wide Claude budget, default 120; above it the rules text is used), and for the live buyer E2E only `PAYPAL_SANDBOX_BUYER_EMAIL` / `PAYPAL_SANDBOX_BUYER_PASSWORD`. All are listed in `.env.example`. To run the browser suite against a deployed site: `HOSTED_URL=https://… npm run test:e2e`. `/api/health` reports which are configured, never their values.

Payment flow: Approve (server re-verifies, quote-hash bound) → PayPal order created from the server quote (`PayPal-Request-Id` = UUIDv5 of cart+quote) → shopper approves on PayPal (full-page redirect) → `/checkout/return` re-checks status `APPROVED`, amount, `custom_id`, and the live catalog → capture (idempotent request id) → receipt only if capture status is `COMPLETED` with the approved amount.

## For judges

Everything runs on PayPal **Sandbox**; the app cannot reach live PayPal.

1. Install Node 20.9 or later. Run `cd web && npm ci && cp .env.example .env.local`.
2. Sandbox keys go in `web/.env.local` as `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`. Either:
   - **[if published:]** use the judge-only sandbox app keys listed on the Devpost page. They belong to a sandbox app made only for judging, never the project's own keys; or
   - create your own free app at developer.paypal.com → Apps & Credentials (Sandbox). Use a sandbox **business** account with country United States.
3. Set `APP_BASE_URL=http://localhost:3000`. `ANTHROPIC_API_KEY` is optional: without it the app runs on its rules and says so on screen.
4. Run `npm run build && npm start` → http://localhost:3000. `/api/health` shows which integrations are configured, never their values.
5. Pay with a sandbox **personal** account with country United States: the judge buyer on the Devpost page, or one from your own developer dashboard. Never use a real PayPal login.
