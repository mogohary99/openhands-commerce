# Final launch readiness: 2026-10-25 (updated after the owner's PayPal attempt)

The current priority order is in `docs/release-checklist.md`.

**Deadline:** Thu Nov 12, 2026, 12:00 pm PT. **Target:** submit Nov 10–11. **Demo must stay up until:** Dec 15, 2026, 8:00 am PT.

Everything below was done locally. Nothing has been pushed, deployed, subscribed to, published or submitted, and no real money was involved. No credential was printed or committed.

## 1. Completed work (this mission)

- **Manual sandbox purchase: ran it and fixed the script.**
  - **Bug:** the script waited for PayPal's checkout page to fire `load`, and that page never does.
  - **Effect:** the first run failed on PayPal's login page, even though our app had created the order and redirected correctly.
  - **Fix:** the redirect wait now uses `waitUntil: "commit"`. The URL is still asserted. The same change was made in the three other PayPal redirect waits.
  - **Second run:** it reached PayPal's login page for order `6E5462927B134152K` ($40.62 USD) and timed out after 10 minutes because nobody logged in.
  - **Checked with PayPal afterwards:** `PAYER_ACTION_REQUIRED`, 0 captures.
- **Receipt at 400 % zoom and in forced colours:** a new test shows the PayPal ids wrap and nothing scrolls sideways. It passes.
- **Real demo footage:** `npm run video:scenes` and `npm run video:assemble` record five silent, keyboard-driven takes of the running app:
  - the cold open;
  - the signature moment through to $40.62;
  - a cancel at PayPal, then "Nothing was charged";
  - high contrast;
  - 400 % zoom.

  Frames were inspected. The first 400 % zoom take was wrong (the page filled only a corner of the frame), so it is now full-resolution stills of the real steps. Cue sheet: `docs/submission/video-script.md` → "Recorded footage".
- **Reviewed and found already in place** (nothing changed):
  - the assistive-technology usability script, `docs/submission/usability-testing-script.md`, about 30 min;
  - the VoiceOver P0 checklist;
  - security regression coverage: webhook signature and duplicate events, CSRF, ownership, rate limits, idempotent create and capture, server-side prices, the nonce CSP.

## 2. Tests: actual results, 2026-10-25

| Suite | Tests | Pass | Fail | Skipped |
|---|---|---|---|---|
| Typecheck, build | n/a | clean, ok | 0 | 0 |
| Unit | 81 | 81 | 0 | 0 |
| Live (PayPal Sandbox + Claude) | 18 | 11 | 0 | 7 (no Anthropic key) |
| Browser E2E | 46 | 38 | **1** | 7 (buyer purchase; manual purchase; 5 video recordings) |
| Spikes | 26 | 23 | 0 | 3 (no Anthropic key) |
| `npm audit --omit=dev` | n/a | 0 vulnerabilities | n/a | n/a |

**The one E2E failure:** the test's own independent token call to `api-m.sandbox.paypal.com` hit a 10-second connect timeout. The app had already created the PayPal order.
- `curl` reached the API right afterwards, and a separate rerun of `live-paypal.spec.ts` passed.
- It is recorded as a failure, not as fixed, and no assertion was changed.
- Details: `docs/qa-report.md` §2.

## 3. Real PayPal payment

**VERIFIED on 2026-10-29.**
- **The payment:** order `6DB70558VY7613132`, capture `0X564302AP931181C`, COMPLETED, 40.62 USD, exactly 1 capture, US buyer, new app `APP-7R312336N90066720`. Evidence: `docs/evidence/sandbox-purchase-manual-buyer.json`; details in `qa-report.md` §3a.
- **The test:** one assumption about PayPal's answer to a fresh-id capture was wrong (201, not 422), and it has been corrected. It doesn't affect the single-capture result.

**History (2026-10-25):**
- **What happened:** on 2026-10-25 the owner approved twice as a real sandbox buyer. PayPal refused both captures with `COMPLIANCE_VIOLATION`. PayPal shows 0 captures, and the payer country was EG.
- **Fixed:** the store now says "PayPal refused this payment. Nothing was charged." It used to say "try again in a moment".
- **Follow-up GET (later the same day):** each order now holds one **DECLINED** capture, and the order status field is gone. Nothing was charged. Evidence: `docs/evidence/sandbox-compliance-violation-2026-10-25.json`. A draft support request is in `docs/paypal-support-request.md` (not sent).
- **Second fix:** "Check again" now records PayPal's existing capture outcome. It used to ask for a re-approval. One new test covers it.
- **US sandbox hypothesis: NOT TESTED.** Creating the accounts needs the owner's dashboard login, and the Chrome extension wasn't connected.
- **Next:** US sandbox accounts and a new app, then rerun. See `qa-report.md` §3b and `docs/release-checklist.md` P1.

