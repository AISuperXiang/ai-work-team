---
name: ai-work-team
description: 产品/运营/UI/研发/测试专家团队工作流编排 Skill。Use when user asks to 承接或续跑需求、评审需求、从目标生成 PRD 和可控迭代技术方案、代码审查与优化、增量审查或问题复核、仅执行验证、汇总交付、缺陷修复、走查验收，或使用 /team 指令。
metadata:
  version: "0.8.0"
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
- `AGENTS.md`：面向仓库内代码 Agent，定义 CLI 输入、文件写入、测试、突变、CI 和文档同步硬约束。
- `README.md`：默认中文用户文档，说明这个 Skill 是什么、解决什么问题、如何安装和触发。
- `README_EN.md`：与中文主文档对应的英文用户文档。
- 除非用户询问安装或文档维护，否则执行工作流时不要优先加载 README。
- `skill-runtime.json`：面向安装器和通用 Agent，提供机器可读的入口、运行环境、安装方式和发布安全策略。

## 触发边界

满足以下任一情况时使用本 Skill：

- 用户输入 `/team` 指令。
- 用户要求承接需求、实现需求、从需求到交付完整推进。
- 用户给出目标，希望先生成 PRD、需求/UI 评审、自治契约和评审后的技术方案。
- 用户要求产品、运营、UI、研发、测试等角色协作。
- 用户要求需求评审、代码逻辑审查与优化、技术方案评审、缺陷修复交付、产品/UI/QA 走查。
- 用户要求续跑已有任务、只执行验证、增量审查或复核指定问题。
- 用户要求构建项目上下文、生成或更新 `AGENTS.md`。
- 用户要求初始化 workspace 任务或递归审计 workspace 完整性。
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

