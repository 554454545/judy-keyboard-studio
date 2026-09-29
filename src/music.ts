import tracks from "./music-library.json";
export { tracks };
export const musicMarkup = `
<div class="music-deck"><button id="music-toggle" aria-label="暂停背景音乐" aria-pressed="false">▷</button><button id="music-open" aria-expanded="false" aria-controls="music-library"><span class="music-disc" aria-hidden="true"></span><span><small>NIGHT RADIO / 10 ORIGINAL STUDIES</small><strong id="music-current">${tracks[0].name}</strong></span><span>☷</span></button><label class="music-volume">音乐<input id="music-volume" type="range" min="0" max="100" value="22" aria-label="背景音乐音量"></label></div>
<div id="music-library" class="music-library immersive-ui" hidden><div class="music-library-header"><div><span class="tiny">CURATED FOR THE QUIET HOURS</span><h3>给夜晚，一张唱片。</h3></div><button id="music-close" aria-label="收起音乐曲库">×</button></div><div class="music-tracks">${tracks.map((t, i) => `<button data-track="${t.id}" aria-pressed="${i === 0}"><span class="track-number">${String(i + 1).padStart(2, "0")}</span><span><strong>${t.name}</strong><small>${t.mood}</small></span><span class="track-duration">${Math.floor(t.duration / 60)}:${String(t.duration % 60).padStart(2, "0")}</span></button>`).join("")}</div><div class="music-library-footer"><span id="music-status" role="status">原创器乐循环 · 本地播放</span><span id="music-time">0:00</span></div></div>`;
export function setupMusic() {
  const player = new Audio();
  player.id = "ambient-audio";
  player.preload = "none";
  player.loop = true;
  player.volume = 0.22;
  document.querySelector("#immersive")!.append(player);
  let selected = 0,
    active = false,
    desired = true,
    resumeAfterVisibility = false,
    request = 0;
  const toggle = document.querySelector<HTMLButtonElement>("#music-toggle")!;
  const library = document.querySelector<HTMLElement>("#music-library")!;
  const status = document.querySelector<HTMLElement>("#music-status")!;
  const focusScene = () =>
    document
      .querySelector<HTMLElement>("#scene-host")
      ?.focus({ preventScroll: true });
  function update() {
    const playing = !player.paused && !player.ended;
    toggle.textContent = playing ? "Ⅱ" : "▷";
    toggle.setAttribute("aria-pressed", String(playing));
    toggle.setAttribute(
      "aria-label",
      playing ? "暂停背景音乐" : "播放背景音乐",
    );
    document
      .querySelector(".music-deck")!
      .classList.toggle("is-playing", playing);
    document.querySelector("#music-current")!.textContent =
      tracks[selected].name;
    document
      .querySelectorAll<HTMLElement>("[data-track]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.track === tracks[selected].id),
        ),
      );
  }
  async function play() {
    const id = ++request;
    if (!active || !desired) return;
    if (player.getAttribute("src") !== tracks[selected].src)
      player.src = tracks[selected].src;
    try {
      await player.play();
      if (!active || !desired) player.pause();
      else if (id === request) status.textContent = "正在播放 · 原创器乐循环";
    } catch {
      if (id === request && active && desired)
        status.textContent = "点击播放开始音乐；若仍无声，请换一首重试。";
    }
    update();
  }
  function pause() {
    request++;
    player.pause();
    update();
  }
  toggle.addEventListener("click", () => {
    desired = player.paused;
    if (desired) void play();
    else {
      pause();
      status.textContent = "音乐已暂停";
    }
    focusScene();
  });
  document
    .querySelectorAll<HTMLButtonElement>("[data-track]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        selected = tracks.findIndex((t) => t.id === button.dataset.track);
        desired = true;
        pause();
        void play();
        update();
      }),
    );
  document.querySelector("#music-open")!.addEventListener("click", () => {
    library.hidden = !library.hidden;
    document
      .querySelector("#music-open")!
      .setAttribute("aria-expanded", String(!library.hidden));
    if (!library.hidden)
      library
        .querySelector<HTMLButtonElement>(
          `[data-track="${tracks[selected].id}"]`,
        )
        ?.focus();
  });
  document.querySelector("#music-close")!.addEventListener("click", () => {
    library.hidden = true;
    document
      .querySelector("#music-open")!
      .setAttribute("aria-expanded", "false");
    focusScene();
  });
  document
    .querySelector<HTMLInputElement>("#music-volume")!
    .addEventListener("input", (event) => {
      player.volume = Number((event.target as HTMLInputElement).value) / 100;
    });
  player.addEventListener("play", update);
  player.addEventListener("pause", update);
  player.addEventListener("error", () => {
    status.textContent = "这首音乐暂时无法播放，请选择另一首。";
    update();
  });
  player.addEventListener("timeupdate", () => {
    const t = Math.floor(player.currentTime);
    document.querySelector("#music-time")!.textContent =
      `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      resumeAfterVisibility = !player.paused;
      pause();
    } else if (active && desired && resumeAfterVisibility) {
      resumeAfterVisibility = false;
      void play();
    }
  });
  window.addEventListener("pagehide", () => {
    active = false;
    pause();
  });
  update();
  return {
    enter() {
      active = true;
      if (desired) void play();
    },
    exit() {
      active = false;
      pause();
      library.hidden = true;
      document
        .querySelector("#music-open")!
        .setAttribute("aria-expanded", "false");
    },
  };
}
