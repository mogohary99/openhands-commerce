# Hosting options for the Next.js 16 + better-sqlite3 app (researched 2026-10-24)

**Constraints:** one Node 20 process (`next start`), the SQLite file must survive restarts and deploys, HTTPS, a PayPal webhook, and continuous public availability from about Nov 12 to Dec 15 2026 08:00 PT. Traffic is low. The cost window is **Nov 1 – Dec 15 2026 (~1.5 months)**.

All prices were read from official pages on **2026-10-24**, unless marked **UNVERIFIED**. Prices are USD and exclude tax.

## Comparison

| Option | Tier / config | Monthly cost | Persistent storage on this tier | Idle / sleep behaviour | HTTPS | better-sqlite3 (native) | Card needed | Setup effort | Est. Nov 1–Dec 15 |
|---|---|---|---|---|---|---|---|---|---|
| **Fly.io** | shared-cpu-1x **512 MB**, 1 GB volume, shared IPv4 | $3.69 + $0.15 = **$3.84** (256 MB = $2.19, too small for Next.js) | Yes (volume, $0.15/GB-mo, billed even while stopped) | No free tier. Trial is 2 h of machine time or 7 days. Auto-stop is optional: stopped machines keep their volume and wake in about 2 s+. Set `min_machines_running = 1` (or auto-stop off) for judges. | Auto, free certificates (10 hostnames) | Yes. Dockerfile build, Linux x64 | **Yes** (after trial) | Low–medium (Dockerfile + `fly.toml` + `fly volumes create`) | **≈ $6** |
| **Render** | Hobby workspace ($0) + **Starter** web service + 1 GB disk | $7 + $0.25 = **$7.25** | Paid instances only. Free web services cannot attach disks. | Starter is always on. Free tier spins down after 15 min, takes about 1 min to wake, and loses local files. With a disk there are **no zero-downtime deploys** (brief downtime on each deploy). | Auto | Yes (native Node build) | Yes (paid instance) | **Lowest** (Git connect, set mount path) | **≈ $11** (prorated) |
| **Railway** | **Hobby** $5/mo with $5 usage included; volume up to 5 GB | **$5** flat if usage stays under $5 (RAM ~$10/GB-mo, CPU ~$20/vCPU-mo, volume ~$0.15/GB-mo). An idle ~250 MB Next.js process is about $2.5–3.5. **UNVERIFIED estimate.** | Yes. Hobby allows 5 GB; Free/Trial allow 0.5 GB. | Always on unless "Serverless" is enabled (sleeps after 5–10 min without outbound traffic, and the first request may get a 502). The Trial ($5, 30 days) and Free plan ($1/mo credit) do not cover the window. | Auto | Yes (Railpack/Nixpacks or Dockerfile) | Yes for Hobby | Low | **≈ $10** (2 billing cycles) |
| **Northflank** | Developer Sandbox (free): 2 services, 1 DB, "always on, no sleeping" | $0 | Pricing table marks volumes as included on Sandbox. **Sandbox volume size and CPU/RAM limits are UNVERIFIED.** | No sleep | Auto | Yes (Dockerfile/buildpack) | **Yes**, a payment method is required for all plans | Medium | $0 (risks: docs say the free tier "should not be used for production"; small compute may not fit Next.js) |
| **Koyeb** | Free instance (512 MB, 0.1 vCPU) | $0 free. Paid: eco-nano $1.61, nano $2.68/mo, but volumes are listed under the **Pro plan, $29/mo** | **No.** Free instances can't use volumes. | Free instance scales to zero after 1 h idle | Auto | Yes (Docker) | UNVERIFIED | Low | Free: not viable. Pro: ≥ $29/mo |
| **Vercel / Netlify** | Hobby (free) | $0 | **No.** Functions have a read-only filesystem plus up to 500 MB of `/tmp` scratch that does not persist. You would need Turso/libSQL (free: 5 GB, no card). | Functions are archived after 2 weeks without invocation (cold start +1 s or more) | Auto | N/A (better-sqlite3 would have to be replaced) | No | **High code change:** swap better-sqlite3 for async `@libsql/client`, and move the in-process CAS locks and in-memory rate limits into the DB, because serverless runs many instances. Netlify's model is assumed to be the same (**UNVERIFIED**). | $0 |
| **Hetzner Cloud VPS + Caddy** | CX23 (2 vCPU / 4 GB / 40 GB, EU: HEL/NBG/FSN), IPv4 included | **€5.99** (hourly, capped monthly). The cheapest US-location plan is CPX11 at €17.99. | Yes (local disk). Backups +20% (**UNVERIFIED**). | Always on | Caddy, automatic Let's Encrypt | Yes (install build-essential or use prebuilt binaries) | Yes (or PayPal). ID checks sometimes required (**UNVERIFIED**). The plan pages showed "currently unavailable" when fetched, which may be a page-rendering artifact (**availability UNVERIFIED**). | **Highest ops:** OS patching, firewall, systemd unit, Caddy, deploys, backups | **≈ €9 (~$10)** |
| **Oracle Cloud Always Free** | VM.Standard.E2.1.Micro (1/8 OCPU, 1 GB) or A1.Flex (up to 4 OCPU / 24 GB), 200 GB block storage | $0 | Yes (boot/block volume) | **Idle reclamation:** Oracle may reclaim an instance if, over 7 days, the 95th-percentile CPU and network (and memory on A1) all stay below 20%. A low-traffic judge app **meets this definition.** A1 often fails with "out of host capacity". | DIY (Caddy) | Yes (A1 is arm64, so build on the box) | **Yes** (verification hold; virtual/prepaid cards reportedly rejected, **UNVERIFIED**) | High (VCN/security lists + full VPS ops) | $0, but risky |
| **Google Cloud e2-micro free tier** | 1 e2-micro (2 shared vCPU, 1 GB) in us-west1/us-central1/us-east1, 30 GB standard PD | $0 compute and disk. External IPv4 may cost about $3/mo (**UNVERIFIED**). Egress above 1 GB/mo is billed. | Yes (persistent disk) | No sleep or reclamation clause in the free-tier docs | DIY (Caddy) | Yes. A 1 GB box may OOM during `next build`, so build elsewhere or add swap. | **Yes** (billing account; $0–$1 hold) | High (VPS ops) | **$0–5** |

