---
id: execution-protocol
title: 通用执行协议
triggers:
  - 工作流执行
members:
  - delivery-manager
execution_mode: sequential
---

# 通用执行协议

所有工作流都必须遵守本协议。

实现、修复、审查与走查还需执行 [Delivery Controls](../docs/delivery-controls.md)。
沿用现有阶段，但在进入实现前确认 active contract，在验证时关联 check/run/snapshot，
在交付时区分候选实现、实现验收与分析报告完成。不得以阶段 completed 或最高 V 等级替代逐项验收。

## 操作优先于工作流

`start`、`resume`、`verify`、`review`、`deliver` 是当前调用的动作约束，
原 build/bugfix/code-review 等工作流仍负责领域阶段。先解析动作，再根据原工作流加载角色：

| 操作 | 必须做 | 不得做 |
| --- | --- | --- |
| start | 建立 task ID、授权、契约、范围和初始阶段 | 继承不明历史结论 |
| resume | 读取原状态，比较契约/快照/环境/证据，只重开必要阶段 | 重建同义任务；扩大原授权；重放结果未知的副作用命令 |
| verify | 选择缺失、失败、冲突或失效 check，运行验证并追加证据 | 修改源码、测试期望、fixture；自动转入修复 |
| review | 按 initial/delta/recheck 固定 requested/reviewed/inherited/gaps | 将局部本轮结论表述为完整分支已审 |
| deliver | 只读评估并从权威状态生成摘要 | 启动新一轮全审、全测、修复或重构 |

每次调用追加 `deliveryControl.invocations[]`，记录授权来源、契约/快照、选中的
check/finding、允许动作、必要阶段和前序 invocation。当前调用必须是数组最后一项。
verify/review/deliver 的动作白名单由状态 Schema 和确定性校验共同约束。
invocation 的允许动作必须是任务 `authorizedActions` 的子集；resume 不得凭历史调用扩大授权。

新任务使用 2.2；每次 invocation 在执行前按 [证据自动入账](../docs/evidence-recording.md)
记录实际技能身份。start 首次生成 ID，prepare 固定本轮输入绑定，项目工具执行后 import 自动关联证据；
结果未知保持 unknown，禁止重放旧 argv。只读 summary 从权威状态生成当前结论。

### Resume 判定

按 task ID 或用户明确 workspace 选择任务。其次才使用当前会话唯一关联；
不得按目录时间自动选择多个候选。

最小读取包为当前状态、active contract、最近交接、未关闭 finding、证据索引和当前范围差异：

- 事实和证据未变：从首个未完成阶段继续，不重复探索。
- 只缺运行环境或运行证据：进入预检和 verify，不回到实现。
- 相关源码、测试、依赖或合并结果改变：更新 impact scope，失效关联证据并执行必要 delta/verify。
- 目标、验收、兼容范围或测试方法改变：先形成新 contract revision。
- finding 已有当前有效关闭证据：复用 ID 并复核，不新建同义修复。
- 上轮命令结果不明：先查文件、进程和完整输出；有副作用的动作不自动重放。

## 状态模型

使用以下状态：

- `pending`：阶段未开始。
- `in_progress`：阶段正在执行。
- `blocked`：阶段被问题阻塞。
- `review`：阶段产出等待角色走查或用户决策。
- `completed`：阶段完成且门禁通过。

## 执行循环

1. **确认输入**：列出已知信息、缺口和约束。
2. **解析操作**：记录 invocation；受限操作语义优先于 bug、review 等领域关键词。
3. **选择工作流**：新任务引用路由表；resume/verify/deliver 复用原任务工作流。
4. **选择执行档位**：实现、缺陷修复和代码审查先读 `docs/methodologies/execution-methodology.md`，按风险、未知度和影响范围确定 `lightweight`、`standard` 或 `assurance`。
5. **激活角色**：读取 `docs/methodologies/role-activation-methodology.md`，形成 `rolePlan`，为每个角色记录模式、场景依据和参与阶段。
6. **建立状态板**：阶段、负责人、状态、产出、门禁、`executionProfile`、`verificationLevel` 和 `rolePlan`。
7. **固定影响面**：实现、修复和审查按 `behavior-impact-standard.md` 建立或更新行为 scope。
8. **加载角色**：只读取当前阶段且在 `rolePlan` 中为 `active` 或 `consulted` 的 `members/*.md` 与对应方法论。
9. **同步交接**：阶段切换前按 `docs/handoff-contract.md` 更新权威状态中的交接引用；是否生成独立 `role-handoff.md` 由 `recordPolicy` 决定。
10. **产出交付物**：先写 `recordPolicy`；`workflow-status.json` 维护当前事实，其他摘要单向派生。`lightweight` 只保留能证明决策、改动和验证的最小产物。
11. **记录决策**：关键范围、技术取舍、上线风险和延期项写入 `decision-log.md`，
    或按 `recordPolicy` 内联到权威状态并提供 `decisionRef`。