| 输入或意图                     | 必读文件                                                                                                                                                                                                                                                                                                                                                           | 按需文件                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `/team` 或自然语言路由         | `commands/team.md`、`workflows/route-table.md`、`workflows/execution-protocol.md`、`docs/methodologies/role-activation-methodology.md`                                                                                                                                                                                                                             | `commands/README.md`                                                                                                              |
| `/team intake`、`/team review` | `workflows/requirement-review.md`、`docs/quality-gates.md`                                                                                                                                                                                                                                                                                                         | `members/product-manager.md`、`members/operations-manager.md`、`assets/templates/requirement-brief.md`、`assets/templates/prd.md` |
| `/team design`                 | `workflows/technical-design-review.md`、`docs/quality-gates.md`、`docs/handoff-contract.md`                                                                                                                                                                                                                                                                        | `members/ui-designer.md`、`members/tech-lead.md`、`assets/templates/technical-design.md`                                          |
| `/team goal-design`            | `workflows/goal-driven-technical-design.md`、`docs/methodologies/goal-driven-technical-design-methodology.md`、`docs/quality-gates.md`、`docs/handoff-contract.md`、`workspace/README.md`、四类 `schemas/*.schema.json`                                                                                                                                            | `rolePlan` 中的产品、运营、UI、技术负责人、领域研发、QA、交付经理与目标驱动模板                                                   |
| `/team build`                  | `workflows/requirement-end-to-end.md`、`workflows/implementation-protocol.md`、`workspace/README.md`、`docs/delivery-controls.md`、`docs/engineering-standards/behavior-impact-standard.md`、`docs/methodologies/role-activation-methodology.md`、`docs/quality-gates.md`、`docs/quality-rubrics.md`、`docs/business-impact-rubric.md`、`docs/handoff-contract.md` | 运行验证时加载环境标准和命中的 `docs/verification-packs/*.md`；按 `rolePlan` 加载成员与方法论                                     |
| `/team bugfix`                 | `workflows/bugfix-delivery.md`、`workflows/implementation-protocol.md`、`docs/delivery-controls.md`、`docs/engineering-standards/behavior-impact-standard.md`、`docs/methodologies/execution-methodology.md`、`docs/methodologies/role-activation-methodology.md`、`docs/quality-gates.md`、`docs/quality-rubrics.md`                                              | 运行验证时加载环境标准；按 `rolePlan` 加载技术负责人、问题归属研发、QA、产品角色                                                  |
| `/team resume`                 | 原任务工作流、`workflows/execution-protocol.md`、`docs/delivery-controls.md`                                                                                                                                                                                                                                                                                       | 获得实现授权且需修改代码时补 `implementation-protocol.md`；运行验证时加载环境标准                                                 |
| `/team verify`                 | 原任务工作流、`workflows/execution-protocol.md`、`docs/delivery-controls.md`、`docs/engineering-standards/verification-environment-standard.md`                                                                                                                                                                                                                    | 命中风险时加载 `docs/verification-packs/*.md`；不得加载实现协议并进入源码修改                                                     |
| `/team code-review`            | `workflows/code-review-delivery.md`、`docs/delivery-controls.md`、`docs/methodologies/execution-methodology.md`、`docs/methodologies/role-activation-methodology.md`、`docs/engineering-standards/review-standard.md`、`docs/engineering-standards/behavior-impact-standard.md`、`docs/quality-gates.md`                                                           | 运行验证时加载环境标准和命中的 `docs/verification-packs/*.md`；按 `rolePlan` 加载命中领域角色与 `assets/templates/code-review.md` |
| `/team walk`                   | `workflows/product-ui-qa-walkthrough.md`、`docs/delivery-controls.md`、`docs/quality-rubrics.md`、`docs/handoff-contract.md`                                                                                                                                                                                                                                       | `members/product-manager.md`、`members/ui-designer.md`、`members/qa-engineer.md`、`assets/templates/walkthrough-report.md`        |
| `/team deliver`                | `workflows/delivery-summary.md`、`docs/delivery-controls.md`、`docs/quality-rubrics.md`、`docs/handoff-contract.md`                                                                                                                                                                                                                                                | `members/delivery-manager.md`、`members/qa-engineer.md`、`assets/templates/delivery-summary.md`                                   |
| `/team buildContext`           | `workflows/project-context-build.md`、`assets/templates/agents-context.md`                                                                                                                                                                                                                                                                                         | `scripts/build-context.js`、目标仓库现有 `AGENTS.md`                                                                              |
| `/team init-workspace`         | `workspace/README.md`、`docs/engineering-standards/cli-quality-architecture.md`                                                                                                                                                                                                                                                                                    | `scripts/init-task.js`、对应工作流状态模板                                                                                         |
| `/team audit-workspaces`       | `workspace/README.md`、`docs/engineering-standards/cli-quality-architecture.md`                                                                                                                                                                                                                                                                                    | `scripts/audit-workspaces.js`                                                                                                     |
| `/team install`                | `workflows/external-skill-install.md`、`external-skills/catalog.json`、`external-skills/install-policy.md`、`external-skills/role-map.md`                                                                                                                                                                                                                          | `external-skills/README.md`、`scripts/list-external-skills.js`、`scripts/install-external-skills.js`                              |
| `/team register-cli`           | `external-cli/README.md`                                                                                                                                                                                                                                                                                                                                           | 已存在的 `external-cli/<cli-id>.md`                                                                                               |
| Skill 优化效果评估             | `docs/methodologies/skill-evaluation-methodology.md`、`schemas/skill-evaluation.schema.json`                                                                                                                                                                                                                                                                       | `assets/templates/skill-evaluation.json`、`scripts/evaluate-skill.js`                                                             |
| 安装、发布、运行环境维护       | `skill-runtime.json`、`package.json`                                                                                                                                                                                                                                                                                                                               | `schemas/skill-runtime.schema.json`、`README.md`、`README_EN.md`                                                                  |

## 执行循环

build、bugfix、resume、verify、code-review、walk、deliver 必须先读取
[`docs/delivery-controls.md`](docs/delivery-controls.md)。新任务使用 v2.2 状态：
有效契约、原反例与保留路径、逐验收项证据共用现有门禁。
2.0/2.1 状态继续按原契约读取；旧任务无对应证据时不得自动提升为新门禁已验收。
goal-design 的设计批准仍不代表实现批准。

