# Akuya の 世界线

致敬《命运石之门》的个人站：首页是每日记录热力图（「世界线观测站」），另有一组关于 Agent 开发的实验报告。TypeScript + Vite，构建时预渲染为纯静态页面，部署在 GitHub Pages。

## 开发与构建

需要 Node.js 22.12+。项目内 `.npmrc` 指向公共 npm 源。

```sh
npm ci
npm run dev       # http://127.0.0.1:5173
npm run build     # tsc 严格检查 → vite build → Vite SSR 预渲染
npm run preview   # 预览 dist/
```

## 写东西

**每日记录**：`journal/YYYY-MM-DD.md`（格式见 `journal/README.md`）

```sh
npm run log -- "跑了 5 公里"                  # 追加到今天
npm run log -- --date 2026-10-01 "补记一条"   # 补记某天
```

条目数决定格子亮度（1 / 2–3 / 4–5 / 6+ 条），frontmatter 中的 `level:` 可以手动覆盖。

**实验报告**：`posts/YYYY-MM-DD-slug.md`，访问路径为 `/posts/slug/`，按日期自动编号。发布当天会点亮热力图。

```md
---
title: 标题
tags: 标签1, 标签2
summary: 摘要
---
正文支持 GFM：表格、任务列表、代码高亮，以及 ```mermaid 流程图（点击可全屏预览）。
```

**更新约定**：每次功能更新都在当天的 journal 记一笔，技术方案写到 `docs/YYYY-MM-DD-<slug>.md`。

## 结构

- `src/render.ts`：页面渲染（首页、报告列表、报告页、404）与布局
- `src/posts.ts` / `src/journal.ts` / `src/journal-data.ts`：文章与日记的加载和解析
- `src/markdown.ts`：marked 配置，处理 mermaid、代码块、标题锚点和表格
- `src/calendar.ts`：热力图、月历、统计、辉光管、世界线变动率与 D-Mail
- `src/lab.ts`：Mermaid 渲染与预览器、代码复制、阅读进度和目录、筛选、开机序列
- `src/fx.ts`：粒子层；`src/gears.ts`：齿轮钟面 SVG
- `src/style.css`：主题、四套配色、响应式与减少动态效果支持
- `scripts/prerender.ts`：预渲染页面、RSS、sitemap；`scripts/log.ts`：`npm run log`
- `docs/`：按日期记录的技术方案

## 首页玩法

- 世界线变动率探测仪：数值随记录变化；「⚡ 发送 D-Mail」触发时间跳跃
- 热力图：进场波浪、鼠标透镜和 3D 倾斜、点击涟漪和火花；热力图 / 月历视图，可按年份切换，🎲 随机穿越
- 键盘方向键可以在格子间移动；`/#2026-10-29` 直达某天；`/?demo` 用随机数据预览满载效果
- 右上角切换琥珀 / 矩阵 / 霓虹 / 极光配色

## 部署

推送到 `main` 后，`.github/workflows/pages.yml` 会构建并发布 `dist/`。需要在仓库 Settings → Pages → Source 中选择 GitHub Actions。
