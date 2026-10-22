# PayPal Technical Feasibility — OpenHands Commerce

_Research date 2026-10-22. Sources: developer.paypal.com and the official hackathon pages. **Live API status (2026-10-23): sandbox integration test PASSED; full buyer approve + capture pending** (see §6)._

## 1. What the hackathon requires of PayPal

"Integrates the PayPal developer platform (using the free sandbox environment)… PayPal integration is central to the project" (https://paypalaihackathon.devpost.com/rules). No specific product is mandated. The resources page points to Agent Toolkit, MCP server, JS SDK v6, REST APIs and webhooks (https://paypalaihackathon.devpost.com/resources). **An ordinary merchant sandbox checkout with Orders v2 satisfies the requirement.**

## 2. Capability matrix

| Capability | Available to us? | Notes | Source |
|---|---|---|---|
| Developer account + Sandbox | ✓ free | Dashboard → Apps & Credentials → client ID/secret. Default sandbox **personal (buyer)** and **business (merchant)** accounts are provided. | https://developer.paypal.com/api/rest/ |
| OAuth 2.0 client credentials | ✓ | `POST https://api-m.sandbox.paypal.com/v1/oauth2/token`, Basic auth, `grant_type=client_credentials`; cache token until `expires_in`. | same |
| Orders v2 create / get / capture | ✓ | `POST /v2/checkout/orders`, `GET /v2/checkout/orders/{id}`, `POST …/{id}/capture`; `Prefer: return=representation`. | https://developer.paypal.com/docs/api/orders/v2/ |
| Server-side total validation by PayPal | ✓ | 422 `ITEM_TOTAL_MISMATCH`, `AMOUNT_MISMATCH`, `ITEM_TOTAL_REQUIRED` when the breakdown doesn't add up — a second safety net behind ours. | https://developer.paypal.com/api/rest/reference/orders/v2/errors/ |
| Idempotency (`PayPal-Request-Id`) | ✓ | Same ID → PayPal returns the original result, no reprocessing. **Retention window inconsistent in docs (6 h for Orders vs "up to 45 days" example on generic page) — design for 6 h.** Concurrent same-ID calls may fail → serialize per order on our side. | https://developer.paypal.com/api/rest/reference/idempotency/ |
| JS SDK v6 | ✓ | `paypal.createInstance`, `createPayPalOneTimePaymentSession({onApprove,onCancel,onError})`, `start({presentationMode:"auto"}, createOrderPromise)`; v5 script marked deprecated in a code comment. `onCancel` orderId may be undefined; `onError` message not buyer-safe. | https://developer.paypal.com/v5-v6 · https://developer.paypal.com/sdk/js/reference/ |
| Webhooks | ✓ | `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED / DECLINED / PENDING / REFUNDED / REVERSED`. **Use `PAYMENT.CAPTURE.DECLINED` (not DENIED) for v2.** Verify by self-verification (CRC32 + cert, works for simulator events) or `POST /v1/notifications/verify-webhook-signature` (not usable for simulator mocks). | https://developer.paypal.com/api/rest/webhooks/event-names/ · https://developer.paypal.com/api/rest/webhooks/rest/ |
| Negative testing | ✓ (needs enabling on sandbox account) | Header `PayPal-Mock-Response: {"mock_application_codes":"INSTRUMENT_DECLINED"}` on Orders create/capture etc. **Whether `INSTRUMENT_DECLINED` on capture returns the documented shape is UNVERIFIED → test day 1.** | https://developer.paypal.com/tools/sandbox/negative-testing/request-headers/ |
| PayPal Agent Toolkit (`@paypal/agent-toolkit`) | ✓ public, sandbox | Tools incl. create_order, get_order, pay_order, refunds, tracking, disputes. **We will not expose pay/capture/refund tools to the model** (see architecture). Possible read-only use (order status, tracking). | https://github.com/paypal/agent-toolkit |
| PayPal MCP server | ✓ public, sandbox | `npx -y @paypal/mcp` or remote `https://mcp.sandbox.paypal.com`. Docs warn of possible early performance issues. Same tool-scoping caveat. | https://developer.paypal.com/ai-tools/mcp-server.md |
| Agent Ready | ✗ for us | Merchant enrolment product announced Oct 2025 ("early 2026"); no developer sandbox API found. **Pitch context only.** | https://newsroom.paypal-corp.com/2025-10-28-PayPal-Launches-Agentic-Commerce-Services-to-Power-AI-Driven-Shopping |
| Store Sync | ✗ for us | Merchant catalog syndication to AI channels; no sandbox API. Context only. | same |
| ChatGPT ACP / Google UCP / Perplexity | ✗ for us | Partner-level integrations; not available to hackathon entrants. ChatGPT Instant Checkout reportedly scaled back Mar 2026. | see `competitive-landscape.md` |
| Checkout at arbitrary third-party merchants | ✗ | **We cannot and will not claim this.** We are the merchant (OpenHands Demo Store, sandbox business account). | — |
| Sponsor tech: Channel3 product API/MCP | ✓ (credits via sponsor page) | Real product data across retailers; must be meaningfully *called* to qualify for its $1,500 prize. Can't be bought through our PayPal checkout → only usable as labelled "elsewhere" price/spec evidence. Optional. | https://paypalaihackathon.devpost.com/details/channel3 |

## 3. Order lifecycle we will implement

```
cart verified (our server) ──► user explicitly approves quote Q (hash H)
   ──► POST /v2/checkout/orders  (body built ONLY from Q; custom_id=H; PayPal-Request-Id = f(cartSessionId, H))
   ──► status CREATED ──► JS SDK v6 popup (or redirect fallback) ──► buyer approves at PayPal
   ──► onApprove(orderId) ──► our server: GET order, assert status APPROVED, amount == Q.total, custom_id == H
   ──► POST …/capture (PayPal-Request-Id = f(orderId)) ──► read purchase_units[0].payments.captures[0].status
         COMPLETED → receipt  | PENDING → "processing" + webhook | DECLINED / INSTRUMENT_DECLINED → recovery (restart session, choose another funding source)
   ──► webhook PAYMENT.CAPTURE.* (verified) reconciles final state
```

Fulfil **only** on capture status `COMPLETED`, not order status (schema guidance: "Check the payment status in purchase_units[].payments.captures[].status before fulfilling").

## 4. Duplicate-payment prevention (defence in depth)

1. **Quote-bound order creation:** one order per (cart session, quote hash). The `PayPal-Request-Id` is derived from it, so a double-click/retry returns the same PayPal order.
2. **Our own idempotency table** (orderId → state machine: CREATED → APPROVED → CAPTURING → COMPLETED/PENDING/DECLINED) with a per-order lock, because PayPal's retention is short and concurrent same-ID calls can fail.
3. **Capture keyed by orderId**: re-capturing a completed order returns the stored result; PayPal additionally rejects re-capture.
4. **UI:** Approve button disabled while in flight with announced status; "already paid" receipt shown if the user returns.

## 5. Cancellation & failure handling

| Event | Detection | User experience |
|---|---|---|
| Buyer closes popup | `onCancel` | "Payment cancelled. Nothing was charged. Your cart is saved." Focus → review. |
| Popup blocked / AT can't use it | `onError` / user choice | Offer "Continue in this tab" (redirect to approve link). |
| Decline | capture 422 `INSTRUMENT_DECLINED` or capture status `DECLINED` | "PayPal couldn't use that payment method. Nothing was charged. Try another one." Restart session on same order. |
| Pending | capture status `PENDING` | "Your payment is processing. We'll confirm here." Webhook updates the receipt. |
| Price/stock changed after approval of quote | re-verify on server before create and before capture | Block, explain, ask to re-approve the new quote. |
| Order expired | GET order not found/expired | Silently re-create from saved cart after re-verification; user re-approves at PayPal. |
| PayPal 5xx / timeout | HTTP error | Retry with **same** PayPal-Request-Id; never a new ID for the same intent. |
| Tampered client total | server ignores client amounts entirely | n/a — the client never sends prices. |

## 6. Spike status — exact results

| Spike | Status | Evidence |
|---|---|---|
| Order body derived solely from verified quote, breakdown sums (40.62 = 31.99 + 5.99 + 2.64) | **PASS (offline)** | `spikes/test/paypal.test.ts` |
| LIVE: OAuth token, create order (CREATED, amount 40.62), idempotent replay returns same order id, GET order shows approve link, capture-before-approval refused (expect 422), tampered total refused (expect 422) | **PASS (2026-10-23, sandbox).** create 201 `0YA28922XJ1702225` CREATED (debug_id f14286963069a); replay with same PayPal-Request-Id → 200, same order id; approve link present; capture-before-approval → 422 `ORDER_NOT_APPROVED`; tampered total → 422 `AMOUNT_MISMATCH` | `spikes/test/paypal.test.ts` (test is written and typechecks) |
| Full approve + capture + idempotent capture replay as sandbox buyer | **NOT COMPLETED (2026-10-23):** order `946825133C0963026` ($40.62) created; script timed out after 10 min with status `CREATED` because no sandbox buyer approved it. Nothing captured. Automated in `web/test/e2e/live-paypal.spec.ts` once `PAYPAL_SANDBOX_BUYER_EMAIL`/`PASSWORD` are set in `web/.env.local`. | `spikes/scripts/sandbox-checkout.ts` |
| Webhooks, negative testing (`INSTRUMENT_DECLINED`) | **NOT STARTED** | Planned day 1–2 of build |

**No PayPal API test has been executed. Nothing above should be read as a passed live test.**

### To unblock (≈10 minutes, by you)

1. Log in at https://developer.paypal.com → Apps & Credentials → **Sandbox** → Create App → copy Client ID / Secret.
2. `cp spikes/.env.example spikes/.env.local` and paste them (file is git-ignored).
3. `cd spikes && npm test` → runs the live sandbox test.
4. `node --env-file=.env.local --import tsx scripts/sandbox-checkout.ts` → open printed link, log in with the **sandbox personal account** from Testing Tools → Sandbox Accounts, approve; the script captures and prints status.

## 7. Feasibility verdict

**Feasible with standard, publicly available sandbox APIs.** Nothing in the core plan depends on special access. The agentic-commerce products (Agent Ready, Store Sync, ACP/UCP) are context for the pitch, not dependencies. Remaining risk is confined to (a) running the live tests above, (b) negative-testing behaviour, (c) PayPal popup behaviour with screen readers.

## 7. Live negative-testing results (2026-10-23)

`PayPal-Mock-Response: {"mock_application_codes": "<CODE>"}` on `POST /v2/checkout/orders/{id}/capture` returned: `INSTRUMENT_DECLINED`, `TRANSACTION_REFUSED`, `MAX_NUMBER_OF_PAYMENT_ATTEMPTS_EXCEEDED`, `PAYER_ACTION_REQUIRED` → HTTP 422 with only an `information_link`; `INTERNAL_SERVER_ERROR` → HTTP 500. The mock is returned even when the buyer hasn't approved. Unknown order → 404 `INVALID_RESOURCE_ID`; edited quantity → 422 `ITEM_TOTAL_MISMATCH`; EUR amount with USD breakdown → 422 `MULTI_CURRENCY_ORDER`; fake webhook verification → 400. Full table: `docs/qa-report.md` §3.
