# Accessibility Findings — OpenHands Commerce

_Target: **WCAG 2.2 Level AA**, with selected AAA where it is cheap and matters (44 px targets, reduced motion). Research date 2026-10-22. Sources inline._

## 1. Principles

1. **Typed and button input is the primary path; voice is an optional extra.** The product must be complete for someone who cannot speak, cannot use precise gestures, or turns audio off.
2. **The user's own assistive technology wins.** We never compete with screen readers (TTS off by default), never steal focus during chat, never force a voice.
3. **Payment decisions are explicit, reversible until submitted, and checked** (SC 3.3.4).
4. **Automated checks are a floor, not proof.** See §8.

## 2. WCAG 2.2 success criteria that drive the design

Understanding docs: https://www.w3.org/WAI/WCAG22/Understanding/ · New in 2.2: https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/

| SC | Level | Application in OpenHands |
|---|---|---|
| 2.4.11 Focus Not Obscured (Min) | AA | Sticky composer/approval bar must never fully hide focus → `scroll-padding-bottom` equal to bar height. |
| 2.5.7 Dragging Movements | AA | No sliders-only; budget is a number field with +/- buttons. |
| 2.5.8 Target Size (Min) | AA | ≥24 px required; **we design to 44×44 px** for every control (2.5.5 AAA). Space between Approve and Cancel. |
| 3.2.6 Consistent Help | A | "Get help" in the same place on every screen incl. review and receipt. |
| 3.3.7 Redundant Entry | A | Budget, device connector, etc. stated in chat are carried into the review — never re-asked. |
| 3.3.8 Accessible Authentication (Min) | AA | No puzzle CAPTCHA; paste allowed; PayPal handles payer login. |
| 3.3.4 Error Prevention (Legal, Financial) | AA | Check-answers review + explicit Approve + cancel; we exceed it by blocking known mismatches. |
| 4.1.3 Status Messages | AA | `role="status"` for results/updates; `role="alert"` only for blocking mismatches/errors. |
| 1.4.10 Reflow / 1.4.12 Text Spacing / 1.4.4 Resize | AA | Works at 320 CSS px, 200% text, WCAG spacing overrides; rem units; never disable zoom. |
| 2.2.1 Timing Adjustable | A | No timeouts on chat or approval; expired PayPal orders are silently re-created from the saved cart. |
| 2.5.3 Label in Name | A | Voice-control users say "click Approve and pay" → accessible name starts with the visible label. |
| 1.4.1 Use of Color, 1.4.3/1.4.11 Contrast | AA | Warnings use icon + words + border, not colour alone; 4.5:1 text, 3:1 UI/focus. |
| 2.3.3 Animation from Interactions | AAA (adopted) | Honour `prefers-reduced-motion`. |

## 3. Interaction patterns

