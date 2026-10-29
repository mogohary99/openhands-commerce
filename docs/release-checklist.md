# Release checklist, in priority order

**Status on 2026-10-29 (evening):** the code, tests, payment evidence, live Claude, VoiceOver passes and the silent video master are done. **Still missing, and each needs the owner:** hosting, a judge buyer, narration, and the publishing approvals.

**Deadline:** Nov 12, 12:00 pm PT. Nothing can change after it.
- **Early check:** Devpost's Oct 28 update says submissions made by **Thu Nov 5** get an early eligibility check, and can still be edited until the deadline.
- **Target:** submit by Nov 5 with whatever is verified, then update.

## Done (evidence in `qa-report.md`)

- [x] Real sandbox capture: order `6DB70558VY7613132`, capture `0X564302AP931181C`, COMPLETED, 40.62 USD, 1 capture (2026-10-29). Keep `docs/evidence/sandbox-purchase-manual-buyer.json`.
- [x] Live Claude (`claude-opus-5-5`): 7/7 live tests. The interface works with live Claude.
- [x] VoiceOver P0 passes in Safari and Chrome (run by Claude with the owner's permission; not a VoiceOver user). Two defects were fixed.
- [x] The private GitHub repo `mogohary99/openhands-commerce`. The secret scan was clean, it builds independently from a fresh clone, and GitHub detects the Apache-2.0 licence.
- [x] The silent video master at 2:31, with captions, the prompter and narration mixing; the YouTube text and thumbnail.
- [x] Rate limits made resistant to a made-up `X-Forwarded-For`; an hourly Claude budget.

## Owner actions, in order

1. [ ] **Delete the old PayPal app** `APP-1EV4688594317942R` (its secret was exposed in chat).
2. [ ] **Anthropic Console:** set a monthly spend limit (e.g. $20). The app's own cap is 120 uncached calls an hour.
3. [ ] **Approve Render:**
   - "Render Starter (512 MB, 0.5 CPU, Oregon) plus a 1 GB disk on a Hobby workspace. $7/month plus $0.25/GB-month, billed per second and invoiced monthly, until I delete it. About $11.30 to Dec 15."
   - Then create the account, add the card, and give the Render GitHub app access to only `openhands-commerce`.
   - Blueprint → enter the 3 secrets → tell me "Render is ready" and give me the URL. Steps: `final-launch-readiness.md` §3.
4. [ ] **PayPal webhook:** after the URL exists, add it in the sandbox app and put the webhook ID into Render.
5. [ ] **Judge buyer:** developer.paypal.com → Sandbox → Accounts → Create → Personal, **United States**. Keep the email and password for Devpost (it's a sandbox test login, not a secret of the project). Tell me when it's there; I'll check it reaches PayPal's login from the hosted site without paying.
6. [ ] **Decide:** one hosted sandbox payment (test money) to prove the return URL, capture and a real webhook delivery end to end. Without it, those three stay NOT TESTED on the host. The local payment is already verified.
7. [ ] **Narration:** follow `submission/youtube.md` → "Recording the narration" (about 10 minutes), then tell me. I'll check sync, levels and captions.
8. [ ] **Approvals to publish, each separately:**
   - make the repo public;
   - upload the video to YouTube as Public;
   - submit on Devpost (I fill the form; you press Submit).

## After each owner step (me)

- After 3–4: run `HOSTED_URL=… npm run test:e2e`, restart and check persistence, `db:backup`, and record the results in `qa-report.md` §2.
- After 7: rebuild `final.mp4` with the narration, listen-check levels (−14 LUFS) and cue sync, and check duration < 3:00.
- Before publishing: run `npm run test:all`, `E2E_LIVE_AI=1 npm run test:e2e`, the spikes, `npm audit --omit=dev` and the secret scan again, and fill every Devpost bracket from verified results only.

## Judge access (recommended setup)

- **Hosted demo plus a dedicated US sandbox personal buyer for judges.** Judges open the URL, log in at PayPal Sandbox with that buyer, and get a real sandbox capture (test money). Its email and password go in Devpost's testing instructions **only after the owner approves the disclosure**.
- That buyer is separate from the merchant's REST app. Judges never see or need the app's Client ID or Secret.
- No real money is possible: the PayPal base URL is hard-coded to sandbox, and a unit test enforces it.
- **Running it locally:** "create your own free sandbox app" (`web/README.md` → "For judges"). **Don't publish any app keys.** Never use `APP-7R312336N90066720` for judges.
- **AI for judges:** the hosted demo uses our Anthropic key behind the hourly cap and the Console spend limit. Local runs work without a key: they're rules-only, and the screen says so.

## Submission day run sheet

1. `npm run test:all`, plus once with `E2E_LIVE_AI=1`, the spikes and the secret scan.
2. `HOSTED_URL=… npm run test:e2e` and `/api/health`.
3. Export the video and check it against `video-edit-plan.md` → "Checks before upload".
4. Fill in the Devpost brackets. The disclosures must match `qa-report.md` §1.
5. **Owner:** make the repo public, upload to YouTube, submit. Then check the Devpost page from a signed-out window.
