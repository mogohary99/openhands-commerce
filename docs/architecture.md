# Architecture: OpenHands Commerce (as built, 2026-10-24)

This describes the code in `web/`. The original Phase 0 design (Radix and Tailwind, a chat endpoint, read-only model tools, Postgres, the PayPal JS SDK popup) was simplified during the build, and this document replaces it. Git history has the old version.

## 1. Stack

| Layer | What's actually used |
|---|---|
| App | Next.js 16 App Router, React 19, TypeScript strict. **Server Actions** for every state change (`app/actions.ts`). Route handlers only for the PayPal return/cancel URLs, the webhook and the health check |
| UI | Hand-written components and CSS design tokens (`app/globals.css`). Atkinson Hyperlegible via `next/font` (self-hosted at build). No UI framework |
| Database | SQLite (better-sqlite3, WAL) at `DATABASE_PATH`: shopping state, carts, orders (the state machine), webhook event ids, audit log (`lib/store.ts`) |
| Catalog | `data/catalog.json` (a fictional store), Zod-validated, versioned (`lib/catalog.ts`) |
| AI | Claude Opus 5.5 (`claude-opus-5-5`) via `@anthropic-ai/sdk`, structured outputs, **no tools**, 12 s timeout, rule-based fallback for everything (`lib/ai.ts`) |
| Payments | PayPal **Orders v2 REST**, Sandbox only (base URL hard-coded). **Full-page redirect** to PayPal's approval link. Webhook signature verification (`lib/paypal.ts`, `lib/checkout.ts`) |
| Tests | node:test (unit, live), Playwright + axe-core (E2E, a11y) |
| Hosting | Prepared for Render (one instance + disk), not deployed (`docs/deployment.md`) |

## 2. Request flow

```
Browser (plain HTML forms posting to Server Actions; client JS adds focus moves, voice input, read-aloud)
  │  sends only: free text, variant ids, quantities, fix choices, the quote hash shown
  ▼
Server Actions (app/actions.ts) ─ rate limit per session + IP (lib/ratelimit.ts)
  ├─ searchAction ──► lib/ai.extractShoppingFor ──(fails/invalid)──► rule parser (lib/constraints.ts)
  │                   lib/recommend.ts (deterministic) ──► lib/ai.introduceRecommendations (text only, validated)
  ├─ addToOrder / fix / quantity / remove ──► cart (lib/cart.ts) ──► lib/verify.ts
  │                                          findings + Quote (integer cents) + quoteHash
  │                                          lib/ai.explainFindings (text only, validated, else rule text)
  └─ approveAction(quoteHash) ──► lib/checkout.beginPayment
         re-verify cart → hash must equal what the shopper approved
         order row APPROVED_BY_USER → PayPal POST /v2/checkout/orders
           (PayPal-Request-Id = uuidv5(create:cart:quoteHash:attempt), custom_id = quoteHash,
            full breakdown, return/cancel URLs from APP_BASE_URL)
         → PAYPAL_CREATED → 303 redirect to PayPal's approval page
                                  │ shopper logs in and approves at PayPal Sandbox
                                  ▼
GET /checkout/return?token=… ──► lib/checkout.completePayment
     compare-and-set → CAPTURING (one capture at a time; stale lock after 2 min → CAPTURE_UNKNOWN)
     GET order: must be APPROVED, USD, amount == quote total, custom_id == quoteHash, else FAILED
     re-verify cart against the live catalog: a changed quote → NEEDS_REAPPROVAL (nothing captured)
     POST …/capture (PayPal-Request-Id = uuidv5(capture:orderId))
       COMPLETED + amount verified → COMPLETED, cart closed → /receipt/{id}
       PENDING → PENDING · 422 decline → DECLINED · refused → FAILED/re-approve
       5xx / network → CAPTURE_UNKNOWN (never "failed", never "paid"); "Check again" reconciles via GET
GET /checkout/cancel → CANCELLED, cart kept, "Nothing was charged."
POST /api/paypal/webhook → verify-webhook-signature (needs PAYPAL_WEBHOOK_ID, else 503)
     → dedupe event id → reconcile with GET order (a webhook never marks anything paid by itself)
```

