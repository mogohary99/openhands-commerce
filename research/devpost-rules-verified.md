# PayPal AI Hackathon — Official Rules, Verified

Verified on 2026-10-24 (read-only, not logged in, nothing registered or submitted).

**Correct official URLs** (the hackathon is NOT at `paypal-ai.devpost.com`):
- Overview / requirements: https://paypalaihackathon.devpost.com/ — referred to below as [OV]
- Official Rules: https://paypalaihackathon.devpost.com/rules — referred to below as [R]
- Channel3 sponsor page: https://paypalaihackathon.devpost.com/details/channel3 — referred to below as [C3]

Method: `WebFetch`/`curl` got HTTP 403 (Cloudflare challenge), so the pages were read as text in Chrome. `https://paypal-ai.devpost.com/` opened, but the extension was not allowed to read it, so it is UNVERIFIED whether anything is hosted there; earlier research and the Devpost rules both point to `paypalaihackathon.devpost.com`. The `/updates` page also could not be read (permission denied), so **any announcements posted there are UNVERIFIED.** [R] says the rules "are subject to change at any time" and that amended rules are posted on the website. Re-check [R] before submitting.

Official name: "PayPal AI Hackathon: Build what's next with PayPal and AI" (page title, [R]).

---

## 1. Dates (all Pacific Time) [R §1]

| Item | Exact text / value |
|---|---|
| Submission Period | "Thursday Oct 1, 2026 (9:15 am Pacific Time)" → "**Thursday Nov 12, 2026 (12:00 pm Pacific Time)**" (noon PT = 20:00 UTC = Nov 13 01:30 IST) |
| Judging Period | "Tuesday Dec 1, 2026 (2:00 pm Pacific Time)" → "Tuesday Dec 15, 2026 (8:00 am Pacific Time)" |
| Winners announced | "On or around Monday, Dec 21, 2026 (2:00 pm Pacific Time)" |
| Edits after deadline | "Once the Submission Period has ended, you may not make any changes" to the Submission [R §5] |

## 2. Eligibility [R §3]

- Open to individuals "at least the age of majority where they reside", teams of such individuals, and existing organizations.
- Excluded: residents of places where US or local law prohibits taking part, "including, but not limited to, Brazil, Quebec, Russia, Crimea, Cuba, Iran, and North Korea", plus OFAC-sanctioned countries. Also excluded: the Sponsor (PayPal) and Devpost, their employees and families, judges, and anyone with a conflict of interest.
- Teams/organizations must appoint one "Representative" who submits.
- **Team size: no maximum is stated** in [R] or [OV]. [OV]: "Projects can be built individually or as a team."
- Multiple submissions are allowed if each is "unique and substantially different".
- No project "developed... with financial or preferential support from the Sponsor".

## 3. Requirements checklist

