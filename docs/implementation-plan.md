# Implementation Plan — to submission on Nov 12, 2026 (12:00 PT)

## Status — 2026-10-23 (updated)

Ahead of plan: the Week 1 core flow is built and tested on localhost (`web/`). Evidence: `docs/qa-report.md`.

| Gate / item | Status |
|---|---|
| G1 sandbox keys + live tests | ✅ server side live (create, replay, refusals, mocked declines, 500 retry). ❌ **buyer approve + capture not yet run** (needs buyer creds) |
| G2 negative testing | ✅ `PayPal-Mock-Response` works on capture (422 codes, 500); 4 bugs found and fixed |
| G3 Anthropic key + eval | ❌ no key; fallback tested via SDK + fake server; live tests written |
| G4 InnoSearch hands-on | ❌ owner |
| G5 AT recruitment | ❌ owner — now the critical path |
| G6 Channel3 | Recommend **drop**: it distracts from the signature demo |

### Judging-criteria review (what moves the score next)

| Criterion | Now | Next highest-value step |
|---|---|---|
| Technological Implementation | Server-verified quote, idempotent create/capture, live-tested failure mapping, verified webhooks, 78 unit + 11 live + 21 E2E | Real buyer capture on video; hosted webhook delivery; CSP |
| Design | Hyperlegible type, check-answers pattern, problem panel with side-by-side comparison, light/dark | Manual VoiceOver pass; polish receipt; product photos/illustrations |
| Potential Impact | Clear problem + stats; merchant scale story | 3–5 AT-user sessions with quotes (honestly reported) |
| Innovation/Idea | Pre-payment semantic verification + accessible block/fix | Show one more mismatch type in 5 s (language) only if time |
| Presentation | Storyboard + `demo-checklist.md` | Record with VoiceOver audio; captions |

### Revised next steps

1. Owner: buyer creds → run live buyer E2E → record capture IDs in qa-report.
2. Owner: Anthropic key → `npm run test:live` → decide whether the demo shows Claude badges.
3. Manual VoiceOver pass (owner runs, checklist provided) → fix findings.
4. Hosting (after approval): Render with persistent disk, `APP_BASE_URL`, webhook ID, CSP.
5. Feature freeze Nov 8 unchanged; record Nov 9.

---

**Internal deadline: submit Wed Nov 11, 18:00 PT.** Nov 12 morning is buffer only. Today is Thu Oct 22 → ~20 working days.

## Phase 0 gate items (must happen before/at start of build)

| # | Item | Owner | When |
|---|---|---|---|
| G1 | Create PayPal sandbox REST app; put keys in `spikes/.env.local`; run `npm test` + `scripts/sandbox-checkout.ts`; record results in `research/paypal-feasibility.md` | You (keys) + me | Oct 23 |
| G2 | Enable negative testing on sandbox business account; verify `INSTRUMENT_DECLINED` on capture | Me | Oct 23 |
| G3 | Anthropic API key; run `test/ai.live.test.ts`; build 30-prompt eval | You (key) + me | Oct 23–24 |
| G4 | Hands-on test of InnoSearch checkout + re-check PayPal/ChatGPT/UCP status (novelty wording) | You | by Oct 30 |
| G5 | Start AT-user recruitment (Fable / Access Works / local NFB-ACB chapter); budget for paid sessions | You | Oct 23 — lead time is the risk |
| G6 | Decide on Channel3 (stretch) — only if G1–G3 are green by Oct 27 | Both | Oct 27 |

## Week 1 — Oct 23 → Nov 1: the core flow, end to end

- Next.js + TS app, Tailwind tokens, ESLint (jsx-a11y), Playwright + axe in CI (GitHub Actions), **MIT or Apache-2.0 LICENSE** + public repo from day 1.
- Move spike modules into `lib/` (catalog, verify, ai, paypal) with their tests.
- DB (SQLite via Drizzle for demo; Postgres on host): carts, quotes, approvals, orders, idempotency, webhook_events, audit_log.
- Screens: Home/Shopping-for card, Conversation (role=log pattern, chips, filter form), Recommendations + comparison, Review & Approve (mismatch alert + fix), Receipt.
- AI orchestrator: constraint extraction, read-only tools (search/get/verify), evidence-cited recommendations, explanation + validator + deterministic fallback.
- Server: quote approval endpoint; order create (re-verify, quote-bound, PayPal-Request-Id); capture (assertions, capture-status handling).
- **Exit criterion (Nov 1):** keyboard-only sandbox purchase of the demo scenario on localhost, with mismatch caught and fixed, real sandbox capture COMPLETED, axe clean.

## Week 2 — Nov 2 → Nov 8: payment robustness, accessibility depth, hosting

- JS SDK v6 session (popup) + redirect fallback; all callbacks with focus/announcement handling.
- Recovery: cancel, decline (negative testing), pending, expired order re-create, double-click → single order (E2E test).
- Webhooks with signature verification + reconciliation; simulator events.
- Preferences: text size, density, contrast, reduced motion, simple language; optional push-to-talk + opt-in TTS.
- Deploy to Render/Vercel; sandbox buyer credentials in README.
- **Manual AT matrix**: NVDA+Chrome, VoiceOver+Safari (macOS, iOS), TalkBack, Voice Control, Switch Control, 400% zoom, forced colors. Log issues, fix.
- **AT user sessions** (target 3–5, Nov 4–7) — report honestly however many happen.
- Stretch S1: read-only "Where's my order" via Orders GET / Agent Toolkit. Stretch S2: Channel3 labelled price evidence (only if G6 = go).
- **Exit criterion (Nov 8):** hosted build passes full E2E + axe suite; manual matrix done; feature freeze.

## Week 3 — Nov 9 → Nov 11: story and submission

- Nov 9: record demo per `docs/demo-storyboard.md` (2 takes, keyboard + screen reader); captions; transcript.
- Nov 10: Devpost text, **Tools field** (Claude Opus 5.5 — what it does and does *not* do), README (setup, test credentials, architecture diagram, accessibility statement incl. known PayPal-popup limitations, honest test results), screenshots.
- Nov 11: fresh-clone install test by someone else; YouTube public; repo licence visible in About; **submit by 18:00 PT**.
- Nov 12 (before noon PT): buffer only; no feature work.

## Definition of done for the submission

- [ ] Real sandbox purchase on video, receipt shows real IDs, visible in sandbox dashboard
- [ ] Mismatch moment on video with screen-reader audio
- [ ] Hosted URL works; README run instructions tested from a clean clone
- [ ] Public repo, OSI licence in About, no secrets in history (`git log -p | grep -i secret` + gitleaks)
- [ ] All test results in README are copied from actual runs
- [ ] Video < 3:00, public on YouTube, captions, no unlicensed music/trademarks
- [ ] Accessibility claims match what was actually tested

## Prize targeting

Primary: **Grand Prize (1st)**. If not placed: eligible for **Best Use of Agentic Commerce** / **Most Impactful** honorable mentions (one HM max). Optional sponsor: **Channel3** (only with meaningful API calls). Ties are broken on Technological Implementation first → payment robustness work in Week 2 is not optional.