`resume`、`verify`、代码审查模式和 `deliver` 是操作约束，优先于领域关键词：

- `resume` 复用 task ID、原工作流和有效事实，只重开必要阶段。
- `verify` 只运行验证、评估和追加证据，不修改源码、测试期望或 fixture。
- code-review 明确 `initial`、`delta` 或 `recheck`，并分别记录本轮检查、有效继承和缺口。
- `deliver` 只评估并汇总已有有效结果，不隐式触发全审、全测或修复。

每次执行都按以下顺序推进：

1. **Intake**：给出目标契约，包含用户目标、当前输入、成功标准、约束、信息缺口。
2. **Route**：选择一个主工作流，并说明命中依据。
3. **Load**：只加载主工作流、当前阶段角色、质量门禁和模板。
4. **Profile**：实现、缺陷修复和代码审查先按风险、未知度和影响范围选择 `lightweight`、`standard` 或 `assurance`。
5. **Activate Roles**：按 `role-activation-methodology.md` 形成 `rolePlan`，只加载处于 `active` 或 `consulted` 的角色与方法论。
6. **Plan**：输出状态板，列出阶段、负责人、状态、当前产出、门禁、执行档位和验证等级。
7. **Workspace**：代码落地或交付类任务必须先创建或选择 workspace 需求目录。
8. **Invocation**：记录 task ID、本轮操作、授权依据、选中 check/finding、允许动作和必要阶段。
9. **Impact**：实现、修复和审查按行为调用链记录入口、共享决策、同类入口、消费者、结果和排除依据。
10. **Execute**：逐阶段产出文档、代码变更或验证记录；阶段完成前检查门禁。
11. **Select Tests**：从显式任务路径记录 test selection；catalog health 和执行结果独立，不以工作树或退出码替代逐项结论。
12. **Verify**：按项目声明能力预检环境，按风险加载 async/SSR/cache 验证包并运行检查；不能运行时说明原因、影响和替代检查，并按 `V0-V4` 标记验证等级。
13. **Assess Quality**：检查适用质量维度；数字评分仅在用户要求或复盘比较时提供，不参与准入。
14. **Deliver**：从权威状态单向输出交付摘要、证据、风险和下一步建议。

2.2 任务按 [`docs/evidence-recording.md`](docs/evidence-recording.md) 执行
`record-evidence start → prepare → 项目验证 → import → summary`：开始时记录实际技能身份，
运行前固定输入绑定，运行后导入来源侧已脱敏结果；未知 runner/wrapper 不得改填通过。
技术设计前逐条抽取需求来源到 `assurance.requirements`，QA 从原文复核遗漏及状态组合，
再绑定 coverageReview；selected 风险包必须有入口、fixture、断言和方法兼容的义务。
SDK/API/配置消费链变化时加载
[`consumer-contract-standard.md`](docs/engineering-standards/consumer-contract-standard.md)，
记录真实两侧版本、消费入口和样本；库内通过不能替代消费端验证。

如果需求信息不足但可通过仓库探索获得，先探索；只有产品意图、优先级或取舍无法从环境推断时才询问用户。

过程中保持状态板：

```text
阶段 | 负责人 | 状态 | 当前产出 | 门禁 | 执行档位 | 验证等级
```

状态使用 `pending`、`in_progress`、`blocked`、`review`、`completed`。

## Workspace 规则

端到端交付、缺陷修复、走查和需要落盘证据的任务必须使用 `workspace/`：

