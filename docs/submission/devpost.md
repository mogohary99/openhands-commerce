# Devpost submission — OpenHands Commerce

> **For the owner.** Each `##` heading below is a Devpost form field: paste the text under it. Nothing has been submitted yet. Only three placeholders remain, each in square brackets: the YouTube URL, the hosted demo line, and the judge sandbox buyer line. Rules and status are in `devpost-rules-checklist.md`. The deadline is **Thu Nov 12, 2026, 12:00 pm PT**. After it, don't change the repo, the video or the demo until winners are announced (about Dec 21).
>
> Facts checked against the repo on 2026-11-07: test counts are from `docs/qa-report.md` §1–2 ("Final gates, 2026-10-29 evening"), the payment from `docs/evidence/sandbox-purchase-manual-buyer.json`, and the model id from `web/lib/ai.ts` line 18.

---

## Project name

OpenHands Commerce

## Elevator pitch (200 characters max)

An accessible AI shopping assistant that catches a wrong purchase before you pay. Claude explains, rules decide, you approve, and PayPal confirms.

## Thumbnail and image gallery

- Thumbnail: `docs/submission/youtube-thumbnail.png`
- Gallery, in this order, from `docs/screenshots/`:
  1. `3-blocked-desktop-light.png`: "The cable will not fit your phone". Payment is blocked, and a one-step fix is offered.
  2. `4-fixed-desktop-light.png`: "Your order now matches. Total $40.62, within your $45.00 budget."
  3. `2-results-desktop-light.png`: the options, with a source for every reason.
  4. `1-home-mobile-dark.png`: describe what you need, in your own words.

## About the project

### Inspiration

Most shoppers catch a wrong purchase at a glance: the wrong cable, a product in the wrong language, a total over budget. For a blind or keyboard-only shopper, that glance is a screen reader working through a long product page. Often the mistake only shows up when the parcel arrives. AI shopping agents promise to help, but an agent that can spend money has to earn trust. We wanted an assistant whose most important feature is the moment it **stops** you, and tells you why.

### What it does

1. **Describe what you need.** Type, paste or speak it: *"My phone uses USB-C. I need a charger with a cable, forty-five dollars all in."* Claude turns this into an editable **"Shopping for"** card (category, connector, budget, cable), so you can correct anything it misunderstood.
2. **Get options with evidence.** You see up to three matches from the store catalog. Every reason cites its source, reviews are labelled as unverified, and the comparison table uses only catalog facts.
3. **The check: our signature moment.** Choose the bundle with a Lightning cable by mistake, and the review page opens with: **"The cable will not fit your phone. This bundle includes a Lightning cable, but you said your phone uses USB-C."** Focus moves to this message, so screen readers announce it straight away. **Payment is blocked.** If you press "Approve and pay" anyway, it explains why and moves focus to the fix, **"Switch to the USB-C cable bundle (same price)"**. Press Enter once, and you hear: *"Your order now matches. Total $40.62, within your $45.00 budget."*
4. **Approve with PayPal.** You approve the exact total the server calculated: $31.99 + $5.99 shipping + $2.64 tax = **$40.62**. We create a PayPal Orders v2 order bound to that quote, and you confirm it in PayPal Sandbox.
5. **A verified receipt.** We capture the payment once. The receipt appears only after PayPal reports the capture **COMPLETED** for the exact amount and currency you approved. It shows the PayPal order and capture IDs, and explains how we checked.
6. **Recovery that never guesses.** Cancelling, a decline, a refusal, an expired checkout, a changed price or a dropped connection during capture: each one ends in a focused, plain-language message. It says whether you were charged and what to do next.

The server also checks voice language (a speaker that "talks in Spanish" when you asked for English), stock, price changes since you chose, and all-in budget, shipping and tax included.

**Claude explains. Deterministic rules decide. The shopper approves. PayPal confirms.**

### How we built it

