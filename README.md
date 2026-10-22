# OpenHands Commerce — Phase 0

Accessible AI shopping with intelligent purchase verification, explicit user control and safe PayPal (sandbox) payment recovery. PayPal AI Hackathon 2026 (deadline Nov 12, 2026, 12:00 PT).

- Research: `research/` · Specs & plans: `docs/` · Technical spikes: `spikes/`
- Fictional products only (OpenHands Demo Store). PayPal **sandbox** only — the payment module hard-codes the sandbox URL.

## Run the spikes

```sh
cd spikes
npm install
cp .env.example .env.local   # optional: sandbox PayPal keys + Anthropic key; live tests skip without them
npm run typecheck && npm test
```

Accessibility tests use the locally installed Google Chrome via Playwright.
