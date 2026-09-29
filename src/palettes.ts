import type { FormName } from "./key-layout";
export const palettes = {
  obsidian: {
    name: "极夜冰川",
    english: "OBSIDIAN / GLACIER",
    body: "#19242e",
    key: "#435361",
    modifier: "#293844",
    accent: "#94bfd0",
  },
  moon: {
    name: "月岩灰",
    english: "LUNAR STUDIO",
    body: "#637078",
    key: "#dce1df",
    modifier: "#82918f",
    accent: "#ef8055",
  },
  oat: {
    name: "燕麦拿铁",
    english: "OAT MILK",
    body: "#a79b83",
    key: "#e7decb",
    modifier: "#b8a88b",
    accent: "#bc6547",
  },
  ink: {
    name: "午夜墨色",
    english: "AFTER HOURS",
    body: "#252c35",
    key: "#37414d",
    modifier: "#566274",
    accent: "#8ea7d8",
  },
  sage: {
    name: "鼠尾草地",
    english: "SLOW MORNING",
    body: "#637769",
    key: "#dce2d2",
    modifier: "#9ba98e",
    accent: "#d4ac52",
  },
  blossom: {
    name: "樱花汽水",
    english: "CHERRY SODA",
    body: "#d0a7b1",
    key: "#f0dfe4",
    modifier: "#c690a3",
    accent: "#8c5276",
  },
  ocean: {
    name: "深海电台",
    english: "DEEP FREQUENCY",
    body: "#233f52",
    key: "#d7e4e5",
    modifier: "#709899",
    accent: "#de9b62",
  },
  violet: {
    name: "紫色黄昏",
    english: "AFTERGLOW",
    body: "#524661",
    key: "#c9bedb",
    modifier: "#887597",
    accent: "#d9b987",
  },
  panda: {
    name: "黑白映画",
    english: "MONOCHROME",
    body: "#424746",
    key: "#e4e4dc",
    modifier: "#444c4b",
    accent: "#cf5d42",
  },
  arcade: {
    name: "街机时代",
    english: "INSERT COIN",
    body: "#272837",
    key: "#777b9a",
    modifier: "#454563",
    accent: "#d4e970",
  },
  mint: {
    name: "薄荷冰川",
    english: "MINT CONDITION",
    body: "#479a99",
    key: "#daeee7",
    modifier: "#85c5b6",
    accent: "#f5d176",
  },
  coral: {
    name: "珊瑚海岸",
    english: "CORAL CLUB",
    body: "#b9554c",
    key: "#f6d4bd",
    modifier: "#dc907a",
    accent: "#577d82",
  },
  cobalt: {
    name: "克莱因蓝",
    english: "ELECTRIC BLUE",
    body: "#233ec8",
    key: "#dce4f6",
    modifier: "#819ade",
    accent: "#f5cc49",
  },
  matcha: {
    name: "抹茶布丁",
    english: "MATCHA BREAK",
    body: "#718052",
    key: "#e8e6be",
    modifier: "#b4c48a",
    accent: "#eea0a0",
  },
  sunset: {
    name: "落日公路",
    english: "GOLDEN HOUR",
    body: "#824e6d",
    key: "#f4c491",
    modifier: "#e68f72",
    accent: "#a8b2d1",
  },
  lilac: {
    name: "芋泥云朵",
    english: "LILAC DREAM",
    body: "#9b8dbb",
    key: "#ece5f4",
    modifier: "#c3b4dd",
    accent: "#b5d4ae",
  },
  racing: {
    name: "赛道红线",
    english: "REDLINE",
    body: "#272b2e",
    key: "#42484c",
    modifier: "#202526",
    accent: "#ed493e",
  },
  citrus: {
    name: "柠檬电流",
    english: "ACID THEORY",
    body: "#465050",
    key: "#d5dfba",
    modifier: "#929f82",
    accent: "#d4f34a",
  },
  terracotta: {
    name: "赤陶工坊",
    english: "EARTH STUDY",
    body: "#a36147",
    key: "#e8d8bb",
    modifier: "#bd9c7c",
    accent: "#648c88",
  },
  glacier: {
    name: "极地银光",
    english: "POLAR SILVER",
    body: "#95a6b5",
    key: "#eff4f6",
    modifier: "#becfda",
    accent: "#79aada",
  },
  peach: {
    name: "蜜桃乌龙",
    english: "PEACH PLEASE",
    body: "#d39c86",
    key: "#f6e3cd",
    modifier: "#eeb6a5",
    accent: "#9bab80",
  },
  noir: {
    name: "黑金唱片",
    english: "GOLD RECORD",
    body: "#282622",
    key: "#444037",
    modifier: "#77705a",
    accent: "#cfad68",
  },
} as const;
export type PaletteName = keyof typeof palettes;
export type ViewName = "studio" | "top" | "side";
export type ProfileName = "cherry" | "round" | "low";
export type FinishName = "anodized" | "matte" | "ceramic";
export type LegendName = "classic" | "minimal" | "dual";
export type SoundName =
  | "cream"
  | "marble"
  | "blue"
  | "typewriter"
  | "silent"
  | "wood"
  | "glass"
  | "retro"
  | "rain"
  | "bubble"
  | "copper"
  | "felt";
export type ColorZone = "body" | "key" | "modifier" | "accent";
export interface KeyboardConfig {
  palette: PaletteName | "custom";
  form: FormName;
  body: string;
  key: string;
  modifier: string;
  accent: string;
  profile: ProfileName;
  finish: FinishName;
  legend: LegendName;
  sound: SoundName;
  overrides: Record<string, string>;
}
export const profileNames: Record<ProfileName, string> = {
  cherry: "阶梯凹面",
  round: "圆润球面",
  low: "轻薄平面",
};
export const soundNames: Record<SoundName, string> = {
  cream: "奶油柔轴",
  marble: "麻将石音",
  blue: "清脆青轴",
  typewriter: "复古打字机",
  silent: "静音绵轴",
  wood: "胡桃木声",
  glass: "玻璃铃音",
  retro: "街机脉冲",
  rain: "细雨落键",
  bubble: "气泡轻弹",
  copper: "铜片回响",
  felt: "毛毡低语",
};
export const soundDescriptions: Record<SoundName, string> = {
  cream: "低频闷敲 / 聚合物厚响",
  marble: "陶瓷双击 / 干脆碰撞",
  blue: "双段脆响 / 高频咔嗒",
  typewriter: "杠杆撞击 / 棘轮连响",
  silent: "软垫短触 / 无音高噪声",
  wood: "木琴共振 / 温暖干燥",
  glass: "玻璃高音 / 清亮长尾",
  retro: "8-bit 音阶 / 跳跃颗粒",
  rain: "雨丝沙响 / 零落水滴",
  bubble: "水腔滑音 / 圆润啵声",
  copper: "铜片拍频 / 金属长鸣",
  felt: "柔槌慢起 / 温暖短音",
};
export function initialConfig(): KeyboardConfig {
  return {
    palette: "obsidian",
    form: "classic",
    ...palettes.obsidian,
    profile: "cherry",
    finish: "anodized",
    legend: "dual",
    sound: "bubble",
    overrides: {},
  };
}
export function contrastInk(hex: string) {
  const channel = (n: number) => {
    const v = n / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = [1, 3, 5].map((i) =>
    channel(parseInt(hex.slice(i, i + 2), 16)),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.23 ? "#263238" : "#f4f3ea";
}
