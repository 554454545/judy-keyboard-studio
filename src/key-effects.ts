import * as THREE from "three";
import { type KeyEffect } from "./effect-options";
export type { KeyEffect } from "./effect-options";
/** A bounded pool, attached to the board so effects follow every camera angle. */
export class KeyEffects {
  group = new THREE.Group();
  mode: KeyEffect = "ripple";
  private ring = new THREE.RingGeometry(0.46, 0.49, 48);
  private beam = new THREE.CylinderGeometry(0.08, 0.4, 1, 16, 1, true);
  private dots = new THREE.BufferGeometry().setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      Array.from({ length: 36 }, (_, i) =>
        i % 3 === 1 ? 0.3 + (i % 7) * 0.15 : Math.sin(i * 13.7) * 0.6,
      ),
      3,
    ),
  );
  private cursor = 0;
  private pool = Array.from({ length: 24 }, () => {
    const material = new THREE.MeshBasicMaterial({
      color: "#91ffe0",
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(this.ring, material);
    ring.rotation.x = -Math.PI / 2;
    const beam = new THREE.Mesh(this.beam, material);
    const pointsMaterial = new THREE.PointsMaterial({
      color: "#d3baff",
      size: 0.075,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const dots = new THREE.Points(this.dots, pointsMaterial);
    const root = new THREE.Group();
    root.add(ring, beam, dots);
    root.visible = false;
    this.group.add(root);
    return {
      root,
      ring,
      beam,
      dots,
      material,
      pointsMaterial,
      born: -1,
      mode: "ripple" as KeyEffect,
    };
  });
  trigger(x: number, y: number, z: number) {
    if (this.mode === "none") return;
    const p = this.pool[this.cursor++ % this.pool.length];
    p.born = performance.now();
    p.mode = this.mode;
    p.root.position.set(x, y, z);
    p.root.visible = true;
    p.ring.visible = p.mode === "ripple";
    p.beam.visible = p.mode === "beam";
    p.dots.visible = p.mode === "sparks";
  }
  tick(now: number) {
    let active = false;
    for (const p of this.pool) {
      if (!p.root.visible) continue;
      const t = (now - p.born) / 720;
      if (t >= 1) {
        p.root.visible = false;
        active = true;
        continue;
      }
      active = true;
      p.material.opacity = (1 - t) * 0.8;
      p.pointsMaterial.opacity = 1 - t;
      p.ring.scale.setScalar(1 + t * 3.2);
      p.ring.position.y = t * 0.25;
      p.beam.scale.set(
        1 - t * 0.5,
        0.2 + Math.sin(t * Math.PI) * 2.6,
        1 - t * 0.5,
      );
      p.beam.position.y = p.beam.scale.y / 2;
      p.dots.scale.setScalar(0.3 + t * 3);
      p.dots.rotation.y = t * 0.8;
    }
    return active;
  }
  clear() {
    this.pool.forEach((p) => (p.root.visible = false));
  }
  dispose() {
    this.clear();
    this.ring.dispose();
    this.beam.dispose();
    this.dots.dispose();
    this.pool.forEach((p) => {
      p.material.dispose();
      p.pointsMaterial.dispose();
    });
  }
}
