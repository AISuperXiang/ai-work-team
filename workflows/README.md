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

## 当前工作流

| 工作流 | 文件 | 用途 |
| --- | --- | --- |
| 端到端需求交付 | `requirement-end-to-end.md` | 从需求到实现、测试、走查、交付 |
| 项目上下文构建 | `project-context-build.md` | 扫描工作目录并创建/更新 AGENTS.md |
| 需求评审 | `requirement-review.md` | 评审 PRD 或模糊需求 |
| 技术方案评审 | `technical-design-review.md` | 评审架构、接口、数据、测试策略 |
| 缺陷修复交付 | `bugfix-delivery.md` | 复现、定位、修复、回归、交付 |
| 产品/UI/QA 走查 | `product-ui-qa-walkthrough.md` | 对实现结果做联合走查 |
| 外部优质 Skill 安装 | `external-skill-install.md` | 基于角色和任务安装推荐开源 Skill |

## 执行入口

先读 [`route-table.md`](route-table.md) 匹配工作流，再读 [`execution-protocol.md`](execution-protocol.md) 执行通用协议。
