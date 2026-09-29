export const atmospheres = {
  aurora: {
    name: "极光山谷",
    english: "ARCTIC LIGHT",
    detail: "山谷剪影与真实极光延时",
  },
  ocean: {
    name: "落日海岸",
    english: "GOLDEN TIDE",
    detail: "落日倒影，潮水缓缓涌上岸",
  },
  paper: {
    name: "雨窗灯影",
    english: "RAIN ON GLASS",
    detail: "玻璃水滴与窗外失焦的车灯",
  },
  forest: {
    name: "林间微光",
    english: "FOREST LIGHT",
    detail: "林间光线穿过层叠的树冠",
  },
  ink: {
    name: "银河长夜",
    english: "MILKY WAY",
    detail: "星空延时，银河越过夜幕",
  },
  clouds: {
    name: "云过山脊",
    english: "PASSING CLOUDS",
    detail: "低云翻过山脊，远近明暗交错",
  },
  snow: {
    name: "松枝冬雪",
    english: "WINTER PINES",
    detail: "覆雪松枝轻摇，冰雪与树影交叠",
  },
  fire: {
    name: "篝火余温",
    english: "EMBER GLOW",
    detail: "木柴火焰与不规则跃动的暖光",
  },
  dune: {
    name: "沙海暮色",
    english: "DESERT DRIFT",
    detail: "沙丘上的日光、纹理与深长阴影",
  },
  waterfall: {
    name: "深林瀑布",
    english: "HIDDEN FALLS",
    detail: "瀑布、水雾与湿润的深绿岩壁",
  },
} as const;
export type Atmosphere = keyof typeof atmospheres;
export const landscapeMarkup = `<div class="landscape-selector"><button id="landscape-open" aria-expanded="false" aria-controls="landscape-library"><span class="landscape-preview"></span><span><small>选择风景 · 10 SCENES</small><strong id="landscape-name">极光山谷</strong></span><span class="landscape-chevron">↗</span></button></div>
<section id="landscape-library" aria-labelledby="landscape-title" hidden><header><div><span class="tiny">A WINDOW ELSEWHERE / 10 SCENES</span><h3 id="landscape-title">让风景，慢慢发生。</h3></div><button id="landscape-close" aria-label="关闭风景选择">×</button></header><div class="atmosphere-options" role="group" aria-label="沉浸背景">${Object.entries(
  atmospheres,
)
  .map(
    ([id, p], i) =>
      `<button data-atmosphere-choice="${id}" aria-pressed="${i === 0}" title="${p.detail}"><img src="/backgrounds/${id}.jpg" loading="lazy" alt=""><span><strong>${p.name}</strong><small>${p.english}</small></span></button>`,
  )
  .join(
    "",
  )}</div><footer><span>实景影像 · 无声循环</span><span id="landscape-description">山谷剪影与真实极光延时</span></footer></section>`;
