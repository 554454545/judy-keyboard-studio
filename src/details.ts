import type { KeyArt } from "./key-art";
export const detailMarkup = `
<section id="details" class="details section-pad" aria-labelledby="details-title">
  <div class="section-heading"><p class="eyebrow">02 / QUIETLY CONSIDERED</p><span>把日常拆开，会发现什么？</span></div>
  <div class="anatomy-heading"><div><span class="tiny">MICRO MECHANICS / MACRO ENERGY.</span><h2 id="details-title">细微之处，<br><em>自有分量。</em></h2></div><p>一颗按键，四层精密关系。<br>向下滚动，慢慢看清一次触碰。</p></div>
  <div class="details-film"><div class="anatomy-grid">
    <div class="specimen" id="specimen" style="--spread:1" role="group" aria-label="机械轴体概念分解图">
      <span class="specimen-watermark" aria-hidden="true">02</span><div class="specimen-axis" aria-hidden="true"></div>
      <span class="specimen-index">J / 001<br><b>ANATOMY OF A TOUCH</b></span><span class="specimen-scale">EXPLODED STUDY / 04 COMPONENTS</span>
      <div id="switch-canvas" class="switch-canvas" tabindex="0" aria-label="可拖动旋转的三维轴体"><span class="switch-loading">正在打开机械宇宙…</span></div><span class="specimen-drag">DRAG TO ORBIT ↔</span>
      <div class="part-labels"><button data-part="cap" aria-pressed="true"><i>01</i> 曲面键帽<span>KEYCAP</span></button><button data-part="switch" aria-pressed="false"><i>02</i> 轴心与外壳<span>SWITCH</span></button><button data-part="spring" aria-pressed="false"><i>03</i> 回弹弹簧<span>SPRING</span></button><button data-part="pcb" aria-pressed="false"><i>04</i> 信号底板<span>PCB</span></button></div>
      <div class="explode-control"><span>合拢</span><input id="explode" type="range" min="0" max="100" value="100" aria-label="轴体拆解程度"><span>拆解</span><output id="explode-value">100%</output></div>
    </div>
    <div class="anatomy-console"><div class="console-top"><span><i class="status-dot"></i> INSIDE THE EVERYDAY</span><span>01—04</span></div>
      <div class="part-story" aria-live="polite"><span id="part-number">01 / FIRST CONTACT</span><h3 id="part-title">指尖的第一站。</h3><p id="part-description">微凹曲面接住指尖，收拢的边缘勾勒出轮廓。选择不同键帽，在同一把键盘上换一种触感想象。</p></div>
      <div class="signal-window"><div><span>KEY SIGNAL</span><span id="signal-state">WAITING FOR A TOUCH</span></div><svg viewBox="0 0 400 90" preserveAspectRatio="none" aria-hidden="true"><path class="signal-baseline" d="M0 45H400"/><path class="signal-wave" d="M0 45H65L74 43 81 47 88 38 95 55 102 18 109 75 116 7 123 85 130 23 137 63 144 31 151 56 158 39 165 50 172 42 180 47 190 45H400"/></svg><span class="tiny">一次敲击，点亮一段节奏。</span></div>
      <button id="detail-strike" class="detail-strike">按一下，听见回应 <span>↘</span></button><div class="micro-actions"><button id="micro-toggle">合拢轴体</button><button id="micro-return">回到我的键盘 ↗</button></div><p id="micro-selection" class="anatomy-note">点键帽展开；聚焦模型后按字母键试压。</p><p class="anatomy-note">结构与信号为交互概念示意，音色沿用你的搭配。</p>
    </div>
  </div></div>
  <div class="anatomy-bottom"><span>TOUCH → TRAVEL → RETURN</span><strong>细微之处，自有回响。</strong><a href="#play">把节奏交给双手 ↗</a></div>
</section>`;
const stories = {
  cap: [
    "01 / FIRST CONTACT",
    "指尖的第一站。",
    "微凹曲面接住指尖，收拢的边缘勾勒出轮廓。选择不同键帽，在同一把键盘上换一种触感想象。",
  ],
  switch: [
    "02 / A SMALL JOURNEY",
    "让每一次按下，有迹可循。",
    "轴心沿外壳上下运动，把指尖动作变成一次明确的输入。点击下方按钮，观察轴心与键帽的同步下压。",
  ],
  spring: [
    "03 / BACK TO THE START",
    "松开，也是节奏的一部分。",
    "弹簧在按下时压缩，在松开后推动轴心回位。我们也为回弹加入了独立声音，让敲击有始有终。",
  ],
  pcb: [
    "04 / AN IDEA BEGINS",
    "从一个触点，到一个想法。",
    "底板把输入送往下一站。在试打区，实体键盘的按下与松开会同步到模型；这一束信号，由你发起。",
  ],
};
export function setupDetails(play: (release: boolean) => void) {
  let scene: import("./switch-scene").SwitchScene | undefined;
  let selected = "cap";
  let customCap: { label: string; art?: KeyArt } | undefined;
  const host = document.querySelector<HTMLElement>("#switch-canvas")!;
  const observer = new IntersectionObserver(
    async ([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      try {
        const { SwitchScene } = await import("./switch-scene");
        scene = new SwitchScene(host);
        syncScroll();
        scene.setExplode(Number(slider.value) / 100);
        scene.select(selected);
        if (customCap) scene.setCap(customCap.label, customCap.art);
        host.querySelector(".switch-loading")?.remove();
      } catch {
        host.innerHTML =
          '<p class="switch-loading">三维展示暂不可用，请开启图形加速。部件说明与试听仍可使用。</p>';
      }
    },
    { rootMargin: "400px" },
  );
  observer.observe(host);
  window.addEventListener("pagehide", (event) => {
    if (!event.persisted) {
      observer.disconnect();
      scene?.dispose();
    }
  });
  const film = document.querySelector<HTMLElement>(".details-film")!;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const syncScroll = () => {
    if (manual || reduced.matches) return;
    const rect = film.getBoundingClientRect();
    if (rect.top > innerHeight || rect.bottom < 0) return;
    const progress = Math.max(
      0,
      Math.min(1, (24 - rect.top) / Math.max(1, rect.height - innerHeight)),
    );
    slider.value = String(Math.round(progress * 100));
    scene?.setExplode(progress);
    document.querySelector("#explode-value")!.textContent = `${slider.value}%`;
    document.querySelector("#micro-toggle")!.textContent =
      progress > 0.5 ? "合拢轴体" : "展开轴体";
  };
  const scrollAbort = new AbortController();
  window.addEventListener("scroll", syncScroll, {
    passive: true,
    signal: scrollAbort.signal,
  });
  window.addEventListener("resize", syncScroll, { signal: scrollAbort.signal });
  window.addEventListener("pagehide", (e) => {
    if (!e.persisted) scrollAbort.abort();
  });
  const specimen = document.querySelector<HTMLElement>("#specimen")!;
  const slider = document.querySelector<HTMLInputElement>("#explode")!;
  let manual = false;
  slider.addEventListener("input", () => {
    manual = true;
    document.querySelector("#micro-toggle")!.textContent =
      Number(slider.value) > 50 ? "合拢轴体" : "展开轴体";
    scene?.setExplode(Number(slider.value) / 100);
    document.querySelector("#explode-value")!.textContent = `${slider.value}%`;
  });
  document
    .querySelectorAll<HTMLButtonElement>("[data-part]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        const part = button.dataset.part as keyof typeof stories;
        const [number, title, description] = stories[part];
        document.querySelector("#part-number")!.textContent = number;
        document.querySelector("#part-title")!.textContent = title;
        document.querySelector("#part-description")!.textContent = description;
        specimen.dataset.part = part;
        selected = part;
        scene?.select(part);
        document
          .querySelectorAll("[data-part]")
          .forEach((el) =>
            el.setAttribute("aria-pressed", String(el === button)),
          );
      }),
    );
  let timer: ReturnType<typeof setTimeout>;
  const strike = document.querySelector<HTMLButtonElement>("#detail-strike")!;
  strike.addEventListener("click", () => {
    clearTimeout(timer);
    specimen.classList.remove("striking");
    const consoleElement = document.querySelector(".anatomy-console")!;
    consoleElement.classList.remove("striking");
    void specimen.offsetWidth;
    specimen.classList.add("striking");
    consoleElement.classList.add("striking");
    document.querySelector("#signal-state")!.textContent = "CONTACT / RETURN";
    scene?.strike();
    play(false);
    timer = setTimeout(() => {
      specimen.classList.remove("striking");
      consoleElement.classList.remove("striking");
      document.querySelector("#signal-state")!.textContent =
        "READY FOR THE NEXT IDEA";
      play(true);
    }, 420);
  });
  const toggle = document.querySelector<HTMLButtonElement>("#micro-toggle")!;
  const changeSpread = (value: number) => {
    slider.value = String(value);
    slider.dispatchEvent(new Event("input"));
  };
  toggle.onclick = () => changeSpread(Number(slider.value) > 50 ? 0 : 100);
  host.addEventListener("openkey", () =>
    changeSpread(Number(slider.value) > 50 ? 0 : 100),
  );
  host.addEventListener("keydown", (e) => {
    if (!e.repeat && (e.code.startsWith("Key") || e.code === "Space")) {
      e.preventDefault();
      e.stopPropagation();
      strike.click();
    }
  });
  window.addEventListener("inspectkey", (event) => {
    const detail = (
      event as CustomEvent<{ code: string; label: string; art?: KeyArt }>
    ).detail;
    customCap = detail;
    scene?.setCap(detail.label, detail.art);
    changeSpread(100);
    document.querySelector("#micro-selection")!.textContent =
      `正在探索 ${detail.code} · 单键结构示意，宽键使用同一轴体示意`;
    document.querySelector("#details")!.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
    host.focus({ preventScroll: true });
  });
  document.querySelector<HTMLButtonElement>("#micro-return")!.onclick = () => {
    changeSpread(0);
    document.querySelector("#object")!.scrollIntoView({ behavior: "smooth" });
    document
      .querySelector<HTMLElement>("#art-key")
      ?.focus({ preventScroll: true });
  };
  window.addEventListener("pagehide", () => clearTimeout(timer));
}
