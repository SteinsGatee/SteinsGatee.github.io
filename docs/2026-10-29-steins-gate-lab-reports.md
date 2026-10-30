# 2026-10-29 命运石之门主题与实验报告系统

## 背景

在 [日历热力图改版](./2026-10-29-calendar-heatmap.md) 之后：

1. 删除历史文章、标签与分类
2. 整体视觉不够有分量，参考《命运石之门》加强氛围
3. 新增一组 Agent 开发主题文章，正文支持流程图等图表预览

## 内容变更

- 删除：`src/content.json`、`src/content.ts`、`src/routes.json`、`public/images/`、`public/img/menu/`，以及仓库根目录旧 Hugo 产物（`categories/ tags/ posts/ page/ css/ js/ images/ img/ 404.html index.xml sitemap.xml`）。它们仍保留在 git 历史中
- 路由收敛为：`/`（观测站）、`/posts/`（实验报告）、`/posts/<slug>/`、`/404.html`。旧的 `/tags/*`、`/categories/*` 不再存在
- 新增 `posts/YYYY-MM-DD-slug.md` 共 15 篇，按日期编号为 `LAB REPORT #001…`。发布日会自动点亮热力图

### 文章 frontmatter

```md
---
title: 标题
tags: 标签1, 标签2
summary: 卡片与 meta description 使用的摘要
---
```

## 渲染管线

```mermaid
flowchart LR
    MD["posts/*.md"] -->|import.meta.glob ?raw| P["src/posts.ts<br/>frontmatter · 编号 · 阅读时长"]
    P --> R["src/render.ts"]
    R -->|marked + 自定义 renderer| H["HTML"]
    H -->|"```mermaid"| F["figure.diagram<br/>pre.mermaid 源码"]
    H -->|其它代码块| C["highlight.js 高亮"]
    R --> PR["scripts/prerender.ts<br/>Vite SSR 预渲染"]
    PR --> D["dist/**/index.html"]
    D -->|浏览器| L["src/lab.ts<br/>懒加载 mermaid 渲染 SVG"]
```

- **Markdown**：`marked`（GFM）。自定义 `code`、`heading`、`table` 三个 renderer：标题生成锚点 id 并收集目录，表格包一层可横向滚动的容器，代码块带语言栏和复制按钮
- **代码高亮**：`highlight.js/lib/core`，只注册 ts/js/python/bash/json/yaml，在预渲染时完成，浏览器不加载 highlight.js。配色走 CSS 变量，跟随主题
- **Mermaid**：预渲染输出源码，浏览器端动态 `import('mermaid')`，只在有图的页面加载。主题变量从当前配色的 CSS 变量读取，切换配色时重新渲染
- **预渲染改为 Vite SSR**：`createServer({middlewareMode})` + `ssrLoadModule`，Node 侧也能使用 `import.meta.glob`，文章与日记都不需要额外的生成步骤
- **客户端体积**：`main.ts` 只在开发服务器（页面未预渲染时）动态加载 `render.ts`；生产环境首页只加载日历、日记解析（marked）和增强脚本

## 流程图预览

点击图或「⤢ 预览」打开全屏预览器：

- 滚轮或 `+` / `-` 缩放（0.4×–6×），拖拽平移，「重置」恢复
- 「源码」切换查看 Mermaid 原文
- `Esc` 或点击空白处关闭，焦点回到触发元素
- 渲染失败时保留源码显示，并在图注标红

## 视觉系统（致敬《命运石之门》）

| 元素 | 实现 |
|---|---|
| 世界线变动率探测仪 | 首屏 8 位辉光管。数值由记录数据决定（条目数、天数、最长连续），「发送 D-Mail」随机跳到另一条世界线，显示 α/β 吸引场与 Δ |
| 时间跳跃 | `html.timeleap`：整页色相偏移、反相、横向抖动，CRT 层闪白 0.85s |
| 齿轮钟面 | `src/gears.ts` 用代码生成线框 SVG：罗马数字钟面与四个互相反转的齿轮，指针走真实时间 |
| CRT | 全屏扫描线、暗角、轻微闪烁层，`pointer-events:none` |
| HUD 面板 | `.hud` 用 8 段 linear-gradient 画四角括号，`.corner` 扫描光带 |
| 新闻条 | 页头下方循环滚动最新报告标题 |
| 故障文字 | 标题关键词周期性 RGB 分离（`::before` / `::after` + clip-path） |
| 开机序列 | 每个会话首次进入首页时播放一次终端启动文字，点击或按键跳过 |

`prefers-reduced-motion: reduce` 时关闭所有动画、开机序列、时间跳跃与粒子。

## 其他

- 新增 `.npmrc` 指向公共 npm 源，并重新生成 `package-lock.json`。原来的 lock 指向公司内网镜像，GitHub Actions 无法安装
- 实验报告页：阅读进度条、目录跟随高亮（≤1100px 隐藏）、上一份 / 下一份导航、按标签筛选（`?tag=` 可分享）和全文关键词检索

## 验证

- `npm run build` 通过（tsc 严格检查 → vite build → SSR 预渲染 18 个页面）
- 无头 Chrome（CDP）逐页检查 15 篇文章：24 张流程图全部渲染成功，无控制台错误或警告；1440 与 390 宽度均无横向溢出；标签筛选、预览器、D-Mail 交互正常
