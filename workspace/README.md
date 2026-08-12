# Workspace

`workspace/` 是 `ai-work-team` 承接需求后的运行交付区。每一个功能需求默认对应一个独立交付文件夹，除非用户明确指定“在某某需求下增加某某功能”，才复用已有需求文件夹并在其中追加子功能记录。

## 目录规则

默认新需求目录：

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

在已有需求下追加功能：

```text
workspace/
└── existing-requirement/
    └── features/
        └── YYYYMMDD-short-feature-slug/
            ├── README.md
            ├── implementation-plan.md
            ├── test-plan.md
            └── delivery-summary.md
```

目标驱动技术方案还会增加：

```text
workspace/
└── YYYYMMDD-short-goal-slug/
    ├── goal-contract.json
    ├── milestones.json
    ├── tasks.json
    ├── autonomy-policy.json
    ├── technical-design-review.md
    └── design-decision-summary.md
```

## 命名约定

- `YYYYMMDD` 使用当天日期。
- `short-requirement-slug` 使用英文小写、数字和短横线。
- 不使用空格、中文标点或特殊符号。
- 如果用户指定需求名称，优先使用用户指定名称的安全 slug。

## 交付约束

- `/team build` 必须先创建或选择一个 workspace 需求目录，再推进 PRD、方案、实现、测试和交付。
- `/team goal-design` 必须创建独立 workspace，完成 PRD、条件式 UI 评审、四类自治契约、技术方案、跨角色评审和用户决策交接；不得在该工作流内修改目标项目代码。
- 每个阶段产物必须落到该需求目录，不能只留在对话里。
- 代码改动仍发生在用户项目仓库；workspace 只保存过程产物、价值判断、决策、风险、交接、验证证据和交付摘要。
- PRD 必须记录价值假设、指标基线、收益目标、成本收益比和上线后观测计划。
- `decision-log.md` 必须记录关键范围、技术取舍、上线风险和延期项。
- `risk-register.md` 必须记录复杂度分级、风险台账；`L / XL` 项目必须记录里程碑、技术 spike、QA 策略、灰度、回滚和收益复盘。
- `role-handoff.md` 必须记录阶段交接的背景、决策、待确认问题、风险、产物和验证。
- `workflow-status.json` 必须记录阶段状态、负责人、门禁、产物路径、证据路径和 `rolePlan`。
- `workflow-status.json` 还必须记录 `executionProfile`（`lightweight` / `standard` / `assurance`）和 `verificationLevel`（`V0-V4`）；交付结论不得超过验证等级，未参与角色必须有不适用依据。
- `evidence/` 用于保存验证命令、截图说明、日志摘要或人工验证记录，不保存密钥、Cookie、Token 或敏感数据。
- `goal-contract.json`、`milestones.json`、`tasks.json`、`autonomy-policy.json` 必须使用对应 Schema，且计划轮数、最大轮数、预算、审批、停止和重规划规则一致。
- 主文档、模板和新 workspace 文档不得出现旧快捷入口、旧项目短名或旧本地路径。

## 复用规则

只有当用户明确说“在某某需求下增加某某功能”“追加到某某需求”“沿用某某需求上下文”时，才复用已有需求目录。否则每个新需求必须新建独立目录，避免不同交付上下文混杂。
