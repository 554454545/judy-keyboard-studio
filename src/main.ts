import "./style.css";
import {
  palettes,
  initialConfig,
  profileNames,
  soundNames,
  soundDescriptions,
  type PaletteName,
  type KeyboardConfig,
  type ColorZone,
  type ProfileName,
  type FinishName,
  type LegendName,
  type SoundName,
  type ViewName,
} from "./palettes";
import { getLayout, forms, keyboardPreview, type FormName } from "./key-layout";
import { detailMarkup, setupDetails } from "./details";
import { immersiveMarkup, setupImmersive } from "./immersive";
import "./studio.css";
import "./night.css";
import "./motion.css";
import "./scenery.css";
import "./editorial.css";
import { setupEditorial } from "./editorial";
import { effectOptions, type KeyEffect } from "./effect-options";
import { KeyboardAudio } from "./sound";
import type { KeyboardScene } from "./scene";

const arrow = '<span aria-hidden="true">↗</span>';
const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
<header class="header">
  <a class="wordmark" href="#top" aria-label="JUDY 首页">judy<span class="brand-dot">®</span><span class="brand-caption">OBJECTS FOR<br>EVERYDAY IDEAS.</span></a>
  <nav aria-label="主导航"><a href="#object">挑一把键盘</a><a href="#details">细节之中</a><a href="#play">敲点什么</a></nav>
  <a class="nav-cta" href="#object">调成你的频率 ${arrow}</a>
