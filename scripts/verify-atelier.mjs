import { chromium } from "playwright";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  page.setDefaultTimeout(45000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.TEST_URL || "http://localhost:4174", {
    waitUntil: "networkidle",
  });
  await page.waitForSelector("#art-key", { state: "attached" });
  assert.equal(await page.evaluate(() => document.visibilityState), "visible");
  await page.locator("#design-open").click();
  await page.locator("[data-material=metal]").click();
  await page.locator("#craft-tab-light").click();
  await page.locator("[data-light=sunset]").click();
  await page.locator("#craft-tab-art").click();
  await page.locator("#art-key").selectOption("Space");
  await page.locator("[data-art=bunny]").click();
  assert.equal(
    await page.locator("#scene-host").getAttribute("data-material"),
    "metal",
  );
  assert.equal(
    await page.locator("#scene-host").getAttribute("data-art-count"),
    "1",
  );
  await page.locator("#open-photo").click();
  await page.waitForSelector(".atelier-dialog[open]");
  await page.waitForTimeout(1800);
  await page.screenshot({ path: "artifacts/v7-photo-metal.png" });
  const download = page.waitForEvent("download");
  await page.locator("#export-photo").click();
  const file = await download;
  await file.saveAs("artifacts/v7-wallpaper.png");
  await page.locator("#photo-format").selectOption("poster");
  const download2 = page.waitForEvent("download");
  await page.locator("#export-photo").click();
  await (await download2).saveAs("artifacts/v7-poster.png");
  const widePng = await readFile("artifacts/v7-wallpaper.png");
  const posterPng = await readFile("artifacts/v7-poster.png");
  assert.deepEqual(
    [widePng.readUInt32BE(16), widePng.readUInt32BE(20)],
    [1920, 1080],
  );
  assert.deepEqual(
    [posterPng.readUInt32BE(16), posterPng.readUInt32BE(20)],
    [1080, 1350],
  );
  await page.locator('[data-photo-view="detail"]').click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "artifacts/v7-key-detail.png" });
  await page.locator("#close-atelier").click();
  assert.equal(
    await page.locator("#scene-host").getAttribute("data-exclusive"),
    null,
  );
  await page.locator("#craft-tab-material").click();
  await page.locator("[data-material=ice]").click();
  await page.locator("#open-photo").click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "artifacts/v7-photo-ice.png" });
  await page.keyboard.press("Escape");
  await page.locator("#craft-tab-art").click();
  await page
    .locator("#art-upload")
    .setInputFiles("public/backgrounds/ocean.jpg");
  await page.waitForFunction(() =>
    document.querySelector("#art-status").textContent.includes("图片已应用"),
  );
  await page.locator("#art-fit").selectOption("cover");
  await page.locator("#inspect-key").click();
  await page.waitForSelector("#switch-canvas[data-rendered=true]");
  assert.match(await page.locator("#micro-selection").textContent(), /Space/);
  await page.locator("#micro-toggle").click();
  await page.waitForFunction(
    () =>
      Number(document.querySelector("#switch-canvas").dataset.spread) < 0.05,
  );
  await page.locator("#switch-canvas").focus();
  await page.keyboard.press("a");
  await page.locator("#micro-toggle").click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: "artifacts/v7-inspect.png" });
  await page.locator("#micro-return").click();
  await page.locator("#replay-assembly").click();
  assert.equal(
    await page.locator("#scene-host").getAttribute("data-assembly"),
    "waiting",
  );
  await page.locator("#start-assembly").click();
  await page.waitForFunction(
    () => !document.querySelector(".atelier-dialog").open,
  );
  assert.equal(
    await page.locator("#scene-host").getAttribute("data-assembly"),
    "complete",
  );
  assert.equal(
    await page.evaluate(() => localStorage.getItem("judy-assembly-seen")),
    "1",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".atelier").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/v7-mobile-atelier.png" });
  await page.locator("#open-photo").click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "artifacts/v7-mobile-photo.png" });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.keyboard.press("Escape");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("#art-key", { state: "attached" });
  assert.equal(
    await page.locator(".atelier-dialog").evaluate((e) => e.open),
    false,
  );
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/v7-atelier-verification.json",
    JSON.stringify({ errors, passed: true }, null, 2),
  );
  console.log("Atelier checks passed");
} finally {
  await browser.close();
}
