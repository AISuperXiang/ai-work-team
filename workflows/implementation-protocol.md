---
id: implementation-protocol
title: 代码落地执行协议
triggers:
  - 代码实现
  - /team build
  - Implementation
members:
  - delivery-manager
  - tech-lead
  - frontend-engineer
  - backend-engineer
  - qa-engineer
execution_mode: sequential
quality_gates:
  - role-activation-gate
  - implementation-gate
  - test-gate
  - verification-gate
  - delivery-gate
outputs:
  - implementation-plan
  - verification-result
  - delivery-summary
---

# 代码落地执行协议

本协议用于把方案真正落到项目代码。端到端需求交付进入 Implementation 阶段时必须读取并执行本文件。

## 前置条件

进入实现前必须满足：

- 已有需求目录：`workspace/<requirement-folder>/`。
- 已选择 `executionProfile` 并写入 `recordPolicy`。standard/assurance 保留必要方案、审批和交接原文；
  lightweight 可在权威状态内联目标、决定、风险和交接引用，不为形式创建独立文档。
- 已形成 `rolePlan`，并明确本次代码由哪个工程角色和文件所有者负责；不适用工程角色不参与实现阶段。
- 已确认项目根目录 `PROJECT_ROOT`。若用户未指定，先从当前工作区和需求上下文识别；无法确定时询问。
- 已确认本次要修改的模块、文件候选和验证命令。
- 已按 [Delivery Controls](../docs/delivery-controls.md) 确认有效契约、
  验收的预期依据、原反例及保留路径；新功能使用验收探针，不强行制造旧失败。
- 已按 [Behavior Impact Standard](../docs/engineering-standards/behavior-impact-standard.md)
  记录入口、共享决策、同类入口、消费者、可观察结果、排除依据和合并保护检查。
- 已确认复杂度分级，以及本次实现需要支撑的价值或缺陷影响观测方式。

## 工作区落盘

每个需求必须维护一个交付文件夹：

```text
workspace/<requirement-folder>/
```

实现阶段至少更新权威 `workflow-status.json` 和必要证据。下列可读视图按
`recordPolicy.requiredArtifacts/derivedArtifacts` 生成：

- `implementation-plan.md`：实现计划、变更文件、验证命令。
- `test-plan.md`：测试场景和结果。
- `delivery-summary.md`：最终交付摘要。
- `evidence/README.md`：验证证据索引。
- `workflow-status.json`：阶段状态、负责人、门禁、产物、证据路径、执行档位和当前验证等级。
- `decision-log.md`：实现阶段新增或变更的关键决策原文，或权威状态中的 decisionRef。
- `role-handoff.md`：研发到 QA、QA 到交付的派生交接视图，或权威状态中的等价记录。

若用户明确要求“在某需求下增加某功能”，则在已有需求目录下创建：

```text
workspace/<existing-requirement>/features/<feature-folder>/
```

并只把该追加功能的实现计划、测试和交付摘要写入子目录。

## 强制执行循环

1. **选择档位和角色**：读取 `execution-methodology.md` 与 `role-activation-methodology.md`，记录 `executionProfile`、`rolePlan`、升级信号和目标验证等级。
2. **定位项目**：确认 `PROJECT_ROOT`，读取项目 README、package、测试配置、入口文件和相关模块。
3. **定位改动点**：按行为调用链和反向消费者搜索确定文件，不只跟随 changed files 或单一入口。
4. **写实现计划**：在 workspace 需求目录更新 `implementation-plan.md`，列出文件、变更、验证命令、回滚策略、非目标和文件所有者。
5. **执行代码改动**：由 `rolePlan.active` 中拥有文件所有权的工程角色修改项目代码。不得只输出方案而不落地，除非用户明确要求只设计或只评审。
6. **选择测试**：从 current impact scope 生成显式任务路径，分别记录 test selection 和 catalog health；
   没有任务范围时不自动扫描全工作树，诊断模式不执行。
7. **运行验证**：先按 [Verification Environment Standard](../docs/engineering-standards/verification-environment-standard.md)
   复用项目声明的 Gateway、runner 和资源锁，确认 check 所需 app/worktree、构建、账号、数据及工具；
   再执行最能验证核心假设的检查和所需 lint、typecheck、unit、build、integration、browser。
   修复前后对照和保留项都关联 v2 check/run/impact scope/environment probe ID，并将实际证据映射为 `V0-V4`。
8. **风险验证**：按行为风险选择 async ownership、SSR recovery 或 cache consistency 包，
   只绑定 current scope 中的 required check。
9. **失败修复循环**：验证失败时必须记录失败类型、修复动作和复跑结果；最多连续 3 轮后仍失败则交付阻塞报告。
10. **证据归档**：把命令结果、日志摘要、截图路径、数据来源或人工验收记录写入 `evidence/README.md`。
11. **质量评估**：按 `docs/quality-rubrics.md` 检查适用维度；数字评分仅在用户要求或复盘时提供，不参与准入。
12. **走查交付**：由已激活的产品、UI、QA 角色走查；更新权威状态，并按 recordPolicy 生成 walkthrough/handoff/delivery 视图。

## 不可跳过门禁

以下门禁不可用“风险接受”绕过：

- 没有确认 `PROJECT_ROOT`。
- 没有通过 `role-activation-gate` 确认代码所有者和不适用工程角色。
- 没有读相关代码即写方案。
- 没有代码改动却声称完成实现。
- 核心路径没有任何验证证据。
- `verificationLevel` 与交付结论不一致。
- 关键决策、风险、交接和证据未进入权威状态或其可追溯原文。
- 存在 P0/P1 缺陷、安全风险或阻塞测试失败。
- UI 需求没有产品/UI/QA 走查结论。

## 验证优先级

下列是可选验证层级，不是机械执行顺序。按风险和验证成本选择，纯逻辑不强制浏览器，真实交互不以静态通过替代：

1. `lint`
2. `typecheck`
3. `unit test`
4. `build`
5. `integration test`
6. `browser/manual verification`

若某项不存在，记录“不适用”而不是伪造结果。若存在但无法运行，必须写明原因和影响。

交付前运行内置 `scripts/check-delivery.js --project-root <root> --workspace <relative-dir> --mode assess --json`，
核对当前快照及原始证据；required 缺失、失败、冲突或过期时只能交付候选与缺口，不能通过评分豁免。
环境/setup 失败不能当作业务反例。工具不执行状态中记录的命令。

若任务包含 merge、rebase、cherry-pick 或冲突处理，必须在最终组合快照检查调用链并重跑
`mergeGuardCheckIds`。合并前 candidate 证据不能替代实际合并后的保护检查。

## 交付证据

最终交付摘要必须包含：

- `PROJECT_ROOT`。
- workspace 需求目录。
- 改动文件清单。
- 验证命令和结果。
- `executionProfile`、`verificationLevel` 和未覆盖范围。
- 适用质量维度及证据；数字评分若有则仅作辅助。
- 业务影响、收益观测方式和复盘计划。
- 产品/UI/QA 走查结论。
- 未解决风险和建议。