</header>
<main>
  <div class="hero-film" id="hero-film"><section class="hero" id="top" aria-labelledby="hero-title">
    <div class="hero-topline"><span><i class="status-dot"></i> JUDY LAB / DESK OBJECT NO. 001</span><span>DESIGNED FOR THE WAY YOU THINK.</span></div>
    <div class="hero-lightfield" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="hero-copy"><p class="eyebrow">JUDY / AFTER HOURS COLLECTION</p><h1 id="hero-title"><span>QUIET</span><em>BY DESIGN.</em></h1><div class="hero-caption"><p class="hero-description">留一点安静。<br>给每一次<em>触碰。</em></p><p class="hero-subcopy">一件日常之物。<br>值得，慢慢看。</p><div class="hero-actions"><button id="hero-immersive" class="hero-primary">进入夜间试打 ${arrow}</button><a href="#object">打造我的键盘 ↓</a></div></div></div>
    <div class="hero-object-label"><span class="tiny">THE EVERYDAY INSTRUMENT</span><strong id="hero-form">J / 75</strong><span id="hero-form-description">机械键盘 · 经典布局</span></div>
    <div id="scene-host" class="scene-host" tabindex="0" role="img" aria-label="JUDY 交互式三维键盘，可拖动旋转，使用方向键调整视角"><div class="model-loading"><span></span>正在布置你的工作台</div></div>
    <div class="hero-annotation"><button id="hero-demo"><span class="hero-play-icon">▷</span><span>先听一段键盘节奏<small>点一下试听 · 每次一个新词</small></span></button><div class="hero-signal" aria-hidden="true">${Array.from({ length: 24 }, (_, i) => `<i style="--bar:${8 + ((i * 17) % 35)}px;--delay:${i * 0.035}s"></i>`).join("")}</div><span id="hero-last-key">READY TO PLAY</span><div id="demo-word" aria-hidden="true"></div><span class="sr-only" id="demo-announcement" role="status"></span></div>
    <div class="hero-bottom"><div class="hero-color"><span class="color-dots"><i></i><i></i><i></i></span><span id="hero-palette">01 / 极夜冰川</span></div><span class="drag-hint">↔ 拖动探索 · 点击键帽试敲</span><span class="edition">05 FORMS / 22 COLORS / 12 VOICES</span></div>
    <div class="film-caption"><span id="film-number">01 / THE SURFACE</span><p id="film-line">光，沿着轮廓慢慢走。</p><span class="film-scroll">SCROLL TO EXPLORE <i>↓</i></span></div><span class="hero-index" aria-hidden="true">J — 001</span>
  </section></div>
  <div class="manifesto"><span>LESS NOISE.</span><span class="asterisk">✳</span><span>MORE IDEAS.</span><span class="manifesto-cn">关掉喧闹，打开你的频率。</span><a href="#play" aria-label="前往试打区">↓</a></div>
  <section id="object" class="studio section-pad" aria-labelledby="studio-title">
    <div class="section-heading"><p class="eyebrow">01 / MAKE IT PERSONAL</p><span>你的桌面，应该有你的性格。</span></div>
    <div class="studio-intro"><h2 id="studio-title">好手感，<br>也要<em>合眼缘。</em></h2><p>把每天触碰的东西，变成喜欢的样子。<br>一副安静的骨架，几分不安分的颜色。<br>剩下的，交给你的指尖。</p></div>
    <div class="design-toolbar"><div><span class="tiny">YOUR OBJECT / YOUR EXPRESSION</span><p>先看见喜欢，再慢慢调整。</p></div><button id="design-open" aria-expanded="false" aria-controls="design-panel">打开搭配面板 <span>＋</span></button></div>
    <div class="config-grid">
      <div class="preview" id="preview-slot"><div class="preview-top"><span><i class="status-dot"></i> YOUR OBJECT / LIVE</span><button class="icon-button" id="reset-view" aria-label="重置键盘视角">↺</button></div><div id="config-scene-anchor"></div><div class="preview-bottom"><div class="view-switch" role="group" aria-label="键盘视角"><button data-view="studio" aria-pressed="true">立体</button><button data-view="top" aria-pressed="false">俯视</button><button data-view="side" aria-pressed="false">侧面</button></div><span class="tiny">DRAG TO ROTATE ↔</span></div></div>
      <div class="controls" id="design-panel" hidden><div class="drawer-heading"><span>MAKE IT YOURS / 搭配面板</span><button id="design-close" aria-label="收起搭配面板">收起 ×</button></div>
        <div class="product-heading"><div><span class="tiny">A LITTLE ROOM FOR BIG IDEAS</span><h3>JUDY <span id="product-form">75</span><sup>®</sup></h3></div><span class="concept-tag">CONCEPT<br>EDITION 01</span></div>
        <fieldset class="form-fieldset"><legend><span>00 / 先挑一个轮廓</span><span id="form-name">经典 75</span></legend><div class="form-options">${Object.entries(
          forms,
        )
          .map(
            ([id, f], i) =>
              `<button data-form="${id}" aria-pressed="${i === 0}" aria-label="${f.name}">${keyboardPreview(id as FormName, palettes.obsidian)}<strong>${f.name}</strong><small>${f.english}</small></button>`,
          )
          .join(
            "",
          )}</div><p class="parameter-help" id="form-description">${forms.classic.description}</p></fieldset>
        <fieldset><legend><span>01 / 从一个灵感开始</span><span id="palette-name">极夜冰川</span></legend><div class="palette-browser"><div class="palette-filters" role="group" aria-label="配色分类"><button data-palette-filter="all" aria-pressed="true">全部 22</button><button data-palette-filter="cool" aria-pressed="false">冷调</button><button data-palette-filter="warm" aria-pressed="false">暖调</button><button data-palette-filter="dark" aria-pressed="false">深色</button></div><div class="palette-options">${Object.entries(
          palettes,
        )
          .map(
            ([id, p], i) =>
              `<button class="palette-option" data-palette="${id}" aria-pressed="${i === 0}" aria-label="${p.name}">${keyboardPreview("classic", p)}<span class="palette-swatches" aria-hidden="true">${[p.body, p.key, p.modifier, p.accent].map((c) => `<i style="background:${c}"></i>`).join("")}</span><span>${p.name}</span><small>${p.english}</small></button>`,
          )
          .join(
            "",
          )}</div><div class="palette-pagination"><span id="palette-range" aria-live="polite">01—06 / 22</span><div><button id="palette-prev" aria-label="上一页配色">←</button><span id="palette-page">1 / 4</span><button id="palette-next" aria-label="下一页配色">→</button></div></div></div></fieldset>
        <fieldset><legend><span>02 / 每一处，自己搭</span><span>4 个独立配色区</span></legend><div class="zone-colors">${(["body", "key", "modifier", "accent"] as const).map((zone, i) => `<label class="zone-color"><span class="zone-swatch" style="--swatch:${palettes.obsidian[zone]}"><input type="color" data-zone="${zone}" value="${palettes.obsidian[zone]}" aria-label="${["机身颜色", "字母键颜色", "功能键颜色", "重点键颜色"][i]}"></span><span>${["机身", "字母键", "功能键", "重点键"][i]}</span><small data-hex="${zone}">${palettes.obsidian[zone].toUpperCase()}</small></label>`).join("")}</div><div class="paint-tools"><button id="paint-toggle" aria-pressed="false">逐键上色 ↗</button><label class="paint-color-label">画笔<input type="color" id="paint-color" value="#ed9cb2" aria-label="单键画笔颜色"></label><button id="clear-paint">清除单键配色</button></div><p class="parameter-help" id="paint-help">开启逐键上色，再点击 3D 键盘上的任意键帽。</p></fieldset>
        <fieldset><legend><span>03 / 指尖的轮廓</span><span id="profile-name">阶梯凹面</span></legend><div class="profile-options">${Object.entries(
          profileNames,
        )
          .map(
            ([id, name], i) =>
              `<button data-profile="${id}" aria-pressed="${i === 0}"><span class="cap-icon cap-${id}" aria-hidden="true"></span><strong>${name}</strong><small>${["CHERRY INSPIRED", "SPHERICAL", "LOW PROFILE"][i]}</small></button>`,
          )
          .join("")}</div></fieldset>
        <div class="finish-legend-grid"><fieldset><legend>机身表面</legend><select id="finish" aria-label="机身表面"><option value="anodized">阳极金属</option><option value="matte">细砂哑光</option><option value="ceramic">陶瓷光泽</option></select></fieldset><fieldset><legend>键帽字符</legend><select id="legend" aria-label="键帽字符"><option value="dual">双字符</option><option value="classic">经典标记</option><option value="minimal">居中极简</option></select></fieldset></div>
        <fieldset><legend><span>04 / 听见你的偏好</span><button class="text-button" id="preview-sound">试听 ↗</button></legend><div class="switch-options">${Object.entries(
          soundNames,
        )
          .map(
            ([id, name], i) =>
              `<button data-sound="${id}" aria-pressed="${i === 0}"><strong>${name}<span>${["◡", "◇", "⌁", "⌘"][i % 4]}</span></strong><small>${soundDescriptions[id as SoundName]}</small></button>`,
          )
          .join("")}</div></fieldset>
        <div class="config-summary" aria-live="polite"><i class="status-dot"></i><span id="summary">极夜冰川 / 阶梯凹面 / 奶油柔轴</span></div><button id="save-config" class="solid-button">保存我的搭配 <span>↓</span></button><p class="config-note">一份可以带走的灵感。概念展示，暂不发售。</p>
      </div>
    </div>
    <div class="spec-row"><div><span>FIND YOUR FORM</span><strong>05<small> / FORMS</small></strong><p>不同轮廓，共同的输入灵感</p></div><div><span>A SOLID FOUNDATION</span><strong>Al<small> / 6063</small></strong><p>铝合金机身的设计构想</p></div><div><span>A SOFTER LANDING</span><strong>Gasket</strong><p>让每次敲击，都有柔和的落点</p></div><div><span>MAKE IT YOURS</span><strong>∞</strong><p>关于你的风格，没有标准答案</p></div></div>
  </section>
  ${detailMarkup}
  <section id="play" class="play section-pad" aria-labelledby="play-title"><div class="section-heading"><p class="eyebrow">03 / YOUR HANDS. YOUR RHYTHM.</p><span>从展示，进入真实敲击。</span></div>
    <div class="play-heading"><div><h2 id="play-title">让指尖，<em>接管画面。</em></h2><p class="play-description">按下你的实体键盘，看每一颗键帽回应。</p></div><div class="play-entry-actions"><button id="enter-immersive" class="immersive-entry">进入全景模式 <span>⛶</span></button><button id="connect-keyboard" class="connect-button" aria-pressed="false">开始实机试打 ${arrow}</button></div></div>
    <div class="lab-toolbar"><span class="connection-status"><i class="status-dot"></i><span id="connection-label">点击开始，在当前网页同步按键</span></span><button id="sound-toggle" aria-pressed="false" class="sound-button"><span class="sound-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span id="sound-label">开启敲击声</span></button></div>
    <div class="lab-grid"><div class="lab-preview"><div class="preview-top"><span><span id="lab-form">J / 75</span> — LIVE KEY RESPONSE</span><span id="pressed-status">READY</span></div><div id="play-scene-anchor"></div><div class="lab-preview-footer"><span>长按 · 连击 · 组合键</span><button class="text-button" id="typing-view">回到试打视角 ↺</button></div></div><div class="typing-panel"><div class="typing-panel-top"><label for="typing">把想法敲在这里</label><span><span id="char-count">0</span> / 1000</span></div><textarea id="typing" maxlength="1000" placeholder="你好，Judy。
