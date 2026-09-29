import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import ts from "typescript";
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const source = ts.transpileModule(await readFile("src/sound.ts", "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  }).outputText;
  const result = await page.evaluate(async (text) => {
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/javascript" }),
    );
    const { scheduleKeySound } = await import(url);
    URL.revokeObjectURL(url);
    const out = [];
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
      for (const release of [false, true]) {
        const ctx = new OfflineAudioContext(1, 24000, 48000);
        scheduleKeySound(ctx, ctx.destination, preset, "KeyA", 0.7, release);
        const rendered = await ctx.startRendering();
        out.push({
          preset,
          release,
          samples: Array.from(rendered.getChannelData(0)),
        });
      }
    const ctx = new OfflineAudioContext(1, 24000, 48000);
    for (const code of ["KeyA", "KeyS", "KeyD", "KeyF", "Space", "ShiftLeft"])
      scheduleKeySound(ctx, ctx.destination, "bubble", code, 1);
    const chord = await ctx.startRendering();
    out.push({
      preset: "chord",
      release: false,
      samples: Array.from(chord.getChannelData(0)),
    });
    return out;
  }, source);
  await mkdir("artifacts/voices-v6", { recursive: true });
  for (const r of result) {
    const peak = Math.max(...r.samples.map(Math.abs));
    assert.ok(peak < 1, `${r.preset} clipping ${peak}`);
    const b = Buffer.alloc(44 + r.samples.length * 2);
    b.write("RIFF");
    b.writeUInt32LE(b.length - 8, 4);
    b.write("WAVEfmt ", 8);
    b.writeUInt32LE(16, 16);
    b.writeUInt16LE(1, 20);
    b.writeUInt16LE(1, 22);
    b.writeUInt32LE(48000, 24);
    b.writeUInt32LE(96000, 28);
    b.writeUInt16LE(2, 32);
    b.writeUInt16LE(16, 34);
    b.write("data", 36);
    b.writeUInt32LE(b.length - 44, 40);
    r.samples.forEach((v, i) =>
      b.writeInt16LE(Math.round(v * 32767), 44 + i * 2),
    );
    await writeFile(
      `artifacts/voices-v6/${r.preset}${r.release ? "-release" : ""}.wav`,
      b,
    );
  }
  console.log(
    "24 press/release renders and a full-volume six-key bubble chord: unclipped. WAVs exported.",
  );
} finally {
  await browser.close();
  console.log("Headless browser closed.");
}
