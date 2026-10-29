# Video edit plan: target 2:16 (hard limit under 3:00)

Built from `video-script.md` and the real footage in `docs/video/scenes/` (recreate it with `cd web && npm run build && npm run video:scenes && npm run video:assemble`). Every frame is the running app. The PayPal login and Pay step wasn't filmed; a card says so (see the note under the table). **TO MAKE** marks a card or diagram to build in the editor. Never replace the NOT FILMED card with a mock-up or a staged screen.

Default narration is **rules-only**, which matches what the app shows today ("From our rules"). Switch to the Claude lines only once `npm run test:live` passes with a real key, and the badge on screen in that take says "Written by Claude".

## Timeline

| Out | Source | In → out of source | Picture | Narration (caption text) |
|---|---|---|---|---|
| 0:00–0:07 | `2-cold-open-blocked.mp4` | 0:00–0:07 | Problem panel, focused: "The cable will not fit your phone" | "This bundle has a Lightning cable, but my phone uses USB-C." |
| 0:07–0:13 | `1-signature-moment.mp4` | 0:18.5–0:24.5 | Approve pressed, nothing charged, focus returns to the problem ("payment blocked"), then Tab reaches the fix | "So the store refuses to take my money, and puts the fix right where I am." |
| 0:13–0:20 | **TO MAKE**: title card over a still of the 0:00 frame | n/a | "OpenHands Commerce: catches the mistake before you pay." Small line: "Fictional demo store · PayPal Sandbox · no real money" | "OpenHands Commerce: an accessible shopping assistant that checks your order before PayPal opens." |
| 0:20–0:34 | `1-signature-moment.mp4` | 0:00–0:14 | Keyboard only: skip link, request typed, options, the Lightning bundle chosen | "I describe what I need in my own words, using only the keyboard. Then I pick the bundle with the wrong cable, the mistake you'd only catch by reading closely." |
| 0:34–0:54 | `1-signature-moment.mp4` | 0:14–0:34 | Blocked review, the fix, "Your order now matches. Total $40.62, within your $45.00 budget", then Approve becomes available | "Payment is blocked, the reason is shown, and the fix is the very next stop. One key, same price, and the total, including shipping and tax, is checked against my budget." |
| 0:54–1:10 | **TO MAKE**: diagram "AI explains → server decides → you approve → PayPal confirms" | n/a | Static diagram, text large enough to read at 720p | "Our server works out every price from the catalog and decides what's safe to buy. AI can help word the explanations, but it has no tools and can't touch money. Today you're seeing our rule-based text, and the label on screen says so." |
| 1:10–1:15 | `3-cancel-nothing-charged.mp4` | 0:11.5–0:16.5 | Real redirect: Approve pressed, "Opening PayPal…", then the PayPal Sandbox page | "PayPal creates an order bound to that exact quote. I confirm in PayPal Sandbox. It's test money only." |
| 1:15–1:21 | **NOT FILMED** card | n/a | "At PayPal Sandbox, the buyer logs in and presses Pay. That step wasn't filmed. Next: the real receipt for that payment, PayPal order 6DB70558VY7613132 (sandbox, test money)." | (narration continues) |
| 1:21–1:36 | `6-receipt-verified.mp4` | 0:00–0:15 | The **real** receipt for the 2026-10-29 sandbox payment, reopened afterwards from a copy of the app's database: "Payment complete: $40.62", "How this payment was checked", order `6DB70558VY7613132`, capture `0X564302AP931181C` | "We capture once, then ask PayPal directly. The receipt says paid only when PayPal reports the capture as completed, for the amount I approved. Refreshing or replaying the page can't charge me twice." |
| 1:36–1:40 | `3-cancel-nothing-charged.mp4` | 0:15–0:19 | PayPal Sandbox login page → "Cancel and return" → "You cancelled at PayPal. Nothing was charged. Your order is saved below." | "If I cancel, it says nothing was charged and keeps my order." |
| 1:40–1:45 | `4-forced-colours.mp4` | 0:08–0:13 | The same problem panel in forced colours | "It works in high-contrast mode…" |
| 1:45–1:52 | `5-zoom-400.mp4` | 0:00–0:07 | 400 % zoom: the problem, then the fix | "…at 400 percent zoom, and with the keyboard alone." |
| 1:52–2:03 | **TO MAKE**: closing card | n/a | Name, tagline, repo URL (public only after approval), "PayPal Sandbox · fictional store" | "OpenHands Commerce. The AI explains, the server decides, and you stay in control." |
| 2:03–2:16 | Hold the closing card | n/a | Silence | Silence |

**Total: 2:16.**

**About the payment rows (1:10–1:36).** The 2026-10-29 sandbox purchase was not screen-recorded, and we won't make another payment just to film it.
- **The receipt:** genuine. It's the app's own page for that verified capture, reopened afterwards. Scene 6 was recorded from a *copy* of the database, so the real record wasn't touched.
- **The buyer's login and Pay at PayPal:** they appear only as an honest "NOT FILMED" card.
- **Optional genuine upgrade, without a new payment:** you log in at sandbox.paypal.com as the US sandbox **business** account and screen-record the Activity entry for that $40.62 payment, with emails cropped. It can go after the NOT FILMED card.

**Not in this cut:**
- **VoiceOver.** No real VoiceOver take exists. Add one only if it really is VoiceOver reading the page.
- **The business sandbox account view of the capture.** It needs your dashboard login; it's optional.
- **The first take of scene 3.** It was unusable: on 2026-10-25 around 03:38 local time, PayPal Sandbox took about 70 s to paint, and its login page appeared without styling. It was re-recorded at 11:57 local, when Sandbox was fast. The new take is 24 s, and PayPal's page renders normally.

## Silent rough cut

Build it with `cd web && npm run video:roughcut`. It writes `docs/video/scenes/rough-cut.mp4` (git-ignored), assembled from the real scenes on this timeline.
- **TO MAKE rows** are plain "DRAFT CARD" slates.
- **The not-filmed step** is a card headed "NOT FILMED". The receipt is real footage, scene 6.

Use it to check pacing and to time the narration. **Never upload it.** Rebuild the draft cards in the editor.

## Only if a future purchase happens anyway (not required; no payment just for filming)

1. Run `cd web && npm run build && npm run purchase:manual`.
2. Press ⌘⇧5, choose "Record Selected Portion" and select the Chrome window. Notifications should be off.
3. Log in at PayPal Sandbox and press Pay. The script verifies the payment with PayPal and writes `docs/evidence/sandbox-purchase-manual-buyer.json`.
4. Stop recording on the receipt, after about 10 s on "How this payment was checked".
5. Use only takes where the evidence file shows `COMPLETED`, 40.62 USD and one capture.

## Captions

The draft is `video-captions.draft.srt`, timed to the table above. After editing:
- Re-time it to the final cut.
- Adjust the cue text wherever your narration differs.
- Copy the final text into `video-transcript.md`.
- Upload the .srt to YouTube as closed captions.

Burned-in captions need a video editor. This machine's ffmpeg has no `subtitles` or `drawtext` filter.

## Checks before upload

- Length under 3:00, measured with `ffprobe -show_entries format=duration` on the exported file.
- 1080p or 720p, 30 fps.
- Audio peaks around −6 dBFS, no clipping, no music.
- Captions match the narration.
- Nothing personal is visible: no email address, tabs, bookmarks or notifications.
- The "From our rules" or "Written by Claude" badge on screen matches what the narration says.