今天想做点不一样的。" spellcheck="false"></textarea><div class="typing-footer"><span id="typing-hint">也可以直接点击这里输入</span><button id="clear-typing">清空 ↺</button></div><div class="typing-stats"><div><span>LAST KEY</span><strong id="last-key">—</strong></div><div><span>KEYSTROKES</span><strong id="stroke-count">0</strong></div><div><span>CHARS / MIN</span><strong id="typing-speed">0</strong></div></div><div id="key-history" class="key-history" aria-label="最近按键"><span>你的节奏，即将在这里出现。</span></div></div></div>
    <div class="lab-settings"><label>按键特效<select id="lab-effect">${effectOptions}</select></label><label>敲击音色<select id="lab-sound">${Object.entries(
      soundNames,
    )
      .map(([id, name]) => `<option value="${id}">${name}</option>`)
      .join(
        "",
      )}</select></label><label class="volume-control">音量<input id="volume" type="range" min="0" max="100" value="45" aria-label="敲击音量"><output id="volume-value">45%</output></label><span class="sound-disclaimer">按下与回弹分别发声，空格和回车拥有更厚的音色。合成试听，非实物录音。</span></div><p class="keyboard-note">无需安装或配对。仅在当前网页获得焦点时响应；切到其他窗口自动松开。Fn 与部分系统快捷键由系统处理。输入内容不会上传。</p>
  </section>
  <section class="closing"><span class="eyebrow">MADE FOR YOUR EVERYDAY.</span><p>把日常，<br>敲得<em>有声有色。</em></p><a href="#object" class="pill-link">回到你的工作台 <span>↑</span></a><div class="closing-mark" aria-hidden="true">j.</div></section>
