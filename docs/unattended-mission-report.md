# Unattended mission report: 2026-10-24

Everything here was done locally. Nothing was pushed, deployed, subscribed to or submitted. No real money was involved. No credentials were printed or committed: the secret appears 0 times in git history across all revisions.

## 1. Features and fixes completed

No new product features, as instructed. Work done:

- **Flaky test: root cause found and fixed.** The intermittent failure was a real accessibility defect. On the client-side navigation to the review page, focus could move to the problem panel in the frame before the page got its `<title>`, so a screen reader could meet a page with no name (axe: `document-title`, serious).
  - **Fix:** `FocusOnMount` now waits for the title before moving focus.
  - **Proof:** the regression test fails 21 of 40 runs without the fix and passes 40 of 40 with it. The signature test passes 40 of 40.
  - One wrong guess along the way (Next's streaming metadata) was tested, disproved and reverted.
  - Full details: `docs/qa-report.md` §2.
- **Manual sandbox purchase path:** `npm run purchase:manual`. You log in at PayPal yourself, and your buyer password is never stored. The script then checks the capture with PayPal: status, amount, currency, breakdown, a single capture, receipt reload and return-URL replays, and a direct re-capture with the same and with a fresh request id. It writes ids only to `docs/evidence/`.
- **Live AI tests** added for the comparison intro, the over-budget explanation, and a real request that times out and falls back. There are now 7 live Claude tests, which run once a key is present.
- **Receipt accessibility:** this page had no automated coverage before. All four receipt states are now axe-clean in light and dark (rendered from clearly labelled local fixture orders, not payments), with focus and title checked and an ownership check (another session gets 404).
- **CSRF test:** the QA report claimed CSRF protection without a test proving it. A forged-origin Server Action post is now shown to be refused, while the same post from our own origin works.
- **Prioritized VoiceOver checklist** (P0/P1/P2), with the expected announcements taken from the accessibility tree. Status: not run.
- **Hosting comparison** (official pricing read 2026-10-24), backup script `npm run db:backup` (tested), and backup and rollback steps.
- **Submission audit** — corrections:
  - `architecture.md` described things that don't exist (model tools, a chat API, Radix/Tailwind, Postgres, a JS SDK popup). I rewrote it from the code.
  - Devpost: the "four bugs" claim is now three, matching the evidence. The survey statistic is now sourced (ACI/YouGov, 2,080 UK adults, June 29, 2026). Webhook delivery is marked untested. The axe coverage is stated exactly.
  - The product spec now marks the unbuilt popup and email receipt.
- **Submission checklist:** evidence gates, form fields, a video recording plan and a demo backup plan. It also flags a rules requirement that the repo instructions include sandbox keys or login details for judges, which is an owner decision.

## 2. Local commits (oldest first)

`0633d5c` flaky-test fix · `f96696b` manual purchase path · `0950643` live Claude tests · `fee7b2e` receipt a11y tests · `6452ded` docs audit, hosting, rollback, VoiceOver checklist · `11cee11` submission checklist · `a607df7` CSRF test, focus wait · plus the commit containing this report.

## 3. Test counts (final `npm run test:all`, exit 0)

| Suite | Tests | Pass | Fail | Skipped |
|---|---|---|---|---|
| Unit | 81 | 81 | 0 | 0 |
| Live (PayPal Sandbox + Claude) | 18 | 11 | 0 | 7 (no Anthropic key) |
| Browser E2E | 40 | 38 | 0 | 2 (buyer login; manual purchase) |
| Spikes | 26 | 23 | 0 | 3 (no Anthropic key) |

The typecheck is clean, the build passes and `npm audit --omit=dev` found 0 vulnerabilities.

## 4. Real PayPal capture

**BLOCKED.** There has been no buyer-approved capture yet. The buyer email and password in `web/.env.local` are still empty (the file hasn't changed since Oct 23), and the PayPal dashboard needs your Face ID or Touch ID. Sandbox order creation, idempotent create, cancel, and refusing a capture before approval all pass live.

## 5. Live AI

**NOT TESTED.** `ANTHROPIC_API_KEY` is empty. The fallbacks are tested through the real SDK against a local fake server. No other provider was substituted.

## 6. Accessibility

- **Fixed:** focus moving into an untitled page (the flake).
- **New automated coverage:** receipt states, and the title being present whenever focus moves.
- Every axe scan is clean.
- **Not done:** VoiceOver, Voice Control, Switch Control, other screen readers, and testing with disabled users. I changed no macOS settings.

## 7. Security

- **New:** a CSRF test.
- **Re-confirmed:** compare-and-set capture locking, request-id idempotency, the webhook signature check plus event de-duplication, server-side prices, the nonce CSP and the rate limits.
- No critical or high-severity issues are known.
- Still needed: rotate the sandbox secret, which appears in a chat transcript.

## 8. Deployment

**Prepared, not deployed.** Recommended: Render Starter with a 1 GB disk, about $11 for Nov 1 – Dec 15. The blueprint is ready. Fly.io would be about $6, but needs a Dockerfile I couldn't build here, because Docker isn't installed. Free tiers either lack a persistent disk or put the app to sleep. Both options need your card and approval.

## 9. Devpost readiness

**Draft only.** The remaining **[brackets]**: capture ids, the live Claude status, the VoiceOver result, the hosted URL, judge credentials and the video.

## 10. What needs your action

1. **Sandbox purchase:** `cd web && npm run build && npm run purchase:manual`. Log in in the Chrome window with the sandbox *personal* account (from developer.paypal.com → Testing Tools → Sandbox Accounts) and press Pay. Then tell me, and I'll fill in the QA report and Devpost.
2. **Anthropic API key:** put it in `web/.env.local`, or decide the demo runs on rules only.
3. **Rotate the PayPal sandbox secret** and update `web/.env.local` and `spikes/.env.local`.
4. **Approvals:** hosting (and the card), making the GitHub repo public, and submitting on Devpost.
5. **People:** do the VoiceOver P0 pass, find testers who use assistive technology, and record the video.
6. **Decisions:**
   - The judge sandbox account, and whether to publish a separate sandbox app's keys in the README (the rules require run credentials).
   - Lightning wording in the video.

## 11. Next steps, in priority order

1. The manual purchase. It unblocks the receipt screenshot, the video and the evidence claims.
2. Approve hosting. Deploy with plenty of margin before Nov 12, configure the webhook, and run the smoke test.
3. The Anthropic key and `npm run test:live`, or commit to rules-only.
4. The VoiceOver P0 pass, and fix whatever it finds.
5. Record the video and resolve every Devpost bracket.
6. Make the repo public, after rotating the secret and re-running the checklist.
7. Submit well before Nov 12, 12:00 pm PT. Nothing can be changed after the deadline.