- 每个新需求默认创建 `workspace/YYYYMMDD-short-requirement-slug/`。
- 新任务优先通过 `scripts/init-task.js` 初始化最小 v2.2 状态；`--json` 和 `--dry-run` 只预览不写入。
- 使用 `scripts/audit-workspaces.js` 递归盘点主任务、`features/*` 和 `implementation` 子任务；审计只检查库存与结构，不替代交付 readiness。
- 执行协议中的通用占位目录写作 `workspace/<requirement-folder>/`。
- 只有用户明确指定“在某需求下增加某功能”时，才复用已有需求目录并写入 `features/`。
- 代码改动发生在用户项目仓库；workspace 保存 PRD、方案、计划、决策、风险、交接、验证证据和交付摘要。
- 产物优先使用 `assets/templates/` 中的模板。
- `workflow-status.json` 必须记录阶段状态、负责人、门禁、产物路径、证据路径、`executionProfile`、`verificationLevel` 和 `rolePlan`。
- `evidence/` 只保存命令结果、截图说明、日志摘要、数据来源或人工验收记录，不保存密钥、Cookie、Token 或敏感数据。

## 硬门禁

门禁失败时停止进入下一阶段，说明失败项、责任角色和修复动作。

- **value-gate**：PRD 完成前必须明确目标用户、价值假设、指标基线、收益目标、成本收益比、观测方式和复盘计划；数字评分不替代这些实质条件。
- **goal-contract-gate**：目标驱动技术方案必须冻结目标、非目标、约束、指标、成功标准、假设和重新评审触发器。
- **autonomy-gate**：里程碑、Task DAG、计划/最大迭代轮数、预算、审批、停止和重规划规则必须完整且一致。
- **design-review-gate**：技术、产品、适用 UI、研发和 QA 的评审意见必须有证据、处置和复核，且自动修订不超过上限。
- **decision-gate**：关键范围、优先级、技术取舍、上线风险和延期项必须写入 `decision-log.md`，或按 `recordPolicy` 内联到权威状态并提供可追溯 `decisionRef`。
- **handoff-gate**：阶段切换必须按 `docs/handoff-contract.md` 写入 `role-handoff.md` 或等价交接摘要。
- **complexity-gate**：需求必须按 `S / M / L / XL` 分级；`L / XL` 必须拆里程碑、技术 spike、QA 策略、灰度、回滚和收益复盘。
- **evidence-gate**：所有“已完成”“已验证”“可交付”“收益可观测”的结论必须有证据。
- **verification-gate**：验证等级必须与证据一致，静态检查不得写成运行时或用户验收通过。
- **reproduction-gate**：缺陷修复必须先复现或明确采证计划，不能凭推理声称已修复。
- **review-gate**：代码审查必须给出范围、代码定位、反例、反证检查、证据状态、变更归因、已修核对、严重度和验证建议。
- **role-activation-gate**：每个角色必须有 `active`、`consulted` 或 `not_applicable` 的场景依据；不适用角色不得制造虚假产物或评分。
- **no-legacy-contract**：主文档、模板、脚本和新 workspace 文档不得出现旧入口、旧短名或旧路径。

涉及代码实现时还必须通过 `implementation-gate` 和 `test-gate`；最终交付必须通过 `delivery-gate`。

## 代码落地规则

进入代码实现前必须读取 [`workflows/implementation-protocol.md`](workflows/implementation-protocol.md)。

执行要求：

- 先确认目标项目根目录和变更范围。
- 修改本仓库 Node CLI、测试或 CI 时先读取 `AGENTS.md` 和 `docs/engineering-standards/cli-quality-architecture.md`。
- 先读取 `docs/methodologies/execution-methodology.md`，选择并记录执行档位。
- 优先读取项目现有上下文、代码结构、测试命令和约定。
- 行为变更先按 `behavior-impact-standard.md` 检查同类入口、共享分流、消费者和合并后的最终行为。
- 运行验证按 `verification-environment-standard.md` 复用项目声明的 Gateway、runner 和真实资源锁；
  端口占用或心跳健康不能单独证明目标 app、worktree、构建、账号和数据匹配。
- 从 current impact scope 显式传项目相对任务路径；分别记录测试选择、catalog 健康和执行结果。
- 按行为风险加载 `docs/verification-packs/`，不机械扫描不相关清单。
- 保持改动聚焦，不做无关重构。
- 遵循目标仓库既有框架、组件、状态管理、样式和测试模式。
- 对关键状态、异常、权限、兼容和回滚路径给出处理或明确风险。
- 验证结果必须落到 `evidence/`、交付摘要或最终回复中。
- 交付前使用内置 `scripts/check-delivery.js` 对显式项目和 workspace 做只读评估；
  输出 `subject/readiness` 与逐 check 结论，不能用整体等级或质量评分覆盖缺测/过期项。
  工具不执行记录中的命令；环境身份与预期语义仍由 Agent 核对。

