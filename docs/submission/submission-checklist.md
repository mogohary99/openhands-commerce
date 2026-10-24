# Submission checklist: deadline Thu Nov 12, 2026, 12:00 pm PT

Rules verified 2026-10-24 (`research/devpost-rules-verified.md`). Nothing below has been submitted, published or deployed. **Owner** marks the steps that need you (login, approval, money or a human).

## A. Evidence that must exist before anything is claimed

| Item | How | Status |
|---|---|---|
| Real buyer-approved sandbox capture, verified with PayPal | `cd web && npm run build && npm run purchase:manual`, then log in at PayPal Sandbox yourself → `docs/evidence/sandbox-purchase-manual-buyer.json` | **BLOCKED: owner** |
| Live Claude path | Add `ANTHROPIC_API_KEY` to `web/.env.local`, then `npm run test:live` (7 Claude tests) | **BLOCKED: owner** (or decide rules-only) |
| VoiceOver pass | `docs/accessibility/voiceover-checklist.md`, P0 at least | **NOT RUN: owner** |
| Hosted demo up, `/api/health` ok, smoke test passes | `docs/deployment.md` | **NOT DEPLOYED: needs approval and a card** |
| Webhook delivered to the hosted URL | `docs/deployment.md` step 5 | NOT TESTED (needs hosting) |

## B. Submission form fields

| Field | Source | Status |
|---|---|---|
| Title, tagline, story sections | `docs/submission/devpost.md` | Drafted. Resolve every **[bracket]** first |
| Public GitHub repo with a license | `docs/submission/public-repo-checklist.md` | **Owner approval** |
| Demo video: public YouTube, under 3:00, real app, no unlicensed music or trademarks | §C below | Not recorded |
| Hosted URL, or setup instructions | Hosted URL, or `web/README.md` | Instructions ready. URL pending |
| Judge test credentials | A dedicated sandbox personal account, written into the testing instructions | **Owner**: create it at developer.paypal.com |
| Credentials needed to run from the repo | The rules (R §4 Testing) require the repo instructions to include "any test account credentials, API keys, or sandbox login details". **Owner decision:** create a *separate* sandbox REST app just for judges and publish its sandbox keys (never the project's own keys, never live keys), or rely on the hosted URL and tell judges to create their own free sandbox app | **Owner** |
| Screenshots | `docs/screenshots/` (16, demo data). Add a receipt shot once a real capture exists | Partial |
| Built with | List in devpost.md. Add "render" only if deployed there | Drafted |

## C. Video recording plan

1. **Only after A's first row is done** (the video must show a real sandbox payment).
2. Record on the hosted build, or the local production build (`npm run build && npm start`): Chrome, 1280×800, zoom 125%, notifications off, bookmarks bar hidden, a fresh profile (no personal tabs or autofill).
3. Use macOS screen recording (⌘⇧5 → Record Selected Portion) plus a USB microphone, or narrate over it afterwards. Record each table row of `video-script.md` as a separate take.
4. Only include VoiceOver if it's genuinely running in the take. Otherwise cut those lines and say "a screen reader would announce…".
5. Settle the trademark question before recording: the rules ban unlicensed trademarks in the video. The connector name is used only descriptively, but a cautious alternative is to say "the wrong cable" and show the text without zooming in on it.
6. Edit to 2:45 or less, burn in captions, export 1080p, upload to YouTube as **Public**, and add the .srt. Save the transcript to `docs/submission/video-transcript.md`.
7. Check the final upload signed out (private window): it plays, it's under 3:00 and the captions are on.

## D. Demo backup plan (if something fails during judging, until Dec 15)

| Failure | Backup |
|---|---|
| Host down | The video shows the full flow. `web/README.md` has local setup. `/api/health` lets you see it quickly. Daily `npm run db:backup` (`docs/deployment.md`) |
| PayPal Sandbox down or slow | The signature moment (blocked → fixed) needs no PayPal. Cancel and recovery still explain that "nothing was charged". The video has a recorded real capture |
| Claude down, slow or out of credit | Automatic rule-based fallback, labelled "From our rules". Nothing breaks (unit-tested; the real-timeout test runs once a key is set) |
| A judge uses their real PayPal account | Not possible: the app can only reach the Sandbox (hard-coded, unit test). The testing instructions say to use the provided sandbox buyer |
| A judge's sandbox login hits a CAPTCHA | It's PayPal's page. The instructions tell judges to solve it themselves. Nothing in our app depends on it |

## E. Final pre-submit pass (owner, about 15 min)

- [ ] `cd web && npm run test:all` is green. Record the counts in `docs/qa-report.md` §1
- [ ] `git log -p --all | grep -c <first 8 chars of the CURRENT secret>` → 0, after rotating the secret
- [ ] Every **[bracket]** in devpost.md is resolved, or the sentence is deleted
- [ ] The disclosures section matches qa-report §1 (what was and wasn't tested)
- [ ] The hosted URL and judge credentials work from a private window
- [ ] Submit with margin before **Nov 12, 12:00 pm PT**. The rules forbid any change after the deadline (R §5)
