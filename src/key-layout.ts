export interface KeyDefinition {
  code: string;
  inputCode?: string;
  angle?: number;
  shell?: number;
  label: string;
  secondary?: string;
  units: number;
  row: number;
  x: number;
  z: number;
  zone: "key" | "modifier" | "accent";
}
type Entry = [string, string, number?, string?];
const rows: Entry[][] = [
  [
    ["Escape", "esc"],
    ...Array.from(
      { length: 12 },
      (_, i) => [`F${i + 1}`, `F${i + 1}`] as Entry,
    ),
    ["Delete", "del"],
  ],
  [
    ["Backquote", "`", 1, "~"],
    ...Array.from(
      { length: 10 },
      (_, i) =>
        [
          `Digit${(i + 1) % 10}`,
          String((i + 1) % 10),
          1,
          "!@#$%^&*()"[i],
        ] as Entry,
    ),
    ["Minus", "−", 1, "_"],
    ["Equal", "=", 1, "+"],
    ["Backspace", "back", 2],
    ["Home", "home"],
  ],
  [
    ["Tab", "tab", 1.5],
    ...Array.from("QWERTYUIOP", (c) => [`Key${c}`, c] as Entry),
    ["BracketLeft", "[", 1, "{"],
    ["BracketRight", "]", 1, "}"],
    ["Backslash", "\\", 1.5, "|"],
    ["PageUp", "pgup"],
  ],
  [
    ["CapsLock", "caps", 1.75],
    ...Array.from("ASDFGHJKL", (c) => [`Key${c}`, c] as Entry),
    ["Semicolon", ";", 1, ":"],
    ["Quote", "'", 1, '"'],
    ["Enter", "enter", 2.25],
    ["PageDown", "pgdn"],
  ],
  [
    ["ShiftLeft", "shift", 2.25],
    ...Array.from("ZXCVBNM", (c) => [`Key${c}`, c] as Entry),
    ["Comma", ",", 1, "<"],
    ["Period", ".", 1, ">"],
    ["Slash", "/", 1, "?"],
    ["ShiftRight", "shift", 1.75],
    ["ArrowUp", "↑"],
    ["End", "end"],
  ],
  [
    ["ControlLeft", "ctrl", 1.25],
    ["MetaLeft", "win", 1.25],
    ["AltLeft", "alt", 1.25],
    ["Space", "space", 6.25],
    ["AltRight", "alt"],
    ["Fn", "fn"],
    ["ControlRight", "ctrl"],
    ["ArrowLeft", "←"],
    ["ArrowDown", "↓"],
    ["ArrowRight", "→"],
  ],
];
export const keyLayout: KeyDefinition[] = rows.flatMap((row, r) => {
  let cursor = -7.42;
  return row.map(([code, label, units = 1, secondary]) => {
    const x = cursor + (units * 0.927 - 0.062) / 2;
    cursor += units * 0.927;
    return {
      code,
      label,
      secondary,
      units,
      row: r,
      x,
      z: -2.48 + r * 0.94 + (r ? 0.12 : 0),
      zone: ([
        "Escape",
        "Enter",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ].includes(code)
        ? "accent"
        : code.startsWith("Key") ||
            code.startsWith("Digit") ||
            [
              "Backquote",
              "Minus",
              "Equal",
              "BracketLeft",
              "BracketRight",
              "Backslash",
              "Semicolon",
              "Quote",
              "Comma",
              "Period",
              "Slash",
            ].includes(code)
          ? "key"
          : "modifier") as KeyDefinition["zone"],
    };
  });
});

