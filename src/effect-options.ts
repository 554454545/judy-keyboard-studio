export const keyEffects = {
  ripple: "光环扩散",
  sparks: "星屑迸发",
  beam: "霓虹光柱",
  none: "仅机械按压",
};
export type KeyEffect = keyof typeof keyEffects;
export const effectOptions = Object.entries(keyEffects)
  .map(([id, name]) => `<option value="${id}">${name}</option>`)
  .join("");
