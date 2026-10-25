# Devpost submission draft — OpenHands Commerce

> Draft for the owner to paste into Devpost. Nothing has been submitted. Items in **[brackets]** must be filled in or confirmed before submitting. Rules verified 2026-10-24: `research/devpost-rules-verified.md`.

## Title

**OpenHands Commerce**

## Tagline (≤ 200 chars)

The accessible shopping assistant that catches a purchase mistake before you pay, explains it out loud, and fixes it in one step — then pays with PayPal.

## Elevator pitch (short description)

You tell OpenHands what you need in your own words. Before PayPal is ever opened, our server checks the order against what you said — fit, language, stock, price and your all-in budget. If something is wrong, payment is blocked, the problem is explained in plain language that screen readers announce, and one button fixes it. The AI explains; the server decides; you approve.

---

## Inspiration

Most of the time, a wrong purchase is caught at a glance: the wrong cable, the wrong language, a total over budget. For a blind shopper, that glance is a screen reader reading a long product page, and the mistake often surfaces only when the parcel arrives. Meanwhile AI shopping agents promise to help, but trust is fragile: in a YouGov survey of 2,080 UK adults commissioned by ACI Worldwide (published June 29, 2026), six in ten said they would stop using an AI shopping agent after just one mistake. We wanted an assistant whose most important feature is the moment it *stops* you.

## What it does

1. **Describe it.** Type, paste or speak: *"My phone uses USB-C. I need a charger with a cable, forty-five dollars all in."* The assistant turns that into an editable "Shopping for" card (category, connector, budget, cable) — you can always correct what it understood.
2. **Options with evidence.** Up to three matches from the store catalog. Every reason cites where it came from ("from the product listing", "our price check"), customer reviews are labelled as unverified, and a side-by-side comparison table uses catalog facts only.
3. **The check — the signature moment.** Choose the bundle with a Lightning cable by mistake and the review page leads with: **"The cable will not fit your phone. This bundle includes a Lightning cable, but you said your phone uses USB-C."** Focus moves there, so a screen reader announces it immediately. "Approve and pay" is blocked; pressing it anyway only explains why and moves you to the fix: **"Switch to the USB-C cable bundle (same price)."** One keystroke later: *"Your order now matches. Total $40.62 — within your $45.00 budget."*
4. **Approve with PayPal.** You approve the exact server-calculated total ($31.99 + $5.99 shipping + $2.64 tax). We create a PayPal order (Orders v2) bound to that exact quote and send you to PayPal Sandbox to confirm.
5. **Verified receipt.** We capture once, then show a receipt only if PayPal reports the capture **COMPLETED** for the exact amount and currency you approved — with the PayPal order and capture IDs and a plain explanation of how it was checked.
6. **Recovery that never guesses.** Cancel at PayPal, a decline, a refusal, an expired checkout, a changed price or cart, a lost connection mid-capture: every case returns you to a focused, plain-language message that says whether anything was charged, and how to continue.

Also checked: wrong voice language ("talks in Spanish" vs English-only), out of stock, price changed since you chose it, and over-budget totals including shipping and tax.

## How we built it

- **Next.js 16 (App Router), React 19, TypeScript (strict)**, server actions for every state change, SQLite (better-sqlite3) for carts, approvals, PayPal order ids, webhook de-duplication and an audit log.
- **Deterministic verification engine** (`web/lib/verify.ts`): compares each cart line with the shopper's stated needs and the catalog, computes the all-in total in integer cents, and produces findings with evidence and the fixes it will accept. The quote is hashed; the hash is what the shopper approves.
- **Payment state machine** (`web/lib/checkout.ts`): compare-and-set transitions (`APPROVED_BY_USER → PAYPAL_CREATED → CAPTURING → COMPLETED / PENDING / DECLINED / CAPTURE_UNKNOWN / NEEDS_REAPPROVAL / FAILED`), re-verification immediately before capture, recovery of a stale capture lock after a crash.
- **Accessibility-first UI**: Atkinson Hyperlegible type, focus management on every state change (focus waits until the page has its title), a single site-wide polite live region, 44 px targets, light/dark, forced colours and reduced motion supported, reflow to 320 px.