## 角色协作

默认由当前 Agent 顺序编排 `rolePlan` 中已激活角色，保证上下文连续。

当同时满足以下条件时，按工作流要求启动角色子 Agent 并由交付经理汇总：

- 当前工作流 frontmatter 或阶段表标注 `execution_mode: hybrid`。
- 阶段目标可以独立评估，例如产品范围评审、UI 走查、技术风险评审、测试策略评审。
- 任务复杂度较高，或用户明确要求专家团队并行评审。
- 输入已经冻结，且子 Agent 不会修改同一文件或依赖未决结论。

子 Agent 输出必须包含：

| 字段     | 要求                                           |
| -------- | ---------------------------------------------- |
| 结论     | 通过、修改后通过、不通过或需用户决策           |
| 证据     | 代码、文档、命令、截图、数据来源或人工验收依据 |
| 风险     | 影响、概率、严重级别、缓解动作和责任角色       |
| 置信度   | 高 / 中 / 低，并说明不确定来源                 |
| 需决策项 | 最多 3 个，需要用户或交付经理裁决的问题        |

交付经理必须输出统一结论和裁决依据，不得把互相冲突的原始意见直接交给用户。

实现代码默认由一个负责人修改。并行角色必须有独立问题边界、证据要求和文件所有权；发现冲突时停止并行并先裁决，不能用角色数量制造虚假的置信度。

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
- 角色激活计划和不适用依据。
- 已完成产出。
- 验证结果和证据索引。
- 执行档位、验证等级和结论边界。
- 当前 task/invocation、允许动作、行为影响面及增量审查 reviewed/inherited/gaps。
- 运行验证使用的脱敏环境 probe、目标实例/构建/账号/数据匹配结论和资源 owner。
- 适用质量维度及证据；数字评分若有则仅作辅助。
- 业务影响、收益观测和复盘计划。
- 决策日志、风险台账、角色交接状态。
- 未解决风险或明确无风险。
- 后续建议。

若没有产生某类内容，必须说明原因，例如“本任务不涉及 UI，该维度 N/A”或“当前无法运行验证，原因是缺少依赖环境”。

## 维护规则

- 新增角色时修改 `members/`，并更新 `members/README.md`。
- 新增工作流时修改 `workflows/`，并更新 `workflows/route-table.md`。
- 新增快捷指令时修改 `commands/team.md`。
- 新增外部 Skill 时修改 `external-skills/catalog.json`，并同步更新 `external-skills/role-map.md` 和相关成员文件。
- 新增或更新本地 CLI 能力时，修改 `external-cli/` 下对应能力卡；只记录能力摘要、适用角色、验证方式和安全边界，不记录密钥。
- 修改 Node 版本、安装方式、入口文件或必需打包文件时，同步更新 `skill-runtime.json`、`schemas/skill-runtime.schema.json` 和 README 安装说明。
- 修改面向用户的功能、安装方式或命令示例时，同步维护 `README.md` 与 `README_EN.md`。
- 新增方法论放入 `docs/methodologies/`。
- 角色适用场景变化时，同步更新 `docs/methodologies/role-activation-methodology.md`、成员文件、状态模板和状态 Schema。
- 新增研发硬约束放入 `docs/engineering-standards/`。
- 重要 Skill 规则变更按 `skill-evaluation-methodology.md` 先运行隐藏答案历史场景，再比较同风险真实任务的人工成本与逃逸回归。
- 修改结构或契约后运行 `npm test`。
- 修改 Node CLI 关键分支后运行 `npm run test:mutation`，总体检出率不得低于 85%，关键 mutant 必须零存活。
- 历史 workspace 审计使用 `npm run validate:workspaces`，不得重新并入核心 `validate:contracts` 发布门禁。
