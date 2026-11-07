# Deployment (prepared, NOT deployed)

Nothing has been deployed or published. Going live needs the owner's explicit approval, and the hackathon rules require the demo to stay up and free until **Dec 15, 2026, 8:00 am PT** (`research/devpost-rules-verified.md`).

**Pricing rechecked on 2026-10-29, second pass, from render.com/pricing and render.com/docs/faq:**
- **Workspace:** Hobby, "$0 /mo + compute". The FAQ says "The Hobby plan does not have a monthly fee".
- **Compute:** a Starter web service is "$7/month", with 512 MB RAM and 0.5 CPU.
- **Disk:** "$0.25 per GB per month". A disk needs a paid service, its size can be raised but never lowered, and it has daily snapshots kept for 7 days. A service with a disk has no zero-downtime deploys.
- **Billing:** compute and storage are "Prorated by the second", and Render "bills each workspace monthly". The card must already be on file.
- **Included on Hobby:** 5 GB outbound bandwidth a month, then $0.15 per GB; 500 build minutes a month, then $5 per 1,000 minutes. Inbound traffic is free.
- **Recurring:** billing continues every month until the service **and** its disk are deleted. Nothing stops automatically on Dec 15.
- **Estimate:** a start on Oct 29 to Dec 15, 8:00 am PT is about 1.56 months × $7.25, so **about $11.30**. A start on Nov 1 is about $10.60.
- **Anthropic API usage:** billed separately by Anthropic. Set a monthly spend limit in the Anthropic Console.

## Options compared (2026-10-24, prices from official pages; full table and sources: `research/hosting-options-2026-10.md`)

The app needs one always-on Node process, a disk that survives restarts and deploys (SQLite), HTTPS and an inbound webhook, publicly available and free for judges until **Dec 15, 2026, 8:00 am PT**. Cost estimates cover Nov 1 – Dec 15.

| Option | Est. cost | Verdict |
|---|---|---|
| **Fly.io**: 1 × shared-cpu-1x 512 MB, 1 GB volume, `min_machines_running = 1` | **≈ $6** | Cheapest reliable option. Needs a Dockerfile and `fly.toml`. **Not prepared here**: Docker isn't installed on this machine, so a Dockerfile couldn't be built or tested locally |
| **Render**: Starter + 1 GB disk (`render.yaml` ready) | **≈ $11** | The least setup, and the blueprint is already written. Brief downtime on each deploy because of the disk |
| Railway Hobby + volume | ≈ $10 | Similar to Render. The usage estimate is unverified |
| Hetzner CX23 + Caddy | ≈ €9 | You run the server yourself. EU only at that price |
| Render Free, Koyeb Free | $0 | No persistent disk, and they sleep. **Render Free is now prepared as the $0 option** (`render.free.yaml`; see "Free hosting (Render Free, $0)"): demo data resets on restart, which is fail-safe. Koyeb no longer lists free compute (2026-11-07) |
| Vercel / Netlify | $0 | **Not viable without a rewrite**: no durable filesystem. Would need libSQL, with locks and rate limits moved into the database |
| Oracle Always Free, GCP e2-micro, Northflank Sandbox | $0 | **Not recommended**: idle reclamation (Oracle), DIY ops and 1 GB RAM (GCP), "not for production" (Northflank). All need a card |

**Recommendation:** Render Starter + disk (≈ $11). The blueprint already exists, there's no container to maintain, and Render is a listed sponsor tool (whether that qualifies for its prize is unverified). If the ~$5 saving matters, Fly.io is the alternative: I would add and test a Dockerfile only once Docker or Fly's remote builder can be used. Every option needs a card and the owner's approval. **Nothing has been subscribed or deployed.**

Why not a free tier: the free tiers that sleep or have no disk would either lose orders on restart or keep judges waiting about a minute on first load. The rules require the demo to stay available until Dec 15.

Blueprint: `render.yaml` at the repo root (`autoDeploy: false`). The disk pins the service to one instance, which is exactly what the in-process compare-and-set locks and rate limits assume.