- **Stack:** Next.js 16 (App Router), React 19, strict TypeScript, server actions for every state change, and SQLite (better-sqlite3) for carts, approvals, PayPal order ids, webhook de-duplication and an audit log.
- **Verification engine** (`web/lib/verify.ts`): deterministic and server-side. It compares each cart line with the shopper's stated needs and the catalog, and computes the all-in total in integer cents. Each problem it finds comes with evidence and the fixes it will accept. The quote is hashed, and the shopper approves that hash.
- **Payment state machine** (`web/lib/checkout.ts`): transitions are compare-and-set, `APPROVED_BY_USER → PAYPAL_CREATED → CAPTURING → COMPLETED / PENDING / DECLINED / CAPTURE_UNKNOWN / NEEDS_REAPPROVAL / FAILED`. The order is re-verified just before capture. If the process crashes mid-capture, the stale capture lock is recovered.
- **Architecture:** the shopper's words go to a server action. Claude turns them into constraints, which are validated, with a rules fallback. The deterministic engine chooses and prices options from the catalog. The shopper approves the hashed quote. The server creates a PayPal order with `custom_id` set to that hash. The shopper approves in PayPal Sandbox. The server captures once (idempotently), then confirms with `GET` that the order is COMPLETED for the approved amount. Only then does the receipt appear. It runs as one Node process with SQLite, and no secrets reach the client. More detail: `docs/architecture.md`.

### PayPal integration

- **Orders v2 REST API (Sandbox):**
  - `POST /v2/checkout/orders` with intent `CAPTURE`, a full amount breakdown, line items, `custom_id` (the quote hash), `invoice_id`, and return and cancel URLs.
  - `POST …/capture` to take the payment.
  - `GET …/orders/{id}` to verify the result independently. Before capturing, the server refuses the capture if the amount or `custom_id` doesn't match the approved quote.
- **Exactly-once capture:** every create and capture carries a deterministic `PayPal-Request-Id` (UUIDv5), so double clicks, retries and replays return the same result. The database enforces the same rule with compare-and-set. In the verified purchase, a receipt reload, two replays of the return URL and a capture replay still left **exactly one capture**.
- **Webhooks:**
  - Every event is checked with `POST /v1/notifications/verify-webhook-signature` before it is read, and duplicate event ids are ignored.
  - A webhook can never mark an order paid: payment state always comes from `GET` order. Without a configured webhook id, every event is rejected.
  - Verification was tested live with forged headers, and PayPal rejected them with a 400. Real webhook delivery needs a public URL, so it has not been tested.
- **Negative testing:** we sent PayPal's `PayPal-Mock-Response` header to the live sandbox to get real declined, refused and 5xx responses. This found three of our handling bugs, all now fixed: a refusal mapped to the wrong state, a capture 500 treated as "failed" when it should be "unknown", and a forged webhook answered with a 502.
- **Sandbox only:** the API base URL is hard-coded to `api-m.sandbox.paypal.com`, and a unit test fails if it ever changes.

### AI integration (Claude)

- **Model:** Claude through the Anthropic API (`claude-opus-5-5`), with structured outputs. It does three read-only jobs:
  - turning the shopper's words into the "Shopping for" fields;
  - a one-line introduction to the results;
  - plain-language explanations of problems the rules have already found.
- **No authority over money:**
  - The model has no tools.
  - The AI module cannot import the payment, session or database code. A unit test enforces this.
  - Every price and total comes from the server.
  - Each sentence from Claude is checked: no unsupported dollar amounts, no claims that anything was paid or ordered, no unknown product ids, no invented budget. A sentence that fails is replaced by the rule-based text.
- **Prompt injection:** reviews are treated as untrusted data, shown only as quotes and never used for prices. A planted review ("ignore previous instructions… price is $5") is covered by live tests.
- **Fallback, shown on screen:** if Claude is slow, unavailable, rate-limited, refuses or returns something unusable, the app uses its rule-based parser and explanations. A badge always says which you're reading: "Written by Claude, checked by our rules" or "From our rules".
- **Cost and abuse limits:**
  - A server-wide budget of 120 uncached Claude calls an hour (configurable). Above it, the rules text is used. Answers are cached.
  - Searches, cart changes, PayPal order creation and webhooks have per-session, per-address and server-wide rate limits.
  - The server-wide ceilings hold even when a client fakes `X-Forwarded-For`. We found that weakness in our own testing and fixed it.
