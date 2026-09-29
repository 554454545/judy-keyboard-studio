/** Page composition: scroll chapters and an inline, non-modal design drawer. */
export function setupEditorial() {
  const abort = new AbortController();
  const film = document.querySelector<HTMLElement>("#hero-film")!;
  const hero = document.querySelector<HTMLElement>(".hero")!;
  const panel = document.querySelector<HTMLElement>("#design-panel")!;
  const open = document.querySelector<HTMLButtonElement>("#design-open")!;
  const close = document.querySelector<HTMLButtonElement>("#design-close")!;
  const grid = document.querySelector<HTMLElement>(".config-grid")!;
  const setOpen = (value: boolean) => {
    panel.hidden = !value;
    grid.classList.toggle("design-open", value);
    open.setAttribute("aria-expanded", String(value));
    if (!value) open.focus({ preventScroll: true });
    else close.focus({ preventScroll: true });
    window.dispatchEvent(new Event("resize"));
  };
  open.addEventListener("click", () => setOpen(true), { signal: abort.signal });
  close.addEventListener("click", () => setOpen(false), {
    signal: abort.signal,
  });
  panel.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) {
        event.stopPropagation();
        setOpen(false);
      }
    },
    { signal: abort.signal },
  );
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let pending = 0;
  const update = () => {
    pending = 0;
    const rect = film.getBoundingClientRect();
    const progress = Math.max(
      0,
      Math.min(1, -rect.top / Math.max(1, rect.height - innerHeight)),
    );
    hero.style.setProperty("--film-progress", String(progress));
    hero.dataset.chapter = progress < 0.38 ? "surface" : "form";
    document.querySelector("#film-number")!.textContent =
      progress < 0.38
        ? "01 / THE SURFACE"
        : progress < 0.85
          ? "02 / THE WHOLE"
          : "03 / ONE SMALL DETAIL";
    document.querySelector("#film-line")!.textContent =
      progress < 0.38
        ? "光，沿着轮廓慢慢走。"
        : progress < 0.85
          ? "把日常，放进一个喜欢的轮廓。"
          : "再靠近，发现一颗键里的细节。";
    hero.classList.toggle("film-still", reduced.matches);
  };
  const request = () => {
    if (!pending) pending = requestAnimationFrame(update);
  };
  window.addEventListener("scroll", request, {
    passive: true,
    signal: abort.signal,
  });
  window.addEventListener("resize", request, { signal: abort.signal });
  reduced.addEventListener("change", request, { signal: abort.signal });
  update();
  window.addEventListener("pagehide", (event) => {
    if (!event.persisted) {
      abort.abort();
      cancelAnimationFrame(pending);
    }
  });
}
