---
title: 可观测性：给每一次思考打上 Trace
tags: 可观测性, 调试
summary: Agent 出错时，最终答案往往说明不了什么。只有完整的执行轨迹——每一步的输入、决策、工具结果和耗时——才能告诉你它在哪条世界线上走偏了。
---

## 日志不够用

传统服务记录请求和响应就够了。Agent 一次任务可能有 30 步、5 次子 Agent 调用、上百 KB 的上下文变化。你需要的是 **树状的 trace**。

## Trace 的结构

```mermaid
flowchart TD
    R["Run · 修复登录 bug<br/>42s · 18 steps · $0.31"]
    R --> S1["Step 1 · LLM<br/>2.1s · 3.2k tokens"]
    R --> S2["Step 2 · tool: grep<br/>0.3s"]
    R --> S3["Step 3 · LLM<br/>1.8s"]
    R --> S4["Step 4 · sub-agent: 调研<br/>12s"]
    S4 --> S41["LLM"]
    S4 --> S42["tool: web_search"]
    S4 --> S43["LLM"]
    R --> S5["…"]
    R --> S6["Step 18 · 最终答案"]
    style S4 stroke-dasharray: 4 3
```

## 每个 Span 记录什么

| 字段 | 说明 | 为什么重要 |
|---|---|---|
| `input` | 本步的完整上下文（或其哈希 + 增量） | 复现问题 |
| `output` | 模型输出 / 工具结果 | 看它“想了什么” |
| `tokens` | 输入、输出、缓存命中 | 成本分析 |
| `latency` | 首 token 时间、总时长 | 性能瓶颈 |
| `parent_id` | 父 span | 还原树结构 |
| `error` | 异常与重试次数 | 可靠性统计 |

## 最小实现

```ts
interface Span { id: string; parent?: string; name: string; start: number; end?: number; attrs: Record<string, unknown> }

class Tracer {
  spans: Span[] = [];
  async span<T>(name: string, parent: string | undefined, fn: (id: string) => Promise<T>): Promise<T> {
    const s: Span = { id: crypto.randomUUID(), parent, name, start: performance.now(), attrs: {} };
    this.spans.push(s);
    try { return await fn(s.id); }
    catch (e) { s.attrs.error = String(e); throw e; }
    finally { s.end = performance.now(); }
  }
}

// 用法
await tracer.span('run', undefined, async run => {
  const reply = await tracer.span('llm', run, () => llm.chat(req));
  await tracer.span(`tool:${call.name}`, run, () => execute(call));
});
```

生产环境建议直接对接 OpenTelemetry，用现成的后端做可视化。

## 用 Trace 回答的问题

1. **它为什么选了这个工具？** → 看这一步之前的上下文
2. **为什么这么慢？** → 按 latency 排序 span
3. **为什么这么贵？** → 按 tokens 排序，通常是某次工具结果太大
4. **哪类任务最容易失败？** → 聚合 run 级别的标签和结果

## 调试流程

```mermaid
flowchart LR
    B["用户反馈 bug"] --> T["找到对应 trace"]
    T --> D["定位第一个偏离预期的 step"]
    D --> W{"原因？"}
    W -- "上下文缺信息" --> C["改上下文工程"]
    W -- "工具描述有歧义" --> TL["改工具"]
    W -- "模型推理错误" --> P["改提示 / 换模型"]
    C & TL & P --> E["加入评测集"]
```

最后一步最关键：**每个修复过的 bug 都应该变成一个评测用例**，防止它在另一条世界线上复活。
