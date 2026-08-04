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
- 已选择 `executionProfile`。`standard` / `assurance` 已有 `requirement-brief.md`、`prd.md`、`technical-design.md`、`decision-log.md`、`risk-register.md`、`role-handoff.md`；`lightweight` 至少有目标行为、非目标、变更范围、风险和验证计划。
- 已形成 `rolePlan`，并明确本次代码由哪个工程角色和文件所有者负责；不适用工程角色不参与实现阶段。
- 已确认项目根目录 `PROJECT_ROOT`。若用户未指定，先从当前工作区和需求上下文识别；无法确定时询问。
- 已确认本次要修改的模块、文件候选和验证命令。
- 已确认复杂度分级，以及本次实现需要支撑的价值或缺陷影响观测方式。

## 工作区落盘

每个需求必须维护一个交付文件夹：

```text
workspace/<requirement-folder>/
```

实现阶段至少写入或更新：

- `implementation-plan.md`：实现计划、变更文件、验证命令。
- `test-plan.md`：测试场景和结果。
- `delivery-summary.md`：最终交付摘要。
- `evidence/README.md`：验证证据索引。
- `workflow-status.json`：阶段状态、负责人、门禁、产物、证据路径、执行档位和当前验证等级。
- `decision-log.md`：实现阶段新增或变更的关键决策。
- `role-handoff.md`：研发到 QA、QA 到交付的交接记录。

若用户明确要求“在某需求下增加某功能”，则在已有需求目录下创建：

```text
workspace/<existing-requirement>/features/<feature-folder>/
```

并只把该追加功能的实现计划、测试和交付摘要写入子目录。

## 强制执行循环

1. **选择档位和角色**：读取 `execution-methodology.md` 与 `role-activation-methodology.md`，记录 `executionProfile`、`rolePlan`、升级信号和目标验证等级。
2. **定位项目**：确认 `PROJECT_ROOT`，读取项目 README、package、测试配置、入口文件和相关模块。
3. **定位改动点**：用搜索和代码阅读确定文件，不凭猜测写代码。
4. **写实现计划**：在 workspace 需求目录更新 `implementation-plan.md`，列出文件、变更、验证命令、回滚策略、非目标和文件所有者。
5. **执行代码改动**：由 `rolePlan.active` 中拥有文件所有权的工程角色修改项目代码。不得只输出方案而不落地，除非用户明确要求只设计或只评审。
6. **运行验证**：按项目能力运行 lint、typecheck、unit、build、integration、browser 中可用项，并将实际证据映射为 `V0-V4`。
7. **失败修复循环**：验证失败时必须记录失败类型、修复动作和复跑结果；最多连续 3 轮后仍失败则交付阻塞报告。
8. **证据归档**：把命令结果、日志摘要、截图路径、数据来源或人工验收记录写入 `evidence/README.md`。
9. **质量评分**：按 `docs/quality-rubrics.md` 对业务影响、技术、健壮性、UI、测试、安全和交付打分；评分不得高于验证等级允许的结论。
10. **走查交付**：由已激活的产品、UI、QA 角色走查后更新 `walkthrough-report.md`、`role-handoff.md` 和 `delivery-summary.md`。

## 不可跳过门禁

以下门禁不可用“风险接受”绕过：

- 没有确认 `PROJECT_ROOT`。
- 没有通过 `role-activation-gate` 确认代码所有者和不适用工程角色。
- 没有读相关代码即写方案。
- 没有代码改动却声称完成实现。
- 核心路径没有任何验证证据。
- `verificationLevel` 与交付结论不一致。
- 关键决策、风险、交接和证据没有落盘。
- 存在 P0/P1 缺陷、安全风险或阻塞测试失败。
- UI 需求没有产品/UI/QA 走查结论。

## 验证优先级

按项目实际能力从上到下执行：

1. `lint`
2. `typecheck`
3. `unit test`
4. `build`
5. `integration test`
6. `browser/manual verification`

若某项不存在，记录“不适用”而不是伪造结果。若存在但无法运行，必须写明原因和影响。

## 交付证据

最终交付摘要必须包含：

- `PROJECT_ROOT`。
- workspace 需求目录。
- 改动文件清单。
- 验证命令和结果。
- `executionProfile`、`verificationLevel` 和未覆盖范围。
- 质量评分。
- 业务影响评分、收益观测方式和复盘计划。
- 产品/UI/QA 走查结论。
- 未解决风险和建议。
