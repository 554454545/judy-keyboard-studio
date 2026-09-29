import { chromium } from "playwright";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "no-preference",
  });
  await page.addInitScript(() => localStorage.setItem("judy-assembly-seen", "1"));
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.TEST_URL || "http://localhost:4173", {
    waitUntil: "domcontentloaded",
  });
  assert.equal(await page.evaluate(() => document.visibilityState), "visible");
  assert.match(
    await page
      .locator(".hero-copy h1 span")
      .evaluate((e) => getComputedStyle(e).animationName),
    /enter-copy/,
  );
  await page.waitForSelector('#scene-host[data-rendered="true"]');
  await page.waitForTimeout(1800);
  await page.screenshot({ path: "artifacts/v5-hero.png" });
  await page.locator("#hero-demo").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#demo-word").textContent ===
      document.querySelector("#hero-demo").dataset.word,
  );
  await page.screenshot({ path: "artifacts/v5-bunny.png" });
  await page.waitForFunction(
    () => !document.querySelector("#hero-demo").disabled,
  );
  assert.match(
    await page.locator("#demo-announcement").textContent(),
    /节奏演示完成/,
  );
  await page.waitForTimeout(1200);
  assert.equal(
    await page
      .locator("#demo-word")
      .evaluate((e) => getComputedStyle(e).opacity),
    "0",
  );
  await page.locator("#details").scrollIntoViewIfNeeded();
  await page.waitForSelector('#switch-canvas[data-rendered="true"]');
  await page.locator("#specimen").scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  const before = await page
    .locator("#switch-canvas")
    .getAttribute("data-frame");
  await page
    .locator("#specimen")
    .screenshot({ path: "artifacts/v5-reactor.png" });
  await page.waitForTimeout(800);
  assert.ok(
    Number(await page.locator("#switch-canvas").getAttribute("data-frame")) >
      Number(before),
  );
  await page.locator("#explode").fill("0");
  await page.waitForTimeout(600);
  await page
    .locator("#specimen")
    .screenshot({ path: "artifacts/v5-reactor-closed.png" });
  await page.locator("#explode").fill("100");
  await page.locator("#detail-strike").click();
  await page.locator("#play").scrollIntoViewIfNeeded();
  await page.locator("#lab-effect").selectOption("sparks");
  assert.equal(await page.locator("#immersive-effect").inputValue(), "sparks");
  await page.locator("#enter-immersive").click();
  await page.waitForSelector('#scene-host.in-immersive[data-rendered="true"]');
  for (const mode of ["ripple", "sparks", "beam", "none"]) {
    await page.mouse.move(700, 900);
    await page.locator("#immersive-effect").selectOption(mode);
    assert.equal(await page.locator("#lab-effect").inputValue(), mode);
    assert.equal(
      await page.locator("#scene-host").getAttribute("data-effect"),
      mode,
    );
    await page.keyboard.down("a");
    assert.match(
      await page.locator("#scene-host").getAttribute("data-pressed"),
      /KeyA/,
    );
    if (mode === "beam")
      await page.screenshot({ path: `artifacts/v5-effect-${mode}.png` });
    await page.keyboard.up("a");
  }
  await page.keyboard.press("Escape");
  await page.waitForSelector("#immersive", { state: "hidden" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#details").scrollIntoViewIfNeeded();
  await page
    .locator("#specimen")
    .screenshot({ path: "artifacts/v5-mobile-reactor.png" });
  await page.locator("#hero-immersive").click();
  await page.mouse.move(200, 700);
  await page.locator("#immersive-effect").focus();
  await page.screenshot({ path: "artifacts/v5-mobile-room.png" });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("#specimen").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const frame = await page.locator("#switch-canvas").getAttribute("data-frame");
  await page.waitForTimeout(500);
  assert.equal(
    await page.locator("#switch-canvas").getAttribute("data-frame"),
    frame,
  );
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/v5-verification.json",
    JSON.stringify({ passed: true, errors }, null, 2),
  );
  console.log(JSON.stringify({ passed: true, errors }));
} finally {
  await browser.close();
  console.log("Headless browser closed.");
}
