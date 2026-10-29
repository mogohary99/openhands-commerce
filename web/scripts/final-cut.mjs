// Final video master: the live-Claude cut with final cards and burned-in captions from
// docs/submission/video-captions.draft.srt. This ffmpeg has no subtitles filter, so each cue is
// rendered as a transparent PNG and overlaid for its time range.
// Optional narration: `npm run video:final -- path/to/narration.m4a` adds it as the audio track.
// Output: docs/video/scenes/final.mp4 (git-ignored).
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const DIR = path.resolve("../docs/video/scenes");
const SRT = path.resolve("../docs/submission/video-captions.draft.srt");
const TMP = path.join(DIR, "final-parts");
mkdirSync(TMP, { recursive: true });
const narration = process.argv[2];
const ff = (args) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" });
const secs = (t) => { const [h, m, rest] = t.split(":"); const [s, ms] = rest.split(","); return +h * 3600 + +m * 60 + +s + +ms / 1000; };

execFileSync("node", ["scripts/rough-cut.mjs"], { stdio: "inherit", env: { ...process.env, FINAL: "1" } });
const base = path.join(DIR, "cut-final-cards.mp4");

const cues = readFileSync(SRT, "utf8").trim().split(/\n\s*\n/).map((block) => {
  const lines = block.split("\n");
  const [a, b] = lines[1].split(" --> ").map(secs);
  return { a, b, text: lines.slice(2).join(" ") };
});

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const pngs = [];
for (const [i, c] of cues.entries()) {
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}
    .cap{position:absolute;left:40px;right:40px;bottom:10px;margin:auto;width:max-content;max-width:1200px;padding:8px 18px;
    background:rgba(0,0,0,.82);color:#fff;font:600 25px/1.3 system-ui,sans-serif;text-align:center;border-radius:6px}</style>
    <div class="cap">${esc(c.text)}</div>`);
  const png = path.join(TMP, `cap-${String(i).padStart(2, "0")}.png`);
  await page.screenshot({ path: png, omitBackground: true });
  pngs.push(png);
}
await browser.close();

const inputs = ["-i", base, ...pngs.flatMap((p) => ["-i", p])];
let chain = "[0:v]";
const filters = cues.map((c, i) => {
  const out = i === cues.length - 1 ? "[v]" : `[v${i}]`;
  const f = `${chain}[${i + 1}:v]overlay=0:0:enable='between(t,${c.a},${c.b})'${out}`;
  chain = out;
  return f;
});
const out = path.join(DIR, "final.mp4");
const audio = narration ? ["-i", path.resolve(narration)] : [];
const maps = narration ? ["-map", "[v]", "-map", `${pngs.length + 1}:a`, "-c:a", "aac", "-b:a", "160k", "-shortest"] : ["-map", "[v]"];
ff([...inputs, ...audio, "-filter_complex", filters.join(";"), ...maps, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-r", "30", out]);
console.log(out, execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out]).toString().trim() + "s", narration ? "(with narration)" : "(silent: add narration with `npm run video:final -- narration.m4a`)");