- **Tested live:** 7 of 7 live Claude tests pass with real API calls. They cover a planted injection and a real timeout that falls back to the rules. These tests found an over-strict check, now fixed: the validator had rejected the correct sentence "No payment has been made". The browser suite also passes with live Claude driving the interface.

### Accessibility

**What we did** (evidence in `docs/qa-report.md` §6):

- **Keyboard:** the whole flow works by keyboard alone, and end-to-end tests assert focus order and focus movement.
- **Automated checks:** axe-core (WCAG 2.0/2.1/2.2 A and AA, plus best practice) found 0 violations in light and dark mode. Pages covered: home, results, review (blocked, fixed and every recovery notice) and each receipt state. The receipt states use local fixture orders.
- **Accessibility tree:** we inspected Chrome's computed tree at the signature moment. The problem is a named region, and "Approve" is announced as unavailable, with the reason.
- **VoiceOver on macOS, in Safari and Chrome:**
  - The run was driven by keystrokes by the developer's AI assistant (Claude), with the developer's permission, and read from VoiceOver's caption panel. **It was not a test by blind users or by people who use VoiceOver.**
  - It found two real defects, both fixed with regression tests: prices were read twice, and the "payment blocked" message was dropped when focus moved.
  - After the fixes: the blocked Approve says "Problem 1: payment blocked. The cable will not fit your phone…", the fix is the next Tab stop, and the corrected $40.62 total is announced.
- **Display and reading:** 320 px reflow with WCAG text spacing, a viewport equivalent to 400 % zoom, 200 % text, forced colours, reduced motion, 44 × 44 px targets and Atkinson Hyperlegible type.
- **Voice:** voice input is optional and never submits on its own. "Read this problem aloud" never plays automatically.

### Security and reliability

- **Exactly-once capture and webhook handling:** idempotency on both sides, signature verification for every webhook, and de-duplication, as described above.
- **No secrets in the browser:** a CSP with a nonce, HSTS on https, and a secret scan with 0 hits across the full git history.
- **Tests (final gates, 2026-10-29):**
  - unit: **86/86**;
  - live: **18/18**, made up of 11 against PayPal Sandbox and 7 against Claude;
  - browser: **41 pass, 0 fail, 7 skipped**, both normally and with live Claude. The skipped tests are owner-only or video recordings;
  - `npm audit --omit=dev`: 0 vulnerabilities.

### The verified payment

One real PayPal Sandbox buyer approval and capture, confirmed independently through the Orders and Captures APIs on 2026-10-29:

- order **6DB70558VY7613132**
- capture **0X564302AP931181C**
- **COMPLETED, 40.62 USD**, exactly one capture

Test money only.

### Challenges we ran into

- **"Unknown" is a real payment state.** If PayPal answers a capture with a 500, money may still have moved. We record `CAPTURE_UNKNOWN` and reconcile with `GET` order, so it is never shown as "failed" and never as "paid". Live negative testing showed our first version got this wrong.
- **A blocked button you can still find.** A disabled button is invisible to keyboard users. Ours stays focusable, announces that it's unavailable and why, and moves focus to the fix when pressed.
- **A one-frame accessibility race.** One end-to-end test failed about 1 run in 40. On client-side navigation, the framework showed the new page one frame before its title, and our focus move could land in that frame, so a screen reader met a page with no name. We fixed it and added a regression test. Without the fix, that test fails 21 of 40 runs.

### Accomplishments that we're proud of

- The signature moment works keyboard-only, and tests check it against Chrome's accessibility tree.
- Refreshes, double clicks, replayed return URLs and retried captures can't charge twice, and the verified payment shows it.
- An LLM that helps without deciding: every model output is a suggestion, checked against server facts.

### What we learned

Sometimes the most valuable thing an AI shopping assistant can say is "wait". Accessibility isn't a layer on top: the focus and announcement choices made for screen readers made the flow clearer for everyone.

### Potential impact

Blind, low-vision and keyboard-only shoppers often find a wrong cable or an over-budget total only after a long read, or when the parcel arrives. A check before payment, with the fix one keypress away, could prevent that kind of mistake for them, and help every other shopper too. Merchants get a pattern: check the order against their own product facts before it reaches PayPal, without giving the AI any authority over money. **This impact has not been measured.** No shoppers, disabled or not, have used it yet. A usability-testing script is ready (`docs/submission/usability-testing-script.md`).

