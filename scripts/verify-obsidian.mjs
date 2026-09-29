import { chromium } from "playwright";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1100, height: 850 },
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
  await page.waitForSelector("#scene-host[data-rendered=true]");
  assert.equal(await page.evaluate(() => document.visibilityState), "visible");
  await page.screenshot({ path: "artifacts/v10-hero.png" });
  await page.locator("#design-open").click();
  await page.waitForSelector("#art-key", { state: "attached" });
  const forms = {};
  for (const form of ["compact", "alice", "split", "mono", "classic"]) {
    await page.locator(`[data-form=${form}]`).click();
    await page.waitForSelector(
      "#scene-host[data-rendered=true][data-settled=true]",
    );
    assert.equal(
      await page.locator("#scene-host").getAttribute("data-chassis"),
      "suspended",
    );
    if (form === "split" || form === "alice")
      await page
        .locator(".preview")
        .screenshot({ path: `artifacts/v10-${form}.png` });
    forms[form] = await page
      .locator("#scene-host")
      .getAttribute("data-key-count");
  }
  await page.locator("[data-view=side]").click();
  await page.locator("#design-close").click();
  await page.locator(".preview").scrollIntoViewIfNeeded();
  await page.waitForSelector(
    "#scene-host[data-rendered=true][data-settled=true]",
  );
  await page.locator(".preview").screenshot({ path: "artifacts/v10-side.png" });
  await page.locator("[data-view=studio]").click();
  await page.locator("#design-open").click();
  await page.locator("#craft-tab-art").click();
  await page.locator("#art-key").selectOption("Escape");
  await page.locator("#open-photo").click();
  await page.locator("[data-photo-view=detail]").click();
  await page.waitForSelector(
    "#scene-host[data-rendered=true][data-settled=true]",
  );
  await page.screenshot({ path: "artifacts/v10-crystal.png" });
  await page.locator("#close-atelier").click();
  await page.locator("#art-key").selectOption("Space");
  await page.locator("#open-photo").click();
  await page.locator("[data-photo-view=detail]").click();
  await page.waitForSelector(
    "#scene-host[data-rendered=true][data-settled=true]",
  );
  await page.screenshot({ path: "artifacts/v10-space.png" });
  await page.locator("#close-atelier").click();
  await page.locator("#craft-tab-material").click();
  for (const mode of ["cream", "metal", "ice", "original"]) {
    await page.locator(`[data-material=${mode}]`).click();
    assert.equal(
      await page.locator("#scene-host").getAttribute("data-material"),
      mode,
    );
  }
  await page.locator("[data-profile=low]").click();
  await page.locator("[data-profile=round]").click();
  await page.locator("[data-profile=cherry]").click();
  await page.locator("#design-close").click();
  await page.locator("#scene-host").focus();
  await page.keyboard.down("g");
  await page.keyboard.up("g");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".preview").scrollIntoViewIfNeeded();
  await page.waitForSelector("#scene-host[data-rendered=true]");
  await page.screenshot({ path: "artifacts/v10-mobile.png" });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/v10-obsidian.json",
    JSON.stringify({ passed: true, forms, errors }, null, 2),
  );
  console.log(
    "Suspended chassis: all forms, materials, profiles, closeups and mobile passed",
  );
} finally {
  await browser.close();
}
