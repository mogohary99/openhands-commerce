# VoiceOver test checklist (prioritized)

**Status: NOT RUN.** Nobody has tested OpenHands Commerce with VoiceOver yet. The "Expected" column comes from Chrome's computed accessibility tree, as asserted in `web/test/e2e/a11y-tree.spec.ts`. That is what VoiceOver *should* receive; whether it actually says it is what this pass checks. Write down what you actually hear, word for word, in the Result column, then copy the results to `docs/qa-report.md` §6.

## Setup (5 min)

- Build and run locally: `cd web && npm run build && npm start` → http://localhost:3000. Or use the hosted URL once it's deployed.
- Turn on VoiceOver with ⌘F5. This is the user's own setting toggle, not a security permission. Leave the speaking rate at its default.
- Do P0 in **Safari** first (the best-supported VoiceOver pairing), then repeat P0 in **Chrome**. Never look at the screen while doing P0.
- Keys: VO = Control+Option. VO+→ reads the next item, Tab moves to the next control, VO+U opens the rotor (headings, landmarks, form controls), VO+A reads everything from here.
- Payment: use the sandbox **personal** test account at PayPal. Never use a real PayPal login. PayPal's own pages aren't ours, so note their barriers separately.

## P0 — the signature moment (must pass before the video)

| # | Do | Expected | Result |
|---|---|---|---|
| 1 | Load the home page | The page title "OpenHands Commerce" is announced. The first Tab reaches "Skip to main content" | |
| 2 | Enter on the skip link, then Tab | Focus is on the request text box. Its label is announced | |
| 3 | Type the demo request, Tab to "Find options", Enter | The heading "3 options for you" (or similar) is announced and has focus. Nothing else interrupts it | |
| 4 | VO+→ through the "Shopping for" card | Budget $45.00, USB-C selected, cable: each control's label and value are announced | |
| 5 | Tab into the first product's options, ↓ to the Lightning bundle, Tab, Enter | Radio group: option name and "selected" are announced. Then the button "Add to order and review: VoltLine 30W…" | |
| 6 | Arrive on "Check your order" | Focus lands on the region **"The cable will not fit your phone"**, followed by its description "This bundle includes a Lightning cable, but you said your phone uses USB-C…". The page should already have its title. This was the cause of the 2026-10-24 flake, now fixed | |
| 7 | Tab | **"Switch to the USB-C cable bundle (same price)", button**. It's the very next stop | |
| 8 | Shift+Tab back, then Tab to "Approve and pay $40.62 with PayPal" | The button is announced as **dimmed/unavailable**, with the hint "Payment is blocked until the problem above is fixed." | |
| 9 | Press Enter on the blocked Approve | You hear "Payment is blocked. The cable will not fit your phone…" (polite), and focus moves to the fix button. Nothing is charged and the page doesn't change | |
| 10 | Enter on the fix | The region **"Your order now matches"** has focus, with "Total $40.62 — within your $45.00 budget." | |
| 11 | Tab to Approve | Now announced as available, with a hint that you'll log in to PayPal Sandbox and confirm | |
| 12 | Approve → PayPal Sandbox → log in → Pay | (PayPal's pages: note anything that blocks you) | |
| 13 | Back on the store | The heading **"Payment complete: $40.62"** has focus. "How this payment was checked" can be reached by VO+→. The order and capture IDs are read as text | |

## P1 — recovery and "did I pay?"

| # | Do | Expected | Result |
|---|---|---|---|
| 14 | Approve, then cancel at PayPal | Focus is on "You cancelled at PayPal. Nothing was charged." Your order is still there | |
| 15 | Visit `/review?notice=declined`, `refused`, `expired`, `reapprove` | Each notice gets focus and says whether anything was charged | |
| 16 | Over budget: change the budget to $30 in the Shopping for card, then review | The problem says how much over budget, including shipping and tax. Approve is unavailable | |
| 17 | VO+U → Headings on each page | One h1 per page. The headings make sense on their own | |
| 18 | VO+U → Landmarks | Banner, main and the progress navigation ("Progress", with the current step announced as "current step") | |
| 19 | Comparison table: VO+Shift+↓ into the table, then VO+→/↓ | Column headers (the products) and row headers (the facts) are read with each cell | |

## P2 — optional controls and settings

| # | Do | Expected | Result |
|---|---|---|---|
| 20 | "Read this problem aloud" | Plays only when you press it. VoiceOver and the speech don't fight, and there's a way to stop it | |
| 21 | "Speak instead" (microphone) | It asks for the microphone only after you press it, and never submits by itself. The text box gets focus afterwards with the words you spoke | |
| 22 | Repeat P0 at 200 % zoom (⌘+) | Nothing is cut off, and there's no sideways scrolling | |
| 23 | Repeat P0 with System Settings → Accessibility → Display → Increase contrast and Reduce motion turned on (your own settings; turn them back afterwards) | Borders and focus rings are still visible. Nothing moves | |
| 24 | iPhone VoiceOver (Safari), swipe navigation through P0 | The same announcements as on the Mac | |

## Not covered here

Voice Control, Switch Control, NVDA/JAWS (Windows) and TalkBack each need their own pass. None of them has been run. Don't describe any of them as tested because this checklist passed.
