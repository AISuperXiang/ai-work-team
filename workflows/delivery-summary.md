---
id: delivery-summary
title: 交付结果汇总
triggers:
  - /team deliver
  - 生成交付摘要
  - 汇总交付结果
commands:
  - /team deliver
members:
  - delivery-manager
  - qa-engineer
execution_mode: sequential
quality_gates:
  - role-activation-gate
  - evidence-gate
  - verification-gate
  - delivery-gate
outputs:
  - delivery-summary
---

# 交付结果汇总

## 适用场景

已有任务需要基于当前有效事实生成交付摘要。该工作流不主动开始新的实现、代码审查、测试执行或走查。

## 输入契约

- task ID 或明确 workspace 路径。
- 原任务 `workflow-status.json`、证据索引和现有交付产物。
- 用户要求的总结范围。

多个任务候选无法消歧时询问用户，不按目录时间自动选择。

## 阶段表

| 阶段 | 负责人 | 动作 | 产出 | 门禁 |
| --- | --- | --- | --- | --- |
| Context Reconciliation | 交付经理 | 读取原任务、确认 deliver invocation、授权、active contract、当前快照和未关闭项 | 当前事实摘要 | role-activation-gate、evidence-gate |
| Evidence Assessment | QA | 运行只读 `check-delivery`，核对 required check、impact scope、review gaps 和环境证据有效性 | 逐项 readiness | verification-gate |
| Summary | 交付经理 | 从同一权威状态生成范围、结果、风险和下一动作；按 recordPolicy 生成文件或直接输出派生视图 | `delivery-summary.md` 或等价派生视图 | delivery-gate |

## 动作边界

- 允许读取任务文件、运行只读评估和写交付摘要。
- 不运行新的业务测试，不启动服务，不修改源码、测试、fixture 或契约。
- 不创建新 finding，不重新定级，不把历史报告的 open 状态静默关闭。
- required check、影响范围或环境证据失效时输出 review/blocked 和精确补验动作。
- 用户随后授权补验、修复或走查时，新增 verify/resume/walk invocation，不在 deliver 内隐式执行。

## 完成定义

- 摘要中的 task/invocation、契约、快照、check、finding 和风险均能回指权威状态。
- 实现 accepted、分析 analysis_complete 和部分 review 结论边界明确。
- 未覆盖范围、环境限制、收益观测和复盘计划没有被评分或措辞掩盖。
- 数字质量评分仅在用户要求或复盘比较时附加，不影响 readiness。