</main><footer><a class="wordmark" href="#top">judy<span class="brand-dot">®</span></a><span>DESIGNED WITH INTENTION. TYPED WITH FEELING.</span><span>© 2026 JUDY OBJECTS / 原创概念设计</span></footer><div class="toast" id="toast" role="status"></div>`;

document.body.insertAdjacentHTML("beforeend", immersiveMarkup);

setupEditorial();

const sceneHost = document.querySelector<HTMLDivElement>("#scene-host")!;
const typing = document.querySelector<HTMLTextAreaElement>("#typing")!;
const audio = new KeyboardAudio();
let effect: KeyEffect = "ripple";
function setEffect(value: KeyEffect) {
  effect = value;
  scene?.setEffect(value);
  document
    .querySelectorAll<HTMLSelectElement>("#lab-effect,#immersive-effect")
    .forEach((el) => (el.value = value));
}
document
  .querySelectorAll<HTMLSelectElement>("#lab-effect,#immersive-effect")
  .forEach((el) =>
    el.addEventListener("change", () => {
      setEffect(el.value as KeyEffect);
      if (el.id === "immersive-effect")
        sceneHost.focus({ preventScroll: true });
    }),
  );
let scene: KeyboardScene | undefined;
let config: KeyboardConfig = initialConfig();
let previewForm: FormName = "classic",
  previewColors = "";
let painting = false,
  paintColor = "#ed9cb2",
  live = false,
  strokes = 0,
  started = 0;
const held = new Set<string>(),
  history: string[] = [];
let toastTimeout: ReturnType<typeof setTimeout>;
const keyNames = new Map(
  getLayout("classic").map((k) => [
    k.code,
    k.label === "space" ? "Space" : k.label,
  ]),
);
function toast(message: string) {
  const el = document.querySelector("#toast")!;
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.classList.remove("visible"), 2600);
}
function selectButtons(selector: string, attribute: string, value: string) {
  document
    .querySelectorAll<HTMLElement>(`button${selector}`)
    .forEach((el) =>
      el.setAttribute(
        "aria-pressed",
        String(el.getAttribute(attribute) === value),
      ),
    );
}
function updateSound() {
  const immersiveSound = document.querySelector("#immersive-sound")!;
  immersiveSound.setAttribute("aria-pressed", String(audio.enabled));
  immersiveSound.textContent = audio.enabled
    ? "键音 已开启 ♬"
    : "键音 已关闭 ♩";
  document
    .querySelector("#sound-toggle")!
    .setAttribute("aria-pressed", String(audio.enabled));
  document.querySelector("#sound-label")!.textContent = audio.enabled
    ? "敲击声已开启"
    : "开启敲击声";
}
async function enableSound() {
  try {
    await audio.enable();
    updateSound();
    return true;
  } catch {
    audio.enabled = false;
    updateSound();
    toast("声音暂不可用，按键联动仍可使用。");
    return false;
  }
}
function applyConfig() {
  scene?.applyConfig(config);
  keyNames.clear();
  getLayout(config.form).forEach((k) =>
    keyNames.set(
      k.inputCode ?? k.code,
      k.label === "space" ? "Space" : k.label,
    ),
  );
  const formLabel = {
    classic: "75",
    compact: "60",
    alice: "ALICE",
    split: "ORBIT",
    mono: "SOLO",
  }[config.form];
  document.querySelector("#product-form")!.textContent = formLabel;
  document.querySelector("#hero-form")!.textContent = `J / ${formLabel}`;
  document.querySelector("#hero-form-description")!.textContent =
    forms[config.form].name;
  document.querySelector("#lab-form")!.textContent = `J / ${formLabel}`;
  document.querySelector("#form-name")!.textContent = forms[config.form].name;
  document.querySelector("#form-description")!.textContent =
    forms[config.form].description;
  selectButtons("[data-form]", "data-form", config.form);
  const colorSignature = [
    config.body,
    config.key,
    config.modifier,
    config.accent,
  ].join();
  if (colorSignature !== previewColors) {
    previewColors = colorSignature;
    document
      .querySelectorAll<HTMLButtonElement>("button[data-form]")
      .forEach((button) => {
        button.querySelector(".keyboard-mini")!.outerHTML = keyboardPreview(
          button.dataset.form as FormName,
          config,
        );
      });
  }
  if (previewForm !== config.form) {
    previewForm = config.form;
    document
      .querySelectorAll<HTMLButtonElement>("button[data-palette]")
      .forEach((button) => {
        button.querySelector(".keyboard-mini")!.outerHTML = keyboardPreview(
          config.form,
          palettes[button.dataset.palette as PaletteName],
        );
      });
  }
  audio.preset = config.sound;
  const name =
    config.palette === "custom"
      ? "我的自由搭配"
      : palettes[config.palette].name;
  document.querySelector("#palette-name")!.textContent = name;
  document.querySelector("#hero-palette")!.textContent =
    `J / ${formLabel} — ${name}`;
  document.querySelector("#profile-name")!.textContent =
    profileNames[config.profile];
  document.querySelector("#summary")!.textContent =
    `${forms[config.form].name} / ${name} / ${profileNames[config.profile]} / ${soundNames[config.sound]}${Object.keys(config.overrides).length ? ` / ${Object.keys(config.overrides).length} 颗自定义键` : ""}`;
  selectButtons("[data-palette]", "data-palette", config.palette);
  selectButtons("[data-profile]", "data-profile", config.profile);
  selectButtons("[data-sound]", "data-sound", config.sound);
  for (const zone of ["body", "key", "modifier", "accent"] as ColorZone[]) {
    const input = document.querySelector<HTMLInputElement>(
      `[data-zone="${zone}"]`,
    )!;
    input.value = config[zone];
    input.parentElement!.style.setProperty("--swatch", config[zone]);
    document.querySelector(`[data-hex="${zone}"]`)!.textContent =
      config[zone].toUpperCase();
  }
  document.querySelector<HTMLSelectElement>("#lab-sound")!.value = config.sound;
  document.querySelector<HTMLSelectElement>("#immersive-voice")!.value =
    config.sound;
  document.querySelector<HTMLSelectElement>("#finish")!.value = config.finish;
  document.querySelector<HTMLSelectElement>("#legend")!.value = config.legend;
}
function activity(code: string) {
  document.querySelector("#hero-last-key")!.textContent =
    keyNames.get(code) ?? code;
  const label = keyNames.get(code) ?? code;
  document.querySelector("#last-key")!.textContent = label;
  strokes++;
  document.querySelector("#stroke-count")!.textContent = String(strokes);
  started ||= performance.now();
  history.push(label);
  if (history.length > 8) history.shift();
  const container = document.querySelector("#key-history")!;
  container.replaceChildren(
    ...history.map((value) => {
      const k = document.createElement("kbd");
      k.textContent = value;
      return k;
    }),
  );
}
function updatePressed() {
  document.querySelector("#pressed-status")!.textContent = held.size
    ? [...held].map((code) => keyNames.get(code) ?? code).join(" + ")
    : "READY";
}
function releaseAll() {
  held.clear();
  scene?.releaseAll();
  updatePressed();
}
function pointerKey(code: string, down: boolean) {
  if (painting) {
    if (down) {
      config.overrides[code] = paintColor;
      config.palette = "custom";
      applyConfig();
      document.querySelector("#paint-help")!.textContent =
        `${keyNames.get(code) ?? code} 已上色。继续点选其他键帽。`;
    }
    return;
  }
  if (down) {
    activity(code);
    audio.play(code);
    if (sceneHost.classList.contains("in-play")) {
      const key = getLayout(config.form).find((k) => k.code === code);
      if (key) {
        let value =
          (key.inputCode ?? key.code) === "Space"
            ? " "
            : key.code === "Enter"
              ? "\n"
              : key.label.length === 1
                ? key.label.toLowerCase()
                : "";
        if (key.code === "Backspace") {
          typing.setRangeText(
            "",
            Math.max(
              0,
              typing.selectionStart -
                (typing.selectionStart === typing.selectionEnd ? 1 : 0),
            ),
            typing.selectionEnd,
            "end",
          );
        } else if (value && typing.value.length < 1000)
          typing.setRangeText(
            value,
            typing.selectionStart,
            typing.selectionEnd,
            "end",
          );
        typing.dispatchEvent(new Event("input"));
      }
    }
  } else audio.play(code, true);
}
async function initializeScene() {
  try {
    const { KeyboardScene } = await import("./scene");
    scene = new KeyboardScene(sceneHost, pointerKey);
    scene.setEffect(effect);
    positionScene();
    scene.applyConfig(config);
    sceneHost.querySelector(".model-loading")?.remove();
    const { setupAtelier } = await import("./atelier");
    setupAtelier(
      scene,
      sceneHost,
      (style) => {
        const voice: SoundName = (
          {
            original: "bubble",
            ice: "glass",
            smoke: "copper",
            cream: "cream",
            metal: "marble",
          } as const
        )[style];
        chooseSound(voice);
      },
      {
        enable: enableSound,
        cue: (name, code) => {
          const played = audio.playGesture(name, code);
          sceneHost.dataset.lastCue = played ? name : "silent";
        },
        cancel: (name) => audio.cancelGestures(name ?? "assembly"),
      },
    );
    for (const code of held) scene.setKey(code, true);
  } catch (error) {
    console.error(error);
    sceneHost.innerHTML =
      '<div class="model-fallback"><strong>JUDY / OBJECTS</strong><p>3D 预览暂不可用，请尝试开启图形加速。你仍可搭配、试听和输入。</p></div>';
  }
}
void initializeScene();
document
  .querySelectorAll<HTMLButtonElement>("button[data-form]")
  .forEach((button) =>
    button.addEventListener("click", () => {
      releaseAll();
      config.form = button.dataset.form as FormName;
      applyConfig();
      setView("studio");
    }),
  );
document
  .querySelectorAll<HTMLButtonElement>("[data-palette]")
  .forEach((button) =>
    button.addEventListener("click", () => {
      const name = button.dataset.palette as PaletteName;
      config = { ...config, ...palettes[name], palette: name, overrides: {} };
      applyConfig();
    }),
  );
let palettePage = 0,
  paletteFilter = "all";
const paletteGroups: Record<string, string[]> = {
  dark: ["obsidian", "ink", "panda", "arcade", "racing", "noir"],
  warm: ["oat", "blossom", "coral", "sunset", "terracotta", "peach"],
  cool: [
    "obsidian",
    "moon",
    "sage",
    "ocean",
    "violet",
    "mint",
    "cobalt",
    "matcha",
    "lilac",
    "citrus",
    "glacier",
  ],
};
function renderPalettePage() {
  const buttons = [
    ...document.querySelectorAll<HTMLButtonElement>("button[data-palette]"),
  ];
  const eligible = buttons.filter(
    (b) =>
      paletteFilter === "all" ||
      paletteGroups[paletteFilter].includes(b.dataset.palette!),
  );
  const pages = Math.ceil(eligible.length / 6);
  palettePage = Math.min(Math.max(0, palettePage), pages - 1);
  const visible = eligible.slice(palettePage * 6, palettePage * 6 + 6);
  buttons.forEach((b) => (b.hidden = !visible.includes(b)));
  document.querySelector("#palette-range")!.textContent =
    `${String(palettePage * 6 + 1).padStart(2, "0")}—${String(Math.min(eligible.length, palettePage * 6 + 6)).padStart(2, "0")} / ${eligible.length}`;
  document.querySelector("#palette-page")!.textContent =
    `${palettePage + 1} / ${pages}`;
  document.querySelector<HTMLButtonElement>("#palette-prev")!.disabled =
    palettePage === 0;
  document.querySelector<HTMLButtonElement>("#palette-next")!.disabled =
    palettePage === pages - 1;
}
document.querySelector("#palette-prev")!.addEventListener("click", () => {
  palettePage--;
  renderPalettePage();
});
document.querySelector("#palette-next")!.addEventListener("click", () => {
  palettePage++;
  renderPalettePage();
});
document
  .querySelectorAll<HTMLButtonElement>("[data-palette-filter]")
  .forEach((button) =>
    button.addEventListener("click", () => {
      paletteFilter = button.dataset.paletteFilter!;
      palettePage = 0;
      selectButtons(
        "[data-palette-filter]",
        "data-palette-filter",
        paletteFilter,
      );
      renderPalettePage();
    }),
  );
renderPalettePage();
document.querySelectorAll<HTMLInputElement>("[data-zone]").forEach((input) =>
  input.addEventListener("input", () => {
    config[input.dataset.zone as ColorZone] = input.value;
    config.palette = "custom";
    applyConfig();
  }),
);
document
  .querySelectorAll<HTMLButtonElement>("[data-profile]")
  .forEach((button) =>
    button.addEventListener("click", () => {
      config.profile = button.dataset.profile as ProfileName;
      applyConfig();
    }),
  );
document.querySelector("#finish")!.addEventListener("change", (event) => {
  config.finish = (event.target as HTMLSelectElement).value as FinishName;
  applyConfig();
});
document.querySelector("#legend")!.addEventListener("change", (event) => {
  config.legend = (event.target as HTMLSelectElement).value as LegendName;
  applyConfig();
});
let soundAudition = 0;
function chooseSound(name: SoundName) {
  config.sound = name;
  applyConfig();
  const audition = ++soundAudition;
  void enableSound().then((ok) => {
    if (ok && audition === soundAudition) audio.play("KeyA");
  });
}
document
  .querySelectorAll<HTMLButtonElement>("[data-sound]")
  .forEach((button) =>
    button.addEventListener("click", () =>
      chooseSound(button.dataset.sound as SoundName),
    ),
  );
document
  .querySelector("#lab-sound")!
  .addEventListener("change", (event) =>
    chooseSound((event.target as HTMLSelectElement).value as SoundName),
  );
document
  .querySelector("#preview-sound")!
  .addEventListener("click", async () => {
    if (await enableSound()) {
      audio.play("KeyA");
      setTimeout(() => audio.play("Space"), 150);
      setTimeout(() => audio.play("Enter"), 320);
    }
  });
document.querySelector("#sound-toggle")!.addEventListener("click", async () => {
  if (audio.enabled) {
    audio.enabled = false;
    updateSound();
  } else if (await enableSound()) audio.play("KeyA");
});
document
  .querySelector<HTMLInputElement>("#volume")!
  .addEventListener("input", (event) => {
    const value = Number((event.target as HTMLInputElement).value);
    audio.volume = value / 100;
    document.querySelector("#volume-value")!.textContent = `${value}%`;
  });
document.querySelector("#paint-toggle")!.addEventListener("click", () => {
  painting = !painting;
  scene?.setPainting(painting);
  document
    .querySelector("#paint-toggle")!
    .setAttribute("aria-pressed", String(painting));
  document.querySelector("#paint-help")!.textContent = painting
    ? "画笔已开启：点击键帽即可上色，关闭后恢复旋转和试敲。"
    : "开启逐键上色，再点击 3D 键盘上的任意键帽。";
});
document
  .querySelector<HTMLInputElement>("#paint-color")!
  .addEventListener("input", (event) => {
    paintColor = (event.target as HTMLInputElement).value;
  });
document.querySelector("#clear-paint")!.addEventListener("click", () => {
  config.overrides = {};
  applyConfig();
  toast("单键配色已清除，恢复分区配色。");
});
function setView(view: ViewName) {
  scene?.setView(view);
  selectButtons("[data-view]", "data-view", view);
}
document
  .querySelectorAll<HTMLButtonElement>("[data-view]")
  .forEach((button) =>
    button.addEventListener("click", () =>
      setView(button.dataset.view as ViewName),
    ),
  );
document
  .querySelector("#reset-view")!
  .addEventListener("click", () => setView("studio"));
document
  .querySelector("#typing-view")!
  .addEventListener("click", () => setView("studio"));
document.querySelector("#save-config")!.addEventListener("click", () => {
  const data = {
    product: `JUDY ${forms[config.form].name}`,
    edition: "Studio 04",
    ...config,
    volume: audio.volume,
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `judy-${config.form}-my-config.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("完整搭配已保存，包含逐键配色。");
});
const connectButton =
  document.querySelector<HTMLButtonElement>("#connect-keyboard")!;