## Recommendation (ranked)

1. **Fly.io: ≈ $6 total (Nov 1 – Dec 15).** This is the cheapest option that is managed, persistent and always reachable.
   - **Setup:** `shared-cpu-1x` 512 MB, a 1 GB volume mounted at e.g. `/data` with the SQLite file there, the shared IPv4 (free), and one machine with `min_machines_running = 1`.
     - One machine fits the single-process design. Never scale to 2, or the in-process locks break.
     - Even if the machine auto-stops, data is safe. Only the wake time (about 2 s+) is affected.
   - **Caveats:**
     - A Fly volume lives on one host and is not replicated. Keep the daily snapshots (default 5-day retention; can be set up to 60) and add an off-box copy, such as Litestream to S3/R2 or a nightly `sqlite3 .backup`.
     - Each deploy has a few seconds of downtime.
     - A card is required.
2. **Render Starter + 1 GB disk: ≈ $11 total.** This has the least setup and ops work: connect Git, add a disk, and it runs always on with automatic HTTPS. Pick it if the roughly $5 difference is worth fewer moving parts. Each deploy causes brief downtime because of the disk. Do not use Render Free: it has no disk, spins down after 15 min and takes about 1 min to wake.
3. **Railway Hobby: ≈ $10 total.** Similar to Render, with usage-based billing that is very likely covered by the $5 included usage. Leave "Serverless" off.
4. **Hetzner CX23 + Caddy: ≈ €9.** It has the most headroom, but you do the ops yourself, the server is EU-only at this price, and availability was unconfirmed when checked.
5. **$0 options, not recommended for the "must stay up" rule:**
   - Northflank Sandbox: card required, "not for production", unverified limits.
   - GCP e2-micro: 1 GB RAM, full DIY ops, possible IPv4 charge.
   - Oracle Always Free: idle reclamation matches this workload's profile.
   - Koyeb Free and Render Free: no persistent volume.
   - Vercel/Netlify: need a rewrite to libSQL and distributed locks and rate limits.

**Bottom line:** deploy to Fly.io for about $6 total, with Render Starter (about $11) as the low-effort fallback. Either way, put a daily off-box backup of the SQLite file in place before Nov 12.

## Sources (all read 2026-10-24)

- Render pricing (Hobby $0 + compute; Starter $7/mo 512 MB / 0.5 CPU; disks $0.25/GB-mo): https://render.com/pricing
- Render free-tier limits (15 min spin-down, ~1 min wake, no disks): https://render.com/docs/free
- Render disks (paid services only, single instance, no zero-downtime deploys): https://render.com/docs/disks
- Fly.io pricing (no free tier for new orgs; trial 2 h / 7 days; 256 MB $2.19, 512 MB $3.69, 1 GB $6.70; volumes $0.15/GB-mo; dedicated IPv4 $2; card required): https://docs.fly.io/about/pricing
- Fly.io autostop/autostart (stop/suspend, ~2 s start, stopped machines not billed for CPU/RAM): https://docs.fly.io/launch/autostop-autostart/
- Fly.io volumes (persist across deploy/restart, single host, not replicated, daily snapshots): https://docs.fly.io/volumes/overview/
- Railway pricing (Trial/Free/Hobby $5/Pro $20; usage rates; volume limits): https://railway.com/pricing
- Railway volumes (Hobby 5 GB, one volume per service, redeploy downtime): https://docs.railway.com/reference/volumes
- Railway serverless / app sleeping: https://docs.railway.com/reference/app-sleeping
- Koyeb instances (free: 512 MB, scales to zero after 1 h, no volumes; eco-nano/nano prices): https://www.koyeb.com/docs/reference/instances
- Koyeb pricing (Pro $29/mo, volumes listed under Pro): https://www.koyeb.com/pricing
- Northflank pricing (Sandbox: always on, volumes included; $0.11657/GiB-mo): https://northflank.com/pricing
- Northflank billing (payment method required on all plans; free tier not for production): https://northflank.com/docs/v1/application/billing/pricing-on-northflank
- Vercel function runtimes (read-only FS, 500 MB `/tmp`, archiving after 2 weeks): https://vercel.com/docs/functions/runtimes
- Turso pricing (free 5 GB, no card; Developer $4.99): https://turso.tech/pricing
- Hetzner Cloud cost-optimized (CX23 €5.99 incl. IPv4): https://www.hetzner.com/cloud/cost-optimized/
- Hetzner Cloud regular performance (CPX US pricing): https://www.hetzner.com/cloud/regular-performance/
- Oracle Always Free resources (shapes, 200 GB, idle reclamation criteria, capacity errors): https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- Google Cloud free tier (e2-micro regions, 30 GB PD, 1 GB egress, billing account/card): https://docs.cloud.google.com/free/docs/free-cloud-features

**UNVERIFIED items:**
- Railway's actual monthly usage for this app.
- Northflank Sandbox volume and compute limits.
- Koyeb volume price and card requirement.
- Netlify specifics.
- Hetzner availability, backup price and ID checks.
- Oracle's card-type rules, and whether moving to Pay As You Go prevents reclamation.
- GCP's external IPv4 charge on the free tier.
