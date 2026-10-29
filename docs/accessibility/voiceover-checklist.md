# VoiceOver test checklist (prioritized)

**Status: P0 partly run on 2026-10-29** (macOS 26.2, Safari, VoiceOver on with the owner's permission and turned off again afterwards). Claude drove it with keystrokes and read VoiceOver's on-screen caption panel. This is **not** a test by a VoiceOver user, and it is not a listening test.
- **Results:** 1–8, 10 and 11 pass (5 after a fix). 9 is partial, 12 wasn't run (no new payment) and 13 wasn't verified with speech.
- **Not run:** the P0 repeat in Chrome, and P1 and P2.
- **Still needed:** a pass by the owner or a VoiceOver user, especially 9, 13 and Chrome.

Earlier status: nobody had tested OpenHands Commerce with VoiceOver. The "Expected" column comes from Chrome's computed accessibility tree, as asserted in `web/test/e2e/a11y-tree.spec.ts`. That is what VoiceOver *should* receive; whether it actually says it is what this pass checks. Write down what you actually hear, word for word, in the Result column, then copy the results to `docs/qa-report.md` §6.

## Setup (5 min)

- Build and run locally: `cd web && npm run build && npm start` → http://localhost:3000. Or use the hosted URL once it's deployed.
- Turn on VoiceOver with ⌘F5. This is the user's own setting toggle, not a security permission. Leave the speaking rate at its default.
- Do P0 in **Safari** first (the best-supported VoiceOver pairing), then repeat P0 in **Chrome**. Never look at the screen while doing P0.
- Keys: VO = Control+Option. VO+→ reads the next item, Tab moves to the next control, VO+U opens the rotor (headings, landmarks, form controls), VO+A reads everything from here.
- Payment: use the sandbox **personal** test account at PayPal. Never use a real PayPal login. PayPal's own pages aren't ours, so note their barriers separately.

## P0 — the signature moment (must pass before the video)

| # | Do | Expected | Result |
|---|---|---|---|
| 1 | Load the home page | The page title "OpenHands Commerce" is announced. The first Tab reaches "Skip to main content" || **PASS, with a note** (Safari). Right after load, VoiceOver's caption read "link, Skip to main content", and the window title was "OpenHands Commerce". The title announcement itself wasn't captured, because the panel shows only the latest phrase. Safari's default Tab skips links ("Press Tab to highlight each item" is off), so plain Tab went to the text box. ⌥Tab reaches the skip link |
| 2 | Enter on the skip link, then Tab | Focus is on the request text box. Its label is announced || **PASS.** After Enter on the skip link: "You are currently on a navigation." Then Tab: "Describe what you need For example: my phone uses USB-C, I need a charger with a cable, $45 all in., text entry area, Describe what you need, search" |
| 3 | Type the demo request, Tab to "Find options", Enter | The heading "3 options for you" (or similar) is announced and has focus. Nothing else interrupts it || **PASS.** "heading level 2, 3 options for you, 3 options for you, region". Nothing interrupted it |
| 4 | VO+→ through the "Shopping for" card | Budget $45.00, USB-C selected, cable: each control's label and value are announced || **PASS** (read with ⇧⌥Tab, from the end of the card backwards): "Update results, button, Shopping for, region" · "I need a cable included, checked, checkbox" · "No preference, Talking products should speak, pop up button" · "USB-C, selected, radio button, 1 of 3, My phone or device uses, group" · "45.00, Insertion at end of text., Budget, all in Including shipping and tax. Leave empty for no limit., edit text, Shopping for, region" · "Phone chargers, What kind of thing, pop up button" |
| 5 | Tab into the first product's options, ↓ to the Lightning bundle, Tab, Enter | Radio group: option name and "selected" are announced. Then the button "Add to order and review: VoltLine 30W…" || **FAILED, then FIXED.** Each option's price was read twice: "…Lightning cable $31.99 · $40.62 with shipping and tax $31.99 · $40.62 with shipping and tax, selected, radio button, 3 of 3". The cause was that `aria-describedby` repeated text the label already holds. After the fix: "White + 1 m USB-C to Lightning cable $31.99 · $40.62 with shipping and tax, selected, radio button, 3 of 3". Then: "Add to order and review : VoltLine 30W USB-C Wall Charger, button, VoltLine 30W USB-C Wall Charger, article". Regression test: `a11y-tree.spec.ts` "product options…" |
| 6 | Arrive on "Check your order" | Focus lands on the region **"Problem 1: payment blocked. The cable will not fit your phone"** (the name changed on 2026-10-29; before that it was "The cable will not fit your phone"), followed by its description "This bundle includes a Lightning cable, but you said your phone uses USB-C…". The page should already have its title. This was the cause of the 2026-10-24 flake, now fixed || **PASS.** "main, The cable will not fit your phone This bundle includes a Lightning cable, but you said your phone uses USB-C. The cable would not fit your phone., region". The window title was already "Check your order · OpenHands Commerce" |
| 7 | Tab | **"Switch to the USB-C cable bundle (same price)", button**. It's the very next stop || **PASS.** "Switch to the USB-C cable bundle (same price), button, The cable will not fit your phone This bundle includes a Lightning cable, but you said your phone uses USB-C…" |
| 8 | Shift+Tab back, then Tab to "Approve and pay $40.62 with PayPal" | The button is announced as **dimmed/unavailable**, with the hint "Payment is blocked until the problem above is fixed." || **PASS.** "Approve and pay $40.62 with PayPal Payment is blocked until the problem above is fixed., dimmed, button, Total, complementary". The stops in between: Remove this item instead, Read this problem aloud, Quantity, Update quantity, Remove, Change what you're shopping for |
| 9 | Press Enter on the blocked Approve | **(Changed 2026-10-29.)** Focus moves back to the problem, and you hear "Problem 1: payment blocked. The cable will not fit your phone" with its description. The next Tab is the fix. Nothing is charged and the page doesn't change. There's no separate live message any more || **PARTIAL.** Enter, and also VO+Space, moved focus to "Switch to the USB-C cable bundle (same price), button…". The URL stayed `/review`, and nothing was charged. The polite "Payment is blocked…" message was **not observed** in the caption panel: the focus announcement came straight after it. The fix button's own description still says why |
| 10 | Enter on the fix | The region **"Your order now matches"** has focus, with "Total $40.62 — within your $45.00 budget." || **PASS.** "main, Your order now matches Total $40.62 — within your $45.00 budget., region" |
| 11 | Tab to Approve | Now announced as available, with a hint that you'll log in to PayPal Sandbox and confirm || **PASS.** "Approve and pay $40.62 with PayPal Next, you'll log in to PayPal Sandbox and confirm. This is a fictional order and no real money moves. If you cancel at PayPal, nothing is…" (no longer "dimmed") |
| 12 | Approve → PayPal Sandbox → log in → Pay | (PayPal's pages: note anything that blocks you) || **NOT RUN.** It would create a new PayPal payment, and the owner decided against one. The verified 2026-10-29 purchase was approved by the owner and not narrated |
| 13 | Back on the store | The heading **"Payment complete: $40.62"** has focus. "How this payment was checked" can be reached by VO+→. The order and capture IDs are read as text || **NOT VERIFIED with speech.** The receipt for the verified order (opened from a scratch copy of the database) showed "Payment complete: $40.62" with a visible focus ring in Safari. VoiceOver was off by then: it was turned off outside the script, and the run was stopped |

### Re-check after the fixes: Safari + VoiceOver, 2026-10-29 18:26 (owner present, Mac unlocked)

Exact captions:
- **Load:** "Demo store." Tab: "Describe what you need For example: my phone uses USB-C, I need a charger with a cable, $45 all in., text entry area, Describe what you need, search". Then "Find options, button", then "heading level 2, 3 options for you, 3 options for you, region".
- **Options, each price read once (5):** "White + 1 m USB-C to USB-C cable $31.99 · $40.62 with shipping and tax, selected, radio button, 2 of 3, Choose an option, group" · "White + 1 m USB-C to Lightning cable $31.99 · $40.62 with shipping and tax, selected, radio button, 3 of 3" · "Add to order and review : VoltLine 30W USB-C Wall Charger, button, …, article". **PASS**
- **Arrival (6):** "main, Problem 1: payment blocked. The cable will not fit your phone This bundle includes a Lightning cable, but you said your phone uses USB-C. The cable would not fit…". **PASS**
- **The next Tab (7):** "Switch to the USB-C cable bundle (same price), button, Problem 1: payment blocked. The cable will not fit your phone…". **PASS**
- **Blocked Approve (8):** "Approve and pay $40.62 with PayPal Payment is blocked until the problem above is fixed., dimmed, button, Total, complementary". **PASS**
- **Enter on the blocked Approve (9):** "main, Problem 1: payment blocked. The cable will not fit your phone This bundle includes a Lightning cable, but you said your phone uses USB-C. The cable would not fit…". Then Tab: "Switch to the USB-C cable bundle (same price), button, …". **PASS**: the reason is spoken and the fix is the next stop.
- **After the fix (10):** "main, Your order now matches Total $40.62 — within your $45.00 budget., region". **PASS**
- **Approve after the fix (11):** "Approve and pay $40.62 with PayPal Next, you'll log in to PayPal Sandbox and confirm. This is a fictional order and no real money moves. If you cancel at PayPal, nothing is…". It was never pressed. **PASS**
- **Receipt of the verified order (13; scratch copy of the database, no new payment):**
  - On load, after typing the address, VoiceOver started at "Progress, navigation", not at the focused heading. This may be how VoiceOver treats a load from the address bar; a real PayPal redirect wasn't tested.
  - VO+→ then read: "list 4 items", "Describe(done), 1 of 4", "Check(done), 2 of 4", "Approve with PayPal(done), 3 of 4", "Receipt, current step, 4 of 4", "end of list", "end of, Progress, navigation", "heading level 1 Payment complete: $40.62, 2 items", "Verified with PayPal. PayPal reports this payment as completed for $40.62 USD, which matches the total you approved.", "How this payment was checked, region", "heading level 2, How this payment was checked", "Our server checked every item against what you told us and calculated the total from the catalog."
  - **PASS for understandability.** Starting at the heading after a real PayPal redirect is NOT VERIFIED.
- **Not run:**
  - 12 (paying);
  - the order and capture IDs further down the receipt, which weren't reached by VO+→ in this run.
- **What went wrong during the run, and was handled:**
  - The first attempt read nothing useful: the VoiceOver welcome dialog hadn't closed, so every caption said "You are currently on an image…".
  - VoiceOver's toggle at the end of each run didn't take, so it was switched off afterwards and confirmed off.
  - A caption once said "Phone is launched in the background". The Phone app wasn't running when checked.

### Chrome (for Testing) + VoiceOver, 2026-10-29 18:43

All page input went through Playwright, inside its own test window only. VO+→ was sent only while that window was frontmost. VoiceOver was off before and off afterwards: the script's own toggle didn't take, so it was switched off again and confirmed off.

- **Load:** "You are currently on web content…". Tab: "link, Skip to main content". Then Enter and Tab: "Describe what you need For example: … text entry area, Describe what you need, search". Then "heading level 2, 3 options for you, 3 options for you, region". **PASS**
- **Options, each price read once (5):** "White + 1 m USB-C to USB-C cable $31.99 · $40.62 with shipping and tax, selected, radio button, 2 of 3, Choose an option, group" · "White + 1 m USB-C to Lightning cable $31.99 · $40.62 with shipping and tax, selected, radio button, 3 of 3" · "Add to order and review : VoltLine 30W USB-C Wall Charger, button, …". **PASS**
- **Arrival (6):** "main, Problem 1: payment blocked. The cable will not fit your phone This bundle includes a Lightning cable, but you said your phone uses USB-C. The cable would not fit…". **PASS**
- **Fix (7) and blocked Approve (8):**
  - fix: "Switch to the USB-C cable bundle (same price), button, Problem 1: payment blocked…";
  - Approve: "Approve and pay $40.62 with PayPal Payment is blocked until the problem above is fixed., dimmed, button, Total, complementary".

  **PASS**
- **Enter on the blocked Approve (9):** "main, Problem 1: payment blocked. The cable will not fit your phone This bundle includes…", with focus `problem-0`. Then Tab: "Switch to the USB-C cable bundle (same price), button, …", with focus `fix-0`. **PASS**
- **After the fix (10) and Approve (11):** "main, Your order now matches Total $40.62 — within your $45.00 budget., region", then "Approve and pay $40.62 with PayPal Next, you'll log in to PayPal Sandbox and confirm…". It was never pressed. **PASS**
- **Receipt of the verified order (13; scratch copy of the database, no new payment):**
  - On load: "heading level 1 Payment complete: $40.62, 2 items, main", with focus `receipt-title`.
  - VO+→ then read: "Verified with PayPal." / "PayPal reports this payment as" / "completed" / "$40.62 USD" / ", which matches the total you approved." / "How this payment was checked, region" / "heading level 2, How this payment was checked" / "list 4 items" / "Our server checked every item against what you told us and calculated the total from the catalog., 1 of 4" / "You approved exactly $40.62 with PayPal., 2 of 4" / "We asked PayPal to capture the payment once, using a single request ID so a retry can't charge twice., 3 of 4".
  - **PASS for understandability.**
  - **Open minor issue:** in Chrome, the "Verified with PayPal" sentence is split into five stops at its bold words; Safari reads it as one sentence. It's not fixed yet, because any change needs another VoiceOver check.
- **Not reached:** the order and capture IDs further down the receipt, in either browser. 12 (paying) was not run.

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