## 4. Real Claude API

**VERIFIED on 2026-10-29.** `npm run test:live` 18/18 twice, and the interface works with live Claude. Two fixes are described in `qa-report.md` §3d.

**Earlier:** BLOCKED (the key was empty). The exact setup steps, with a clipboard helper so no file editing is needed, are in `release-checklist.md` P2.

**Earlier:**
- `ANTHROPIC_API_KEY` is empty in `web/.env.local` and in the shell. No other authorized AI provider is configured, and none was substituted.
- A Claude Code subscription doesn't give this app API access.
- **Needed:** an Anthropic API key from console.anthropic.com, on an account with API credit. The app uses `claude-opus-5-5` (`web/lib/ai.ts`).
- Until a key is set, the demo runs on rule-based text, and the "From our rules" label says so.

## 5. Accessibility

| Check | Status |
|---|---|
| Keyboard-only journey, focus management, live-region announcements, accessibility tree | **PASS** (automated) |
| axe on every step (light and dark), all four receipt states (fixtures), recovery notices | **PASS** (automated) |
| 200 % text, 320 px reflow with text spacing, 400 % zoom equivalent (flow and receipt), forced colours, reduced motion, 44 px targets | **PASS** (automated, emulated) |
| macOS Increase Contrast | **NOT TESTED**. The app has no `prefers-contrast` styles. Default contrast already passes AA |
| VoiceOver, NVDA, Voice Control, Switch Control | **NOT TESTED**. I didn't turn on VoiceOver or change any macOS setting |
| Testing with disabled users | **NOT TESTED**. The script is ready |

## 6. Deployment

**Prepared, not deployed.**

| | |
|---|---|
| **Plan** | Render Starter web service plus a 1 GB persistent disk, from `render.yaml` |
| **Cost** | about $11 total for Nov 1 – Dec 15 (pricing read 2026-10-24) |
| **Needs** | a Render account with your card |
| **Then I do** | set the secrets in the Render dashboard; set the PayPal return and cancel URLs to the hosted origin; create the sandbox webhook and set `PAYPAL_WEBHOOK_ID`; smoke-test `/api/health` and the full flow; take daily `npm run db:backup` copies |

The rollback steps are in `docs/deployment.md`. **This is the one approval I need:** "Approve Render Starter plus a 1 GB disk, about $11, until Dec 15."

## 7. Video

**NOT DONE**, but the rough cut is complete except for narration (2026-10-29).
- **The cut:** 2:16. The receipt section is now the **real** receipt of the verified payment (scene 6).
- **PayPal login and Pay:** an honest "NOT FILMED" card, because that purchase wasn't screen-recorded.
- **Still missing:** narration, the final diagram and title cards, and the export.

**Earlier status:**

| | Scenes |
|---|---|
| **Recorded** (real, silent) | the cold open; the signature moment; cancel; high contrast; 400 % zoom |
| **Missing** (must not be staged) | the PayPal login and Pay; the receipt; optional real VoiceOver audio; the narration; the captions; the overlay diagram |

## 8. Devpost readiness

**DRAFT.** These **[brackets]** are still open:
- capture ids;
- live Claude status;
- VoiceOver result;
- hosted URL;
- judge credentials;
- video link.

The claims audit was done on 2026-10-24 (`docs/unattended-mission-report.md`), and no new claims have been added since.

## 9. Remaining owner actions

1. **Pay in PayPal Sandbox again, with US sandbox accounts.** Create US personal and business accounts and an app under the business account. Then run `purchase:manual` while recording the screen (⌘⇧5).
2. **Anthropic key:** add `ANTHROPIC_API_KEY`, or choose rules-only.
3. **Approve hosting:** Render, about $11, on your card.
4. **Rotate the PayPal sandbox secret.** It's in a chat transcript. You need to log in to the PayPal dashboard (Face ID/Touch ID), then update both `.env.local` files.
5. **Judge access:** create a separate sandbox app or buyer for judges.
6. **People:**
   - Do the VoiceOver P0 pass.
   - Recruit assistive-technology testers.
   - Narrate the video and edit it.
7. **Approve:** making the GitHub repo public, then the Devpost submission.

## 10. Exact commands

```bash
cd "/Users/gohary/Desktop/OpenHands Paypal/web"
npm run build && npm run purchase:manual        # log in at PayPal Sandbox in the Chrome window, press Pay
# → docs/evidence/sandbox-purchase-manual-buyer.json; then tell me and I update qa-report and devpost

# after adding ANTHROPIC_API_KEY to web/.env.local:
npm run test:live                                # 7 Claude tests

npm run video:scenes && npm run video:assemble   # re-record silent footage → docs/video/scenes/*.mp4
npm run test:all                                 # final gate before submitting
```
