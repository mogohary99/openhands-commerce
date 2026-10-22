# Competitive Landscape — OpenHands Commerce

_Research date: 2026-10-22. Every claim carries a source. **UNVERIFIED** = we could not confirm from a primary or reliable secondary source; do not put it on a slide without re-checking. Many sources are trade press; fine details (exact %, dates) should be re-checked before quoting._

## 0. The hackathon itself (verified against the official Devpost rules text)

- **Official name:** "PayPal AI Hackathon: Build what's next with PayPal and AI" — https://paypalaihackathon.devpost.com/ · rules: https://paypalaihackathon.devpost.com/rules
- **Submission period:** Thu Oct 1, 2026 9:15 am PT → **Thu Nov 12, 2026, 12:00 pm PT** (noon, not midnight). Judging Dec 1–15; winners ~Dec 21.
- **Requirement:** "build or update an application that integrates the PayPal developer platform (using the free sandbox environment) along with an AI tool, model, or platform of their choice… as long as PayPal integration is central to the project." No specific PayPal product is mandated.
- **Stage One:** pass/fail viability (fits theme, applies required APIs/SDKs).
- **Stage Two — five equally weighted criteria** (ties broken in this order):
  1. **Technological Implementation** — thorough, skilful use of PayPal + AI; working, non-trivial.
  2. **Design** — "a complete, coherent product experience — not just a technical proof of concept".
  3. **Potential Impact** — "a credible, specific case for solving a real problem for a real audience… based on what's demonstrated".
  4. **Innovation/Idea** — creative, novel, differs from existing concepts.
  5. **Presentation** — video shows the project working end-to-end; problem, audience, why it matters.
- **Submission:** text description; "Tools" field explaining AI use; public GitHub/GitLab/Bitbucket repo **with an OSI licence visible in the About section**; a runnable build (hosted URL or complete run instructions — "a design mockup, static prototype, or non-functional demo does not meet this requirement"); **public YouTube video < 3 min**, no unlicensed music/trademarks; README with sandbox test credentials; must stay available through judging. Judges may judge on text + video alone, and may use "automated AI-driven analysis".
- **Prizes:** there is **no prize literally named "Best Overall"** — the top prize is **Grand Prize 1st Place ($12,000)**; 2nd $8,000; 3rd $5,000. Honorable Mentions ($5,000 each): Most Creative, Most Impactful, Best Demo Delivery, Best Use of PayPal + AI, **Best Use of Agentic Commerce**. Sponsor prizes include **Channel3 ($1,500)** — product-data API/MCP across 100M+ products, must be *called* meaningfully, promo code on the sponsor page — plus AG Grid, APIMatic, Bryntum, Render (credits).
- **Stacking:** one Grand Prize + one Sponsor Prize, **or** one Honorable Mention + one Sponsor Prize.
- **Theme fit:** the official Inspiration list names "an AI agent that shops and checks out for you", "a simpler checkout flow for a niche audience", and an accessibility-designed (screen-reader friendly) payment experience. Good fit — but it also means **judges will see other accessible/agentic shopping entries**; the differentiator must be visible in the video.

## 1. Accessible AI shopping tools

| Product | What it is | Shopping/checkout? | Source |
|---|---|---|---|
| **Be My Eyes / Be My AI** | Volunteer video help + AI image description (36 languages) + "Specialized Help" to company support | Describes images; no comparison, verification or checkout | https://apps.apple.com/app/id905177575 |
| **InnoSearch AI** | Separate company (launched Mar 2024) — AI shopping & flight booking for blind/low-vision users; claims 500k+ retailers, 1B+ products, human customer service | **Closest direct competitor.** Strategic alliance with Be My Eyes (GAAD, May 2025): portal integrated in Be My Eyes app + 2% cashback. One AppleVis user reports the entry just opens the InnoSearch site. Whether it verifies variant/price/budget before payment, or which payments it accepts: **UNVERIFIED** | https://www.bemyeyes.com/?p=21193302 · https://applevis.com/comment/189228 · https://doubletaponair.com/special-event-ai-for-the-blind-ask-me-anything-featuring-be-my-eyes-innosearch/ |
| **Seeing AI** (Microsoft), **Envision** | Barcode/product ID in the physical world | No online commerce | https://www.afb.org/aw/23/11/18109 |
| **Aira** | Live human visual interpreters; free at Target (since 2020) and piloted free at Walmart stores and Walmart.com (late 2024) | Human-provided verification and help; retailers pay — evidence retailers buy accessibility help for checkout | https://www.supermarketnews.com/grocery-trends-data/target-expands-aira-service-for-blind-and-low-vision-customers · https://www.retailtouchpoints.com/features/news-briefs/walmart-pilots-free-app-with-live-visual-interpretation-for-blind-customers |
| **Research** | CHI 2026, Shin et al., "Toward Independent Online Shopping of the Visually Impaired Through Voice-based Computer-Using Agent" (DOI 10.1145/3772318.3791681) — Wizard-of-Oz study, 12 blind/low-vision adults | Validates the need; not a product | https://a11y-paradise.onrender.com/reviews/69e63e5f5570d11947cedf8f · https://arxiv.org/abs/2509.01246 |

