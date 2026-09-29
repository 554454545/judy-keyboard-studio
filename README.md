# JUDY Keyboard Studio

一个以键盘为主角的交互式 3D 网页：在冷黑色工作室里搭配键盘、定制键帽、试听键音，或进入带实景背景和音乐的全景模式。

使用 **TypeScript + Three.js + Vite**，纯前端运行，无需后端、账户或实体键盘配对。模型由代码生成；这是键盘概念体验，不是硬件配置工具或商品销售页面。

## 快速开始

需要 **Node.js 22.18+** 和 npm。

```bash
npm ci
npm run dev -- --port 4173
```

打开 <http://localhost:4173>。

```bash
npm run build                    # 类型检查并生成 dist/
npm run preview -- --port 4174    # 预览生产构建
```

## 可以玩什么

| 区域 | 功能 |
| --- | --- |
| 首页 | 滚动镜头从键盘局部拉至全貌，Esc 键帽抬起；节奏试听轮换展示简短词汇 |
| 搭配工作台 | 5 种布局、22 套配色、分区及逐键上色、3 种键帽轮廓和多种材质 |
| 定制工坊 | 刻字、内置图案、图片键帽、可拖动灯光、微缩世界和键帽失重 |
| 机械细节 | 轴体随滚动拆解，支持手动展开、部件说明和试压回弹 |
| 实机试打 | 实体按键与模型联动、长按及组合键、12 种合成键音和按键特效 |
| 全景模式 | 10 种本地实景视频背景、10 首原创器乐循环、自动收起的控制栏 |
| 摄影台 | 调整角度、灯光、背景与标题，导出横屏壁纸或竖版海报 |

### 初始外观

默认采用 **极夜冰川配色 + 透明冰晶材质 + 气泡轻弹键音 + 冷白工作灯**。

键盘采用分层悬浮机身、楔形底座、钛色收边、内框细光线与可见支架。空格带有 `JUDY / 001` 金属嵌条。按键松开后不会累积黄色余温。

### 搭配与定制

- 布局：经典 75、紧凑 60、蝶翼 Alice、分体 Orbit、单手 Solo。名称是概念布局类别，不代表精确商用产品规格。
- 配色可分页、筛选和预览，支持机身、字母键、功能键、重点键独立调色及逐键覆盖。
- 材质：原始搭配、透明冰晶、烟黑半透、复古奶油、拉丝金属。手动选择材质时可联动键音与灯光，也可关闭联动。
- 支持键帽图案、最多 18 字符刻字，以及 PNG/JPG/WebP 图片。图片上限 8 MB，在浏览器内解码并缩小，不上传服务器。
- 选中键帽后，可安装雨夜站台、月球基地、水母水箱或小兔温室；同一时间展示一个微缩世界。
- 保存搭配会下载基础配置 JSON；图片、工坊材质和微缩世界等会话设置不包含在该文件中。目前没有 JSON 导入功能。
- 摄影导出支持 1920 × 1080 横屏及 1080 × 1350 竖版 PNG。

### 试打与全景

点击试打区后使用实体键盘，网页通过 `KeyboardEvent.code` 映射物理键位。Alice 的两颗空格同时响应 Space，单手布局只响应其包含的键位。移动端可点击模型输入。

键音由 Web Audio 合成，包括气泡轻弹、奶油柔轴、麻将石音、青轴、打字机、木声、玻璃铃音等，共 12 种；并非实体键盘采样。支持音量、静音及按下/回弹反馈。

进入全景后可选择风景与音乐、旋转缩放键盘。控制栏闲置后自动隐藏，移动指针或键盘焦点可唤回。Esc 退出；普通模式长按 Esc 也可通过传送门进入全景。浏览器拒绝原生全屏时使用占满窗口的界面。

背景只按需加载，退出或页面进入后台时暂停视频和音乐。减少动态效果偏好下默认显示静态风景并减少动画。浏览器通常要求第一次点击或按键后才能播放音频。

## 数据与限制

