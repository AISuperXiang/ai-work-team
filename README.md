# AI Work Team Skill

`ai-work-team` 是一个面向 Agent / IDE 的产品研发专家团队编排 Skill。它把一句自然语言需求或 `/team` 指令，推进成有 PRD、有技术方案、有实现计划、有验证证据、有风险记录、有交付摘要的可验收结果。

它的目标不是替代某一个研发角色，而是把产品、运营、UI、技术负责人、前端、后端、QA 和交付经理的协作流程固化下来，让 Agent 在承接复杂需求时少漏步骤、少跳门禁、少把关键决策留在对话里。

## 它解决什么问题

- 需求只有一句话，需要先收口目标用户、业务价值、范围边界和验收标准。
- 功能要从 PRD、UI/UX、技术方案、代码实现、测试验证一路推进到交付。
- 缺陷修复不能只改代码，还要说明根因、影响面、回归证据和剩余风险。
- 产品、UI、研发、QA 需要联合走查，形成统一的可交付结论。
- 项目需要生成 `AGENTS.md`，让后续 Agent 快速理解目录、技术栈、约束和验证命令。
- 团队需要登记可复用的外部 Skills 或本地 CLI 能力，并明确角色使用边界。

## 什么时候不该用

- 只问一个简单知识点。
- 只做一个明确的单文件小改动，且不需要产品/测试/交付流程。
- 需要真实调用飞书、Jira、Codebase 等外部系统。当前版本只在 `docs/integrations/` 保留集成契约，不直接调用这些系统。

## 最常用入口

```text
/team intake <需求>
/team review <需求/PRD>
/team design <需求>
/team build <需求>
/team buildContext <工作目录> [需求/范围]
/team bugfix <问题>
/team walk <实现/页面/改动>
/team deliver <上下文>
/team install [skill-id|role task]
/team register-cli <cli-id> --command "<cmd>" --roles "<roles>" --capabilities "<summary>"
/team status
```

常见用法：

```text
/team build 做一个会员续费页，支持优惠券和续费成功反馈
/team review 评审这份 PRD，重点看业务价值和验收标准
/team bugfix 修复订单提交失败，并补充回归验证
/team buildContext /path/to/repo 为后续需求建立 Agent 上下文
```

完整命令说明见 [`commands/team.md`](commands/team.md)。

## 典型交付流程

`/team build` 会按以下方式推进：

1. **Intake**：复述目标、成功标准、约束和信息缺口。
2. **Route**：选择端到端需求交付、需求评审、缺陷修复、走查等主工作流。
3. **Plan**：建立阶段、负责人、产出、门禁状态板。
4. **Workspace**：为需求创建独立交付目录。
5. **Execute**：按产品、运营、UI、研发、QA、交付经理角色逐阶段产出。
6. **Verify**：运行可用验证，无法验证时说明原因和替代检查。
7. **Score**：按业务影响、健壮性、测试可信度、交付完整度等维度评分。
8. **Deliver**：输出变更范围、业务价值、关键决策、验证证据、风险和后续建议。

## 交付物长什么样

每个新需求默认在 `workspace/` 下创建一个独立目录：

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

代码改动仍发生在用户项目仓库；`workspace/` 只保存过程产物、业务价值判断、关键决策、风险台账、角色交接、验证证据和交付摘要。

只有用户明确说“在某需求下增加某功能”“追加到某需求”时，才复用已有需求目录并写入 `features/` 子目录。

## 质量门禁

`ai-work-team` 把“是否可交付”拆成可检查门禁：

- `value-gate`：PRD 必须说明目标用户、价值假设、指标基线、收益目标、成本收益比、观测方式和复盘计划。
- `decision-gate`：关键范围、优先级、技术取舍、上线风险和延期项必须写入 `decision-log.md`。
- `handoff-gate`：角色切换必须写入 `role-handoff.md`，不能只在对话里口头交接。
- `complexity-gate`：需求必须按 `S / M / L / XL` 分级；`L / XL` 必须拆里程碑、技术 spike、QA 策略、灰度、回滚和收益复盘。
- `evidence-gate`：所有“已完成”“已验证”“可交付”“收益可观测”的结论必须有命令、截图、日志、数据来源或人工验收记录。
- `no-legacy-contract`：主文档、模板、脚本和新 workspace 文档不得出现旧入口、旧短名或旧路径。

涉及实现交付时，还会按 [`docs/quality-rubrics.md`](docs/quality-rubrics.md) 评分；业务影响最低要求为 `>= 4`。

## 安装与运行

运行要求：

- Node.js `>=18`
- `npm`
- 核心流程不依赖环境变量
- 安装后在 Skill 根目录运行 `npm test`

本地目录安装示例：

