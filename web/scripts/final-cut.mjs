// Final video master: the live-Claude cut with final cards and burned-in captions from
// docs/submission/video-captions.en.srt. This ffmpeg has no subtitles filter, so each cue is
// rendered as a transparent PNG and overlaid for its time range.
// Optional narration: `npm run video:final -- path/to/narration.m4a` adds it as the audio track.
// Output: docs/video/scenes/final.mp4 (git-ignored).
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const DIR = path.resolve("../docs/video/scenes");
const SRT = path.resolve("../docs/submission/video-captions.en.srt");
const TMP = path.join(DIR, "final-parts");
mkdirSync(TMP, { recursive: true });
const narration = process.argv[2] && path.resolve(process.env.INIT_CWD ?? ".", process.argv[2]);
const ff = (args) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: "inherit" });
const secs = (t) => { const [h, m, rest] = t.split(":"); const [s, ms] = rest.split(","); return +h * 3600 + +m * 60 + +s + +ms / 1000; };

execFileSync("node", ["scripts/rough-cut.mjs"], { stdio: "inherit", env: { ...process.env, FINAL: "1" } });
const base = path.join(DIR, "cut-final-cards.mp4");

const cues = readFileSync(SRT, "utf8").trim().split(/\n\s*\n/).map((block) => {
  const lines = block.split("\n");
  const [a, b] = lines[1].split(" --> ").map(secs);
  return { a, b, text: lines.slice(2).join(" ") };
});

// Narration prompter next to the master: open it in a browser, start recording, press Start.
writeFileSync(path.join(DIR, "prompter.html"), `<!doctype html><meta charset="utf-8"><title>Narration prompter</title>
<style>body{margin:0;background:#111;color:#fff;font:600 34px/1.35 system-ui,sans-serif}main{max-width:1100px;margin:auto;padding:24px}
video{width:100%;max-height:52vh;background:#000}#now{min-height:3.2em;margin:18px 0 8px}#next{color:#aaa;font-size:24px;min-height:2.6em}
button{font:inherit;font-size:24px;padding:10px 24px}#t{color:#aaa;font-size:20px}</style>
<main><video id="v" src="final.mp4" muted playsinline></video><p id="now">Start your audio recording (QuickTime: File → New Audio Recording → ●), then press Start. Read each line as it appears.</p>
<p id="next"></p><button id="go">Start</button> <span id="t"></span></main>
<script>const cues=${JSON.stringify(cues)};const v=document.getElementById("v"),now=document.getElementById("now"),next=document.getElementById("next"),t=document.getElementById("t");
document.getElementById("go").onclick=()=>{let n=3;const tick=()=>{if(n>0){now.textContent="Starting in "+n--+"…";setTimeout(tick,1000)}else{v.currentTime=0;v.play()}};tick()};
v.ontimeupdate=()=>{const s=v.currentTime,i=cues.findIndex(c=>s>=c.a&&s<c.b),j=cues.findIndex(c=>c.a>s);now.textContent=i>=0?cues[i].text:"(pause)";next.textContent=j>=0?"Next: "+cues[j].text:"";t.textContent=s.toFixed(1)+" s"};
v.onended=()=>{now.textContent="Done. Stop the recording and save it as narration.m4a."};</script>`);

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
const audio = narration ? ["-i", narration] : [];
// Narration: drop the silence before the first word (the prompter's first line is at 0:00),
// level it to YouTube's loudness (-14 LUFS), and pad it so the video is never cut short.
if (narration) filters.push(`[${pngs.length + 1}:a]silenceremove=start_periods=1:start_threshold=-45dB,loudnorm=I=-14:TP=-1.5:LRA=11,apad[a]`);
const maps = narration ? ["-map", "[v]", "-map", "[a]", "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-shortest"] : ["-map", "[v]"];
ff([...inputs, ...audio, "-filter_complex", filters.join(";"), ...maps, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-r", "30", "-movflags", "+faststart", out]);
console.log(out, execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out]).toString().trim() + "s", narration ? "(with narration)" : "(silent: add narration with `npm run video:final -- narration.m4a`)");
