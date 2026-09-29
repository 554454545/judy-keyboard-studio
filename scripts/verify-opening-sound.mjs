import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import ts from "typescript";
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "no-preference",
  });
  page.setDefaultTimeout(45000);
  await page.clock.install({ time: new Date("2026-09-29T00:00:00Z") });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.audioStarts = [];
    window.audioStops = 0;
    const start = AudioBufferSourceNode.prototype.start,
      stop = AudioBufferSourceNode.prototype.stop;
    AudioBufferSourceNode.prototype.start = function (...args) {
      window.audioStarts.push(this.buffer?.duration || 0);
      return start.apply(this, args);
    };
    AudioBufferSourceNode.prototype.stop = function (...args) {
      window.audioStops++;
      return stop.apply(this, args);
    };
  });
  await page.goto(process.env.TEST_URL || "http://localhost:4174", {
    waitUntil: "networkidle",
  });
  await page.waitForSelector(".atelier-dialog[open][data-mode=intro]");
  await page.waitForSelector("#scene-host[data-rendered=true]");
  await page
    .locator("#atelier-stage")
    .screenshot({ path: "artifacts/v8-opening-ready.png" });
  await page.clock.pauseAt(new Date("2026-09-29T01:00:00Z"));
  await page.keyboard.press("j");
  await page.clock.fastForward(32);
  assert.equal(
    await page.locator("#scene-host").getAttribute("data-assembly-key"),
    "KeyJ",
  );
  assert.ok(
    await page.evaluate(() =>
      window.audioStarts.some((d) => Math.abs(d - 3.1) < 0.01),
    ),
  );
  assert.equal(
    await page.locator(".atelier-dialog").getAttribute("data-intro-audio"),
    "playing",
  );
  await page.clock.fastForward(700);
  await page.screenshot({ path: "artifacts/v8-opening-j.png" });
  await page.clock.fastForward(3200);
  assert.equal(
    await page.locator(".atelier-dialog").evaluate((el) => el.open),
    false,
  );
  await page.locator("#design-open").click();
  await page.locator("#replay-assembly").click();
  await page.locator("#intro-sound").uncheck();
  const starts = await page.evaluate(() => window.audioStarts.length);
  await page.keyboard.press("b");
  await page.waitForFunction(
    () => document.querySelector("#scene-host").dataset.assemblyKey === "KeyB",
  );
  assert.equal(await page.evaluate(() => window.audioStarts.length), starts);
  await page.locator("#skip-assembly").click();
  assert.equal(
    await page.locator("#scene-host").getAttribute("data-assembly"),
    "complete",
  );
  await page.locator("#replay-assembly").click();
  await page.locator("#intro-sound").check();
  await page.keyboard.press("g");
  await page.waitForFunction(
    () =>
      document.querySelector(".atelier-dialog").dataset.introAudio ===
      "playing",
  );
  await page.locator("#intro-sound").uncheck();
  assert.ok(await page.evaluate(() => window.audioStops > 0));
  await page.locator("#skip-assembly").click();
  const source = ts.transpileModule(await readFile("src/sound.ts", "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  }).outputText;
  const sounds = await page.evaluate(async (text) => {
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/javascript" }),
    );
    const { renderGesture } = await import(url);
    URL.revokeObjectURL(url);
    const ctx = new OfflineAudioContext(1, 148800, 48000);
    return ["assembly", "select", "portal", "float", "snap"].map((cue) => {
      const buffer = renderGesture(ctx, cue, "KeyJ");
      return { cue, samples: Array.from(buffer.getChannelData(0)) };
    });
  }, source);
  await mkdir("artifacts/gestures-v8", { recursive: true });
  const report = [];
  for (const sound of sounds) {
    let peak = 0,
      energy = 0;
    for (const x of sound.samples) {
      peak = Math.max(peak, Math.abs(x));
      energy += x * x;
    }
    assert.ok(peak > 0.1 && peak < 1);
    assert.ok(energy / sound.samples.length > 0.00001);
    const buffer = Buffer.alloc(44 + sound.samples.length * 2);
    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(buffer.length - 8, 4);
    buffer.write("WAVEfmt ", 8);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(48000, 24);
    buffer.writeUInt32LE(96000, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write("data", 36);
    buffer.writeUInt32LE(sound.samples.length * 2, 40);
    sound.samples.forEach((x, i) =>
      buffer.writeInt16LE(Math.round(x * 32767), 44 + i * 2),
    );
    await writeFile(`artifacts/gestures-v8/${sound.cue}.wav`, buffer);
    report.push({
      cue: sound.cue,
      peak,
      rms: Math.sqrt(energy / sound.samples.length),
    });
  }
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/v8-opening-sound.json",
    JSON.stringify({ passed: true, report, errors }, null, 2),
  );
  console.log(
    "Selected origin, opening audio, mute/cancel, and five gesture signals passed",
  );
} finally {
  await browser.close();
}
