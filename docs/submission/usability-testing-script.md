# Usability testing script — OpenHands Commerce

For sessions with people who use assistive technology (screen readers, magnification, voice control, switch access, keyboard only). About 30 minutes, remote or in person. Share this page with testers in advance; it works with a screen reader.

## Before the session (facilitator)

- Use the sandbox build only. **No real money can move**: every payment uses PayPal Sandbox test accounts.
- Give the tester the **sandbox buyer login** we created for testing. Never ask them for their own PayPal or bank details.
- Agree a fair payment for the tester's time in advance. Ask which assistive technology, browser and device they'll use, and keep their own settings.
- Ask for consent to take notes, and separately for any recording (screen or audio). They can stop at any time without giving a reason, and still get paid.
- Don't help unless asked. If they're stuck for 2 minutes, offer a hint and note that you did.

## Introduction (read aloud, 2 min)

"Thanks for helping. We're testing a shopping website, not you. There are no wrong answers. If something is confusing, that's what we need to know. Please think aloud as you go. Everything in this store is fictional and payments are pretend, using PayPal's test system. You'll use a test login we give you."

## Tasks

Note for each: completed (yes / with help / no), time, what the AT announced, where they hesitated, and what they say.

1. **Find something.** "Your phone charges with USB-C. Find a charger that comes with a cable, for no more than $45 including everything."
   - Did they understand the "Shopping for" summary? Could they correct it if it was wrong?
2. **Compare.** "Which of the options would you choose, and why?" (The comparison table and the reasons.)
3. **The check.** "Choose the VoltLine 30W charger with the **USB-C to Lightning** cable, and go to checkout."
   - Did they notice the problem without being told? What did they hear first?
   - Did they understand why they couldn't pay? Did they find the fix?
4. **Fix and pay.** "Fix the order and pay with the test PayPal login."
   - Did they understand the move to PayPal and back? Could they use PayPal's pages with their AT? (PayPal's pages aren't ours; note their barriers separately.)
5. **Receipt.** "How do you know whether you paid, and how much?"
6. **Recovery (optional).** "Start again, but cancel at PayPal." Did they understand that nothing was charged and their order was saved?

## Questions afterwards (5 min)

- On a scale of 1–5, how confident were you that you'd pay the right amount for the right thing? Why?
- Was anything announced too much, too little, or in the wrong order?
- Did the "Read this problem aloud" or "Speak instead" buttons help, get in the way, or go unnoticed?
- What would stop you from using this for real shopping?
- Anything else?

## Recording results

Write findings in `docs/qa-report.md` §6 under "Usability sessions" with: date, participant code (no names), AT/browser/device, tasks completed, issues (each with a severity and the exact words announced), and quotes **only with permission**. Never invent or tidy up quotes, and don't summarise one person's view as "users".