| # | Requirement | Exact wording (short quote) | Source | Verified |
|---|---|---|---|---|
| 1 | Integrate the PayPal developer platform in sandbox, plus an AI tool | "integrates the PayPal developer platform (using the free sandbox environment)" | [R §4], [OV] | Yes |
| 2 | PayPal must be central to the project | "Any AI tool works, as long as PayPal integration is central" | [R §4], [OV] | Yes |
| 3 | No specific PayPal API or SDK is required; any PayPal service counts (Venmo, Braintree, Xoom, Honey, Zettle, etc.) | "Meaningfully integrate at least one PayPal technology, API, SDK" | [OV], [R §4] | Yes |
| 4 | AI must be meaningful | "Meaningfully incorporate AI into the experience or functionality" | [OV] | Yes |
| 5 | Sponsor tools are optional (AG Grid, APIMatic, Astropods, Bryntum, Channel3, Elastic, KERNEL, Postman, Render, Zapier) | "using one of these partner tools is not required" | [R §4], [OV] | Yes |
| 6 | No required tracks or categories at submission; prize categories exist (section 6) | none stated | [R], [OV] | Yes (no tracks are listed) |
| 7 | New project, or an existing one significantly updated during the period (explain the update) | "must have been significantly updated after the start" | [R §4] | Yes |
| 8 | Works as shown | "must function as depicted in the video and/or expressed in the text" | [R §4] | Yes |
| 9 | Text description | "explain the features and functionality of your Project" | [R §4], [OV] | Yes |
| 10 | "Tools" field: name the model or AI service and how it was used | "identify which tools (model or AI service) were used" | [OV] only (not in [R]) | Yes |
| 11 | Functional demo: a hosted URL **or** complete setup and run instructions | "judges must be able to actually run or interact with a working build" | [R §4], [OV] | Yes |
| 12 | A mockup or static prototype does not count | "A design mockup, static prototype, or non-functional demo does not meet" | [R §4] | Yes |
| 13 | Public repo on GitHub, GitLab or Bitbucket with all source code, assets and instructions | "must contain all necessary source code, assets, and instructions" | [R §4] | Yes |
| 14 | Open-source license file that shows in the repo's About section | "detectable and visible at the top of the repository page (in the About section)" | [R §4] | Yes (no specific license or OSI list is required) |
| 15 | Video under 3 minutes | "should be less than three (3) minutes" | [R §4] | Yes |
| 16 | Judges may stop watching at 3:00 | "Judges are not required to watch beyond three minutes" | [R §4] | Yes |
| 17 | Video shows the real product running | "shows the Project functioning on the device for which it was built" | [R §4] | Yes |
| 18 | Video is public on YouTube, link on the form | "uploaded to and made publicly visible on YouTube" | [R §4] | Yes (YouTube only) |
| 19 | No third-party trademarks or copyrighted music without permission | "must not include third party trademarks, or copyrighted music" | [R §4] | Yes |
| 20 | Testing access for judges, free and unrestricted until judging ends (**Dec 15, 2026, 8:00 am PT**) | "available free of charge and without any restriction... until the Judging Period ends" | [R §4 Testing] | Yes |
| 21 | Private site → login credentials go in the testing instructions | "Entrant must include login credentials in its testing instructions" | [R §4 Testing] | Yes |
| 22 | Repo instructions must include the credentials needed to run it | "any test account credentials, API keys, or sandbox login details" | [R §4 Testing] | Yes |
| 23 | Special access → explain how to get it in the README or description | "include clear instructions for obtaining access within your repository's README" | [R §4 Testing] | Yes |
| 24 | Judges may judge without testing | "may choose to judge based solely on the text description, images, and video" | [R §4 Testing] | Yes |
| 25 | English, or English translations | "must provide an English translation" | [R §4] | Yes |
| 26 | Third-party APIs, SDKs and data must be used under their terms (e.g. Anthropic API, Channel3) | "must be authorized to use them in accordance with any terms" | [R §4] | Yes |
| 27 | Open-source dependencies: comply with their licenses and build on them | "complies with applicable open source licenses" and "enhances and builds upon" | [R §4 IP] | Yes |
| 28 | Original work, owned only by the entrant; contracted technical help is allowed | "be solely owned by the Entrant" | [R §4] | Yes |
| 29 | Sandbox access through developer.paypal.com | "create a free account at https://developer.paypal.com/" | [R §4] | Yes |

## 4. IP and licensing [R §4, §7]

- "All Submissions remain the intellectual property of the individuals or organizations that developed them."
- PayPal gets "a non-exclusive license to use such entry for judging". PayPal and Devpost may promote the submission and use entrants' names, likenesses and voices for three years after the hackathon.
- The repo must still be public and open source (checklist rows 13–14).

## 5. Judging [R §6]

- Judging methods may include "expert panels, peer review, automated AI-driven analysis".
- **Stage One (pass/fail):** the project must "reasonably fits the theme and reasonably applies the required APIs/SDKs".
- **Stage Two: five "equally weighted criteria"** (20% each; the percentage is implied, not printed):
  1. **Technological Implementation**: "How thoroughly and skillfully does the project use PayPal Developer Platform and AI"; "a working, non-trivial implementation".
  2. **Design**: "a complete, coherent product experience — not just a technical proof of concept".
  3. **Potential Impact**: "a credible, specific case for solving a real problem for a real audience", judged on what is demonstrated.
  4. **Innovation/Idea**: "How creative and novel is the concept".
  5. **Presentation**: "Does the video clearly demonstrate the project working end-to-end?"; problem, audience, why it matters; easy to follow.
- **Tie-break:** compare scores criterion by criterion in the order above (Technological Implementation first). If still tied on every criterion, the judges vote.

## 6. Prizes [R §8]

| Prize | Amount |
|---|---|
| **Grand Prize, 1st Place** | **$12,000 USD** |
| Grand Prize, 2nd Place | $8,000 USD |
| Grand Prize, 3rd Place | $5,000 USD |
| Honorable Mentions (one each): Most Creative, Most Impactful, Best Demo Delivery, Best Use of PayPal + AI, Best Use of Agentic Commerce | $5,000 USD each |
| AG Grid: 1st / 2nd / 3rd (×3) | $5,000 / $2,000 / $1,000 each |
| APIMatic (×3) | $1,000 + 6 months of APIMatic business subscription |
| Bryntum (×3) | $1,000 each |
| Channel3 (×1) | $1,500 |
| Render: 1st / 2nd / 3rd | $1,000 / $750 / $500 in Render credits |

- **Stacking:** a project can win "up to one (1) Grand Prize and one (1) Sponsor Prize OR one (1) Honorable Mention Prize and one (1) Sponsor Prize".
- Astropods, Elastic, KERNEL, Postman and Zapier are listed as sponsor tools but have **no prize** in [R §8].
- The cash total adds up to $67,500, which matches the "$67,500+" on a third-party aggregator. Devpost's own headline figure was not checked (UNVERIFIED).
- Winners must complete identity verification and affidavits, return forms within 10 business days, and pay their own taxes and fees.
- **Channel3 [C3]:** the project must actually call the API or MCP: "Projects that only reference Channel3 without calling it will not meet this requirement." Free key with 20,000 credits (promo code PAYPAL-HACKATHON-2026).