connectButton.addEventListener("click", async () => {
  live = !live;
  sceneHost.dataset.live = String(live);
  connectButton.setAttribute("aria-pressed", String(live));
  connectButton.innerHTML = live ? "实机同步中 · 暂停 ↗" : "开始实机试打 ↗";
  document.querySelector("#connection-label")!.textContent = live
    ? "已开启 · 直接敲击你的键盘"
    : "同步已暂停，仍可在输入区试打";
  if (live) {
    if (painting) {
      painting = false;
      scene?.setPainting(false);
      document
        .querySelector("#paint-toggle")!
        .setAttribute("aria-pressed", "false");
      document.querySelector("#paint-help")!.textContent =
        "开启逐键上色，再点击 3D 键盘上的任意键帽。";
    }
    await enableSound();
    setView("studio");
    typing.focus({ preventScroll: true });
    document.querySelector("#play")!.scrollIntoView({ behavior: "smooth" });
  } else releaseAll();
});
window.addEventListener("keydown", (event) => {
  if (event.defaultPrevented && event.key === "Escape") return;
  const target = event.target as HTMLElement;
  const editing =
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable;
  if (editing || (!live && target !== typing && target !== sceneHost)) return;
  if (target === sceneHost && event.code === "Space") event.preventDefault();
  if (!keyNames.has(event.code) || event.repeat || held.has(event.code)) return;
  held.add(event.code);
  scene?.setKey(event.code, true);
  audio.play(event.code);
  activity(event.code);
  updatePressed();
  // Text, IME and browser shortcuts keep their native behavior; observation never captures or rewrites them.
});
window.addEventListener("keyup", (event) => {
  if (!held.delete(event.code)) return;
  scene?.setKey(event.code, false);
  audio.play(event.code, true);
  updatePressed();
});
window.addEventListener("blur", releaseAll);
document.addEventListener("visibilitychange", () => {
  document.documentElement.dataset.backgroundPaused = String(document.hidden);
  if (document.hidden) {
    releaseAll();
    audio.cancelGestures();
  }
});
typing.addEventListener("input", () => {
  document.querySelector("#char-count")!.textContent = String(
    typing.value.length,
  );
  if (!started && typing.value.length) started = performance.now();
  const minutes = Math.max((performance.now() - started) / 60000, 1 / 60);
  document.querySelector("#typing-speed")!.textContent = String(
    Math.round(typing.value.length / minutes),
  );
});
document.querySelector("#clear-typing")!.addEventListener("click", () => {
  typing.value = "";
  strokes = 0;
  started = 0;
  history.length = 0;
  document.querySelector("#char-count")!.textContent = "0";
  document.querySelector("#stroke-count")!.textContent = "0";
  document.querySelector("#typing-speed")!.textContent = "0";
  document.querySelector("#last-key")!.textContent = "—";
  document.querySelector("#key-history")!.replaceChildren();
  releaseAll();
  typing.focus();
});
// Keep one renderer and move it into the active workspace, including the typing lab.
const hero = document.querySelector<HTMLElement>(".hero")!,
  configAnchor = document.querySelector<HTMLElement>("#config-scene-anchor")!,
  playAnchor = document.querySelector<HTMLElement>("#play-scene-anchor")!,
  play = document.querySelector<HTMLElement>("#play")!;
