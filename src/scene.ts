import * as THREE from "three";
import { WonderField, type WorldName } from "./wonder-field";
import { paintArt, type KeyArt, type MaterialStyle } from "./key-art";
import { KeyEffects, type KeyEffect } from "./key-effects";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  initialConfig,
  contrastInk,
  type KeyboardConfig,
  type ViewName,
} from "./palettes";
import { keyColor, createCapGeometry, capDimensions } from "./keyboard-model";
import { getLayout, getShells, type KeyDefinition } from "./key-layout";
interface KeyInstance {
  definition: KeyDefinition;
  mesh: THREE.Mesh;
  side: THREE.MeshPhysicalMaterial;
  crystalTop?: THREE.MeshPhysicalMaterial;
  glow: THREE.Mesh;
  travel: number;
  held: boolean;
  pulseUntil: number;
  nextEffect: number;
}
export class KeyboardScene {
  private host: HTMLDivElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
  private board = new THREE.Group();
  private effects = new KeyEffects();
  private wonders = new WonderField();
  private railSweepStart = performance.now();
  private railSweep = { value: 100 };
  private editorialProgress: number | null = null;
  private portalHeld = false;
  private portalStart = 0;
  private portalProgress = 0;
  private portalSpent = false;
  private portalZoom = false;
  private introOrigin = "Escape";
  private selectionLift = 0;
  private waterUniforms = { clock: { value: 0 }, strength: { value: 0 } };
  private layout = getLayout("classic");
  private formScale = 1;
  private zoom = 1;
  private focusCode: string | null = null;
  private cameraFocus = new THREE.Vector3(0, 0.1, 0);
  private environment: THREE.WebGLRenderTarget;
  private geometries = new Set<THREE.BufferGeometry>();
  private materials: THREE.Material[] = [];
  private textures: THREE.Texture[] = [];
  private keys: KeyInstance[] = [];
  private body: THREE.MeshPhysicalMaterial;
  private topMaterial: THREE.MeshPhysicalMaterial;
  private glowMaterial: THREE.MeshBasicMaterial;
  private knobMaterial: THREE.MeshPhysicalMaterial;
  private canvas = document.createElement("canvas");
  private atlas: THREE.CanvasTexture;
  private config = initialConfig();
  private frame = 0;
  private dirty = true;
  private visible = true;
  private disposed = false;
  private lastTime = 0;
  private resizeObserver: ResizeObserver;
  private observer: IntersectionObserver;
  private abort = new AbortController();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private dragging = false;
  private dragDistance = 0;
  private lastX = 0;
  private lastY = 0;
  private pointerCode: string | null = null;
  private targetRotation = new THREE.Vector2(0, -0.08);
  private targetCamera = new THREE.Vector3(3.5, 13, 16);
  private reduced = matchMedia("(prefers-reduced-motion: reduce)");
  private painting = false;
  private materialStyle: MaterialStyle = "ice";
  private artwork = new Map<string, KeyArt>();
  private keyLight = new THREE.DirectionalLight(0xfff7e8, 2.6);
  private fillLight = new THREE.DirectionalLight(0xc3d7ff, 1.7);
  private editorialLight = new THREE.DirectionalLight(0xdaecff, 3.2);
  private selection: ((code: string) => void) | null = null;
  private introTime: number | null = null;
  private introWaiting = false;
  private brush!: THREE.CanvasTexture;
  private lightAngle = -30;
  private lightHeight = 55;
  private onKey: (code: string, down: boolean) => void;
  constructor(
    host: HTMLDivElement,
    onKey: (code: string, down: boolean) => void,
  ) {
    this.host = host;
    this.onKey = onKey;
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.setClearColor(0, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    host.append(this.renderer.domElement);
    const pmrem = new THREE.PMREMGenerator(this.renderer),
      room = new RoomEnvironment();
    this.environment = pmrem.fromScene(room, 0.035);
    this.scene.environment = this.environment.texture;
    this.scene.environmentIntensity = 0.65;
    pmrem.dispose();
    room.dispose();
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const light = this.keyLight;
    light.position.set(-4, 12, 7);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    Object.assign(light.shadow.camera, {
      left: -12,
      right: 12,
      top: 10,
      bottom: -10,
    });
    light.shadow.normalBias = 0.03;
    light.shadow.bias = -0.0001;
    this.scene.add(light);
    const fill = this.fillLight;
    fill.position.set(6, 7, -8);
    this.scene.add(fill);
    this.editorialLight.position.set(-12, 5, 8);
    this.editorialLight.visible = false;
    this.scene.add(this.editorialLight);
    this.body = this.material({
      color: this.config.body,
      metalness: 0.75,
      roughness: 0.32,
    });
    this.knobMaterial = this.material({
      color: "#9da5a6",
      metalness: 0.9,
      roughness: 0.22,
    });
    this.canvas.width = Math.min(
      4096,
      this.renderer.capabilities.maxTextureSize,
    );
    this.canvas.height = this.canvas.width / 2;
    this.atlas = new THREE.CanvasTexture(this.canvas);
    this.atlas.colorSpace = THREE.SRGBColorSpace;
    this.atlas.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.textures.push(this.atlas);
    this.topMaterial = new THREE.MeshPhysicalMaterial({
      map: this.atlas,
      roughness: 0.62,
      metalness: 0,
    });
    const waterShader = (material: THREE.MeshPhysicalMaterial) => {
      material.onBeforeCompile = (shader) => {
        shader.uniforms.judyWaterTime = this.waterUniforms.clock;
        shader.uniforms.judyWaterStrength = this.waterUniforms.strength;
        shader.vertexShader =
          "varying vec3 vJudySurface;\n" +
          shader.vertexShader.replace(
            "#include <worldpos_vertex>",
            "#include <worldpos_vertex>\nvJudySurface=(modelMatrix*vec4(transformed,1.0)).xyz;",
          );
        shader.fragmentShader =
          "varying vec3 vJudySurface;uniform float judyWaterTime;uniform float judyWaterStrength;\n" +
          shader.fragmentShader.replace(
            "#include <emissivemap_fragment>",
            "#include <emissivemap_fragment>\nfloat judyWave=pow(0.5+0.5*sin(vJudySurface.x*4.0+judyWaterTime+sin(vJudySurface.z*6.0-judyWaterTime*0.7)),10.0);totalEmissiveRadiance+=vec3(0.08,0.3,0.34)*judyWave*judyWaterStrength;",
          );
      };
      material.customProgramCacheKey = () => "judy-water-v1";
    };
    waterShader(this.topMaterial);
    waterShader(this.body);
    this.materials.push(this.topMaterial);
    this.glowMaterial = new THREE.MeshBasicMaterial({
      color: "#d8f3b3",
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    this.materials.push(this.glowMaterial);
    const brushCanvas = document.createElement("canvas");
    brushCanvas.width = 256;
    brushCanvas.height = 256;
    const brushContext = brushCanvas.getContext("2d")!;
    for (let y = 0; y < 256; y++) {
      const shade = 105 + ((y * 73) % 47);
      brushContext.fillStyle = `rgb(${shade},${shade},${shade})`;
      brushContext.fillRect(0, y, 256, 1);
    }
    this.brush = new THREE.CanvasTexture(brushCanvas);
    this.brush.wrapS = this.brush.wrapT = THREE.RepeatWrapping;
    this.brush.repeat.set(3, 3);
    this.textures.push(this.brush);
    this.build();
    this.applyConfig(this.config);
    this.scene.add(this.board);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50),
      new THREE.ShadowMaterial({ opacity: 0.2 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.04;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.geometries.add(ground.geometry);
    this.materials.push(ground.material);
    this.camera.position.copy(this.targetCamera);
    this.camera.lookAt(0, 0, 0);
    this.board.rotation.y = -0.08;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.observer = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (this.visible) this.dirty = true;
    });
    this.observer.observe(host);
    const options = { signal: this.abort.signal };
    host.addEventListener("pointerdown", this.pointerDown, options);
    host.addEventListener("pointermove", this.pointerMove, options);
    host.addEventListener("pointerup", this.pointerUp, options);
    host.addEventListener("pointercancel", this.pointerCancel, options);
    host.addEventListener(
      "pointerleave",
      () => {
        this.wonders.pointer = null;
      },
      options,
    );
    host.addEventListener("keydown", this.keyDown, options);
    this.renderer.domElement.addEventListener(
      "webglcontextrestored",
      () => {
        this.dirty = true;
      },
      options,
    );
    this.resize();
    this.animate();
  }
  private material(params: THREE.MeshPhysicalMaterialParameters) {
    const m = new THREE.MeshPhysicalMaterial(params);
    this.materials.push(m);
    return m;
  }
  private mesh(
    geo: THREE.BufferGeometry,
    mat: THREE.Material | THREE.Material[],
    x = 0,
    y = 0,
    z = 0,
    parent: THREE.Object3D = this.board,
  ) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    this.geometries.add(geo);
    return mesh;
  }
  private rebuild() {
    this.effects.clear();
    this.wonders.group.removeFromParent();
    this.wonders.resetKeys();
    this.effects.group.removeFromParent();
    const keep = new Set<THREE.Material>([
      this.body,
      this.knobMaterial,
      this.topMaterial,
      this.glowMaterial,
    ]);
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    this.board.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object instanceof THREE.InstancedMesh) object.dispose();
        geometries.add(object.geometry);
        (Array.isArray(object.material)
          ? object.material
          : [object.material]
        ).forEach((m) => {
          if (!keep.has(m)) materials.add(m);
        });
      }
    });
    geometries.forEach((g) => {
      g.dispose();
      this.geometries.delete(g);
    });
    materials.forEach((m) => {
      const map = (m as THREE.MeshBasicMaterial).map;
      if (map && map !== this.atlas) {
        map.dispose();
        this.textures = this.textures.filter((t) => t !== map);
      }
      m.dispose();
    });
    this.materials = this.materials.filter((m) => !materials.has(m));
    this.board.clear();
    this.keys = [];
    this.pointerCode = null;
    this.layout = getLayout(this.config.form);
    const points = getShells(this.config.form, this.layout).flat();
    const width =
      Math.max(...points.map((p) => p[0])) -
      Math.min(...points.map((p) => p[0]));
    const depth =
      Math.max(...points.map((p) => p[1])) -
      Math.min(...points.map((p) => p[1]));
    this.formScale = Math.max(width / 15.95, depth / 10);
    this.build();
    this.syncPressed();
  }
  private build() {
    this.board.add(this.effects.group, this.wonders.group);
    const dark = this.material({ color: "#1d252c", roughness: 0.7 }),
      trim = this.material({
        color: "#a9b2b5",
        metalness: 0.85,
        roughness: 0.3,
      });
    this.railSweepStart = performance.now();
    // Each layout gets an open, suspended rim above a separate tapered plinth.
    const rail = this.material({
      color: "#9dccde",
      emissive: "#78b8d2",
      emissiveIntensity: 0.45,
      metalness: 0.45,
      roughness: 0.28,
    });
    rail.onBeforeCompile = (shader) => {
      shader.uniforms.judyRailSweep = this.railSweep;
      shader.vertexShader =
        "varying float vRailX;\n" +
        shader.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvRailX=(modelMatrix*vec4(position,1.0)).x;",
        );
      shader.fragmentShader =
        "varying float vRailX;uniform float judyRailSweep;\n" +
        shader.fragmentShader.replace(
          "#include <emissivemap_fragment>",
          "#include <emissivemap_fragment>\nfloat sweep=exp(-pow((vRailX-judyRailSweep)*1.4,2.0));totalEmissiveRadiance+=vec3(0.35,0.7,0.85)*sweep;",
        );
    };
    rail.customProgramCacheKey = () => "judy-rail-sweep";
    const titanium = this.material({
      color: "#788e9f",
      metalness: 0.95,
      roughness: 0.24,
      bumpMap: this.brush,
      bumpScale: 0.012,
    });
    for (const polygon of getShells(this.config.form, this.layout)) {
      const cx = polygon.reduce((n, p) => n + p[0], 0) / polygon.length;
      const cz = polygon.reduce((n, p) => n + p[1], 0) / polygon.length;
      const zs = polygon.map((p) => p[1]);
      const minZ = Math.min(...zs),
        maxZ = Math.max(...zs);
      const path = (scale: number) =>
        polygon.map(
          ([x, z]) =>
            new THREE.Vector2(cx + (x - cx) * scale, -(cz + (z - cz) * scale)),
        );
      const solid = (scale: number, depth: number, bevel: number, hole = 0) => {
        const shape = new THREE.Shape(path(scale));
        shape.closePath();
        if (hole) {
          const cut = new THREE.Path(path(hole).reverse());
          cut.closePath();
          shape.holes.push(cut);
        }
        const g = new THREE.ExtrudeGeometry(shape, {
          depth,
          bevelEnabled: true,
          bevelSize: bevel,
          bevelThickness: bevel,
          bevelSegments: 3,
          steps: 1,
        });
        g.rotateX(-Math.PI / 2);
        return g;
      };
      const base = solid(0.985, 0.2, 0.045);
      const vertices = base.attributes.position;
      for (let i = 0; i < vertices.count; i++)
        vertices.setY(
          i,
          vertices.getY(i) + ((maxZ - vertices.getZ(i)) / (maxZ - minZ)) * 0.12,
        );
      base.computeVertexNormals();
      this.mesh(base, this.body, 0, -0.83, 0);
      this.mesh(solid(0.989, 0.015, 0.018, 0.952), titanium, 0, -0.62, 0);
      this.mesh(solid(1, 0.2, 0.035, 0.94), this.body, 0, -0.02, 0);
      this.mesh(solid(1.001, 0.012, 0.012, 0.968), titanium, 0, 0.198, 0);
      this.mesh(solid(0.951, 0.013, 0.009, 0.936), rail, 0, 0.055, 0);
      this.mesh(solid(0.932, 0.06, 0.015), dark, 0, 0.18, 0);
      for (let i = 0; i < 4; i++) {
        const point = polygon[Math.floor((i * polygon.length) / 4)];
        const x = cx + (point[0] - cx) * 0.68,
          z = cz + (point[1] - cz) * 0.68;
        const tilt = ((maxZ - z) / (maxZ - minZ)) * 0.12;
        const baseTop = -0.63 + tilt;
        this.mesh(
          new RoundedBoxGeometry(0.34, 0.2 - baseTop, 0.45, 2, 0.035),
          titanium,
          x,
          (0.2 + baseTop) / 2,
          z,
        );
        this.mesh(
          new THREE.CylinderGeometry(0.2, 0.25, 0.09, 24),
          dark,
          x,
          -0.83 + tilt - 0.045,
          z,
        );
      }
      // Follow the actual front edge, including angled and split shells.
      const edge = polygon
        .map((a, i) => ({ a, b: polygon[(i + 1) % polygon.length] }))
        .sort((a, b) => b.a[1] + b.b[1] - (a.a[1] + a.b[1]))[0];
      const dx = edge.b[0] - edge.a[0],
        dz = edge.b[1] - edge.a[1];
      const length = Math.hypot(dx, dz);
      for (let i = 0; i < 9; i++) {
        const t = 0.5 + ((i - 4) * Math.min(0.22, length / 12)) / length;
        const x = (edge.a[0] + dx * t) * 0.94 + cx * 0.06;
        const z = (edge.a[1] + dz * t) * 0.94 + cz * 0.06;
        const fin = this.mesh(
          new RoundedBoxGeometry(0.06, 0.4, 0.21, 2, 0.015),
          titanium,
          x,
          -0.16,
          z,
        );
        fin.rotation.y = -Math.atan2(dz, dx);
      }
    }
    const traceMaterial = this.material({
      color: "#648eaa",
      metalness: 0.65,
      roughness: 0.4,
      emissive: "#346080",
      emissiveIntensity: 0.12,
    });
    for (const dimensions of [
      [0.68, 0.008, 0.018],
      [0.018, 0.008, 0.62],
    ]) {
      const geometry = new THREE.BoxGeometry(
        ...(dimensions as [number, number, number]),
      );
      this.geometries.add(geometry);
      const traces = new THREE.InstancedMesh(
        geometry,
        traceMaterial,
        this.layout.length,
      );
      const transform = new THREE.Object3D();
      this.layout.forEach((key, i) => {
        transform.position.set(key.x, 0.292, key.z);
        transform.rotation.y = key.angle ?? 0;
        transform.updateMatrix();
        traces.setMatrixAt(i, transform.matrix);
      });
      this.board.add(traces);
    }
    this.layout.forEach((definition, index) => {
      const side = this.material({
        color: keyColor(definition, this.config),
        roughness: 0.58,
      });
      const crystalTop =
        definition.code === "Escape" ? this.topMaterial.clone() : undefined;
      if (crystalTop) this.materials.push(crystalTop);
      const mesh = this.mesh(
        createCapGeometry(definition, this.config.profile, index),
        [side, crystalTop ?? this.topMaterial],
        definition.x,
        0.32,
        definition.z,
      );
      const housing = this.mesh(
        new RoundedBoxGeometry(0.49, 0.16, 0.49, 2, 0.045),
        dark,
        definition.x,
        0.32,
        definition.z,
      );
      housing.rotation.y = definition.angle ?? 0;
      const stem = this.mesh(
        new THREE.BoxGeometry(0.24, 0.16, 0.24),
        trim,
        definition.x,
        0.34,
        definition.z,
      );
      stem.rotation.y = definition.angle ?? 0;
      const glow = this.mesh(
        new RoundedBoxGeometry(
          definition.units * 0.927 - 0.03,
          0.024,
          0.89,
          2,
          0.08,
        ),
        this.glowMaterial,
        definition.x,
        0.31,
        definition.z,
      );
      if (definition.code === "Space" || definition.inputCode === "Space") {
        const cap = capDimensions(
          this.config.profile,
          definition.row,
          definition.units,
        );
        const insert = this.mesh(
          new RoundedBoxGeometry(
            Math.min(definition.units * 0.42, 2.6),
            0.045,
            0.09,
            2,
            0.018,
          ),
          titanium,
          0,
          cap.height * 0.64,
          cap.depth * 0.47,
          mesh,
        );
        insert.name = "space-inlay";
        const mark = document.createElement("canvas");
        mark.width = 512;
        mark.height = 64;
        const ink = mark.getContext("2d")!;
        ink.fillStyle = "#152833";
        ink.font = "500 27px monospace";
        ink.textAlign = "center";
        ink.fillText("JUDY / 001", 256, 43);
        const map = new THREE.CanvasTexture(mark);
        map.colorSpace = THREE.SRGBColorSpace;
        this.textures.push(map);
        const engraving = new THREE.MeshBasicMaterial({
          map,
          transparent: true,
          depthWrite: false,
        });
        this.materials.push(engraving);
        const label = this.mesh(
          new THREE.PlaneGeometry(
            Math.min(definition.units * 0.36, 2.3),
            0.035,
          ),
          engraving,
          0,
          0,
          0.046,
          insert,
        );
        label.castShadow = false;
      }
      mesh.rotation.y = definition.angle ?? 0;
      glow.rotation.y = definition.angle ?? 0;
      glow.castShadow = false;
      glow.visible = false;
      this.keys.push({
        definition,
        mesh,
        side,
        crystalTop,
        glow,
        travel: 0,
        held: false,
        pulseUntil: 0,
        nextEffect: 0,
      });
    });
    if (this.config.form !== "classic") return;
    const knobX = 6.85,
      knobZ = -2.5;
    this.mesh(
      new THREE.CylinderGeometry(0.53, 0.53, 0.07, 64),
      dark,
      knobX,
      0.27,
      knobZ,
    );
    const collar = this.mesh(
      new THREE.TorusGeometry(0.475, 0.013, 8, 64),
      rail,
      knobX,
      0.319,
      knobZ,
    );
    collar.rotation.x = -Math.PI / 2;
    this.knobMaterial.bumpMap = this.brush;
    this.knobMaterial.bumpScale = 0.009;
    this.knobMaterial.roughness = 0.2;
    this.mesh(
      new THREE.CylinderGeometry(0.42, 0.45, 0.43, 64),
      this.knobMaterial,
      knobX,
      0.5,
      knobZ,
    );
    this.mesh(
      new THREE.CylinderGeometry(0.37, 0.37, 0.018, 64),
      this.body,
      knobX,
      0.727,
      knobZ,
    );
    const ridges = new THREE.BoxGeometry(0.014, 0.27, 0.025);
    for (let i = 0; i < 52; i++) {
      const a = (i / 52) * Math.PI * 2;
      const ridge = this.mesh(
        ridges,
        trim,
        knobX + Math.cos(a) * 0.422,
        0.53,
        knobZ + Math.sin(a) * 0.422,
      );
      ridge.rotation.y = -a;
    }
    this.mesh(
      new THREE.BoxGeometry(0.035, 0.018, 0.12),
      rail,
      knobX,
      0.741,
      knobZ - 0.2,
    );
    for (const x of [-7.65, 7.65])
      for (const z of [-3.06, 3.06]) {
        this.mesh(
          new THREE.CylinderGeometry(0.055, 0.055, 0.015, 16),
          trim,
          x,
          0.238,
          z,
        );
        this.mesh(new THREE.BoxGeometry(0.06, 0.004, 0.012), dark, x, 0.247, z);
      }
    this.mesh(
      new RoundedBoxGeometry(0.43, 0.13, 0.1, 3, 0.045),
      dark,
      -5.6,
      -0.02,
      -3.31,
    );
    const led = this.material({
      color: "#bfeab4",
      emissive: "#8ecaa0",
      emissiveIntensity: 1,
    });
    for (let i = 0; i < 3; i++)
      this.mesh(
        new THREE.CylinderGeometry(0.023, 0.023, 0.015, 12),
        i ? dark : led,
        7.72,
        0.25,
        -0.5 + i * 0.16,
      );
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 64;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#d4d9d4";
    ctx.font = "24px monospace";
    ctx.textAlign = "center";
    ctx.fillText("J U D Y   /   0 0 1", 256, 40);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.textures.push(tex);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
    });
    this.materials.push(mat);
    const badge = this.mesh(
      new THREE.PlaneGeometry(2.6, 0.16),
      mat,
      3.7,
      -0.68,
      3.26,
    );
    badge.castShadow = false;
  }
  private drawAtlas() {
    const ctx = this.canvas.getContext("2d")!;
    const scale = this.canvas.width / 2048;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    this.layout.forEach((key, i) => {
      const x = (i % 16) * 128,
        y = Math.floor(i / 16) * 128,
        color = keyColor(key, this.config);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 128, 128);
      ctx.fillStyle = contrastInk(color);
      ctx.textBaseline = "middle";
      const art = this.artwork.get(key.code);
      if (art && art.pattern !== "none") {
        const dimensions = capDimensions(
          this.config.profile,
          key.row,
          key.units,
        );
        const aspect =
          (dimensions.width - dimensions.taper * 2 - 0.025) /
          (dimensions.depth - dimensions.taper * 2 - 0.025);
        paintArt(ctx, art, x, y, aspect, contrastInk(color));
        return;
      }
      const minimal = this.config.legend === "minimal";
      let label =
        key.label === "space"
          ? "J U D Y"
          : key.label === "back"
            ? "←"
            : key.label;
      if (minimal && key.code === "Space") label = "—";
      else if (key.code === "Space") label = "JUDY / 001";
      // Compensate wide keys so the glyph aspect ratio remains constant on their actual surface.
      ctx.save();
      ctx.translate(x + 64, y + 64);
      ctx.scale(1 / Math.max(1, key.units * 0.9), 1);
      ctx.textAlign = minimal ? "center" : "left";
      ctx.font = `600 ${label.length > 2 ? 24 : 38}px Arial, sans-serif`;
      const px = minimal ? 0 : -34 * Math.max(1, key.units * 0.85);
      ctx.fillText(
        label,
        px,
        minimal ? 0 : key.secondary && this.config.legend === "dual" ? 17 : -8,
      );
      if (this.config.legend === "dual" && key.secondary) {
        ctx.globalAlpha = 0.68;
        ctx.font = "500 19px Arial";
        ctx.fillText(key.secondary, px, -28);
        ctx.globalAlpha = 1;
      }
      if (key.code === "KeyF" || key.code === "KeyJ") {
        ctx.globalAlpha = 0.55;
        ctx.fillRect(-11, 40, 22, 2);
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    });
    this.atlas.needsUpdate = true;
  }
  applyConfig(config: KeyboardConfig) {
    const profileChanged = config.profile !== this.config.profile;
    const formChanged = config.form !== this.config.form;
    this.config = { ...config, overrides: { ...config.overrides } };
    if (formChanged) {
      this.rebuild();
      this.selectKey(null, false);
    }
    this.body.color.set(config.body);
    const surface =
      config.finish === "ceramic"
        ? { metalness: 0.08, roughness: 0.21, clearcoat: 0.85 }
        : config.finish === "matte"
          ? { metalness: 0.12, roughness: 0.82, clearcoat: 0 }
          : { metalness: 0.75, roughness: 0.32, clearcoat: 0.12 };
    Object.assign(this.body, surface);
    this.keys.forEach((key, i) => {
      key.side.color.set(keyColor(key.definition, config));
      if (profileChanged && !formChanged) {
        this.geometries.delete(key.mesh.geometry);
        key.mesh.geometry.dispose();
        key.mesh.geometry = createCapGeometry(
          key.definition,
          config.profile,
          i,
        );
        this.geometries.add(key.mesh.geometry);
        const insert = key.mesh.getObjectByName("space-inlay");
        if (insert) {
          const dimensions = capDimensions(
            config.profile,
            key.definition.row,
            key.definition.units,
          );
          insert.position.y = dimensions.height * 0.64;
          insert.position.z = dimensions.depth * 0.47;
        }
      }
    });
    this.applyMaterial();
    this.drawAtlas();
    this.glowMaterial.color.set(config.accent);
    this.dirty = true;
    this.host.dataset.form = config.form;
    this.host.dataset.keyCount = String(this.layout.length);
    this.host.dataset.palette = config.palette;
    this.host.dataset.profile = config.profile;
    this.host.dataset.legend = config.legend;
    this.host.dispatchEvent(new CustomEvent("layoutchange"));
  }
  setMaterial(style: MaterialStyle) {
    this.materialStyle = style;
    this.applyMaterial();
    this.dirty = true;
  }
  private applyMaterial() {
    const style = this.materialStyle;
    this.host.dataset.material = style;
    const transparent = style === "ice" || style === "smoke";
    const signature = style === "original";
    const metal = style === "metal";
    const cream = style === "cream";
    const base =
      this.config.finish === "matte"
        ? 0.82
        : this.config.finish === "ceramic"
          ? 0.21
          : 0.32;
    Object.assign(this.body, {
      roughness: transparent ? 0.12 : metal ? 0.24 : cream ? 0.78 : base,
      metalness:
        transparent || cream
          ? 0
          : metal
            ? 1
            : this.config.finish === "anodized"
              ? 0.75
              : 0.08,
      transmission: transparent ? (style === "ice" ? 0.88 : 0.64) : 0,
      thickness: transparent ? 0.7 : 0,
      ior: 1.46,
      clearcoat: transparent ? 1 : cream ? 0 : 0.3,
      bumpMap: metal || cream || signature ? this.brush : null,
      bumpScale: metal ? 0.035 : cream ? 0.014 : signature ? 0.009 : 0,
    });
    this.body.color.set(
      style === "ice"
        ? "#d8f8ff"
        : style === "smoke"
          ? "#34434a"
          : cream
            ? "#c9b58f"
            : metal
              ? "#a5aeb9"
              : this.config.body,
    );
    for (const key of this.keys) {
      Object.assign(key.side, {
        transmission: transparent ? 0.8 : signature ? 0.58 : 0,
        thickness: 0.22,
        ior: 1.46,
        roughness: transparent ? 0.1 : metal ? 0.28 : cream ? 0.85 : 0.22,
        metalness: metal ? 0.85 : 0,
        clearcoat: transparent || signature ? 1 : 0,
      });
      key.side.color.set(
        transparent
          ? style === "ice"
            ? "#d4f4fb"
            : "#566572"
          : keyColor(key.definition, this.config),
      );
      const crystal = signature && key.definition.code === "Escape";
      if (crystal)
        Object.assign(key.side, {
          transmission: 0.9,
          roughness: 0.06,
          thickness: 0.38,
          ior: 1.45,
        });
      key.side.needsUpdate = true;
    }
    Object.assign(this.topMaterial, {
      transmission: transparent ? 0.5 : signature ? 0.18 : 0,
      thickness: 0.12,
      roughness: transparent ? 0.18 : metal ? 0.3 : cream ? 0.88 : 0.3,
      metalness: metal ? 0.75 : 0,
      clearcoat: transparent || signature ? 1 : 0,
      bumpMap: metal || cream ? this.brush : null,
      bumpScale: metal ? 0.015 : cream ? 0.009 : 0,
    });
    this.topMaterial.color.set(cream ? "#fff0cb" : "#ffffff");
    for (const key of this.keys)
      if (key.crystalTop) {
        key.crystalTop.copy(this.topMaterial);
        if (signature)
          Object.assign(key.crystalTop, {
            transmission: 0.36,
            roughness: 0.07,
            thickness: 0.3,
            ior: 1.45,
            clearcoat: 1,
            emissive: new THREE.Color("#183b49"),
            emissiveIntensity: 0.24,
          });
        key.crystalTop.needsUpdate = true;
      }
    this.body.needsUpdate = this.topMaterial.needsUpdate = true;
    this.host.dataset.chassis = "suspended";
  }
  setLight(preset: string, angle = this.lightAngle, height = this.lightHeight) {
    this.lightAngle = angle;
    this.lightHeight = height;
    const colors =
      preset === "sunset"
        ? [0xffad62, 0x8475ca]
        : preset === "neon"
          ? [0x80fff1, 0xda76ff]
          : [0xf1f6ff, 0xb7cff4];
    this.keyLight.color.setHex(colors[0]);
    this.fillLight.color.setHex(colors[1]);
    const a = (angle * Math.PI) / 180,
      h = (height * Math.PI) / 180;
    this.keyLight.position.set(
      Math.sin(a) * Math.cos(h) * 15,
      Math.sin(h) * 15,
      Math.cos(a) * Math.cos(h) * 15,
    );
    this.keyLight.intensity = preset === "neon" ? 3.5 : 2.6;
    this.dirty = true;
    this.host.dataset.light = preset;
  }
  setArt(code: string, art: KeyArt) {
    if (art.pattern === "none") this.artwork.delete(code);
    else this.artwork.set(code, art);
    this.drawAtlas();
    this.dirty = true;
    this.host.dataset.artCount = String(this.artwork.size);
  }
  getKeyAppearance(code: string) {
    const key = this.layout.find((key) => key.code === code) ?? this.layout[0];
    const d = capDimensions(this.config.profile, key.row, key.units);
    const color = keyColor(key, this.config);
    return {
      aspect: (d.width - d.taper * 2 - 0.025) / (d.depth - d.taper * 2 - 0.025),
      color,
      ink: contrastInk(color),
    };
  }
  getArt(code: string) {
    return this.artwork.get(code);
  }
  getKeys() {
    return this.layout;
  }
  selectKey(code: string | null, focus = true) {
    this.wonders.select(code);
    this.host.dataset.selectedKey = code ?? "";
    if (code && focus) this.focusKey(code);
    this.dirty = true;
    if (code)
      this.host.dispatchEvent(
        new CustomEvent("wondercue", { detail: "select" }),
      );
  }
  setWorld(name: WorldName, code: string) {
    this.wonders.setWorld(name, code);
    this.host.dataset.world = name;
    this.host.dataset.worldKey = code;
    this.dirty = true;
    if (name !== "none") this.selectKey(code);
  }
  setFloating(enabled: boolean) {
    const changed = this.wonders.floating !== enabled;
    this.wonders.floating = enabled;
    this.wonders.attracting = false;
    this.host.dataset.floating = String(enabled);
    this.dirty = true;
    this.selectKey(null, false);
    this.setView("studio");
    if (changed)
      this.host.dispatchEvent(
        new CustomEvent("wondercue", { detail: enabled ? "float" : "snap" }),
      );
  }
  attractKeys(enabled: boolean) {
    this.wonders.attracting = enabled;
    this.host.dataset.attracting = String(enabled);
    this.dirty = true;
  }
  setAtmosphere(name: string, motion = true) {
    this.wonders.setAtmosphere(name);
    this.wonders.environmentMotion = motion;
    this.waterUniforms.strength.value = name === "ocean" ? 1 : 0;
    this.host.dataset.contact = name;
    this.dirty = true;
  }
  setPortal(enabled: boolean) {
    this.wonders.portalEnabled = enabled;
    if (!enabled) this.holdPortal(false);
    this.dirty = true;
  }
  holdPortal(down: boolean) {
    if (down && !this.portalHeld) {
      this.portalStart = performance.now();
      this.portalSpent = false;
      this.host.dispatchEvent(
        new CustomEvent("wondercue", { detail: "portal" }),
      );
    }
    if (!down && this.portalHeld)
      this.host.dispatchEvent(
        new CustomEvent("wondercancel", { detail: "portal" }),
      );
    this.portalHeld = down;
    if (!down) {
      this.portalProgress = 0;
      if (this.portalZoom) {
        this.setView("studio");
        this.portalZoom = false;
      }
      this.host.dataset.portalProgress = "0";
    }
    this.dirty = true;
  }
  setSelection(callback: ((code: string) => void) | null) {
    this.selection = callback;
    this.host.classList.toggle("selecting-key", !!callback);
  }
  beginIntro() {
    this.wonders.floating = false;
    this.wonders.attracting = false;
    this.host.dataset.floating = "false";
    this.selectKey(null, false);
    this.wonders.resetKeys();
    this.introOrigin = this.keys[0].definition.code;
    this.introWaiting = true;
    this.board.children.forEach((child) => {
      child.visible = false;
    });
    this.keys[0].mesh.visible = true;
    this.keys[0].mesh.position.set(0, 2.5, 0);
    this.keys[0].mesh.scale.setScalar(2.8);
    this.wonders.select(this.introOrigin);
    this.wonders.group.visible = true;
    this.host.dataset.assembly = "waiting";
    this.dirty = true;
  }
  assemble(code = "Escape") {
    this.introOrigin =
      this.keys.find((key) => key.definition.code === code)?.definition.code ??
      this.keys[0].definition.code;
    this.host.dataset.assemblyKey = this.introOrigin;
    this.introWaiting = false;
    this.introTime = performance.now();
    this.host.dataset.assembly = "running";
  }
  finishIntro() {
    this.introWaiting = false;
    this.introTime = null;
    this.board.children.forEach((child) => {
      child.visible = true;
    });
    this.keys.forEach((k) => {
      k.mesh.position.set(k.definition.x, 0.32, k.definition.z);
      k.mesh.scale.setScalar(1);
      k.mesh.rotation.z = 0;
      k.glow.visible = false;
    });
    this.wonders.select(null);
    this.host.dataset.assembly = "complete";
    this.dirty = true;
  }
  async photograph(
    width: number,
    height: number,
    background: string,
    title: string,
  ) {
    const size = this.renderer.getSize(new THREE.Vector2());
    const ratio = this.renderer.getPixelRatio(),
      aspect = this.camera.aspect;
    const output = document.createElement("canvas");
    output.width = width;
    output.height = height;
    const ctx = output.getContext("2d")!;
    try {
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.render(this.scene, this.camera);
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, background);
      gradient.addColorStop(1, "#0b1117");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(this.renderer.domElement, 0, 0);
      const footer = ctx.createLinearGradient(0, height * 0.68, 0, height);
      footer.addColorStop(0, "#07120f00");
      footer.addColorStop(1, "#07120fe8");
      ctx.fillStyle = footer;
      ctx.fillRect(0, height * 0.68, width, height * 0.32);
      ctx.fillStyle = "#dce6e2";
      ctx.font = `${Math.round(width * 0.024)}px Arial`;
      ctx.fillText(
        title || "JUDY / PERSONAL OBJECT",
        width * 0.055,
        height * 0.89,
        width * 0.89,
      );
      ctx.font = `${Math.round(width * 0.009)}px monospace`;
      ctx.fillText(
        "CRAFTED BY YOU  /  JUDY OBJECTS",
        width * 0.055,
        height * 0.93,
      );
    } finally {
      this.renderer.setPixelRatio(ratio);
      this.renderer.setSize(size.x, size.y, false);
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
      this.dirty = true;
    }
    return new Promise<Blob>((resolve, reject) =>
      output.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("导出失败，请重试"))),
        "image/png",
      ),
    );
  }
  setPainting(enabled: boolean) {
    this.painting = enabled;
    this.host.classList.toggle("painting", enabled);
  }
  setEffect(mode: KeyEffect) {
    this.effects.mode = mode;
    this.effects.clear();
    this.dirty = true;
    this.host.dataset.effect = mode;
  }
  setKey(code: string, down: boolean) {
    const keys = this.keys.filter(
      (k) =>
        (k.definition.inputCode ?? k.definition.code) === code ||
        k.definition.code === code,
    );
    if (!keys.length) return false;
    if (
      code === "Escape" &&
      !this.host.classList.contains("in-immersive") &&
      !this.host.dataset.exclusive
    )
      this.holdPortal(down);
    if (code === "Space" && this.wonders.floating) this.attractKeys(down);
    if (down) this.wonders.strike(code);
    keys.forEach((key) => {
      if (down && !key.held && !this.reduced.matches)
        this.effects.trigger(
          key.definition.x,
          0.32 +
            capDimensions(this.config.profile, key.definition.row, 1).height +
            0.06,
          key.definition.z,
        );
      key.nextEffect = performance.now() + 600;
      key.held = down;
      key.pulseUntil = down ? performance.now() + 90 : 0;
    });
    this.dirty = true;
    this.syncPressed();
    return true;
  }
  releaseAll() {
    this.holdPortal(false);
    this.attractKeys(false);
    this.effects.clear();
    this.keys.forEach((k) => {
      k.held = false;
      k.pulseUntil = 0;
    });
    this.dirty = true;
    this.syncPressed();
  }
  private syncPressed() {
    this.host.dataset.pressed = this.keys
      .filter((k) => k.held)
      .map((k) => k.definition.code)
      .join(",");
  }
  setZoom(zoom: number) {
    this.zoom = zoom;
    this.dirty = true;
  }
  focusKey(code: string) {
    if (!this.layout.some((key) => key.code === code)) return;
    this.focusCode = code;
    this.zoom = 3;
    this.dirty = true;
  }
  setEditorialProgress(progress: number | null) {
    if (this.editorialProgress === progress) return;
    this.editorialProgress = progress;
    this.host.dataset.editorial =
      progress === null ? "off" : progress.toFixed(3);
    this.dirty = true;
  }
  setView(view: ViewName) {
    if (this.focusCode) this.zoom = 1;
    this.focusCode = null;
    this.targetCamera.copy(
      view === "top"
        ? new THREE.Vector3(0, 23, 0.001)
        : view === "side"
          ? new THREE.Vector3(2, 6, 23)
          : new THREE.Vector3(3.5, 13, 16),
    );
    this.targetRotation.set(0, view === "studio" ? -0.08 : 0);
    this.host.dataset.view = view;
    this.dirty = true;
  }
  resize() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (!w || !h) return;
    this.host.dataset.rendered = "false";
    this.host.dataset.settled = "false";
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }
  private hit(event: PointerEvent) {
    const r = this.host.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - r.left) / r.width) * 2 - 1,
      (-(event.clientY - r.top) / r.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(
      this.keys.map((k) => k.mesh),
      false,
    )[0];
    return this.keys.find((k) => k.mesh === hit?.object);
  }
  private pointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    if (this.introWaiting) {
      this.host.dispatchEvent(
        new CustomEvent("introactivate", {
          detail: this.introOrigin,
          bubbles: true,
        }),
      );
      return;
    }
    if (this.selection) {
      const key = this.hit(event);
      if (key) this.selection(key.definition.code);
      return;
    }
    this.dragging = true;
    this.dragDistance = 0;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.host.setPointerCapture(event.pointerId);
    const key = this.hit(event);
    if (key) {
      this.pointerCode = key.definition.code;
      if (!this.painting) this.setKey(this.pointerCode, true);
      this.onKey(this.pointerCode, true);
    }
    this.host.classList.add("dragging");
  };
  private pointerMove = (event: PointerEvent) => {
    const rect = this.host.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      1 - ((event.clientY - rect.top) / rect.height) * 2,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const point = this.raycaster.ray.intersectPlane(
      new THREE.Plane(new THREE.Vector3(0, 1, 0), -1),
      new THREE.Vector3(),
    );
    this.wonders.pointer = point ? this.board.worldToLocal(point) : null;
    if (this.wonders.floating || !this.dragging) return;
    const dx = event.clientX - this.lastX,
      dy = event.clientY - this.lastY;
    this.dragDistance += Math.abs(dx) + Math.abs(dy);
    if (this.dragDistance > 6 && !this.painting) {
      this.targetRotation.y += dx * 0.006;
      this.targetRotation.x = THREE.MathUtils.clamp(
        this.targetRotation.x + dy * 0.004,
        -0.4,
        0.4,
      );
    }
    this.lastX = event.clientX;
    this.lastY = event.clientY;
  };
  private pointerUp = (event: PointerEvent) => {
    this.pointerCancel();
    if (this.host.hasPointerCapture(event.pointerId))
      this.host.releasePointerCapture(event.pointerId);
  };
  private pointerCancel = () => {
    this.dragging = false;
    this.host.classList.remove("dragging");
    if (this.pointerCode) {
      this.setKey(this.pointerCode, false);
      this.onKey(this.pointerCode, false);
      this.pointerCode = null;
    }
  };
  private keyDown = (event: KeyboardEvent) => {
    if (!event.key.startsWith("Arrow") || this.host.dataset.live === "true")
      return;
    event.preventDefault();
    if (event.key === "ArrowLeft") this.targetRotation.y -= 0.15;
    if (event.key === "ArrowRight") this.targetRotation.y += 0.15;
    if (event.key === "ArrowUp")
      this.targetRotation.x = Math.max(-0.4, this.targetRotation.x - 0.1);
    if (event.key === "ArrowDown")
      this.targetRotation.x = Math.min(0.4, this.targetRotation.x + 0.1);
  };
  private animate = (time = 0) => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.animate);
    if (!this.visible || document.hidden) return;
    if (
      !this.dirty &&
      !this.dragging &&
      this.introTime === null &&
      time - this.lastTime < 33 &&
      !this.keys.some((key) => key.held)
    )
      return;
    const dt = Math.min((time - this.lastTime) / 1000, 0.25);
    this.lastTime = time;
    const blend = this.reduced.matches ? 1 : 1 - Math.exp(-dt * 12);
    let moving =
      Math.abs(this.board.rotation.x - this.targetRotation.x) +
        Math.abs(this.board.rotation.y - this.targetRotation.y) >
      0.0001;
    this.board.rotation.x = THREE.MathUtils.lerp(
      this.board.rotation.x,
      this.targetRotation.x,
      blend,
    );
    this.board.rotation.y = THREE.MathUtils.lerp(
      this.board.rotation.y,
      this.targetRotation.y,
      blend,
    );
    const now = performance.now();
    const railAge = (now - this.railSweepStart) / 2200;
    this.railSweep.value =
      this.reduced.matches || railAge > 1 ? 100 : -10 + railAge * 20;
    moving ||= !this.reduced.matches && railAge < 1;
    const portalAllowed =
      !this.host.classList.contains("in-immersive") &&
      !this.host.dataset.exclusive &&
      !this.selection;
    if (
      this.portalHeld &&
      this.wonders.portalEnabled &&
      portalAllowed &&
      !this.portalSpent
    ) {
      this.portalProgress = Math.min(1, (now - this.portalStart) / 1450);
      this.host.dataset.portalProgress = this.portalProgress.toFixed(3);
      if (this.portalProgress > 0.2 && !this.reduced.matches) {
        this.focusCode = "Escape";
        this.zoom = 1 + this.portalProgress * 6;
        this.portalZoom = true;
      }
      if (this.portalProgress === 1) {
        this.portalSpent = true;
        this.host.dispatchEvent(new CustomEvent("portalenter"));
      }
    }
    const target = this.targetCamera.clone();
    const aspect = this.host.clientWidth / this.host.clientHeight;
    target.multiplyScalar(this.formScale / this.zoom);
    if (this.host.classList.contains("in-immersive"))
      target.multiplyScalar(0.96);
    target.multiplyScalar(Math.min(Math.max(1, 1.55 / aspect), 2.1));
    if (
      innerWidth > 700 &&
      !this.host.classList.contains("in-config") &&
      !this.host.classList.contains("in-play") &&
      !this.host.classList.contains("in-immersive") &&
      !this.host.classList.contains("atelier-scene")
    )
      target.multiplyScalar(1.17);
    const focused = this.keys.find(
      (key) => key.definition.code === this.focusCode,
    );
    const lookAt = new THREE.Vector3(0, 0.1, 0);
    if (focused) {
      this.board.updateWorldMatrix(true, false);
      lookAt.copy(
        this.board.localToWorld(
          new THREE.Vector3(focused.definition.x, 0.5, focused.definition.z),
        ),
      );
      target.add(lookAt);
    }
    const editorial =
      this.editorialProgress !== null &&
      !this.host.dataset.exclusive &&
      !this.host.classList.contains("in-immersive") &&
      !this.portalHeld;
    if (editorial) {
      const p = this.reduced.matches ? 0.7 : this.editorialProgress!;
      const ease = p * p * (3 - 2 * p);
      const narrow = innerWidth < 700;
      target.set(9 - ease * 5, 8 + ease * 8, 10 + ease * 10);
      target.multiplyScalar(this.formScale * (narrow ? 1.32 : 1));
      lookAt.set(narrow ? 0 : -3.5 + ease * 1.2, 0, 0);
    }
    this.editorialLight.visible = editorial;
    this.keyLight.visible = this.fillLight.visible = !editorial;
    this.renderer.toneMappingExposure = editorial ? 0.75 : 0.95;
    this.scene.environmentIntensity = editorial ? 0.3 : 0.65;
    moving ||= this.cameraFocus.distanceToSquared(lookAt) > 0.000001;
    this.cameraFocus.lerp(lookAt, blend);
    moving ||= this.camera.position.distanceToSquared(target) > 0.000001;
    this.camera.position.lerp(target, blend);
    this.camera.lookAt(this.cameraFocus);
    const selectionTarget = this.wonders.selectedCode ? 0.2 : 0;
    this.selectionLift = THREE.MathUtils.lerp(
      this.selectionLift,
      selectionTarget,
      blend,
    );
    let keyIndex = 0;
    for (const key of this.keys) {
      const pressed = key.held || now < key.pulseUntil;
      const travel = pressed
        ? Math.min(
            0.13,
            capDimensions(this.config.profile, key.definition.row, 1).height *
              0.45,
          )
        : 0;
      moving ||= Math.abs(key.travel - travel) > 0.0001;
      key.travel = THREE.MathUtils.lerp(
        key.travel,
        travel,
        this.reduced.matches ? 1 : 1 - Math.exp(-dt * 34),
      );
      if (!this.introWaiting) {
        const offset = this.wonders.offset(
          key,
          keyIndex++,
          dt,
          time / 1000,
          this.reduced.matches,
        );
        const lift =
          key.definition.code === this.wonders.selectedCode
            ? this.selectionLift
            : 0;
        key.mesh.position.set(
          key.definition.x + offset.x,
          0.32 - key.travel + offset.y + lift,
          key.definition.z + offset.z,
        );
        if (
          editorial &&
          key.definition.code === "Escape" &&
          !this.reduced.matches
        ) {
          const lift = Math.max(0, (this.editorialProgress! - 0.78) / 0.22);
          key.mesh.position.y += lift * lift * (3 - 2 * lift) * 2.2;
        }
        key.mesh.rotation.y = key.definition.angle ?? 0;
        key.mesh.rotation.z =
          this.wonders.floating && !this.reduced.matches
            ? Math.sin(time / 1000 + keyIndex) * 0.04
            : 0;
        moving ||=
          offset.lengthSq() > 0.000001 ||
          Math.abs(this.selectionLift - selectionTarget) > 0.001;
      }
      if (!this.introWaiting && this.introTime === null)
        key.mesh.visible =
          this.wonders.worldName === "none" ||
          key.definition.code !== this.wonders.worldCode;
      key.glow.visible = pressed;
      key.side.emissive.set("#53cab2");
      key.side.emissiveIntensity =
        pressed && this.effects.mode !== "none" ? 0.5 : 0;
      if (
        key.held &&
        !this.reduced.matches &&
        this.effects.mode !== "none" &&
        now >= key.nextEffect
      ) {
        this.effects.trigger(
          key.definition.x,
          0.32 +
            capDimensions(this.config.profile, key.definition.row, 1).height +
            0.06,
          key.definition.z,
        );
        key.nextEffect = now + 600;
      }
    }
    if (this.introWaiting && !this.reduced.matches) {
      const key = this.keys[0];
      key.mesh.position.y = 2.5 + Math.sin(now / 850) * 0.12;
      key.mesh.rotation.y = Math.sin(now / 1700) * 0.15;
      moving = true;
    }
    this.waterUniforms.clock.value = this.wonders.environmentPhase;
    this.wonders.separate(this.keys);
    moving =
      this.wonders.tick(
        this.keys,
        dt,
        now,
        this.reduced.matches,
        this.portalProgress,
        portalAllowed,
      ) || moving;
    if (!this.portalHeld) this.wonders.portal.visible = false;
    if (this.introWaiting || this.introTime !== null) {
      this.wonders.world.visible = false;
      this.wonders.portal.visible = false;
      if (this.introWaiting) this.wonders.selection.scale.setScalar(2.8);
    }
    if (this.wonders.atmosphere === "ocean") {
      this.keys.forEach((key, i) => {
        if (!key.held) {
          key.side.emissive.set("#4c9dab");
          key.side.emissiveIntensity =
            0.14 +
            (Math.sin(this.wonders.environmentPhase / 1.4 + i * 0.7) + 1) *
              0.08;
        }
      });
    }
    if (this.introTime !== null) {
      const elapsed = (now - this.introTime) / 1000;
      this.board.children.forEach((child) => {
        child.visible = true;
      });
      const origin = this.keys.find(
        (key) => key.definition.code === this.introOrigin,
      )!;
      this.wonders.select(this.introOrigin, this.introTime);
      this.wonders.group.visible = true;
      this.keys.forEach((key) => {
        const distance = Math.hypot(
          key.definition.x - origin.definition.x,
          key.definition.z - origin.definition.z,
        );
        const p = THREE.MathUtils.clamp(
          (elapsed - distance * 0.065 - 0.28) / 0.85,
          0,
          1,
        );
        key.mesh.visible = p > 0;
        key.glow.visible = p > 0.7 && p < 0.98;
        key.mesh.position.set(
          key.definition.x,
          0.32 + Math.pow(1 - p, 3) * 3,
          key.definition.z,
        );
        key.mesh.scale.setScalar(0.7 + p * 0.3);
        if (key.definition.code === this.introOrigin) {
          const settle = 1 - Math.pow(1 - Math.min(1, elapsed / 0.95), 3);
          key.mesh.visible = true;
          key.mesh.position.set(
            key.definition.x * settle,
            2.5 * (1 - settle) + 0.32 * settle,
            key.definition.z * settle,
          );
          key.mesh.scale.setScalar(2.8 - settle * 1.8);
        }
        key.side.emissive.set("#79e8d1");
        key.side.emissiveIntensity = Math.sin(p * Math.PI) * 0.8;
      });
      moving = true;
      if (elapsed > 2.9 || this.reduced.matches) this.finishIntro();
    }
    moving = this.effects.tick(now) || moving;
    if (!this.dirty && !moving) {
      this.host.dataset.settled = "true";
      return;
    }
    this.renderer.render(this.scene, this.camera);
    this.dirty = false;
    this.host.dataset.rendered = "true";
    this.host.dataset.settled = String(!moving);
  };
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.abort.abort();
    this.resizeObserver.disconnect();
    this.observer.disconnect();
    this.wonders.group.removeFromParent();
    this.board.traverse((object) => {
      if (object instanceof THREE.InstancedMesh) object.dispose();
    });
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
    this.effects.dispose();
    this.wonders.dispose();
    this.artwork.clear();
    this.environment.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
