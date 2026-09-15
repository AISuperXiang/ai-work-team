---
id: requirement-end-to-end
title: 端到端需求交付
triggers:
  - /team build
  - 承接需求
  - 实现需求
  - 完整交付
commands:
  - /team build
members:
  - delivery-manager
  - product-manager
  - operations-manager
  - ui-designer
  - tech-lead
  - frontend-engineer
  - backend-engineer
  - qa-engineer
execution_mode: hybrid
quality_gates:
  - requirement-gate
  - role-activation-gate
  - value-gate
  - complexity-gate
  - design-gate
  - technical-gate
  - decision-gate
  - handoff-gate
  - implementation-gate
  - test-gate
  - evidence-gate
  - verification-gate
  - delivery-gate
  - no-legacy-contract
outputs:
  - workspace-requirement
  - workflow-status-json
  - requirement-brief
  - prd
  - decision-log
  - risk-register
  - role-handoff
  - ui-review
  - technical-design
  - implementation-plan
  - test-plan
  - walkthrough-report
  - delivery-summary
---

# 端到端需求交付

## 适用场景

用户希望团队独立承接一个需求，并完成从需求梳理到研发实现、测试、产品/UI 走查和最终交付的全过程。本工作流进入 Implementation 阶段时必须执行 [`implementation-protocol.md`](implementation-protocol.md)，不能只输出方案或文档。

## 输入契约

最小输入：

- 需求描述。
- 目标用户或使用场景。
- 期望结果或成功标准。

缺失信息可先由产品经理整理假设；若假设会影响范围、优先级或实现方案，必须询问用户。

## Workspace 契约

- 每个新需求必须创建独立目录：`workspace/YYYYMMDD-short-requirement-slug/`。
- 若用户明确指定“在某需求下增加某功能”，才复用已有目录并创建：`workspace/<existing-requirement>/features/YYYYMMDD-short-feature-slug/`。
- 阶段产物必须写入 workspace 需求目录，不能只存在于对话中。
- 代码改动发生在用户项目仓库，workspace 保存 PRD、决策、风险、交接、方案、实现计划、测试、走查、交付和证据。
- `workflow-status.json` 必须与状态板保持一致，记录阶段、负责人、门禁、产物路径、证据路径、`executionProfile`、`verificationLevel` 和 `rolePlan`。
- 新 build 状态使用 `schemaVersion: "2.1"` 和
  [Delivery Controls](../docs/delivery-controls.md)；Tech Design 确认有效契约，
  Implementation/QA 记录逐项 check、snapshot 和 run，Delivery 只接受当前有效证据。
- Implementation 前按
  [Behavior Impact Standard](../docs/engineering-standards/behavior-impact-standard.md)
  记录入口、共享决策、同类入口、消费者、可观察结果、排除依据和合并保护检查。
- 运行时、浏览器或真实集成验收按
  [Verification Environment Standard](../docs/engineering-standards/verification-environment-standard.md)
  复用项目声明的 Gateway、runner 和资源锁；端口占用、心跳或旧截图不能替代目标实例与构建确认。

## 阶段表

| 阶段 | 负责人 | 动作 | 产出 | 门禁 |
| --- | --- | --- | --- | --- |
| Workspace | 交付经理 | 创建或选择需求交付目录，选择执行档位并形成 `rolePlan` | `README.md`、`workflow-status.json` | requirement-gate、role-activation-gate、complexity-gate、no-legacy-contract |
| Intake | 交付经理 + 产品经理 | 仅在产品角色激活时明确目标、范围、约束、缺口和复杂度；纯技术需求记录产品不适用依据 | `requirement-brief.md`、`risk-register.md` | requirement-gate、complexity-gate |
| PRD | 产品经理 + 运营经理 | 仅对用户/业务变化梳理用户故事、价值假设和观测；运营不适用时明确 N/A 依据 | `prd.md` 或轻量需求说明 | requirement-gate、value-gate |
| UI/UX | UI 设计师 | 仅对 UI/交互/可访问性变化设计状态和走查标准；无 UI 影响时记录 N/A | `ui-review.md`、`role-handoff.md` | design-gate、handoff-gate |
| Tech Design | 技术负责人 + 命中领域研发 | 读代码、定方案、拆任务、评风险，按 `rolePlan` 分配前端、后端和技术负责人职责 | `technical-design.md`、`implementation-plan.md`、`decision-log.md` | technical-gate、decision-gate、complexity-gate |
| Implementation | 命中领域工程师 | 执行 `implementation-protocol.md`，按文件所有权修改相关代码，记录变更、证据和验证等级 | 代码改动、`implementation-plan.md`、验证备注、`evidence/` | implementation-gate、evidence-gate |
| QA | 测试工程师 | 对行为变化和回归影响制定用例、执行验证；无可执行行为时记录验证责任和范围 | `test-plan.md`、验证报告、`evidence/` | test-gate、evidence-gate、verification-gate |
| Walkthrough | 产品经理 + UI 设计师 + QA | 只由已激活角色对实现进行需求、体验和质量走查 | `walkthrough-report.md`、`role-handoff.md` | delivery-gate、handoff-gate |
| Delivery | 交付经理 | 汇总 workspace、范围、业务价值、验证等级、风险、证据和复盘计划；按需附辅助质量评估 | `delivery-summary.md` 或等价派生视图 | delivery-gate、evidence-gate、verification-gate |