let immersiveActive = false;
let location: "hero" | "config" | "play" | "immersive" = "hero";
function positionScene() {
  if (immersiveActive || sceneHost.dataset.exclusive === "true") {
    scene?.setEditorialProgress(null);
    return;
  }
  const next =
    document.querySelector("#hero-film")!.getBoundingClientRect().bottom > 0
      ? "hero"
      : play.getBoundingClientRect().top < innerHeight * 0.65
        ? "play"
        : "config";
  if (next !== location) {
    location = next;
    (next === "hero"
      ? hero
      : next === "config"
        ? configAnchor
        : playAnchor
    ).append(sceneHost);
    sceneHost.classList.toggle("in-config", next === "config");
    sceneHost.classList.toggle("in-play", next === "play");
    scene?.resize();
  }
  const film = document.querySelector("#hero-film")!.getBoundingClientRect();
  scene?.setEditorialProgress(
    next === "hero"
      ? Math.max(
          0,
          Math.min(1, -film.top / Math.max(1, film.height - innerHeight)),
        )
      : null,
  );
}
const demoWords = [
  "love",
  "voice",
  "time",
  "dream",
  "hello",
  "bloom",
  "flow",
  "moon",
  "play",
  "BunnyJudy",
  "echo",
  "glow",
];
let demoWordsLeft: string[] = [];
let previousDemoWord = "";
function nextDemoWord() {
  if (!demoWordsLeft.length) {
    demoWordsLeft = [...demoWords];
    for (let i = demoWordsLeft.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [demoWordsLeft[i], demoWordsLeft[j]] = [
        demoWordsLeft[j],
        demoWordsLeft[i],
      ];
    }
    if (demoWordsLeft.at(-1) === previousDemoWord)
      [demoWordsLeft[0], demoWordsLeft[demoWordsLeft.length - 1]] = [
        demoWordsLeft.at(-1)!,
        demoWordsLeft[0],
      ];
  }
  return (previousDemoWord = demoWordsLeft.pop()!);
}
let demoGeneration = 0;
let liveBeforeImmersive = false;
const immersive = setupImmersive({
  enter() {
    demoGeneration++;
    liveBeforeImmersive = live;
    live = true;
    sceneHost.dataset.live = "true";
    releaseAll();
    if (painting)
      document.querySelector<HTMLButtonElement>("#paint-toggle")!.click();
    immersiveActive = true;
    location = "immersive";
    document.querySelector("#immersive-scene-anchor")!.append(sceneHost);
    sceneHost.classList.remove("in-config", "in-play");
    sceneHost.classList.add("in-immersive");
    scene?.selectKey(null, false);
    scene?.setFloating(false);
    sceneHost.dispatchEvent(new Event("resetgravity"));
    setView("studio");
    scene?.resize();
    void enableSound();
  },
  exit() {
    releaseAll();
    live = liveBeforeImmersive;
    sceneHost.dataset.live = String(live);
    immersiveActive = false;
    sceneHost.classList.remove("in-immersive");
    scene?.setZoom(1);
    document.querySelector<HTMLInputElement>("#immersive-zoom")!.value = "100";
    positionScene();
  },
  atmosphere(name, motion) {
    scene?.setAtmosphere(name, motion);
  },
  reset() {
    setView("studio");
  },
  voice(name: SoundName) {
    chooseSound(name);
  },
  zoom(value) {
    scene?.setZoom(value);
  },
  async sound() {
    if (audio.enabled) {
      audio.enabled = false;
      updateSound();
    } else await enableSound();
    sceneHost.focus({ preventScroll: true });
  },
});
sceneHost.addEventListener("portalenter", () => {
  if (!immersiveActive && !sceneHost.dataset.exclusive) void immersive.enter();
});
document
  .querySelector("#enter-immersive")!
  .addEventListener("click", () => void immersive.enter());
