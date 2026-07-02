# Docs

本目录维护 Skill 的方法论、研发规范、质量门禁、交接契约和外部系统扩展契约。

## 目录

- `quality-gates.md`：所有工作流必须检查的阶段门禁。
- `quality-rubrics.md`：实现交付质量评分标准。
- `business-impact-rubric.md`：业务影响、价值假设、收益目标和观测证据的独立评分标准。
- `handoff-contract.md`：角色之间交接的最小信息包。
- `methodologies/`：各角色工作方法论。
- `engineering-standards/`：研发实现、评审、测试、发布和安全规范。
- `integrations/`：飞书、Issue Tracker、代码平台等外部系统预留契约。

## 使用原则

- 工作流执行时只加载当前阶段所需文档。
- 质量门禁是硬约束，未通过必须说明失败原因。
- 代码落地交付必须使用 `quality-rubrics.md` 评分。
- PRD 和交付摘要的业务价值判断必须满足 `business-impact-rubric.md`。
- 方法论用于指导思考，不替代仓库真实上下文。
- 外部集成文档只定义接口，不代表首版会真实调用外部系统。
