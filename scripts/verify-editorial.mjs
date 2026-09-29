import { chromium } from "playwright";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.addInitScript(() =>
    localStorage.setItem("judy-assembly-seen", "1"),
  );
  await page.goto(process.env.TEST_URL || "http://localhost:4174", {
    waitUntil: "networkidle",
  });
  await page.waitForSelector("#scene-host[data-rendered=true]");
  assert.equal(await page.evaluate(() => document.visibilityState), "visible");
  await page.screenshot({ path: "artifacts/v9-hero.png" });
  console.log("hero");
  await page.evaluate(() =>
    scrollTo({ top: innerHeight * 0.85, behavior: "instant" }),
  );
  await page.waitForFunction(
    () => Number(document.querySelector("#scene-host").dataset.editorial) > 0.6,
  );
  await page.waitForTimeout(800);
  await page.screenshot({ path: "artifacts/v9-hero-whole.png" });
  await page.locator("#object").scrollIntoViewIfNeeded();
  await page.locator("#design-open").click();
  assert.equal(await page.locator("#design-panel").isVisible(), true);
  await page.locator("[data-form=split]").click();
  assert.equal(
    await page.locator("#scene-host").getAttribute("data-form"),
    "split",
  );
  await page.locator("[data-form=classic]").click();
  await page.locator("#design-close").click();
  assert.equal(await page.locator("#design-panel").isVisible(), false);
  await page.locator(".preview").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/v9-studio.png" });
  console.log("drawer");
  const film = await page.locator(".details-film").evaluate((el) => ({
    top: el.getBoundingClientRect().top + scrollY,
    height: el.clientHeight,
  }));
  await page.evaluate(
    (y) => scrollTo({ top: y, behavior: "instant" }),
    film.top - 24,
  );
  await page.waitForSelector("#switch-canvas[data-rendered=true]");
  await page.waitForFunction(
    () =>
      Number(document.querySelector("#switch-canvas").dataset.spread) < 0.08,
  );
  await page.evaluate(
    (y) => scrollTo({ top: y, behavior: "instant" }),
    film.top + film.height - 1000,
  );
  await page.waitForFunction(
    () =>
      Number(document.querySelector("#switch-canvas").dataset.spread) > 0.95,
  );
  await page.screenshot({ path: "artifacts/v9-details.png" });
  await page.locator("[data-part=spring]").click();
  assert.equal(
    await page.locator("#switch-canvas").getAttribute("data-part"),
    "spring",
  );
  await page.locator("#micro-toggle").click();
  await page.waitForFunction(
    () =>
      Number(document.querySelector("#switch-canvas").dataset.spread) < 0.05,
  );
  console.log("anatomy");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: "artifacts/v9-mobile-hero.png" });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.locator("#design-open").click();
  await page.locator("[data-form=alice]").click();
  await page.locator("#design-close").click();
  await page.locator(".anatomy-grid").scrollIntoViewIfNeeded();
  await page.waitForSelector("#switch-canvas[data-rendered=true]");
  await page.screenshot({ path: "artifacts/v9-mobile-details.png" });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/v9-editorial.json",
    JSON.stringify({ passed: true, errors }, null, 2),
  );
  console.log("Editorial scroll, drawer, forms, anatomy and mobile passed");
} finally {
  await browser.close();
}
