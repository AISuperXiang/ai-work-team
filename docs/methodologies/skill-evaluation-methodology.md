# Skill Evaluation Methodology

## 目标

先验证候选 Skill 是否减少错误动作，再比较同风险真实任务的净人工成本与逃逸回归。测试数量、CR 轮数、文档数量和自评分都不能单独证明提效。

## 两层评估

### 历史场景

1. 从真实案例冻结当时可见输入、允许动作、风险等级、工具 fixture 和隐藏判据。
2. 审计结论、后续修复和 oracle 不能进入被测 Agent 上下文；发现 answer leakage 时该 case 作废。
3. 无法恢复原代码或原 Skill 时标记 reconstructed，只比较当前基线版与候选版，不声称重现历史表现。
4. 开发集可用于调规则；最终判断使用未参与调优的 holdout 正负变体。
5. 基线与候选使用相同模型、工具权限、预算和 fixture，在独立会话运行。

正负变体必须同时存在。例如：既有“误报应撤回”，也有“真实回退应阻断”；既有“已修反馈保持关闭”，也有“修复回退重新打开原 finding”。

### 真实任务试点

- 按事先评定的风险、规模、领域和环境可用性分组，交替分配 baseline / candidate。
- 一个评估单位是目标冻结的任务尝试，不是消息轮数、文件数或提交数。
- blocked、abandoned、回滚和关键 NOT_RUN 都进入分母。
- 每个风险组、每个 arm 必须达到 `minimumPilotTasksPerArm` 个 delivered 样本；
  blocked/abandoned 不得充当已交付样本，候选交付率也不得低于基线。
- 人工活跃、工具执行、环境等待分别记录；并行运行同时报告 wall-clock 和累计工具时间。
- 逃逸回归只统计 same_goal，并区分漏检、修复诱发、错误预期和证据失效。需求/依赖变化、合并工作和历史待修单列。
- 观察窗口在看结果前冻结。未发布、零暴露或窗口未结束为 pending/not_exposed，不能记零逃逸。

## 决策

评估输入使用 `schemas/skill-evaluation.schema.json`，可执行：

```bash
node scripts/evaluate-skill.js --input <relative-evaluation-json> --json
```

评估器只读，不运行 Agent、不访问 oracle、不修改输入。它输出：

- `offline`: passed / failed / inconclusive。
- `pilot`: passed / quality_regressed / no_efficiency_gain / inconclusive。
- `decision`: adopt / hold / reject。

任一候选关键错误直接失败，不得被平均分抵消。只有 holdout 通过、真实任务观察成熟、质量不退化且人工时间达到预设改善目标时才 adopt。数据不足为 hold，不填未经实测的百分比。

## 数据边界

- 保存 Skill/model/tool/case 版本、脱敏指标和证据引用。
- 不保存账号、Cookie、Token、原始私密对话或无关业务数据。
- oracle 与输入隔离，访问权限和保留期限由评估 owner 明确。
- 规则或评估集的重要变化触发相关切片重跑，防止只针对旧案例过拟合。
