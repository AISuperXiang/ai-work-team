# AI Work Team

**语言：简体中文 | [English](./README_EN.md)**

> 面向 Agent / IDE 的产品研发专家团队编排 Skill：把一句自然语言需求或 `/team` 指令，推进为有方案、有实现、有验证证据、可走查、可交付的结果。

## 项目简介

`ai-work-team` 将产品、运营、UI、技术负责人、前端、后端、QA 和交付经理的协作流程固化为可执行工作流。它不替代某个研发角色，而是负责：

- 先识别任务类型，再选择匹配的交付工作流。
- 按风险和任务范围激活必要角色，避免全角色无差别参与。
- 将关键决策、风险、交接和验证证据写入可追溯文档。
- 限制结论不超过实际验证等级，避免把静态检查表述为运行时通过。
- 为需求实现、缺陷修复、代码审查和走查提供统一的完成定义。

## 目录

- [适用场景](#适用场景)
- [核心能力](#核心能力)
- [快速开始](#快速开始)
- [使用方式](#使用方式)
- [工作机制](#工作机制)
- [团队角色](#团队角色)
- [交付物](#交付物)
- [质量与验证](#质量与验证)
- [IDE / Agent 接入](#ide--agent-接入)
- [目录结构](#目录结构)
- [扩展能力](#扩展能力)
- [维护与验证](#维护与验证)

## 适用场景

以下任务适合使用 `ai-work-team`：

- 一句话需求需要补齐目标用户、业务价值、范围边界和验收标准。
- 功能需要从 PRD、UI/UX、技术方案、实现、测试一路推进到交付。
- 缺陷修复需要说明复现过程、根因、影响面、回归证据和剩余风险。
- 代码审查需要区分行为缺陷、工程风险和风格偏好，并推动可验证修复。
- 产品、UI 和 QA 需要联合走查，形成统一的验收结论。
- 项目需要生成 `AGENTS.md`，帮助后续 Agent 理解技术栈、目录约束和验证命令。
- 团队需要登记可复用的外部 Skills 或本地 CLI，并明确角色使用边界。

以下场景通常不需要使用：

- 只回答一个简单知识点。
- 只做明确、低风险的单文件小改动，且不需要产品、测试或交付流程。
- 需要直接操作飞书、Jira、Codebase 等外部系统。当前版本只在 [`docs/integrations/`](./docs/integrations/) 中维护集成契约，不直接调用这些系统。

## 核心能力

| 能力 | 解决的问题 | 主要产出 |
| --- | --- | --- |
| 需求收口与评审 | 目标、价值、范围或验收标准不清 | 需求简报、PRD、决策记录 |
| 技术与 UI 设计 | 跨端方案、交互或风险需要评审 | UI 评审、技术方案、实现计划 |
| 端到端实现交付 | 需求需要从设计推进到代码和验证 | 代码改动、测试计划、交付摘要 |
| 缺陷修复 | 问题需要先复现，再定位、修复和回归 | 缺陷分析、回归证据、风险记录 |
| 代码审查与优化 | 需要定位缺陷、风险和缺失测试 | 分级发现、修复建议、验证结论 |
| 产品 / UI / QA 走查 | 多角色需要形成统一验收结论 | 走查报告、阻塞项、交付结论 |
| 项目上下文构建 | Agent 缺少项目结构和约束 | `AGENTS.md` |
| 能力扩展 | 团队需要外部 Skill 或本地 CLI | 能力目录、角色映射、安全边界 |

## 快速开始

### 运行要求

- Node.js `>=18`
- `npm`
- 核心流程不依赖环境变量

### 通过 Skills 市场安装

```bash
npx skills add AISuperXiang/ai-work-team@ai-work-team -g -y
```

如果 Skills 市场展示了不同的正式包名，以市场页面为准。

### 通过 Git 安装

```bash
SKILLS_DIR="${SKILLS_DIR:?set SKILLS_DIR to your skills directory}"
REPO_URL="https://github.com/AISuperXiang/ai-work-team.git"

mkdir -p "$SKILLS_DIR"
git clone "$REPO_URL" "$SKILLS_DIR/ai-work-team"
cd "$SKILLS_DIR/ai-work-team"
npm test
```

仓库地址：<https://github.com/AISuperXiang/ai-work-team>

### 通过本地目录安装

```bash
SKILLS_DIR="${SKILLS_DIR:?set SKILLS_DIR to your skills directory}"
SOURCE_DIR="${SOURCE_DIR:?set SOURCE_DIR to the ai-work-team source directory}"

mkdir -p "$SKILLS_DIR"
cp -R "$SOURCE_DIR" "$SKILLS_DIR/ai-work-team"
cd "$SKILLS_DIR/ai-work-team"
npm test
```

## 使用方式

安装后，可以直接输入自然语言需求，也可以使用 `/team` 指令。

| 指令 | 用途 |
| --- | --- |
| `/team intake <需求>` | 梳理目标、价值、范围、约束和信息缺口 |
| `/team review <需求/PRD>` | 评审需求完整性、业务价值和验收标准 |
| `/team design <需求>` | 设计或评审 UI、技术方案与实现边界 |
| `/team build <需求>` | 从需求到实现、验证和交付完整推进 |
| `/team buildContext <工作目录> [需求/范围]` | 扫描项目并生成或更新 `AGENTS.md` |
| `/team bugfix <问题>` | 按复现、根因、修复、回归流程处理缺陷 |
| `/team code-review <路径\|diff\|提交\|PR>` | 审查代码并输出分级发现和验证建议 |
| `/team walk <实现/页面/改动>` | 组织产品、UI、QA 联合走查 |
| `/team deliver <上下文>` | 汇总交付范围、证据、风险和后续事项 |
| `/team install [skill-id\|role task]` | 推荐或安装登记在目录中的外部 Skill |
| `/team register-cli <cli-id> ...` | 登记本地 CLI 的能力和安全边界 |
| `/team status` | 查看当前工作流状态 |

常见示例：

```text
/team build 做一个会员续费页，支持优惠券和续费成功反馈
/team review 评审这份 PRD，重点看业务价值和验收标准
/team bugfix 修复订单提交失败，并补充回归验证
/team code-review 审查当前 diff，重点检查状态竞争和回归风险
/team buildContext <project-root> 为后续需求建立 Agent 上下文
```

完整指令说明见 [`commands/team.md`](./commands/team.md)。

## 工作机制

一次标准执行遵循以下流程：

```text
Intake
  -> Route
  -> Profile
  -> Activate Roles
  -> Plan
  -> Workspace
  -> Execute
  -> Verify
  -> Score
  -> Deliver
```

1. **Intake**：确认目标、成功标准、约束和信息缺口。
2. **Route**：选择需求评审、端到端交付、缺陷修复、代码审查或走查等主工作流。
3. **Profile**：按风险、未知度和影响范围选择执行档位。
4. **Activate Roles**：形成 `rolePlan`，只加载实际参与或需要咨询的角色。
5. **Plan**：建立阶段、负责人、产出和门禁状态板。
6. **Workspace**：为需要留存证据的任务创建独立交付目录。
7. **Execute**：由已激活角色完成文档、设计、代码或评审产出。
8. **Verify**：运行可用验证并记录 `V0-V4` 验证等级。
9. **Score**：按业务影响、健壮性、测试可信度和交付完整度评分。
10. **Deliver**：汇总范围、决策、证据、风险和后续建议。

关键原则：

- **工作流优先**：先判断任务类型，再加载必要上下文。
- **角色按需激活**：每个角色标记为 `active`、`consulted` 或 `not_applicable`。
- **证据驱动结论**：没有命令、日志、截图、数据或人工验收记录，就不声明“已验证”。
- **决策必须落盘**：关键范围、取舍、风险和延期项不能只保留在对话中。

## 团队角色

| 角色 | 主要职责 |
| --- | --- |
| 产品经理 | 用户目标、需求范围、业务价值和验收标准 |
| 运营经理 | 指标、实验、发布节奏、用户触达和收益观测 |
| UI 设计师 | 信息架构、交互、视觉一致性、响应式和可访问性 |
| 技术负责人 | 架构、技术取舍、跨模块风险、迁移和回滚 |
| 前端工程师 | 页面、组件、客户端状态、浏览器行为和前端构建 |
| 后端工程师 | API、服务、任务、数据库、权限和数据一致性 |
| QA 工程师 | 测试策略、风险覆盖、回归范围和验证证据 |
| 交付经理 | 工作流编排、门禁、角色交接、风险和最终交付 |

角色是候选池，不是固定出席名单。没有界面变化时 UI 可以不参与；没有服务端影响时后端可以不参与；所有不适用判断都必须记录依据。

## 交付物

每个新需求默认在 `workspace/` 下建立独立目录：

```text
workspace/
└── YYYYMMDD-short-requirement-slug/
    ├── README.md
    ├── requirement-brief.md
    ├── prd.md
    ├── decision-log.md
    ├── risk-register.md
    ├── role-handoff.md
    ├── workflow-status.json
    ├── ui-review.md
    ├── technical-design.md
    ├── implementation-plan.md
    ├── test-plan.md
    ├── walkthrough-report.md
    ├── delivery-summary.md
    └── evidence/
        └── README.md
```

代码改动仍发生在用户项目仓库中。`workspace/` 只保存过程文档、关键决策、角色交接、风险、验证证据和交付摘要。

只有用户明确要求“在某需求下增加功能”或“追加到某需求”时，才复用已有需求目录并写入 `features/`。

## 质量与验证

### 执行档位

| 档位 | 适用范围 | 要求 |
| --- | --- | --- |
| `lightweight` | 低风险、范围明确的局部任务 | 保留最小但完整的决策、改动和验证证据 |
| `standard` | 多模块或存在一定不确定性的任务 | 使用核心工作流产物并完成角色交接 |
| `assurance` | 高风险、`L/XL`、权限、数据或高回滚成本任务 | 增加独立风险评审、灰度、回滚和运行时验证 |

档位由风险、未知度和影响范围决定，不由任务紧急程度决定。

### 验证等级

| 等级 | 证据范围 | 允许的结论 |
| --- | --- | --- |
| `V0` | 未验证或仅推理 | 只能描述设计、假设或待验证结论 |
| `V1` | 格式、lint、typecheck、静态审查 | 可以声明静态检查通过 |
| `V2` | 单元测试、集成测试或可重复脚本 | 可以声明受测行为通过，并说明未覆盖范围 |
| `V3` | 运行时、浏览器或端到端关键路径 | 可以声明核心路径已验证，并保留环境差异风险 |
| `V4` | 生产灰度、真实验收或上线观测 | 可以声明交付或收益已验证，并附数据来源和时间 |

### 关键门禁

- `value-gate`：PRD 说明目标用户、价值假设、指标基线、收益目标和观测计划。
- `decision-gate`：关键范围、优先级、技术取舍、上线风险和延期项已记录。
- `handoff-gate`：角色切换有明确输入、输出、风险和接收结论。
- `complexity-gate`：需求完成 `S/M/L/XL` 分级，`L/XL` 有里程碑、灰度和回滚计划。
- `evidence-gate`：所有完成或验证结论都有可追溯证据。
- `reproduction-gate`：缺陷修复先复现，或记录可执行的采证计划。
- `review-gate`：代码审查包含范围、位置、反例、严重度和验证建议。
- `verification-gate`：交付结论不超过当前验证等级。
- `role-activation-gate`：所有角色都有参与、咨询或不适用依据。
- `no-legacy-contract`：主文档、模板和脚本不包含废弃入口、短名或路径。

详细规则见 [`docs/quality-gates.md`](./docs/quality-gates.md) 和 [`docs/quality-rubrics.md`](./docs/quality-rubrics.md)。

## IDE / Agent 接入

- **Trae**：将 `ai-work-team` 放入 Trae 可扫描的 Skills 目录，重载 Skills 后通过 `/team` 或自然语言触发。
- **Codex / Claude / 通用 Agent**：确保 Agent 可以读取 `SKILL.md` 和 `skill-runtime.json`，并优先按 `skill-runtime.json.agentHints.readOrder` 加载上下文。
- **离线环境**：复制本仓库即可运行核心流程；通过 `/team install` 安装外部 Skills 时仍需要网络和用户授权。

## 目录结构

```text
ai-work-team/
├── SKILL.md
├── README.md
├── README_EN.md
├── package.json
├── skill-runtime.json
├── members/
├── workflows/
├── commands/
├── external-skills/
├── external-cli/
├── docs/
├── schemas/
├── assets/
│   └── templates/
├── workspace/
└── scripts/
```

| 目录 | 职责 |
| --- | --- |
| `members/` | 产品、运营、UI、研发、QA、交付经理等角色定义 |
| `workflows/` | 需求评审、交付、缺陷修复、代码审查和走查流程 |
| `commands/` | `/team` 指令和自然语言路由规则 |
| `docs/` | 方法论、工程标准、质量门禁、评分规则和集成契约 |
| `assets/templates/` | PRD、技术方案、测试计划、风险和交付模板 |
| `workspace/` | 每个需求的过程产物和证据索引 |
| `scripts/` | 结构校验、契约校验、上下文构建和 Skill 安装脚本 |

## 扩展能力

### 外部 Skills

`external-skills/` 维护允许推荐或安装的外部 Skills：

- `catalog.json`：Skill 清单和可信度信息。
- `role-map.md`：角色与能力映射。
- `install-policy.md`：安装、安全、候选和冲突处理规则。

```bash
node scripts/list-external-skills.js --role frontend-engineer
node scripts/install-external-skills.js --dry-run
node scripts/install-external-skills.js web-design-guidelines --dry-run
```

未经用户明确授权，不安装外部 Skill。

### 本地 CLI

`external-cli/` 用于登记用户环境中已有的 CLI 能力。能力卡只记录用途、适用角色、验证方式和安全边界，不内置、不安装、不分发第三方 CLI，也不保存密钥。

```text
/team register-cli github-cli \
  --command "gh" \
  --roles "tech-lead,frontend-engineer,delivery-manager" \
  --capabilities "查询和管理 GitHub issue、PR、review、release" \
  --when "需要查看 PR 状态、创建 issue、读取 review 反馈或整理 release 说明" \
  --verify "gh --version"
```

## 维护与验证

常见维护入口：

- 新增角色：修改 `members/`，同步更新 [`members/README.md`](./members/README.md)。
- 新增工作流：修改 `workflows/`，同步更新 [`workflows/route-table.md`](./workflows/route-table.md) 和 [`commands/team.md`](./commands/team.md)。
- 新增快捷指令：修改 [`commands/team.md`](./commands/team.md)。
- 新增外部 Skill：修改 `external-skills/catalog.json`、`external-skills/role-map.md` 和相关角色文件。
- 新增本地 CLI：通过 `/team register-cli` 创建或更新 `external-cli/<cli-id>.md`。
- 修改运行环境、入口或安装方式：同步更新 `skill-runtime.json`、Schema 和双语 README。

结构或契约变化后运行：

```bash
npm test
```

也可以分别运行：

```bash
npm run validate:structure
npm run validate:contracts
```

## 文档职责

- [`README.md`](./README.md)：默认中文用户文档。
- [`README_EN.md`](./README_EN.md)：英文用户文档。
- [`SKILL.md`](./SKILL.md)：Agent 执行入口，定义触发、路由、加载顺序和硬约束。
- [`skill-runtime.json`](./skill-runtime.json)：面向安装器和通用 Agent 的机器可读运行时声明。

## 发布与隐私

`ai-work-team` 可以复用当前 IDE / Agent 已具备的代码审查、安全审查、运行时调试、数据库分析、前端设计、测试生成、产品规划和项目分诊能力。

公开发布文档和运行时声明只描述能力域，不记录本机已下载的公司、私有或环境特定 Skill 清单，也不保存密钥、Cookie、Token 等敏感信息。
