// Captures the signature flow for docs and the Devpost gallery.
// Usage: start the app (npm start), then: node scripts/screenshots.mjs [baseUrl] [outDir]
// Uses only the demo catalog; it stops before PayPal so no order is created.
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = process.argv[3] ?? "../docs/screenshots";
const QUERY = "My phone uses USB-C. I need a charger with a cable, forty-five dollars all in.";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
for (const scheme of ["light", "dark"]) {
  for (const [label, viewport] of [["desktop", { width: 1280, height: 800 }], ["mobile", { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport, colorScheme: scheme, deviceScaleFactor: 2, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    const shot = (name) => page.screenshot({ path: `${OUT}/${name}-${label}-${scheme}.png`, fullPage: label === "mobile" });
    await page.goto(BASE + "/");
    await shot("1-home");
    await page.fill("#q", QUERY);
    await page.getByRole("button", { name: "Find options" }).click();
    await page.locator("#results-title").waitFor();
    await page.locator("#results").scrollIntoViewIfNeeded();
    await shot("2-results");
    await page.locator("#opt-v-charger-30w-bundle-l").check();
    await page.locator("#opt-v-charger-30w-bundle-l").locator("xpath=ancestor::form").getByRole("button", { name: /Add to order/ }).click();
    await page.waitForURL("**/review");
    await page.locator("#problem-0").waitFor();
    await shot("3-blocked");
    await page.getByRole("button", { name: /Switch to the USB-C/ }).click();
    await page.locator("#fixed-panel").waitFor();
    await shot("4-fixed");
    await ctx.close();
  }
}
await browser.close();
console.log("saved to", OUT);
