# Video edit plan: live Claude cut, 2:31.3 (hard limit under 3:00)

Built from `video-script.md` and the real footage in `docs/video/scenes/` (recreate it with `cd web && npm run build && npm run video:scenes && npm run video:assemble`). Every frame is the running app. The PayPal login and Pay step wasn't filmed; a card says so (see the note under the table). **TO MAKE** marks a card or diagram to build in the editor. Never replace the NOT FILMED card with a mock-up or a staged screen.

The narration is written for **live Claude**. The footage shows "Written by Claude, checked by our rules" (results) and "Explanation written by Claude and checked against your order" (review). If you fall back to the rules footage, use the rules lines from git history (commit `d53c4d7`).

## Timeline

Scenes 1, 2, 4 and 5 were re-recorded on 2026-10-29 with **live Claude** (`E2E_LIVE_AI=1`, real `claude-opus-5-5` responses). Scenes 3 and 6 are unchanged: scene 3 would need a new PayPal order, and scene 6 is the real receipt. The rules-mode footage is kept in `docs/video/scenes-rules/` as a fallback, with the matching 2:16 cut.

| Out | Source | In → out of source | Picture | Narration (caption text) |
|---|---|---|---|---|
| 0:00–0:06.5 | `2-cold-open-blocked.mp4` | 0:11–0:17.5 | The blocked order, problem focused: "Problem 1: payment blocked. The cable will not fit your phone" (Claude's wording) | "This bundle has a Lightning cable, but my phone uses USB-C." |
| 0:06.5–0:12.5 | `1-signature-moment.mp4` | 0:33–0:39 | Approve pressed: nothing charged, focus returns to the problem, then Tab reaches the fix | "So the store refuses to take my money, and takes me straight to the reason and the fix." |
| 0:12.5–0:19.5 | **TO MAKE**: title card | n/a | "OpenHands Commerce: catches the mistake before you pay." Small line: "Fictional demo store · PayPal Sandbox · no real money" | "OpenHands Commerce: an accessible shopping assistant that checks your order before PayPal opens." |
| 0:19.5–0:38.5 | `1-signature-moment.mp4` | 0:00–0:19 | Keyboard only: the request is typed, "Finding options…" while live Claude answers, then the results | "I describe what I need in my own words, using only the keyboard. Claude reads my request and works out what I'm shopping for." |
| 0:38.5–0:46.5 | Still from `1-signature-moment.mp4` | frame at 0:17.5, enlarged | Claude's real intro and per-product notes, labelled "Written by Claude, checked by our rules" | "Claude writes the explanations, and the label says so. Every price and stock fact comes from our catalog." |
| 0:46.5–1:09.5 | `1-signature-moment.mp4` | 0:19–0:42 | Lightning bundle chosen, the review, "Explanation written by Claude and checked against your order. The problem itself was found by our rules.", the blocked Approve, the fix, "Your order now matches. Total $40.62 — within your $45.00 budget" | "I pick the bundle with the wrong cable. Our rules find the problem, Claude explains it, and the fix is the next stop. One key, same price, and the total, $40.62 with shipping and tax, is within my budget." |
| 1:09.5–1:25.5 | **TO MAKE**: diagram card | n/a | "Claude explains → our rules decide → you approve → PayPal confirms" | "Our server decides what's safe to buy. Claude has no tools and can't touch money, and everything it writes is checked against the order before you see it." |
| 1:25.5–1:30.5 | `3-cancel-nothing-charged.mp4` | 0:11.5–0:16.5 | The real redirect: "Opening PayPal…", then the PayPal Sandbox page | "PayPal creates an order bound to that exact quote. I confirm in PayPal Sandbox. It's test money only." |
| 1:30.5–1:36.5 | **NOT FILMED** card | n/a | "At PayPal Sandbox, the buyer logs in and presses Pay. That step wasn't filmed. Next: the real receipt for that payment…" | (narration continues) |
| 1:36.5–1:51.5 | `6-receipt-verified.mp4` | 0:00–0:15 | The **real** receipt of the 2026-10-29 sandbox payment: "Payment complete: $40.62", "How this payment was checked", order `6DB70558VY7613132`, capture `0X564302AP931181C` | "We capture once, then ask PayPal directly. The receipt says paid only when PayPal reports the capture as completed, for the amount I approved." |
| 1:51.5–1:55.5 | `3-cancel-nothing-charged.mp4` | 0:15–0:19 | Cancel at PayPal: "You cancelled at PayPal. Nothing was charged." | "If I cancel, nothing is charged and my order is kept." |
| 1:55.5–2:00.3 | `4-forced-colours.mp4` | 0:10.8–0:15.6 | The same problem in forced colours | "It works in high-contrast mode…" |
| 2:00.3–2:07.3 | `5-zoom-400.mp4` | 0:00–0:07 | 400 % zoom: the problem, then the fix | "…at 400 percent zoom, and with the keyboard alone." |
| 2:07.3–2:31.3 | **TO MAKE**: closing card, held | n/a | Name, tagline, repo URL (public only after approval), "PayPal Sandbox · fictional store" | "OpenHands Commerce. Claude explains, our rules decide, and you stay in control." |

**Total: 2:31.3.**

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

The draft is `video-captions.en.srt`, timed to the table above. After editing:
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
