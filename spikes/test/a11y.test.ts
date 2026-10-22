import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { AxeBuilder } from "@axe-core/playwright";
import { type Browser, chromium, type Page } from "playwright-core";

// Automated checks only. They do not replace testing with screen-reader, switch
// and voice-control users (see research/accessibility-findings.md).
const URL_ = new URL("../a11y/review.html", import.meta.url).href;
let browser: Browser;
before(async () => (browser = await chromium.launch({ channel: "chrome", headless: true })));
after(async () => browser?.close());

async function open(opts: Parameters<Browser["newContext"]>[0] = {}): Promise<Page> {
  const page = await (await browser.newContext(opts)).newPage();
  await page.goto(URL_);
  return page;
}
const axe = (page: Page) => new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]).analyze();

for (const colorScheme of ["light", "dark"] as const) {
  test(`axe WCAG 2.2 AA: no violations before and after the fix (${colorScheme})`, async () => {
    const page = await open({ colorScheme });
    const pre = await axe(page);
    assert.deepEqual(pre.violations.map((v) => `${v.id}: ${v.nodes.length}`), []);
    await page.click("#fix");
    const post = await axe(page);
    assert.deepEqual(post.violations.map((v) => `${v.id}: ${v.nodes.length}`), []);
    console.log(`${colorScheme}: passes=${post.passes.length} incomplete(needs manual review)=${post.incomplete.map((i) => i.id).join(",") || "none"}`);
    await page.close();
  });
}

test("keyboard only: blocked approve is refused, fix is reachable, approve then works", async () => {
  const page = await open();
  const focused = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
  const tabs: string[] = [];
  for (let i = 0; i < 4; i++) { await page.keyboard.press("Tab"); tabs.push(String(await focused())); }
  assert.deepEqual(tabs, ["A", "fix", "approve", "cancel"]); // skip link, fix, approve, cancel

  await page.keyboard.press("Shift+Tab"); // back to approve
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => document.body.dataset.approved), undefined, "blocked approve must not proceed");
  assert.equal(await focused(), "fix", "focus is sent to the fix");
  assert.match(await page.textContent("#status") ?? "", /can't pay yet/);

  await page.keyboard.press("Enter"); // apply fix
  assert.equal(await focused(), "approve");
  assert.match(await page.textContent("#status") ?? "", /now matches/);
  assert.equal(await page.getAttribute("#finding", "role"), "region", "resolved warning is no longer an alert");
  await page.keyboard.press("Space");
  assert.equal(await page.evaluate(() => document.body.dataset.approved), "true");
  await page.close();
});

test("approve button accessible name contains its visible label (2.5.3) and is described by help text", async () => {
  const page = await open();
  const snap = await page.locator("#approve").ariaSnapshot();
  assert.match(snap, /button "Approve and pay \$40\.62 with PayPal"/);
  assert.equal(await page.getAttribute("#approve", "aria-describedby"), "approve-help");
  await page.close();
});

test("targets are at least 44x44 CSS px", async () => {
  const page = await open();
  const sizes = await page.$$eval("button", (bs) => bs.map((b) => { const r = b.getBoundingClientRect(); return { id: b.id, w: r.width, h: r.height }; }));
  for (const s of sizes) assert.ok(s.w >= 44 && s.h >= 44, `${s.id} is ${s.w}x${s.h}`);
  await page.close();
});

test("reflow at 320 CSS px and WCAG text-spacing override: no horizontal scroll, no clipping", async () => {
  const page = await open({ viewport: { width: 320, height: 640 } });
  await page.addStyleTag({ content: "* { line-height:1.5 !important; letter-spacing:.12em !important; word-spacing:.16em !important; } p { margin-bottom: 2em !important; }" });
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  assert.ok(sw <= cw, `scrollWidth ${sw} > clientWidth ${cw}`);
  await page.close();
});

test("reduced motion: no transitions when user prefers reduced motion", async () => {
  const page = await open({ reducedMotion: "reduce" });
  const t = await page.$eval("#finding", (el) => getComputedStyle(el).transitionDuration);
  assert.equal(t, "0s");
  await page.close();
});

test("negative control: axe does detect injected violations (guards against a vacuous pass)", async () => {
  const page = await open();
  await page.evaluate(() => {
    document.documentElement.removeAttribute("lang");
    document.getElementById("approve")!.textContent = "";
    const p = document.createElement("p"); p.textContent = "faint"; p.style.color = "#ddd"; document.querySelector("main")!.append(p);
  });
  const ids = (await axe(page)).violations.map((v) => v.id).sort();
  assert.deepEqual(ids, ["button-name", "color-contrast", "html-has-lang"]);
  await page.close();
});
