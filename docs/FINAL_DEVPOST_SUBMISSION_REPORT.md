# Final Devpost submission report

**Status (2026-11-07): NOT SUBMITTED YET.** The repo is public, the video is finished, and the Devpost text is ready to paste. The YouTube upload and the Devpost submission need the owner's signed-in browser: the Claude in Chrome extension is not connected, and accepting the competition terms is the owner's decision. I'll update this file once Devpost shows the entry as submitted.

| # | Item | Status |
|---|---|---|
| 1 | Devpost submission URL | **PENDING**: not created yet |
| 2 | SUBMITTED status | **NOT CONFIRMED** |
| 3 | Public GitHub repo | **DONE**: https://github.com/mogohary99/openhands-commerce (public since 2026-11-07, Apache-2.0, signed-out check 200) |
| 4 | Public YouTube video | **PENDING upload**: `docs/video/scenes/final.mp4` (2:31, captions burned in, `docs/submission/video-captions.en.srt`). Title, description, chapters and thumbnail are in `docs/submission/youtube.md` |
| 5 | Hosted demo | **NOT DEPLOYED.** The $0 option is ready: `render.free.yaml` and `docs/deployment.md` → "Free hosting (Render Free, $0)". Owner: a Render sign-in, no card. Fallback: run locally, `web/README.md` → "For judges" |
| 6 | Tests | `qa-report.md` §2, "Release gates, 2026-11-07": unit 87/87, live 18/18, browser 41 pass / 0 fail / 7 skipped, spikes 26/26, audit 0, secret scan 0 hits |
| 7 | Accessibility | Automated: axe on every step, keyboard-only, accessibility tree, 320 px reflow, forced colours, reduced motion, target size. VoiceOver in Safari and Chrome, run by Claude rather than a VoiceOver user. **No disabled-user testing; no WCAG claim** |
| 8 | PayPal Sandbox evidence | Order `6DB70558VY7613132`, capture `0X564302AP931181C`, COMPLETED, 40.62 USD, 1 capture (`docs/evidence/sandbox-purchase-manual-buyer.json`). Not repeated |
| 9 | Live Claude evidence | `claude-opus-5-5`, 7/7 live tests; the browser suite passes with live Claude (`qa-report.md` §3d) |

## Limitations

- **Demo:** a fictional single demo catalog, not cross-merchant shopping. PayPal Sandbox only.
- **Not tested:**
  - a hosted deployment, hosted return and capture, and real webhook delivery;
  - NVDA, JAWS and TalkBack;
  - disabled users.
- **Not filmed:** the PayPal login and Pay step. The video says so on screen.
- **Free hosting:** demo data resets on restart or spin-down. This is fail-safe: an order the database no longer knows is never captured or shown as paid (`web/test/unit/ephemeral-store.test.ts`). The service needs about a minute to wake up when cold.
- **Narration:** a synthesized voice. Devpost's video update allows it: "An AI voiceover is fine."

## Owner actions still required

1. **Reconnect Claude in Chrome**, in a Chrome where you're signed in to YouTube and Devpost. I then upload the video as Public, and fill every Devpost field from `docs/submission/devpost.md`.
2. **Accept the Devpost and PayPal competition terms yourself, and press Submit.** They include binding individual arbitration, a release and indemnity, and 3-year publicity use (`docs/submission/devpost-rules-checklist.md`).
3. **Optional: the hosted demo.** Sign in to Render with GitHub (no card), then New → Blueprint → `render.free.yaml`, and enter the secrets in Render. Then I run `HOSTED_URL=… npm run test:e2e`.
4. **Optional: a judge sandbox buyer,** and whether to publish its login. Without it, judges use their own sandbox app (README).
5. **Still open from before:** delete the old PayPal app `APP-1EV4688594317942R`, and set an Anthropic Console spend limit.
