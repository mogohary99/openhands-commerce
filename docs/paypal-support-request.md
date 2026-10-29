# Draft: PayPal developer support request (not sent, and not needed for now)

**2026-10-29:** with a US sandbox buyer and a new US sandbox business merchant and app, capture COMPLETED (`qa-report.md` §3a). Keep this draft only in case judges, or another account, hit `COMPLIANCE_VIOLATION`.

**Send it only if the US sandbox test also fails, or if you want PayPal's answer anyway.**
- **Where:** https://developer.paypal.com/support/ → "Contact us", or the PayPal Developer Community.
- **What you add:** the merchant (business) sandbox account's merchant ID from the dashboard. It isn't recorded in this repository.
- **What you don't add:** never include the client secret, passwords or access tokens.

---

**Subject:** Sandbox: Orders v2 capture returns 422 COMPLIANCE_VIOLATION after buyer approval

Hello,

In the **sandbox** environment, two orders were refused at capture with `422 UNPROCESSABLE_ENTITY`, issue `COMPLIANCE_VIOLATION`. Both had been approved by a sandbox personal account. Details:

| Order | Capture attempt (UTC) | debug_id |
|---|---|---|
| 3EW601627R616202L | 2026-10-25 08:44:06 | f10081281d454 |
| 91U83791YC987840L | 2026-10-25 08:44:29 | f2506644ac6cd |

**The orders:**
- Intent CAPTURE, 40.62 USD.
- Breakdown: item_total 31.99, shipping 5.99, tax_total 2.64.
- Disbursement mode INSTANT.
- One physical item.

**What a GET returns now:**
- Each order has one capture with status DECLINED (`6MH62755AL443325D`, `7BL936621B999000C`).
- The order-level `status` field is absent.
- An earlier GET showed `APPROVED`, 0 captures, and payer country `EG`.

**Our questions:**
1. What compliance rule triggered the refusal? Is it the sandbox buyer's or merchant's account country, or a restriction on the receiving account?
2. Which sandbox account setup (country and account type) is needed for USD Orders v2 captures to complete?
3. Is a missing order `status` with a DECLINED capture the expected final state?

Merchant ID (sandbox): [OWNER: from developer.paypal.com → Sandbox accounts]

Thank you.