```bash
SKILLS_DIR="/path/to/skills"
SOURCE_DIR="/path/to/ai-work-team"
mkdir -p "$SKILLS_DIR"
cp -R "$SOURCE_DIR" "$SKILLS_DIR/ai-work-team"
cd "$SKILLS_DIR/ai-work-team"
npm test
```

Git 仓库安装示例：

仓库地址：

```text
https://github.com/AISuperXiang/ai-work-team
https://github.com/AISuperXiang/ai-work-team.git
```

```bash
SKILLS_DIR="/path/to/skills"
REPO_URL="https://github.com/AISuperXiang/ai-work-team.git"
mkdir -p "$SKILLS_DIR"
git clone "$REPO_URL" "$SKILLS_DIR/ai-work-team"
cd "$SKILLS_DIR/ai-work-team"
npm test
```

Skills 市场安装示例：

```bash
npx skills add AISuperXiang/ai-work-team@ai-work-team -g -y
```

如果 Skills 市场使用独立包名，以市场展示的正式包名为准。

## IDE / Agent 接入

- Trae：把 `ai-work-team` 放到 Trae 可扫描的 Skills 目录，重载 Skills 后通过 `/team` 或自然语言触发。
- Codex / Claude / 通用 Agent：确保 Agent 能读取 `SKILL.md` 和 `skill-runtime.json`，并优先按 `skill-runtime.json.agentHints.readOrder` 加载上下文。
- 离线环境：复制本仓库即可运行核心流程；`/team install` 安装外部 Skills 时仍需要网络和用户授权。

## 目录结构

```text
ai-work-team/
├── SKILL.md
├── README.md
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

关键目录：

- `members/`：产品、运营、UI、研发、QA、交付经理等角色说明。
- `workflows/`：需求评审、端到端交付、缺陷修复、走查、外部 Skill 安装等工作流。
- `commands/`：`/team` 快捷指令和自然语言路由规则。
- `docs/`：方法论、工程标准、质量门禁、评分规则和外部系统契约。
- `assets/templates/`：PRD、技术方案、测试计划、决策日志、风险台账、交付摘要等模板。
- `workspace/`：每个需求的过程产物和交付证据。
- `scripts/`：结构校验、契约校验、项目上下文构建、外部 Skill 安装辅助脚本。

## 外部 Skills 与本地 CLI

`external-skills/` 维护可推荐或安装的外部优质 Skills：

- `catalog.json`：Skill 清单。
- `role-map.md`：角色与能力映射。
- `install-policy.md`：安装、安全、候选和冲突处理规则。

常用命令：

```bash
node scripts/list-external-skills.js --role frontend-engineer
node scripts/install-external-skills.js --dry-run
node scripts/install-external-skills.js web-design-guidelines --dry-run
```

`external-cli/` 用于登记用户本地已接入的 CLI 能力。它只记录能力摘要、适用角色、验证方式和安全边界，不内置、不安装、不分发第三方 CLI。

```text
/team register-cli github-cli \
  --command "gh" \
  --roles "tech-lead,frontend-engineer,delivery-manager" \
  --capabilities "查询和管理 GitHub issue、PR、review、release" \
  --when "需要查看 PR 状态、创建 issue、读取 review 反馈或整理 release 说明" \
  --verify "gh --version"
```

## 文档职责

- `README.md` 面向用户：说明这个 Skill 是什么、解决什么问题、如何安装和触发。
- `SKILL.md` 面向 Agent：定义触发条件、路由、最小加载顺序、执行协议、角色协作和硬约束。
- `skill-runtime.json` 面向安装器和通用 Agent：提供机器可读的入口、运行环境、安装方式和发布安全策略。

## 维护与验证

常见维护入口：

- 新增成员：修改 `members/`，同步更新 [`members/README.md`](members/README.md)。
- 新增工作流：修改 `workflows/`，同步更新 [`workflows/route-table.md`](workflows/route-table.md) 和 [`commands/team.md`](commands/team.md)。
- 新增快捷指令：修改 [`commands/team.md`](commands/team.md)。
- 新增外部 Skill：修改 `external-skills/catalog.json`、`external-skills/role-map.md` 和必要的成员说明。
- 新增本地 CLI 能力：通过 `/team register-cli` 创建或更新 `external-cli/<cli-id>.md`。
- 修改运行环境、入口文件或安装方式：同步更新 `skill-runtime.json`、`schemas/skill-runtime.schema.json` 和本文档。

结构或契约变化后运行：

```bash
npm test
```

也可以分别运行：

```bash
npm run validate:structure
npm run validate:contracts
```

## 发布说明

`ai-work-team` 会在代码审查、安全审查、运行时调试、数据库分析、前端设计、测试生成、产品规划和项目分诊等场景中复用当前 IDE / Agent 可用能力。

为避免公开发布时泄露本机已下载的公司或私有 Skill 名称，`README.md` 和 `skill-runtime.json` 只声明能力域，不记录环境特定的本地 Skill 清单。
