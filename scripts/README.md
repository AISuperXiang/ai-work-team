# Scripts

本目录维护 deterministic 校验与 CLI 脚本。所有 CLI 遵循
[`cli-quality-architecture.md`](../docs/engineering-standards/cli-quality-architecture.md)。

## validate-structure.js

运行：

```bash
node scripts/validate-structure.js
```

或：

```bash
npm test
```

脚本检查：

- 根文件和必需目录是否存在。
- `skill-runtime.json` 是否存在、可解析，并与 `package.json` 的版本和 Node 运行时约束一致。
- `skill-runtime.json` 是否声明本地 Skill 名称脱敏策略，且没有使用 `referencedLocalSkills` 记录环境特定 Skill 名。
- `SKILL.md` 是否包含合法 frontmatter、`name` 和 `description`。
- 成员、工作流、命令文件是否包含 frontmatter。
- 工作流和命令中引用的 `workflows/*.md` 是否存在。
- 工作流中声明的成员是否存在。
- 必需 schema 和模板是否存在，包括 `schemas/skill-runtime.schema.json` 以及 goal contract、milestone、task、autonomy policy 四类目标设计 Schema。
- `external-skills/catalog.json` 是否可解析，Skill 包名、质量等级和角色引用是否有效。

## validate-contracts.js

运行：

```bash
node scripts/validate-contracts.js
```

默认命令只检查可发布核心契约。workspace 审计必须显式执行：

```bash
node scripts/validate-contracts.js --workspace workspace/<requirement-folder>
npm run validate:workspaces
```

脚本检查代码落地契约是否仍被关键文件引用，并按所选模式对模板或 workspace 做结构化校验，包括：

- `workspace/` 一需求一目录规则。
- `implementation-protocol.md` 强制代码落地闭环。
- `quality-rubrics.md` 质量评分。
- `business-impact-rubric.md` 业务影响最低线。
- `workflow-status.json` 的 `stages[]` 状态模型、阶段负责人、门禁、产物和证据字段。
- PRD 与交付摘要中的价值假设、指标基线、收益目标、成本收益比、证据索引和质量评分表格结构。
- 完成态 workspace 阶段的 `artifacts` 和 `evidence` 不得为空；可解析为相对路径的产物和证据必须存在。
- `role-handoff.md` 的交接记录、背景、决策、风险、产物、验证和 Hybrid 子 Agent 汇总。
- `/team goal-design` 的工作流阶段、四类 JSON Schema、实例模板、迭代上限、里程碑/Task DAG、双向引用、人工审批和硬停止条件。
- `no-legacy-contract` 精确扫描旧入口、旧短名、旧本地路径和 URL 编码旧路径，并避免误伤当前合法名称 `ai-work-team`。
- `/team build` 必须输出 workspace、代码实现、验证和质量评分。
- `/team install` 必须引用外部 Skills catalog、安装策略和角色映射。

目标驱动 workspace 完成 Architecture Design 后，契约校验还会检查 `goal-contract.json`、`milestones.json`、`tasks.json` 和 `autonomy-policy.json` 的跨文件一致性。

## list-external-skills.js

运行：

```bash
node scripts/list-external-skills.js
node scripts/list-external-skills.js --role frontend-engineer
node scripts/list-external-skills.js --role frontend-engineer --task "React 页面性能"
node scripts/list-external-skills.js frontend-engineer "React 页面性能"
node scripts/list-external-skills.js --query "高质量前端页面设计"
node scripts/list-external-skills.js --quality recommended
node scripts/list-external-skills.js --skill frontend-design
```

脚本用于查看当前 catalog 中已收录的外部 Skill。传入 task/query 时，脚本会基于 `keywords`、`scenarios`、`useWhen`、`trustScore` 和角色进行打分匹配，并输出本地同能力 Skill 的优先级和更新建议。

未知参数、缺值、重复参数、非法 `quality` 或非法 `top` 会退出 `2`。

## install-external-skills.js

运行：

```bash
node scripts/install-external-skills.js --dry-run
node scripts/install-external-skills.js
node scripts/install-external-skills.js frontend-design --dry-run
node scripts/install-external-skills.js frontend-engineer "React 页面性能" --dry-run
node scripts/install-external-skills.js frontend-design
node scripts/install-external-skills.js frontend-design --force-external
```

脚本只允许安装 `external-skills/catalog.json` 中的条目。无参数时进入 catalog 批量安装模式，处理所有 `recommended` 条目，语义等同根据项目配置安装内置 external skills；`candidate` 条目默认拒绝安装，除非显式传入 `--allow-candidate`。若检测到本地已有同能力 Skill，默认跳过外部安装，并用固定结构提示用户自行执行更新检查；确需安装外部版本时使用 `--force-external`。

未知参数、缺值和冲突参数会在启动任何子进程前退出 `2`。`--force-external` 或 `--allow-candidate` 没有 selector 时必须显式使用 `--all`，防止错误参数退化为批量安装。

## build-context.js

运行：

```bash
node scripts/build-context.js <workdir> --request "为后续 /team build 建立上下文"
node scripts/build-context.js <workdir> --dry-run
node scripts/build-context.js <workdir> --json
```

脚本用于静态扫描代码仓库或工作区，并创建/更新目标目录的 `AGENTS.md`。如果目标目录已有 `AGENTS.md`，脚本只维护 `<!-- ai-work-team:buildContext:start -->` 到 `<!-- ai-work-team:buildContext:end -->` 之间的内容。

输出路径必须是 workdir 内的普通相对文件。脚本拒绝绝对路径、`..`、symlink 和超过 256 KiB 的现有受管文件；`--dry-run` 与 `--json` 不写文件。

扫描内容包括：

- 包管理器、配置文件和 scripts。
- `pnpm-workspace.yaml` 和 `package.json workspaces`。
- monorepo 子包列表和按 package 聚合的技术栈矩阵。
- 前端框架、状态管理、UI 组件库和样式方案。
- 后端框架、服务目录和语言配置。
- 测试框架、测试文件和验证命令。
- 角色索引和后续 `/team build` 使用约束。

## 行为测试与突变

```bash
npm run test:behavior
npm run test:mutation
```

- 行为测试使用 `node:test`、临时目录和 fake `npx`。
- fake `npx` 只记录 argv 和模拟退出码，不访问网络或真实全局环境。
- 突变门禁要求总体检出率不低于 85%，关键 mutant 零存活。
- `npm test` 串联结构、核心契约和行为测试；CI 在 Node 18/20/22 上分别执行。
