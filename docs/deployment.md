# Deployment (prepared, NOT deployed)

Nothing has been deployed or published. Going live needs the owner's explicit approval, and the hackathon rules require the demo to stay up and free until **Dec 15, 2026, 8:00 am PT** (`research/devpost-rules-verified.md`).

## Options compared (2026-10-24, prices from official pages; full table and sources: `research/hosting-options-2026-10.md`)

The app needs one always-on Node process, a disk that survives restarts and deploys (SQLite), HTTPS and an inbound webhook, publicly available and free for judges until **Dec 15, 2026, 8:00 am PT**. Cost estimates cover Nov 1 – Dec 15.

| Option | Est. cost | Verdict |
|---|---|---|
| **Fly.io**: 1 × shared-cpu-1x 512 MB, 1 GB volume, `min_machines_running = 1` | **≈ $6** | Cheapest reliable option. Needs a Dockerfile and `fly.toml`. **Not prepared here**: Docker isn't installed on this machine, so a Dockerfile couldn't be built or tested locally |
| **Render**: Starter + 1 GB disk (`render.yaml` ready) | **≈ $11** | The least setup, and the blueprint is already written. Brief downtime on each deploy because of the disk |
| Railway Hobby + volume | ≈ $10 | Similar to Render. The usage estimate is unverified |
| Hetzner CX23 + Caddy | ≈ €9 | You run the server yourself. EU only at that price |
| Render Free, Koyeb Free | $0 | **Not viable**: no persistent disk, and they sleep |
| Vercel / Netlify | $0 | **Not viable without a rewrite**: no durable filesystem. Would need libSQL, with locks and rate limits moved into the database |
| Oracle Always Free, GCP e2-micro, Northflank Sandbox | $0 | **Not recommended**: idle reclamation (Oracle), DIY ops and 1 GB RAM (GCP), "not for production" (Northflank). All need a card |

**Recommendation:** Render Starter + disk (≈ $11). The blueprint already exists, there's no container to maintain, and Render is a listed sponsor tool (whether that qualifies for its prize is unverified). If the ~$5 saving matters, Fly.io is the alternative: I would add and test a Dockerfile only once Docker or Fly's remote builder can be used. Every option needs a card and the owner's approval. **Nothing has been subscribed or deployed.**

Why not a free tier: the free tiers that sleep or have no disk would either lose orders on restart or keep judges waiting about a minute on first load. The rules require the demo to stay available until Dec 15.

Blueprint: `render.yaml` at the repo root (`autoDeploy: false`). The disk pins the service to one instance, which is exactly what the in-process compare-and-set locks and rate limits assume.

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
