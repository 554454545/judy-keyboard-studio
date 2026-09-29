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
  await page.addInitScript(() => {
    localStorage.setItem("judy-assembly-seen", "1");
    window.portalStops = 0;
    const stop = AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.stop = function (...a) {
      window.portalStops++;
      return stop.apply(this, a);
    };
  });
  await page.goto(process.env.TEST_URL || "http://localhost:4174", {
    waitUntil: "networkidle",
  });
  await page.locator("#design-open").click();
  await page.locator("#craft-tab-world").click();
  await page.locator("#gravity-toggle").click();
  await page.locator("#scene-host").focus();
  await page.keyboard.down("Space");
  await page.waitForTimeout(2500);
  await page
    .locator("#preview-slot")
    .screenshot({ path: "artifacts/v8-gravity.png" });
  await page.keyboard.up("Space");
  const box = await page.locator("#scene-host").boundingBox();
  await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.55);
  await page.waitForTimeout(800);
  await page.locator("#gravity-toggle").click();
  await page.waitForTimeout(1200);
  assert.equal(
    await page.locator("#scene-host").getAttribute("data-floating"),
    "false",
  );
  await page.locator("#portal-hold").scrollIntoViewIfNeeded();
  const gate = await page.locator("#portal-hold").boundingBox();
  await page.mouse.move(gate.x + gate.width / 2, gate.y + gate.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.up();
  assert.equal(await page.locator("#immersive").isVisible(), false);
  assert.ok(await page.evaluate(() => window.portalStops > 0));
  await page.locator("#enter-immersive").click();
  await page.locator("#landscape-open").focus();
  await page.locator("#landscape-open").click();
  await page.locator("[data-atmosphere-choice=snow]").click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "artifacts/v8-contact-snow.png" });
  await page.keyboard.press("g");
  assert.equal(
    await page.locator("#scene-host").getAttribute("data-contact"),
    "snow",
  );
  await page.locator("#background-motion").focus();
  await page.locator("#background-motion").click();
  assert.equal(
    await page.locator("#background-motion").getAttribute("aria-pressed"),
    "false",
  );
  await page.locator("#exit-immersive").focus();
  await page.locator("#exit-immersive").click();
  assert.equal(
    await page.locator("#scene-host").getAttribute("data-contact"),
    "none",
  );
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/v8-wonder-motion.json",
    JSON.stringify({ passed: true, errors }, null, 2),
  );
  console.log(
    "Gravity motion, portal audio cancellation, snow contact, pause and exit passed",
  );
} finally {
  await browser.close();
}
