import * as THREE from "three";
import { paintArt, type KeyArt } from "./key-art";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createCapGeometry } from "./keyboard-model";
export class SwitchScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(37, 1, 0.1, 80);
  private object = new THREE.Group();
  private environment: THREE.WebGLRenderTarget;
  private burst!: THREE.Mesh;
  private lastRender = 0;
  private capCanvas!: HTMLCanvasElement;
  private capTexture!: THREE.CanvasTexture;
  private parts = {
    cap: new THREE.Group(),
    switch: new THREE.Group(),
    spring: new THREE.Group(),
    pcb: new THREE.Group(),
  };
  private geometries = new Set<THREE.BufferGeometry>();
  private materials: THREE.Material[] = [];
  private textures: THREE.Texture[] = [];
  private spread = 1;
  private current = 1;
  private selected = "cap";
  private dirty = true;
  private visible = true;
  private frame = 0;
  private struck = 0;
  private rotation = -0.35;
  private abort = new AbortController();
  private observer: IntersectionObserver;
  private resizeObserver: ResizeObserver;
  private reduced = matchMedia("(prefers-reduced-motion: reduce)");
  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.82;
    this.renderer.setClearColor(0, 0);
    host.append(this.renderer.domElement);
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(room, 0.035);
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 0.8;
    room.dispose();
    pmrem.dispose();
    this.scene.add(new THREE.HemisphereLight(0xc7e1ec, 0x101b23, 0.9));
    const key = new THREE.DirectionalLight(0xe9f4ff, 3);
    key.position.set(-5, 10, 8);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x9bcbc7, 4);
    rim.position.set(5, 8, -5);
    this.scene.add(rim);
    const mat = (color: string, metalness = 0.2, roughness = 0.4) => {
      const m = new THREE.MeshStandardMaterial({ color, metalness, roughness });
      this.materials.push(m);
      return m;
    };
    const shell = new THREE.MeshPhysicalMaterial({
      color: "#b8d2db",
      metalness: 0.05,
      roughness: 0.08,
      transmission: 0.86,
      thickness: 0.25,
      ior: 1.45,
      clearcoat: 1,
    });
    this.materials.push(shell);
    const stem = mat("#b0d7cb", 0.38, 0.25),
      copper = mat("#c5d2d6", 0.92, 0.19),
      pcb = mat("#101b22", 0.6),
      trace = mat("#769995", 0.65),
      dark = mat("#10181f");
    const add = (
      g: THREE.BufferGeometry,
      m: THREE.Material | THREE.Material[],
      group: THREE.Group,
      x = 0,
      y = 0,
      z = 0,
    ) => {
      const isolated = Array.isArray(m)
        ? m.map((material) => material.clone())
        : m.clone();
      this.materials.push(...(Array.isArray(isolated) ? isolated : [isolated]));
      const mesh = new THREE.Mesh(g, isolated);
      mesh.position.set(x, y, z);
      group.add(mesh);
      this.geometries.add(g);
      return mesh;
    };
    const box = (x: number, y: number, z: number, r = 0.08) =>
      new RoundedBoxGeometry(x, y, z, 3, r);
    add(box(4, 0.2, 4, 0.13), pcb, this.parts.pcb);
    for (const x of [-1.6, 1.6])
      for (const z of [-1.6, 1.6])
        add(
          new THREE.CylinderGeometry(0.1, 0.1, 0.025, 16),
          copper,
          this.parts.pcb,
          x,
          0.115,
          z,
        );
    for (let i = 0; i < 5; i++) {
      add(
        box(2.9 - i * 0.28, 0.016, 0.026, 0.008),
        trace,
        this.parts.pcb,
        0.12,
        0.115,
        -1.36 + i * 0.21,
      );
      add(
        box(0.026, 0.016, 1.4 - i * 0.16, 0.008),
        trace,
        this.parts.pcb,
        -1.33 + i * 0.21,
        0.115,
        -0.62 + i * 0.08,
      );
    }
    add(box(0.55, 0.07, 0.7, 0.02), dark, this.parts.pcb, 1.18, 0.13, 0.8);
    // Open frame: four walls surround a genuine central opening. All surfaces use depth testing.
    for (const x of [-1.06, 1.06]) {
      add(box(0.23, 0.22, 2.34), shell, this.parts.switch, x, 0.22, 0);
      add(box(0.23, 0.2, 2.34), shell, this.parts.switch, x, 1.5, 0);
    }
    for (const z of [-1.06, 1.06]) {
      add(box(2.34, 0.22, 0.23), shell, this.parts.switch, 0, 0.22, z);
      add(box(2.34, 0.2, 0.23), shell, this.parts.switch, 0, 1.5, z);
    }
    for (const x of [-1.04, 1.04])
      for (const z of [-1.04, 1.04])
        add(box(0.24, 1.28, 0.24), shell, this.parts.switch, x, 0.85, z);
    const glassPane = new THREE.MeshPhysicalMaterial({
      color: "#a7cbd1",
      roughness: 0.04,
      metalness: 0,
      transmission: 0.95,
      thickness: 0.04,
      ior: 1.45,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    this.materials.push(glassPane);
    for (const z of [-1.055, 1.055])
      add(
        box(1.85, 1.06, 0.035, 0.015),
        glassPane,
        this.parts.switch,
        0,
        0.86,
        z,
      );
    for (const x of [-1.055, 1.055])
      add(
        box(0.035, 1.06, 1.85, 0.015),
        glassPane,
        this.parts.switch,
        x,
        0.86,
        0,
      );
    const stemGroup = new THREE.Group();
    stemGroup.name = "stem";
    this.parts.switch.add(stemGroup);
    add(box(0.7, 0.55, 0.7, 0.07), stem, stemGroup, 0, 1.38, 0);
    add(box(0.22, 0.6, 0.64, 0.03), stem, stemGroup, 0, 1.88, 0);
    add(box(0.64, 0.6, 0.22, 0.03), stem, stemGroup, 0, 1.88, 0);
    const points = Array.from({ length: 241 }, (_, i) => {
      const t = i / 240;
      return new THREE.Vector3(
        Math.cos(t * Math.PI * 14) * 0.36,
        t * 1.3,
        Math.sin(t * Math.PI * 14) * 0.36,
      );
    });
    add(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        240,
        0.045,
        8,
        false,
      ),
      copper,
      this.parts.spring,
    );
    const geometry = createCapGeometry(
      {
        code: "Escape",
        label: "esc",
        units: 1,
        row: 0,
        x: 0,
        z: 0,
        zone: "accent",
      },
      "cherry",
      0,
    );
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++)
      uv.setXY(i, uv.getX(i) * 16, (uv.getY(i) - 0.875) * 8);
    geometry.scale(4, 2.5, 4);
    const canvas = document.createElement("canvas");
    this.capCanvas = canvas;
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#cedbdd";
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = "#24353c";
    ctx.font = "500 100px monospace";
    ctx.fillText("esc", 83, 180);
    ctx.font = "20px monospace";
    ctx.fillText("J / OBJECT STUDY", 85, 408);
    const tex = new THREE.CanvasTexture(canvas);
    this.capTexture = tex;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.textures.push(tex);
    const top = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.46 });
    this.materials.push(top);
    add(geometry, [shell, top], this.parts.cap);
    Object.values(this.parts).forEach((p) => this.object.add(p));
    this.scene.add(this.object);
    const glow = (color: string, opacity: number) => {
      const m = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      this.materials.push(m);
      return m;
    };
    // A single optical axis keeps the assembly legible without orbiting decoration.
    const axisGeometry = new THREE.CylinderGeometry(0.012, 0.012, 10, 8);
    this.geometries.add(axisGeometry);
    const axis = new THREE.Mesh(axisGeometry, glow("#b8e0d8", 0.12));
    axis.position.y = 4;
    this.object.add(axis);
    const scanGeo = new THREE.RingGeometry(2.45, 2.47, 96);
    this.geometries.add(scanGeo);
    this.burst = new THREE.Mesh(scanGeo, glow("#b9dfd5", 0));
    this.burst.rotation.x = -Math.PI / 2;
    this.object.add(this.burst);
    let x = 0,
      startX = 0,
      startY = 0,
      dragging = false;
    host.addEventListener(
      "pointerdown",
      (e) => {
        if (e.button !== 0) return;
        x = startX = e.clientX;
        startY = e.clientY;
        dragging = true;
        host.setPointerCapture(e.pointerId);
      },
      { signal: this.abort.signal },
    );
    host.addEventListener(
      "pointermove",
      (e) => {
        if (!dragging) return;
        this.rotation += (e.clientX - x) * 0.007;
        x = e.clientX;
        this.dirty = true;
      },
      { signal: this.abort.signal },
    );
    const stop = () => (dragging = false);
    host.addEventListener(
      "pointerup",
      (e) => {
        stop();
        if (Math.hypot(e.clientX - startX, e.clientY - startY) > 6) return;
        const r = host.getBoundingClientRect();
        const ray = new THREE.Raycaster();
        ray.setFromCamera(
          new THREE.Vector2(
            ((e.clientX - r.left) / r.width) * 2 - 1,
            1 - ((e.clientY - r.top) / r.height) * 2,
          ),
          this.camera,
        );
        if (ray.intersectObjects(this.parts.cap.children, true).length)
          host.dispatchEvent(new CustomEvent("openkey", { bubbles: true }));
      },
      { signal: this.abort.signal },
    );
    host.addEventListener("pointercancel", stop, { signal: this.abort.signal });
    this.observer = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this.dirty = true;
    });
    this.observer.observe(host);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
    this.tick();
  }
  setCap(label: string, art?: KeyArt) {
    const ctx = this.capCanvas.getContext("2d")!;
    ctx.fillStyle = "#cedbdd";
    ctx.fillRect(0, 0, 512, 512);
    if (art) {
      ctx.save();
      ctx.scale(4, 4);
      paintArt(ctx, art, 0, 0, 1.07, "#24353c");
      ctx.restore();
    } else {
      ctx.fillStyle = "#24353c";
      ctx.textAlign = "center";
      ctx.font = "500 70px monospace";
      ctx.fillText(label, 256, 270, 410);
    }
    this.capTexture.needsUpdate = true;
    this.dirty = true;
  }
  setExplode(value: number) {
    this.spread = value;
    this.dirty = true;
  }
  select(part: string) {
    this.selected = part;
    this.host.dataset.part = part;
    this.dirty = true;
  }
  strike() {
    this.struck = performance.now();
    this.dirty = true;
  }
  private resize() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (!w || !h) return;
    this.host.dataset.rendered = "false";
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }
  private tick = () => {
    this.frame = requestAnimationFrame(this.tick);
    if (!this.visible || document.hidden) return;
    const now = performance.now();
    if (!this.dirty && now - this.lastRender < 33) return;
    this.lastRender = now;
    const moving = Math.abs(this.current - this.spread) > 0.001;
    this.current = this.reduced.matches
      ? this.spread
      : THREE.MathUtils.lerp(this.current, this.spread, 0.14);
    const age = performance.now() - this.struck;
    const press =
      this.struck && age < 420 && !this.reduced.matches
        ? Math.sin((age / 420) * Math.PI) * 0.45
        : 0;
    const animating = this.struck > 0;
    if (!moving && !animating && !this.dirty && this.reduced.matches) return;
    if (age >= 420) this.struck = 0;
    const s = this.current;
    this.parts.pcb.position.y = 0;
    this.parts.spring.position.y = 0.22 + s * 1.35;
    this.parts.spring.scale.y = 1 - press * 0.55;
    this.parts.switch.position.y = 0.32 + s * 3.25;
    this.parts.switch.getObjectByName("stem")!.position.y = -press * 0.65;
    this.parts.cap.position.y = 2.45 + s * 5.1 - press;
    const t = this.reduced.matches ? 0 : now / 1000;
    this.object.rotation.y = this.rotation + Math.sin(t * 0.16) * 0.035;
    this.burst.position.y = this.parts.cap.position.y;
    this.burst.scale.setScalar(1 + Math.min(age / 750, 1) * 2);
    (this.burst.material as THREE.MeshBasicMaterial).opacity =
      this.struck && !this.reduced.matches ? Math.max(0, 1 - age / 420) : 0;
    this.camera.position.set(6, 5.8 + s * 4.2, 14.5 + s * 3);
    const fit = Math.max(1, 0.9 / this.camera.aspect);
    this.camera.position.multiplyScalar(fit);
    this.camera.lookAt(0, 1.45 + s * 2.9, 0);
    Object.entries(this.parts).forEach(([name, group]) =>
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          const ms = Array.isArray(obj.material)
            ? obj.material
            : [obj.material];
          ms.forEach((m: THREE.MeshStandardMaterial) => {
            m.emissive.set(name === this.selected ? "#091718" : "#000000");
          });
        }
      }),
    );
    this.renderer.render(this.scene, this.camera);
    this.dirty = false;
    this.host.dataset.frame = String(Number(this.host.dataset.frame ?? 0) + 1);
    this.host.dataset.rendered = "true";
    this.host.dataset.spread = this.current.toFixed(3);
  };
  dispose() {
    cancelAnimationFrame(this.frame);
    this.abort.abort();
    this.observer.disconnect();
    this.resizeObserver.disconnect();
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
    this.environment.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
