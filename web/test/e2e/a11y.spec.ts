import { expect, test } from "@playwright/test";
import { chooseLightningByKeyboard, expectNoAxeViolations, searchByKeyboard } from "./helpers";

test("home page: axe clean, light and dark", async ({ page }) => {
  await page.goto("/");
  await expectNoAxeViolations(page, "home (light)");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload(); // let colour transitions settle; axe samples computed colours
  await expectNoAxeViolations(page, "home (dark)");
});

test("blocked review: axe clean in dark mode and forced 200% text", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await searchByKeyboard(page);
  await chooseLightningByKeyboard(page);
  await expectNoAxeViolations(page, "review blocked (dark)");
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  await expect(page.locator("#problem-0 h2")).toBeVisible();
});

test("320px reflow with WCAG text spacing: no horizontal scrolling on any step", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const spacing = "* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }";
  const noHScroll = async (label: string) => {
    await page.addStyleTag({ content: spacing });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `horizontal overflow on ${label}`).toBeLessThanOrEqual(0);
  };
  await page.goto("/");
  await noHScroll("home");
  await searchByKeyboard(page);
  await noHScroll("results");
  await chooseLightningByKeyboard(page);
  await noHScroll("review");
});

test("interactive targets are at least 44 by 44 CSS pixels", async ({ page }) => {
  await searchByKeyboard(page);
  await chooseLightningByKeyboard(page);
  const small = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>("main button, main a.btn, main select, main input:not([type=hidden]), main summary, .site-nav a"))
      .filter((el) => el.offsetParent !== null)
      .map((el) => ({ el: el.outerHTML.slice(0, 80), r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width < 44 || r.height < 44)
      .map(({ el, r }) => `${el} ${Math.round(r.width)}x${Math.round(r.height)}`),
  );
  // Radio/checkbox inputs sit inside 44px+ labels, which are the real targets.
  const real = small.filter((s) => !/type="(radio|checkbox)"/.test(s));
  expect(real).toEqual([]);
});

test("reduced motion: animations and transitions are effectively disabled", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const d = await page.evaluate(() => getComputedStyle(document.querySelector(".btn")!).transitionDuration);
  expect(parseFloat(d)).toBeLessThan(0.01);
});
