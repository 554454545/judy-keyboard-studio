import { effectOptions } from "./effect-options";
import { soundNames, type SoundName } from "./palettes";
import { musicMarkup, setupMusic } from "./music";
import { createNightBackground } from "./night-background";
import { landscapeMarkup } from "./landscapes";
export const immersiveMarkup = `
<div id="immersive" class="immersive" data-atmosphere="aurora" role="dialog" aria-modal="true" aria-label="沉浸式键盘试打" hidden>
  <div id="scenery" aria-hidden="true"><video muted loop playsinline preload="none" disablepictureinpicture></video><video muted loop playsinline preload="none" disablepictureinpicture></video></div><div class="scenery-shade" aria-hidden="true"></div>
  <div class="immersive-top immersive-ui"><div class="immersive-brand">judy<span> / THE TYPING ROOM</span></div><span id="fullscreen-state">沉浸试打</span><button id="exit-immersive" aria-label="退出沉浸模式">退出 <kbd>ESC</kbd> ↗</button></div>
  <div id="immersive-scene-anchor"></div>
  <div class="immersive-bottom immersive-ui">${landscapeMarkup}<div class="immersive-actions"><button id="weather-toggle" aria-pressed="true">环境触感 开</button><button id="background-motion" aria-pressed="true">动态风景 开</button><button id="immersive-view" aria-label="重置沉浸视角">重置视角 ↺</button><button id="immersive-sound" aria-pressed="false">声音</button><label class="immersive-voice-label">键音<select id="immersive-voice" aria-label="全景敲击音色">${Object.entries(
    soundNames,
  )
    .map(([id, name]) => `<option value="${id}">${name}</option>`)
    .join(
      "",
    )}</select></label><label>按键特效<select id="immersive-effect" aria-label="全景按键特效">${effectOptions}</select></label><label>缩放<input id="immersive-zoom" type="range" min="80" max="125" value="100" aria-label="沉浸键盘大小"></label></div>${musicMarkup}<span id="landscape-status" class="landscape-status" role="status"></span><p>直接敲击你的键盘 · 拖动旋转 · 移动鼠标唤回控制栏</p></div>
</div>`;
interface Hooks {
  enter(): void;
  exit(): void;
  reset(): void;
  atmosphere(name: string, motion: boolean): void;
  zoom(value: number): void;
  sound(): Promise<void>;
  voice(name: SoundName): void;
}
export function setupImmersive(hooks: Hooks) {
  const root = document.querySelector<HTMLDivElement>("#immersive")!;
  const music = setupMusic();
  const background = createNightBackground(root);
  const landscapeLibrary =
    document.querySelector<HTMLElement>("#landscape-library")!;
  const landscapeOpen =
    document.querySelector<HTMLButtonElement>("#landscape-open")!;
  const closeLandscapes = () => {
    landscapeLibrary.hidden = true;
    landscapeOpen.setAttribute("aria-expanded", "false");
  };
  document
    .querySelector("#music-open")!
    .addEventListener("click", closeLandscapes);
  landscapeOpen.addEventListener("click", () => {
    landscapeLibrary.hidden = !landscapeLibrary.hidden;
    if (!landscapeLibrary.hidden) {
      document.querySelector<HTMLElement>("#music-library")!.hidden = true;
      document
        .querySelector("#music-open")!
        .setAttribute("aria-expanded", "false");
    }
    landscapeOpen.setAttribute(
      "aria-expanded",
      String(!landscapeLibrary.hidden),
    );
    wake();
  });
  document.querySelector("#landscape-close")!.addEventListener("click", () => {
    closeLandscapes();
    landscapeOpen.focus();
  });
  let active = false,
    ownsFullscreen = false,
    exiting = false;
  let fullscreenRequest: Promise<void> | null = null;
  let previousFocus: HTMLElement | null = null,
    overflow = "";
  const inertStates = new Map<HTMLElement, boolean>();
  let idle: ReturnType<typeof setTimeout>;
  const wake = () => {
    if (!active) return;
    root.classList.remove("ui-hidden");
    clearTimeout(idle);
    idle = setTimeout(() => {
      if (
        !root.querySelector(
          ".immersive-ui:focus-within, .immersive-ui:hover",
        ) &&
        document.querySelector<HTMLElement>("#music-library")!.hidden &&
        landscapeLibrary.hidden
      )
        root.classList.add("ui-hidden");
    }, 2800);
  };
  async function exit() {
    if (!active) return;
    active = false;
    exiting = true;
    clearTimeout(idle);
    root.hidden = true;
    root.classList.remove("ui-hidden");
    document.body.style.overflow = overflow;
    inertStates.forEach((value, el) => (el.inert = value));
    inertStates.clear();
    closeLandscapes();
    music.exit();
    background.stop();
    hooks.atmosphere("none", false);
    hooks.exit();
    await fullscreenRequest?.catch(() => {});
    if (document.fullscreenElement === root)
      await document.exitFullscreen().catch(() => {});
    ownsFullscreen = false;
    exiting = false;
    previousFocus?.focus({ preventScroll: true });
  }
  async function enter() {
    if (active || exiting) return;
    previousFocus = document.activeElement as HTMLElement;
    active = true;
    root.hidden = false;
    document.querySelector("#fullscreen-state")!.textContent =
      "窗口全景 · 直接敲击键盘";
    overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // The overlay lives beside #app; only our own page siblings are made inert.
    for (const el of [...document.body.children])
      if (el instanceof HTMLElement && el !== root && el.tagName !== "SCRIPT") {
        inertStates.set(el, el.inert);
        el.inert = true;
      }
    hooks.enter();
    music.enter();
    background.start();
    updateContact();
    document
      .querySelector<HTMLElement>("#scene-host")
      ?.focus({ preventScroll: true });
    wake();
    if (!document.fullscreenElement && root.requestFullscreen) {
      fullscreenRequest = root.requestFullscreen();
      try {
        await fullscreenRequest;
        ownsFullscreen = active;
        if (active)
          document.querySelector("#fullscreen-state")!.textContent =
            "全屏试打 · 只剩你的节奏";
      } catch {
        if (active)
          document.querySelector("#fullscreen-state")!.textContent =
            "窗口全景 · 直接敲击键盘";
      }
    }
  }
  let contactEnabled = true;
  const updateContact = () =>
    hooks.atmosphere(
      active && contactEnabled ? root.dataset.atmosphere || "aurora" : "none",
      document
        .querySelector("#background-motion")!
        .getAttribute("aria-pressed") === "true" &&
        !matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  document.querySelector<HTMLButtonElement>("#weather-toggle")!.onclick = (
    event,
  ) => {
    contactEnabled = !contactEnabled;
    const button = event.currentTarget as HTMLButtonElement;
    button.setAttribute("aria-pressed", String(contactEnabled));
    button.textContent = contactEnabled ? "环境触感 开" : "环境触感 停";
    updateContact();
    wake();
  };
  root.addEventListener("pointermove", wake);
  root.addEventListener("pointerdown", wake);
  root.addEventListener("focusin", wake);
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (!landscapeLibrary.hidden) {
        closeLandscapes();
        landscapeOpen.focus();
        return;
      }
      void exit();
      return;
    }
    if (event.key === "Tab") {
      wake();
      const items = [
        ...root.querySelectorAll<HTMLElement>(
          'button,input,select,[tabindex="0"]',
        ),
      ].filter(
        (el) => !el.hasAttribute("disabled") && el.getClientRects().length > 0,
      );
      const index = items.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey && index <= 0) {
        event.preventDefault();
        items.at(-1)?.focus();
      } else if (!event.shiftKey && index === items.length - 1) {
        event.preventDefault();
        items[0]?.focus();
      }
    } else if (
      event.target === document.querySelector("#scene-host") &&
      [" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
        event.key,
      )
    )
      event.preventDefault();
  });
  document.addEventListener("fullscreenchange", () => {
    if (active && ownsFullscreen && !document.fullscreenElement) void exit();
  });
  document
    .querySelector("#exit-immersive")!
    .addEventListener("click", () => void exit());
  document
    .querySelectorAll<HTMLButtonElement>("[data-atmosphere-choice]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        root.dataset.atmosphere = button.dataset.atmosphereChoice;
        updateContact();
        closeLandscapes();
        document
          .querySelectorAll("[data-atmosphere-choice]")
          .forEach((el) =>
            el.setAttribute("aria-pressed", String(el === button)),
          );
        document
          .querySelector<HTMLElement>("#scene-host")
          ?.focus({ preventScroll: true });
        wake();
      }),
    );
  document
    .querySelector("#immersive-voice")!
    .addEventListener("change", (event) => {
      hooks.voice((event.target as HTMLSelectElement).value as SoundName);
      document
        .querySelector<HTMLElement>("#scene-host")
        ?.focus({ preventScroll: true });
    });
  document.querySelector("#immersive-view")!.addEventListener("click", () => {
    hooks.reset();
    document
      .querySelector<HTMLElement>("#scene-host")
      ?.focus({ preventScroll: true });
  });
  document
    .querySelector("#immersive-sound")!
    .addEventListener("click", () => void hooks.sound());
  document
    .querySelector<HTMLInputElement>("#immersive-zoom")!
    .addEventListener("input", (event) =>
      hooks.zoom(Number((event.target as HTMLInputElement).value) / 100),
    );
  document
    .querySelector("#immersive-zoom")!
    .addEventListener("pointerup", () =>
      document
        .querySelector<HTMLElement>("#scene-host")
        ?.focus({ preventScroll: true }),
    );
  document
    .querySelector("#background-motion")!
    .addEventListener("click", (event) => {
      const enabled = background.toggle(),
        button = event.currentTarget as HTMLButtonElement;
      button.setAttribute("aria-pressed", String(enabled));
      updateContact();

      document
        .querySelector<HTMLElement>("#scene-host")
        ?.focus({ preventScroll: true });
    });
  window.addEventListener("pagehide", () => clearTimeout(idle));
  return { enter, exit, wake, isActive: () => active };
}
