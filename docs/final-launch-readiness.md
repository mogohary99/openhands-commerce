# Final launch readiness: 2026-10-29 (evening)

**Deadline:** Thu Nov 12, 2026, 12:00 pm PT. This was rechecked on devpost.com on 2026-10-29, with the same wording as before.
- **Early check:** Devpost's Oct 28 update says projects submitted by **Thu Nov 5** get an early eligibility check, and can still be edited until the deadline. **New target:** submit by Nov 5, then refine.
- **Judging:** judging runs Dec 1 – Dec 15, 2026, 8:00 am PT, so the hosted demo must stay up until then.

Nothing has been made public, deployed, paid for, uploaded or submitted. The only outward action was the owner-authorised **private** GitHub repo. No new PayPal payment was made.

## 1. Status by area

| Area | Status | Evidence |
|---|---|---|
| Private GitHub repo | **DONE.** `https://github.com/mogohary99/openhands-commerce`. It's PRIVATE: a signed-out request gets 404. The remote `main` matches the local `HEAD`. GitHub detects the Apache-2.0 licence for the About section, and the repo has topics | §2 |
| Independent build from GitHub | **PASS.** A fresh clone, built with production `npm ci` and `npm run build`, typechecks and passes unit tests 85/85 (before the rate-limit change) | §2 |
| Render deployment | **BLOCKED: owner approval and owner login.** The exact plan, price and recurring terms are in `deployment.md` (rechecked 2026-10-29). The hosted test suite is ready (`HOSTED_URL=… npm run test:e2e`) | §3 |
| Hosted PayPal (create order, cancel, return, webhook) | **NOT TESTED** (no host). It was dry-run locally: a real sandbox order was created and cancelled on **PayPal's own page**, we got "Nothing was charged", and 0 captures | §3 |
| Hosted Claude | **NOT TESTED** (no host). Locally, live Claude passes 7/7, and the results badge says "Written by Claude" | `qa-report.md` §3d |
| Rate limits on public endpoints | **FIXED (confirmed weakness).** Limits used the client-supplied `X-Forwarded-For`, so a made-up address per request escaped them. Now there are server-wide ceilings on searches, cart changes, approvals and webhooks, plus an hourly budget of 120 uncached Claude calls, above which rules-only text is shown. Tests added | `qa-report.md` §5 |
| Accessibility | Safari and Chrome VoiceOver passes are kept (run by Claude, not by a VoiceOver user). Automated axe, keyboard, zoom, forced colours and reduced motion all pass. A phone-sized check is added to the hosted suite | `qa-report.md` §6 |
| Video | Silent master at 2:31 with burned-in captions. A narration prompter and the mixing step are ready and checked with a test tone. **Narration: owner** | §4 |
| Judge access | **BLOCKED: owner's PayPal dashboard login** (the judges' US sandbox buyer). No app keys are published | `release-checklist.md` → Judge access |
| Devpost | Draft updated. The brackets left are hosted URL, judge buyer, YouTube URL and public repo URL, all waiting on the owner | `submission/devpost.md` |

## 2. GitHub (2026-10-29)

- **Before pushing:**
  - a secret scan loaded every secret-looking value from all local `.env*` files, including backups (5 distinct values), and searched the 144 tracked files and the full history of 47 commits: **0 hits**;
  - pattern scans (Anthropic, PayPal secret-like, bearer tokens, private keys, GitHub and AWS tokens): **0 hits**;
  - no email addresses in tracked files;
  - git-ignored and not uploaded: `.env.local` and its backups, `web/.data/` (databases), `docs/video/` (footage), `.next/`, `test-results/`.
- `gh repo create mogohary99/openhands-commerce --private --source . --push`.
- Visibility `PRIVATE`. `git ls-remote origin main` matches `git rev-parse HEAD`. An anonymous `https://github.com/mogohary99/openhands-commerce` returns 404.
- The commit author email is the owner's GitHub email. It becomes visible when the repo goes public, as usual on GitHub.

## 3. Hosting: what happens after approval

1. **Owner:** approve; create a Render account and card; install the Render GitHub app for **only** `openhands-commerce`.
2. **Owner:** New → Blueprint → this repo. Enter the secrets when prompted: the PayPal client ID and secret (`APP-7R312336N90066720`) and `ANTHROPIC_API_KEY`. `APP_BASE_URL` = `https://<service>.onrender.com`.
3. **Claude:** manual deploy, then `HOSTED_URL=https://<service>.onrender.com npm run test:e2e` from `web/`. That runs every browser test that doesn't need the local database, plus `hosted.spec.ts`:
   - health, with `ai: claude-configured`, `baseUrl: https` and `webhooks: configured`;
   - http→https redirect, HSTS, nonce CSP and hardening headers;
   - the cookie is Secure, HttpOnly and SameSite=Lax;
   - the live-Claude badge;
   - webhooks: an unsigned event is refused, and a forged one is refused after PayPal's verification;
   - spoofed `X-Forwarded-For` doesn't escape the limits;
   - a real sandbox order is created and cancelled on PayPal's page, with 0 captures;
   - a phone-sized screen, with axe.
4. **Owner:** add the webhook in the PayPal dashboard, then put the webhook ID into Render.
5. **Real webhook delivery:** needs a buyer approval. In this app, approving leads straight to a capture, so it is a **new sandbox payment and needs separate approval**. PayPal's webhook simulator sends events that fail signature verification by design. So a simulated event would only show that we reject unverifiable events. It would not count as delivery.
6. Restart from the Render dashboard → health and orders still there (the disk). Run `npm run db:backup` in the Render shell.

## 4. Video

- **Master:** `docs/video/scenes/final.mp4`, 2:31.3, 1280×800, H.264. Frames were checked: no credentials, emails or personal data. The PayPal login field is empty, and the only identifiers are the sandbox order and capture IDs. "NOT FILMED" card kept.
- **Narration:** `npm run video:final` also writes `docs/video/scenes/prompter.html`, which plays the muted master with each caption line large. The owner records in QuickTime, then runs `npm run video:final -- ~/Desktop/narration.m4a`. That trims the lead-in silence, levels the voice to −14 LUFS, and pads the audio so the video is never cut.
  - **Fixed:** the old `-shortest` would have cut the video at the end of a shorter narration.
  - **Checked with a test tone, not shipped:** the audio spans the full 2:31, the lead-in silence was trimmed, and the loudness measured −14.0 LUFS.
- **YouTube:** the title, description and chapters are in `submission/youtube.md`; the thumbnail is `submission/youtube-thumbnail.png`, a real frame. Captions: `submission/video-captions.en.srt` (renamed from `.draft.srt`).

## 5. Tests

See `qa-report.md` §2, "Final gates, 2026-10-29 evening".
