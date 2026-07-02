---
name: "ai-work-team"
description: "产品/运营/UI/研发/测试专家团队工作流编排 Skill。Use when user asks to 承接需求、评审需求、设计方案、实现交付、缺陷修复、走查验收，或使用 /team 指令。"
metadata:
  version: "0.1.0"
---

# AI Work Team

## Agent 目标

`ai-work-team` 是产品研发专家团队编排 Skill。Agent 使用它把自然语言需求或 `/team` 指令路由到标准工作流，并按产品、运营、UI、技术负责人、前端、后端、QA、交付经理等角色完成评审、设计、实现、验证、走查和交付。

核心模型：

- **Workflow 调度角色**：先选主工作流，再按阶段加载角色。
- **Role 调度能力**：角色只使用当前阶段需要的内置能力、外部 Skill 或本地 CLI。
- **Capability 处理行动**：能力负责分析、实现、验证或生成产物。
- **Context 传递结果**：关键结论必须落到 workspace 文档、证据索引或最终交付摘要。

本文件是 Agent 执行入口。不要一次性加载全仓库；按任务读取最小上下文。

## 文件职责

- `SKILL.md`：面向 Agent，定义触发、路由、加载顺序、执行协议、门禁和输出契约。
- `README.md`：面向用户，说明这个 Skill 是什么、解决什么问题、如何安装和触发。除非用户询问安装或文档维护，否则执行工作流时不要优先加载 README。
- `skill-runtime.json`：面向安装器和通用 Agent，提供机器可读的入口、运行环境、安装方式和发布安全策略。

## 触发边界

满足以下任一情况时使用本 Skill：

- 用户输入 `/team` 指令。
- 用户要求承接需求、实现需求、从需求到交付完整推进。
- 用户要求产品、运营、UI、研发、测试等角色协作。
- 用户要求需求评审、技术方案评审、缺陷修复交付、产品/UI/QA 走查。
- 用户要求构建项目上下文、生成或更新 `AGENTS.md`。
- 用户要求推荐或安装外部 Skills，或登记本地 CLI 能力给团队角色使用。

不适用场景：

- 只回答简单知识问题。
- 只做明确、低风险、单文件小改动，且用户没有要求团队流程。
- 需要真实调用飞书、Jira、Codebase 等外部系统；当前版本只保留集成契约。

## 路由规则

1. 明确 `/team` 指令优先按 [`commands/team.md`](commands/team.md) 解析。
2. 没有指令时按 [`workflows/route-table.md`](workflows/route-table.md) 匹配意图。
3. 命中多个工作流时选择更具体的工作流。
4. 无法判断时，由交付经理给出最多 3 个候选并询问用户。
5. 工作流执行前必须读取 [`workflows/execution-protocol.md`](workflows/execution-protocol.md)。

## 最小加载矩阵

只读取当前任务需要的文件。

| 输入或意图 | 必读文件 | 按需文件 |
| --- | --- | --- |
| `/team` 或自然语言路由 | `commands/team.md`、`workflows/route-table.md`、`workflows/execution-protocol.md` | `commands/README.md` |
| `/team intake`、`/team review` | `workflows/requirement-review.md`、`docs/quality-gates.md` | `members/product-manager.md`、`members/operations-manager.md`、`assets/templates/requirement-brief.md`、`assets/templates/prd.md` |
| `/team design` | `workflows/technical-design-review.md`、`docs/quality-gates.md`、`docs/handoff-contract.md` | `members/ui-designer.md`、`members/tech-lead.md`、`assets/templates/technical-design.md` |
| `/team build` | `workflows/requirement-end-to-end.md`、`workflows/implementation-protocol.md`、`workspace/README.md`、`docs/quality-gates.md`、`docs/quality-rubrics.md`、`docs/business-impact-rubric.md`、`docs/handoff-contract.md` | 当前阶段涉及的 `members/*.md`、`assets/templates/` 中对应模板 |
| `/team bugfix` | `workflows/bugfix-delivery.md`、`workflows/implementation-protocol.md`、`docs/quality-gates.md`、`docs/quality-rubrics.md` | `members/tech-lead.md`、对应研发角色、`members/qa-engineer.md` |
| `/team walk`、`/team deliver` | `workflows/product-ui-qa-walkthrough.md`、`docs/quality-rubrics.md`、`docs/handoff-contract.md` | `members/product-manager.md`、`members/ui-designer.md`、`members/qa-engineer.md`、`assets/templates/walkthrough-report.md`、`assets/templates/delivery-summary.md` |
| `/team buildContext` | `workflows/project-context-build.md`、`assets/templates/agents-context.md` | `scripts/build-context.js`、目标仓库现有 `AGENTS.md` |
| `/team install` | `workflows/external-skill-install.md`、`external-skills/catalog.json`、`external-skills/install-policy.md`、`external-skills/role-map.md` | `external-skills/README.md`、`scripts/list-external-skills.js`、`scripts/install-external-skills.js` |
| `/team register-cli` | `external-cli/README.md` | 已存在的 `external-cli/<cli-id>.md` |
| 安装、发布、运行环境维护 | `skill-runtime.json`、`package.json` | `schemas/skill-runtime.schema.json`、`README.md` |