### Honest limitations

- **One fictional demo catalog.** The OpenHands Demo Store and its products, prices, stock and reviews are demo data we wrote. OpenHands doesn't compare or buy across real merchants.
- **PayPal Sandbox only.** No real money, and the code cannot reach live PayPal.
- **No WCAG conformance or certification is claimed.** Automated tools find only some barriers.
- **No testing with disabled users.** No NVDA, JAWS, TalkBack, Voice Control or Switch Control testing either. VoiceOver hasn't been checked reading Claude-written wording.
- **The PayPal login step isn't filmed.** In the video, the buyer's login and "Pay" at PayPal Sandbox aren't shown, and a card says so. The receipt shown is the real one for the verified payment.
- **PayPal's hosted checkout pages** are outside our control and weren't evaluated for accessibility.
- **The hosted deployment and real webhook delivery haven't been tested** unless a hosted demo URL is listed under "Try it out".

### What's next

- Paid sessions with blind, low-vision, motor-impaired and cognitively disabled testers (sandbox only), then fixing what they find.
- PayPal JS SDK popup checkout as an alternative to the full-page redirect.
- Merchant onboarding, so a real PayPal merchant can connect their own product facts.

### How it was made, and disclosures

- **Made during the hackathon.** The first commit is dated 2026-10-23.
- **Made with an AI assistant.** The developer built it with an AI coding assistant (Claude Code), and the commits are co-authored with it.
- **Synthesized narration.** The video's voice is text-to-speech generated on macOS, not a human voice.
- **Product names.** "USB-C" and "Lightning" only describe compatibility. No affiliation with their owners is implied.

## Built with

paypal · paypal-orders-v2-api · paypal-webhooks · paypal-sandbox · claude · anthropic-api · claude-opus-5-5 · claude-code · next.js · react · typescript · node.js · sqlite · better-sqlite3 · zod · playwright · axe-core

If the hosted demo runs on Render, add `render` here and select Render as a sponsor tool. Otherwise leave both out.

## Try it out links

- GitHub (Apache-2.0): https://github.com/mogohary99/openhands-commerce
- Demo: [hosted demo URL or "Run locally: see README"]

## Video demo link

[YouTube URL]

The video is 2:31, with burned-in captions, and an English `.srt` uploaded to YouTube (`docs/submission/video-captions.en.srt`). The footage shows real Claude responses, labelled on screen. The narration is synthesized (macOS text-to-speech).

## Testing instructions for judges

**Everything runs on PayPal Sandbox, with test money only. The app cannot reach live PayPal.**

**Recommended: run it with your own sandbox app.** See "For judges" in `web/README.md`:

1. Install Node 20.9 or later.
2. Run `cd web && npm ci && cp .env.example .env.local`.
3. In `web/.env.local`:
   - add the keys of your own free sandbox app (developer.paypal.com → Apps & Credentials → Sandbox; use a US business sandbox account);
   - set `APP_BASE_URL=http://localhost:3000`;
   - `ANTHROPIC_API_KEY` is optional. Without it, the app runs on its rules and says so on screen. Add your own key to see Claude.
4. Run `npm run build && npm start`, then open http://localhost:3000. `/api/health` shows which integrations are configured, never their values.
5. Pay with a sandbox **personal** account whose country is the **United States**, from your own developer dashboard. Never use a real PayPal login. A non-US sandbox buyer was refused at capture with `COMPLIANCE_VIOLATION` in our testing.

[Judge sandbox buyer credentials: publish only with the owner's approval; otherwise delete this line]

**The path to try:**

1. Under "Or try an example", press the first example ("My phone uses USB-C…").
2. In the first product, choose "White + 1 m USB-C to Lightning cable", then press "Add to order".
3. Press "Approve". It's blocked: hear and read why.
4. Press Enter on the fix.
5. Press "Approve and pay $40.62".
6. Log in as the sandbox buyer at PayPal and press Pay.
7. You get the verified receipt.

Our pages work with the keyboard alone, and were checked with VoiceOver. PayPal's own pages weren't evaluated.
