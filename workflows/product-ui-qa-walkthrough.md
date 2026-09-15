---
id: product-ui-qa-walkthrough
title: 产品 UI QA 联合走查
triggers:
  - /team walk
  - 产品走查
  - UI 走查
  - 测试走查
  - 验收
commands:
  - /team walk
members:
  - delivery-manager
  - product-manager
  - ui-designer
  - qa-engineer
  - tech-lead
execution_mode: hybrid
quality_gates:
  - role-activation-gate
  - design-gate
  - technical-gate
  - test-gate
  - evidence-gate
  - verification-gate
  - delivery-gate
outputs:
  - walkthrough-report
  - delivery-summary
---

# 产品 UI QA 联合走查

## 适用场景

实现完成后，需要产品、UI 和 QA 从需求一致性、体验还原、测试质量和交付风险角度联合走查。

`/team walk` 主动执行本工作流的检查。只汇总已有结果的 `/team deliver` 使用
[`delivery-summary.md`](delivery-summary.md)，不得借交付摘要隐式启动本走查。

## 输入契约

- 已实现的功能或变更说明。
- PRD、验收标准或需求简报。
- UI 方案、截图、设计稿或页面路径。
- 测试结果或待验证项。
- 原任务的 v2.1 `workflow-status.json`；2.0 保留既有 P0/P1 能力，旧任务缺少对应数据时按
  [Delivery Controls](../docs/delivery-controls.md) 标记 legacy_unverified，
  不根据旧 completed 或最高验证等级补写通过。

## 阶段表

| 阶段 | 负责人 | 动作 | 产出 | 门禁 |
| --- | --- | --- | --- | --- |
| Scope Check | 交付经理 + 产品经理 | 对照验收标准确认走查范围、验证等级和 `rolePlan` | 产品走查结论、角色激活结论 | role-activation-gate、delivery-gate |
| UI Check | UI 设计师 | 仅在界面、交互、可访问性或响应式受影响时检查体验 | UI 走查结论或 N/A 依据 | design-gate |
| QA Check | 测试工程师 | 检查测试覆盖、回归结果、证据和未覆盖路径 | QA 走查结论 | test-gate、evidence-gate、verification-gate |
| Risk Check | 技术负责人 | 仅在兼容、性能、权限、数据或回滚风险存在时检查 | 技术风险或 N/A 依据 | technical-gate |
| Decision | 交付经理 | 汇总通过、阻塞或需修复项，限制结论不超过验证等级 | `walkthrough-report.md`、`delivery-summary.md` | delivery-gate、verification-gate |

## 走查结论

- `通过`：可交付。
- `带风险通过`：仅允许已关闭 P0/P1 后的 P2 风险，且风险、接受人、复查条件和验证等级已记录。
- `不通过`：列出阻塞项、责任角色和复查条件。

走查逐项核对 active contract、required check、当前快照和 evidenceReview。
analysis_complete、candidate、过期浏览器证据或不同分支的 V3 证据均不能作为实现通过依据。
交付还必须引用当前 invocation、impact scope 和环境探测；服务仍健康不代表旧证据仍属于当前构建。

## 失败处理

- 产品不一致：回到需求或实现阶段修正。
- UI 不一致：区分必须修复和可后续优化。
- QA 未覆盖：补测试或补人工验证。
- 技术风险未关闭：补验证、回滚或灰度方案。

## 完成定义

- 产品、UI、QA 的结论已汇总。
- 阻塞项有明确责任和修复条件。
- P0/P1 已关闭；`rolePlan` 与验证等级和结论一致。
- 最终交付状态可用于用户验收。