- 试打文本、最近按键和击键统计只存在于当前页面内存，不保存、不上传。
- 浏览器本地存储仅用于记住是否看过组装开场；定制内容刷新后清空，请及时导出图片或基础配置。
- 无设备配对、固件刷写、硬件灯效同步或系统级键盘监听。Fn、系统保留快捷键及当前布局缺少的键不保证可视化。
- 需要支持 WebGL 的现代浏览器；复杂透明材质和视频在性能较弱的设备上可能较慢。
- 轴体结构、环境触感和失重运动均为视觉示意，不是制造图或精确物理仿真。

## 部署

这是静态站点。托管平台设置：

| 配置 | 值 |
| --- | --- |
| 安装命令 | `npm ci` |
| 构建命令 | `npm run build` |
| 输出目录 | `dist` |
| Node.js | 22.18 或更高版本 |

可以部署到支持静态文件的托管平台。当前资源使用根路径，默认应部署到域名根目录；若部署到子目录，需要调整 Vite base 及代码中的资源路径。GitHub 仓库本身不等于已上线网站。

## 项目结构

```text
src/
  main.ts                  页面与实体键盘事件
  scene.ts                 键盘场景、材质、模型与摄影
  keyboard-model.ts        键帽几何
  key-layout.ts            五种布局及配色预览
  palettes.ts              配色与初始配置
  editorial.ts / .css      首页滚动叙事与搭配面板
  atelier.ts / .css        定制工坊、开场和摄影台
  key-art.ts               图案、刻字与图片绘制
  switch-scene.ts          三维轴体拆解
  wonder-field.ts          微缩世界、传送门和失重
  immersive.ts             全景生命周期与控制栏
  night-background.ts      视频背景切换
  sound.ts                 合成键音
  music.ts                 背景音乐播放
public/
  backgrounds/             视频、预览图与来源清单
  music/                   十首本地器乐循环
  fonts/                   本地字体及许可证
scripts/                   验证与素材制作工具
```

`node_modules/`、`dist/` 和 `artifacts/` 不提交到仓库。三维场景按需加载，并在首页、搭配区、试打区和全景间复用。

## 验证

```bash
npm run build
npm run test:model
```

浏览器检查使用隔离的无头 Chromium。先安装浏览器并启动生产预览，再执行对应脚本：

```bash
npx playwright install chromium
mkdir -p artifacts
npm run preview -- --port 4174
# 在另一终端运行
TEST_URL=http://localhost:4174 npm run test:browser
TEST_URL=http://localhost:4174 npm run test:obsidian
```

其他专项检查可在 `package.json` 查看：`test:studio`、`test:night`、`test:motion`、`test:scenery`、`test:voices`、`test:atelier`、`test:opening`、`test:wonders`、`test:opening-sound`、`test:wonder-motion`、`test:editorial`。截图及音频分析输出在 `artifacts/`。这些脚本不等于所有浏览器和真实设备均已验证。

## 素材与来源

- **实景视频**：来自 [Mixkit](https://mixkit.co/)，所选素材的来源、作者和加工信息记录在 [sources.json](public/backgrounds/sources.json) 与 [CREDITS.txt](public/backgrounds/CREDITS.txt)。第三方视频适用其自身许可，不随项目代码自动获得新的授权。
- **字体**：DM Sans、Noto Sans SC；SIL Open Font License 位于 [public/fonts](public/fonts/)。中文字体做了子集化，添加文案后可能需要重新生成。
- **音乐**：项目程序编配并合成的十首器乐循环，没有第三方录音采样。生成脚本为 `scripts/compose-music.py`，需要 Python、NumPy 和 FFmpeg。
- **模型与图案**：由项目代码生成，无品牌产品模型或图片依赖。
- **设计参考**：暗色氛围参考 [VANTA](https://vanta-snowboard.vercel.app/#board)；键盘形态研究包括 ZSA Voyager、Keychron Alice 和 Project Halfmoon。页面构图、模型与交互由本项目实现。

页面运行时使用仓库内的字体、音乐和视频；素材维护脚本可能需要联网。仓库暂未指定代码开源许可证，公开可见不代表获得任意再分发授权；第三方素材请分别遵守其许可证。