export const forms = {
  classic: {
    name: "经典 75",
    english: "THE ORIGINAL",
    description: "完整功能行，独立方向键，熟悉的日常。",
  },
  compact: {
    name: "紧凑 60",
    english: "LESS, BUT ENOUGH",
    description: "收起功能行与导航区，让桌面多一点留白。",
  },
  alice: {
    name: "蝶翼 Alice",
    english: "A DIFFERENT ANGLE",
    description: "一体蝶翼外壳，向两侧展开的键区与双空格。",
  },
  split: {
    name: "分体 Orbit",
    english: "ROOM TO BREATHE",
    description: "独立双岛、列错位和拇指键簇，让双手各有位置。",
  },
  mono: {
    name: "单手 Solo",
    english: "ONE HAND. ALL IN.",
    description: "只留左手的一座小岛。联动对应字母与拇指区按键。",
  },
} as const;
export type FormName = keyof typeof forms;
export type Point = [number, number];
const original = new Map(keyLayout.map((k) => [k.code, k]));
function key(
  code: string,
  x: number,
  z: number,
  row: number,
  units = 1,
): KeyDefinition {
  return { ...original.get(code)!, x, z, row, units };
}
function rotate(k: KeyDefinition, angle: number, dx: number): KeyDefinition {
  return {
    ...k,
    x: k.x * Math.cos(angle) - k.z * Math.sin(angle) + dx,
    z: k.x * Math.sin(angle) + k.z * Math.cos(angle),
    angle: -angle,
  };
}
function centered(keys: KeyDefinition[]): KeyDefinition[] {
  const minX = Math.min(...keys.map((k) => k.x - (k.units * 0.927) / 2));
  const maxX = Math.max(...keys.map((k) => k.x + (k.units * 0.927) / 2));
  const minZ = Math.min(...keys.map((k) => k.z));
  const maxZ = Math.max(...keys.map((k) => k.z));
  return keys.map((k) => ({
    ...k,
    x: k.x - (minX + maxX) / 2,
    z: k.z - (minZ + maxZ) / 2,
  }));
}
export function getLayout(form: FormName): KeyDefinition[] {
  if (form === "classic") return keyLayout.map((k) => ({ ...k }));
  if (form === "compact") {
    const keys = keyLayout
      .filter(
        (k) =>
          k.row > 0 &&
          ![
            "Home",
            "PageUp",
            "PageDown",
            "End",
            "ArrowUp",
            "ArrowLeft",
            "ArrowRight",
            "ArrowDown",
          ].includes(k.code),
      )
      .map((k) => ({ ...k }));
    keys[0] = {
      ...keys[0],
      code: "Escape",
      label: "esc",
      secondary: undefined,
      zone: "accent",
    };
    return centered(keys);
  }
  if (form === "alice") {
    const leftCodes = new Set([
      "Backquote",
      "Digit1",
      "Digit2",
      "Digit3",
      "Digit4",
      "Digit5",
      "Tab",
      ...Array.from("QWERTASDFGZXCVB", (c) => `Key${c}`),
      "CapsLock",
      "ShiftLeft",
    ]);
    const halves = [0, 1].map((side) => {
      const keys = keyLayout
        .filter(
          (k) =>
            k.row > 0 &&
            k.row < 5 &&
            k.x < 6.1 &&
            Number(!leftCodes.has(k.code)) === side,
        )
        .map((k) => ({ ...k, shell: side }));
      const cx = side ? 3.1 : -3.6;
      const extra = side
        ? [
            key("Space", 0.1, 2.75, 5, 2.75),
            key("AltRight", 2.2, 2.75, 5),
            key("ControlRight", 3.2, 2.75, 5),
          ]
        : [
            key("ControlLeft", -2.9, 2.75, 5),
            key("AltLeft", -1.9, 2.75, 5),
            key("Space", 0.05, 2.75, 5, 2.75),
          ];
      if (side)
        extra[0] = { ...extra[0], code: "SpaceRight", inputCode: "Space" };
      return [
        ...keys.map((k) => ({ ...k, x: k.x - cx, z: k.z + 0.35 })),
        ...extra,
      ].map((k) => ({
        ...rotate(k, side ? -0.18 : 0.18, side ? 4 : -4),
        shell: side,
      }));
    });
    return centered(halves.flat());
  }
  const matrices = [
    [
      ["Escape", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5"],
      ["Tab", "KeyQ", "KeyW", "KeyE", "KeyR", "KeyT"],
      ["ControlLeft", "KeyA", "KeyS", "KeyD", "KeyF", "KeyG"],
      ["ShiftLeft", "KeyZ", "KeyX", "KeyC", "KeyV", "KeyB"],
    ],
    [
      ["Digit6", "Digit7", "Digit8", "Digit9", "Digit0", "Delete"],
      ["KeyY", "KeyU", "KeyI", "KeyO", "KeyP", "BracketRight"],
      ["KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon", "Quote"],
      ["KeyN", "KeyM", "Comma", "Period", "Slash", "ShiftRight"],
    ],
  ];
  const keys = matrices
    .slice(0, form === "mono" ? 1 : 2)
    .flatMap((matrix, side) => {
      const offset = [0.28, 0.06, -0.2, -0.34, -0.15, 0.1];
      const half = matrix.flatMap((row, r) =>
        row.map((code, c) =>
          key(
            code,
            (c - 2.5) * 0.96,
            (r - 1.5) * 0.95 + offset[side ? 5 - c : c],
            r,
          ),
        ),
      );
      const thumbs = side
        ? ["Enter", "Backspace", "AltRight"]
        : ["MetaLeft", "AltLeft", "Space"];
      thumbs.forEach((code, i) =>
        half.push(
          key(
            code,
            side ? -2.25 + i * 1.05 : 0.15 + i * 1.05,
            2.3 + (side ? 2 - i : i) * 0.15,
            5,
          ),
        ),
      );
      return half.map((k) => ({
        ...rotate(
          k,
          side ? -0.14 : 0.14,
          form === "mono" ? 0 : side ? 4.2 : -4.2,
        ),
        shell: side,
      }));
    });
  return centered(keys);
}
export function hull(points: Point[]): Point[] {
  const sorted = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Point, a: Point, b: Point) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: Point[]) => {
    const out: Point[] = [];
    for (const p of list) {
      while (out.length >= 2 && cross(out.at(-2)!, out.at(-1)!, p) <= 0)
        out.pop();
      out.push(p);
    }
    return out;
  };
  return [...half(sorted).slice(0, -1), ...half(sorted.reverse()).slice(0, -1)];
}
export function getShells(form: FormName, keys = getLayout(form)): Point[][] {
  if (form === "classic")
    return [
      [
        [-7.975, -3.3],
        [7.975, -3.3],
        [7.975, 3.3],
        [-7.975, 3.3],
      ],
    ];
  const shellPoints = (group: KeyDefinition[]) =>
    hull(
      group.flatMap((k) => {
        const a = -(k.angle ?? 0),
          w = (k.units * 0.927) / 2 + 0.2,
          d = 0.64;
        return [
          [-w, -d],
          [w, -d],
          [w, d],
          [-w, d],
        ].map(
          ([x, z]) =>
            [
              k.x + x * Math.cos(a) - z * Math.sin(a),
              k.z + x * Math.sin(a) + z * Math.cos(a),
            ] as Point,
        );
      }),
    );
  if (form === "split")
    return [
      shellPoints(keys.filter((k) => k.shell === 0)),
      shellPoints(keys.filter((k) => k.shell === 1)),
    ];
  if (form === "alice") {
    const outer = shellPoints(keys);
    // Insert a shallow central notch along the rear rim of the one-piece butterfly shell.
    const index = outer.findIndex(
      (p, i) => p[0] < 0 && outer[(i + 1) % outer.length][0] > 0 && p[1] < 0,
    );
    if (index >= 0)
      outer.splice(index + 1, 0, [-0.65, -1.7], [0, -1.3], [0.65, -1.7]);
    return [outer];
  }
  return [shellPoints(keys)];
}
export function keyboardPreview(
  form: FormName,
  colors: { body: string; key: string; modifier: string; accent: string },
): string {
  const keys = getLayout(form),
    shells = getShells(form, keys),
    points = shells.flat();
  const minX = Math.min(...points.map((p) => p[0])) - 0.2,
    minZ = Math.min(...points.map((p) => p[1])) - 0.2;
  const w = Math.max(...points.map((p) => p[0])) - minX + 0.2,
    h = Math.max(...points.map((p) => p[1])) - minZ + 0.2;
  return `<svg class="keyboard-mini" viewBox="${minX} ${minZ} ${w} ${h}" aria-hidden="true"><g stroke="rgba(0,0,0,.16)" stroke-width=".025">${shells.map((s) => `<polygon points="${s.map((p) => p.join(",")).join(" ")}" fill="${colors.body}"/>`).join("")}${keys.map((k) => `<rect x="${k.x - (k.units * 0.927) / 2 + 0.055}" y="${k.z - 0.39}" width="${k.units * 0.927 - 0.11}" height=".78" rx=".09" fill="${colors[k.zone]}" transform="rotate(${(-(k.angle ?? 0) * 180) / Math.PI} ${k.x} ${k.z})"/>`).join("")}</g></svg>`;
}
