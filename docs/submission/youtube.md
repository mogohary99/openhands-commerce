# YouTube upload (prepared, NOT uploaded)

Upload only after the owner approves. Visibility: **Public** (the hackathon requires a public video). Thumbnail: `youtube-thumbnail.png` (1280×720, a real frame of the app).

## Narration: synthesized voice (current master)

The narration in `final.mp4` is a synthesized voice (macOS text-to-speech, voice "Samantha"), not the developer's voice. It reads the 13 caption cues word for word, each placed at its cue start; the NOT FILMED card (1:30.5–1:36.5) is silent. There is no music and no third-party audio.

1. For each cue: `say -v Samantha -r 180 -o cueN.aiff "<cue text>"` (cue 8 at `-r 225` so it fits its 5 s slot).
2. Place every clip at its cue start (ffmpeg `adelay` + `amix`) into one 2:31 track, `narration-timed.wav`.
3. `cd web && npm run video:final -- narration-timed.wav`. Cue 1 starts at 0:00, so the lead-in trim removes only about 0.01 s and the cues stay in sync.

Measured on the built `final.mp4`: 151.3 s (2:31), AAC 48 kHz mono, integrated −14.1 LUFS, true peak −1.4 dBFS (no clipping), speech onsets within 0.01 s of cues 2, 5, 9, 12 and 13.

## Optional alternative: recording the narration yourself (owner, about 10 minutes)

1. `cd web && npm run video:final`. This rebuilds `docs/video/scenes/final.mp4` and writes `docs/video/scenes/prompter.html` from `video-captions.en.srt`.
2. Open `docs/video/scenes/prompter.html` in Safari or Chrome. Headphones help; the video is muted anyway.
3. QuickTime Player → File → New Audio Recording → press ●.
4. In the prompter press **Start**. After the 3-2-1 countdown, read each line as it appears. "(pause)" means stay quiet (that's the NOT FILMED card).
5. Stop the recording at "Done" and save it as `narration.m4a` (on the Desktop is fine).
6. `cd web && npm run video:final -- ~/Desktop/narration.m4a`. The silence before your first word is removed, and the voice is levelled to -14 LUFS. The video length stays 2:31.
7. Watch `final.mp4` once with sound. If a line drifts, edit that cue's times in `video-captions.en.srt` and rerun step 6.

Checked with a test tone (not a voice): the audio track spans the whole 2:31, the lead-in silence is trimmed, and the loudness measured −14.0 LUFS. If you replace the synthesized narration with your own, remove the synthesized-voice line from the description below.

## Title (≤ 100 characters)

OpenHands Commerce: the shopping assistant that catches the mistake before you pay

## Description

OpenHands Commerce is an accessible shopping assistant for blind, low-vision and keyboard-only shoppers. You describe what you need in your own words. Before PayPal opens, the store checks every item against what you said, including fit, language, stock, price and your all-in budget. If something won't work, it blocks payment, says why, and fixes it in one step.

Claude (claude-opus-5-5) understands the request and writes the explanations. Our server's rules decide what is safe to buy and set every price from the catalog. Claude has no tools and can't approve, change or make a payment. You approve the exact total, and the receipt says "paid" only after PayPal Sandbox reports the capture as completed.

- Fictional demo store. PayPal Sandbox only: test money, nothing is shipped.
- The PayPal Sandbox login and "Pay" step was not filmed. The video says so on screen, and then shows the real receipt for sandbox order 6DB70558VY7613132.
- Captions are burned in, and also provided as closed captions.
- The narration is a synthesized voice (macOS text-to-speech), not the developer's voice.

Built for the PayPal AI Hackathon 2026.
Source: [GitHub URL once public]
Live demo: [hosted URL once deployed]

Chapters (each at least 10 s, as YouTube requires):
0:00 Payment blocked: the wrong cable
0:19 Describing the need, keyboard only
0:46 The problem, and the one-key fix
1:09 How it decides: Claude explains, rules decide
1:25 PayPal Sandbox and the verified receipt
1:51 Cancel, high contrast and 400% zoom
2:07 Close

## Captions

Upload `video-captions.en.srt` as English closed captions (Subtitles → Add language → English → Upload file → With timing). Edit any cue whose wording differs from the recorded narration first.