## 执行循环

每次执行都按以下顺序推进：

1. **Intake**：给出目标契约，包含用户目标、当前输入、成功标准、约束、信息缺口。
2. **Route**：选择一个主工作流，并说明命中依据。
3. **Load**：只加载主工作流、当前阶段角色、质量门禁和模板。
4. **Plan**：输出状态板，列出阶段、负责人、状态、当前产出和门禁。
5. **Workspace**：代码落地或交付类任务必须先创建或选择 workspace 需求目录。
6. **Execute**：逐阶段产出文档、代码变更或验证记录；阶段完成前检查门禁。
7. **Verify**：运行可用验证；不能运行时说明原因、影响和替代检查。
8. **Score**：涉及实现交付、缺陷修复或走查时，按质量评分规则给出结论。
9. **Deliver**：输出交付摘要、证据、风险和下一步建议。

如果需求信息不足但可通过仓库探索获得，先探索；只有产品意图、优先级或取舍无法从环境推断时才询问用户。

过程中保持状态板：

```text
阶段 | 负责人 | 状态 | 当前产出 | 门禁
```

状态使用 `pending`、`in_progress`、`blocked`、`review`、`completed`。

## Workspace 规则

端到端交付、缺陷修复、走查和需要落盘证据的任务必须使用 `workspace/`：

- 每个新需求默认创建 `workspace/YYYYMMDD-short-requirement-slug/`。
- 执行协议中的通用占位目录写作 `workspace/<requirement-folder>/`。
- 只有用户明确指定“在某需求下增加某功能”时，才复用已有需求目录并写入 `features/`。
- 代码改动发生在用户项目仓库；workspace 保存 PRD、方案、计划、决策、风险、交接、验证证据和交付摘要。
- 产物优先使用 `assets/templates/` 中的模板。
- `workflow-status.json` 必须记录阶段状态、负责人、门禁、产物路径和证据路径。
- `evidence/` 只保存命令结果、截图说明、日志摘要、数据来源或人工验收记录，不保存密钥、Cookie、Token 或敏感数据。

## 硬门禁

门禁失败时停止进入下一阶段，说明失败项、责任角色和修复动作。

- **value-gate**：PRD 完成前必须明确目标用户、价值假设、指标基线、收益目标、成本收益比、观测方式和复盘计划；业务影响评分必须满足最低线。
- **decision-gate**：关键范围、优先级、技术取舍、上线风险和延期项必须写入 `decision-log.md`。
- **handoff-gate**：阶段切换必须按 `docs/handoff-contract.md` 写入 `role-handoff.md` 或等价交接摘要。
- **complexity-gate**：需求必须按 `S / M / L / XL` 分级；`L / XL` 必须拆里程碑、技术 spike、QA 策略、灰度、回滚和收益复盘。
- **evidence-gate**：所有“已完成”“已验证”“可交付”“收益可观测”的结论必须有证据。
- **no-legacy-contract**：主文档、模板、脚本和新 workspace 文档不得出现旧入口、旧短名或旧路径。

