import { chromium } from "playwright";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({ headless: true });
const errors = [],
  words = [],
  checks = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  page.setDefaultTimeout(45000);
  page.on("pageerror", (e) => errors.push(e.message));
  const requests = [];
  page.on("request", (r) => {
    if (r.url().includes("/backgrounds/") && r.url().endsWith(".mp4"))
      requests.push(r.url());
  });
  await page.goto(process.env.TEST_URL || "http://localhost:4174", {
    waitUntil: "networkidle",
  });
  assert.equal(await page.evaluate(() => document.visibilityState), "visible");
  await page.waitForSelector('#scene-host[data-rendered="true"]');
  assert.equal(await page.locator("#lab-sound").inputValue(), "bubble");
  assert.equal(await page.locator("#immersive-voice").inputValue(), "bubble");
  assert.equal(
    await page.locator('[data-sound="bubble"]').getAttribute("aria-pressed"),
    "true",
  );
  assert.equal(requests.length, 0);
  await page.locator('[data-sound="glass"]').click();
  await page.waitForFunction(
    () =>
      document.querySelector("#sound-toggle").getAttribute("aria-pressed") ===
      "true",
  );
  assert.equal(await page.locator("#lab-sound").inputValue(), "glass");
  await page.locator('[data-sound="bubble"]').click();
  await page.locator("#top").scrollIntoViewIfNeeded();
  for (let i = 0; i < 4; i++) {
    await page.locator("#hero-demo").click();
    await page.waitForFunction(
      () =>
        document.querySelector("#demo-word").textContent ===
        document.querySelector("#hero-demo").dataset.word,
    );
    words.push(await page.locator("#demo-word").textContent());
    if (i === 0) await page.screenshot({ path: "artifacts/v6-hero-demo.png" });
    await page.waitForFunction(
      () => !document.querySelector("#hero-demo").disabled,
    );
  }
  assert.equal(new Set(words).size, 4);
  assert.equal(await page.locator("#stroke-count").innerText(), "0");
  await page.locator("#hero-immersive").click();
  await page.waitForSelector("#scene-host.in-immersive");
  assert.equal(
    requests.length,
    0,
    "reduced motion uses photographic poster without video download",
  );
  assert.equal(
    await page.locator("#background-motion").getAttribute("aria-pressed"),
    "false",
  );
  await page.locator("#background-motion").focus();
  await page.locator("#background-motion").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#immersive").dataset.sceneryState === "playing",
  );
  const ids = await page
    .locator("[data-atmosphere-choice]")
    .evaluateAll((es) => es.map((e) => e.dataset.atmosphereChoice));
  assert.equal(ids.length, 10);
  async function gallery() {
    await page.locator("#landscape-open").focus();
    await page.locator("#landscape-open").click();
  }
  await gallery();
  await page.screenshot({ path: "artifacts/v6-landscape-gallery.png" });
  await page.locator("#music-open").click();
  assert.ok(await page.locator("#landscape-library").isHidden());
  assert.ok(await page.locator("#music-library").isVisible());
  await page.locator("#music-close").click();
  for (const id of ids) {
    await gallery();
    await page.locator(`[data-atmosphere-choice="${id}"]`).click();
    await page.waitForFunction((id) => {
      const v = document.querySelector("#scenery video.visible");
      return (
        document.querySelector("#immersive").dataset.sceneryState ===
          "playing" &&
        v?.dataset.scene === id &&
        !v.paused &&
        v.currentTime > 0.2
      );
    }, id);
    await page.keyboard.down("a");
    assert.match(
      await page.locator("#scene-host").getAttribute("data-pressed"),
      /KeyA/,
    );
    await page.keyboard.up("a");
    const video = page.locator("#scenery video.visible");
    const sample = () =>
      video.evaluate((v) => {
        const c = document.createElement("canvas");
        c.width = 160;
        c.height = 90;
        const ctx = c.getContext("2d");
        ctx.drawImage(v, 0, 0, 160, 90);
        return {
          time: v.currentTime,
          src: v.currentSrc,
          width: v.videoWidth,
          pixels: Array.from(ctx.getImageData(0, 0, 160, 90).data),
        };
      });
    const a = await sample();
    await page.waitForTimeout(650);
    const b = await sample();
    const difference =
      b.pixels.reduce((n, v, i) => n + Math.abs(v - a.pixels[i]), 0) /
      b.pixels.length;
    assert.ok(
      a.width >= 1000 && difference > 0.02,
      `${id}: actual frames differ ${difference}`,
    );
    assert.notEqual(a.time, b.time);
    checks.push({ id, width: a.width, difference });
    await page.screenshot({ path: `artifacts/v6-scene-${id}.png` });
  }
  await page.locator("#background-motion").focus();
  await page.locator("#background-motion").focus();
  await page.locator("#background-motion").click();
  const paused = await page
    .locator("#scenery video.visible")
    .evaluate((v) => v.currentTime);
  await page.waitForTimeout(400);
  assert.equal(
    await page.locator("#scenery video.visible").evaluate((v) => v.currentTime),
    paused,
  );
  await page.locator("#background-motion").focus();
  await page.locator("#background-motion").click();
  await page.route("**/backgrounds/aurora.mp4", (route) => route.abort());
  await gallery();
  await page.locator('[data-atmosphere-choice="aurora"]').click();
  await page.waitForFunction(
    () =>
      document.querySelector("#immersive").dataset.sceneryState === "fallback",
  );
  assert.equal(await page.locator("#scenery video.visible").count(), 0);
  await page.unroute("**/backgrounds/aurora.mp4");
  await page.locator("#background-motion").focus();
  await page.locator("#background-motion").click();
  await page.waitForFunction(
    () =>
      document.querySelector("#immersive").dataset.sceneryState === "playing",
  );
  await page.locator("#exit-immersive").focus();
  await page.locator("#exit-immersive").click();
  assert.ok(
    await page
      .locator("#scenery video")
      .evaluateAll((vs) => vs.every((v) => v.paused)),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#top").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/v6-mobile-hero.png" });
  await page.locator("#hero-immersive").click();
  await gallery();
  await page.screenshot({ path: "artifacts/v6-mobile-gallery.png" });
  await page.locator('[data-atmosphere-choice="snow"]').click();
  await page.waitForFunction(
    () =>
      document.querySelector("#scenery video.visible")?.dataset.scene ===
      "snow",
  );
  await page.locator("#landscape-open").focus();
  await page.screenshot({ path: "artifacts/v6-mobile-room.png" });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.locator("#exit-immersive").click();
  assert.ok(
    await page
      .locator("#scenery video")
      .evaluateAll((vs) => vs.every((v) => v.paused)),
  );
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/v6-scenery-verification.json",
    JSON.stringify({ passed: true, words, checks, errors }, null, 2),
  );
  console.log(JSON.stringify({ passed: true, words, checks, errors }));
} finally {
  await browser.close();
  console.log("Headless browser closed.");
}
