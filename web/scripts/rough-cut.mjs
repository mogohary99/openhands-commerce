// Silent rough cut of the demo video, following docs/submission/video-edit-plan.md.
// Uses only the real scene recordings (npm run video:scenes && npm run video:assemble).
// Rows that need the owner's real purchase recording become grey slates that say
// PLACEHOLDER, so this cut can never be mistaken for, or uploaded as, the final video.
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
  ${kind === "placeholder" ? '<div class="tag">PLACEHOLDER: NOT FINAL FOOTAGE</div>' : kind === "tomake" ? '<div class="tag">DRAFT CARD</div>' : ""}
  <div>${title}</div><p>${sub}</p>`;

// [out-seconds, source]: a clip is {file, from, to}; a slate is {card:[kind,title,sub], secs}.
const timeline = [
  { file: "2-cold-open-blocked.mp4", from: 0, to: 7 },
  { file: "1-signature-moment.mp4", from: 17, to: 23 },
  { card: ["tomake", "OpenHands Commerce: catches the mistake before you pay.", "Fictional demo store · PayPal Sandbox · no real money"], secs: 7 },
  { file: "1-signature-moment.mp4", from: 0, to: 14 },
  { file: "1-signature-moment.mp4", from: 14, to: 34 },
  { card: ["tomake", "AI explains → server decides → you approve → PayPal confirms", "The server prices every item from the catalog. AI has no tools and can't touch money."], secs: 16 },
  { card: ["placeholder", "Owner's real PayPal Sandbox purchase", "1:10–1:35: approve, PayPal Sandbox login (email blurred), Pay. Screen recording made during npm run purchase:manual."], secs: 25 },
  { card: ["placeholder", "Owner's real verified receipt", "1:35–1:55: “Payment complete: $40.62”, “How this payment was checked”, order and capture IDs. Only from a COMPLETED capture."], secs: 20 },
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
