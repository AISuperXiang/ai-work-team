# Technical Design Review

## 评审范围

- 目标：
- 技术方案版本：
- 评审轮次：
- 参与角色：
- 不适用角色及依据：

## 输入冻结

| 输入 | 路径/版本 | 状态 | 变更是否触发重新评审 |
| --- | --- | --- | --- |
| Goal Contract | `goal-contract.json` |  | 是 |
| PRD | `prd.md` |  | 是 |
| UI Review | `ui-review.md` 或 N/A |  | 按影响判断 |
| Milestones | `milestones.json` |  | 是 |
| Tasks | `tasks.json` |  | 是 |
| Autonomy Policy | `autonomy-policy.json` |  | 是 |
| Technical Design | `technical-design.md` |  | 是 |

## 角色评审结论

| 意见编号 | 角色 | 结论 | 严重度 | 关联章节/契约 | 证据或反例 | 必须修改项 | 置信度 |
| --- | --- | --- | --- | --- | --- | --- | --- |

结论使用：`通过`、`修改后通过`、`不通过`、`需用户决策`。

## 契约一致性

| 检查项 | 结果 | 证据 | 责任角色 |
| --- | --- | --- | --- |
| 四个契约的 `goalId` 一致 |  |  | 技术负责人 |
| 计划迭代数不超过最大迭代数 |  |  | 交付经理 |
| 里程碑依赖有效且无环 |  |  | 技术负责人 |
| Task 依赖有效且无环 |  |  | 技术负责人 |
| Task 与里程碑双向引用一致 |  |  | 技术负责人 |
| 验收标准映射到证据要求 |  |  | QA |
| 高风险及不可逆动作需要审批 |  |  | 技术负责人 |
| 预算、停止和重规划规则明确 |  |  | 交付经理 |

## 门禁结论

| 门禁 | 结论 | 证据 | 阻塞项 |
| --- | --- | --- | --- |
| `goal-contract-gate` |  |  |  |
| `requirement-gate` |  |  |  |
| `value-gate` |  |  |  |
| `design-gate` 或 N/A |  |  |  |
| `technical-gate` |  |  |  |
| `autonomy-gate` |  |  |  |
| `design-review-gate` |  |  |  |

## 评审意见处置

| 意见编号 | 处置 | 修改内容 | 修改位置 | 责任角色 | 复核角色 | 状态 |
| --- | --- | --- | --- | --- | --- | --- |

处置使用：`accepted`、`rejected`、`deferred`、`needs_user_decision`。

## 评审轮次

| 轮次 | 新增意见 | 已关闭 | 剩余阻塞 | 方案变化 | 结论 |
| --- | --- | --- | --- | --- | --- |

超过 `autonomyPolicy.iterationPolicy.maxDesignReviewRounds` 仍未收敛时停止自动修订。

## 待用户决策

| 决策项 | 选项 | 推荐 | 影响 | 最晚决策点 |
| --- | --- | --- | --- | --- |

最多保留 3 个用户决策项。

## 最终结论

- 通过 / 修改后通过 / 不通过 / 需用户决策：
- 未关闭 P0/P1：
- 方案结论边界：
- 是否可提交用户批准执行：
