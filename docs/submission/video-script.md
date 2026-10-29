# Demo video script — target 2:45 (hard limit: under 3:00)

Rules (verified 2026-10-24): under 3 minutes, public on YouTube, must show the **real app running**, no unlicensed music or trademarks. Record on the hosted build (or local production build), 1280×800, browser zoom 125 %, captions burned in **and** uploaded as an .srt.

**Honesty rules for the recording:** the PayPal payment must be a real sandbox payment; never splice a success screen. Only show VoiceOver if it is genuinely VoiceOver reading the page during the recording. The "From our rules" / "Written by Claude" badge must match what's on screen — say whichever is true.

## The first 20 seconds (the hook)

| Time | Picture | Narration / audio |
|---|---|---|
| 0:00–0:06 | Cold open, no title: the review page already showing the red panel **"The cable will not fit your phone"**, keyboard focus ring on it. | VoiceOver (real) reads: *"The cable will not fit your phone. This bundle includes a Lightning cable, but you said your phone uses USB-C."* |
| 0:06–0:12 | Presenter presses Approve → nothing charges, focus jumps to the fix button. | Narrator: *"That's our shopping assistant refusing to take my money — because I was about to buy the wrong thing."* |
| 0:12–0:20 | Title card over the app: **OpenHands Commerce — catches the mistake before you pay.** Small line: "Fictional demo store · PayPal Sandbox · no real money". | *"OpenHands Commerce: an accessible shopping assistant that checks your order before PayPal ever opens."* |

## Main story

| Time | Picture | Narration |
|---|---|---|
| 0:20–0:35 | Home page. Keyboard only: skip link → text box. Type (or press "Speak instead" and say): *"My phone uses USB-C. I need a charger with a cable, forty-five dollars all in."* → Find options. | *"I describe what I need in my own words. Typing, pasting from my AAC app, or speaking all work."* |
| 0:35–0:50 | Focus lands on "3 options for you". Show the **Shopping for** card ($45.00, USB-C, cable). Scroll to the comparison table briefly. | *"It shows me what it understood — and I can correct it. Every reason cites the product listing, and reviews are labelled as unverified."* |
| 0:50–1:05 | In the first product, arrow down to **USB-C to Lightning cable** → Add to order. | *"Now the mistake a sighted shopper would catch at a glance: I pick the bundle with the wrong cable."* |
| 1:05–1:30 | **The moment, in full.** Review page: focus on the problem, compare boxes "You said USB-C / Lightning only". Press Approve → announcement "Payment is blocked…", focus to **Switch to the USB-C cable bundle (same price)** → Enter → green **"Your order now matches. Total $40.62 — within your $45.00 budget."** | *"Payment is blocked, the reason is read out, and the fix is the very next thing I reach. One keystroke — same price — and the total, with shipping and tax, is checked against my budget."* |
| 1:30–1:45 | Simple overlay diagram: **AI explains → Server decides → You approve → PayPal confirms.** | *"Claude helps explain, but it has no tools and can't touch money. Our server computes every price and decides what's safe. I approve the exact total."* (If running rules-only: *"Explanations can come from Claude; today you're hearing our rule-based text — the badge says so."*) |
| 1:45–2:10 | Approve and pay $40.62 → PayPal Sandbox → log in as the sandbox buyer → Pay. | *"PayPal creates an order bound to that exact quote. I confirm in PayPal Sandbox — test money only."* |
| 2:10–2:25 | Receipt: "Payment complete: $40.62", **Verified with PayPal**, "How this payment was checked", order + capture IDs. Cut (2 s) to the sandbox business account showing the same capture id. | *"We capture once, then ask PayPal directly. The receipt appears only when PayPal says completed, for the amount I approved. Refreshing or replaying can't charge me twice."* |
| 2:25–2:38 | Quick montage (3 s each): cancel at PayPal → "You cancelled at PayPal. Nothing was charged." · forced-colour/high-contrast view · 400 % zoom view. | *"Cancelled, declined or unsure? It always tells you whether anything was charged. It works with high contrast, zoom and keyboard alone."* |
| 2:38–2:48 | Closing card: name, tagline, repo URL. | *"OpenHands Commerce. The AI explains, the server decides, and you stay in control."* |

## Do not say

- "WCAG certified/compliant", "tested with blind users" (unless sessions actually happened — then say how many and who), "the first", "the only", "works with any store". Today it's a fictional demo catalog.

## Captions / transcript

Write captions from the narration above (edit to match the actual take). Put the final transcript in `docs/submission/video-transcript.md`. Describe visual-only moments in the narration (the overlay diagram, the receipt) so the video itself works without sight.

## Recorded footage (2026-10-25). The full timeline is in `video-edit-plan.md`

`cd web && npm run build && npm run video:scenes && npm run video:assemble` records real, silent, keyboard-driven takes of the running app into `docs/video/scenes/`. That folder is git-ignored; rerun the command to recreate it.

| File | Use for | Length |
|---|---|---|
| `2-cold-open-blocked.mp4` | 0:00–0:12 cold open (the problem panel, focused) | 18 s |
| `1-signature-moment.mp4` | **Live Claude** (re-recorded 2026-10-29): request, "Finding options…", Claude's results ("Written by Claude, checked by our rules"), wrong cable, "Explanation written by Claude…", blocked Approve → problem → fix, $40.62. Stops before PayPal | 50 s, trim to the cues |
| `3-cancel-nothing-charged.mp4` | 2:25 montage: cancel at PayPal Sandbox's login page, then "Nothing was charged" | 24 s (re-recorded; the first take had an unstyled, 70 s PayPal load) |
| `4-forced-colours.mp4` | 2:25 montage: high contrast | 16 s |
| `5-zoom-400.mp4` | 2:25 montage: 400 % zoom (four full-resolution stills of real steps) | 14 s |
| `6-receipt-verified.mp4` | The real receipt for the 2026-10-29 verified sandbox payment (order `6DB70558VY7613132`, capture `0X564302AP931181C`). It was reopened afterwards from a copy of the app's database, and no personal data is visible | 18 s, use 0:00–0:15 |

**Live Claude footage:** scenes 1, 2, 4 and 5 were re-recorded with real `claude-opus-5-5` responses (`E2E_LIVE_AI=1`). The rules-mode takes are in `docs/video/scenes-rules/`. The cut and its narration are in `video-edit-plan.md`.

**Still missing, and it must not be staged:**
- **The PayPal Sandbox login and Pay:** the 2026-10-29 purchase wasn't screen-recorded, and there will be no new payment just to film it. The cut shows a "NOT FILMED" card instead. See `video-edit-plan.md` for an optional genuine shot of the business account's Activity page.
- The VoiceOver audio for the cold open, if used. It must be real.
- The narration and captions. No synthetic voice has been added.
- The 1:30 overlay diagram.
