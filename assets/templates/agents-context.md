# AGENTS.md

本文件用于沉淀项目级 Agent 上下文。`ai-work-team` 只维护标记区块内的内容，标记区块外可由项目人工维护。

```text
<!-- ai-work-team:buildContext:start -->
自动生成内容
<!-- ai-work-team:buildContext:end -->
```

## 维护原则

- 保留人工编写的项目约束，不覆盖无标记内容。
- 技术上下文必须来自静态扫描或用户输入，不凭空推断。
- 后续 `/team build`、`/team design`、`/team bugfix` 可优先读取本文件作为项目上下文。
- 当依赖、目录结构、状态管理、UI 组件库、测试命令发生变化时，重新执行 `/team buildContext`。
