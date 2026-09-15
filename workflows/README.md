# Workflows

本目录维护可被自然语言和 `/team` 指令匹配的工作流。

## 维护规则

- 每个工作流文件必须有 YAML frontmatter。
- `id` 必须和文件语义一致，并在 `route-table.md` 中可被检索。
- `members` 只能引用 `members/` 中已存在的成员 `id`。
- `execution_mode` 支持：
  - `sequential`：当前 Agent 顺序执行。
  - `hybrid`：默认顺序执行，复杂独立评审阶段可启动角色子 Agent。
- 工作流必须定义输入契约、阶段表、质量门禁、失败处理和完成定义。
- `members` 是候选角色池；执行前必须按 `docs/methodologies/role-activation-methodology.md` 形成 `rolePlan`，只加载实际参与角色。

## 当前工作流

| 工作流 | 文件 | 用途 |
| --- | --- | --- |
| 端到端需求交付 | `requirement-end-to-end.md` | 从需求到实现、测试、走查、交付 |
| 项目上下文构建 | `project-context-build.md` | 扫描工作目录并创建/更新 AGENTS.md |
| 需求评审 | `requirement-review.md` | 评审 PRD 或模糊需求 |
| 目标驱动技术方案 | `goal-driven-technical-design.md` | 从目标生成 PRD、自治契约、跨角色评审后的技术方案和用户决策包 |
| 技术方案评审 | `technical-design-review.md` | 评审架构、接口、数据、测试策略 |
| 缺陷修复交付 | `bugfix-delivery.md` | 复现、定位、修复、回归、交付 |
| 代码审查与优化交付 | `code-review-delivery.md` | 审查 diff/代码逻辑，必要时完成最小优化与验证 |
| 产品/UI/QA 走查 | `product-ui-qa-walkthrough.md` | 对实现结果做联合走查 |
| 交付结果汇总 | `delivery-summary.md` | 只读评估原任务有效证据并生成交付摘要 |
| 外部优质 Skill 安装 | `external-skill-install.md` | 基于角色和任务安装推荐开源 Skill |

## 执行入口

先读 [`route-table.md`](route-table.md) 匹配工作流，再读 [`execution-protocol.md`](execution-protocol.md) 和 [`../docs/methodologies/role-activation-methodology.md`](../docs/methodologies/role-activation-methodology.md) 形成执行与角色计划。

`resume`、`verify` 和 `deliver` 是原工作流上的操作约束，不复制新的领域工作流。
代码审查在 `code-review-delivery.md` 内区分 initial、delta 和 recheck。
