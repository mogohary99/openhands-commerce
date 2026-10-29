# Technical QA Report — OpenHands Commerce MVP

_Run dates: 2026-10-23, updated 2026-10-24 and 2026-10-25 (local, macOS 26.2, Node 20.20.2, Chrome via Playwright 1.64.1). Latest results are from 2026-10-25 (§2, working tree after `eefc5a8`)._

Legend: **LIVE** = real call to PayPal Sandbox / Anthropic. **AUTO** = automated, no external service. **MANUAL** = performed by a person. **NOT RUN** = not executed (reason given).

## 1. Summary

| Question | Answer |
|---|---|
| Did a real sandbox buyer approve a payment? | **Yes, and it was captured.**
- **2026-10-29:** the new sandbox app `APP-7R312336N90066720` (US sandbox business merchant) was configured. The owner logged in as the US sandbox personal account during `npm run purchase:manual` and pressed Pay. Order `6DB70558VY7613132`, capture `0X564302AP931181C`, **COMPLETED, 40.62 USD, exactly 1 capture**, payer country US (§3a).
- **Earlier, 2026-10-25:** two approvals by an Egypt-country sandbox buyer against the old app were refused with `COMPLIANCE_VIOLATION`, 0 money moved (§3b). |
| Does PayPal independently confirm a capture? | **Yes.** `GET /v2/checkout/orders/6DB70558VY7613132` (debug `f814102f85860`) and `GET /v2/payments/captures/0X564302AP931181C` (debug `f22969340ead4`) both report COMPLETED for 40.62 USD. Evidence: `docs/evidence/sandbox-purchase-manual-buyer.json`. |
| Was live Claude tested? | **Yes, on 2026-10-29**, with a real Anthropic API key (`claude-opus-5-5`). The owner created the key; it was written into both `.env.local` files by the clipboard helper and never printed. `npm run test:live`: **18/18 pass**, twice in a row.
- **The 7 Claude tests:** demo request understood; injection in the request ignored; mismatch explanation; planted-review injection kept out; comparison intro names only real products; over-budget explanation; real timeout falls back to the rules.
- **Two defects found and fixed** (§3d): the validator rejected the correct "No payment has been made", and the planted-$5 check matched the real "$5.99" shipping.
- **The interface with live Claude:** `E2E_LIVE_AI=1 npm run test:e2e` gives 40 pass, 7 skipped. Spikes 26/26. |
| Was real assistive-technology testing performed? | **No.** No VoiceOver/NVDA/Voice Control/Switch Control session and no testing with disabled users. Chrome's accessibility tree was inspected automatically. |
| Real money? | None possible: PayPal base URL hard-coded to sandbox; enforced by a unit test. |

## 2. Commands and exact results (2026-10-25, `npm run test:all`, exit 1: see the E2E row)

| Command | Result |
|---|---|
| `web: npm run typecheck` | clean |
| `web: npm test` (AUTO unit) | **81 tests, 81 pass, 0 fail, 0 skipped** |
| `web: npm run test:live` (LIVE) | **18 tests, 11 pass, 0 fail, 7 skipped** (Claude: `ANTHROPIC_API_KEY not set`) |
| `web: npm run build` | ok |
| `web: npm run test:e2e` (AUTO + LIVE) | **46 tests, 38 pass, 1 fail, 7 skipped**. Skipped: buyer purchase (no buyer credentials), manual purchase (`purchase:manual` only), 5 video-scene recordings (`video:scenes` only). **The failure:** `live-paypal` "approve creates one real sandbox order…". The app created the PayPal order, but the test's own independent `POST /v1/oauth2/token` to `api-m.sandbox.paypal.com` hit `ConnectTimeoutError` (10 s, addresses 104.17.170.30/171.30). That is a network failure in the test's verification call, not an app assertion. Straight afterwards `curl` reached the API (connect 0.08–0.15 s, responses 2.9–7.9 s), and a separate rerun of `live-paypal.spec.ts` passed (1 pass, 1 skipped). **This is recorded as a failure, not as fixed.** Nothing was changed to make it pass, and nothing in our code was found at fault. A test that depends on PayPal Sandbox can still fail like this. |
| `spikes: npm test` | 26 tests, 23 pass, 0 fail, 3 skipped (Claude key) |
| `web: npm audit --omit=dev` | 0 vulnerabilities |
| Secret in git history | 0 matches (all revisions) |

