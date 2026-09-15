# Behavior Impact Standard

本规范约束实现、缺陷修复和代码审查如何确定完整但有界的行为影响面。目标是减少只修一个入口、只看 changed files、重复全量审查和合并后行为回退。

## 1. 一份影响面

实现 owner 在 Scope、Diagnose 或 Design 阶段维护 `deliveryControl.impactScopes[]`。研发、QA、增量审查和合并后复验引用同一组 scope ID，不分别维护互相漂移的清单。

每个 impact scope 必须说明：

- 目标行为及对应 active contract revision。
- 实际入口和绕过共享入口的路径。
- 共享分流、状态、缓存、权限或 capability 决策。
- 语义相同或相邻但可能独立失效的入口。
- 真实消费者和可观察结果。
- 关联验收、检查项、合并保护检查及有证据的排除项。

调用链按以下顺序核对：

```text
入口 -> 共享决策 -> 状态或数据 -> 消费者 -> 可观察结果
```

同时反向搜索消费者和绕过统一 helper、runtime、service、store 或导出面的入口。纯字符串命中、静态调用图或文件邻近关系不能单独证明动态注册和配置入口已经穷尽。

## 2. 范围停止条件

满足以下条件后停止扩大：

1. 已识别与当前行为相关的生产入口和消费边界。
2. 每个不同语义路径都有检查，或有可核实的排除理由。
3. 共享契约、公开导出、跨模块接线和运行时分流已经映射到验收项。
4. 未知动态入口、远端配置或真实消费者明确留在 gaps，不伪装成已覆盖。

文件数最少不是目标；只修改能闭合上述行为范围的文件。无关架构优化、风格改写和未来扩展继续排除。

## 3. 同类入口与代表用例

只有证明适配层、条件和消费契约等价后，才可用一个代表用例覆盖多个入口。下列路径默认语义不同，不自动合并：

- SSR 与 CSR。
- 旧 API 与新 API、源码入口与发布构建。
- guest、authenticated 及不同角色/租户。
- 不同 app、runtime 或 capability 组合。
- 组件 harness 与实际页面容器。
- 串行与并行、成功与恢复/取消路径。

若 consumers 为空，必须记录 `consumerNotApplicableReason`。排除项必须有证据引用，不能写“预计无影响”。

## 4. 增量代码审查

代码审查分为：

- `initial`：建立指定范围的首次审查基线。
- `delta`：检查上次可信目标快照以来的变化及其行为影响。
- `recheck`：只核对指定 finding 的当前状态、原反例和相关保留/消费路径。

每轮 review 必须把 requested scope 精确划分为：

- `reviewedScopeIds`：本轮实际完成检查。
- `inheritedScopes`：从哪个历史 review 继承，以及仍然等价的依据。
- `gapScopes`：未审、失效、未知或无法映射的范围和下一动作。

三个集合不得重叠或漏项。存在 gap 时结论只能覆盖 `reviewed_only`，不得把“本轮无新增问题”写成“完整分支已审”。

`delta` 和 `recheck` 必须引用上一轮 review 与目标快照。base 前移、rebase、merge、cherry-pick、重命名、删除或未提交变更会触发重新映射；无法证明继承有效的 scope 重新检查，不机械全仓重审。

同一根因复用稳定 finding ID。recheck 对每个选中 finding 记录：

- `resolved`
- `still_open`
- `regressed`
- `retracted`
- `unknown`

环境不可得或证据失效为 `unknown`，不是 resolved。未选中的 finding 保持原状态。

## 5. 合并后验证

merge、rebase、cherry-pick 或冲突处理后：

1. 检查最终文件内容和组合调用链，不只检查冲突标记。
2. 确认测试没有被删除、跳过或改成错误期望。
3. 在最终快照重跑 `mergeGuardCheckIds`。
4. 将新运行绑定最终 snapshot、impact scope digest 和环境探测。

预合并模拟只证明 candidate。真实最终快照未验证时必须保留 `FINAL_MERGE_VERIFICATION_PENDING`，不能沿用分支合并前的通过结果。

## 6. 责任与证据

- 技术负责人核对行为边界和扩审理由。
- 单一实现 owner 修改共享源码。
- QA 从契约、消费者和恢复路径提出反例，不重复全仓通读。
- 交付经理保证报告从状态单向汇总，不独立修改覆盖结论。

结构校验只能发现引用、分区和快照不一致，不能证明 Agent 没漏动态调用链。高风险 scope 仍需领域 owner 复核。
