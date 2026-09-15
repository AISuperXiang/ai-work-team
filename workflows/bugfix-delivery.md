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
  - role-activation-gate
  - reproduction-gate
  - technical-gate
  - decision-gate
  - implementation-gate
  - test-gate
  - evidence-gate
  - verification-gate
  - handoff-gate
  - delivery-gate
outputs:
  - bug-analysis
  - decision-log
  - implementation-plan
  - test-plan
  - role-handoff
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
| Triage | 交付经理 + 产品经理 | 确认影响、严重级别、期望行为、执行档位和 `rolePlan`；预期行为已明确时产品可不参与 | `bug-analysis.md`、角色激活结论 | requirement-gate、role-activation-gate |
| Reproduce | QA + 问题归属研发 | 由命中前端或后端角色复现问题或明确采证/插桩计划，收集基线证据 | `bug-analysis.md`、`evidence/README.md` | reproduction-gate、evidence-gate |
| Diagnose | 技术负责人 + 问题归属研发 | 比较假设、定位根因、排除无关解释并记录取舍；低风险局部问题可由研发主导 | `bug-analysis.md`、`decision-log.md` | technical-gate、decision-gate |
| Fix | 问题归属工程师 | 最小修复，避免无关改动，记录影响面与回滚 | 修复实现、`implementation-plan.md` | implementation-gate |
| Regression | QA | 复跑原复现路径和相关回归路径，标记验证等级 | `test-plan.md`、`evidence/README.md` | test-gate、evidence-gate、verification-gate |
| Delivery | 交付经理 | 总结根因、修复、验证等级、风险和交接；按 recordPolicy 生成独立视图 | `workflow-status.json`、派生交付视图 | handoff-gate、delivery-gate、verification-gate |

## 缺陷原则

- 必须执行 [Delivery Controls](../docs/delivery-controls.md)：Triage 固定契约来源，
  Reproduce 保存业务失败基线，Diagnose 列保留行为与适用消费方，
  Regression 逐项复跑原反例及保留路径。只修新用例不等于修复完成。
- Diagnose 按 [Behavior Impact Standard](../docs/engineering-standards/behavior-impact-standard.md)
  检查入口、共享分流、同类入口、消费者和可观察结果；同类入口语义不同则分别验证，
  有证据等价时才使用代表用例。合并或冲突处理后在最终组合快照重跑保护检查。
- 依赖真实环境的复现和回归按
  [Verification Environment Standard](../docs/engineering-standards/verification-environment-standard.md)
  复用项目既有 Gateway、runner 和锁；错实例、旧构建、错误账号/数据属于环境失败，不触发猜测补丁。
- 新状态使用 v2 fixes/checks/run 引用；基线与修复后快照分别保留。
  candidate 只能表示候选修复，关键验收缺失时不能关闭缺陷或完成 Delivery 门禁。
- 先复现，再修复。
- 优先最小修复，不做无关重构。
- 每个修复必须有对应验证。
- 不能复现时说明证据缺口和下一步采集方式。
- 不把“理论上应修复”写成“已修复”；无法复现时不得交付“已修复”，验证等级决定交付结论上限。

## 失败处理

- 无法复现：输出缺少的环境、数据、账号或日志，以及最小插桩、采集字段和复查条件。
- 根因不明：增加观测或缩小复现范围。
- 修复引入回归：回退或重新裁剪方案。
- 验证不可运行：给出替代验证和残余风险。

## 完成定义

- 原缺陷已修复或有明确阻塞原因。
- 回归范围已验证。
- 修复范围、根因、风险、验证等级和未覆盖范围可交付。
- `rolePlan` 能说明产品、技术负责人、前端或后端为何参与或不适用。
