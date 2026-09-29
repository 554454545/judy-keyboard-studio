import { chromium } from "playwright";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "no-preference",
  });
  page.setDefaultTimeout(45000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.TEST_URL || "http://localhost:4174", {
    waitUntil: "networkidle",
  });
  await page.waitForSelector(".atelier-dialog[open][data-mode=intro]");
  await page.waitForSelector("#scene-host[data-rendered=true]");
  await page.screenshot({ path: "artifacts/v7-first-key.png" });
  await page.keyboard.press("j");
  await page.waitForFunction(
    () => document.querySelector("#scene-host").dataset.assembly === "running",
  );
  await page.waitForTimeout(800);
  await page.screenshot({ path: "artifacts/v7-assembling.png" });
  await page.waitForFunction(
    () => !document.querySelector(".atelier-dialog").open,
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("#art-key", { state: "attached" });
  assert.equal(
    await page.locator(".atelier-dialog").evaluate((e) => e.open),
    false,
  );
  await page.locator("#design-open").click();
  await page.locator("#replay-assembly").click();
  await page.locator("#skip-assembly").click();
  assert.equal(
    await page.locator("#scene-host").getAttribute("data-assembly"),
    "complete",
  );
  await page.locator("#craft-tab-art").click();
  await page.locator("#art-key").selectOption("Escape");
  await page.locator("[data-art=orbit]").click();
  await page.locator("#art-key").selectOption("Space");
  await page.locator("#art-text").fill("BunnyJudy");
  await page.locator("#art-text").press("End");
  await page.locator("#art-text").press("!");
  assert.equal(
    await page.locator("#scene-host").getAttribute("data-art-count"),
    "2",
  );
  await page.locator("#art-upload").setInputFiles({
    name: "bad.png",
    mimeType: "image/png",
    buffer: Buffer.from("not an image"),
  });
  await page.waitForFunction(() =>
    document.querySelector("#art-status").textContent.includes("无法读取"),
  );
  await page.locator("#art-clear").click();
  assert.equal(
    await page.locator("#scene-host").getAttribute("data-art-count"),
    "1",
  );
  for (const material of ["smoke", "cream", "metal", "ice", "original"]) {
    await page.locator("#craft-tab-material").click();
    await page.locator(`[data-material=${material}]`).click();
    assert.equal(
      await page.locator("#scene-host").getAttribute("data-material"),
      material,
    );
  }
  await page
    .locator(".atelier")
    .screenshot({ path: "artifacts/v7-craft-materials.png" });
  await page.locator("#craft-tab-light").click();
  await page.locator("#light-pad").focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.locator("#light-angle").inputValue(), "-20");
  await page.locator("#craft-tab-art").click();
  await page.locator("#art-pick").click();
  assert.match(
    await page.locator("#scene-host").getAttribute("class"),
    /selecting-key/,
  );
  await page.keyboard.press("Escape");
  assert.doesNotMatch(
    await page.locator("#scene-host").getAttribute("class"),
    /selecting-key/,
  );
  await page.locator("#art-pick").click();
  const box = await page.locator("#scene-host").boundingBox();
  for (const [x, y] of [
    [0.5, 0.5],
    [0.45, 0.55],
    [0.55, 0.45],
    [0.4, 0.6],
  ]) {
    if (
      !(await page.locator("#scene-host").getAttribute("class")).includes(
        "selecting-key",
      )
    )
      break;
    await page.mouse.click(box.x + box.width * x, box.y + box.height * y);
  }
  assert.doesNotMatch(
    await page.locator("#scene-host").getAttribute("class"),
    /selecting-key/,
  );
  await page.locator("#scene-host").focus();
  await page.keyboard.press("a");
  assert.equal(await page.locator("#warmth-toggle").count(), 0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#replay-assembly").click();
  await page.screenshot({ path: "artifacts/v7-mobile-intro.png" });
  await page.locator("#start-assembly").click();
  await page.waitForFunction(
    () => !document.querySelector(".atelier-dialog").open,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/v7-opening-verification.json",
    JSON.stringify({ errors, passed: true }, null, 2),
  );
  console.log(
    "Opening, material pairing, and invalid image checks passed",
  );
} finally {
  await browser.close();
}
