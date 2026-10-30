# 2026-10-29 首页改版：世界线日志热力图

## 背景与目标

网站从「文章博客」转向「每日记录」。首页直接是一张日历，像 GitHub 贡献热力图一样展示每天做了什么，但要更有动感、更好玩。

- 记录成本要低：写一个文件或一行命令即可
- 纯静态：继续部署在 GitHub Pages，无后端
- 保留原有文章与全部历史 URL

## 数据方案

### 存储

每天一个文件 `journal/YYYY-MM-DD.md`，文件名即日期，提交到仓库即发布。

```md
---
mood: 😄
tags: 跑步, 编程
title: 可选标题
level: 4        # 可选，手动覆盖热度
---
- 条目一
- [x] 待办也行
```

选择「一天一文件」而不是一个大 JSON：Git diff 清晰、不会冲突、编辑器里直接写 Markdown。

### 解析（`src/journal.ts`）

- frontmatter：逐行 `key: value`，支持行尾 `#` 注释
- 正文：自带极简 Markdown 渲染（标题、列表、待办、引用、代码块、粗体、行内代码、删除线、链接），先整体 HTML 转义再做替换，链接只允许 `http(s)://` 和站内 `/` 开头
- 热度：列表项与段落计为「条目数」，标题不计。`1 → L1，2–3 → L2，4–5 → L3，6+ → L4`；frontmatter `level` 优先

纯函数，不依赖 Vite，Node 侧脚本（`scripts/log.ts`）也能复用日期工具。

### 打包（`src/journal-data.ts`）

`import.meta.glob('/journal/*.md', {query:'?raw', eager:true})` 在构建时把所有记录内联进 bundle，文件名不匹配日期格式的（如 `journal/README.md`）被忽略。

旧文章（`content.json`，日期为 `MM/DD/YYYY`）合并为当天的一条记录并附文章链接，若当天已有记录则追加。

`?demo` 参数用固定种子的伪随机数填满过去 400 天，仅用于预览满载效果，不写入任何数据。

### 写入（`scripts/log.ts`）

`npm run log -- "内容"` 追加 `- 内容` 到今天的文件（不存在则带空 frontmatter 创建）；`--date YYYY-MM-DD` 补记。

## 页面结构

预渲染器（`scripts/prerender.ts`）在 Node 中执行 `render.ts`，而 `import.meta.glob` 只在 Vite 中可用，所以：

- `render.ts` 首页只输出静态骨架（标题、`#nixie`、`#stats`、`.stage`、`#board`、`#day`、`#recent`）
- `main.ts` 在浏览器中加载记录并调用 `mountCalendar()` 填充

「今天」也必须在客户端计算，构建时的日期会过期。

```
#calendar
├─ .deck-head      标题 + 辉光管日期（button，可点击重新滚动）
├─ #stats          点亮天数 / 当前连续 / 最长连续 / 条目数 / 今年天数
├─ .stage          3D 倾斜容器 + 光斑
│  ├─ #controls    视图切换 / 范围或月份 / 随机穿越 / 图例
│  └─ #board       热力图或月历
└─ .below          #day 选中日详情 + #recent 最近记录
```

## 热力图实现（`src/calendar.ts`）

- **布局**：CSS Grid，所有元素显式 `grid-area` 定位。第 1 行月份标签，第 1 列星期标签，格子 `grid-area: 行+2 / 列+2`。周一为一周第一天。列宽 `minmax(11px, 1fr)` 撑满容器，最小宽度 720px，窄屏在 `.board-scroll` 内横向滚动并自动滚到选中日
- **范围**：「过去一年」= 今天往前 364 天；或某个自然年。范围外的补位格 `visibility:hidden`
- **为什么用 DOM 而不是 Canvas**：约 371 个 `<button>`，可聚焦、有 `aria-label`、可键盘操作，性能足够

### 动效分层

为了让多种动效同时作用而不互相覆盖，利用 CSS 独立变换属性按通道拆分：

| 效果 | 通道 | 触发 |
|---|---|---|
| 入场波浪 | `translate` + `opacity` + `filter`（`@keyframes boot`），延迟 `(列+行)×14ms` | `.board.enter` |
| 鼠标透镜 | `scale`（JS 逐格写 `el.style.scale`） | `pointermove` + rAF |
| 点击涟漪 | `transform` + `background`（`@keyframes wave`），延迟 `距离×24ms` | `.board.wave` |
| 面板倾斜 | `.stage` 的 `transform: perspective rotateX/Y` | CSS 变量 `--rx/--ry` |

- 透镜：首次移动时缓存每格中心坐标（滚动或缩放时失效），半径 `max(70px, 宽度/12)`，缩放 `1 + 0.75·f²`
- 涟漪：以被点击格的（列，行）为圆心，给每格写 `--d` 欧氏距离，移除再添加 class 重新触发动画
- 粒子（`src/fx.ts`）：全屏 `pointer-events:none` 的 Canvas，漂浮光尘加点击火花（带重力和阻尼），`lighter` 叠加发光。页面隐藏时停止 rAF，颜色从 CSS 变量 `--spark` 读取，切换配色时刷新
- 辉光管：每位数字随机跳动，从左到右每位间隔 70ms 依次定格

### 交互

- 点击 / 回车：选中，触发涟漪、火花、面板故障风切换、辉光管滚动，并写入 `location.hash`
- 方向键：热力图中上下 ±1 天、左右 ±7 天；月历中相反。焦点使用 roving tabindex
- `/#YYYY-MM-DD` 直达某天，必要时自动切换年份或月份
- 面板「上一个 / 下一个记录日」在有记录的日期之间跳转；🎲 随机选一个记录日

## 视觉

- 深色单主题，四套配色 `amber / matrix / neon / ice`，`html[data-palette]` 切换，存 localStorage
- 每套配色是 **单色相、由暗到亮** 的 5 阶顺序色（L0–L4），L3/L4 叠加同色发光，亮度本身就编码了热度
- 每个格子都有带日期和条目数的 tooltip 与 `aria-label`，图例「少 → 多」
- `prefers-reduced-motion: reduce` 时关闭所有动画、透镜、倾斜、粒子与辉光管滚动

## 验证

- `npm run build`：TypeScript 严格检查、Vite 打包、预渲染全部通过
- 无头 Chrome（CDP）：桌面 1440 与手机 390 无横向溢出、无控制台错误；点击格子后 hash、面板、tooltip 正确；月历与配色切换、随机穿越正常

## 后续可做

- 按标签筛选、高亮热力图
- 年度回顾页（每月统计、最常见标签）
- 记录中的图片支持
