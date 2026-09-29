import { chromium } from "playwright";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(process.env.TEST_URL || "http://localhost:4174", {
    waitUntil: "networkidle",
  });
  await page.locator("#design-open").click();
  await page.waitForSelector("#craft-tab-world");
  assert.equal(await page.evaluate(() => document.visibilityState), "visible");
  await page.locator("#craft-tab-art").click();
  await page.locator("#art-key").selectOption("KeyG");
  assert.equal(
    await page.locator("#scene-host").getAttribute("data-selected-key"),
    "KeyG",
  );
  await page
    .locator("#preview-slot")
    .screenshot({ path: "artifacts/v8-selected-key.png" });
  await page.locator("#craft-tab-world").click();
  for (const name of ["station", "moon", "jelly", "garden"]) {
    await page.locator(`[data-world=${name}]`).click();
    await page.locator("#world-closeup").click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `artifacts/v8-world-${name}.png` });
    assert.equal(
      await page.locator("#scene-host").getAttribute("data-world"),
      name,
    );
    await page.locator("#close-atelier").click();
  }
  await page.locator("[data-world=none]").click();
  await page.locator("#gravity-toggle").click();
  assert.equal(
    await page.locator("#scene-host").getAttribute("data-floating"),
    "true",
  );
  await page.locator("#scene-host").focus();
  await page.keyboard.down("Space");
  assert.equal(
    await page.locator("#scene-host").getAttribute("data-attracting"),
    "true",
  );
  await page
    .locator("#preview-slot")
    .screenshot({ path: "artifacts/v8-gravity.png" });
  await page.keyboard.up("Space");
  await page.locator("#gravity-toggle").click();
  assert.equal(
    await page.locator("#scene-host").getAttribute("data-floating"),
    "false",
  );
  await page.locator("#portal-hold").scrollIntoViewIfNeeded();
  const portal = await page.locator("#portal-hold").boundingBox();
  await page.mouse.move(
    portal.x + portal.width / 2,
    portal.y + portal.height / 2,
  );
  await page.mouse.down();
  await page.waitForTimeout(150);
  await page.mouse.up();
  assert.equal(await page.locator("#immersive").isVisible(), false);
  await page.mouse.down();
  await page.waitForSelector("#immersive:not([hidden])");
  await page.mouse.up();
  assert.equal(
    await page.locator("#scene-host").getAttribute("data-contact"),
    "aurora",
  );
  for (const name of ["paper", "snow", "ocean", "fire"]) {
    await page.locator("#landscape-open").focus();
    await page.locator("#landscape-open").click();
    await page.locator(`[data-atmosphere-choice=${name}]`).click();
    await page.waitForTimeout(400);
    assert.equal(
      await page.locator("#scene-host").getAttribute("data-contact"),
      name,
    );
    await page.screenshot({ path: `artifacts/v8-contact-${name}.png` });
  }
  await page.locator("#weather-toggle").focus();
  await page.locator("#weather-toggle").click();
  assert.equal(
    await page.locator("#scene-host").getAttribute("data-contact"),
    "none",
  );
  await page.locator("#exit-immersive").click();
  assert.equal(
    await page.locator("#scene-host").getAttribute("data-contact"),
    "none",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#craft-tab-world").click();
  await page.locator("[data-world=garden]").click();
  await page.locator("#world-closeup").click();
  await page.screenshot({ path: "artifacts/v8-mobile-world.png" });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.locator("#close-atelier").click();
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/v8-wonders-verification.json",
    JSON.stringify({ passed: true, errors }, null, 2),
  );
  console.log(
    "Worlds, selection, gravity, portal cancellation/entry, and environment checks passed",
  );
} finally {
  await browser.close();
}
