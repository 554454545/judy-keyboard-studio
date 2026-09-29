import type { GestureSound } from "./sound";
import type { WorldName } from "./wonder-field";
import type { KeyboardScene } from "./scene";
import type { ArtPattern, KeyArt, MaterialStyle } from "./key-art";
import "./atelier.css";

export function setupAtelier(
  scene: KeyboardScene,
  host: HTMLElement,
  onMaterial: (style: MaterialStyle) => void,
  sound: {
    enable(): Promise<boolean>;
    cue(name: GestureSound, code?: string): void;
    cancel(name?: GestureSound): void;
  },
) {
  const root = document.createElement("section");
  root.className = "atelier";
  root.setAttribute("aria-labelledby", "atelier-title");
  root.innerHTML = `
    <header><span class="tiny">THE PERSONAL OBJECT / 04</span><h3 id="atelier-title">把细节，留给自己。</h3><p>材质、光线，还有一颗只属于你的键帽。</p></header>
    <div class="craft-tabs" role="tablist" aria-label="定制工坊">${[
      ["material", "材质"],
      ["light", "灯光"],
      ["art", "键帽图案"],
      ["world", "微缩世界"],
    ]
      .map(
        ([id, label], i) =>
          `<button role="tab" id="craft-tab-${id}" data-craft-tab="${id}" aria-controls="craft-panel-${id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${label}</button>`,
      )
      .join("")}</div>
    <fieldset id="craft-panel-material" role="tabpanel" aria-labelledby="craft-tab-material"><legend>01 / 触碰一种材质</legend><div class="material-grid">
    ${[
      ["original", "原始搭配", "ORIGINAL"],
      ["ice", "透明冰晶", "FROST / GLASS"],
      ["smoke", "烟黑半透", "SMOKED / GLASS"],
      ["cream", "复古奶油", "WARM / MATTE"],
      ["metal", "拉丝金属", "BRUSHED / ALLOY"],
    ]
      .map(
        ([id, name, en]) =>
          `<button data-material="${id}" aria-pressed="${id === "ice"}"><i class="material-sample sample-${id}"></i><strong>${name}</strong><small>${en}</small></button>`,
      )
      .join(
        "",
      )}</div><p class="atelier-help" id="material-note">透光外壳与清亮键帽，内部轴心若隐若现。侧光下看得更清楚。</p><label class="pair-material"><input id="pair-material" type="checkbox" checked> 随材质搭配键音与灯光</label></fieldset>
    <fieldset hidden id="craft-panel-light" role="tabpanel" aria-labelledby="craft-tab-light"><legend>02 / 光线由你导演</legend><div class="atelier-segments" id="light-presets"><button data-light="day" aria-pressed="true">冷白工作灯</button><button data-light="sunset" aria-pressed="false">落日侧光</button><button data-light="neon" aria-pressed="false">霓虹夜色</button></div>
    <div id="light-pad" tabindex="0" role="slider" aria-label="拖动灯光方向，也可使用方向键" aria-valuemin="-180" aria-valuemax="180" aria-valuenow="-30"><div class="light-orbit"></div><span>DRAG THE LIGHT</span><i id="light-dot"></i></div>
    <div class="atelier-ranges"><label>方位 <input id="light-angle" type="range" min="-180" max="180" value="-30"></label><label>高度 <input id="light-height" type="range" min="15" max="85" value="55"></label></div></fieldset>
    <fieldset hidden id="craft-panel-art" role="tabpanel" aria-labelledby="craft-tab-art"><legend>03 / 一颗私人键帽</legend><div class="art-target"><label>定制按键<select id="art-key"></select></label><button id="art-pick">在键盘上点选 ↗</button></div>
    <div class="art-preview"><canvas id="art-preview" width="384" height="128" aria-label="当前键帽图案预览"></canvas><span id="art-status" role="status">图案只应用在选中的键帽上</span></div>
    <div class="art-patterns" role="group" aria-label="键帽图案">${[
      ["none", "原字标"],
      ["star", "✦ 星芒"],
      ["bunny", "兔子"],
      ["orbit", "行星"],
      ["wave", "波浪"],
      ["text", "刻字"],
    ]
      .map(
        ([id, name]) =>
          `<button data-art="${id}" aria-pressed="${id === "none"}">${name}</button>`,
      )
      .join("")}</div>
    <label class="art-text-label">键帽刻字<input id="art-text" type="text" maxlength="18" value="BunnyJudy" placeholder="最多 18 个字符"></label>
    <label class="art-upload">＋ 上传自己的图片<input id="art-upload" type="file" accept="image/png,image/jpeg,image/webp"></label>
    <div class="art-target"><label>图片布局<select id="art-fit"><option value="contain">完整显示</option><option value="cover">铺满并居中裁切</option></select></label><button id="art-clear">还原这颗键帽</button></div>
    <p class="atelier-help">PNG / JPG / WebP，最大 8 MB。图片仅在本机处理；本次定制刷新后清空，可在摄影台导出留念。</p></fieldset>
    <fieldset hidden id="craft-panel-world" role="tabpanel" aria-labelledby="craft-tab-world"><legend>04 / 一颗键里的另一个世界</legend>
    <p class="world-target">装入 <strong id="world-target">Space</strong> · 在「键帽图案」页选择其他按键</p>
    <div class="world-cards">${[
      ["station", "雨夜车站", "LAST TRAIN / 23:59", "☂"],
      ["moon", "月球基地", "A SMALL STEP", "◒"],
      ["jelly", "深海水母", "SLOW BLUE", "◌"],
      ["garden", "小兔温室", "A LITTLE LIFE", "♧"],
    ]
      .map(
        ([id, name, en, icon]) =>
          `<button data-world="${id}" aria-pressed="false"><i>${icon}</i><strong>${name}</strong><small>${en}</small></button>`,
      )
      .join("")}</div>
    <div class="world-actions"><button id="world-closeup">走近这个世界 ↗</button><button data-world="none" aria-pressed="true">取下收藏键帽</button></div><p class="atelier-help">一把键盘可装一颗微缩收藏键帽。敲击它，看看里面的回应；原图案保留在下面。</p></fieldset>
    <div class="wonder-controls"><div><span class="tiny">ESC / INTO THE UNKNOWN</span><h4>把入口，藏在一颗键里。</h4><p>长按 Esc 约 1.5 秒，穿过传送门进入全景。</p></div><button id="portal-hold" aria-label="按住开启传送门">按住，穿过 Esc <span>↗</span></button><label><input id="portal-toggle" type="checkbox" checked> 传送门</label><button id="gravity-toggle" aria-pressed="false">开启失重桌面 ↗</button><button id="gravity-attract" hidden>按住聚拢 · 松开散开</button><p id="gravity-help">失重后移动鼠标推开键帽，按住空格聚拢，关闭后磁吸归位。</p></div>
    <div class="atelier-bottom"><button id="inspect-key">拆开选中的键 ↗</button><button id="open-photo" class="atelier-primary">为我的键盘拍一张大片 ↗</button><button id="replay-assembly">重看组装开场 ↻</button></div>`;
  document.querySelector(".controls")!.append(root);
  const q = <T extends HTMLElement>(id: string) => root.querySelector<T>(id)!;
  const tabs = [
    ...root.querySelectorAll<HTMLButtonElement>("[data-craft-tab]"),
  ];
  const switchTab = (tab: HTMLButtonElement) => {
    tabs.forEach((t) => {
      const active = t === tab;
      t.setAttribute("aria-selected", String(active));
      t.tabIndex = active ? 0 : -1;
      q<HTMLElement>(`#craft-panel-${t.dataset.craftTab}`).hidden = !active;
    });
  };
  tabs.forEach((tab, index) => {
    tab.onclick = () => switchTab(tab);
    tab.onkeydown = (e) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      const next =
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? tabs.length - 1
            : (index + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) %
              tabs.length;
      switchTab(tabs[next]);
      tabs[next].focus();
    };
  });
  const shortcut = document.createElement("button");
  shortcut.className = "craft-shortcut";
  shortcut.textContent = "材质 / 定制 ↗";
  document.querySelector(".preview-bottom > .tiny")!.replaceWith(shortcut);
  shortcut.onclick = () => {
    document.querySelector<HTMLButtonElement>("#design-open")?.click();
    root.scrollIntoView({ behavior: "smooth", block: "start" });
    tabs
      .find((t) => t.getAttribute("aria-selected") === "true")
      ?.focus({ preventScroll: true });
  };
  const keySelect = q<HTMLSelectElement>("#art-key");
  const status = q<HTMLElement>("#art-status");
  const fit = q<HTMLSelectElement>("#art-fit");
  const text = q<HTMLInputElement>("#art-text");
  const preview = q<HTMLCanvasElement>("#art-preview");
  let currentKey = "Space",
    picking = false,
    uploadGeneration = 0;
  const notes: Record<MaterialStyle, string> = {
    original: "保留当前配色与表面处理。拖动键盘观察不同角度。",
    ice: "透光外壳与清亮键帽，内部轴心若隐若现。侧光下看得更清楚。",
    smoke: "深色半透表面，冷光在边缘聚集。试试霓虹夜色。",
    cream: "温暖外壳与细腻磨砂，搭配落日侧光，像一件熟悉的老物件。",
    metal: "细密拉丝与金属反射。拖动灯光，让高光沿表面流动。",
  };
  root.querySelectorAll<HTMLButtonElement>("[data-material]").forEach(
    (button) =>
      (button.onclick = () => {
        const style = button.dataset.material as MaterialStyle;
        scene.setMaterial(style);
        q("#material-note").textContent = notes[style];
        if (q<HTMLInputElement>("#pair-material").checked) {
          onMaterial(style);
          const preset =
            style === "cream" ? "sunset" : style === "smoke" ? "neon" : "day";
          q<HTMLButtonElement>(`[data-light="${preset}"]`).click();
        }
        root
          .querySelectorAll("[data-material]")
          .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      }),
  );
  let light = "day";
  const angle = q<HTMLInputElement>("#light-angle"),
    elevation = q<HTMLInputElement>("#light-height");
  const pad = q<HTMLElement>("#light-pad");
  const updateLight = () => {
    scene.setLight(light, Number(angle.value), Number(elevation.value));
    q("#light-dot").style.left =
      `${((Number(angle.value) + 180) / 360) * 100}%`;
    q("#light-dot").style.top =
      `${100 - ((Number(elevation.value) - 15) / 70) * 100}%`;
    pad.setAttribute("aria-valuenow", angle.value);
    pad.setAttribute(
      "aria-valuetext",
      `方位 ${angle.value} 度，高度 ${elevation.value} 度`,
    );
  };
  angle.oninput = elevation.oninput = updateLight;
  root.querySelectorAll<HTMLButtonElement>("[data-light]").forEach(
    (button) =>
      (button.onclick = () => {
        light = button.dataset.light!;
        root
          .querySelectorAll("[data-light]")
          .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
        updateLight();
      }),
  );
  let dragging = false;
  const moveLight = (e: PointerEvent) => {
    if (!dragging) return;
    const r = pad.getBoundingClientRect();
    angle.value = String(
      Math.round(
        Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * 360 - 180,
      ),
    );
    elevation.value = String(
      Math.round(
        85 - Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) * 70,
      ),
    );
    updateLight();
  };
  pad.onpointerdown = (e) => {
    dragging = true;
    pad.setPointerCapture(e.pointerId);
    moveLight(e);
  };
  pad.onpointermove = moveLight;
  pad.onpointerup = pad.onpointercancel = () => {
    dragging = false;
  };
  pad.onkeydown = (e) => {
    if (!e.key.startsWith("Arrow")) return;
    e.preventDefault();
    if (e.key === "ArrowLeft" || e.key === "ArrowRight")
      angle.value = String(
        Number(angle.value) + (e.key === "ArrowLeft" ? -10 : 10),
      );
    else
      elevation.value = String(
        Number(elevation.value) + (e.key === "ArrowUp" ? 5 : -5),
      );
    updateLight();
  };
  updateLight();
  const refreshArt = async () => {
    const art = scene.getArt(currentKey);
    root
      .querySelectorAll<HTMLButtonElement>("[data-art]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.art === (art?.pattern || "none")),
        ),
      );
    q("#world-target").textContent = currentKey;
    if (art?.text) text.value = art.text;
    fit.value = art?.fit || "contain";
    const appearance = scene.getKeyAppearance(currentKey);
    preview.width = Math.round(128 * appearance.aspect);
    const ctx = preview.getContext("2d")!;
    ctx.fillStyle = appearance.color;
    ctx.fillRect(0, 0, preview.width, 128);
    if (art) {
      const { paintArt } = await import("./key-art");
      ctx.save();
      ctx.scale(appearance.aspect, 1);
      paintArt(ctx, art, 0, 0, appearance.aspect, appearance.ink);
      ctx.restore();
    } else {
      ctx.fillStyle = appearance.ink;
      ctx.font = "24px monospace";
      ctx.textAlign = "center";
      ctx.fillText(currentKey, preview.width / 2, 74, preview.width - 20);
    }
  };
  const updateKeys = () => {
    const keys = scene.getKeys();
    if (!keys.some((k) => k.code === currentKey)) currentKey = keys[0].code;
    keySelect.replaceChildren(
      ...keys.map((k) => {
        const o = document.createElement("option");
        o.value = k.code;
        o.textContent = k.code === "Space" ? "Space / 空格" : k.label;
        o.selected = k.code === currentKey;
        return o;
      }),
    );
    void refreshArt();
  };
  host.addEventListener("layoutchange", updateKeys);
  updateKeys();
  const stopPicking = () => {
    picking = false;
    scene.setSelection(null);
    q("#art-pick").textContent = "在键盘上点选 ↗";
  };
  host.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && picking) {
      stopPicking();
      status.textContent = "已取消点选";
    }
  });
  keySelect.onchange = () => {
    currentKey = keySelect.value;
    scene.selectKey(currentKey);
    uploadGeneration++;
    void refreshArt();
  };
  q("#art-pick").onclick = () => {
    if (picking) {
      stopPicking();
      return;
    }
    picking = true;
    q("#art-pick").textContent = "取消点选";
    status.textContent = "点击三维键盘上的一颗键帽";
    scene.setSelection((code) => {
      currentKey = code;
      keySelect.value = code;
      scene.selectKey(code);
      uploadGeneration++;
      stopPicking();
      void refreshArt();
      status.textContent = `已选中 ${code}`;
    });
    host.scrollIntoView({ behavior: "smooth", block: "center" });
    host.focus({ preventScroll: true });
  };
  const applyArt = (art: KeyArt) => {
    scene.setArt(currentKey, art);
    scene.selectKey(currentKey, false);
    void refreshArt();
    status.textContent = `${currentKey} 已更新`;
  };
  root.querySelectorAll<HTMLButtonElement>("[data-art]").forEach(
    (button) =>
      (button.onclick = () => {
        uploadGeneration++;
        applyArt({
          pattern: button.dataset.art as ArtPattern,
          text: text.value,
        });
      }),
  );
  text.oninput = () => {
    uploadGeneration++;
    applyArt({ pattern: "text", text: text.value });
  };
  fit.onchange = () => {
    const art = scene.getArt(currentKey);
    if (art?.pattern === "image")
      applyArt({ ...art, fit: fit.value as "contain" | "cover" });
  };
  q("#art-clear").onclick = () => {
    uploadGeneration++;
    applyArt({ pattern: "none" });
  };
  q<HTMLInputElement>("#art-upload").onchange = async (e) => {
    const input = e.target as HTMLInputElement,
      file = input.files?.[0];
    input.value = "";
    if (!file) return;
    const generation = ++uploadGeneration,
      target = currentKey;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 8 * 1024 * 1024
    ) {
      status.textContent = "请选择 8 MB 以内的 PNG、JPG 或 WebP 图片";
      return;
    }
    status.textContent = "正在处理图片…";
    try {
      const bitmap = await createImageBitmap(file);
      try {
        if (generation !== uploadGeneration) return;
        const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        canvas
          .getContext("2d")!
          .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        scene.setArt(target, {
          pattern: "image",
          image: canvas,
          fit: fit.value as "contain" | "cover",
        });
        void refreshArt();
        status.textContent = `${target} 图片已应用 · 仅保留在本机`;
      } finally {
        bitmap.close();
      }
    } catch {
      if (generation === uploadGeneration)
        status.textContent = "这张图片无法读取，请换一张图片";
    }
  };
  q("#inspect-key").onclick = () => {
    stopPicking();
    const key = scene.getKeys().find((k) => k.code === currentKey)!;
    window.dispatchEvent(
      new CustomEvent("inspectkey", {
        detail: {
          code: key.code,
          label: key.label,
          art: scene.getArt(key.code),
        },
      }),
    );
  };

  let floating = false;
  root.querySelectorAll<HTMLButtonElement>("[data-world]").forEach(
    (button) =>
      (button.onclick = () => {
        const name = button.dataset.world as WorldName;
        scene.setWorld(name, currentKey);
        root
          .querySelectorAll("[data-world]")
          .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
        q("#world-target").textContent = currentKey;
      }),
  );
  host.addEventListener("resetgravity", () => {
    floating = false;
    q("#gravity-toggle").setAttribute("aria-pressed", "false");
    q("#gravity-toggle").textContent = "开启失重桌面 ↗";
    q("#gravity-attract").hidden = true;
  });
  q("#gravity-toggle").onclick = () => {
    floating = !floating;
    scene.setFloating(floating);
    q("#gravity-toggle").setAttribute("aria-pressed", String(floating));
    q("#gravity-toggle").textContent = floating
      ? "关闭失重 · 磁吸归位"
      : "开启失重桌面 ↗";
    q("#gravity-attract").hidden = !floating;
    host.scrollIntoView({ behavior: "smooth", block: "center" });
    host.focus({ preventScroll: true });
  };
  const holdButton = (
    button: HTMLElement,
    down: () => void,
    up: () => void,
  ) => {
    button.onpointerdown = (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      button.setPointerCapture(e.pointerId);
      down();
    };
    button.onpointerup = button.onpointercancel = () => up();
    button.onkeydown = (e) => {
      if ((e.code === "Space" || e.code === "Enter") && !e.repeat) {
        e.preventDefault();
        down();
      }
    };
    button.onkeyup = (e) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        up();
      }
    };
    button.onblur = up;
  };
  holdButton(
    q("#gravity-attract"),
    () => scene.attractKeys(true),
    () => scene.attractKeys(false),
  );
  let portalPress = false;
  holdButton(
    q("#portal-hold"),
    () => {
      portalPress = true;
      void sound.enable().then(() => {
        if (portalPress) scene.holdPortal(true);
      });
    },
    () => {
      portalPress = false;
      scene.holdPortal(false);
    },
  );
  q<HTMLInputElement>("#portal-toggle").onchange = (e) =>
    scene.setPortal((e.target as HTMLInputElement).checked);
  host.addEventListener("wondercancel", (event) =>
    sound.cancel((event as CustomEvent<GestureSound>).detail),
  );
  host.addEventListener("wondercue", (event) =>
    sound.cue((event as CustomEvent<GestureSound>).detail),
  );
  const dialog = document.createElement("dialog");
  dialog.className = "atelier-dialog";
  dialog.innerHTML = `<div class="atelier-dialog-head"><div><span class="tiny" id="dialog-eyebrow">JUDY / PHOTO STUDIO</span><h2 id="atelier-dialog-title">你的作品，现在入镜。</h2></div><button id="close-atelier" aria-label="关闭摄影台">关闭 ×</button></div><div id="atelier-stage"><div class="assembly-label" aria-hidden="true">FIRST<br>TOUCH.</div><div class="photo-caption"><strong id="photo-caption-title">BunnyJudy / MY OBJECT</strong><small>CRAFTED BY YOU / JUDY OBJECTS</small></div></div><div id="photo-controls"><div class="atelier-segments"><button data-photo-view="studio">立体</button><button data-photo-view="top">俯拍</button><button data-photo-view="side">低角度</button><button data-photo-view="detail">键帽特写</button></div><div class="photo-settings"><label>背景<select id="photo-background"><option value="#263b3e">深海灰</option><option value="#47344e">暮色紫</option><option value="#534834">暖沙金</option><option value="#111519">曜石黑</option></select></label><label>构图<select id="photo-format"><option value="wide">横屏壁纸 1920 × 1080</option><option value="poster">竖版海报 1080 × 1350</option></select></label><label>作品名字<input id="photo-title" type="text" value="BunnyJudy / MY OBJECT" maxlength="40"></label><label>镜头远近<input id="photo-zoom" type="range" min="0.7" max="6" step="0.05" value="1"></label><label>灯光<select id="photo-light"><option value="day">冷白工作灯</option><option value="sunset">落日侧光</option><option value="neon">霓虹夜色</option></select></label></div><button id="export-photo" class="atelier-primary">导出 PNG ↗</button><span id="photo-status" role="status">拖动键盘调整角度，导出时自动隐藏控件。</span></div><div id="assembly-controls" hidden><p id="assembly-status" role="status">按哪颗键，就从哪颗键开始。也可以直接点悬浮键帽。</p><label class="intro-sound-label"><input id="intro-sound" type="checkbox" checked> 开场音效</label><button id="start-assembly" class="atelier-primary">按一颗键，点亮整把键盘 ↗</button><button id="skip-assembly">跳过开场</button></div>`;
  dialog.setAttribute("aria-labelledby", "atelier-dialog-title");
  document.body.append(dialog);
  const d = <T extends HTMLElement>(selector: string) =>
    dialog.querySelector<T>(selector)!;
  const stage = d<HTMLElement>("#atelier-stage");
  let originalParent: HTMLElement,
    originalNext: ChildNode | null,
    originalClass = "",
    oldView = "studio",
    mode: "photo" | "intro" = "photo";
  let introGeneration = 0;
  let introTimer: ReturnType<typeof setTimeout> | undefined,
    opener: HTMLElement | null = null;
  const markSeen = () => {
    try {
      localStorage.setItem("judy-assembly-seen", "1");
    } catch {}
  };
  const close = () => {
    if (!dialog.open) return;
    clearTimeout(introTimer);
    introGeneration++;
    if (mode === "intro") {
      scene.finishIntro();
      sound.cancel();
      markSeen();
    }
    scene.releaseAll();
    scene.setZoom(1);
    scene.setView(oldView as "studio" | "top" | "side");
    originalParent.insertBefore(
      host,
      originalNext?.parentNode === originalParent ? originalNext : null,
    );
    host.className = originalClass;
    delete host.dataset.exclusive;
    dialog.close();
    document.body.style.overflow = "";
    scene.resize();
    updateLight();
    opener?.focus({ preventScroll: true });
    window.dispatchEvent(new Event("scroll"));
  };
  const open = (next: "photo" | "intro") => {
    if (dialog.open) return;
    stopPicking();
    mode = next;
    introGeneration++;
    opener = document.activeElement as HTMLElement;
    originalParent = host.parentElement!;
    originalNext = host.nextSibling;
    originalClass = host.className;
    oldView = host.dataset.view || "studio";
    host.dataset.exclusive = "true";
    host.className = "scene-host atelier-scene";
    scene.releaseAll();
    scene.setView("studio");
    scene.setZoom(1);
    stage.append(host);
    dialog.dataset.mode = mode;
    d("#photo-controls").hidden = mode !== "photo";
    d("#assembly-controls").hidden = mode !== "intro";
    d("#atelier-dialog-title").textContent =
      mode === "photo" ? "你的作品，现在入镜。" : "一颗键，开启这一切。";
    d("#dialog-eyebrow").textContent =
      mode === "photo" ? "JUDY / PHOTO STUDIO" : "JUDY / THE FIRST TOUCH";
    dialog.showModal();
    document.body.style.overflow = "hidden";
    if (mode === "intro") {
      scene.beginIntro();
      floating = false;
      q("#gravity-toggle").setAttribute("aria-pressed", "false");
      q("#gravity-toggle").textContent = "开启失重桌面 ↗";
      q("#gravity-attract").hidden = true;
      d("#assembly-status").textContent =
        "按哪颗键，就从哪颗键开始。也可以直接点悬浮键帽。";
      d<HTMLButtonElement>("#start-assembly").disabled = false;
      d("#start-assembly").focus();
    } else {
      d<HTMLSelectElement>("#photo-light").value = light;
      d<HTMLInputElement>("#photo-zoom").value = "1";
      updatePhotoStage();
    }
    scene.resize();
  };
  const start = async (code = "Escape") => {
    if (
      mode !== "intro" ||
      !dialog.open ||
      d<HTMLButtonElement>("#start-assembly").disabled
    )
      return;
    const generation = introGeneration;
    d<HTMLButtonElement>("#start-assembly").disabled = true;
    const withSound = d<HTMLInputElement>("#intro-sound").checked;
    const audible = withSound ? await sound.enable() : false;
    if (generation !== introGeneration || !dialog.open) return;
    const actual =
      scene.getKeys().find((key) => key.code === code)?.code ||
      scene.getKeys()[0].code;
    if (audible) sound.cue("assembly", actual);
    scene.assemble(actual);
    dialog.dataset.introAudio = audible ? "playing" : "silent";
    d("#assembly-status").textContent =
      `${actual.replace("Key", "")} · 由你的这一键，向外展开${audible ? "" : " · 静音"}`;
    introTimer = setTimeout(close, 3200);
  };
  host.addEventListener("introactivate", (e) => {
    void start((e as CustomEvent<string>).detail);
  });
  d("#close-atelier").onclick = d("#skip-assembly").onclick = close;
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    close();
  });
  dialog.addEventListener("keydown", (e) => {
    if (
      mode === "intro" &&
      e.key.length === 1 &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey
    ) {
      e.preventDefault();
      e.stopPropagation();
      void start(e.code);
    }
  });
  d("#start-assembly").onclick = () => void start();
  d<HTMLInputElement>("#intro-sound").onchange = (e) => {
    if (!(e.target as HTMLInputElement).checked) {
      sound.cancel();
      dialog.dataset.introAudio = "silent";
    }
  };
  q("#replay-assembly").onclick = () => open("intro");
  q("#open-photo").onclick = () => open("photo");
  q("#world-closeup").onclick = () => {
    open("photo");
    scene.focusKey(host.dataset.worldKey || currentKey);
    scene.setZoom(6);
    d<HTMLInputElement>("#photo-zoom").value = "6";
  };
  const updatePhotoStage = () => {
    const bg = d<HTMLSelectElement>("#photo-background").value;
    stage.style.background = `linear-gradient(130deg,${bg},#0b1117)`;
    stage.dataset.format = d<HTMLSelectElement>("#photo-format").value;
    scene.resize();
  };
  d<HTMLInputElement>("#photo-title").oninput = (e) => {
    d("#photo-caption-title").textContent =
      (e.target as HTMLInputElement).value || "JUDY / PERSONAL OBJECT";
  };
  d<HTMLSelectElement>("#photo-background").onchange = d<HTMLSelectElement>(
    "#photo-format",
  ).onchange = updatePhotoStage;
  d<HTMLSelectElement>("#photo-light").onchange = (e) =>
    scene.setLight(
      (e.target as HTMLSelectElement).value,
      Number(angle.value),
      Number(elevation.value),
    );
  dialog.querySelectorAll<HTMLButtonElement>("[data-photo-view]").forEach(
    (b) =>
      (b.onclick = () => {
        const view = b.dataset.photoView!;
        scene.setView(
          view === "detail" ? "studio" : (view as "studio" | "top" | "side"),
        );
        if (view === "detail") scene.focusKey(currentKey);
        else scene.setZoom(1);
        d<HTMLInputElement>("#photo-zoom").value =
          view === "detail" ? "3" : "1";
        dialog
          .querySelectorAll("[data-photo-view]")
          .forEach((el) => el.setAttribute("aria-pressed", String(el === b)));
      }),
  );
  d<HTMLInputElement>("#photo-zoom").oninput = (e) =>
    scene.setZoom(Number((e.target as HTMLInputElement).value));
  d<HTMLButtonElement>("#export-photo").onclick = async () => {
    const button = d<HTMLButtonElement>("#export-photo");
    button.disabled = true;
    d("#photo-status").textContent = "正在生成照片…";
    try {
      const poster = d<HTMLSelectElement>("#photo-format").value === "poster";
      const blob = await scene.photograph(
        poster ? 1080 : 1920,
        poster ? 1350 : 1080,
        d<HTMLSelectElement>("#photo-background").value,
        d<HTMLInputElement>("#photo-title").value,
      );
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `judy-${poster ? "poster" : "wallpaper"}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      d("#photo-status").textContent = "照片已生成，已交给浏览器下载。";
    } catch {
      d("#photo-status").textContent = "导出失败，请重试。";
    } finally {
      button.disabled = false;
    }
  };
  let seen = false;
  try {
    seen = localStorage.getItem("judy-assembly-seen") === "1";
  } catch {}
  if (
    !seen &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !location.hash
  )
    open("intro");
}