## 7. Not verified in this pass (UNVERIFIED)

- Any posts on `/updates` or in the Discord that change or clarify the rules.
- The "Inspiration" examples cited in `research/competitive-landscape.md` (agentic checkout, niche checkout, screen-reader-friendly payments). The extracted overview text contained only the Requirements and What to Submit sections.
- The Devpost headline prize-pool figure and the countdown banner. The deadline itself is verified from [R].
- Whether `paypal-ai.devpost.com` hosts anything.
- The exact theme wording used for the Stage One "fits the theme" check, beyond "Build what's next with PayPal and AI".

## 8. Discrepancies with earlier assumptions

Sources compared: `docs/implementation-plan.md`, `docs/risk-register.md`, `docs/demo-storyboard.md`, `research/competitive-landscape.md` §0, `research/paypal-feasibility.md`.

**Confirmed as correct:** the deadline is Nov 12, 2026, 12:00 pm PT, noon not midnight (implementation plan, risk R11). Judging runs Dec 1–15 and winners are announced around Dec 21. Grand Prize 1st is $12,000 and 2nd/3rd are $8k/$5k. The five Honorable Mentions are $5k each. The stacking rule is right. Channel3's $1,500 prize and its "must actually call it" rule are right. The five criteria are equally weighted and ties break on Technological Implementation first. The YouTube video must be public and under 3 minutes. The repo must be public on GitHub, GitLab or Bitbucket with a license shown in About. A hosted URL or run instructions are both acceptable, and a mockup is not. The "Tools" field exists. Judges may judge from the text and video alone and may use AI-driven analysis. No specific PayPal product is mandated, so Orders v2 sandbox checkout qualifies.

**Discrepancies and refinements:**

1. **Wrong URL in the task brief.** The brief guessed `paypal-ai.devpost.com`. The official site is `paypalaihackathon.devpost.com`, which matches the earlier research.
2. **"OSI licence"** (competitive-landscape). The rules only require "an open source license file" that GitHub detects and shows in About. They do not mention OSI. The plan's MIT or Apache-2.0 is a safe choice. The license must be a standard `LICENSE` file so GitHub detects it.
3. **"README with sandbox test credentials"** (competitive-landscape) understates the rule. [R] requires "complete setup and run instructions" **plus** "any test account credentials, API keys, or sandbox login details necessary", and login credentials if the site is private. Judges cannot run a self-hosted build without PayPal sandbox client credentials and an Anthropic key, so self-hosting would mean handing out API keys. **A hosted demo URL plus a sandbox buyer test account is the safer way to meet this rule.** Never commit live keys.
4. **How long the demo must stay up.** Earlier notes say "through judging". The exact end is **Dec 15, 2026, 8:00 am PT**, about five weeks after submission. Hosting, sandbox accounts and the Anthropic key must all keep working until then, which also affects the Render plan in implementation-plan step 4. The "AI down → deterministic fallback" design in risk register R5 directly supports this rule.
5. **Sponsor tool list is incomplete in earlier notes.** The official list has 10 tools: AG Grid, APIMatic, Astropods, Bryntum, Channel3, Elastic, KERNEL, Postman, Render, Zapier. Earlier notes named only the five with prizes. This does not change the plan.
6. **Render prize.** If the app is hosted on Render (implementation-plan step 4), the project may also qualify for the Render sponsor prize ($1,000 / $750 / $500 in credits). It can stack with a Grand Prize or an HM. Earlier notes did not mention this. Whether merely hosting on Render counts as "use any Render tools" is UNVERIFIED.
7. **Tools field location.** It appears in the "What to Submit" section of the overview page, not in the Official Rules. It is still on the submission form, so treat it as required.
8. **Captions** (implementation plan, video checklist) are not required by the rules. They are still worth keeping for accessibility and the Presentation score.
9. **"Footage that shows the Project functioning on the device for which it was built"** is not on the earlier checklist. The video must show the real running app, not slides or mockups. The current storyboard already does this.
10. **Explain-the-update rule.** This only applies to projects that existed before Oct 1. This project started in October 2026 (inside the period), so it does not apply. Stating "built during the Submission Period" in the description is still prudent.
11. **Third-party terms.** [R] requires authorized use of third-party APIs and data under their terms, including the Anthropic API, Channel3 and any product images in the demo catalog. The video must also avoid third-party trademarks without permission. A product catalog that shows real brands (e.g. "Lightning" or Apple-branded cables) could be a trademark issue in the video. Consider generic names.
12. **Team size.** No limit is stated. Earlier docs made no assumption about this.
