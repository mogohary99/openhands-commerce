# Demo Checklist — signature flow

**Story:** the shopper asks for USB-C, picks Lightning, hears why it won't fit, fixes it with one keystroke, and completes a verified PayPal Sandbox purchase.

## Before recording

- [ ] `cd web && npm run test:all` green, **including** the live buyer test (needs buyer creds in `.env.local`)
- [ ] `rm -rf web/.data && npm run build && npm start` (fresh database, no leftover cart)
- [ ] `/api/health` shows `paypal: sandbox-configured`; decide whether `ai` is `claude-configured` (the badge on screen must match)
- [ ] Sandbox buyer logged **out** of sandbox.paypal.com in the recording browser (so the login is shown), or logged in (shorter) — pick one
- [ ] VoiceOver on (⌘F5), rate ~55, Chrome or Safari; captions ready
- [ ] Browser zoom 125 %, window 1280×800, notifications off, no personal bookmarks visible
- [ ] PayPal sandbox business dashboard open in a second tab for the proof cut

## Recording (target ≤ 2:58; storyboard in `demo-storyboard.md`)

1. [ ] Tab → "Skip to main content" → Enter → Tab to the text box
2. [ ] Type: *My phone uses USB-C. I need a charger with a cable, forty-five dollars all in.* → Tab → Enter
3. [ ] VoiceOver reads "3 options for you"; show the **Shopping for** card ($45.00, USB-C, cable)
4. [ ] Tab into VoltLine 30W options → ↓ to **USB-C to Lightning cable** → Tab → Enter
5. [ ] **The moment:** VoiceOver reads "The cable will not fit your phone, region. This bundle includes a Lightning cable, but you said your phone uses USB-C…"
6. [ ] Shift-Tab/Tab to **Approve and pay $40.62** (announced "dimmed") → Enter → announcement "Payment is blocked…", focus jumps to **Switch to the USB-C cable bundle (same price)**
7. [ ] Enter → "Your order now matches. Total $40.62 — within your $45.00 budget."
8. [ ] Tab to Approve → Enter → PayPal Sandbox → log in as the **sandbox personal** account → Pay
9. [ ] Back on the receipt: "Payment complete: $40.62", verified-with-PayPal box, order + capture IDs
10. [ ] Cut to the sandbox business dashboard showing the same capture ID
11. [ ] Optional 5 s: Cancel at PayPal → "You cancelled at PayPal. Nothing was charged."

## Honesty checks on screen and in narration

- [ ] "Fictional demo store · PayPal Sandbox · no real money" visible
- [ ] Explanation badge says "From our rules" or "Written by Claude…" truthfully
- [ ] Do not say "WCAG certified", "tested with blind users" (unless sessions happened), "first", or "only"
- [ ] Never splice a fake success screen; if capture fails on the take, re-record

## Manual screen-reader pass (do once before recording; log results in qa-report §6)

- [ ] VoiceOver + Safari and VoiceOver + Chrome: steps 1–9 without looking
- [ ] Rotor → Landmarks lists banner, main, navigation, contentinfo
- [ ] Rotor → Headings on review page: "Check your order…", "The cable will not fit your phone", "Items", "Total"
- [ ] Each recovery notice (cancel/decline) is read on arrival
- [ ] Voice input: "Speak instead" fills the box, never submits by itself
