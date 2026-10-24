# Technical QA Report — OpenHands Commerce MVP

_Run dates: 2026-10-23, updated 2026-10-24 (local, macOS 26.2, Node 20.20.2, Chrome via Playwright 1.64.1). Latest results are for commit `fd0297c` and later._

Legend: **LIVE** = real call to PayPal Sandbox / Anthropic. **AUTO** = automated, no external service. **MANUAL** = performed by a person. **NOT RUN** = not executed (reason given).

## 1. Summary

| Question | Answer |
|---|---|
| Did a real sandbox buyer approve a payment? | **No.** `PAYPAL_SANDBOX_BUYER_EMAIL`/`PASSWORD` are still empty in `web/.env.local` (checked 2026-10-24), and the PayPal developer dashboard requires the owner's Face ID / Touch ID login, which we do not bypass. |
| Does PayPal independently confirm a capture? | **No capture exists yet.** The buyer-flow test that asserts it via `GET /v2/checkout/orders/{id}` is written and **skipped**. |
| Was live Claude tested? | **No.** `ANTHROPIC_API_KEY` is not set; 4 live tests skipped. Fallback paths were tested through the real SDK against a local fake server (AUTO). |
| Was real assistive-technology testing performed? | **No.** No VoiceOver/NVDA/Voice Control/Switch Control session and no testing with disabled users. Chrome's accessibility tree was inspected automatically. |
| Real money? | None possible: PayPal base URL hard-coded to sandbox; enforced by a unit test. |

## 2. Commands and exact results (2026-10-24, `npm run test:all`, exit 0)

| Command | Result |
|---|---|
| `web: npm run typecheck` | clean |
| `web: npm test` (AUTO unit) | **81 tests, 81 pass, 0 fail, 0 skipped** |
| `web: npm run test:live` (LIVE) | **15 tests, 11 pass, 0 fail, 4 skipped** (Claude: `ANTHROPIC_API_KEY not set`) |
| `web: npm run build` | ok |
| `web: npm run test:e2e` (AUTO + LIVE) | **28 tests, 27 pass, 0 fail, 1 skipped** (buyer purchase: `PAYPAL_SANDBOX_BUYER_EMAIL / PAYPAL_SANDBOX_BUYER_PASSWORD not set`) |
| `spikes: npm test` | 26 tests, 23 pass, 0 fail, 3 skipped (Claude key) |
| `web: npm audit --omit=dev` | 0 vulnerabilities |

**Flake observed:** in 1 of ~10 full E2E runs on 2026-10-24, `signature.spec.ts` failed once (run immediately after other local servers had been started/stopped); it then passed 9 consecutive full runs and 3 isolated runs, and the failure could not be reproduced. Earlier focus-timing flakes (tests asserting focus before hydration) were fixed by waiting for the focus move as a shopper would.

Previous run (2026-10-23): unit 78/78, live 11 pass/4 skipped, E2E 20 pass/1 skipped.

### 2a. Release gates

