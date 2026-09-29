import { chromium } from "playwright";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({ headless: true });
const errors = [];
const url = process.env.TEST_URL || "http://localhost:4174";
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector('#scene-host[data-rendered="true"]');
  assert.equal(await page.locator("button[data-palette]").count(), 22);
  assert.equal(
    await page.locator("button[data-palette] .keyboard-mini").count(),
    22,
  );
  await page.locator("#object").scrollIntoViewIfNeeded();
  await page.locator("#design-open").click();
  const counts = {};
  for (const form of ["classic", "compact", "alice", "split", "mono"]) {
    await page.locator(`button[data-form="${form}"]`).click();
    await page.waitForFunction(
      (form) => document.querySelector("#scene-host").dataset.form === form,
      form,
    );
    await page.waitForSelector(
      '#scene-host[data-rendered="true"][data-settled="true"]',
    );
    counts[form] = Number(
      await page.locator("#scene-host").getAttribute("data-key-count"),
    );
    assert.equal(
      await page.locator('button[data-palette="moon"] rect').count(),
      counts[form],
    );
    await page.locator("#scene-host").focus();
    await page.keyboard.down("Space");
    const pressed = await page
      .locator("#scene-host")
      .getAttribute("data-pressed");
    assert.match(pressed, /Space/);
    if (form === "alice") assert.match(pressed, /SpaceRight/);
    await page.keyboard.up("Space");
    if (form === "mono") {
      await page.keyboard.down("j");
      assert.equal(
        await page.locator("#scene-host").getAttribute("data-pressed"),
        "",
      );
      await page.keyboard.up("j");
    }
    await page
      .locator("#preview-slot")
      .screenshot({ path: `artifacts/v3-form-${form}.png` });
  }
  assert.ok(
    counts.classic > counts.compact && counts.split === 2 * counts.mono,
  );
  await page.locator('button[data-form="split"]').click();
  await page.locator("#palette-next").click();
  await page.locator('button[data-palette="cobalt"]').click();
  await page.locator("#preview-slot").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "artifacts/v3-studio.png" });
  await page.locator("#details").scrollIntoViewIfNeeded();
  await page.locator("#explode").fill("0");
  assert.equal(await page.locator("#explode-value").innerText(), "0%");
  await page.locator("#explode").fill("100");
  await page.locator('button[data-part="spring"]').click();
  assert.match(await page.locator("#part-title").innerText(), /松开/);
  await page.locator("#detail-strike").click();
  assert.equal(
    await page.locator("#sound-toggle").getAttribute("aria-pressed"),
    "true",
  );
  await page
    .locator("#details")
    .screenshot({ path: "artifacts/v3-details.png" });
  await page.locator("#enter-immersive").click();
  await page.waitForSelector(
    '#scene-host.in-immersive[data-rendered="true"][data-settled="true"]',
  );
  assert.equal(await page.locator("#app").evaluate((e) => e.inert), true);
  await page.keyboard.down("a");
  assert.match(
    await page.locator("#scene-host").getAttribute("data-pressed"),
    /KeyA/,
  );
  await page.keyboard.up("a");
  assert.equal(
    await page.locator("#scene-host").getAttribute("data-pressed"),
    "",
  );
  await page.mouse.move(800, 450);
  await page.waitForSelector("#immersive.ui-hidden");
  await page.screenshot({ path: "artifacts/v3-immersive-clean.png" });
  await page.mouse.move(810, 450);
  await page.locator("#landscape-open").focus();
  await page.locator("#landscape-open").click();
  await page.locator('[data-atmosphere-choice="dune"]').click();
  await page.locator("#immersive-zoom").fill("110");
  await page.screenshot({ path: "artifacts/v3-immersive-controls.png" });
  await page.locator("#exit-immersive").click();
  assert.equal(await page.locator("#immersive").isVisible(), false);
  assert.equal(await page.locator("#app").evaluate((e) => e.inert), false);
  await page.waitForSelector('#scene-host.in-play[data-rendered="true"]');
  await page.locator("#enter-immersive").click();
  await page.keyboard.press("Escape");
  await page.waitForSelector("#immersive", { state: "hidden" });
  assert.equal(await page.locator("#app").evaluate((e) => e.inert), false);
  await page.waitForFunction(() => !document.fullscreenElement);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#details").scrollIntoViewIfNeeded();
  await page
    .locator("#details")
    .screenshot({ path: "artifacts/v3-mobile-details.png" });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.locator("#enter-immersive").click();
  await page.waitForSelector(
    '#scene-host.in-immersive[data-rendered="true"][data-settled="true"]',
  );
  await page.screenshot({ path: "artifacts/v3-mobile-immersive.png" });
  await page.mouse.move(120, 200);
  await page.locator("#exit-immersive").click();
  await page.waitForFunction(() => !document.fullscreenElement);
  await page.evaluate(() => {
    document.querySelector("#immersive").requestFullscreen = () =>
      Promise.reject(new Error("Fullscreen unavailable in this test"));
  });
  await page.locator("#enter-immersive").click();
  await page.waitForSelector("#scene-host.in-immersive");
  await page.waitForFunction(() =>
    document
      .querySelector("#fullscreen-state")
      .textContent.includes("窗口全景"),
  );
  assert.equal(await page.evaluate(() => !!document.fullscreenElement), false);
  await page.keyboard.press("Shift+Tab");
  assert.ok(
    await page.evaluate(() =>
      document.querySelector("#immersive").contains(document.activeElement),
    ),
  );
  await page.keyboard.press("Escape");
  await page.waitForSelector("#immersive", { state: "hidden" });
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/v3-verification.json",
    JSON.stringify(
      {
        passed: true,
        counts,
        errors,
        checks: [
          "22 visual palette cards",
          "5 actual form geometries",
          "split and half key counts",
          "Alice dual space and unmapped Solo keys",
          "interactive breakdown and sound",
          "fullscreen physical input",
          "automatic UI hiding",
          "background and zoom controls",
          "exit restoration and Escape",
          "fullscreen rejection fallback and focus containment",
          "mobile layouts",
        ],
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ passed: true, counts, errors }));
} finally {
  await browser.close();
  console.log("Headless browser closed.");
}
