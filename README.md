<p align="center">
  <a href="https://dshfind.com/zh/plugins/huanlinoto/dsh-plugin-prts-neuron"><img src="https://dshfind.com/api/card/huanlinoto/dsh-plugin-prts-neuron?lang=zh" alt="dsh-plugin-prts-neuron card"></a>
</p>

# dsh-plugin-prts-neuron

把 DSH WebUI 对话里的运行状态行换成 PRTS 神经元连接态：

![运行状态行效果](docs/running-row.png)

- 左侧图标：原来的鲸鱼尾 → 用户指定的 B 站动图（**已压缩并内联**，见下）
- 文案：`深度求索中，用时 3秒 ···` → `正在连接至PRTS神经元，用时 3秒 ···`

## 原理

ui-chat 的运行状态行自带 `data-chat-running` 属性，内部是「鲸鱼尾图标 + TextShimmer 文案」，并且**每秒**随计时器重渲染一次。插件不改 ui-chat 的源码，而是走 DOM 缝：

| 目标 | 做法 |
|------|------|
| 图标 | 行内 icon 盒子前插入一张 `<img>`，原 icon 盒子 `display:none`；内联载荷解码失败时移除图片并恢复原图标。图标**布局盒仍是 16px**（与 ui-chat 原图标同尺寸，行高不变），视觉放大走 `transform:scale(2)` —— transform 不参与布局，实测该行高度前后都是 40.5px，绘制尺寸 32×32 |
| 文案 | 监听文档变更，把行内文本节点、无障碍播报行、以及 TextShimmer 装饰层读取的 `data-shimmer-text` 属性里的「深度求索中」替换为「正在连接至PRTS神经元」 |

React 每次 tick 会把文案写回原值，MutationObserver 在同一个微任务批次里改回去（浏览器绘制前完成，不闪烁）。两侧写入都幂等，所以观察者每轮渲染后即收敛，不会自激循环。

匹配用的是 ui-chat 的作者级标记：`data-chat-running`、`data-shimmer-text`，以及鲸鱼 SVG 的父元素（icon 盒子）。**不匹配 CSS Module 的哈希类名**，因此对上游样式重构不敏感。

## 图标：为什么内联

原图 `i0.hdslb.com/…/a5a0a0a….gif` 是 **1000×1000、10fps、27 帧、1362 KiB** 的动图，而且有防盗链（带 referrer 请求直接失败）。每次刷新页面都白下 1.3 MiB 是不可接受的，所以插件把它压缩后内联进 client bundle：

| | 原图 | 插件内联 |
|---|---|---|
| 尺寸 | 1000×1000 | 64×64（显示 32px，2x 余量） |
| 颜色 | 全彩 | 128 色调色板（bayer 抖动） |
| 帧率 | 10fps | 10fps（原动画节奏，不降帧） |
| 体积 | 1362 KiB | **44 KiB**（约 3%） |
| 传输 | 每次页面加载一个请求（还被防盗链拦） | 0 个请求，随 bundle 走 HTTP 压缩与 rev 缓存 |

内联后的实测：`img.src` 是 59.3 KiB 的 `data:image/gif;base64,…`，页面里 hdslb 的请求数为 **0**。

重建图标（改图或调参数后）：

```powershell
pnpm icon:build     # 需要 ffmpeg 在 PATH；重压 assets/prts-neuron.gif 并重写 src/client/icon-data.ts
```

压缩参数写在 [`scripts/build-icon.mjs`](scripts/build-icon.mjs)（`fps=10,scale=64:64,palettegen max_colors=128`）。原始大图由脚本按 URL 下载，不进仓库（`assets/*.source.gif` 已 ignore）；`src/client/icon-data.ts` 由脚本生成，不要手改。

## 开发

```powershell
pnpm install
pnpm typecheck
pnpm test
pnpm build          # 产出 lib/index.js + lib/client.js + lib/types/
```

改文案：只改 [`src/client/copy.ts`](src/client/copy.ts)。换图标：替换 `assets/prts-neuron.gif` 后跑 `pnpm icon:build`。

## 运行（安装到 profile）

```powershell
dsh plugin --profile web add "link:D:/Projects/deepseek-harness/dsh-plugin-prts-neuron"
# 或远端引用：dsh plugin --profile web add "github:huanlinoto/dsh-plugin-prts-neuron"
```

`dsh plugin add` 已把包登记进 profile 的 `dsh.profile.bundles`。**实测无需重启 `dsh web`**：host 在页面加载时重组 client roster，`window.__DSH_BOOT__.entries` 里会出现 `@huanlin/dsh-plugin-prts-neuron`。

改了源码之后：`pnpm build` 重建 `lib/`，然后**硬刷新**页面（Ctrl+Shift+R）。注意普通刷新（或普通导航）会命中 HTTP 缓存，仍然跑旧 bundle —— 实测只有硬刷新才会带上新的资源 revision（`__DSH_BOOT__.entries[].rev` 随之变化）。全程不需要重启 `dsh web`。

## 检查

```powershell
pnpm test           # jsdom 单测：图标替换、布局盒不变、三处文案替换、幂等、挂载后自愈、dispose 后停手、图片失败回退
pnpm typecheck
```

单测直接喂 ui-chat 的标记结构（fixture 见 [`tests/running-status.spec.ts`](tests/running-status.spec.ts)），不依赖真实 GUI。真实 GUI 的复验见 `docs/running-row.png`。

## 已知限制

- **文案是构建期常量**：client 半边拿不到 Cordis 行配置（`window.__DSH_BOOT__` 的 boot 行只有 `id`/`inject`/`external`/`immediately`），所以没有配置项。要做成可配置，需要另建 host→browser 通道（settings 命名空间 + HTTP 路由或 Remote 服务），目前按 YAGNI 不做。
- **只替换中文文案**：英文 locale 的 `Deep diving` 不动。要支持英文，在 `copy.ts` 里把替换做成多对即可。
- **依赖 ui-chat 的 DOM 标记**：若上游移除 `data-chat-running`/`data-shimmer-text` 或改变 icon 盒子结构，替换会静默失效（不报错，页面显示原样）。
- **图标尺寸写死在 16px 布局盒 + `scale(2)`**：若要改绘制尺寸，改 [`running-status.ts`](src/client/running-status.ts) 的 `ICON_STYLE`；同时注意压缩件的 64px 源只覆盖到 2x 屏。
- **`pnpm icon:build` 依赖 ffmpeg**：本机已有；没有 ffmpeg 时直接手改 `src/client/icon-data.ts`（改图后重跑脚本更省事）。