## Free hosting (Render Free, $0)

A $0 option, with no card on file and no disk. The trade-off: the first visit after 15 minutes idle waits about a minute, and demo data resets whenever the instance restarts. Blueprint: `render.free.yaml` (the paid `render.yaml` is unchanged).

**Terms, checked 2026-11-07 on render.com/docs:**
- [docs/free](https://render.com/docs/free):
  - "Render spins down a Free web service that goes 15 minutes without receiving any inbound traffic." Spinning back up "takes about one minute."
  - "Like all Render services, Free web services have an ephemeral filesystem." Changes are "lost every time the service redeploys, restarts, or spins down."
  - Free services can't keep files: "Paid services can preserve local filesystem changes by attaching a persistent disk, but Free web services cannot."
  - "Render might restart a Free web service at any time."
  - "Render grants 750 Free instance hours to each workspace per calendar month." One always-awake service needs about 744 hours.
  - With no card, overages don't bill: "If you haven't added a payment method, Render instead suspends all of your Free services for the remainder of the month." The docs don't say a card is needed to start.
- [docs/build-pipeline](https://render.com/docs/build-pipeline):
  - Hobby gets 500 included pipeline minutes a month. Once they're used up with no payment method, "Render stops running pipeline tasks (including service builds!) for the remainder of the current month."
  - Builds time out "after 120 minutes".
- [docs/infrastructure-as-code](https://render.com/docs/infrastructure-as-code):
  - "By default, Render looks for the `render.yaml` file at the root of your repo, but you can define your Blueprint file anywhere."
  - Setting the file: "specify a custom file path to your Blueprint's YAML file in the Blueprint Path field."
  - Linking a Git account: "You'll first need to connect your Git provider account if you haven't yet." So a Blueprint needs Render connected to GitHub.
  - The no-GitHub-app route is a plain web service from a public URL ([docs/web-services](https://render.com/docs/web-services): "Render does not support auto-deploys" there). That route sets no Blueprint, so you enter the same fields by hand.

**Why not other $0 hosts:**
- **Vercel and Cloudflare Workers:** no writable persistent filesystem for better-sqlite3. They would need a database migration, which is out of scope.
- **Hugging Face Docker Spaces:** now "require a paid plan to create" ([spaces-overview](https://huggingface.co/docs/hub/spaces-overview)).
- **Koyeb:** its [pricing page](https://www.koyeb.com/pricing) lists no free compute instance, only free Postgres.

### Owner steps (about 10 minutes)

1. Sign in at dashboard.render.com with GitHub. No card is needed. Allow the Render GitHub app access to `mogohary99/openhands-commerce` only.
2. **New → Blueprint** → pick the repo → set **Blueprint Path** to `render.free.yaml`. It creates `openhands-commerce-free` (Free, Oregon, `rootDir: web`, no disk).
3. When it asks for the `sync: false` values, enter:
   - the rotated **sandbox** `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`
   - `ANTHROPIC_API_KEY` (optional; set a spend limit in the Anthropic Console first)
   - leave `PAYPAL_WEBHOOK_ID` blank for now, and set `APP_BASE_URL` to `https://openhands-commerce-free.onrender.com`. Fix it after the first deploy if Render gives a different hostname. No trailing slash.
4. Apply. Then run **Manual Deploy → Deploy latest commit**: `autoDeploy` is off, so nothing goes live by itself.
5. Check `https://<host>/api/health`. It should show `"ok": true, "database": "ok", "paypal": "sandbox-configured", "baseUrl": "https"`.
6. Optional webhook: add one as in step 5 of "Steps (owner)" below, with URL `https://<host>/api/paypal/webhook`. Paste its ID into `PAYPAL_WEBHOOK_ID`, then redeploy.
7. From `web/` on your machine: `HOSTED_URL=https://<host> npm run test:e2e`. This runs `hosted.spec.ts` and every browser spec that doesn't seed the local database. Wake the service first (`curl https://<host>/api/health`, about a minute when cold), so the first test doesn't time out.

### Limits

- **Cold start:** about one minute after 15 minutes without traffic.
- **Demo data resets:** this happens on every restart, spin-down or deploy. Carts, approvals, orders, receipts, webhook dedup records and the audit log are all lost. In-memory rate limits reset too.
- **Free hours:** 750 a month per workspace. Keep it to this one free service, or a second one can use up the hours.
- **Build minutes:** 500 a month. Builds stop for the month if they run out.
- **No shell, no backups:** `db:backup` doesn't apply, because there is nothing durable to back up.

### Why a wiped database is fail-safe

A missing row always means "not found". It never means "capture", and it never means "paid":
- **The buyer approves at PayPal, the instance restarts, then the return arrives.** `completePayment` looks the token up with `getOrderByPayPalId`. It finds no row and returns `not_found` before any PayPal call (`web/lib/checkout.ts:143-144`). The return route then redirects to `/?notice=not_found` (`web/app/checkout/return/route.ts:42-43`). The approved PayPal order is never captured, so nothing is charged.
- **A verified webhook for that order:** it is recorded, but `row` is null, so `reconcile` never runs (`web/lib/checkout.ts:361-366`).
- **"Check again" or an old receipt link:**
  - `recheckAction` redirects home when `getOrder` is null (`web/app/actions.ts:144-145`), and `reconcile` returns `not_found` (`web/lib/checkout.ts:314-315`).
  - The receipt page 404s (`web/app/receipt/[id]/page.tsx:30-31`).
  - A receipt only says paid when the state is `COMPLETED` (`page.tsx:37`). That state is written only after PayPal returns a COMPLETED capture whose amount matches (`web/lib/checkout.ts:252-258`).
- **The session cookie** survives the restart, but it only points at rows that no longer exist.
- **Regression test:** `web/test/unit/ephemeral-store.test.ts` deletes the SQLite file after approval. It then checks that the return, a capture webhook and a recheck all lead to zero capture calls.

**Remaining risk:** a restart in the instant after PayPal captured but before the row was saved. With a disk, that row would stay `CAPTURING` and be recovered later. On Free the row is gone, so the sandbox payment exists only at PayPal. Nothing in the app ever claims it was paid. The window is the length of one capture request, and Render doesn't spin down while a request is coming in. If it happens, find the order in the sandbox business account's activity.

## Steps (owner)

1. Push the repo to GitHub (public, after the pre-publication checklist in `docs/submission/public-repo-checklist.md`).
2. Render → New → Blueprint → select the repo. It creates `openhands-commerce` with a 1 GB disk at `/var/data`.
3. In the service's Environment tab set:
   - `APP_BASE_URL` = the service URL, e.g. `https://openhands-commerce.onrender.com` (no trailing slash). PayPal `return_url`/`cancel_url` are built from this, and `https://` turns on Secure cookies, HSTS and `upgrade-insecure-requests`.
   - `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` — the **rotated** sandbox app credentials.
   - `ANTHROPIC_API_KEY` — optional; without it the site runs rules-only and says so.
4. Deploy. Check `https://<host>/api/health` returns `"ok": true, "database": "ok", "paypal": "sandbox-configured", "baseUrl": "https"`.
5. Webhook: developer.paypal.com → Apps & Credentials (Sandbox) → the app → **Add webhook** → URL `https://<host>/api/paypal/webhook` → events `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.PENDING`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REFUNDED`. Copy the **Webhook ID** into `PAYPAL_WEBHOOK_ID`, redeploy. Until then the endpoint answers 503 and the app relies on its own capture + `GET /v2/checkout/orders` verification (webhooks are a backstop, never the source of "paid").
6. Smoke test on the hosted URL: signature flow → PayPal Sandbox login as the sandbox **personal** buyer → receipt → confirm the same capture id in the sandbox business account's activity.

## Approval checklist (one decision, then I run the rest)

**What you approve:** "Create a Render Starter web service plus a 1 GB disk for OpenHands Commerce, about $10.60 total until Dec 15, on my card." (Pricing rechecked 2026-10-29: Starter $7/month, disks $0.25/GB-month, billed per second; Hobby workspace $0.)

Before it can start, you need to:

| # | Owner step | Why only you can do it |
|---|---|---|
| 1 | Create or sign in to a Render account, and add a card | Account authentication and billing |
| 2 | Choose where the code comes from: approve a push to a **private** GitHub repo now (Render can deploy from a private repo through its GitHub app), or wait until the repo is made public | Pushing and publishing need your approval |
| 3 | Give the Render GitHub app access to that one repo | Third-party OAuth permission |
| 4 | Enter the secrets in Render → Environment: `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` from the new sandbox app `APP-7R312336N90066720` (US business account; the same values as `web/.env.local`), and `ANTHROPIC_API_KEY` for the live-Claude demo. Set a monthly spend limit in the Anthropic Console first | Secrets never pass through chat or the repo |
| 5 | Create the sandbox webhook (step 5 below) and paste its ID into `PAYPAL_WEBHOOK_ID` | It's in the PayPal dashboard, behind your login |

After approval, what I do or check:
- Apply the blueprint.
- Set `APP_BASE_URL` to the service URL.
- Deploy manually (`autoDeploy: false`).
- Check `/api/health`: `ok`, `database: ok`, `paypal: sandbox-configured`, `webhooks: configured`, `baseUrl: https`.
- Check the HSTS and CSP headers.
- Run the keyboard signature flow.
- Cancel at PayPal: "Nothing was charged".
- Your sandbox purchase on the hosted URL, verified with PayPal: one capture, 40.62 USD.
- A webhook delivery shows in PayPal's webhook events with a 200, and is recorded once.
- Run a restart and check that orders survive it (that's the disk).
- Take a first `db:backup`.
- Add the URL to Devpost.

**Pre-checked locally, 2026-10-25.** I made a clean `git archive` copy and ran `NODE_ENV=production npm ci && npm run build`, as Render's build would.
- Build: succeeded.
- `npm start` with `PORT=3400`, a fresh `DATABASE_PATH` and an `https` `APP_BASE_URL`:
  - `/api/health` returned 200: `database: ok`, `baseUrl: https`, `paypal: not-configured` (no keys given to the copy), `ai: rules-only`.
  - The home page returned 200 with `Strict-Transport-Security` and the nonce CSP.
  - The SQLite file was created in WAL mode at `DATABASE_PATH`.
- **Still untested:** Render itself, its disk, its TLS and proxy, and webhook delivery.

## Exact workflow once approved (2026-10-29)

**Owner, about 15 minutes:** steps 1–4 of the approval checklist above. Then tell me "Render is ready" and give me the service URL. Never paste secrets into chat.

**Claude:**
1. Confirm `render.yaml` matches the service: Starter, Oregon, `rootDir: web`, 1 GB disk at `/var/data`, `autoDeploy: false`, health check `/api/health`.
2. In the dashboard: set `APP_BASE_URL=https://<service>.onrender.com`, then **Manual Deploy → Deploy latest commit**.
3. Smoke test from this Mac, reading only:
   ```bash
   U=https://<service>.onrender.com
   curl -s $U/api/health            # ok, database: ok, paypal: sandbox-configured, ai: claude-configured, baseUrl: https
   curl -sI $U/ | grep -i -E "strict-transport|content-security"
   ```
4. **PayPal webhook (owner, about 3 minutes):** in developer.paypal.com → the sandbox app `APP-7R312336N90066720` → Webhooks → Add:
   - URL: `https://<service>.onrender.com/api/paypal/webhook`
   - events: `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.PENDING`, `PAYMENT.CAPTURE.REFUNDED`

   Paste the webhook ID into Render as `PAYPAL_WEBHOOK_ID`, then redeploy. Health should then show `webhooks: configured`.
5. **The hosted keyboard flow, without paying:** the signature moment, the blocked Approve → problem → fix → $40.62, then cancel at PayPal ("Nothing was charged").
6. **Hosted payment:** this is the one place a new sandbox payment is useful, as proof that hosting works end to end. It's test money only, and it's **your decision**. If you approve it, you log in as the US sandbox personal account. I then verify with PayPal (COMPLETED, 40.62 USD, one capture) and check that one webhook delivery is recorded once.
7. Restart the service; the orders must survive (that's the disk). Then take a first `db:backup`.
8. Put the URL into Devpost and `web/README.md`, and record the results in `qa-report.md`.

**Rollback:** see below. Nothing goes live without a manual deploy.

## Backups and rollback

- **Before every deploy and once a day until Dec 15:** run `npm run db:backup` from the Render shell (`cd web && DATABASE_PATH=/var/data/openhands.sqlite npm run db:backup -- /var/data/backup-$(date +%F).sqlite`). It makes a consistent online copy, runs `integrity_check` and prints the order count. Download a copy off the box now and then (Render shell → `cat` to your machine, or `scp` on a VPS). Render's automatic daily disk snapshots are a second layer.
- **Code rollback:** Render dashboard → the service → Events → pick the last good deploy → **Rollback**. Because `autoDeploy: false`, nothing goes live without a manual deploy. Check `/api/health` and run the smoke test afterwards.
- **Data rollback** (only if the database is corrupted): stop the service, copy the last good backup over `/var/data/openhands.sqlite`, and delete any `-wal`/`-shm` files next to it. Start the service, then check `/api/health` → `database: ok`. Orders made after that backup still exist at PayPal. Find them in the sandbox business account's activity and reconcile with `GET /v2/checkout/orders/{id}`.
- **If the host is down during judging:** the Devpost page links the video and the local setup instructions (`web/README.md`), which the rules accept instead of a hosted URL.

## What is configured in code

| Concern | Where |
|---|---|
| HTTPS-only behaviour | `proxy.ts` (HSTS, CSP `upgrade-insecure-requests`), `lib/session.ts` (Secure cookie) — all read `APP_BASE_URL` at **runtime**, so one build works locally and hosted |
| CSP | `lib/csp.ts`, per-request nonce |
| PayPal return/cancel URLs | `lib/paypal.ts` `orderBodyFromQuote`, from `APP_BASE_URL` |
| Health | `GET /api/health`: 200 with integration status (never values); **503 if the database can't be read** so the host stops routing |
| Error monitoring | `instrumentation.ts` `onRequestError`: one JSON line per server error on stderr (path without query, route, digest, error name, truncated message; no bodies, cookies, headers or tokens). Render's log stream collects it; a log drain (e.g. to an alerting service) can be added in the Render dashboard without code changes |
| Port | `npm start` honours `$PORT` |
| Database | `DATABASE_PATH=/var/data/openhands.sqlite` (WAL mode) |
| Backups | Render disk snapshots (daily, automatic on paid plans) |

## Verified locally (2026-10-24)

`NODE_ENV=production`, `APP_BASE_URL=https://ohc.example.test`, `PORT=3300`, fresh `DATABASE_PATH`:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` present; CSP ends with `upgrade-insecure-requests`.
- Same build with `APP_BASE_URL=http://localhost:3300`: neither header present (correct for local http).
- `/api/health` → 200, `database: ok`, `baseUrl: https`, `Cache-Control: no-store`, deny-all CSP.
- SQLite file created at `DATABASE_PATH`.

**NOT TESTED:** an actual Render build/deploy, the disk, real HTTPS, Secure-cookie behaviour behind Render's proxy, and real webhook delivery. These need the deployment the owner has not yet approved.

## Limits to know

- Single instance by design. Horizontal scaling would need Postgres (same compare-and-set transitions) and a shared rate-limit store.
- Rate limits are per process and reset on restart.
- A shopper who finishes PayPal in a different browser than they started in has no session cookie on return; nothing is captured and they're told nothing was charged.
