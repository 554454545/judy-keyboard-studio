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
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.TEST_URL || "http://localhost:4174", {
    waitUntil: "networkidle",
  });
  await page.waitForSelector('#scene-host[data-rendered="true"]');
  const color = await page
    .locator("body")
    .evaluate((e) => getComputedStyle(e).backgroundColor);
  assert.equal(color, "rgb(10, 13, 16)");
  await page.screenshot({ path: "artifacts/v4-hero.png" });
  await page.locator("#hero-demo").click();
  await page.waitForFunction(
    () => !document.querySelector("#hero-demo").disabled,
  );
  assert.equal(
    await page.locator("#sound-toggle").getAttribute("aria-pressed"),
    "true",
  );
  await page.locator("#object").scrollIntoViewIfNeeded();
  await page.locator("#design-open").click();
  assert.equal(await page.locator("button[data-palette]:visible").count(), 6);
  const before = (await page.locator(".palette-browser").boundingBox()).height;
  for (let i = 0; i < 3; i++) await page.locator("#palette-next").click();
  assert.equal(await page.locator("button[data-palette]:visible").count(), 4);
  assert.ok(await page.locator("#palette-next").isDisabled());
  assert.ok(
    Math.abs(
      (await page.locator(".palette-browser").boundingBox()).height - before,
    ) < 15,
  );
  await page.locator('[data-palette-filter="dark"]').click();
  assert.equal(await page.locator("button[data-palette]:visible").count(), 6);
  await page.locator('button[data-palette="noir"]').click();
  await page.locator('[data-palette-filter="all"]').click();
  assert.equal(await page.locator("button[data-sound]").count(), 12);
  await page.locator("#preview-slot").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/v4-studio.png" });
  await page.locator("#details").scrollIntoViewIfNeeded();
  await page.waitForSelector('#switch-canvas[data-rendered="true"]');
  for (const level of [100, 50, 0]) {
    await page.locator("#explode").fill(String(level));
    await page.waitForFunction(
      (level) =>
        Math.abs(
          Number(document.querySelector("#switch-canvas").dataset.spread) -
            level / 100,
        ) < 0.01,
      level,
    );
    await page
      .locator("#specimen")
      .screenshot({ path: `artifacts/v4-switch-${level}.png` });
  }
  await page.locator("#explode").fill("100");
  await page
    .locator("#details")
    .screenshot({ path: "artifacts/v4-details.png" });
  await page.locator("#hero-immersive").scrollIntoViewIfNeeded();
  await page.locator("#hero-immersive").click();
  await page.waitForSelector(
    '#scene-host.in-immersive[data-rendered="true"][data-settled="true"]',
  );
  await page.waitForFunction(
    () =>
      !document.querySelector("#ambient-audio").paused &&
      document.querySelector("#ambient-audio").currentTime > 0,
  );
  assert.equal(
    await page.locator("#music-toggle").getAttribute("aria-pressed"),
    "true",
  );
  await page.mouse.move(701, 401);
  await page.locator("#music-open").click();
  const tracks = JSON.parse(await readFile("src/music-library.json", "utf8"));
  assert.equal(tracks.length, 10);
  const decoded = [];
  for (const track of tracks) {
    await page.locator(`[data-track="${track.id}"]`).click();
    await page.waitForFunction((id) => {
      const a = document.querySelector("#ambient-audio");
      return (
        a.currentSrc.includes(id) &&
        !a.paused &&
        a.readyState >= 2 &&
        a.currentTime > 0 &&
        Number.isFinite(a.duration)
      );
    }, track.id);
    decoded.push(
      await page
        .locator("#ambient-audio")
        .evaluate((a) => ({ src: a.currentSrc, duration: a.duration })),
    );
  }
  await page.locator("#music-volume").fill("13");
  assert.equal(
    await page.locator("#ambient-audio").evaluate((a) => a.volume),
    0.13,
  );
  await page.screenshot({ path: "artifacts/v4-music-library.png" });
  await page.locator("#music-close").click();
  await page.locator("#music-toggle").click();
  assert.equal(
    await page.locator("#ambient-audio").evaluate((a) => a.paused),
    true,
  );
  await page.locator("#music-toggle").click();
  await page.waitForFunction(
    () => !document.querySelector("#ambient-audio").paused,
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForFunction(
    () =>
      document.querySelector("#immersive").dataset.sceneryState === "playing",
  );
  await page.locator("#background-motion").click();
  const paused = await page
    .locator("#scenery video.visible")
    .evaluate((v) => v.currentTime);
  await page.waitForTimeout(200);
  assert.equal(
    await page.locator("#scenery video.visible").evaluate((v) => v.currentTime),
    paused,
  );
  await page.locator("#background-motion").click();
  for (const name of ["aurora", "dune", "ink", "paper"]) {
    await page.locator("#landscape-open").focus();
    await page.locator("#landscape-open").click();
    await page.locator(`[data-atmosphere-choice="${name}"]`).click();
    await page.waitForFunction(
      (name) =>
        document.querySelector("#scenery video.visible")?.dataset.scene ===
        name,
      name,
    );
    await page.screenshot({ path: `artifacts/v4-room-${name}.png` });
  }
  await page.locator("#immersive-voice").selectOption("glass");
  assert.equal(await page.locator("#lab-sound").inputValue(), "glass");
  await page.keyboard.press("a");
  await page.mouse.move(1301, 51);
  await page.locator("#exit-immersive").click();
  await page.waitForFunction(() => !document.fullscreenElement);
  assert.equal(
    await page.locator("#ambient-audio").evaluate((a) => a.paused),
    true,
  );
  assert.equal(await page.locator("#app").evaluate((e) => e.inert), false);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForSelector("#scene-host:not(.in-config):not(.in-play)");
  await page.waitForTimeout(250);
  await page.screenshot({ path: "artifacts/v4-mobile-hero.png" });
  await page.locator("#object").scrollIntoViewIfNeeded();
  await page
    .locator(".palette-browser")
    .screenshot({ path: "artifacts/v4-mobile-palettes.png" });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.locator("#details").scrollIntoViewIfNeeded();
  await page
    .locator("#specimen")
    .screenshot({ path: "artifacts/v4-mobile-switch.png" });
  await page.locator("#enter-immersive").click();
  await page.locator("#music-open").click();
  await page.screenshot({ path: "artifacts/v4-mobile-room.png" });
  assert.ok(
    await page
      .locator("#music-library")
      .evaluate((e) => e.scrollWidth <= e.clientWidth),
  );
  await page.keyboard.press("Escape");
  await page.waitForSelector("#immersive", { state: "hidden" });
  assert.equal(
    await page.locator("#ambient-audio").evaluate((a) => a.paused),
    true,
  );
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/v4-verification.json",
    JSON.stringify(
      {
        passed: true,
        decoded,
        errors,
        checks: [
          "dark theme",
          "hero sound interaction",
          "palette pagination and filtering",
          "12 keyboard voices",
          "3D switch assembled/mid/exploded",
          "10 local music tracks decoded and played",
          "music volume/pause/exit",
          "animated backgrounds and pause",
          "immersive voice selection",
          "mobile hero/library/detail",
        ],
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ passed: true, tracks: decoded.length, errors }));
} finally {
  await browser.close();
  console.log("Headless browser closed.");
}
