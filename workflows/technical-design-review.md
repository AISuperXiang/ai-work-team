---
id: technical-design-review
title: 技术方案评审
triggers:
  - /team design
  - 技术方案
  - 架构评审
  - 实现方案
commands:
  - /team design
members:
  - delivery-manager
  - tech-lead
  - frontend-engineer
  - backend-engineer
  - qa-engineer
execution_mode: hybrid
quality_gates:
  - role-activation-gate
  - technical-gate
  - decision-gate
  - implementation-gate
  - test-gate
  - delivery-gate
outputs:
  - technical-design
  - implementation-plan
  - test-plan
  - decision-log
  - risk-register
---

# 技术方案评审

## 适用场景

用户已有需求或初步方案，需要评审架构、接口、数据、兼容性、测试和实现拆解。

## 输入契约

- 需求目标和验收标准。
- 现有或拟定技术方案。
- 相关代码路径、接口、数据结构或依赖。

## 阶段表

| 阶段 | 负责人 | 动作 | 产出 | 门禁 |
| --- | --- | --- | --- | --- |
| Context | 交付经理 + 技术负责人 | 读取现状、识别边界、依赖、执行档位和 `rolePlan` | 背景摘要、角色激活结论 | role-activation-gate、technical-gate |
| Architecture | 技术负责人 | 基于事实评估架构、接口、数据、兼容和回滚 | `technical-design.md`、`risk-register.md` | technical-gate |
| Frontend Review | 前端工程师 | 仅在客户端代码、页面或状态受影响时评审边界和联调风险 | 前端风险或 N/A 依据 | implementation-gate |
| Backend Review | 后端工程师 | 仅在 API、数据、权限或服务端行为受影响时评审契约和幂等 | 后端风险或 N/A 依据 | implementation-gate |
| QA Review | 测试工程师 | 评审可测性、最小回归集和目标验证等级 | `test-plan.md` | test-gate |
| Decision | 交付经理 + 技术负责人 | 汇总方案、修改点、执行顺序和责任边界 | `decision-log.md`、评审结论 | decision-gate、delivery-gate |

## 必查项

- 是否基于真实代码和配置。
- 接口、数据、权限、异常、兼容、回滚是否明确。
- 是否有最小可交付切片。
- 是否避免不必要重构。
- 测试策略是否覆盖核心风险。
- 需求来源是否逐条映射到必需验收与 check，共享选项的 loading/empty/error 等相关组合是否遗漏。
- SDK/API/配置变化是否按 [消费者契约](../docs/engineering-standards/consumer-contract-standard.md)
  固定真实两侧版本、调用入口、序列化样本和适用验证项。
- 未激活的工程角色是否有明确不适用依据。

## 失败处理

- 缺少代码上下文：先探索仓库再继续。
- 方案超出需求范围：裁剪到 MVP。
- 风险不可接受：提出替代方案或阶段化方案。
- 测试不可执行：补充测试入口或人工验证路径。

## 完成定义

- 技术方案可被研发直接执行。
- 风险、依赖、验证和回滚明确。
- `rolePlan`、责任边界和 N/A 依据明确。
- 需要用户或团队决策的问题已列出。