**Full run 2026-10-29, after the VoiceOver fix: exit 0.** Typecheck clean, build ok. Unit **84/84**. Live: 11 pass, 0 fail, 7 skipped (no Anthropic key). E2E: 47 tests, **40 pass, 0 fail, 7 skipped** (buyer purchase, manual purchase, 5 video recordings), no retries. Spikes: 23 pass, 3 skipped. `npm audit --omit=dev`: 0 vulnerabilities.

**Full run 2026-10-29, later (new app `APP-7R312336N90066720`, after the verified purchase and the fresh-id test correction, commit `2117d0d`): exit 0.** Typecheck clean, build ok. Unit **84/84**. Live: 11 pass, 0 fail, 7 skipped (no Anthropic key). E2E: 46 tests, **39 pass, 0 fail, 7 skipped** (buyer purchase, manual purchase, 5 video recordings), no retries logged. Spikes: 23 pass, 0 fail, 3 skipped. `npm audit --omit=dev`: 0 vulnerabilities. Secret scan (old and new PayPal keys, all files and all history): 0 hits.

**Full run 2026-10-29 (commit `033a42d`, still the old sandbox app `APP-1EV4688594317942R`): exit 0.** Typecheck clean, build ok. Unit **84/84**. Live: 11 pass, 0 fail, 7 skipped (no Anthropic key). E2E: 46 tests, **39 pass, 0 fail, 7 skipped** (buyer purchase, manual purchase, 5 video recordings), no retries logged. Spikes: 23 pass, 0 fail, 3 skipped. `npm audit --omit=dev`: 0 vulnerabilities.

**Earlier full run (2026-10-25, after the COMPLIANCE_VIOLATION fix and the test-side retry change): exit 0.** Unit **83/83** (84/84 after the DECLINED-capture fix, see §3b). Live: 11 pass, 7 skipped (no Anthropic key). E2E: **46 tests, 39 pass, 0 fail, 7 skipped**, and no `[paypal-sandbox]` retries logged. Spikes: 23 pass, 3 skipped. Audit: 0 vulnerabilities. The table above is the earlier 2026-10-25 run with the sandbox connect timeout.

Previous full run (2026-10-24, commit `a607df7`): exit 0. Unit 81/81, live 11 pass + 7 skipped, E2E 38 pass + 2 skipped.

### Flaky test: root cause found and fixed (2026-10-24)

- **Symptom:** `signature.spec.ts` "signature moment" failed about 1 run in 10 full runs (2.3 s in, so early). Reruns passed, which proved nothing.
- **Reproduced:** 1 of 40 with `--repeat-each=40`. The failure was axe `document-title (serious)` on the blocked review page.
- **Measured:** a probe recorded `document.title` at every DOM mutation and focus event. In 10 of 25 runs, focus moved to `#problem-0` while the page had **no `<title>`**.
- **Root cause:** the navigation from results to review is client-side. Next.js commits the new page a frame before it re-inserts the route's `<title>`. `FocusOnMount` focused after one animation frame, sometimes inside that gap. Real impact: a screen reader could meet a page with no name, and axe was right.
- **Ruled out:** streaming metadata. In the server HTML, `<title>` is already in `<head>` (checked with and without `htmlLimitedBots`, so that change was reverted).
- **Fix:** `components/FocusOnMount.tsx` waits until `document.title` is set (at most about 30 frames) before moving focus. Commit `0633d5c`.
- **Regression test:** `test/e2e/focus-title.spec.ts` records the title at every focus move. Without the fix it fails **21 of 40**; with the fix it passes **40 of 40**. The signature moment passes **40 of 40**.
- **Knock-on:** `signature.spec.ts` "bypassed guard" read the focused element once, right after the content appeared. Because focus now arrives a frame or two later, it failed once in the full run. It now waits for focus, and still requires `#problem-0`. The three affected specs then passed **104 of 104**.

