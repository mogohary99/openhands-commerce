# Risk Register

Likelihood / Impact: L / M / H.

| # | Risk | L | I | Mitigation | Trigger / owner |
|---|---|---|---|---|---|
| R1 | Live PayPal sandbox: server-side create/replay/refusals **passed Oct 23**; buyer approve + capture pending | L | H | Run `scripts/sandbox-checkout.ts` as sandbox buyer (G1). Orders v2 is public and well-documented. | Any failure in `paypal.test.ts` → fix before any UI work |
| R2 | Negative-testing behaviour (decline on capture) differs from docs — **confirmed works on capture (Oct 23), but returns mock even pre-approval** | L | M | Test day 1; if mock doesn't work on capture, demo decline via create-time mock or sandbox card that declines; describe honestly | G2 |
| R3 | PayPal popup inaccessible to some AT / blocked | M | H | Our accessible approval precedes it; announce; focus handling; **redirect fallback**; document limitation | Manual AT matrix |
| R4 | Model hallucinates prices/claims or follows injected review text | M | H | Server is source of truth; model has no payment tools; explanation validator + deterministic fallback (unit-tested against planted injection) | Eval set; any validator failure rate > 0 on eval → tighten prompt/schema |
| R5 | Anthropic API outage/rate limit during judging | L | M | Flow works with deterministic explanations when model is down; cache-friendly prompts | Health check on hosted demo |
| R6 | Duplicate payment via double-click/retry/race | M | H | Quote-bound PayPal-Request-Id + DB lock + state machine + E2E double-click test | E2E suite |
| R7 | Misrepresenting fictional products / "AI shops anywhere" | L | H | "Fictional — OpenHands Demo Store, sandbox" label on every screen; positioning in spec | Copy review before recording |
| R8 | Overclaiming novelty or accessibility | M | H | Approved wording in `competitive-landscape.md §7`; accessibility claims limited to what was tested | Pre-submission review |
| R9 | No AT users recruited in time | H | M | Start recruitment Oct 23; paid panels (Fable, Access Works); if none, say so — expert manual testing still done | G5 |
| R10 | Scope creep (voice, Channel3, Agent Toolkit) starves core | M | H | P0 list fixed; stretch only after Nov 1 exit criterion; Channel3 gate Oct 27 | Weekly check |
| R11 | Deadline is **noon PT**, not midnight | M | H | Internal deadline Nov 11 18:00 PT | Calendar |
| R12 | Secrets leaked to public repo | L | H | `.env*` git-ignored from first commit; gitleaks in CI; sandbox-only keys; README lists sandbox buyer login only (allowed by rules, still sandbox) | CI |
| R13 | Other entrants build "accessible AI checkout" (it's in the official inspiration list) | H | M | Differentiate on the verification moment + recovery + measured accessibility; make it the first 2 minutes of the video | Storyboard |
| R14 | Web Speech API inconsistency (Firefox none; Chrome cloud-processed) | H | L | Voice optional, feature-detected, never required; disclosure | — |
| R15 | Tax/shipping math disputes (rounding) | L | M | Integer cents; single rounding point; PayPal 422 mismatch as backstop; unit tests | Tests |
| R16 | PayPal idempotency retention shorter than assumed (≈6 h) | M | L | Our own DB idempotency is authoritative | — |
| R17 | Judges evaluate from text + video only (allowed by rules) | H | M | Video must carry the whole proof (dashboard cut, real IDs); README shows exact test output | Storyboard |
| R18 | Claude Opus 5.5 API specifics (no forced tool_choice, effort default medium) | L | L | Already handled in spike (structured outputs, explicit effort); typecheck passes | — |
| R19 | Sandbox client secret pasted in chat transcript | M | L | Rotate before repo goes public (steps in qa-report §5) | Before publishing |
| R20 | No manual AT testing yet (VoiceOver AppleScript disabled; no AT users) | H | H | Owner-run VoiceOver checklist; recruit AT users now | G5 |