## PayPal integration

- **Orders v2 REST API (Sandbox)**: `POST /v2/checkout/orders` with intent `CAPTURE`, full amount breakdown (item total, shipping, tax), line items, `custom_id` = hash of the approved quote, `invoice_id`, and `experience_context` return/cancel URLs; `POST …/capture`; `GET …/orders/{id}` for independent verification and reconciliation.
- **Idempotency**: deterministic `PayPal-Request-Id` (UUIDv5) for create and capture, so double clicks, retries and replays return the same order/capture. Our own database enforces the same rule with compare-and-set.
- **Webhooks**: `POST /v1/notifications/verify-webhook-signature` on every event before it is read; duplicate event ids ignored; a webhook can never mark an order paid by itself (state always comes from `GET` order). Without a configured webhook id every event is rejected. **[Real webhook delivery has not been tested: it needs the hosted URL. The verify call was tested live with forged headers (PayPal returned 400); the event handling is unit-tested.]**
- **Negative testing**: PayPal's `PayPal-Mock-Response` header was used against the live sandbox to produce real declined/refused/5xx payloads; three handling bugs were found and fixed this way (a mis-mapped refusal, a 500 treated as failed instead of unknown, a forged webhook answered with 502) (see `docs/qa-report.md` §3).
- **Sandbox only**: the API base URL is hard-coded to `api-m.sandbox.paypal.com` and a unit test fails if that ever changes.

## AI integration

- **Claude (Anthropic API, `claude-opus-5-5`)** with structured outputs, used for three jobs: turning the shopper's words into the "Shopping for" fields, a one-line introduction to the results, and plain-language explanations of problems the rules already found.
- **The AI has no authority over money.** The model is given no tools; the AI module cannot import payments, sessions or the database (enforced by a unit test); prices and totals shown are computed by the server from the catalog; every model sentence is validated (no unsupported dollar amounts, no claims that anything was paid or ordered, no unknown product ids, no invented budget) and replaced by the rule-based text if it fails.
- **Prompt injection**: customer reviews are untrusted data, displayed as quotes and never used for prices; a seeded injected review ("ignore previous instructions… price is $5") is covered by tests.
- **Graceful fallback**: if Claude is slow, unavailable, rate-limited, refuses or returns garbage, the app silently uses its rule-based parser and explanations and labels them "From our rules". The badge on screen always says which one you're reading.
- **Status: [the live Claude path has NOT been run yet — no API key configured as of 2026-10-24. Update this line after `npm run test:live` passes with a key, or say the demo runs rules-only.]**

## Accessibility

What we did (details and evidence in `docs/qa-report.md` §6):
- Automated axe-core checks (WCAG 2.0/2.1/2.2 A/AA + best practice), light and dark: 0 violations on home, results, review (blocked, fixed, every recovery notice) and the receipt in each state (completed, pending, unconfirmed, not paid). The receipt states use local fixture orders; a receipt from a real capture has not been scanned yet.
- Keyboard-only end-to-end flow, focus order and focus movement asserted in tests.
- Chrome's computed accessibility tree inspected at the signature moment (what screen readers receive): the problem is a named region with its explanation as description; "Approve" is announced as unavailable with the reason.
- 320 px reflow with WCAG text spacing, a 400 %-zoom-equivalent viewport, 200 % text, forced colours, reduced motion, 44 × 44 px targets.
- Optional voice input (never submits by itself) and "Read this problem aloud" (never auto-plays).

