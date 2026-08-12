---
id: goal-driven-technical-design
title: 目标驱动技术方案
triggers:
  - /team goal-design
  - 根据目标出技术方案
  - 目标驱动技术方案
  - 自治迭代方案
commands:
  - /team goal-design
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
  - role-activation-gate
  - requirement-gate
  - value-gate
  - design-gate
  - goal-contract-gate
  - autonomy-gate
  - technical-gate
  - design-review-gate
  - decision-gate
  - handoff-gate
  - evidence-gate
  - verification-gate
  - no-legacy-contract
outputs:
  - requirement-brief
  - requirement-review
  - prd
  - ui-review
  - goal-contract
  - milestone-plan
  - task-plan
  - autonomy-policy
  - technical-design
  - technical-design-review
  - design-decision-summary
  - decision-log
  - risk-register
  - role-handoff
  - workflow-status-json
---

# 目标驱动技术方案

## 适用场景

用户给出的是目标、产品想法或期望结果，希望团队先补齐需求和设计约束，再形成经过跨角色评审、可供用户决定是否执行的技术方案。

本工作流只完成设计与决策准备，不修改目标项目代码、不部署、不发布。用户批准方案后，下一次任务使用 `/team build`，并把本工作流的产物作为冻结输入。

## 输入契约

最小输入：

- 目标或希望改变的结果。
- 已知目标用户或使用场景；缺失时由产品经理先提出可验证假设。
- 已知战略、时间、资源、技术、合规或预算约束。

以下信息可以由角色探索和推导：

- 现有产品、代码、接口、数据和测试能力。
- 合理的 MVP 范围、里程碑候选和技术方案选项。
- 可观测指标、验证方式和迭代节奏候选。

以下高影响取舍不得静默替用户决定：

- 改变目标用户、核心价值或商业模式。
- 引入不可逆架构、数据迁移、生产写入、付费或权限风险。
- 超出用户给定的时间、资金、迭代轮数或风险边界。

## Workspace 契约

- 每个新目标创建独立目录：`workspace/YYYYMMDD-short-goal-slug/`。
- 必须维护 `workflow-status.json`、`decision-log.md`、`risk-register.md`、`role-handoff.md` 和 `evidence/README.md`。
- 目标与自治契约实例使用 `assets/templates/goal-contract.json`、`assets/templates/milestones.json`、`assets/templates/tasks.json`、`assets/templates/autonomy-policy.json`。
- 契约实例必须分别满足 `schemas/goal-contract.schema.json`、`schemas/milestone.schema.json`、`schemas/task.schema.json`、`schemas/autonomy-policy.schema.json`。
- 需求评审使用 `assets/templates/requirement-review.md`，最终技术方案使用 `assets/templates/goal-driven-technical-design.md`，评审记录使用 `assets/templates/technical-design-review.md`。

## 阶段表

| 阶段 | 负责人 | 动作 | 产出 | 门禁 |
| --- | --- | --- | --- | --- |
| Goal Intake | 交付经理 + 产品经理 | 建立目标契约、信息缺口、复杂度、执行档位和 `rolePlan` | `requirement-brief.md`、`goal-contract.json`、`risk-register.md`、`workflow-status.json` | role-activation-gate、goal-contract-gate、requirement-gate、no-legacy-contract |
| PRD | 产品经理 + 运营经理 | 从目标推导用户、价值、范围、指标、验收和复盘计划 | `prd.md` | requirement-gate、value-gate |
| Requirement Review | 产品经理 + QA + 交付经理 | 检查范围、价值、可测试性和开放问题，冻结技术设计输入 | `requirement-review.md`、`decision-log.md`、`role-handoff.md` | requirement-gate、value-gate、handoff-gate |
| UI Review | UI 设计师 | 涉及界面时评审用户路径、状态、响应式和可访问性；否则记录 N/A | `ui-review.md`、`role-handoff.md` | design-gate、handoff-gate |
| Architecture Design | 技术负责人 + 命中领域研发 | 基于事实完成模块设计、复杂逻辑、方案对比、迭代路径和四类自治契约 | `technical-design.md`、`milestones.json`、`tasks.json`、`autonomy-policy.json`、`test-plan.md` | goal-contract-gate、autonomy-gate、technical-gate、decision-gate |
| Technical Review | 技术负责人 + 命中领域研发 + QA | 评审架构、接口、数据、权限、可测性、任务依赖、预算和停止条件 | `technical-design-review.md`、`risk-register.md` | technical-gate、autonomy-gate、design-review-gate |
| Cross-Role Review | 产品经理 + UI 设计师 + QA | 回审方案是否仍满足 PRD、体验和验收；不适用角色不参与 | `technical-design-review.md`、`role-handoff.md` | design-review-gate、handoff-gate |
| Design Revision | 技术负责人 | 逐条处置评审意见，更新方案与契约；最多执行 `autonomyPolicy.iterationPolicy.maxDesignReviewRounds` 轮 | 修订后的方案、契约、`decision-log.md` | design-review-gate、technical-gate、autonomy-gate、decision-gate |
| Decision Handoff | 交付经理 | 汇总执行范围、迭代轮数、自动决策边界、审批点、风险和待用户裁决项 | `design-decision-summary.md`、`evidence/README.md`、`workflow-status.json` | evidence-gate、verification-gate、handoff-gate、no-legacy-contract |

