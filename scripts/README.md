# Scripts

本目录维护 deterministic 校验与 CLI 脚本。所有 CLI 遵循
[`cli-quality-architecture.md`](../docs/engineering-standards/cli-quality-architecture.md)。
`safe-files.js` 为只读 CLI 统一提供相对路径、symlink、文件类型、大小和读取稳定性检查。

## init-task.js

安全初始化一个最小 v2.2 workspace 状态：

```bash
node scripts/init-task.js --root /absolute/project --slug short-task \
  --workflow requirement-end-to-end
```

- 支持 build、bugfix、code-review 和 technical-design 四类状态模板。
- 绑定日期目录、task/invocation ID、Skill identity、profile 和 complexity。
- 只创建 `workflow-status.json`；已有匹配状态幂等返回，冲突或无效状态失败关闭。
- `--dry-run` 和 `--json` 零写入。
- 未提供 `--authorization-ref` 时记录通用 `user-request`；Agent 工作流应传可追溯引用。

## audit-workspaces.js

递归盘点 workspace：

```bash
node scripts/audit-workspaces.js --root /absolute/project \
  --since 2026-08-04 --until 2026-11-04 --json
```

- 扫描主任务、`features/*` 和 `implementation` 子任务。
- 报告 present/missing/invalid 状态及主/子任务分项统计。
- 拒绝并报告 symlink 任务，不跟随到 workspace 外部。
- 发现缺失、无效或不安全条目退出 `1`；输入错误退出 `2`。
- 始终只读，只做库存和结构检查，不替代 `check-delivery`。

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
- `quality-rubrics.md` 适用质量维度与可选辅助评分。
- `business-impact-rubric.md` 业务价值实质门禁。
- `workflow-status.json` 的 `stages[]` 状态模型、阶段负责人、门禁、产物和证据字段。
- PRD 与交付摘要中的价值假设、指标基线、收益目标、成本收益比和证据索引。
- 完成态 workspace 阶段的 `artifacts` 和 `evidence` 不得为空；可解析为相对路径的产物和证据必须存在。
- `role-handoff.md` 的交接记录、背景、决策、风险、产物、验证和 Hybrid 子 Agent 汇总。
- `/team goal-design` 的工作流阶段、四类 JSON Schema、实例模板、迭代上限、里程碑/Task DAG、双向引用、人工审批和硬停止条件。
- `no-legacy-contract` 精确扫描旧入口、旧短名、旧本地路径和 URL 编码旧路径，并避免误伤当前合法名称 `ai-work-team`。
- `/team build` 必须输出 workspace、权威状态、代码实现、验证和风险结论；评分不参与准入。
- `/team install` 必须引用外部 Skills catalog、安装策略和角色映射。

目标驱动 workspace 完成 Architecture Design 后，契约校验还会检查 `goal-contract.json`、`milestones.json`、`tasks.json` 和 `autonomy-policy.json` 的跨文件一致性。

## check-delivery.js

新 build、bugfix、code-review 的 v2.2 状态在交付前使用只读检查（保留 2.0/2.1 判定）：

```bash
node scripts/check-delivery.js --project-root /absolute/project --workspace workspace/task --mode capture --json
node scripts/check-delivery.js --project-root /absolute/project --workspace workspace/task --mode assess --json
```

- `capture` 从状态中最后一个显式 snapshot manifest 读取文件并输出当前 SHA-256 快照、
  contract digest 与 impact scope digest；不写状态、不返回 ready。
- `assess` 校验契约、invocation 动作边界、行为影响面、增量审查覆盖、环境 probe、
  修复对照、逐 check 运行、输出摘要和当前文件快照。
- 退出码 `0`：capture 成功或当前 subject ready；`1`：不满足、不可评估或 legacy_unverified；`2`：非法参数或路径。
- 两种模式都不执行 `verificationRuns.execution.argv`、不访问 URL、不启动服务、不修改文件。
- 路径必须位于 project root/workspace 内且不是 symlink、非普通文件或敏感凭据路径。状态上限 256 KiB；被哈希文件上限 1 GiB。
- 环境 probe 只引用 workspace 内脱敏证据；工具不读取账号文件、Cookie、Token 或 Gateway 控制凭据。

`validate-contracts.js` 只审计归档结构和已声明结果的一致性；它不读取任意用户项目的当前源码。
完整规则见 [`delivery-controls.md`](../docs/delivery-controls.md)。

## record-evidence.js

2.2 使用 `--mode start|prepare|import|summary`。start 记录当前 invocation 的技能版本与入口 hash；
prepare 固定 selection/snapshot/before probe 绑定；import 从来源侧已脱敏 JSON 生成 run 并关联
baseline/check/selection；summary 只读派生 claim、逐项结果和 readiness。

写入须带 `--expected-state-digest`，JSON/dry-run 零写入；独占锁、状态 CAS、原子替换和
256 KiB 上限防止协作丢更新。工具不执行任何记录的命令，不自动批准 evidenceReview 或提升 claim。
参数与信封示例见 [证据自动入账](../docs/evidence-recording.md)。

内部 `delivery-inputs.js` 复用 safe-files 为采证/评估读取显式文件；`delivery-assurance.js`
维护 2.2 覆盖、方法、消费者和结果分层的纯判定。

## evaluate-skill.js

汇总已经记录的隐藏答案历史案例和真实任务试点：

```bash
node scripts/evaluate-skill.js --input <relative-evaluation-json> --json
```

- 输入符合 `schemas/skill-evaluation.schema.json`，基线与候选固定模型、工具和预算。
- 只读显式相对 JSON，不运行 Agent、不访问 oracle、不写结果。
- answer leakage、非法路径、symlink、重复参数和超限输入失败关闭。
- 输出 offline、pilot 和 adopt/hold/reject；关键错误、交付率回退不能被平均分抵消，
  delivered 样本不足或观察未成熟时保持 hold。

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