## 并行点

以下阶段可按混合模式启动子 Agent：

- PRD 完成后，UI 设计师和技术负责人可并行评审可行性。
- 技术方案完成后，QA 可并行设计测试策略。
- 实现完成后，产品、UI、QA 可并行走查。

并行前必须冻结 `rolePlan` 中的输入和文件所有权；不适用角色不参与并行评审。

## 不可跳过项

- 未创建或选择 workspace 需求目录，不得进入 PRD。
- 未完成复杂度分级，不得进入 PRD。
- 未形成 `rolePlan` 或未记录不适用依据，不得加载全部角色或进入设计。
- PRD 缺少价值假设、指标基线、收益目标、成本收益比或观测方式，不得进入 UI/UX 和技术方案。
- 未确认 `PROJECT_ROOT`，不得进入 Implementation。
- 关键范围、技术取舍、上线风险未写入 `decision-log.md`，
  且未按 `recordPolicy` 内联到权威状态并提供 `decisionRef` 时，不得进入 Implementation。
- 角色交接缺少背景、决策、问题、风险、产物或验证，不得进入下一阶段。
- 未修改项目代码，不得声称完成实现；用户明确要求只做方案时除外。
- 核心路径无验证证据，不得进入 Delivery。
- `deliveryControl` 的 required check 缺失、失败、冲突或过期时不得完成 Delivery；
  `candidate` 只表示实现候选，不能由整体 V2/V3 或评分提升为 accepted。
- 静态检查或单测不能覆盖的关键交互，未说明验证等级和剩余风险时不得进入 Delivery。
- 适用质量维度存在实质门禁缺口时不得交付；数字评分缺失或高低本身不构成准入结论。
- 非生成文档中存在旧入口、旧项目短名或旧本地路径，不得交付。

## 失败处理

- 需求门禁失败：回到 Intake，不进入设计。
- 价值门禁失败：回到 PRD，由产品经理和运营经理补齐指标、收益和观测计划。
- 复杂度门禁失败：由技术负责人和交付经理拆分里程碑或裁剪 MVP。
- 技术门禁失败：由技术负责人裁剪方案或拆分 MVP。
- 决策或交接门禁失败：由交付经理补齐 `recordPolicy` 要求的独立文件，
  或在权威状态中补齐等价记录和 `decisionRef`。
- 实现或测试门禁失败：回到 Implementation 按失败修复循环处理并复测。
- 证据门禁失败：补充命令、截图、日志、数据来源或人工验收记录。
- 质量实质门禁不达标：回到对应角色补强设计、实现、测试或安全；不以调高分数替代修复。
- 交付门禁失败：列出阻塞项和需要用户决策的取舍。

## 完成定义

- workspace 需求目录和权威状态存在；`recordPolicy.requiredArtifacts` 全部落盘，
  省略的独立文档有内联记录或 decisionRef，派生摘要不与权威状态冲突。
- 复杂度分级、价值假设、指标基线、收益目标、成本收益比和上线后观测计划明确。
- 项目代码已按实现计划完成改动，或用户明确要求只做方案。
- 验收标准逐项有与有效契约、方法、分支、环境和当前快照匹配的结果。
- 验证命令、结果和 evidence 明确。
- 执行档位、验证等级和未覆盖范围与交付结论一致。
- 适用质量维度和业务价值实质门禁满足；数字评分若存在仅作辅助。
- 剩余风险被说明并可接受。
