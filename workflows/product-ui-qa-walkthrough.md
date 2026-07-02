---
id: product-ui-qa-walkthrough
title: 产品 UI QA 联合走查
triggers:
  - /team walk
  - /team deliver
  - 产品走查
  - UI 走查
  - 测试走查
  - 验收
commands:
  - /team walk
  - /team deliver
members:
  - delivery-manager
  - product-manager
  - ui-designer
  - qa-engineer
  - tech-lead
execution_mode: hybrid
quality_gates:
  - design-gate
  - test-gate
  - delivery-gate
outputs:
  - walkthrough-report
  - delivery-summary
---

# 产品 UI QA 联合走查

## 适用场景

实现完成后，需要产品、UI 和 QA 从需求一致性、体验还原、测试质量和交付风险角度联合走查。

## 输入契约

- 已实现的功能或变更说明。
- PRD、验收标准或需求简报。
- UI 方案、截图、设计稿或页面路径。
- 测试结果或待验证项。

## 阶段表

| 阶段 | 负责人 | 动作 | 产出 | 门禁 |
| --- | --- | --- | --- | --- |
| Scope Check | 产品经理 | 对照验收标准检查功能范围 | 产品走查结论 | delivery-gate |
| UI Check | UI 设计师 | 检查视觉、交互、状态和响应式 | UI 走查结论 | design-gate |
| QA Check | 测试工程师 | 检查测试覆盖和回归结果 | QA 走查结论 | test-gate |
| Risk Check | 技术负责人 | 检查技术风险、兼容和回滚 | 技术风险 | technical-gate |
| Decision | 交付经理 | 汇总通过、阻塞或需修复项 | `walkthrough-report` | delivery-gate |

## 走查结论

- `通过`：可交付。
- `带风险通过`：风险已说明，用户或负责人接受。
- `不通过`：列出阻塞项、责任角色和复查条件。

## 失败处理

- 产品不一致：回到需求或实现阶段修正。
- UI 不一致：区分必须修复和可后续优化。
- QA 未覆盖：补测试或补人工验证。
- 技术风险未关闭：补验证、回滚或灰度方案。

## 完成定义

- 产品、UI、QA 的结论已汇总。
- 阻塞项有明确责任和修复条件。
- 最终交付状态可用于用户验收。
