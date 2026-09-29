import * as THREE from "three";
import type { KeyboardConfig, ProfileName } from "./palettes";
import type { KeyDefinition } from "./key-layout";
export function keyColor(key: KeyDefinition, config: KeyboardConfig) {
  return config.overrides[key.code] ?? config[key.zone];
}
export function capDimensions(
  profile: ProfileName,
  row: number,
  units: number,
) {
  const height =
    profile === "low"
      ? 0.21
      : profile === "round"
        ? 0.43
        : [0.35, 0.33, 0.29, 0.27, 0.3, 0.32][row];
  return {
    width: units * 0.927 - 0.065,
    depth: 0.82,
    height,
    dish: profile === "low" ? 0.015 : profile === "round" ? 0.075 : 0.045,
    taper: profile === "round" ? 0.14 : profile === "low" ? 0.045 : 0.095,
    radius: profile === "round" ? 0.16 : 0.1,
  };
}

// One continuous mesh: tapered skirt + curved, UV-mapped top. Legends cannot intersect a second surface.
export function createCapGeometry(
  key: KeyDefinition,
  profile: ProfileName,
  index: number,
) {
  const d = capDimensions(profile, key.row, key.units),
    positions: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  const count = 48;
  function contour(w: number, depth: number, r: number, i: number) {
    const corner = Math.floor(i / 12),
      t = (((i % 12) / 12) * Math.PI) / 2;
    const angle = -Math.PI / 2 + (corner * Math.PI) / 2 + t;
    const cx = corner === 0 || corner === 1 ? w / 2 - r : -w / 2 + r;
    const cz =
      corner < 2
        ? corner === 0
          ? -depth / 2 + r
          : depth / 2 - r
        : corner === 2
          ? depth / 2 - r
          : -depth / 2 + r;
    return [cx + Math.cos(angle) * r, cz + Math.sin(angle) * r];
  }
  function add(x: number, y: number, z: number, u = 0, v = 0) {
    positions.push(x, y, z);
    uv.push(u, v);
  }
  const rings = [
    { w: d.width - 0.025, dep: d.depth - 0.025, r: d.radius, y: 0 },
    { w: d.width, dep: d.depth, r: d.radius, y: 0.06 },
    {
      w: d.width - d.taper * 2,
      dep: d.depth - d.taper * 2,
      r: d.radius * 0.82,
      y: d.height - 0.035,
    },
    {
      w: d.width - d.taper * 2 - 0.025,
      dep: d.depth - d.taper * 2 - 0.025,
      r: d.radius * 0.8,
      y: d.height,
    },
  ];
  for (const [ri, ring] of rings.entries())
    for (let i = 0; i < count; i++) {
      const [x, z] = contour(ring.w, ring.dep, ring.r, i);
      const y =
        ri === 3 && profile === "cherry"
          ? ring.y - d.dish * (1 - Math.pow(z / (ring.dep / 2), 2))
          : ring.y;
      add(x, y, z);
    }
  for (let r = 0; r < rings.length - 1; r++)
    for (let i = 0; i < count; i++) {
      const a = r * count + i,
        b = r * count + ((i + 1) % count),
        c = b + count,
        d = a + count;
      indices.push(a, c, b, a, d, c);
    }
  const sideCount = indices.length;
  const top = rings.at(-1)!;
  const cellX = index % 16,
    cellY = Math.floor(index / 16);
  function topVertex(x: number, z: number, t: number) {
    const bowl = profile === "cherry" ? Math.pow(z / (top.dep / 2), 2) : t * t;
    const y = d.height - d.dish * (1 - bowl);
    // Leave a texel gutter around each atlas cell to prevent neighbour legends bleeding at grazing angles.
    const u = (cellX + 0.04 + (x / top.w + 0.5) * 0.92) / 16;
    const v = 1 - (cellY + 0.04 + (z / top.dep + 0.5) * 0.92) / 8;
    add(x, y, z, u, v);
  }
  const start = positions.length / 3;
  topVertex(0, 0, 0);
  for (let ring = 1; ring <= 8; ring++) {
    const t = ring / 8;
    for (let i = 0; i < count; i++) {
      const [x, z] = contour(top.w, top.dep, top.r, i);
      topVertex(x * t, z * t, t);
    }
  }
  for (let i = 0; i < count; i++)
    indices.push(start, start + 1 + ((i + 1) % count), start + 1 + i);
  for (let r = 0; r < 7; r++)
    for (let i = 0; i < count; i++) {
      const a = start + 1 + r * count + i,
        b = start + 1 + r * count + ((i + 1) % count),
        c = b + count,
        d = a + count;
      indices.push(a, b, c, a, c, d);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices);
  geo.addGroup(0, sideCount, 0);
  geo.addGroup(sideCount, indices.length - sideCount, 1);
  geo.computeVertexNormals();
  return geo;
}
