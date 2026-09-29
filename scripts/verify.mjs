import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import ts from "typescript";
const base = process.env.TEST_URL || "http://localhost:4173";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ headless: true });
let closed = false;
async function close() {
  if (!closed) {
    closed = true;
    await browser.close();
  }
}
process.once("SIGINT", () => void close().then(() => process.exit(130)));
process.once("SIGTERM", () => void close().then(() => process.exit(143)));
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForSelector('#scene-host[data-rendered="true"]');
  assert.equal(await page.evaluate(() => document.visibilityState), "visible");
  assert.equal(await page.locator("button[data-palette]").count(), 22);
  await page.screenshot({ path: "artifacts/v2-hero.png" });
  await page.locator("#object").scrollIntoViewIfNeeded();
  await page.locator("#design-open").click();
  await page.waitForSelector("#scene-host.in-config");
  await page.getByRole("button", { name: "午夜墨色", exact: true }).click();
  assert.equal(
    await page.locator("#scene-host").getAttribute("data-palette"),
    "ink",
  );
  await page.locator('[data-zone="key"]').fill("#152433");
  await page.locator('[data-zone="modifier"]').fill("#b7c6d4");
  assert.equal(
    await page.locator("#scene-host").getAttribute("data-palette"),
    "custom",
  );
  await page.getByRole("button", { name: "圆润球面", exact: false }).click();
  assert.equal(
    await page.locator("#scene-host").getAttribute("data-profile"),
    "round",
  );
  await page.locator("#legend").selectOption("minimal");
  assert.equal(
    await page.locator("#scene-host").getAttribute("data-legend"),
    "minimal",
  );
  await page.locator("#finish").selectOption("ceramic");
  await page.getByRole("button", { name: "俯视", exact: true }).click();
  await page.waitForTimeout(250);
  await page.locator("#paint-color").fill("#ef9cc2");
  await page.locator("#paint-toggle").click();
  const box = await page.locator("#scene-host").boundingBox();
  assert.ok(box);
  await page.mouse.click(box.x + box.width * 0.43, box.y + box.height * 0.52);
  assert.match(await page.locator("#paint-help").innerText(), /已上色/);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "保存我的搭配" }).click();
  const download = await downloadPromise;
  await download.saveAs("artifacts/v2-config.json");
  const config = JSON.parse(await readFile("artifacts/v2-config.json", "utf8"));
  assert.equal(config.key, "#152433");
  assert.equal(config.modifier, "#b7c6d4");
  assert.equal(config.profile, "round");
  assert.equal(config.finish, "ceramic");
  assert.equal(config.legend, "minimal");
  assert.ok(Object.values(config.overrides).includes("#ef9cc2"));
  await page.locator("#clear-paint").click();
  assert.doesNotMatch(await page.locator("#summary").innerText(), /颗自定义键/);
  await page.locator("#paint-toggle").click();
  await page.getByRole("button", { name: "月岩灰", exact: true }).click();
  await page.getByRole("button", { name: "阶梯凹面", exact: false }).click();
  await page.locator("#legend").selectOption("dual");
  await page.locator("#finish").selectOption("anodized");
  await page.screenshot({ path: "artifacts/v2-top.png" });
  await page.getByRole("button", { name: "侧面", exact: true }).click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: "artifacts/v2-side.png" });
  await page.getByRole("button", { name: "重置键盘视角" }).click();
  const sceneBox = await page.locator("#scene-host").boundingBox();
  await page.mouse.move(
    sceneBox.x + sceneBox.width * 0.55,
    sceneBox.y + sceneBox.height * 0.8,
  );
  await page.mouse.down();
  await page.mouse.move(
    sceneBox.x + sceneBox.width * 0.55 + 130,
    sceneBox.y + sceneBox.height * 0.8 - 25,
    { steps: 8 },
  );
  await page.mouse.up();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "artifacts/v2-rotated.png" });
  await page.getByRole("button", { name: "开始实机试打" }).click();
  await page.waitForSelector("#scene-host.in-play");
  assert.equal(
    await page.locator("#sound-toggle").getAttribute("aria-pressed"),
    "true",
  );
  await page.locator("#typing").focus();
  await page.keyboard.down("Shift");
  await page.keyboard.down("a");
  let pressed = await page.locator("#scene-host").getAttribute("data-pressed");
  assert.ok(pressed.includes("ShiftLeft") && pressed.includes("KeyA"));
  await page.screenshot({ path: "artifacts/v2-held-keys.png" });
  await page.keyboard.up("a");
  assert.equal(
    await page.locator("#scene-host").getAttribute("data-pressed"),
    "ShiftLeft",
  );
  await page.keyboard.up("Shift");
  assert.equal(
    await page.locator("#scene-host").getAttribute("data-pressed"),
    "",
  );
  await page.keyboard.down("Space");
  const before = await page.locator("#stroke-count").innerText();
  await page.keyboard.down("Space");
  assert.equal(await page.locator("#stroke-count").innerText(), before);
  assert.match(
    await page.locator("#scene-host").getAttribute("data-pressed"),
    /Space/,
  );
  await page.keyboard.up("Space");
  await page.keyboard.down("j");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  assert.equal(
    await page.locator("#scene-host").getAttribute("data-pressed"),
    "",
  );
  await page.keyboard.up("j");
  const eventResult = await page.evaluate(() => {
    const input = document.querySelector("#typing");
    const e = new KeyboardEvent("keydown", {
      code: "KeyN",
      key: "Process",
      isComposing: true,
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(e);
    input.dispatchEvent(
      new KeyboardEvent("keyup", { code: "KeyN", bubbles: true }),
    );
    return { prevented: e.defaultPrevented };
  });
  assert.equal(eventResult.prevented, false);
  await page.locator("#typing").fill("你好，Judy。");
  assert.equal(await page.locator("#char-count").innerText(), "8");
  await page.locator("#typing").pressSequentially(" Hi.", { timeout: 60000 });
  await page.locator("#lab-sound").selectOption("marble");
  await page.locator("#volume").fill("30");
  assert.equal(await page.locator("#volume-value").innerText(), "30%");
  await page.screenshot({ path: "artifacts/v2-typing-lab.png" });
  await page.locator("#sound-toggle").click();
  assert.equal(
    await page.locator("#sound-toggle").getAttribute("aria-pressed"),
    "false",
  );
  await page.getByRole("button", { name: "清空", exact: false }).last().click();
  assert.equal(await page.locator("#typing").inputValue(), "");
  assert.equal(await page.locator("#stroke-count").innerText(), "0");
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  // Render the actual sound generator offline: each voice and the spacebar produce distinct, non-silent signals.
  const compiled = ts.transpileModule(await readFile("src/sound.ts", "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  }).outputText;
  const waveforms = await page.evaluate(async (source) => {
    const module = await import(
      URL.createObjectURL(new Blob([source], { type: "text/javascript" }))
    );
    const results = [];
    for (const preset of [
      "cream",
      "marble",
      "blue",
      "typewriter",
      "silent",
      "wood",
      "glass",
      "retro",
      "rain",
      "bubble",
      "copper",
      "felt",
    ])
      for (const code of ["KeyA", "Space"]) {
        const ctx = new OfflineAudioContext(1, 12000, 48000);
        module.scheduleKeySound(ctx, ctx.destination, preset, code, 0.45);
        const buffer = await ctx.startRendering();
        const samples = buffer.getChannelData(0);
        let energy = 0,
          peak = 0,
          signature = 0;
        for (let i = 0; i < samples.length; i++) {
          energy += samples[i] * samples[i];
          peak = Math.max(peak, Math.abs(samples[i]));
          signature += samples[i] * Math.sin(i * 0.31);
        }
        results.push({ preset, code, energy, peak, signature });
      }
    return results;
  }, compiled);
  assert.ok(waveforms.every((w) => w.energy > 0.001 && w.peak < 1));
  assert.equal(new Set(waveforms.map((w) => w.signature.toFixed(5))).size, 24);
  await writeFile(
    "artifacts/v2-audio-verification.json",
    JSON.stringify(waveforms, null, 2),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: "artifacts/v2-mobile-hero.png" });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.locator("#object").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "樱花汽水", exact: true }).click();
  await page.waitForSelector(
    '#scene-host.in-config[data-rendered="true"][data-settled="true"]',
  );
  await page.screenshot({ path: "artifacts/v2-mobile-config.png" });
  await page.locator("#play").scrollIntoViewIfNeeded();
  await page.waitForSelector("#scene-host.in-play");
  await page.locator("#typing").fill("我的键盘，我的节奏。");
  await page.waitForSelector(
    '#scene-host.in-play[data-rendered="true"][data-settled="true"]',
  );
  await page.screenshot({ path: "artifacts/v2-mobile-lab.png" });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(errors, []);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector('#scene-host[data-rendered="true"]');
  assert.deepEqual(errors, []);
  const result = {
    passed: true,
    checks: [
      "22 themes",
      "independent colors",
      "cap geometry switching",
      "surface and legends",
      "per-key paint/download/reset",
      "side/top/rotated screenshots",
      "physical key down/up",
      "simultaneous modifiers",
      "repeat suppression",
      "blur cleanup",
      "IME unmodified",
      "typing and clear",
      "sound and volume controls",
      "24 distinct unclipped audio renders",
      "mobile overflow and typing lab",
      "reduced and normal motion",
    ],
    errors,
  };
  await writeFile(
    "artifacts/verification.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await close();
  console.log("Headless browser closed.");
}
