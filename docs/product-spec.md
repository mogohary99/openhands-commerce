# Product Spec — OpenHands Commerce

> This is the product spec written before the build. Some planned items were cut or simplified. What actually exists is in `docs/architecture.md`, with test evidence in `docs/qa-report.md`.

## One line

An accessible AI shopping companion that **checks the thing before you pay for it**: it finds products in a verified merchant catalog, explains its recommendations with evidence, catches configuration, price and budget mismatches before payment, and completes a PayPal checkout only after the shopper explicitly approves an exact, verified quote.

## Problem

- Disabled shoppers face inaccessible checkouts (95.9% of top home pages fail automated WCAG checks; only 15/71 large German shops work by keyboard) and are often forced to have someone else complete purchases.
- AI shopping agents promise help, but trust is fragile: 60% would abandon an agent after one mistake, only 43% trust it to respect a spending limit, 15% trust it to fix a failed transaction (ACI/YouGov 2026).
- Agent payment rails verify **amount and consent**, not **whether it's the right item**. For a blind shopper, "the cable won't fit your phone" is precisely the error that's hard to notice and costly to return.

Sources: `research/competitive-landscape.md`.

## Audience

Primary: blind/low-vision screen-reader users; people with motor disabilities using keyboard, switch or voice control; people with speech disabilities using typed/AAC input. Secondary: people with cognitive or learning disabilities and older adults who benefit from plain language and confirmation. Business customer (scale story): PayPal merchants who need accessible, agent-ready checkout (EAA/ADA pressure).

## Positioning

We are honest about scope: **OpenHands sells from a verified merchant catalog where we control prices and stock** (for the hackathon, the fictional "OpenHands Demo Store" on a PayPal sandbox merchant account). We do not check out at arbitrary third-party sites. The scale story is that any PayPal merchant can plug their catalog in.

## Personas & scenarios (for design and testing — not real users)

1. **Screen-reader user (NVDA + Chrome):** "My phone uses USB-C. I need a charger with a cable, under $45 all in." → catches Lightning-cable bundle.
2. **Switch-access user:** shops entirely with chips and the filter form, two switches, no typing.
3. **User who cannot speak (AAC app pasting text):** same flow via pasted text.
4. **Low-vision user at 200% zoom with "read replies aloud" on.**
5. **Cognitive-accessibility user:** "simple language" mode; one decision per screen.

## Core user journey (MVP)

1. **Describe need** (type, paste, chips, filter form, or optional push-to-talk). App shows an editable "Shopping for" card: category, all-in budget, device connector/language, must-haves — extracted by AI, confirmed by the user.
2. **Search** the verified catalog (server-side, deterministic filters).
3. **Recommend** ≤3 options; every reason cites catalog facts or labelled reviews; comparison table available.
4. **Select** a product/variant.
5. **Verify** (server, deterministic): unknown item, stock, quantity sanity, duplicate line, price drift since shown, connector/language/variant compatibility, **all-in total (items + shipping + tax) vs budget**.
6. **Explain**: blocking findings shown as an accessible alert with a one-click fix (e.g., "Switch to the USB-C cable bundle (same price)"). AI writes the plain-language explanation; the server validates it (no unsupported amounts, every finding covered, no payment claims) or falls back to deterministic text.
7. **Approve**: check-answers summary; Approve button includes the amount; approval is bound to the exact quote hash.
8. **Pay**: full-page redirect to PayPal Sandbox's approval page for an order built only from the approved quote. (The JS SDK popup in the original plan was not built; it's listed under "What's next".)
9. **Receipt**: verified by the server from PayPal capture status, accessible HTML receipt with order + capture IDs. (An email or plain-text copy was not built.)
10. **Recovery**: cancel, decline, pending, expired order, double click — each with a calm plain-language message and a safe next step.

## Feature list and priority

| ID | Feature | Priority |
|---|---|---|
| F1 | Typed-first conversational search + chips + filter form | P0 |
| F2 | AI constraint extraction to an editable "Shopping for" card | P0 |
| F3 | Evidence-cited recommendations (≤3) + accessible comparison table | P0 |
| F4 | Deterministic verification engine (rules above) | P0 |
| F5 | Accessible mismatch alert with one-click fix | P0 |
| F6 | Check-answers review + quote-bound explicit approval | P0 |
| F7 | PayPal Orders v2 sandbox: server create/capture, idempotency, capture-status handling | P0 |
| F8 | Accessible verified receipt | P0 |
| F9 | Recovery: cancel, decline (negative testing), pending, duplicate prevention | P0 |
| F10 | Webhook verification + reconciliation | P1 |
| F11 | Preferences: text size, density, contrast, reduced motion, simple language | P1 |
| F12 | Optional push-to-talk STT + opt-in TTS | P1 |
| F13 | Redirect (full-page) PayPal fallback | P1 |
| F14 | "Where's my order" read-only status via PayPal Agent Toolkit / Orders GET | P2 |
| F15 | Channel3 "typical price elsewhere" evidence (labelled, never purchasable here) | P2 / stretch |
| F16 | Merchant catalog adapter docs (scale story) | P2 |

## Non-negotiable rules

1. The AI **never** creates, approves, captures or refunds a payment. It has no payment tools.
2. Prices, totals, stock and compatibility come only from the server catalog; the client never sends prices.
3. Every claim shown to the user is traceable to a catalog field, a labelled customer review, or a deterministic finding.
4. Payment requires an explicit user action on a screen showing the exact total; voice alone can't approve.
5. No real money: sandbox base URL is hard-coded in the payment module; no live credentials exist in the project.
6. Fictional products are labelled as such on every screen.

## Success metrics (hackathon)

- End-to-end sandbox purchase including a caught mismatch, completed keyboard-only and with a screen reader, in < 3 minutes on video.
- 0 axe violations on every flow state; manual AT matrix completed; ≥3 sessions with AT users (if recruitment succeeds — reported honestly either way).
- Verification engine: 100% of scripted mismatch cases caught; 0 false "OK" on the test set.
- AI explanation validator: 0 unsupported amounts reach the UI on the eval set.

## Out of scope

Real payments; third-party merchant checkout; account system beyond a session; returns/refund initiation by AI; native mobile apps.
