// Silent rough cut of the demo video, following docs/submission/video-edit-plan.md.
// Uses only the real scene recordings (npm run video:scenes && npm run video:assemble).
// The buyer's login and Pay at PayPal were not filmed; a card says so instead of staging it.
// Draft cards are labelled DRAFT CARD, so this cut is never mistaken for the final video.
// Output: docs/video/scenes/rough-cut.mp4 (git-ignored). Run: npm run video:roughcut
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const DIR = path.resolve("../docs/video/scenes");
const TMP = path.join(DIR, "rough-cut-parts");
mkdirSync(TMP, { recursive: true });
const ff = (args) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" });

const card = (kind, title, sub) => `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;width:1280px;height:800px;display:flex;flex-direction:column;justify-content:center;align-items:center;
  font:600 54px system-ui,sans-serif;text-align:center;padding:0 80px;box-sizing:border-box;
  background:${kind === "placeholder" ? "#4a4a4a" : "#0f2a44"};color:#fff}
  p{font:400 30px system-ui,sans-serif;max-width:1050px;line-height:1.35;margin:28px 0 0}
  .tag{font:700 26px system-ui;letter-spacing:.08em;border:3px solid #fff;padding:6px 18px;margin-bottom:36px}</style>
  ${kind === "placeholder" ? '<div class="tag">PLACEHOLDER: NOT FINAL FOOTAGE</div>' : kind === "tomake" ? '<div class="tag">DRAFT CARD</div>' : kind === "notfilmed" ? '<div class="tag">NOT FILMED</div>' : ""}
  <div>${title}</div><p>${sub}</p>`;

// [out-seconds, source]: a clip is {file, from, to}; a slate is {card:[kind,title,sub], secs}.
const timeline = [
  { file: "2-cold-open-blocked.mp4", from: 0, to: 7 },
  { file: "1-signature-moment.mp4", from: 17, to: 23 },
  { card: ["tomake", "OpenHands Commerce: catches the mistake before you pay.", "Fictional demo store · PayPal Sandbox · no real money"], secs: 7 },
  { file: "1-signature-moment.mp4", from: 0, to: 14 },
  { file: "1-signature-moment.mp4", from: 14, to: 34 },
  { card: ["tomake", "AI explains → server decides → you approve → PayPal confirms", "The server prices every item from the catalog. AI has no tools and can't touch money."], secs: 16 },
  // The real approval at PayPal Sandbox (2026-10-29) wasn't filmed. Show the real redirect to
  // PayPal from the cancel take, say plainly what is missing, then the real receipt of that payment.
  { file: "3-cancel-nothing-charged.mp4", from: 11.5, to: 16.5 },
  { card: ["notfilmed", "At PayPal Sandbox, the buyer logs in and presses Pay.", "That step wasn't filmed. Next: the real receipt for that payment, PayPal order 6DB70558VY7613132 (sandbox, test money)."], secs: 6 },
  { file: "6-receipt-verified.mp4", from: 0, to: 15 }, // the take then scrolls back up for a full-page screenshot; stop before it
  { file: "3-cancel-nothing-charged.mp4", from: 15, to: 19 },
  { file: "4-forced-colours.mp4", from: 8, to: 13 },
  { file: "5-zoom-400.mp4", from: 0, to: 7 },
  { card: ["tomake", "OpenHands Commerce", "The AI explains, the server decides, and you stay in control. · PayPal Sandbox · fictional store"], secs: 24 },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const parts = [];
for (const [i, row] of timeline.entries()) {
  const out = path.join(TMP, `${String(i).padStart(2, "0")}.mp4`);
  if (row.card) {
    await page.setContent(card(...row.card));
    const png = out.replace(/\.mp4$/, ".png");
    await page.screenshot({ path: png });
    ff(["-loop", "1", "-i", png, "-t", String(row.secs), "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", out]);
  } else {
    ff(["-ss", String(row.from), "-to", String(row.to), "-i", path.join(DIR, row.file), "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", out]);
  }
  parts.push(out);
}
await browser.close();
const list = path.join(TMP, "list.txt");
writeFileSync(list, parts.map((p) => `file '${p}'`).join("\n"));
const final = path.join(DIR, "rough-cut.mp4");
ff(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", final]);
console.log(final, execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", final]).toString().trim() + "s");
