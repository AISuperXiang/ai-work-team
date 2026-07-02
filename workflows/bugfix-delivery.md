---
id: bugfix-delivery
title: 缺陷修复交付
triggers:
  - /team bugfix
  - 修复问题
  - bug
  - 报错
  - 回归失败
commands:
  - /team bugfix
members:
  - delivery-manager
  - product-manager
  - tech-lead
  - frontend-engineer
  - backend-engineer
  - qa-engineer
execution_mode: hybrid
quality_gates:
  - requirement-gate
  - technical-gate
  - implementation-gate
  - test-gate
  - delivery-gate
outputs:
  - bug-analysis
  - implementation-plan
  - test-plan
  - delivery-summary
---

# 缺陷修复交付

## 适用场景

用户报告功能异常、报错、测试失败、线上缺陷或回归问题，需要定位、修复、验证和交付。

## 输入契约

- 问题现象。
- 复现步骤或失败命令。
- 期望行为。
- 相关路径、页面、接口、日志或截图。

## 阶段表

| 阶段 | 负责人 | 动作 | 产出 | 门禁 |
| --- | --- | --- | --- | --- |
| Triage | 交付经理 + 产品经理 | 确认影响范围、严重级别、期望行为 | 缺陷摘要 | requirement-gate |
| Reproduce | QA + 研发 | 复现问题，收集证据 | 复现结论 | test-gate |
| Diagnose | 技术负责人 | 定位根因，排除无关假设 | `bug-analysis` | technical-gate |
| Fix | 前端/后端工程师 | 最小修复，避免无关改动 | 修复实现 | implementation-gate |
| Regression | QA | 验证原问题和相关回归路径 | 验证报告 | test-gate |
| Delivery | 交付经理 | 总结根因、修复、验证、风险 | `delivery-summary` | delivery-gate |

## 缺陷原则

- 先复现，再修复。
- 优先最小修复，不做无关重构。
- 每个修复必须有对应验证。
- 不能复现时说明证据缺口和下一步采集方式。

## 失败处理

- 无法复现：输出缺少的环境、数据、账号或日志。
- 根因不明：增加观测或缩小复现范围。
- 修复引入回归：回退或重新裁剪方案。
- 验证不可运行：给出替代验证和残余风险。

## 完成定义

- 原缺陷已修复或有明确阻塞原因。
- 回归范围已验证。
- 修复范围、根因、风险和验证结果可交付。
