# Docs

本目录维护 Skill 的方法论、研发规范、质量门禁、交接契约和外部系统扩展契约。

## 目录

- `quality-gates.md`：所有工作流必须检查的阶段门禁。
- `quality-rubrics.md`：实现交付质量维度与可选辅助评分。
- `delivery-controls.md`：有效契约、修复对照和逐项证据门禁。
- `business-impact-rubric.md`：业务影响、价值假设、收益目标和观测证据的实质门禁与辅助评估。
- `handoff-contract.md`：角色之间交接的最小信息包。
- `methodologies/execution-methodology.md`：按风险选择执行档位、并行边界和验证结论上限。
- `methodologies/role-activation-methodology.md`：按场景选择角色，记录 `active`、`consulted` 和 `not_applicable` 依据。
- `methodologies/goal-driven-technical-design-methodology.md`：从目标生成 PRD、四类自治契约、评审后技术方案和用户决策包。
- `methodologies/skill-evaluation-methodology.md`：隐藏答案历史案例与真实任务试点的效果评估。
- `verification-packs/`：按风险加载的异步、SSR 和缓存验证方法。
- `methodologies/`：各角色工作方法论。
- `engineering-standards/`：研发实现、评审、测试、发布和安全规范。
- `engineering-standards/cli-quality-architecture.md`：Node CLI 输入、写入、行为测试、突变与 CI 架构。
- `engineering-standards/behavior-impact-standard.md`：调用链、同类入口、消费者、增量 CR 和合并后行为覆盖。
- `engineering-standards/verification-environment-standard.md`：项目环境适配、Gateway 复用、构建身份、账号/数据和资源锁。
- `integrations/`：飞书、Issue Tracker、代码平台等外部系统预留契约。

## 使用原则

- 工作流执行时只加载当前阶段所需文档。
- 质量门禁是硬约束，未通过必须说明失败原因。
- 代码落地交付必须检查 `quality-rubrics.md` 的适用维度；数字评分只在需要比较或复盘时提供。
- PRD 和交付摘要的业务价值判断必须满足 `business-impact-rubric.md`。
- 目标驱动技术方案必须满足 `goal-contract-gate`、`autonomy-gate` 和 `design-review-gate`，且方案完成不等于授权实现。
- 方法论用于指导思考，不替代仓库真实上下文。
- 实现、缺陷修复和代码审查必须记录 `executionProfile` 与 `verificationLevel`；静态检查不能替代运行时行为验证。
- 新 build、bugfix、code-review 使用 v2.1，分别记录任务测试选择、catalog 健康和逐项执行证据；整体等级和评分不能覆盖缺失、失败、冲突或过期的 required check。
- 所有工作流先形成 `rolePlan`，只加载有明确职责的角色；未参与角色必须记录不适用依据。
- 外部集成文档只定义接口，不代表首版会真实调用外部系统。
