# Release checklist, in priority order

**Status on 2026-10-29: NOT submission-ready.** A verified capture now exists (P1). Still missing: live AI, a screen-reader pass, a hosted demo and the final video.

**Deadline:** Nov 12, 12:00 pm PT. **Target:** submit Nov 10–11. Nothing can change after the deadline. Each gate lists the evidence that closes it; "done" without that evidence doesn't count.

## P1: a real payment capture (blocks the video, Devpost and hosting smoke test)

- [ ] **Owner:** in developer.paypal.com → Sandbox accounts, create a **personal** and a **business** account with country **United States**.
  - Why: two real approvals from the current Egypt-country sandbox accounts were refused with `COMPLIANCE_VIOLATION` (`qa-report.md` §3b).
- [x] **Owner (2026-10-26):** created US sandbox personal and business accounts and a new app.
- [x] (2026-10-29) New app keys configured in both files; merchant differs from the old one. ~~**Owner:** get the new app's keys into the project. They still aren't in `web/.env.local` or `spikes/.env.local`: on 2026-10-29 the project still used `APP-1EV4688594317942R`. A clipboard helper on this Mac (run by Claude) writes both files and refuses the old app; the owner only clicks Copy for the Client ID and the Secret.~~
  - This also rotates the secret exposed in chat.
  - Then delete the old app's secret, or the whole old app.
- [x] `npm run build && npm run test:live` with the new keys: 11 pass, 7 skipped (Claude).
- [x] **Owner (2026-10-29):** logged in as the US personal account and pressed Pay. Order `6DB70558VY7613132`.
- [x] **Evidence:** written by hand from PayPal's GET responses: COMPLETED, 40.62 USD, 1 capture. A fresh request id got 201, not 422; still 1 capture. ~~The original target: `COMPLETED`, 40.62 USD, `capturesAfterReplays: 1`, a same-id replay returning the same capture, and a fresh id getting 422 `ORDER_ALREADY_CAPTURED`.~~
- [ ] Re-run `purchase:manual` once with the corrected fresh-id assertion, so the evidence file is written by the test itself. Optional, and it needs one more owner approval. A screen recording during that run gives the video its payment footage.
- [ ] If capture fails again: don't retry that order. Fill in the merchant ID in `docs/paypal-support-request.md`, add the new debug_id, and send it (owner).
- [ ] I copy the order and capture ids into `qa-report.md` §1/§3a and into devpost.md.

## P2: live AI, or an explicit rules-only decision

- [ ] **Owner:** an Anthropic API key, or the decision to run rules-only. As of 2026-10-29 the key is empty in both `.env.local` files and in the shell. A Claude Code subscription doesn't count.
  1. Sign in at https://console.anthropic.com. Check Plans & Billing: you need prepaid API credit, and $5 is plenty for the tests. Adding credit is your decision; I don't touch billing.
  2. Go to API keys → Create key. Name it `openhands-commerce-hackathon` and pick your default workspace.
  3. Tell me first, so I can start the clipboard helper. Then click **Copy** on the new key. The helper:
     - checks it with the free `GET /v1/models` endpoint and confirms `claude-opus-5-5` is listed;
     - backs up both files;
     - writes `ANTHROPIC_API_KEY` into `web/.env.local` and `spikes/.env.local`.

     It never shows or logs the key. Don't paste it into chat.
  4. I then run `npm run test:live` (7 Claude tests, at a cost of a few cents) and the spikes.
  5. **Before Dec 15:** add the same key in the Render dashboard, and set a monthly spend limit in the Console.
- [ ] `npm run test:live` runs all 7 Claude tests: extraction, injection, mismatch and over-budget explanations, the comparison intro, the planted review, a real timeout. **Evidence:** 0 skipped, 0 failed.
- [ ] If any fail, fix them or ship rules-only. The narration and Devpost wording must match what the badge on screen says.

## P3: accessibility

- [x] Automated checks: keyboard, focus, live regions, axe light/dark on every step, receipt states, zoom/reflow, forced colours, reduced motion. Status: PASS.
- [ ] (2026-10-29) **Not run by Claude:** turning on VoiceOver changes a macOS accessibility setting, and that hasn't been authorized.
- [ ] **Owner:** VoiceOver P0 (`docs/accessibility/voiceover-checklist.md`, items 1–13) in Safari, then Chrome. Fill in the Result column, word for word.
- [ ] I fix every P0 defect, add a regression test where possible, and rerun the suite.
- [ ] **Optional (owner):** sessions with assistive-technology users (`docs/submission/usability-testing-script.md`). Claim only the sessions that happened.

## P4: hosted demo

- [ ] **Owner:** approve Render, about $11 (`docs/deployment.md` → "Approval checklist"), steps 1–5.
- [ ] I deploy and confirm the health check: `ok`, `database: ok`, `paypal: sandbox-configured`, `webhooks: configured`, `baseUrl: https`.
- [ ] Hosted smoke test: the signature flow, cancel ("Nothing was charged"), a real purchase verified with PayPal, a webhook delivery recorded once, a restart that keeps orders, and a first `db:backup`.
- [ ] **Owner:** a US judge buyer account works from a private window on the hosted URL.

## P5: final video

- [x] (2026-10-29) Silent scenes 1–5, plus scene 6: the **real** receipt of the verified payment. Rough cut 2:16 (`npm run video:roughcut`), checked frame by frame at the seams.
- [ ] Re-record scenes 1–5 on the final build if the UI changes. Scene 6 can't be re-made without a new payment, so keep the file.
- [ ] Edit following `docs/submission/video-edit-plan.md`. The PayPal login and Pay stay a "NOT FILMED" card unless genuine footage exists. Optional: a recording of the business account's Activity page for that payment.
- [ ] **Owner:** narration. Captions come from `video-captions.draft.srt`, re-timed. Add the transcript to `video-transcript.md`.
- [ ] Check: under 3:00, 720p or 1080p, no clipping, no personal data on screen, and the badge matches the narration.
- [ ] **Owner:** upload to YouTube as Public, but only after the go-ahead to submit.

## P6: publish and submit (each step needs owner approval)

- [ ] Resolve every **[bracket]** in devpost.md, or delete the sentence. The disclosures must match `qa-report.md` §1.
- [ ] Decide on judge credentials: publish keys for a judge-only sandbox app, or "create your own" (`web/README.md` → "For judges"). Never publish the project's own keys.
- [ ] Secret scan (no hits in any file or any commit), then `npm run test:all` passes. Record the counts.
- [ ] **Owner:** push the repo to GitHub as public, with the license shown in About.
- [ ] **Owner:** submit on Devpost by Nov 11, then check the page from a signed-out window.