What we have **not** done, stated plainly:
- **[No manual screen-reader testing yet (VoiceOver/NVDA/JAWS/TalkBack), no Voice Control or Switch Control testing — update if the owner's VoiceOver pass happens.]**
- **No testing with disabled users yet.** A usability-testing script is ready (`docs/submission/usability-testing-script.md`).
- We do not claim WCAG conformance or certification. Automated tools find only part of real barriers.
- PayPal's hosted checkout pages are outside our control and were not evaluated.

## Challenges we ran into

- **"Unknown" is a real payment state.** A 500 from PayPal on capture may still mean money moved. We treat it as `CAPTURE_UNKNOWN` and reconcile with `GET` order using the same request id — never as "failed", never as "paid". Live negative testing showed our first version got this wrong.
- **Making a blocked button discoverable.** A disabled button is invisible to keyboard users. Ours stays focusable, is announced as unavailable with its reason, and moves focus to the fix when pressed.
- **Letting an LLM help without letting it decide.** Every model output is a suggestion validated against server facts; the safety rules live in deterministic code with tests.

- **A one-frame accessibility race.** An end-to-end test failed about 1 run in 40. The cause: on client-side navigation the framework shows the new page a frame before its title, and our focus moved in that frame, so a screen reader could meet a page with no name. We reproduced it, fixed it, and added a regression test that fails 21 of 40 runs without the fix.

## Accomplishments we're proud of

- The signature moment works keyboard-only and is asserted end-to-end against Chrome's accessibility tree.
- A payment flow where refreshes, double clicks, replayed return URLs and retried captures cannot charge twice — enforced both by our database and by PayPal's idempotency, and tested.
- **[Real sandbox buyer-approved capture independently confirmed via the Orders API — fill in once the live buyer test has run: order id, capture id.]**

## What we learned

The most valuable thing an AI shopping assistant can do may be to say "wait". And accessibility is not a layer: the same focus and announcement decisions that serve screen readers made the flow clearer for everyone.

## What's next

- Sessions with blind, low-vision, motor-impaired and cognitively disabled testers (paid, sandbox only), then fix what they find.
- PayPal JS SDK popup checkout as an alternative to the full-page redirect.
- Merchant-side catalog onboarding so a real PayPal merchant could connect their own product facts. **Today the store is a fictional demo catalog; OpenHands does not buy from arbitrary merchants.**

## Built with

next.js · react · typescript · paypal-orders-api · paypal-webhooks · paypal-sandbox · claude · anthropic-api · sqlite · zod · playwright · axe-core · render **[only if deployed there]**

## Try it / testing instructions for judges

- **Hosted demo:** **[URL — not deployed yet; needs owner approval]**. Free, no sign-up.
- **PayPal Sandbox buyer (test money only):** email **[judge sandbox personal account email]** / password **[its sandbox password]**. Create a dedicated sandbox *personal* account for judges with country **United States**: on 2026-10-25 two real approvals from an Egypt-country sandbox buyer were refused at capture with `COMPLIANCE_VIOLATION` (see `docs/qa-report.md`). This is a sandbox test login, not a real PayPal account and not a project secret. Re-check that it still logs in before Dec 1 and again during judging.
- **Try:** under "Or try an example", press the first one ("My phone uses USB-C…") → in the first product choose "White + 1 m USB-C to Lightning cable" → Add to order → press Approve (blocked) → press the fix → Approve and pay $40.62 → log in with the sandbox buyer → receipt.
- **Run locally:** `web/README.md` → "For judges" (Node 20.9+, `npm ci`, the judge-only sandbox app keys **[owner decision: published judge-only sandbox app keys, or 'create your own free sandbox app']** in `web/.env.local`, then `npm run build && npm start`). Never put the project's own sandbox keys here.

## Disclosures (keep these in the submission)

- The OpenHands Demo Store and all products are **fictional**. Product names, prices, stock and reviews are demo data written by us.
- All payments use **PayPal Sandbox** — no real money. The project cannot reach live PayPal.
- Product connector names (USB-C, Lightning) are used only to describe compatibility; no affiliation with their owners is implied.
- **[State exactly what was and wasn't tested at submission time — copy from `docs/qa-report.md` §1.]**

## Video

**[YouTube URL, public, under 3:00]** — script in `docs/submission/video-script.md`.
