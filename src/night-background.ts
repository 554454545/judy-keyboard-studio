import { atmospheres, type Atmosphere } from "./landscapes";
/** Two native video layers preserve real photographic detail and crossfade on selection. */
export function createNightBackground(room: HTMLElement) {
  const stage = room.querySelector<HTMLElement>("#scenery")!;
  const videos = [...stage.querySelectorAll("video")];
  const button = room.querySelector<HTMLButtonElement>("#background-motion")!;
  const status = room.querySelector<HTMLElement>("#landscape-status")!;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let active = false,
    motion = !reduced.matches,
    explicitMotion = false;
  let selected: Atmosphere = "aurora",
    current = -1,
    generation = 0;
  let loading: AbortController | undefined;
  let retirement: ReturnType<typeof setTimeout>;
  function sync() {
    button.setAttribute("aria-pressed", String(motion));
    button.textContent = motion ? "动态风景 开" : "动态风景 停";
    button.title =
      !motion && reduced.matches
        ? "已遵循减少动态效果偏好；可手动开启"
        : "暂停或继续当前风景";
  }
  function stopVideos() {
    videos.forEach((v) => v.pause());
  }
  function choose(id: Atmosphere, reload = false) {
    selected = id;
    stage.style.backgroundImage = `url("/backgrounds/${id}.jpg")`;
    room.querySelector<HTMLElement>(
      ".landscape-preview",
    )!.style.backgroundImage = `url("/backgrounds/${id}.jpg")`;
    room.querySelector("#landscape-name")!.textContent = atmospheres[id].name;
    room.querySelector("#landscape-description")!.textContent =
      atmospheres[id].detail;
    generation++;
    const ticket = generation;
    loading?.abort();
    clearTimeout(retirement);
    if (!active || document.hidden || !motion) {
      stopVideos();
      if (current < 0 || videos[current].dataset.scene !== id)
        videos.forEach((v) => v.classList.remove("visible"));
      status.textContent = "静态风景";
      room.dataset.sceneryState = "paused";
      return;
    }
    if (
      !reload &&
      current >= 0 &&
      videos[current].dataset.scene === id &&
      videos[current].readyState >= 2
    ) {
      videos[current].classList.add("visible");
      videos[current].play().catch(() => {
        if (ticket === generation) fallback();
      });
      status.textContent = "实景循环";
      room.dataset.sceneryState = "playing";
      return;
    }
    const next = current === 0 ? 1 : 0,
      video = videos[next];
    videos.forEach((v, i) => {
      if (i !== current) {
        v.pause();
        v.classList.remove("visible");
      }
    });
    video.dataset.scene = id;
    video.muted = true;
    video.poster = `/backgrounds/${id}.jpg`;
    status.textContent = "正在打开风景…";
    room.dataset.sceneryState = "loading";
    const abort = (loading = new AbortController());
    const fail = () => {
      if (ticket === generation) fallback();
    };
    video.addEventListener("error", fail, { signal: abort.signal, once: true });
    video.addEventListener(
      "loadeddata",
      async () => {
        if (ticket !== generation || !active || document.hidden || !motion)
          return;
        try {
          await video.play();
          if (ticket !== generation) return;
          if (!active || document.hidden || !motion) {
            video.pause();
            return;
          }
          const previous = current;
          current = next;
          video.classList.add("visible");
          if (previous >= 0 && previous !== next)
            videos[previous].classList.remove("visible");
          retirement = setTimeout(
            () =>
              videos.forEach((v, i) => {
                if (i !== current) v.pause();
              }),
            750,
          );
          status.textContent = "实景循环";
          room.dataset.sceneryState = "playing";
        } catch {
          fail();
        }
      },
      { signal: abort.signal, once: true },
    );
    video.src = `/backgrounds/${id}.mp4`;
    video.load();
  }
  function fallback() {
    stopVideos();
    videos.forEach((v) => v.classList.remove("visible"));
    current = -1;
    status.textContent = "静态预览 · 点击动态风景重试";
    room.dataset.sceneryState = "fallback";
  }
  const observer = new MutationObserver(() =>
    choose(room.dataset.atmosphere as Atmosphere),
  );
  observer.observe(room, {
    attributes: true,
    attributeFilter: ["data-atmosphere"],
  });
  const visibility = () => {
    if (document.hidden) {
      generation++;
      loading?.abort();
      stopVideos();
    } else if (active) choose(selected);
  };
  document.addEventListener("visibilitychange", visibility);
  const preference = () => {
    if (!explicitMotion) motion = !reduced.matches;
    sync();
    if (active) choose(selected);
  };
  reduced.addEventListener("change", preference);
  sync();
  window.addEventListener("pagehide", (event) => {
    generation++;
    loading?.abort();
    stopVideos();
    clearTimeout(retirement);
    if (!event.persisted) {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      reduced.removeEventListener("change", preference);
      videos.forEach((v) => {
        v.removeAttribute("src");
        v.load();
      });
    }
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted && active) choose(selected);
  });
  return {
    start() {
      active = true;
      choose(selected);
    },
    stop() {
      active = false;
      generation++;
      loading?.abort();
      stopVideos();
      clearTimeout(retirement);
    },
    toggle() {
      explicitMotion = true;
      if (room.dataset.sceneryState === "fallback") {
        motion = true;
        choose(selected, true);
      } else {
        motion = !motion;
        choose(selected);
      }
      sync();
      return motion;
    },
  };
}