document
  .querySelector("#hero-immersive")!
  .addEventListener("click", () => void immersive.enter());
document
  .querySelector<HTMLButtonElement>("#hero-demo")!
  .addEventListener("click", async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    button.disabled = true;
    const generation = ++demoGeneration;
    const demoText = nextDemoWord();
    button.dataset.word = demoText;
    const signal = document.querySelector(".hero-signal")!;
    try {
      await enableSound();
      signal.classList.add("playing");
      const word = document.querySelector<HTMLElement>("#demo-word")!;
      word.classList.remove("vanish");
      word.classList.add("typing");
      word.textContent = "";
      for (const letter of demoText) {
        const code = `Key${letter.toUpperCase()}`;
        if (generation !== demoGeneration || immersiveActive) break;
        scene?.setKey(code, true);
        word.textContent += letter;
        audio.play(code);
        document.querySelector("#hero-last-key")!.textContent =
          keyNames.get(code) ?? code;
        await new Promise((resolve) => setTimeout(resolve, 105));
        if (!held.has(code)) scene?.setKey(code, false);
        audio.play(code, true);
        await new Promise((resolve) => setTimeout(resolve, 90));
      }
    } finally {
      const word = document.querySelector<HTMLElement>("#demo-word")!;
      word.classList.remove("typing");
      word.classList.add("vanish");
      document.querySelector("#demo-announcement")!.textContent =
        word.textContent === demoText
          ? `${demoText}，节奏演示完成`
          : "演示已停止";
      signal.classList.remove("playing");
      button.disabled = false;
    }
  });
setupDetails((release) => {
  if (!release && !audio.enabled)
    void enableSound().then((ok) => {
      if (ok) audio.play("Escape");
    });
  else audio.play("Escape", release);
});
window.addEventListener("scroll", positionScene, { passive: true });
window.addEventListener("resize", positionScene);
positionScene();
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        }
      }),
    { threshold: 0.12 },
  );
  document
    .querySelectorAll(
      ".studio-intro,.spec-row,.anatomy-heading,.play-heading,.closing>p",
    )
    .forEach((el) => {
      el.classList.add("reveal");
      observer.observe(el);
    });
}
window.addEventListener("pagehide", (event) => {
  releaseAll();
  if (!event.persisted) {
    scene?.dispose();
    void audio.close();
  }
});
applyConfig();