## 3. Trust boundaries

1. **The model has no authority.** It gets no tools. `lib/ai.ts` can't import PayPal, checkout, store, session or runtime (a unit test enforces this). Its outputs are text and constraint fields, validated: no dollar amounts outside the quote or budget, no claims that anything was paid or ordered, no unknown product ids, every finding covered. Failing output is replaced by rule-based text, and the badge says which one is showing.
2. **Only the server sets prices.** Totals come from the catalog in `lib/verify.ts`. The browser never sends amounts. A forged quantity is refused (E2E test).
3. **Approval is bound to a quote.** The shopper approves a specific `quoteHash`. PayPal's `custom_id` carries it, and capture checks it again together with the amount and currency.
4. **Session ownership.** The cookie is a random 128-bit id (httpOnly, SameSite=Lax, Secure on https). Receipts and orders are looked up by session, and any other session gets a 404 (E2E test).
5. **Untrusted text.** Customer reviews are passed to the model inside `<untrusted_reviews>` and never used for prices. A planted injection review is covered by unit and live tests.
6. **Browser hardening.** Per-request nonce CSP (`lib/csp.ts`, `proxy.ts`); `form-action` allows only the app and PayPal Sandbox; `frame-ancestors 'none'`; HSTS on https; deny-all CSP on `/api/*`.
7. **Logging.** One JSON line per server error, with no query strings, bodies, cookies or tokens (`instrumentation.ts`). PayPal `debug_id`s go in the audit log.

## 4. Order state machine (`lib/store.ts` OrderState)

```
APPROVED_BY_USER ─create→ PAYPAL_CREATED ─return→ CAPTURING ─┬→ COMPLETED
        │                      │    ▲                        ├→ PENDING
        │                      │    └─ not approved yet ─────┤
        │                      └─cancel→ CANCELLED           ├→ DECLINED ─(retry at PayPal)→ CAPTURING
        │                                                    ├→ CAPTURE_UNKNOWN ─reconcile→ COMPLETED | …
        └─ cart/catalog changed → NEEDS_REAPPROVAL            ├→ NEEDS_REAPPROVAL
                                                             └→ FAILED (mismatch / refused)
```

Every transition is a compare-and-set `UPDATE … WHERE state IN (…)`. A double click, a refresh or a replayed return URL finds the row already past `CAPTURING`, and gets the same receipt. PayPal's request-id idempotency is the second guard (verified live with PayPal for create; for capture it's in the buyer test, which is still blocked).

## 5. Accessibility architecture

- One polite live region at the root (`#sr-status`) for announcements like "Payment is blocked…".
- `FocusOnMount` moves focus after each navigation, to the problem panel, the success panel, a notice, the results heading or the receipt title. It waits until the page has its `<title>`, a fix from 2026-10-24 (see the QA report).
- The blocked Approve button stays focusable, with `aria-disabled` and a description of the reason. Pressing it moves focus to the fix.
- Progress navigation uses `aria-current="step"`. The comparison table has real `th` scopes. Targets are at least 44 px. Light and dark themes, forced colours and reduced motion are supported.

## 6. Tests (counts in `docs/qa-report.md`)

| Level | Where |
|---|---|
| Unit | `web/test/unit`: verification rules, money, constraints, AI validators and fallbacks, boundaries, checkout state machine against a fake PayPal (failures, races, stale locks, webhooks), CSP and rate limits |
| Live | `web/test/live`: PayPal Sandbox (create, idempotent replay, capture refused before approval, negative testing via `PayPal-Mock-Response`, webhook verify); Claude (skipped without a key) |
| E2E | `web/test/e2e`: keyboard-only signature flow, a11y tree, axe on every page state (receipt via fixtures), reflow/zoom/forced colours/motion, CSP, security, recovery notices, PayPal create/cancel (live sandbox), buyer purchase (skipped without credentials), manual purchase (`npm run purchase:manual`) |