| Gate | Status |
|---|---|
| TypeScript clean | **PASS** |
| Production build | **PASS** |
| Unit tests | **PASS** (81/81) |
| Browser E2E | **PASS** (27/27 run; 1 skipped = buyer purchase) |
| Real sandbox buyer-approved capture | **BLOCKED** — buyer credentials not provided |
| PayPal-verified amount and currency of a capture | **BLOCKED** — same (test asserts `COMPLETED`, `USD`, `40.62`, one capture after refresh/replays/re-capture; written, not run) |
| No known duplicate-charge vulnerability | **PASS (no known issue)** — AUTO + LIVE pre-approval evidence; post-capture replay against real PayPal is **BLOCKED** |
| AI fallback when Claude fails | **PASS** (AUTO through the real SDK against a fake server) |
| Live Claude | **NOT TESTED** — no `ANTHROPIC_API_KEY` |
| Accessible keyboard journey | **PASS** (AUTO) |
| Screen-reader evaluation | **NOT TESTED** (manual VoiceOver/NVDA pass not done) |
| Testing with disabled users | **NOT TESTED** |
| No exposed credentials in repo | **PASS** (secret still needs rotation: it's in one chat transcript) |
| No open critical/high security defects | **PASS (none known)** |
| Hosted deployment | **NOT TESTED** — prepared (`render.yaml`), not deployed (needs approval) |
| Demo video recorded | **NOT DONE** — script ready |
| Devpost submission | **DRAFT** — `docs/submission/devpost.md` |

## 3. Live PayPal Sandbox evidence

All against `api-m.sandbox.paypal.com` with the project's sandbox REST app. Failure responses were produced **by PayPal** using the documented `PayPal-Mock-Response` negative-testing header.

| Scenario | How produced | Observed (real) | Our handling |
|---|---|---|---|
| Create order from verified quote | `test/live` + E2E via UI | 201/200, `PAYER_ACTION_REQUIRED`, amount 40.62, breakdown 31.99/5.99/2.64, `custom_id` = quote hash, `payer-action` link (e.g. order `33R5775492754041G`) | redirect to PayPal |
| Same `PayPal-Request-Id` replay | live | same order id | double click = one order |
| Approve twice from the store | E2E (LIVE) | same PayPal token | reuse stored approval link |
| Capture before buyer approval | live + E2E return-URL visit | 422 `ORDER_NOT_APPROVED`; independent GET shows 0 captures | "PayPal hasn't confirmed your approval… nothing was charged" |
| Buyer cancels | E2E hits our `cancel_url` with a real token | — | CANCELLED, cart kept, focused notice |
| `INSTRUMENT_DECLINED` on capture | mock header | 422, only `information_link` (no redirect link) | DECLINED, retry via stored approve URL |
| `TRANSACTION_REFUSED`, `MAX_NUMBER_OF_PAYMENT_ATTEMPTS_EXCEEDED` | mock header | 422 | **was mis-mapped → fixed**: "refused", new order on re-approve |
| `PAYER_ACTION_REQUIRED` | mock header | 422 | treated as declined/retry |
| `INTERNAL_SERVER_ERROR` on capture | mock header | 500 ×3 (client retried with identical request id) | **was FAILED → fixed**: CAPTURE_UNKNOWN, reconcile |
| Tampered quantity | edited body | 422 `ITEM_TOTAL_MISMATCH` | our server never sends client values; PayPal is a backstop |
| Currency switched to EUR | edited body | 422 `MULTI_CURRENCY_ORDER` | plus our own currency assertion before capture |
| Unknown/expired order | GET random id | 404 `INVALID_RESOURCE_ID` | **added** "expired" mapping |
| Forged webhook | verify API with fake headers | 400 from PayPal | **was 502 → fixed**: 400 rejection, not recorded |

**Caveat (honest):** mocked decline codes were returned on an order the buyer had **not** approved; PayPal's mock overrides normal processing. This proves our parsing of PayPal's real error payloads, not PayPal's decline logic. A post-approval decline needs the buyer flow.

**Not produced live:** PENDING capture, completed capture, refunds, real webhook delivery (needs a public URL + `PAYPAL_WEBHOOK_ID`). These are covered by AUTO tests with a fake PayPal only.

Earlier manual script order `946825133C0963026` was never approved; it timed out at `CREATED`; nothing captured.

## 4. Payment failure & security matrix

| Requirement | Evidence |
|---|---|
| Buyer cancellation | E2E LIVE token + unit |
| Declined/refused | LIVE mock payloads + unit (state + copy) |
| Approval without capture | LIVE (0 captures confirmed via API) |
| Network interruptions | unit: transport failure → CAPTURE_UNKNOWN → reconcile with same request id; 5xx retry LIVE |
| Duplicate requests | unit: 3 concurrent approvals → 1 order; 2 concurrent returns → 1 capture; LIVE replay |
| Replay of return URLs | unit: second return after COMPLETED → no capture; E2E: forged token → "didn't take any payment" |
| Manipulated price/quantity | unit + E2E: forged quantity 999 refused; client never sends price; guard bypass refused by server (E2E) |
| Catalog change review→approve / approve→capture | unit: PRICE_CHANGED blocks approval; post-approval change → NEEDS_REAPPROVAL, no capture |
| Expired/invalid orders | LIVE 404 shape + unit mapping |
| Webhook authenticity/replay | unit: 503 unconfigured, 400 unsigned/invalid, PayPal-400 → 400, unreachable → 502, duplicate event id ignored, payload can't mark paid (state comes from GET order); LIVE forged → 400 |
| Unexpected amount/currency | unit: amount and currency mismatch before capture → no capture; captured amount ≠ approved → FAILED, no receipt |
| Process crash mid-capture | unit: stale CAPTURING lock recovered after 2 min, one capture |

## 5. Security review

| Area | Status |
|---|---|
| Secrets in git | **None.** Secret value searched across all commits and tracked files: 0 hits. `.env*` ignored (only `.env.example` tracked). |
| Secret exposure elsewhere | The sandbox client secret appears in **one local Claude Code transcript** (pasted into chat on 2026-10-23). Not in logs, build output or test artifacts. **Rotate before the repo goes public** (steps below). |
| Secrets to the browser | None: no `NEXT_PUBLIC_*` vars; client components cannot import server modules (unit-tested); `/api/health` reports configured/not-configured only. |
| Real money | Sandbox base hard-coded; unit test fails if a live host or env override appears. |
| AI authority | `lib/ai.ts` imports nothing from payments/session/store and passes no tools (unit-tested). All model text validated; budget hallucination guarded. |
| CSRF | All mutations are Server Actions (Next.js Origin check). PayPal return/cancel are GETs bound to the session cookie and to an order owned by that session. |
| Session | 128-bit random id, httpOnly, SameSite=Lax (needed for PayPal's top-level return), Secure when served over https. |
| Headers | `X-Frame-Options: DENY`, `nosniff`, strict referrer, Permissions-Policy (verified with curl). |
| Content-Security-Policy (added 2026-10-24) | Per-request nonce via `proxy.ts`: `script-src 'self' 'nonce-…' 'strict-dynamic'` (no `unsafe-eval` in production), `form-action 'self' https://www.sandbox.paypal.com`, `frame-ancestors 'none'`, `object-src 'none'`, `upgrade-insecure-requests` + HSTS only when `APP_BASE_URL` is https (decided at runtime). Inline **styles** stay allowed on purpose so shoppers' text-spacing/contrast tools keep working; CSS can't run script. `/api/*` gets `default-src 'none'`. E2E: header present, nonce rotates, zero CSP violations through the signature flow. |
| Rate limits (added 2026-10-24) | In-process, per session and per address: search 20/min (each may call Claude), cart edits 60/min, approval 10/min (each may create a PayPal order), PayPal return 20/min, webhooks 120/min → 429 + `Retry-After`. Over-limit requests change nothing and say nothing was charged. Unit + E2E tested. |
| Error logging (added 2026-10-24) | `instrumentation.ts`: one JSON line per server error, path without query string, no bodies/cookies/headers/tokens. |
| Authorization | Anonymous shopping; every cart, order and receipt is bound to the session cookie and checked on each request (receipt of another session → 404). No accounts, so no passwords stored. |
| Input validation | Zod/regex on every form field; PayPal tokens `^[A-Z0-9]{10,40}$`; webhook body ≤ 256 KB. |
| Dependencies | `npm audit --omit=dev`: 0 vulnerabilities. |
| Logging | AI fallbacks log job + error class only; no request text, keys, or PayPal tokens. |

**Rotating the sandbox secret:** developer.paypal.com → log in → *Apps & Credentials* → make sure the **Sandbox** toggle is selected → open the app → under *Secret key*, *Generate new secret* (or add a second secret, switch, then delete the old one) → paste the new value into `web/.env.local` and `spikes/.env.local` yourself → `npm run test:live` to confirm.

## 6. Accessibility findings

| Check | Type | Result |
|---|---|---|
| axe (WCAG 2.0/2.1/2.2 A/AA + best practice): home light/dark, results, review blocked (light/dark), review fixed, 5 recovery notices | AUTO | 0 violations |
| Keyboard-only signature flow: skip link → search → results → arrow keys to Lightning → add → focus on problem → Approve does nothing but announce + move focus → Enter fixes | AUTO (Playwright keyboard) | pass |
| Chrome accessibility tree at the signature moment: region "The cable will not fit your phone" with the explanation as description; Approve = button, disabled, described by "Payment is blocked until the problem above is fixed."; fix button name; success region name/description with "$40.62 — within your $45.00 budget" | AUTO (CDP) | pass |
| Live region text after blocked Approve | AUTO | pass |
| Recovery states (cancelled, declined, refused, expired, reapprove) focused and say "Nothing was charged" | AUTO | pass |
| 320 px reflow + WCAG text spacing; 400 %-equivalent (320×256) full flow | AUTO | no horizontal scroll |
| 200 % text | AUTO | content visible |
| Target size ≥ 44×44 | AUTO | pass |
| Reduced motion | AUTO | transitions ≈ 0 |
| Forced colors | AUTO | border + fix button visible |
| Voice input (Web Speech) | **NOT RUN** — needs a microphone and a person; code path feature-detected, never auto-submits |
| macOS VoiceOver | **NOT RUN** — VoiceOver AppleScript control is disabled on this Mac; enabling it is a system security setting we did not change |
| NVDA / JAWS / TalkBack / iOS VoiceOver / Voice Control / Switch Control | **NOT RUN** |
| PayPal's hosted pages | **NOT TESTED** (third-party; we cannot fix them) |
| Usability with disabled people | **NOT RUN** — none recruited yet |

No WCAG conformance claim is made. Automated checks catch a minority of issues; manual screen-reader passes and sessions with AT users remain required.

## 6b. UX additions (2026-10-24) and how they were checked

| Addition | Check | Type |
|---|---|---|
| Home: labelled example of a caught mistake and its fix | E2E: figure named "What a check looks like", says "An example." | AUTO |
| Progress steps with `aria-current="step"` | E2E | AUTO |
| Comparison table (catalog facts, server all-in prices), `th scope`, keyboard-scrollable named region | E2E + axe | AUTO |
| "Read this problem aloud" (browser speech, never auto-plays; after the fix in tab order) | E2E: present, not speaking on load, order | AUTO; **audio output not verified by a person** |
| Receipt "How this payment was checked" | asserted in the live buyer test | **BLOCKED** (needs a real capture) |
| Success-panel arrival cue is movement-only | axe caught a mid-fade contrast failure; fixed | AUTO |

## 7. Remaining blockers (need the owner)

1. **Sandbox buyer login** → add `PAYPAL_SANDBOX_BUYER_EMAIL` / `PAYPAL_SANDBOX_BUYER_PASSWORD` to `web/.env.local` (developer.paypal.com → Testing Tools → Sandbox Accounts → the *Personal* account → ⋯ → View/Edit → copy email and password). The dashboard login required a CAPTCHA, which we do not solve. Then `cd web && npm run build && npm run test:e2e`.
2. **`ANTHROPIC_API_KEY`** → `npm run test:live`.
3. **Rotate the sandbox client secret** (§5).
4. **Manual AT testing** → VoiceOver (enable it yourself: ⌘F5) with the checklist in `docs/demo-checklist.md`; recruit AT users.
5. **Webhooks** need a hosted HTTPS URL + `PAYPAL_WEBHOOK_ID` (hosting is held until you approve deployment).

Status 2026-10-24: blockers 1–5 unchanged. Re-checked: buyer and Anthropic keys still empty; the developer dashboard asks for the owner's Face ID / Touch ID login.

## 8. Known limitations (not bugs)

- PayPal approval uses full-page redirect; the JS SDK v6 popup is not implemented.
- Cookie loss between PayPal and return (other browser/device) → order not captured, shopper told nothing was charged.
- Rate limits are in memory, per process (correct for the single-instance design; reset on restart).
- Single-process SQLite; a hosted multi-instance deployment needs Postgres with the same compare-and-set transitions.
