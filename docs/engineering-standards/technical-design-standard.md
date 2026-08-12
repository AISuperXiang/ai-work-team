# Technical Design Standard

技术方案必须包含：

- 背景和目标。
- 当前系统现状。
- 已确认事实、待验证假设和证据来源。
- 方案概述。
- 变更范围。
- 接口和数据契约。
- 角色责任边界和文件所有权。
- 权限、安全和异常处理。
- 兼容性和迁移。
- 测试策略。
- 发布、灰度、回滚。
- 风险和开放问题。

## 目标驱动技术方案

使用 `/team goal-design` 时，技术方案还必须包含：

- 需求分析：PRD、需求评审、UI 评审或 N/A 依据、核心验收标准。
- 技术核心模块：职责、边界、接口、数据、权限、失败与降级。
- 复杂逻辑：状态转换、依赖、并发、幂等、重试、观测和回滚。
- 方案对比：保留现状、最小变更和新增抽象的收益、成本、风险、兼容与验证成本。
- 迭代节奏与路径：纵向里程碑、Task DAG、关键路径、计划轮数、最大轮数、每轮退出、停止和重规划条件。
- 四类契约：`goal-contract`、`milestone`、`task`、`autonomy-policy` 的 Schema 引用和目标实例。
- 评审处置：产品、UI、技术、研发和 QA 意见的证据、严重度、处置与复核。
- 用户决策：方案结论、结论边界、最多 3 个待裁决项，以及批准后进入 `/team build` 的冻结输入。

对应 Schema：

- `schemas/goal-contract.schema.json`
- `schemas/milestone.schema.json`
- `schemas/task.schema.json`
- `schemas/autonomy-policy.schema.json`

## 约束

- 方案必须基于实际代码或系统事实。
- 必须引用 `rolePlan`，明确前端、后端、QA、UI 或产品为何参与或不适用。
- 不为单次需求引入不必要抽象。
- 每个关键决策都说明取舍原因。
- 风险不能只写“需注意”，必须写影响和缓解。

## 输出格式

- 已有需求或方案的常规评审使用 `assets/templates/technical-design.md`。
- 从目标生成 PRD、自治契约和评审后方案时使用 `assets/templates/goal-driven-technical-design.md`。
