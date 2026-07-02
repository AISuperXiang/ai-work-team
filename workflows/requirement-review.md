---
id: requirement-review
title: 需求评审
triggers:
  - /team review
  - /team intake
  - 需求评审
  - PRD 评审
commands:
  - /team review
  - /team intake
members:
  - delivery-manager
  - product-manager
  - operations-manager
  - ui-designer
  - tech-lead
  - qa-engineer
execution_mode: hybrid
quality_gates:
  - requirement-gate
  - design-gate
  - technical-gate
outputs:
  - requirement-brief
  - prd
  - risk-register
---

# 需求评审

## 适用场景

用户给出需求、PRD、想法或业务问题，希望团队先判断是否清晰、可做、值得做、如何裁剪，不默认进入编码。

## 输入契约

- 原始需求或 PRD。
- 业务目标或用户场景。
- 已知约束、时间、资源和优先级。

## 阶段表

| 阶段 | 负责人 | 动作 | 产出 | 门禁 |
| --- | --- | --- | --- | --- |
| Intake | 交付经理 | 识别评审目标和缺口 | 状态板 | requirement-gate |
| Product Review | 产品经理 | 明确用户、范围、验收标准 | `requirement-brief` | requirement-gate |
| Operation Review | 运营经理 | 明确指标、上线节奏、运营风险 | 运营风险 | requirement-gate |
| UI Feasibility | UI 设计师 | 判断用户路径、状态和可用性缺口 | UI 评审 | design-gate |
| Tech Feasibility | 技术负责人 | 判断技术风险、依赖和拆分方式 | 技术风险 | technical-gate |
| QA Feasibility | 测试工程师 | 判断验收标准是否可测试 | 测试风险 | test-gate |
| Decision | 交付经理 | 汇总通过、修改后通过或拒绝 | 评审结论 | delivery-gate |

## 评审结论格式

- `通过`：需求明确，风险可控，可进入设计或实现。
- `修改后通过`：列出必须补齐的信息和建议裁剪。
- `暂缓`：关键目标、范围或可行性不成立。

## 失败处理

- 产品目标不清：要求补充目标用户和成功指标。
- 范围过大：产品经理给出 MVP 和延期项。
- 验收不可测试：QA 反向补齐验收标准。
- 技术风险过高：技术负责人提出替代方案或分阶段方案。

## 完成定义

- 给出明确评审结论。
- 风险和开放问题有责任角色。
- 下一步工作流建议明确：设计、端到端交付、暂缓或拆分。
