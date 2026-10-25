# Video edit plan: target 2:35 (hard limit under 3:00)

Built from `video-script.md` and the real footage in `docs/video/scenes/` (recreate it with `cd web && npm run build && npm run video:scenes && npm run video:assemble`). Every frame is the running app. Rows marked **OWNER** need footage that only a real sandbox purchase can provide. **TO MAKE** marks a card or diagram to build in the editor. Never replace an OWNER row with a mock-up or a staged screen.

Default narration is **rules-only**, which matches what the app shows today ("From our rules"). Switch to the Claude lines only once `npm run test:live` passes with a real key, and the badge on screen in that take says "Written by Claude".

## Timeline

| Out | Source | In → out of source | Picture | Narration (caption text) |
|---|---|---|---|---|
| 0:00–0:07 | `2-cold-open-blocked.mp4` | 0:00–0:07 | Problem panel, focused: "The cable will not fit your phone" | "This bundle has a Lightning cable, but my phone uses USB-C." |
| 0:07–0:13 | `1-signature-moment.mp4` | 0:17–0:23 | Approve pressed, nothing charged, focus jumps to the fix | "So the store refuses to take my money, and puts the fix right where I am." |
| 0:13–0:20 | **TO MAKE**: title card over a still of the 0:00 frame | n/a | "OpenHands Commerce: catches the mistake before you pay." Small line: "Fictional demo store · PayPal Sandbox · no real money" | "OpenHands Commerce: an accessible shopping assistant that checks your order before PayPal opens." |
| 0:20–0:34 | `1-signature-moment.mp4` | 0:00–0:14 | Keyboard only: skip link, request typed, options, the Lightning bundle chosen | "I describe what I need in my own words, using only the keyboard. Then I pick the bundle with the wrong cable, the mistake you'd only catch by reading closely." |
| 0:34–0:54 | `1-signature-moment.mp4` | 0:14–0:34 | Blocked review, the fix, "Your order now matches. Total $40.62, within your $45.00 budget", then Approve becomes available | "Payment is blocked, the reason is shown, and the fix is the very next stop. One key, same price, and the total, including shipping and tax, is checked against my budget." |
| 0:54–1:10 | **TO MAKE**: diagram "AI explains → server decides → you approve → PayPal confirms" | n/a | Static diagram, text large enough to read at 720p | "Our server works out every price from the catalog and decides what's safe to buy. AI can help word the explanations, but it has no tools and can't touch money. Today you're seeing our rule-based text, and the label on screen says so." |
| 1:10–1:35 | **OWNER**: screen recording made during `npm run purchase:manual` | trim to about 25 s | Approve → PayPal Sandbox login with the sandbox *personal* account → Pay. Blur or crop the email field | "PayPal creates an order bound to that exact quote. I confirm in PayPal Sandbox. It's test money only." |
| 1:35–1:55 | **OWNER**: same recording | about 20 s | Receipt: "Payment complete: $40.62", "How this payment was checked", order and capture IDs | "We capture once, then ask PayPal directly. The receipt says paid only when PayPal reports the capture as completed, for the amount I approved. Refreshing or replaying the page can't charge me twice." |
| 1:55–1:59 | `3-cancel-nothing-charged.mp4` | 0:15–0:19 | PayPal Sandbox login page → "Cancel and return" → "You cancelled at PayPal. Nothing was charged. Your order is saved below." | "If I cancel, it says nothing was charged and keeps my order." |
| 1:59–2:04 | `4-forced-colours.mp4` | 0:08–0:13 | The same problem panel in forced colours | "It works in high-contrast mode…" |
| 2:04–2:11 | `5-zoom-400.mp4` | 0:00–0:07 | 400 % zoom: the problem, then the fix | "…at 400 percent zoom, and with the keyboard alone." |
| 2:11–2:22 | **TO MAKE**: closing card | n/a | Name, tagline, repo URL (public only after approval), "PayPal Sandbox · fictional store" | "OpenHands Commerce. The AI explains, the server decides, and you stay in control." |
| 2:22–2:35 | Hold the closing card | n/a | Silence | Silence |

**Total: 2:35.**

**Not in this cut:**
- **VoiceOver.** No real VoiceOver take exists. Add one only if it really is VoiceOver reading the page.
- **The business sandbox account view of the capture.** It needs your dashboard login; it's optional.
- **The first take of scene 3.** It was unusable: on 2026-10-25 around 03:38 local time, PayPal Sandbox took about 70 s to paint, and its login page appeared without styling. It was re-recorded at 11:57 local, when Sandbox was fast. The new take is 24 s, and PayPal's page renders normally.

## Silent rough cut

Build it with `cd web && npm run video:roughcut`. It writes `docs/video/scenes/rough-cut.mp4` (git-ignored), assembled from the real scenes on this timeline.
- **TO MAKE rows** are plain "DRAFT CARD" slates.
- **OWNER rows** are grey slates headed "PLACEHOLDER: NOT FINAL FOOTAGE".

Use it to check pacing and to time the narration. **Never upload it.** Replace both slate types in the editor.

## Recording the OWNER footage

1. Run `cd web && npm run build && npm run purchase:manual`.
2. Press ⌘⇧5, choose "Record Selected Portion" and select the Chrome window. Notifications should be off.
3. Log in at PayPal Sandbox and press Pay. The script verifies the payment with PayPal and writes `docs/evidence/sandbox-purchase-manual-buyer.json`.
4. Stop recording on the receipt, after about 10 s on "How this payment was checked".
5. Use only takes where the evidence file shows `COMPLETED`, 40.62 USD and one capture.

## Captions

The draft is `video-captions.draft.srt`, timed to the table above. After editing:
- Re-time it to the final cut.
- Replace the OWNER lines if your narration differs.
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
