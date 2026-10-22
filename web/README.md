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

Environment variables: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` (sandbox), `PAYPAL_WEBHOOK_ID` (webhook endpoint rejects all events without it), `ANTHROPIC_API_KEY` (optional; without it the app uses rule-based understanding and says so on screen), `APP_BASE_URL`, and for the live buyer E2E only `PAYPAL_SANDBOX_BUYER_EMAIL` / `PAYPAL_SANDBOX_BUYER_PASSWORD`. `/api/health` reports which are configured, never their values.

Payment flow: Approve (server re-verifies, quote-hash bound) → PayPal order created from the server quote (`PayPal-Request-Id` = UUIDv5 of cart+quote) → shopper approves on PayPal (full-page redirect) → `/checkout/return` re-checks status `APPROVED`, amount, `custom_id`, and the live catalog → capture (idempotent request id) → receipt only if capture status is `COMPLETED` with the approved amount.