### 2a. Release gates

| Gate | Status |
|---|---|
| TypeScript clean | **PASS** |
| Production build | **PASS** |
| Unit tests | **PASS** (81/81) |
| Browser E2E | **PASS with one network failure** (2026-10-25: 38 pass, 1 fail = PayPal Sandbox connect timeout in a test's own verification call, which passed on a separate rerun; 7 skipped = buyer purchase, manual purchase, 5 video recordings). See §2 |
| Flaky test | **FIXED** (root cause found; regression test fails 21/40 without the fix, passes 40/40 with it) |
| Real sandbox buyer-approved capture | **BLOCKED**: two real approvals on 2026-10-25 were refused by PayPal (`COMPLIANCE_VIOLATION`, 0 captures; §3b). Needs US sandbox accounts and a rerun |
| PayPal-verified amount and currency of a capture | **BLOCKED** — same (test asserts `COMPLETED`, `USD`, `40.62`, one capture after refresh/replays/re-capture; written, not run) |
| No known duplicate-charge vulnerability | **PASS (no known issue)** — AUTO + LIVE pre-approval evidence; post-capture replay against real PayPal is **BLOCKED** |
| AI fallback when Claude fails | **PASS** (AUTO through the real SDK against a fake server) |
| Live Claude | **NOT TESTED** — no `ANTHROPIC_API_KEY` |
| Accessible keyboard journey | **PASS** (AUTO) |
| Screen-reader evaluation | **NOT TESTED** (manual VoiceOver/NVDA pass not done; prioritized checklist ready: `docs/accessibility/voiceover-checklist.md`) |
| Receipt page accessibility | **PASS (fixture states)**: axe light/dark, focus and title for COMPLETED, PENDING, CAPTURE_UNKNOWN, FAILED from local fixture rows, plus no horizontal scrolling at the 400 % zoom equivalent with and without forced colours; a receipt from a real capture is **NOT TESTED** |
| CSRF on Server Actions | **PASS**: forged-origin post refused, same-origin post works (E2E) |
| Testing with disabled users | **NOT TESTED** |
| No exposed credentials in repo | **PASS** (secret still needs rotation: it's in one chat transcript) |
| No open critical/high security defects | **PASS (none known)** |
| Hosted deployment | **NOT TESTED**: prepared (`render.yaml`, options compared in `docs/deployment.md`), not deployed (needs approval and a card) |
| Demo video recorded | **NOT DONE**. Real silent footage of the scenes without a payment is recorded (`npm run video:scenes`, then `video:assemble`). The PayPal login, payment and receipt scenes, the narration and the captions are missing |
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


### 3a. Manual buyer purchase: COMPLETED and verified on 2026-10-29

`cd web && npm run build && npm run purchase:manual` opens Chrome on a temporary profile and drives the store to PayPal Sandbox. It then waits up to 10 minutes while the owner logs in with the sandbox **personal** account and pays. No buyer credentials are read or stored. After the redirect it runs the same verification as the automated buyer test (`test/e2e/paypal-verify.ts`):
- PayPal reports the order `COMPLETED`: 40.62 USD, with 5.99 shipping and 2.64 tax, `custom_id` present, exactly one capture, that capture `COMPLETED` for 40.62 USD with the same id the receipt shows.
- Reloading the receipt and replaying the return URL, with and without PayerID, leave the receipt unchanged. The cart is closed.
- A direct re-capture with the app's request id returns the same capture. With a fresh request id the test originally expected 422 `ORDER_ALREADY_CAPTURED`; live, PayPal answered **201** (see below). Afterwards there is still exactly one capture.
- Evidence (ids and statuses only) goes to `docs/evidence/sandbox-purchase-manual-buyer.json`.

**2026-10-25 attempt.**
- **First run:** our app created the PayPal order and redirected to PayPal's login page. The script still failed, because it waited for PayPal's checkout page to fire `load`, and that page never does. This was a bug in the script, not the app.
  - **Fix:** the redirect wait now uses `waitUntil: "commit"`. The URL is still asserted. The same change was made to the three other PayPal redirect waits in `live-paypal.spec.ts`.
- **Second run:** it reached PayPal's login page for order `6E5462927B134152K`, created for $40.62 USD. It waited 10 minutes, nobody logged in (the owner was away), and it timed out.
  - Nothing was approved or captured, and no evidence file was written. Afterwards an independent `GET /v2/checkout/orders/6E5462927B134152K` returned `PAYER_ACTION_REQUIRED`, 40.62 USD, 0 captures.
  - **Status: BLOCKED on the owner's PayPal Sandbox login.**

**2026-10-29 run: VERIFIED.**
- **Setup:** the new sandbox app `APP-7R312336N90066720`. Its keys were written into both `.env.local` files by a clipboard helper, never shown or logged. The old files are backed up as `.env.local.bak-2026-10-29`.
- **The new merchant:** a probe order shows a different payee merchant (`PB…5A`, a `business.example.com` sandbox account; the old one was `WD…3N`). The new app gets 404 on both refused orders. The API doesn't report the merchant's country.
- **Before the run:** `npm run test:live` with the new keys gave 11 pass and 7 skipped (Claude), and the production build succeeded.
- **The purchase:** the owner logged in as the US sandbox personal account and pressed Pay. Order `6DB70558VY7613132` was created for $40.62 USD.
- **Checks that passed in the run:**
  - the receipt shows "Payment complete: $40.62", focused;
  - the "How this payment was checked" panel is there;
  - GET order: COMPLETED, 40.62 USD, shipping 5.99, tax 2.64, the quote-hash `custom_id`, exactly 1 capture, COMPLETED, with the same id as the receipt;
  - a receipt reload and two return-URL replays left the receipt unchanged;
  - the cart was closed;
  - a capture replay with the app's own request id returned the same capture.
- **The one failed assertion (test bug, not a payment problem):** the test expected a capture with a *fresh* request id to get 422 `ORDER_ALREADY_CAPTURED`. PayPal answered **201**. A GET made afterwards still shows exactly **one** capture, `0X564302AP931181C`, so no second payment was created.
  - The test's expectation had never been checked against a real completed capture.
  - **Corrected assertion:** either 422 `ORDER_ALREADY_CAPTURED`, or 2xx with the order COMPLETED and the original capture as the only capture. The final "exactly one capture" check is unchanged.
  - The 201 response body wasn't recorded. A second observation call was declined by the session's safety classifier, and I didn't work around it.
  - **The corrected assertion hasn't run against PayPal yet.** It needs another buyer approval. Until then the test's status is NOT RE-RUN.
- **Evidence:** `docs/evidence/sandbox-purchase-manual-buyer.json`, written by hand from PayPal's API responses, because the test stopped before writing it.

**Follow-up on the fresh-request-id result (2026-10-29, read-only checks only; no new capture or payment).** The owner decided this verified capture is the payment milestone. No payment will be made just to re-run the assertion.
- **PayPal's docs:** the Orders v2 error reference says "If 'intent=CAPTURE' only one capture per order is allowed". The idempotency guide says a repeated `PayPal-Request-Id` returns the original result. Neither says a *new* request id on a completed order must get 422. So the old test's assumption had no documented basis, and the observed 201 doesn't contradict PayPal.
- **The app's own record** (read-only, `web/.data/e2e.sqlite`):
  - order state COMPLETED;
  - capture `0X564302AP931181C`, COMPLETED, 4062 cents;
  - verified at 2026-10-29T10:56:15.827Z;
  - debug id of the app's capture call: `f87983821dc72`.
- **The audit trail for that order:**
  1. `approval.recorded` and `paypal.order_created`;
  2. two `paypal.cancelled_by_shopper`, each followed by `approval.reused_paypal_order`: the owner cancelled at PayPal twice, and each re-approval **reused the same PayPal order** rather than creating a new one;
  3. exactly **one** `capture.completed`.

  The receipt reloads and return-URL replays added no capture events.
- **PayPal's own record:** a GET made after the test (and after its fresh-id call) shows exactly one capture.
- **Status of the corrected assertion:** typechecked. It runs only inside a real purchase, so it is **NOT RE-RUN**, by the owner's decision.

#**Receipt footage (2026-10-29):** the receipt for that order was reopened from a *copy* of the app's database (`next start` on port 3400) and recorded as `docs/video/scenes/6-receipt-verified.mp4`.
- It shows "Payment complete: $40.62", focused, and "How this payment was checked".
- It shows order `6DB70558VY7613132`, capture `0X564302AP931181C` and "PayPal Sandbox (test money only)".
- No email, name or address appears. The original database's WAL was unchanged afterwards.

### 3e. Live-Claude video footage (2026-10-29)

- **Re-recorded with `E2E_LIVE_AI=1` and real `claude-opus-5-5` responses:** scenes 1, 2, 4 and 5. The rules-mode takes are kept in `docs/video/scenes-rules/` (git-ignored).
- **Checked frame by frame:**
  - "Finding options…" shows for about 4 s while Claude answers;
  - the results carry "Written by Claude, checked by our rules";
  - the review shows "Explanation written by Claude and checked against your order. The problem itself was found by our rules." Scene 1 now scrolls this line into view without moving focus;
  - the blocked Approve → problem → fix sequence, and "$40.62 — within your $45.00 budget".
- **Claude's on-screen claims checked against the catalog:** Basics 20W out of stock, $22.22 all in; 65W $48.20 with no cable; 30W bundle $40.62.
- **Unchanged:** scene 3 (it would need a new PayPal order) and scene 6 (the real receipt).
- **Cut:** 2:31, with an 8 s enlarged hold on a real frame of Claude's results. Captions: 13 cues, re-timed.
- **Not verified:** VoiceOver reading Claude's wording. The VoiceOver passes ran before the key was configured. The accessibility-tree test with `E2E_LIVE_AI=1` does confirm the problem's description carries the facts.

### 3d. Live Claude (2026-10-29)

**First real run:** 15 of 18 pass, with 3 Claude explanation tests failing. Two causes, both ours, not the model's:
1. **Validator false positive.** `PAYMENT_CLAIM` matched "…$2.64 for tax. **No payment has been made**", a correct reassurance, so the explanation fell back to the rules text. It reproduced in 1 of 5 runs, so it's intermittent.
   - **Fix:** a claim phrase directly after no/not/nothing/never is allowed. "No problem, payment has been made" is still rejected.
   - **Unit test:** fails on the old validator and passes now.
   - **Logging:** the fallback log now names the matched phrase with about 30 characters of context. That's model text only, never the request or the key.
2. **Test bug.** The planted-review check `/\$5(\.00)?\b/` matched the real "$5.99 shipping". Claude's actual text was "That includes the charger at $38.99, $5.99 shipping and $3.22 tax… Nothing has been paid."
   - **Fix:** now `/\$5(?:\.00)?(?!\.?\d)/`, which matches $5, $5. and $5.00 but not $5.99 or $50. The same fix applies in `spikes/test/ai.live.test.ts`.

**Browser suite:** it now runs on the rules text by default, because it checks exact text and runs axe on it. `E2E_LIVE_AI=1` drives the interface with live Claude, and the accessibility-tree test then checks Claude's description for the facts (Lightning, USB-C). Both modes give 40 pass and 7 skipped.

**After the fixes:** `npm run test:live` 18/18 twice. Spikes 26/26. Unit 85/85.

**Not tested:** Claude under load or rate limiting, and the cost of a full judging period. The fallback covers both.

### 3b. Real buyer approvals refused at capture: COMPLIANCE_VIOLATION (2026-10-25)

**What happened.** The owner ran `npm run purchase:manual`, logged in at PayPal Sandbox and approved.
- PayPal returned to `/checkout/return` and our capture got **422 `COMPLIANCE_VIOLATION`**: order `3EW601627R616202L`, debug_id `f10081281d454`.
- The owner approved again: order `91U83791YC987840L`, debug_id `f2506644ac6cd`, same 422.
- A third order, `6VC28704AY408032J`, was created and the browser was then closed: `PAYER_ACTION_REQUIRED`, 0 captures.
- The test ended with "Target page, context or browser has been closed". No evidence file was written, because nothing was captured.

**Independent check with PayPal** (`GET /v2/checkout/orders/{id}`): both refused orders are `APPROVED`, 40.62 USD, **0 captures**, payer country **EG**. So the store's amount and currency reached PayPal correctly, and nothing was charged.

**Likely cause: NOT VERIFIED.** It's on PayPal's side, tied to the sandbox accounts. PayPal returned a definitive 4xx, and our request matched what the order holds. PayPal's official Orders v2 error reference lists `COMPLIANCE_VIOLATION` ("Transaction is declined due to compliance violation"), under create order, with no recommended action. It doesn't explain the cause. Forum reports point to the country of the sandbox buyer or merchant account. **Next step (owner):** create a sandbox personal *and* business account with country **United States**, and a sandbox REST app under that business account. Its new keys also complete the secret rotation. Then rerun `npm run purchase:manual`.

**App defect found and fixed.** `COMPLIANCE_VIOLATION` wasn't a known refusal. It fell through to the generic notice "PayPal couldn't start the payment… Please try again in a moment". That was wrong: PayPal had started the payment, the buyer had approved it, and then PayPal refused it. It also invited a retry that fails the same way, which the owner then did.
- **Now:** it maps to `refused` ("PayPal refused this payment. Nothing was charged. If you approve again, we'll start a new PayPal checkout."), also when the return URL is replayed later.
- **Regression tests:** 2 new unit tests, which fail on the old code and pass with the fix.
- Unknown 4xx issues still get the generic notice. Calling every unknown error a refusal would be misleading the other way.

**Follow-up GET, the afternoon of 2026-10-25 (read-only, no capture retried).**
- **The same two orders now look different:** the order-level `status` and `payer` fields are absent, and each order holds one capture with status **DECLINED**: `6MH62755AL443325D` and `7BL936621B999000C`, 40.62 USD.
- **The third order** returns 404, because it was never approved.
- **Money:** no capture is `COMPLETED`, so nothing was charged.
- **Evidence:** sanitized in `docs/evidence/sandbox-compliance-violation-2026-10-25.json`. It has no ids of people or accounts, no emails and no credentials.
- **Support request:** a draft is in `docs/paypal-support-request.md`. It has not been sent.

**Second app gap found and fixed.** Suppose our record were `CAPTURE_UNKNOWN`, for example because the capture response was lost. "Check again" would read this shape and see an order that isn't `APPROVED`. It would then reset the order to "approve again at PayPal".
- **Now:** if PayPal's order already holds a capture, we record that capture's outcome. Here that's `declined`, never paid, and no second capture is sent.
- **Regression test:** 1 new unit test, which fails on the old code (`not_approved`) and passes with the fix.

**US sandbox hypothesis: SUPPORTED, not proven.** On 2026-10-29, with a US sandbox buyer and a new merchant, the capture completed (§3a). Two things changed at once, the buyer's country and the merchant/app, so this doesn't show which one caused the refusal. The support request wasn't needed and wasn't sent.

### 3c. PayPal Sandbox instability vs application failures (2026-10-25)

| Time (local) | Observation | Attributed to |
|---|---|---|
| ~03:38 | Video take: the store showed "Opening PayPal…" for about 70 s, then PayPal's login page rendered **without its stylesheets** | PayPal Sandbox. Our page had already redirected, and the unstyled page is PayPal's |
| ~03:45 | `live-paypal` test: our app created the order and redirected, then the **test's own** `POST /v1/oauth2/token` hit `ConnectTimeoutError` (10 s) | Network or PayPal. It failed before any request reached PayPal; `curl` right after took 2.9–7.9 s per call |
| ~11:56 | `live-paypal.spec.ts --repeat-each=4`: **4/4 pass**, 10–15 s each (earlier runs: 31–39 s), no retries needed. `test:live`: 11 pass, 7 skipped | Sandbox healthy |
| ~11:57 | Scene 3 re-recorded: PayPal rendered normally, 24 s take | Sandbox healthy |

**Test-only hardening** (`test/e2e/paypal-verify.ts`):
- The test's own PayPal calls now reuse one access token instead of requesting a new one per call.
- They retry **only** on transport errors and 5xx/429, at most 3 attempts.
- Each retry is logged as `[paypal-sandbox] … retrying` and attached to the report as a `paypal-network-retry` annotation, so instability stays visible.
- A 4xx is never retried.
- A test-side capture only retries with its **original** `PayPal-Request-Id`, which PayPal de-duplicates, so a retry can't capture twice. A fresh id is never generated on retry.
- The tests' wait for the redirect to PayPal is now 60 s, up from 45. The app's own worst case is 3 attempts × 15 s plus backoff, about 46 s.
- **No assertion was changed.** The app's PayPal client already retried safely (same request id, 15 s per attempt) and is unchanged.

**One unexplained failure.** The scene 3 *recording* script (not a product test) failed once at 16 s, and its output was lost because the next run cleared `test-results/`. It then passed 4 times in a row. The cause is **unknown**.

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

### 6a0. VoiceOver re-check after the fixes (Safari, 2026-10-29 18:26)

Results:
- **Pass:** items 5, 6, 7, 8, 9, 10 and 11. The blocked Approve now speaks "Problem 1: payment blocked. The cable will not fit your phone …", and the fix is the next Tab stop. Prices are read once, and the corrected $40.62 total is announced.
- **Receipt (13):** understandable with VO+→. Focus on the heading after a real PayPal redirect is NOT VERIFIED.
- **Chrome + VoiceOver (18:43):** the same results as Safari for 5–11. The receipt heading is announced on load ("heading level 1 Payment complete: $40.62, 2 items, main").
- **Open minor issue (Chrome only):** the "Verified with PayPal…" sentence is read as five fragments at its bold words. Not fixed yet.

Exact captions: `docs/accessibility/voiceover-checklist.md`.

### 6a. First VoiceOver pass: Safari, 2026-10-29, partial

**Setup:** run by Claude with the owner's permission, on macOS 26.2, Safari and VoiceOver. VoiceOver was off before the run and off afterwards. Its AppleScript control was not enabled, and no other setting was changed. The app ran locally from a scratch copy of the database.

**Method:** keystrokes sent with System Events. VoiceOver's caption panel was read after each step.

**What this is not:** a VoiceOver user, or a listening test.

**Results:** item by item, with the exact captions, in `docs/accessibility/voiceover-checklist.md`.
- **Pass:** P0 items 1–8, 10 and 11.
- **Defect found and fixed (item 5):** product option prices were read twice. The `<label>` holds the price, and `aria-describedby` repeated it. A regression test (`a11y-tree.spec.ts`) fails on the old code and passes with the fix, and the corrected announcement was re-checked in VoiceOver.
- **Item 9 (partial):** focus moves to the fix and nothing is charged. The polite "Payment is blocked…" live message was **not observed** in the caption, because the focus announcement followed straight away.
- **Item 12:** not run, because it would need a new payment.
- **Item 13:** not verified with speech. VoiceOver had been turned off outside the script by then, and the run was stopped because Terminal kept coming to the front (the Mac was in use).
- **Not run:** P0 in Chrome, P1 and P2.
- **During the run:** one stray ⌘R reached Terminal and toggled its "Allow Mouse Reporting" view option. It was immediately toggled back (the caption read "Allow Mouse Reporting, checked").

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
