# Devpost rules checklist — PayPal AI Hackathon

Fetched with `curl -sL` on 2026-11-07 from:

- Rules: https://paypalaihackathon.devpost.com/rules
- Overview: https://paypalaihackathon.devpost.com/
- Updates: https://paypalaihackathon.devpost.com/updates (full posts: `/updates/47305-…`, `/updates/47306-…`, `/updates/47307-…`)
- FAQs: https://paypalaihackathon.devpost.com/details/faqs

**Deadline: Thu Nov 12, 2026, 12:00 pm PT.** Judging Dec 1–15; winners about Dec 21.

Status key: **DONE** means verified in the repo or on GitHub on 2026-11-07. **PENDING owner** means only the owner can do it. **PENDING URL** means it waits on a link that doesn't exist yet.

## Required submission items

| # | Requirement | Quote (source) | Status |
|---|---|---|---|
| 1 | Use the PayPal developer platform, on the sandbox | "integrates the PayPal developer platform (using the free sandbox environment)" (rules §4) | **DONE.** Orders v2 create, capture and GET, plus webhook signature verification, all in Sandbox. Verified capture `0X564302AP931181C`. |
| 2 | Use an AI tool, model or platform, meaningfully | "your project must meaningfully use both PayPal and AI" (overview) | **DONE.** Claude `claude-opus-5-5` (`web/lib/ai.ts:18`), 7/7 live Claude tests. |
| 3 | PayPal must be central | "Any AI tool works, as long as PayPal integration is central" (rules §4) | **DONE.** The product ends in a PayPal-verified payment. |
| 4 | New, or significantly updated during the period | "must have been significantly updated after the start of the … Submission Period" (rules §4) | **DONE.** The first commit is dated 2026-10-23; the period started Oct 1. The description says it was built during the hackathon. |
| 5 | Text description of features and functionality | "Include a text description that should explain the features and functionality" (rules §4) | **DONE.** `devpost.md`, About section. |
| 6 | Name the AI tools and how they were used | "identify which tools (model or AI service) were used and explain how" (overview) | **DONE.** `devpost.md`, "Built with" and the AI section. Claude Code's help with development is disclosed too. |
| 7 | A functional demo: run instructions or a hosted URL | "clear, complete setup and run instructions … OR … A hosted demo URL" (rules §4) | **DONE** for run instructions (`README.md`, `web/README.md` "For judges"; fresh-clone builds at `42c7d10`). **PENDING URL** for the hosted demo, which is optional. |
| 8 | Not a mockup | "A design mockup, static prototype, or non-functional demo does not meet" (rules §4) | **DONE.** |
| 9 | Public repo on GitHub, Bitbucket or GitLab | "Provide a URL to your public code repository" (rules §4) | **DONE.** https://github.com/mogohary99/openhands-commerce. The GitHub API reports `private: false`, and the remote HEAD was `4ed9bbf` on 2026-11-07. |
| 10 | The repo holds all source, assets and instructions | "must contain all necessary source code, assets, and instructions" (rules §4) | **DONE**, for code. Keys aren't committed, by design. Judges create their own free sandbox app (see #14). |
| 11 | Open-source licence, detected in the About section | "license should be detectable and visible at the top of the repository page" (rules §4) | **DONE.** The GitHub API detects `apache-2.0`. |
| 12 | Demo video under 3 minutes | "should be less than three (3) minutes" (rules §4) | **DONE.** The narrated master runs 2:31, with disclosed macOS TTS narration (commit `998a10c`). Check the length again once it's uploaded. |
| 13 | Video is on YouTube, public, and linked | "must be uploaded to and made publicly visible on YouTube" (rules §4) | **PENDING URL.** Upload early: "Processing can take hours" (update 47306). |
| 14 | Video shows the project running on its device | "footage that shows the Project functioning on the device for which it was built" (rules §4) | **DONE.** The footage is the real app on a desktop browser with live Claude. The PayPal login step isn't filmed, and a card in the video says so. |
| 15 | No unlicensed third-party trademarks or music in the video | "must not include third party trademarks, or copyrighted music" (rules §4) | **PENDING owner review.** There is no music. The words "Claude" and "PayPal" appear on screen, and "USB-C" and "Lightning" appear as descriptive product facts. See risk R2. |
| 16 | An AI voiceover is allowed | "An AI voiceover is fine." (update 47306) | **DONE** as policy. The synthesized (macOS TTS) narration is disclosed in `devpost.md`. |
| 17 | Judge testing access, including credentials | "along with any test account credentials, API keys, or sandbox login details" (rules §4, Testing) | **PENDING owner.** The README explains how to get your own sandbox keys. Publishing judge sandbox buyer credentials needs the owner's approval. See R1. |
| 18 | Free access until judging ends | "available free of charge and without any restriction … until the Judging Period ends" (rules §4) | **DONE** for the repo. If a hosted demo is used, the owner must keep it, the keys and any credits alive until Dec 21 (update 47307). |
| 19 | English | "All Submission materials must be in English" (rules §4) | **DONE.** |
| 20 | Original work, solely owned | "be solely owned by the Entrant, and not violate the IP rights" (rules §4) | **PENDING owner confirmation.** All 49 commits are co-authored with Claude (AI assistant). The rules allow "technical assistance" if the work is the Entrant's own. The description discloses it. |
| 21 | Third-party SDK and API terms | "Entrant must be authorized to use them in accordance with any terms" (rules §4) | **DONE.** PayPal sandbox app and Anthropic API key are the owner's own. Dependencies come from npm under their own open-source licences, which weren't audited one by one. `npm audit` is clean. |
| 22 | No sponsor funding or support | "must not have been developed … with financial or preferential support from the Sponsor" (rules §4) | **PENDING owner confirmation.** Nothing in the repo suggests any. |
| 23 | Team and Representative | "they must appoint and authorize one individual (the “Representative”)" (rules §3) | **PENDING owner.** Confirm a solo entry, or invite teammates and have them accept (update 47307, FAQ). |
| 24 | Eligibility (age of majority, not excluded country, not a sponsor employee) | "Individuals who are at least the age of majority where they reside" (rules §3) | **PENDING owner.** Only the owner can confirm residency. Brazil, Quebec, Russia, Crimea, Cuba, Iran, North Korea and OFAC-sanctioned countries are excluded. |
| 25 | Built With names PayPal and AI | "Name both in your description, "Built With" section, and video" (update 47305) | **DONE** in the draft's "Built with" list. |
| 26 | Sponsor tools selected on the form, if aiming for a sponsor prize | "Sponsor tools selected on the form if you're going for a sponsor prize" (update 47307) | **PENDING owner.** Select Render only if the hosted demo actually runs on Render. No other sponsor tool is used. |
| 27 | Freeze after the deadline | "Don't edit your repo, video, or linked materials until after the winner announcement." (update 47307) | **PENDING owner.** Push every final commit before Nov 12. Local `998a10c` (narrated master) was ahead of the remote HEAD when this list was written. |
| 28 | Hide API keys | "Use environment variables, never commit secrets." (update 47305) | **DONE.** Secret scan: 0 hits across 47 commits (`docs/qa-report.md` §2). |

