---
id: route-table
title: 工作流路由表
triggers:
  - /team
  - 承接需求
  - 需求评审
  - 技术方案
  - 目标驱动技术方案
  - 代码审查
  - 缺陷修复
  - 续跑
  - 仅验证
  - 问题复核
  - 外部 Skill
  - 外部 CLI
members:
  - delivery-manager
execution_mode: sequential
---

# 工作流路由表

按优先级从上到下匹配。若多个规则命中，选择更具体的工作流；若仍冲突，由交付经理说明原因并选择主工作流。

| 优先级 | 触发输入 | 工作流 | 文件 | 默认命令 |
| --- | --- | --- | --- | --- |
| P0 | `/team goal-design`、根据目标先完善需求并出技术方案、目标驱动自治迭代方案 | 目标驱动技术方案 | `workflows/goal-driven-technical-design.md` | `/team goal-design` |
| P0 | `/team build`、承接需求、实现需求、从需求到交付 | 端到端需求交付 | `workflows/requirement-end-to-end.md` | `/team build` |
| P0 | `/team buildContext`、生成 AGENTS.md、构建项目上下文、项目 Agent 索引 | 项目上下文构建 | `workflows/project-context-build.md` | `/team buildContext` |
| P0 | `/team init-workspace`、初始化 workspace、创建任务状态 | Workspace 初始化 | `workspace/README.md` | `/team init-workspace` |
| P0 | `/team audit-workspaces`、扫描 workspace、盘点任务记录 | Workspace 递归审计 | `workspace/README.md` | `/team audit-workspaces` |
| P0 | `/team resume`、继续上次任务、从中断处继续 | 原工作流续跑 | `workflows/execution-protocol.md` | `/team resume` |
| P0 | `/team verify`、只验证、只复跑、不改代码 | 原工作流仅验证 | `workflows/execution-protocol.md` | `/team verify` |
| P0 | `/team code-review --mode recheck`、只复核问题、核对 finding | 代码审查问题复核 | `workflows/code-review-delivery.md` | `/team code-review --mode recheck` |
| P0 | `/team bugfix`、修复问题、线上 bug、回归失败 | 缺陷修复交付 | `workflows/bugfix-delivery.md` | `/team bugfix` |
| P0 | `/team code-review`、代码审查、review 代码、逻辑审查、审查并优化 | 代码审查与优化 | `workflows/code-review-delivery.md` | `/team code-review` |
| P0 | `/team install`、安装外部 Skill、推荐开源 Skill | 外部优质 Skill 安装 | `workflows/external-skill-install.md` | `/team install` |
| P0 | `/team register-cli`、注册本地 CLI、登记外部 CLI 能力 | 外部本地 CLI 能力注册 | `external-cli/README.md` | `/team register-cli` |
| P1 | `/team review`、需求评审、PRD 评审、范围确认 | 需求评审 | `workflows/requirement-review.md` | `/team review` |
| P1 | `/team design`、技术方案、架构评审、实现方案 | 技术方案评审 | `workflows/technical-design-review.md` | `/team design` |
| P1 | `/team walk`、产品走查、UI 走查、测试走查、验收 | 产品/UI/QA 走查 | `workflows/product-ui-qa-walkthrough.md` | `/team walk` |
| P2 | `/team intake`、帮我看看这个需求、先梳理 | 需求评审 | `workflows/requirement-review.md` | `/team intake` |
| P2 | `/team deliver`、生成交付摘要、总结结果 | 交付结果汇总 | `workflows/delivery-summary.md` | `/team deliver` |

## 路由规则

1. 明确有 `/team` 命令时，优先按 [`commands/team.md`](../commands/team.md) 的命令映射。
2. 没有命令时，按用户意图和关键词匹配本表。
3. 用户要求“生成 AGENTS.md”“构建项目上下文”“建立项目 Agent 索引”时，默认进入 `workflows/project-context-build.md`。
4. 用户只给目标，并要求先生成 PRD、需求/UI 评审、自治契约和评审后技术方案时，进入 `workflows/goal-driven-technical-design.md`。
5. 用户已有需求或初步技术方案，只要求技术设计或架构评审时，进入 `workflows/technical-design-review.md`。
6. 用户要求“实现”“交付”“完整承接”时，默认进入 `workflows/requirement-end-to-end.md`。
7. 用户只要求“评审”“看看需求是否合理”时，默认进入 `workflows/requirement-review.md`。
8. 用户明确“继续/续跑”时复用任务的原工作流；先核对变化和必要阶段，不按问题关键词重新建任务。
9. 用户明确“只验证/不改代码”时执行 verify；失败只分类和记录，不自动转入修复。
10. 用户明确“只复核某问题/finding”时执行 code-review recheck；不得因为输入含 bug 或 P1 改走全量缺陷修复。
11. 用户要求审查已有 diff、PR、提交或代码逻辑时，默认进入 `workflows/code-review-delivery.md`；已描述失败现象且没有受限操作语义时优先进入缺陷修复。
12. 用户描述的是已存在问题或失败现象时，默认进入 `workflows/bugfix-delivery.md`。
13. 用户要求安装、推荐、列出外部 Skill 时，默认进入 `workflows/external-skill-install.md`。
14. 用户要求注册、登记、声明本地 CLI 能力时，默认读取 `external-cli/README.md`。
15. `/team deliver` 只从原任务有效结果生成摘要，不隐式触发新审查、测试或实现。
16. 工作流执行前必须读取 `workflows/execution-protocol.md`。

## 未命中处理

若无法路由：

1. 交付经理先输出当前理解的目标。
2. 给出最多 3 个候选工作流。
3. 若候选仍不能确定，询问用户选择工作流。
