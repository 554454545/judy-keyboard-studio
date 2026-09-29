import test from "node:test";
import assert from "node:assert/strict";
import { createCapGeometry } from "../src/keyboard-model.ts";
import { keyLayout } from "../src/key-layout.ts";
import { contrastInk, palettes } from "../src/palettes.ts";
test("physical keyboard codes map to distinct real keys, including both shifts and control keys", () => {
  assert.equal(new Set(keyLayout.map((k) => k.code)).size, keyLayout.length);
  for (const code of [
    "ShiftLeft",
    "ShiftRight",
    "ControlLeft",
    "ControlRight",
    "Space",
    "Backspace",
    "Enter",
    "ArrowUp",
  ])
    assert.ok(keyLayout.some((k) => k.code === code));
  assert.ok(!keyLayout.some((k) => k.code === "NumpadAdd"));
});
test("all three cap profiles have finite, upward-facing curved legend surfaces and atlas coordinates", () => {
  for (const profile of ["cherry", "round", "low"])
    for (const [i, key] of keyLayout.entries()) {
      const geometry = createCapGeometry(key, profile, i),
        p = geometry.attributes.position,
        n = geometry.attributes.normal,
        uv = geometry.attributes.uv;
      assert.ok([...p.array, ...n.array, ...uv.array].every(Number.isFinite));
      const top = geometry.groups[1],
        indices = geometry.index.array;
      for (let j = top.start; j < top.start + top.count; j++) {
        const index = indices[j];
        assert.ok(
          n.getY(index) > 0.5,
          `${profile}/${key.code} has inverted top normal`,
        );
        assert.ok(
          uv.getX(index) >= (i % 16) / 16 &&
            uv.getX(index) <= ((i % 16) + 1) / 16,
        );
      }
      geometry.dispose();
    }
});
test("light and dark themes use contrasting ink", () => {
  assert.equal(contrastInk("#ffffff"), "#263238");
  assert.equal(contrastInk("#000000"), "#f4f3ea");
  assert.equal(contrastInk(palettes.ink.key), "#f4f3ea");
  assert.equal(contrastInk(palettes.moon.key), "#263238");
  assert.equal(contrastInk(palettes.obsidian.key), "#f4f3ea");
});

test("all form factors have unique visual keys, valid shells and no overlapping keycaps", async () => {
  const { forms, getLayout, getShells } = await import("../src/key-layout.ts");
  for (const form of Object.keys(forms)) {
    const keys = getLayout(form),
      shells = getShells(form, keys);
    assert.equal(new Set(keys.map((k) => k.code)).size, keys.length);
    assert.equal(shells.length, form === "split" ? 2 : 1);
    const corners = (k) => {
      const angle = -(k.angle ?? 0),
        w = (k.units * 0.927 - 0.065) / 2,
        d = 0.82 / 2;
      return [
        [-w, -d],
        [w, -d],
        [w, d],
        [-w, d],
      ].map(([x, z]) => [
        k.x + x * Math.cos(angle) - z * Math.sin(angle),
        k.z + x * Math.sin(angle) + z * Math.cos(angle),
      ]);
    };
    for (let i = 0; i < keys.length; i++)
      for (let j = i + 1; j < keys.length; j++) {
        const a = corners(keys[i]),
          b = corners(keys[j]);
        const axes = [keys[i], keys[j]].flatMap((k) => {
          const t = -(k.angle ?? 0);
          return [
            [Math.cos(t), Math.sin(t)],
            [-Math.sin(t), Math.cos(t)],
          ];
        });
        const separate = axes.some(([x, z]) => {
          const pa = a.map((p) => p[0] * x + p[1] * z),
            pb = b.map((p) => p[0] * x + p[1] * z);
          return (
            Math.max(...pa) <= Math.min(...pb) + 0.005 ||
            Math.max(...pb) <= Math.min(...pa) + 0.005
          );
        });
        assert.ok(
          separate,
          `${form}: ${keys[i].code} intersects ${keys[j].code}`,
        );
      }
    assert.ok(shells.flat(2).every(Number.isFinite));
  }
});
