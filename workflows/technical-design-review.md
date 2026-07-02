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
  - technical-gate
  - implementation-gate
  - test-gate
outputs:
  - technical-design
  - implementation-plan
  - test-plan
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
| Context | 技术负责人 | 读取现状、识别边界和依赖 | 背景摘要 | technical-gate |
| Architecture | 技术负责人 | 评估架构、接口、数据和兼容 | `technical-design` | technical-gate |
| Frontend Review | 前端工程师 | 评审 UI 状态、前端边界、联调风险 | 前端风险 | implementation-gate |
| Backend Review | 后端工程师 | 评审 API、数据、权限、幂等 | 后端风险 | implementation-gate |
| QA Review | 测试工程师 | 评审可测性和回归范围 | `test-plan` | test-gate |
| Decision | 交付经理 | 汇总通过、修改点和执行顺序 | 评审结论 | delivery-gate |

## 必查项

- 是否基于真实代码和配置。
- 接口、数据、权限、异常、兼容、回滚是否明确。
- 是否有最小可交付切片。
- 是否避免不必要重构。
- 测试策略是否覆盖核心风险。

## 失败处理

- 缺少代码上下文：先探索仓库再继续。
- 方案超出需求范围：裁剪到 MVP。
- 风险不可接受：提出替代方案或阶段化方案。
- 测试不可执行：补充测试入口或人工验证路径。

## 完成定义

- 技术方案可被研发直接执行。
- 风险、依赖、验证和回滚明确。
- 需要用户或团队决策的问题已列出。