## 技术方案强制内容

`technical-design.md` 至少包含：

- 背景、目标和需求分析。
- 当前系统事实、待验证假设和证据来源。
- 技术核心模块、边界、接口与数据契约。
- 复杂逻辑、状态转换、失败路径、重试、幂等和回滚拆解。
- 至少两个可行方案及保留现状的成本、收益、风险和验证成本对比。
- 推荐方案、职责边界和非目标。
- 里程碑、任务依赖图、关键路径、并行边界、技术 spike 和验证策略。
- 计划迭代轮数、最大迭代轮数、每轮退出条件、无改进停止条件和重规划触发器。
- `goal-contract`、`milestone`、`task`、`autonomy-policy` Schema 的实例、约束和引用路径。
- 发布、灰度、监控、回滚、安全、兼容和开放问题。

## 自治边界

- `goal-contract.json` 冻结目标、非目标、约束、成功标准和可观测指标。
- `milestones.json` 每个里程碑必须交付可验证结果，不得只按技术层拆分。
- `tasks.json` 使用显式依赖组成 DAG；每个任务包含输入、输出、能力、验收、证据、重试、审批和文件所有权。
- `autonomy-policy.json` 必须给出 `plannedIterations`、`maxIterations`、`maxDesignReviewRounds`、预算、自动决策、通知、人工审批、停止条件、升级和重规划规则。
- 高风险、不可逆、生产写入、数据删除、付费、权限、安全和合规操作必须进入人工审批清单。
- 自动执行不得超过已批准的目标、范围、预算和迭代轮数。

## 评审闭环

每条评审意见必须记录：

- 编号、来源角色、严重度和关联方案章节。
- 事实或反例证据。
- 处置结果：`accepted`、`rejected`、`deferred` 或 `needs_user_decision`。
- 修改内容、责任角色和复核结论。

存在以下情况时不得结束评审：

- P0/P1 风险未关闭。
- `accepted` 意见尚未反映到方案或契约。
- `rejected` 意见缺少事实依据。
- 产品、UI 或 QA 指出方案偏离已冻结需求且未完成裁决。
- 任务依赖存在环、里程碑没有退出条件或自治策略没有硬停止条件。

## 并行点

- PRD 输入冻结后，UI 评审与代码/系统现状探索可以并行。
- Architecture Design 初稿完成后，前端、后端和 QA 可按独立边界并行评审。
- Technical Review 输入冻结后，产品、UI、QA 可并行回审。

并行角色只读共享方案或拥有独立评审文件，不得同时修改 `technical-design.md`。技术负责人统一完成修订。

## 失败处理

- 目标不可验证：回到 Goal Intake，补成功标准或建议最小探索里程碑。
- 价值假设不成立：停止进入架构设计，输出暂缓结论。
- 缺少项目事实：执行技术 spike；未取得证据前将相关内容标记为假设。
- UI 方向影响核心范围：回到 Requirement Review 重新冻结输入。
- 方案风险不可接受：比较替代方案、裁剪 MVP 或提交用户决策。
- 评审超过最大轮数仍不收敛：停止自动修订，输出冲突、证据和最多 3 个用户裁决项。
- 契约不完整或任务图有环：不得输出“可执行”，回到 Architecture Design 修复。

## 完成定义

- PRD 已通过需求评审，UI 变化已评审或有明确 N/A 依据。
- 技术方案包含强制章节，并基于真实系统事实区分事实与假设。
- 四类 Schema 实例完整、一致，迭代轮数、预算、审批、停止和重规划条件明确。
- 技术、产品、UI、QA 的适用评审意见均有处置和复核记录。
- 没有未关闭的 P0/P1 风险，待用户决策项不超过 3 个。
- 当前结论明确为“方案已评审，等待用户批准执行”，不得声称代码、运行时行为或业务收益已交付。
- 用户批准后可把 `goal-contract.json`、`milestones.json`、`tasks.json`、`autonomy-policy.json` 和 `technical-design.md` 直接交给 `/team build`。