## Devpost form fields (from the standard form, not the rules)

The rules only say "Complete and enter all of the required fields" (rules §4). The usual Devpost project form is: project name, elevator pitch (up to 200 characters), thumbnail, About (Markdown), Built with, Try it out links, image gallery and a video link. Some hackathons add their own questions (testing instructions, sponsor tools). **PENDING owner: open the form and check it for extra questions before Nov 12.**

- **Thumbnail and gallery:** the rules set no image requirement. **DONE** for assets: `docs/submission/youtube-thumbnail.png` and `docs/screenshots/` (states 1–4, light, dark and mobile). Suggested gallery: `3-blocked-desktop-light.png`, `4-fixed-desktop-light.png`, `2-results-desktop-light.png`, `1-home-mobile-dark.png`. A receipt screenshot isn't in `docs/screenshots/`.

## Legal terms the owner must accept personally

Neither an assistant nor anyone else can accept these on the owner's behalf:

- **Submitting is a contract:** "SUBMISSION OF ANY ENTRY CONSTITUTES AGREEMENT TO THESE OFFICIAL RULES AS A CONTRACT" (rules, preamble).
- **Release and indemnity** for the sponsor and Devpost (rules §9), plus **binding individual arbitration with a class-action waiver** under New York law (rules §13).
- **Publicity consent:** name, likeness and voice may be used "worldwide without further payment" (rules §10). Promotion rights last 3 years (rules §7).
- **Devpost Terms of Service** (https://info.devpost.com/terms) and the **Privacy Policy** (https://info.devpost.com/privacy), both incorporated by reference (rules §14–15).
- **Developer platform licences:** PayPal Developer terms and Anthropic's terms, under the line "Use of the developer tools will be subject to the license agreement" (rules §4).
- **Winners only:** an affidavit, a W-9 or W-8BEN, and identity verification, due within 10 business days (rules §8).

## Risks: rules we could fail

- **R1. Testing access (Testing, rules §4).** Without a hosted demo, judges need their own PayPal sandbox app. They also need their own Anthropic key, or they see only the rules fallback, without Claude. The README says how to get both, which meets "include clear instructions for obtaining access". It is still friction. Judges "may choose to judge based solely on the text description, images, and video", so the video carries the AI evidence.
- **R2. Trademarks in the video (rules §4).** PayPal is the sponsor. "Claude" names the AI tool we used, and "USB-C" and "Lightning" describe products. Lightning is an Apple trademark, used descriptively, with a disclaimer in the description. Low risk, but the owner should check that no third-party logos appear on screen.
- **R3. Video timing.** If the final master with narration runs past 3:00, it fails the length rule. The cut is 2:31. Check the uploaded length.
- **R4. Changes after the deadline (update 47307).** A hosted demo that goes down, or expired sandbox credentials, before Dec 21 would break "running consistently" (rules §4, Functionality).