**Conversation**
- Transcript container: `role="log"` + `aria-label="Conversation"` (https://www.w3.org/TR/wai-aria-1.2/#log).
- **Never stream tokens into a live region** — screen readers queue/garble partial updates (practitioner consensus: https://azukiazusa.dev/en/blog/accessible-streaming-chat-ui, https://jira.atlassian.com/browse/ROVO-978). Stream visually in a non-live container with `aria-busy="true"`; insert the finished message into the log once; a separate polite `role="status"` says "Assistant is typing…" then "Reply ready: 3 chargers found, cheapest $24.99".
- Setting: "Read full replies automatically" vs "Just tell me a reply arrived".
- Focus stays in the composer; each message has a heading ("OpenHands, 10:42") for heading navigation; "Jump to latest reply" shortcut; "Stop" button always in the same place.

**Recommendations and comparison**
- Max 3 recommendations, then "Show more". Each recommendation states **why**, citing catalog facts ("Tactile raised dot marks the port side — from the product listing").
- Comparison is a real `<table>` with `<caption>`, `th scope="col"` products, `th scope="row"` attributes (https://www.w3.org/WAI/tutorials/tables/two-headers/); card view at narrow widths; a plain-language summary above it. Mismatched cells say so in text.

**Mismatch warning (the core moment)**
- Persistent panel with heading, icon (decorative, `aria-hidden`), plain sentence, and a one-click fix button ("Switch to the USB-C cable bundle (same price)").
- `role="alert"` only while it blocks payment; becomes a plain region once fixed, with a polite status "Your order now matches".
- The Approve button stays focusable but `aria-disabled="true"` with `aria-describedby` pointing to the reason, so users can discover *why* — activating it moves focus to the fix rather than silently doing nothing.

**Check answers → approve → confirmation** (GOV.UK patterns: https://design-system.service.gov.uk/patterns/check-answers/, https://design-system.service.gov.uk/patterns/confirmation-pages/, error summary: https://design-system.service.gov.uk/components/error-summary/)
- Review lists item, variant, quantity, item total, shipping, tax, **all-in total vs budget**, each with "Change<span class="visually-hidden"> item</span>".
- Approve label includes the amount: "Approve and pay $40.62 with PayPal".
- Errors: error summary at top, focus moved to it, title prefixed "Error:".
- Receipt: `h1` "Order confirmed", reference number, line items as a table, print CSS, plain-text email/HTML copy; focus moved to `h1`.

**Routing (Next.js)** — Next's route announcer reads title/h1 on client transitions (https://nextjs.org/docs/architecture/accessibility) but does not move focus; we move focus to `h1` on review/confirmation/receipt routes only.

**Numbers** — `Intl.NumberFormat('en-US', {style:'currency', currency:'USD'})`; never split dollars/cents into separate spans; dates written out ("Thursday, October 22, 2026").

## 4. Voice (optional)

- **SpeechRecognition:** Chrome/Edge (prefixed, cloud-processed by Google — needs disclosure), Safari 14.1+/iOS 14.5+ (Apple service), **Firefox: not available by default** (https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition; https://wiki.mozilla.org/Web_Speech_API_-_Speech_Recognition). Feature-detect; hide the mic when unsupported; consider server-side STT behind consent as a consistent fallback.
- **Push-to-talk**, visible + announced listening state, transcript appears **editable** in the composer, **never auto-sends**, and voice can never approve payment on its own.
- **speechSynthesis:** broadly supported (https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis) but conflicts with screen readers → **off by default**, opt-in "Read replies aloud" with pause/stop/rate; stops when the user types or presses Esc.

## 5. Users who cannot speak or use precise gestures

- Typed composer (Enter sends, Shift+Enter newline); **quick-reply chips** as real `<button>`s in a labelled group ("Cheaper", "Compare these", "Explain simpler", "Cancel").
- Structured filter form (category, budget, connector) as an equivalent to conversation.
- **AAC compatibility:** AAC apps often paste or keyboard-emulate large bursts → paste works, no per-keystroke handlers that drop input.
- **Switch access:** few tab stops, skip links, "Jump to review", no auto-advancing UI, no hover-only UI.
- No double-click, long-press, multi-touch or drag; activate on up-event (2.5.1, 2.5.2).

## 6. Adjustable presentation

Text size (100–200%), density (comfortable/compact), high-contrast theme, dark mode, reduced motion (respects OS setting, with an in-app override), "simple language" toggle that asks the model for shorter explanations — all persisted per user.

## 7. PayPal popup / iframe

- No official PayPal statement on Smart Buttons/popup accessibility; v6 docs only say web components "handle styling and accessibility" (https://developer.paypal.com/sdk/js/reference/). A third-party report flags a 4.1.2 issue on a PayPal modal trigger (https://woocommerce.com/accessibility/paypal-braintree-for-woocommerce-accessibility-conformance-report/). **Treat as untested until we test it.**
- Mitigations: PayPal button appears **only after** our accessible approval; visible text "Opens PayPal in a new window; you'll come back here"; announce on click; `onApprove` → focus confirmation h1; `onCancel` → "Payment cancelled. Your cart is saved." + focus back to review; `onError` → our error summary (never raw SDK message); **redirect fallback** using the order's approve link for AT that struggles with popups; human help route.
- We can claim conformance only for our pages; PayPal's flow is documented as third-party content in our accessibility statement.

## 8. Automated checks vs. usability testing with AT users

| | Automated (axe-core, Playwright, Lighthouse, Pa11y) | Manual expert review | Usability testing with disabled people |
|---|---|---|---|
| Finds | Missing names/labels, contrast, ARIA misuse, lang, some structure | Focus order, live-region behaviour, label-in-name, keyboard traps, reflow, popup handling | Whether people can actually **understand and complete** the purchase, trust the warnings, recover from errors |
| Coverage evidence | Deque: ~57% of issues **by volume** (https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues/); GDS: best single tool found 41%, all 13 tools 71% of 143 barriers (https://accessibility.blog.gov.uk/2017/02/24/what-we-found-when-we-tested-tools-on-the-worlds-least-accessible-webpage/) | — | — |
| In our plan | CI on every flow state | NVDA+Chrome, JAWS+Chrome, VoiceOver+Safari (macOS/iOS), TalkBack, macOS Voice Control, Switch Control, keyboard, 400% zoom, forced colors | ≥3–5 paid sessions (Fable https://makeitfable.com, Access Works https://access-works.com, local NFB/ACB chapters), sandbox only, accessible consent, fair pay |

**We will not describe the product as "accessible" or "WCAG conformant" in the submission based on automated results alone.** Wording: "Designed to WCAG 2.2 AA; automated checks pass; manually tested with [list]; usability-tested with N assistive-technology users" — filling in only what actually happened.

## 9. Phase 0 viability spike — results

`spikes/a11y/review.html` (the mismatch → fix → approve screen) + `spikes/test/a11y.test.ts`, run in headless Google Chrome via Playwright:

| Check | Result |
|---|---|
| axe-core WCAG 2.0/2.1/2.2 A+AA + best-practice, light theme, before and after the fix | **0 violations** (37 passing rules, 0 incomplete) |
| Same, dark theme | **0 violations** |
| Negative control — inject missing `lang`, empty button name, low-contrast text | axe reports exactly `html-has-lang`, `button-name`, `color-contrast` (proves the scan is not vacuous) |
| Keyboard-only: Tab order skip-link → fix → approve → cancel; activating the blocked Approve does **not** proceed and moves focus to the fix; Enter applies fix, focus moves to Approve, status announces "now matches", alert role removed; Space approves | **Pass** |
| Accessible name of Approve contains the visible label (2.5.3) and is described by help text | **Pass** |
| All buttons ≥ 44×44 CSS px | **Pass** |
| 320 px viewport + WCAG text-spacing override: no horizontal scroll | **Pass** |
| `prefers-reduced-motion: reduce` removes transitions | **Pass** |

**Not yet done (and not claimed):** screen-reader output listening tests (NVDA/JAWS/VoiceOver/TalkBack), voice-control and switch-access testing, PayPal popup testing, any testing with disabled users. These are scheduled in `docs/implementation-plan.md`.

## 10. Design checklist (carried into the product spec)

- [ ] Semantic HTML, landmarks, skip link, unique title + h1 per route, `lang`.
- [ ] Chat log pattern above; no streamed live-region text; focus stays in composer.
- [ ] Alerts only for blocking issues; live regions exist before content is injected.
- [ ] Typed-first, chips, filter form, paste/AAC friendly; voice optional, push-to-talk, editable, never auto-sends, never approves.
- [ ] TTS opt-in, never default.
- [ ] 44 px targets, visible 3:1 focus ring, no drag/hover-only/timeouts.
- [ ] Label-in-name for every control; no icon-only buttons without visible text.
- [ ] Check-answers review, amount in Approve label, cancel keeps cart, error summary pattern.
- [ ] PayPal: announced, after approval, focus handling on all callbacks, redirect fallback.
- [ ] Reflow 320 px, 200% text, text spacing, forced colors, reduced motion, dark mode.
- [ ] axe in CI on every state + manual AT matrix + paid AT-user sessions.