12. **选择测试**：从显式任务路径生成 test selection，独立记录 catalog health；没有任务范围不自动回退全工作树。
13. **环境预检**：运行验证前按 `verification-environment-standard.md` 复用项目能力并记录脱敏 probe。
14. **风险验证**：按需加载 async ownership、SSR recovery 或 cache consistency 验证包。
15. **检查门禁**：按 `docs/quality-gates.md` 验证阶段结果，包含 role activation、value、decision、handoff、complexity、evidence、verification 和 no-legacy 约束。
16. **处理阻塞**：能探索则探索，需取舍则问用户，无法继续则交付阻塞报告。
17. **进入下一阶段**：上一阶段门禁未通过时不得默认继续。
18. **最终交付**：输出范围、角色激活计划、业务价值、决策、验证等级、风险、证据和后续建议；评分按需提供且不参与准入。

## 执行档位

- `lightweight` 不是跳过工程纪律：必须读相关代码、记录目标行为和非目标、给出回归验证与剩余风险。
- `standard` 是多模块或不确定变更的默认档位，使用工作流声明的核心产物与角色交接。
- `assurance` 用于 `L/XL`、安全、数据、权限、外部副作用或高回滚成本变更，增加独立风险评审、灰度、回滚和运行时验证。
- 发现新依赖、无法复现、验证失败、公开契约变化或 P0/P1 风险时，立即升级档位并更新状态板。

## 角色激活

- workflow frontmatter 中的成员是候选池，不代表每个角色都必须参与。
- 先按任务信号形成 `rolePlan`，再为当前阶段加载 `active` 或 `consulted` 角色。
- `not_applicable` 必须记录理由；没有界面变化时 UI、不涉及业务指标时运营、没有服务端影响时后端都可以不参与。
- 发现跨端、接口、数据、权限、体验、用户预期或回归风险后，重新评估 `rolePlan`，不要沿用初始假设。
- 角色未参与时，相应评估维度省略或标记 `N/A`，而不是制造角色产物或无证据分数。

## 混合执行

当工作流为 `execution_mode: hybrid` 且阶段可独立评审、输入已冻结且没有共享写入冲突时：

- 产品范围评审可由产品经理子 Agent 执行。
- UI 可用性评审可由 UI 设计师子 Agent 执行。
- 技术风险评审可由技术负责人子 Agent 执行。
- 测试策略评审可由 QA 子 Agent 执行。

交付经理必须汇总子 Agent 结论，形成统一决策。若结论冲突，先基于事实裁决；无法裁决时明确列出取舍并询问用户。

子 Agent 输出必须使用以下契约：

| 字段 | 要求 |
| --- | --- |
| 结论 | 通过、修改后通过、不通过或需用户决策 |
| 证据 | 代码、文档、命令、截图、数据来源或人工验收依据 |
| 风险 | 影响、概率、严重级别、缓解动作和责任角色 |
| 置信度 | 高 / 中 / 低，并说明不确定来源 |
| 需决策项 | 最多 3 个，需要用户或交付经理裁决的问题 |

交付经理只输出统一结论和裁决依据，不把互相冲突的原始意见直接交付给用户。

实现代码默认由一个负责人修改。并行角色必须有独立问题边界、证据要求和文件所有权；发现冲突时停止并行并先裁决，不能用角色数量制造虚假的置信度。

## 失败处理

- 门禁失败：停止进入下一阶段，说明失败项、修复动作和责任角色。
- 验证命令失败：记录命令、失败类型、关键输出和下一步处理。
- 缺少环境：说明缺失环境、影响范围和可替代检查。
- 环境失败：按 project/instance/build/proxy/account/data/tool/resource 分类；
  一次有据可逆纠正及一次复查后，同一环境指纹无新证据则停止重复启动或登录。
- 用户目标冲突：交付经理整理为二选一或三选一决策。
- 无法复现缺陷：记录最小插桩、数据采集或环境补齐方案，状态保持 `blocked` 或 `review`，不得交付“已修复”。

## 完成定义

下列“完成”指本次交付对象。未关闭 P0/P1 可以出现在已完成的分析报告中，
但必须保留 changes_required；实现候选有缺测项时 Delivery 保持 review。
v2 交付前运行内置 check-delivery，只读核对当前证据；旧记录不能自动转为 ready。

工作流完成必须同时满足：

- 所有必需阶段为 `completed`。
- 质量门禁通过；`role-activation-gate` 与其他不可绕过门禁均有证据闭环。
- 验证结果明确。
- `verificationLevel` 与结论范围一致，未覆盖路径和环境风险明确。
- 业务价值、关键决策、交接记录、风险和证据索引在权威状态或其引用原文中明确。
- 最终交付摘要可被用户直接用于验收、上线观测或继续推进。