Amazon/Walmart's own assistant accessibility posture (e.g., Rufus with VoiceOver): **UNVERIFIED** — no source found.

## 2. AI shopping agents and agent-payment rails

- **PayPal** — Agentic Commerce Services (Oct 28, 2025): *Agent Ready* (merchants accept payments on AI surfaces; "early 2026"), *Store Sync* (catalog to AI channels). Perplexity partnership (May 2025) and "Instant Buy" (Nov 2025, secondary). OpenAI ACP adoption (Oct 2025). Google UCP support (Jan 2026). **None are developer-sandbox products** (see `paypal-feasibility.md`). https://newsroom.paypal-corp.com/2025-10-28-PayPal-Launches-Agentic-Commerce-Services-to-Power-AI-Driven-Shopping · https://techcrunch.com/2025/10/28/paypal-partners-with-openai-to-let-users-pay-for-their-shopping-within-chatgpt
- **Amazon Rufus** — Auto Buy at a target price (checkbox, 6-month request, 24 h cancel window); May 2026 365-day price history and "Buy for Me" from outside merchants. Price trigger, not configuration verification. https://www.modernretail.co/technology/marketplace-briefing-amazons-shopping-bot-rufus-can-now-automatically-buy-products-for-you-when-prices-drop/ · https://ppc.land/amazons-rufus-now-shows-a-full-year-of-price-history-to-50m-shoppers/
  - Amazon sued Perplexity over its Comet browser agent → agents that drive third-party sites carry legal risk; sanctioned rails/own catalog are safer. https://www.retail-insight-network.com/news/amazon-sues-perplexity-agentic-ai/
