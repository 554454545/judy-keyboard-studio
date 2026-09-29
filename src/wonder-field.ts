import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
export type WorldName = "none" | "station" | "moon" | "jelly" | "garden";
export interface WonderKey {
  definition: { code: string; x: number; z: number; units: number };
  mesh: THREE.Mesh;
  held: boolean;
}
export class WonderField {
  readonly group = new THREE.Group();
  readonly selection = new THREE.Group();
  readonly portal = new THREE.Group();
  readonly world = new THREE.Group();
  private weather = new THREE.Group();
  private geometries = new Set<THREE.BufferGeometry>();
  private materials = new Set<THREE.Material>();
  private worldGeometries = new Set<THREE.BufferGeometry>();
  private worldMaterials = new Set<THREE.Material>();
  private worldTextures = new Set<THREE.Texture>();
  private rings: THREE.Mesh[] = [];
  private portalDisk: THREE.Mesh<THREE.CircleGeometry, THREE.ShaderMaterial>;
  private terrain = new THREE.Group();
  private animated: THREE.Object3D[] = [];
  private fieldLight = new THREE.PointLight(0xff9849, 0, 28, 1.2);
  private rain: THREE.LineSegments;
  private snow: THREE.InstancedMesh;
  private beads: THREE.InstancedMesh;
  private motes: THREE.Points;
  private powder: THREE.Points;
  private impacts = new Map<string, number>();
  private temp = new THREE.Object3D();
  private offsets = new Map<string, { p: THREE.Vector3; v: THREE.Vector3 }>();
  selectedCode: string | null = null;
  selectedAt = 0;
  worldName: WorldName = "none";
  worldCode = "Escape";
  worldReaction = 0;
  floating = false;
  attracting = false;
  pointer: THREE.Vector3 | null = null;
  atmosphere = "none";
  environmentMotion = true;
  private environmentTime = 0;
  portalEnabled = true;
  private selectionMaterial: THREE.MeshBasicMaterial;
  constructor() {
    this.group.name = "wonder-field";
    this.group.add(
      this.selection,
      this.portal,
      this.world,
      this.weather,
      this.fieldLight,
    );
    this.selectionMaterial = this.material(
      new THREE.MeshBasicMaterial({
        color: 0x66d0ab,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    const ringGeometry = this.geometry(
      new THREE.TorusGeometry(0.55, 0.007, 6, 80),
    );
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(ringGeometry, this.selectionMaterial);
      ring.rotation.x = Math.PI / 2;
      this.selection.add(ring);
      this.rings.push(ring);
    }
    this.portalDisk = new THREE.Mesh(
      this.geometry(new THREE.CircleGeometry(0.32, 48)),
      this.material(
        new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          uniforms: { time: { value: 0 }, charge: { value: 0 } },
          vertexShader:
            "varying vec2 p;void main(){p=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
          fragmentShader: `varying vec2 p;uniform float time;uniform float charge;void main(){float r=length(p);float a=atan(p.y,p.x);float spiral=pow(.5+.5*sin(a*5.+r*22.-time*3.),3.);float edge=exp(-pow((r-.82)*20.,2.));float core=exp(-r*r*12.)*(.2+charge);vec3 c=mix(vec3(.18,.12,.7),vec3(.2,1.,.84),spiral);float alpha=(spiral*.5+edge+core)*(1.-smoothstep(.9,1.,r));gl_FragColor=vec4(c*(.6+charge*2.),alpha);}`,
        }),
      ),
    );
    this.portalDisk.rotation.x = -Math.PI / 2;
    this.portal.add(this.portalDisk);
    const gate = new THREE.Mesh(
      this.geometry(new THREE.TorusGeometry(0.32, 0.015, 8, 64)),
      this.material(
        new THREE.MeshBasicMaterial({
          color: 0x9a91ff,
          transparent: true,
          opacity: 0.8,
        }),
      ),
    );
    gate.rotation.x = Math.PI / 2;
    this.portal.add(gate);
    const rainGeometry = this.geometry(
      new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute(new Float32Array(120 * 6), 3),
      ),
    );
    this.rain = new THREE.LineSegments(
      rainGeometry,
      this.material(
        new THREE.LineBasicMaterial({
          color: 0xbbdce5,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
        }),
      ),
    );
    this.rain.frustumCulled = false;
    this.snow = new THREE.InstancedMesh(
      this.geometry(new THREE.SphereGeometry(1, 12, 6)),
      this.material(
        new THREE.MeshStandardMaterial({ color: 0xf1f8ff, roughness: 1 }),
      ),
      100,
    );
    this.beads = new THREE.InstancedMesh(
      this.geometry(new THREE.SphereGeometry(0.036, 8, 6)),
      this.material(
        new THREE.MeshPhysicalMaterial({
          color: 0xc7e8ed,
          roughness: 0.04,
          metalness: 0.1,
          transmission: 0.55,
          thickness: 0.05,
        }),
      ),
      100,
    );
    const moteGeo = this.geometry(
      new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute(new Float32Array(80 * 3), 3),
      ),
    );
    this.motes = new THREE.Points(
      moteGeo,
      this.material(
        new THREE.PointsMaterial({
          color: 0xdde9f1,
          size: 0.045,
          transparent: true,
          opacity: 0.7,
          depthWrite: false,
        }),
      ),
    );
    this.motes.frustumCulled = false;
    this.snow.frustumCulled = this.beads.frustumCulled = false;
    const powderGeometry = this.geometry(
      new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute(new Float32Array(96 * 3), 3),
      ),
    );
    this.powder = new THREE.Points(
      powderGeometry,
      this.material(
        new THREE.PointsMaterial({
          color: 0xe8f3fc,
          size: 0.03,
          transparent: true,
          opacity: 0.7,
          depthWrite: false,
        }),
      ),
    );
    this.powder.frustumCulled = false;
    this.weather.add(this.rain, this.snow, this.beads, this.motes, this.powder);
    this.selection.visible = this.world.visible = this.weather.visible = false;
  }
  private geometry<T extends THREE.BufferGeometry>(g: T) {
    this.geometries.add(g);
    return g;
  }
  private material<T extends THREE.Material>(m: T) {
    this.materials.add(m);
    return m;
  }
  select(code: string | null, now = performance.now()) {
    this.selectedCode = code;
    this.selectedAt = now;
  }
  resetKeys() {
    this.offsets.clear();
    this.pointer = null;
  }
  height(key: WonderKey) {
    if (!key.mesh.geometry.boundingBox) key.mesh.geometry.computeBoundingBox();
    return key.mesh.geometry.boundingBox!.max.y;
  }
  setWorld(name: WorldName, code: string) {
    this.worldGeometries.forEach((g) => g.dispose());
    this.worldMaterials.forEach((m) => m.dispose());
    this.worldGeometries.clear();
    this.worldMaterials.clear();
    this.worldTextures.forEach((t) => t.dispose());
    this.worldTextures.clear();
    this.world.clear();
    this.animated = [];
    this.worldName = name;
    this.worldCode = code;
    this.world.visible = name !== "none";
    if (name === "none") return;
    const mat = (color: number, emissive = 0) => {
      const m = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.5,
        metalness: 0.15,
        emissive,
        emissiveIntensity: 0.6,
      });
      this.worldMaterials.add(m);
      return m;
    };
    const add = (
      g: THREE.BufferGeometry,
      m: THREE.Material,
      x = 0,
      y = 0,
      z = 0,
      parent: THREE.Object3D = this.world,
    ) => {
      this.worldGeometries.add(g);
      this.worldMaterials.add(m);
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    };
    const box = (x: number, y: number, z: number) =>
      new RoundedBoxGeometry(x, y, z, 2, Math.min(0.025, y / 3));
    const sphere = (r: number) => new THREE.SphereGeometry(r, 16, 10);
    const mint = mat(0x63bd90),
      gold = mat(0xe8ba72, 0x845522),
      dark = mat(0x172b3c),
      white = mat(0xe0e9e5);
    this.terrain = new THREE.Group();
    this.world.add(this.terrain);
    add(box(0.79, 0.08, 0.76), dark, 0, 0, 0);
    const rim = mat(name === "jelly" ? 0x4fcad8 : 0xb1ebcb, 0x3f9696);
    for (const z of [-0.37, 0.37]) add(box(0.8, 0.02, 0.018), rim, 0, 0.045, z);
    for (const x of [-0.39, 0.39])
      add(box(0.018, 0.02, 0.74), rim, x, 0.045, 0);
    if (name === "station") {
      add(box(0.7, 0.035, 0.18), white, 0, 0.07, 0.18, this.terrain);
      add(box(0.38, 0.02, 0.08), gold, 0.04, 0.18, -0.05, this.terrain);
      for (const x of [-0.1, 0.18])
        add(box(0.018, 0.1, 0.018), gold, x, 0.12, -0.05, this.terrain);
      add(box(0.025, 0.52, 0.025), white, -0.26, 0.3, -0.22, this.terrain);
      add(box(0.22, 0.025, 0.12), gold, -0.17, 0.55, -0.22, this.terrain);
      add(box(0.17, 0.12, 0.025), mint, 0.25, 0.36, -0.22, this.terrain);
      const signCanvas = document.createElement("canvas");
      signCanvas.width = 256;
      signCanvas.height = 128;
      const signContext = signCanvas.getContext("2d")!;
      signContext.fillStyle = "#162d37";
      signContext.fillRect(0, 0, 256, 128);
      signContext.fillStyle = "#d2ead5";
      signContext.font = "bold 42px monospace";
      signContext.textAlign = "center";
      signContext.fillText("JUDY", 128, 54);
      signContext.font = "28px monospace";
      signContext.fillText("23:59", 128, 100);
      const signTexture = new THREE.CanvasTexture(signCanvas);
      signTexture.colorSpace = THREE.SRGBColorSpace;
      this.worldTextures.add(signTexture);
      add(
        new THREE.PlaneGeometry(0.165, 0.1),
        new THREE.MeshBasicMaterial({ map: signTexture }),
        0.25,
        0.36,
        -0.204,
        this.terrain,
      );
      add(box(0.015, 0.2, 0.015), white, 0.25, 0.1, -0.22, this.terrain);
      for (let i = 0; i < 14; i++) {
        const drop = add(
          new THREE.CylinderGeometry(0.003, 0.003, 0.1, 4),
          mat(0x94d5f6, 0x325f88),
          ((i % 4) - 1.5) * 0.16,
          0.1 + (i % 5) * 0.11,
          (Math.floor(i / 4) - 1.5) * 0.15,
          this.terrain,
        );
        drop.userData.rain = true;
        this.animated.push(drop);
      }
    } else if (name === "moon") {
      add(
        new THREE.CylinderGeometry(0.34, 0.36, 0.06, 32),
        mat(0x8d94a5),
        0,
        0.07,
        0,
        this.terrain,
      );
      for (let i = 0; i < 6; i++)
        add(
          sphere(0.035 + (i % 2) * 0.02),
          dark,
          Math.sin(i * 3) * 0.22,
          0.09,
          Math.cos(i * 3) * 0.23,
          this.terrain,
        ).scale.y = 0.3;
      const astronaut = new THREE.Group();
      astronaut.position.set(-0.1, 0.12, 0.03);
      this.terrain.add(astronaut);
      add(box(0.13, 0.17, 0.1), white, 0, 0.12, 0, astronaut);
      add(sphere(0.083), white, 0, 0.25, 0, astronaut);
      const visor = add(sphere(0.06), gold, 0, 0.25, 0.082, astronaut);
      visor.scale.z = 0.45;
      for (const x of [-0.04, 0.04])
        add(box(0.04, 0.09, 0.06), white, x, 0.025, 0, astronaut);
      add(box(0.018, 0.4, 0.018), white, 0.2, 0.27, 0.03, this.terrain);
      add(box(0.12, 0.08, 0.008), mint, 0.25, 0.44, 0.03, this.terrain);
      const globe = document.createElement("canvas");
      globe.width = 256;
      globe.height = 128;
      const ctx = globe.getContext("2d")!;
      ctx.fillStyle = "#286ca5";
      ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = "#6caa81";
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.ellipse(
          (i * 43) % 256,
          30 + (i % 3) * 25,
          18,
          12 + (i % 3) * 5,
          i * 0.4,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.strokeStyle = "#d0e5e699";
      ctx.lineWidth = 4;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.ellipse(70 * i, 26 * i + 18, 50, 8, 0.2, 0, Math.PI * 2);
        ctx.stroke();
      }
      const globeTexture = new THREE.CanvasTexture(globe);
      globeTexture.colorSpace = THREE.SRGBColorSpace;
      this.worldTextures.add(globeTexture);
      const earth = add(
        sphere(0.11),
        new THREE.MeshStandardMaterial({ map: globeTexture, roughness: 0.6 }),
        0.2,
        0.52,
        -0.23,
        this.terrain,
      );
      earth.userData.earth = true;
      this.animated.push(earth);
    } else if (name === "jelly") {
      for (let j = 0; j < 3; j++) {
        const jelly = new THREE.Group();
        jelly.position.set(
          (j - 1) * 0.2,
          0.26 + (j % 2) * 0.15,
          (j % 2) * 0.18 - 0.08,
        );
        this.terrain.add(jelly);
        jelly.userData.base = jelly.position.y;
        this.animated.push(jelly);
        const color = j % 2 ? mat(0xb496ef, 0x6b3bb1) : mat(0x7af1e7, 0x218c91);
        add(
          new THREE.SphereGeometry(0.1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
          color,
          0,
          0,
          0,
          jelly,
        );
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          const points = Array.from(
            { length: 10 },
            (_, n) =>
              new THREE.Vector3(
                Math.cos(a) * 0.05 + Math.sin(n * 0.6) * 0.012,
                -n * 0.022,
                Math.sin(a) * 0.05,
              ),
          );
          add(
            new THREE.TubeGeometry(
              new THREE.CatmullRomCurve3(points),
              16,
              0.004,
              4,
              false,
            ),
            color,
            0,
            0,
            0,
            jelly,
          );
        }
      }
    } else {
      add(
        new THREE.CylinderGeometry(0.35, 0.35, 0.04, 32),
        mat(0x466f51),
        0,
        0.065,
        0,
        this.terrain,
      );
      for (let i = 0; i < 5; i++) {
        const tree = new THREE.Group();
        tree.position.set(-0.28 + i * 0.14, 0.08, -0.19 + Math.sin(i) * 0.04);
        this.terrain.add(tree);
        add(
          new THREE.CylinderGeometry(0.012, 0.018, 0.2, 6),
          gold,
          0,
          0.1,
          0,
          tree,
        );
        const leaf = add(
          sphere(0.075),
          i % 2 ? mat(0x3f8654) : mint,
          0,
          0.25,
          0,
          tree,
        );
        leaf.scale.set(0.6, 1.4, 0.75);
        tree.userData.plant = true;
        this.animated.push(tree);
      }
      const bunny = new THREE.Group();
      bunny.position.set(0, 0.09, 0.13);
      this.terrain.add(bunny);
      bunny.userData.bunny = true;
      this.animated.push(bunny);
      add(sphere(0.078), white, 0, 0.07, 0, bunny);
      add(sphere(0.064), white, 0, 0.15, 0.035, bunny);
      for (const x of [-0.027, 0.027]) {
        const ear = add(sphere(0.025), white, x, 0.235, 0.03, bunny);
        ear.scale.y = 2.6;
        add(sphere(0.008), dark, x, 0.16, 0.095, bunny);
        const inner = add(sphere(0.014), mat(0xd89d9e), x, 0.235, 0.05, bunny);
        inner.scale.y = 2.8;
      }
    }
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0xcbe8e9,
      roughness: 0.04,
      metalness: 0,
      transmission: 0.9,
      thickness: 0.07,
      ior: 1.2,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    add(box(0.84, 0.67, 0.81), glass, 0, 0.35, 0);
    const frame = new THREE.MeshBasicMaterial({
      color: 0x8fbcb4,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      toneMapped: false,
    });
    for (const x of [-0.41, 0.41])
      for (const z of [-0.395, 0.395])
        add(box(0.009, 0.65, 0.009), frame, x, 0.36, z);
    for (const z of [-0.395, 0.395])
      add(box(0.83, 0.009, 0.009), frame, 0, 0.685, z);
    for (const x of [-0.41, 0.41])
      add(box(0.009, 0.009, 0.8), frame, x, 0.685, 0);
  }
  offset(
    key: WonderKey,
    index: number,
    dt: number,
    time: number,
    reduced: boolean,
  ) {
    let state = this.offsets.get(key.definition.code);
    if (!state) {
      state = { p: new THREE.Vector3(), v: new THREE.Vector3() };
      this.offsets.set(key.definition.code, state);
    }
    const target = new THREE.Vector3();
    if (this.floating) {
      if (this.attracting) {
        const angle = index * 2.39996 + time * 0.12;
        const radius = 1.8 + (index % 3) * 0.4;
        target.set(
          Math.cos(angle) * radius - key.definition.x,
          1 + (index % 11) * 0.22,
          Math.sin(angle) * radius - key.definition.z,
        );
        if (key.definition.units > 4)
          target.set(-key.definition.x, 3.7, -key.definition.z);
      } else {
        target.set(
          Math.sin(time * 0.6 + index) * 0.1,
          0.8 + Math.sin(time * 0.9 + index * 0.7) * 0.14,
          Math.cos(time * 0.6 + index) * 0.08,
        );
      }
      if (this.pointer && !this.attracting) {
        const dx = key.definition.x + state.p.x - this.pointer.x,
          dz = key.definition.z + state.p.z - this.pointer.z;
        const distance = Math.hypot(dx, dz);
        if (distance < 2.3) {
          const strength = (2.3 - distance) * 0.9;
          target.x += (dx / Math.max(0.15, distance)) * strength;
          target.z += (dz / Math.max(0.15, distance)) * strength;
          target.y += strength * 0.2;
        }
      }
    }
    if (reduced) state.p.copy(target);
    else {
      const step = Math.min(dt, 0.035);
      state.v.addScaledVector(target.clone().sub(state.p), step * 38);
      state.v.multiplyScalar(Math.exp(-step * 10));
      state.p.addScaledVector(state.v, step);
      if (
        !this.floating &&
        state.p.lengthSq() < 0.000001 &&
        state.v.lengthSq() < 0.00001
      ) {
        state.p.set(0, 0, 0);
        state.v.set(0, 0, 0);
      }
    }
    return state.p;
  }
  get environmentPhase() {
    return this.environmentTime;
  }
  separate(keys: WonderKey[]) {
    if (!this.floating) return;
    for (let pass = 0; pass < 5; pass++)
      for (let i = 0; i < keys.length; i++)
        for (let j = i + 1; j < keys.length; j++) {
          const a = keys[i],
            b = keys[j];
          const overlap = [
            ((a.definition.units + b.definition.units) * 0.927) / 2 -
              0.035 -
              Math.abs(a.mesh.position.x - b.mesh.position.x),
            0.43 - Math.abs(a.mesh.position.y - b.mesh.position.y),
            0.84 - Math.abs(a.mesh.position.z - b.mesh.position.z),
          ];
          if (overlap.some((v) => v <= 0)) continue;
          const axis =
            overlap[0] < overlap[1] && overlap[0] < overlap[2]
              ? "x"
              : overlap[1] < overlap[2]
                ? "y"
                : "z";
          const amount = Math.min(...overlap) * 0.51,
            sign = a.mesh.position[axis] >= b.mesh.position[axis] ? 1 : -1;
          a.mesh.position[axis] += amount * sign;
          b.mesh.position[axis] -= amount * sign;
          this.offsets.get(a.definition.code)!.p[axis] += amount * sign;
          this.offsets.get(b.definition.code)!.p[axis] -= amount * sign;
        }
  }
  setAtmosphere(name: string) {
    if (this.atmosphere !== name) this.environmentTime = 0;
    this.atmosphere = name;
  }
  strike(code: string) {
    this.impacts.set(code, performance.now());
    if (code === this.worldCode) this.worldReaction = 1;
  }
  tick(
    keys: WonderKey[],
    dt: number,
    now: number,
    reduced: boolean,
    portalProgress: number,
    portalAllowed: boolean,
  ) {
    const t = reduced ? 0 : now / 1000;
    const selected = keys.find((k) => k.definition.code === this.selectedCode);
    this.selection.visible = !!selected;
    if (selected) {
      this.selection.position.copy(selected.mesh.position);
      this.selection.position.y += 0.045;
      const age = reduced ? 2 : (now - this.selectedAt) / 1000;
      this.rings.forEach((ring, i) => {
        ring.visible = i === 0 || age < 0.7;
        ring.position.y = i * 0.012;
        const expand = age < 0.7 ? 1 + age * 3 : 1;
        ring.scale.set((1 + i * 0.2) * expand, (1 + i * 0.2) * expand, 1);
        ring.rotation.z = reduced ? 0 : t * (i % 2 ? -0.4 : 0.4);
        (ring.material as THREE.MeshBasicMaterial).opacity =
          age < 0.7 ? 0.7 : 0.55;
      });
      this.selection.scale.x = Math.max(
        1,
        Math.sqrt(selected.definition.units),
      );
    }
    const escape = keys.find((k) => k.definition.code === "Escape");
    this.portal.visible =
      !!escape &&
      this.portalEnabled &&
      portalAllowed &&
      (this.worldName === "none" ||
        this.worldCode !== "Escape" ||
        portalProgress > 0);
    if (escape) {
      this.portal.position.copy(escape.mesh.position);
      this.portal.position.y += this.height(escape) + 0.018;
      this.portal.rotation.y = escape.mesh.rotation.y;
      this.portalDisk.material.uniforms.time.value = t;
      this.portalDisk.material.uniforms.charge.value = portalProgress;
      this.portal.scale.setScalar(1 + portalProgress * 2.5);
    }
    const worldKey = keys.find((k) => k.definition.code === this.worldCode);
    this.world.visible = this.worldName !== "none" && !!worldKey;
    this.worldReaction = Math.max(0, this.worldReaction - dt * 2);
    if (worldKey && this.worldName !== "none") {
      this.world.position.copy(worldKey.mesh.position);
      this.world.rotation.y = worldKey.mesh.rotation.y;
      this.terrain.rotation.y = this.worldReaction * 0.12;
      this.animated.forEach((object, i) => {
        if (object.userData.rain)
          object.position.y = 0.08 + (1 - ((t * 0.65 + i * 0.07) % 1)) * 0.5;
        else if (object.userData.earth) object.rotation.y = t * 0.3;
        else if (object.userData.plant)
          object.rotation.z = reduced ? 0 : Math.sin(t + i) * 0.08;
        else if (object.userData.bunny) {
          object.position.y = 0.09 + this.worldReaction * 0.16;
          object.rotation.y = this.worldReaction * 0.5;
        } else
          object.position.y =
            Number(object.userData.base) +
            Math.sin(t * 1.4 + i) * 0.035 +
            this.worldReaction * 0.06;
      });
    }
    const recent = [...this.impacts].filter(([, at]) => now - at < 850);
    this.impacts.forEach((at, code) => {
      if (now - at >= 850) this.impacts.delete(code);
    });
    this.powder.visible =
      recent.length > 0 &&
      ["snow", "paper", "waterfall"].includes(this.atmosphere) &&
      !reduced;
    if (this.powder.visible) {
      const positions = this.powder.geometry.attributes.position;
      for (let i = 0; i < 96; i++) {
        const [code, at] = recent[i % recent.length],
          key = keys.find((k) => k.definition.code === code);
        const age = (now - at) / 1000;
        if (!key) {
          positions.setXYZ(i, 0, -50, 0);
          continue;
        }
        positions.setXYZ(
          i,
          key.mesh.position.x + Math.sin(i * 2.4) * age * 0.7,
          key.mesh.position.y +
            this.height(key) +
            0.04 +
            age * (0.8 + (i % 4) * 0.15) -
            age * age * 1.7,
          key.mesh.position.z + Math.cos(i * 2.4) * age * 0.6,
        );
      }
      positions.needsUpdate = true;
    }
    const active = this.atmosphere !== "none";
    this.weather.visible = active;
    if (!reduced && this.environmentMotion)
      this.environmentTime += Math.min(dt, 0.05);
    const w = this.environmentTime;
    this.rain.visible = this.atmosphere === "paper";
    this.beads.visible = ["paper", "waterfall"].includes(this.atmosphere);
    this.snow.visible = this.atmosphere === "snow";
    this.motes.visible =
      active && !["ocean", "paper"].includes(this.atmosphere);
    this.fieldLight.intensity =
      this.atmosphere === "fire"
        ? 3.2 + (Math.sin(w * 13) + Math.sin(w * 21)) * 0.45
        : this.atmosphere === "ocean"
          ? 1.6
          : 0;
    this.fieldLight.color.set(
      this.atmosphere === "ocean" ? 0x4ca8ba : 0xff8744,
    );
    this.fieldLight.position.set(-4 + Math.sin(w * 0.6) * 3, 3, 1);
    if (active && keys.length) {
      this.snow.count = this.beads.count = Math.min(keys.length, 100);
      keys.slice(0, 100).forEach((key, i) => {
        const top = key.mesh.position.y + this.height(key);
        this.temp.position.copy(key.mesh.position);
        this.temp.position.y = top + 0.014;
        this.temp.position.z -= 0.25;
        this.temp.position.x += Math.sin(i * 4.2) * 0.12;
        this.temp.rotation.set(0, key.mesh.rotation.y, 0);
        const melted = key.held ? 0.12 : 1;
        this.temp.scale.set(
          key.definition.units * (0.14 + (i % 4) * 0.035) * melted,
          (0.022 + (i % 3) * 0.005) * melted,
          (0.045 + (i % 3) * 0.009) * melted,
        );
        this.temp.updateMatrix();
        this.snow.setMatrixAt(i, this.temp.matrix);
        this.temp.position.x += Math.sin(i * 3) * 0.18;
        this.temp.position.z +=
          Math.cos(i * 2) * 0.2 + (key.held ? Math.sin(w * 9) * 0.2 : 0);
        this.temp.position.y = top + 0.02;
        this.temp.scale.set(1.2, 0.45, 1.4);
        this.temp.updateMatrix();
        this.beads.setMatrixAt(i, this.temp.matrix);
      });
      this.snow.instanceMatrix.needsUpdate =
        this.beads.instanceMatrix.needsUpdate = true;
      const positions = this.rain.geometry.attributes.position;
      for (let i = 0; i < 120; i++) {
        const key = keys[i % keys.length];
        const y = ((((i * 0.137 - w * 2) % 1) + 1) % 1) * 3;
        const x = key.mesh.position.x + Math.sin(i) * 0.25,
          z = key.mesh.position.z + Math.cos(i) * 0.25;
        positions.setXYZ(i * 2, x, y + 0.5, z);
        positions.setXYZ(i * 2 + 1, x - 0.04, y + 0.72, z);
      }
      positions.needsUpdate = true;
      const points = this.motes.geometry.attributes.position;
      for (let i = 0; i < 80; i++) {
        const key = keys[i % keys.length],
          snow = this.atmosphere === "snow";
        const y =
          ((((i * 0.127 + (snow ? -w * 0.16 : w * 0.1)) % 1) + 1) % 1) * 3;
        points.setXYZ(
          i,
          key.mesh.position.x + Math.sin(w + i) * 0.2,
          y + 0.6,
          key.mesh.position.z + Math.cos(i) * 0.18,
        );
      }
      points.needsUpdate = true;
      (this.motes.material as THREE.PointsMaterial).color.set(
        this.atmosphere === "fire"
          ? 0xffc06b
          : this.atmosphere === "dune"
            ? 0xd7b587
            : 0xd1f2e1,
      );
    }
    return (
      !reduced &&
      (this.portal.visible ||
        this.world.visible ||
        this.selection.visible ||
        (active && this.environmentMotion) ||
        this.floating)
    );
  }
  dispose() {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.worldGeometries.forEach((g) => g.dispose());
    this.worldMaterials.forEach((m) => m.dispose());
    this.worldTextures.forEach((t) => t.dispose());
    this.snow.dispose();
    this.beads.dispose();
  }
}