涉及代码实现时还必须通过 `implementation-gate` 和 `test-gate`；最终交付必须通过 `delivery-gate`。

## 代码落地规则

进入代码实现前必须读取 [`workflows/implementation-protocol.md`](workflows/implementation-protocol.md)。

执行要求：

- 先确认目标项目根目录和变更范围。
- 优先读取项目现有上下文、代码结构、测试命令和约定。
- 保持改动聚焦，不做无关重构。
- 遵循目标仓库既有框架、组件、状态管理、样式和测试模式。
- 对关键状态、异常、权限、兼容和回滚路径给出处理或明确风险。
- 验证结果必须落到 `evidence/`、交付摘要或最终回复中。

## 角色协作

默认由当前 Agent 顺序编排所有角色，保证上下文连续。

当同时满足以下条件时，按工作流要求启动角色子 Agent 并由交付经理汇总：

- 当前工作流 frontmatter 或阶段表标注 `execution_mode: hybrid`。
- 阶段目标可以独立评估，例如产品范围评审、UI 走查、技术风险评审、测试策略评审。
- 任务复杂度较高，或用户明确要求专家团队并行评审。

子 Agent 输出必须包含：

| 字段 | 要求 |
| --- | --- |
| 结论 | 通过、修改后通过、不通过或需用户决策 |
| 证据 | 代码、文档、命令、截图、数据来源或人工验收依据 |
| 风险 | 影响、概率、严重级别、缓解动作和责任角色 |
| 置信度 | 高 / 中 / 低，并说明不确定来源 |
| 需决策项 | 最多 3 个，需要用户或交付经理裁决的问题 |

交付经理必须输出统一结论和裁决依据，不得把互相冲突的原始意见直接交给用户。

## 外部能力规则

外部 Skills：

- 用户显式 `/team install` 或明确授权前，不安装外部 Skill。
- 匹配外部 Skill 前先读 `external-skills/catalog.json`、`external-skills/role-map.md` 和 `external-skills/install-policy.md`。
- 按角色职责、任务关键词、trustScore 和本地同能力 Skill 状态选择能力。
- 未命中 catalog 时只展示可用清单或候选，不安装未知来源 Skill。

本地 CLI：

- 只使用 `external-cli/` 下已经登记并可验证的 CLI 能力。
- 使用前读取 `external-cli/README.md` 和对应 `external-cli/<cli-id>.md`。
- 没有能力卡时，只能建议用户通过 `/team register-cli` 注册，不得臆测 CLI 参数、权限或写操作边界。

## 最终输出契约

最终回复必须包含：

- 采用的工作流。
- workspace 需求目录。
- 参与角色。
- 已完成产出。
- 验证结果和证据索引。
- 质量评分。
- 业务影响、收益观测和复盘计划。
- 决策日志、风险台账、角色交接状态。
- 未解决风险或明确无风险。
- 后续建议。

若没有产生某类内容，必须说明原因，例如“本任务不涉及 UI，UI 评分为 N/A”或“当前无法运行验证，原因是缺少依赖环境”。

## 维护规则

- 新增角色时修改 `members/`，并更新 `members/README.md`。
- 新增工作流时修改 `workflows/`，并更新 `workflows/route-table.md`。
- 新增快捷指令时修改 `commands/team.md`。
- 新增外部 Skill 时修改 `external-skills/catalog.json`，并同步更新 `external-skills/role-map.md` 和相关成员文件。
- 新增或更新本地 CLI 能力时，修改 `external-cli/` 下对应能力卡；只记录能力摘要、适用角色、验证方式和安全边界，不记录密钥。
- 修改 Node 版本、安装方式、入口文件或必需打包文件时，同步更新 `skill-runtime.json`、`schemas/skill-runtime.schema.json` 和 README 安装说明。
- 新增方法论放入 `docs/methodologies/`。
- 新增研发硬约束放入 `docs/engineering-standards/`。
- 修改结构或契约后运行 `npm test`。