- **Google AI Mode** — agentic checkout (Nov 2025): user sets size, colour, budget in price tracking; Google "will always ask permission" and confirms details; Google Pay. **AP2** (Sep 2025): Intent / Cart / Payment mandates, cart signed by the user. **UCP** (Jan 2026) with Walmart, Shopify, Etsy, Target, Wayfair; PayPal announced as payment option. This is the closest mainstream product to "configuration + budget matching", with no accessibility claim found. https://techcrunch.com/2025/11/13/google-expands-ai-shopping-with-conversational-search-agentic-checkout-and-an-ai-that-calls-stores-for-you · https://www.descope.com/learn/post/ap2 · https://www.theregister.com/2026/01/12/google_gemini_agentic_ai_shopping_protocol/
- **OpenAI ChatGPT Instant Checkout / ACP (with Stripe)** — Sep 2025 launch; Shared Payment Token scoped to one merchant and one cart total. **Reported scale-back ~March 2026** toward discovery; **product-data inaccuracy cited** as a key issue; Walmart in-chat conversion reportedly ~⅓ of click-out (secondary; no primary OpenAI post found). https://stripe.com/newsroom/news/stripe-openai-instant-checkout · https://storyboard18.com/digital/openai-reduces-chatgpt-shopping-focus-shifts-to-product-discovery-93192.html · https://ppc.land/walmarts-chatgpt-checkout-flopped-heres-what-comes-next/
- **Perplexity** — Buy with Pro / Instant Buy, PayPal as payment option; no verification or budget features found. https://www.medianama.com/2025/11/223-amazon-perplexity-ai-assistant-amazon-store/
- **Visa Intelligent Commerce** (Apr 2025) — agent tokens; consumers "set spending limits and conditions". https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.21361.html
- **Mastercard Agent Pay** (Apr 2025) — single-use / merchant-specific / time-limited agentic tokens. https://s25.q4cdn.com/479285134/files/doc_news/Mastercard-Unveils-Agent-Pay-Pioneering-Agentic-Payments-Technology-to-Power-Commerce-in-the-Age-of-AI-2025.pdf
- **Startups** — Daydream (fashion discovery, no checkout; https://techcrunch.com/2025/06/25/julie-bornsteins-daydream-is-releasing-an-ai-powered-chatbot-for-fashion-related-shopping), Phia (price-fairness labels; https://apps.apple.com/us/app/phia-shop-smarter-save-money/id6739351340), Onton (furniture search; https://frontiervc.com/news/2025/12/1/onton-raises-75m-to-expand-its-ai-powered-shopping-site-beyond-furniture). None claim an accessibility focus.

## 3. The problem: accessibility in ecommerce

- **WebAIM Million 2026:** 95.9% of home pages have detectable WCAG failures (up from 94.8%); 56.1 errors/page. Automated-only, so it undercounts. https://prioritypixels.co.uk/insights/web-accessibility-is-getting-worse-according-to-the-2026-webaim-million-report/ (primary: webaim.org/projects/million)
- **Baymard:** 70.22% average cart abandonment; 64% desktop / 63% mobile checkouts "mediocre or worse". https://baymard.com/lists/cart-abandonment-rate · https://baymard.com/blog/current-state-of-checkout-ux
- **Click-Away Pound 2019 (UK):** 69% of disabled shoppers leave hard-to-use sites (£17.1bn/yr); 83% stick to sites they know are accessible. https://www.clickawaypound.com/downloads/CAP2019PR2.pdf
- **Keyboard-only:** German study — only 15 of 71 most-visited shops worked keyboard-only; e.g., an inoperable size selector. https://heise.de/-9787264
- **Litigation:** UsableNet — ecommerce ~69–70% of US digital-accessibility lawsuits in 2025; Seyfarth — 3,117 federal website suits in 2025 (+27%). https://www.newswire.com/news/digital-accessibility-lawsuits-surge-in-2025-22618502 (Seyfarth figure via secondary)
- **European Accessibility Act** applies to ecommerce from June 28, 2025 (EN 301 549 ≈ WCAG 2.1 AA). https://www.cliffordchance.com/briefings/2026/05/bridging-the-accessibility-gap-the-strategic-imperative-of-the-european-accessibility-act.html
- **Payment iframes/popups** are a known screen-reader trouble spot; a third-party conformance report flags a WCAG 4.1.2 issue on a PayPal (Braintree/WooCommerce) modal trigger. PayPal Smart Buttons popup behaviour with screen readers: **UNVERIFIED — we must test it ourselves.** https://woocommerce.com/accessibility/paypal-braintree-for-woocommerce-accessibility-conformance-report/

## 4. Purchase-error prevention and trust

- **Returns:** NRF — ~$850bn returned in 2025, online return rate ~19.3% (secondary). Narvar 2025: 42% cite size/fit; Invesp: 23% received the wrong item. https://www.corso.com/post-purchase-resource-center/the-most-common-ecommerce-return-reasons
- **Trust in agents (strongest quantitative case for our differentiator):** ACI/YouGov (UK, June 2026, n≈2,000): **60% would stop using an AI shopping agent after one mistake; only 43% trust AI to follow spending limits; 15% trust it to fix problems when transactions go wrong.** https://secure.businesswire.com/news/home/20260628382944/en/Six-in-Ten-UK-Consumers-Would-Stop-Using-an-AI-Shopping-Agent-After-One-Mistake-ACI-Survey-Finds — Riskified (Q1 2026): 55% won't let AI complete a purchase. https://forkast.news/73-use-ai-for-shopping-55-wont-let-it-buy-anything-the-trust-gap-is-widening/
- **Existing human-in-the-loop patterns:** AP2 user-signed cart; Google "always ask"; Rufus checkbox + cancel window; Stripe token scoped to merchant + total; Visa limits; Mastercard scoped tokens; Alexa purchase PIN. **These enforce amount, merchant and consent — none we found checks the semantic match (right connector/size/language/variant vs what the user said).**

## 5. Competitor matrix

✓ present · ✗ not found · P partial · ? unknown/unverified

| Product | Accessibility-first | Conversational search | Evidence-based recs | Pre-payment mismatch verification | All-in budget enforcement | Explicit approval | Payment recovery | PayPal |
|---|---|---|---|---|---|---|---|---|
| Be My Eyes / Be My AI | ✓ | P (image Q&A) | ✗ | ✗ | ✗ | n/a | ✗ | ✗ |
| InnoSearch AI | ✓ | ✓ | ? | ? | ? | ? | P (human support) | ? |
| Seeing AI / Envision | ✓ | ✗ | ✗ | ✗ | ✗ | n/a | ✗ | ✗ |
| Aira (Target/Walmart) | ✓ (human) | ✓ (human) | P | P (human) | ✗ | ✓ (human) | ? | ✗ |
| Amazon Rufus / Auto Buy | ? | ✓ | P (price history) | ✗ | P (price trigger) | P | P (24 h cancel) | ✗ |
| Google AI Mode / AP2 / UCP | ? | ✓ | P | P (preset variant/budget; signed cart) | P | ✓ | ? | P (announced) |
| ChatGPT / ACP + Stripe | ? | ✓ | P | P (token = merchant + total) | ✗ | ✓ | ? | P (announced; scaled back) |
| Perplexity Instant Buy | ? | ✓ | P (citations) | ✗ | ✗ | ✓ | ? | ✓ |
| PayPal Agentic Commerce Services | ? | ✗ (infra) | ✗ | ✗ | ? | ? | P (disputes) | ✓ |
| Visa Intelligent Commerce | ✗ | ✗ | ✗ | ✗ | ✓ (network limits) | ✓ | P (disputes) | ✗ |
| Mastercard Agent Pay | ✗ | ✗ | ✗ | ✗ | P (token scope) | P | ? | ✗ |
| Daydream / Phia / Onton | ✗ | ✓/✗/✓ | P / ✓ price / P | ✗ / P price / ✗ | P / ✗ / ✗ | n/a | ✗ | ✗ |
| **OpenHands Commerce (proposed)** | **✓** | **✓ (typed-first, voice optional)** | **✓ (every claim cites a catalog field)** | **✓ (deterministic, server-side)** | **✓ (items + shipping + tax)** | **✓ (bound to quote hash)** | **✓ (cancel / decline / pending / duplicate)** | **✓ (Orders v2 sandbox)** |

## 6. Gaps we can credibly target

1. **Checking the *item*, not just the *amount*, before payment.** Rails check amount/merchant/consent; no product found compares the final cart (variant, connector, language, quantity, price at checkout, shipping + tax vs budget) against what the user said and explains differences accessibly before payment. OpenAI's reported pullback citing product-data inaccuracy suggests this is a real failure mode.
2. **Mainstream agents publish no accessibility posture**; accessibility-first players aren't on the new agentic payment rails.
3. **Recovery** after a closed popup, decline, pending capture or double click — only 15% trust AI to fix failed transactions (ACI).
4. **A budget people understand** — all-in, conversational, explicitly refused when exceeded.

## 7. Novelty claim — what we may and may not say

We found **no product** combining accessibility-first agentic shopping with pre-payment verification of configuration, price and budget plus guided payment recovery. That is **absence of evidence, not proof**. InnoSearch has not been hands-on tested; Google AI Mode has the strongest preset matching. **Approved pitch wording:**

> "We found no shopping assistant that combines accessibility-first design with a spoken, pre-payment check of configuration, price and budget, plus guided payment recovery. Today's agent-payment rails check the amount and consent — not whether it's the right thing."

**Never say** "first", "only", or "no one else does this".

**Before submission:** (a) hands-on test InnoSearch's checkout; (b) re-check whether PayPal-in-ChatGPT and Google UCP-with-PayPal are live; (c) re-verify the ACI survey figures from the primary release.

## 8. Three distinctive product approaches, scored against the five criteria

Scores 1–5 are our judgement given a 3-week build.

| | A. **"Verify-before-you-pay" accessible shopping companion** (own PayPal merchant catalog; deterministic mismatch engine; accessible approval + recovery) | B. **Accessible "Agent-Ready" checkout layer for any PayPal merchant** (A's engine packaged as an embeddable component + catalog adapter; demo store is merchant #1) | C. **Universal accessible shopping agent** (Channel3 live catalog across retailers, AI drives discovery, click-out to real retailers; PayPal only for own-store items) |
|---|---|---|---|
| Technological Implementation | 4 — Orders v2 + idempotency + webhooks + negative tests + structured AI | 5 — same, plus clean adapter boundary and webhook-driven state | 3 — breadth over depth; can't actually pay third-party merchants |
| Design | 5 — one coherent end-to-end flow | 4 — two audiences (shopper + merchant) dilute a 3-minute story | 3 — click-out breaks the end-to-end experience |
| Potential Impact | 5 — specific audience, cited trust and return data | 5 — credible path to scale (merchants adopt it; EAA/ADA pressure) | 4 — wide reach but weaker purchase safety |
| Innovation | 4 — semantic verification + accessibility combination not found elsewhere | 4 | 2 — closest to InnoSearch/Perplexity |
| Presentation | 5 — the "the cable won't fit your phone" moment | 4 | 3 |
| **Total** | **23** | **22** | **15** |

**Recommendation:** build **A** as the product and the demo, and **use B as the impact/scale narrative** in the last 20 seconds of the video and in the README ("any PayPal merchant can drop this in"). This is the honest answer to "we can't check out arbitrary merchants": we are the merchant, and the business model is merchants adopting it. **C** is rejected as the core; Channel3 is optional (see implementation plan, stretch S2) only as a clearly labelled "price elsewhere" evidence source.
