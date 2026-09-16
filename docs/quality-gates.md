# Quality Gates

质量门禁用于判断阶段是否可以进入下一步。门禁失败时必须停止推进，说明失败项、责任角色和修复动作。

## requirement-gate

必须满足：

- 目标用户、业务目标和核心场景明确。
- 范围内、范围外和优先级明确。
- 验收标准可测试。
- 关键依赖、约束和风险已列出。
- 业务价值已进入 `value-gate` 检查，不允许只描述功能而不说明价值。

失败时回到产品经理和运营经理补齐需求。

## value-gate

必须满足：

- 目标用户、价值假设和用户/业务收益明确。
- 指标基线、收益目标、观测周期和数据来源明确；没有现成数据时必须标记为待采集假设。
- 成本收益比或投入产出判断明确，包括研发成本、运营成本和预期收益。
- 上线后观测方式和复盘计划明确。
- 必须满足 `business-impact-rubric.md` 的目标用户、价值、指标、成本收益和观测等实质要求；数字评分仅作辅助。
- PRD 完成态必须包含上述内容，否则不得进入 UI/UX 或技术方案阶段。

纯内部工程改动、明确缺陷修复或仅代码审查可标记业务指标为 `N/A`，前提是 `rolePlan` 与交付摘要记录不适用依据、影响范围、风险降低目标和复审触发条件。

失败时回到产品经理和运营经理补齐价值假设、指标口径和收益判断。

## goal-contract-gate

用于 `/team goal-design`，必须满足：

- `goal-contract.json` 使用 `schemas/goal-contract.schema.json`，目标用户、问题、期望结果、非目标和五类约束完整。
- 每个期望结果关联可观测指标；指标包含基线、目标、数据来源和观察周期。
- 未证实判断记录为 assumption，并给出验证方式和状态。
- 成功标准包含目标阈值和证据来源。
- 目标、范围、预算或关键假设变化时有明确重新评审触发器。
- PRD、里程碑、任务和自治策略使用相同 `goalId`，不得静默改变目标合同。

失败时回到产品经理补齐目标合同；涉及战略、预算或高影响取舍时提交用户决策。

## design-gate

必须满足：

- 核心用户路径清晰。
- 默认、加载、空态、错误、禁用、成功、权限不足等状态已覆盖。
- 视觉层级、交互反馈、响应式和可访问性要求明确。
- 设计约束可被研发执行。

失败时回到 UI 设计师补齐交互和状态。

## technical-gate

必须满足：

- 方案基于真实代码、接口、配置或系统约束。
- 接口、数据、权限、兼容、失败模式和回滚明确。
- 变更范围受控，无无关重构。
- 测试策略和验证命令明确。
- 关键技术取舍、复杂度分级和回滚策略已进入 `decision-gate` 与 `complexity-gate`。

失败时回到技术负责人重新裁剪或补方案。

## autonomy-gate

用于目标驱动技术方案，必须满足：

- `milestones.json`、`tasks.json`、`autonomy-policy.json` 分别符合对应 Schema。
- `plannedIterations` 不大于 `maxIterations`，方案评审轮数、连续无改进轮数、任务数、并发、重试、时间、模型调用和成本都有上限。
- 里程碑和 Task 依赖只引用已存在节点，不得自依赖或成环；Task 与里程碑双向引用一致。
- 每个里程碑有纵向可验证结果、退出条件、证据和目标验证等级。
- 每个 Task 有输入、输出、责任能力、验收、证据、文件所有权、重试和审批模式。
- 自动决策仅覆盖可逆、低风险、预算内且有验证的行为。
- 生产、删除、付费、权限、凭据、安全、隐私、合规和其他不可逆操作必须人工审批。
- 达成目标、预算耗尽、连续无改进、风险超阈值和人工停止均有硬停止规则；关键假设失效或验证路径不可用时有重规划规则。

失败时由技术负责人和交付经理修复契约；不得通过扩大预算或迭代轮数绕过。

## design-review-gate

用于 `/team goal-design` 的技术方案评审闭环，必须满足：

- 技术负责人、命中领域研发和 QA 已完成技术评审。
- 产品经理、适用 UI 设计师和 QA 已回审方案与 PRD、体验、验收的一致性。
- 每条意见包含角色、严重度、关联章节或契约、证据或反例、处置和复核结论。
- `accepted` 意见已进入方案或契约，`rejected` 有事实依据，`deferred` 有影响和触发条件。
- P0/P1 风险全部关闭；需要用户裁决的事项不超过 3 个。
- 自动修订轮数没有超过 `autonomyPolicy.iterationPolicy.maxDesignReviewRounds`。
- 最终结论明确为“方案已评审，等待用户批准执行”，不把方案完成表述为代码或运行时交付。

失败时回到 Design Revision；超过最大评审轮数仍不收敛时停止并提交用户决策。

## implementation-gate

必须满足：

- `deliveryControl.activeContractRevision` 指向 confirmed 契约，且无未决冲突。
- 改动符合仓库既有结构和风格。
- 只修改需求相关文件。
- 关键状态、异常和边界已处理。
- 本地验证已运行，或无法运行的原因已说明。

失败时回到对应研发角色修复。

## reproduction-gate

用于缺陷修复，必须满足：

- 已记录可重复的复现步骤、环境、输入、实际结果和期望结果，或明确说明为何无法复现。
- 复现结论有命令、日志、截图、请求记录或最小代码路径证据。
- 无法复现时已列出最小插桩、数据采集或环境补齐方案；不得直接宣称根因已修复。
- 修复后的场景与原复现步骤可被复跑，或明确标记为待验证风险。
- 基线失败必须是业务断言失败，并关联有效契约；setup、依赖或环境失败不能充当红测。
- 修复还要列出最可能受损的保留行为和适用消费方；不适用有 decisionRef。

失败时回到 QA 和技术负责人补采证或缩小假设。

## review-gate

用于代码审查和逻辑优化，必须满足：

- 审查范围、目标行为、非目标和基线已明确。
- initial/delta/recheck 模式明确；requested scope 已精确划分为本轮 reviewed、可信 inherited 和 gaps。
- delta 的上轮 review/target snapshot 可追溯；recheck 覆盖每个选中 finding 且未选 finding 未被改写。
- changed files 引出的共享契约、同类入口和消费者已检查；合并后的最终组合行为有保护检查或明确待验。
- 每个 finding 先核真并检查最可能推翻结论的反证；证据状态、置信度、已修核对和
  introduced/worsened/pre_existing/unknown 归因明确。
- 结论按严重度排序，并关联具体代码位置、失效场景和建议动作；retracted 有明确 counterevidence。
- 已检查行为正确性、边界/回归、安全与兼容、测试证据；性能只在相关路径上评估。
- “无需修改”必须说明检查过的证据和未覆盖范围，不能只给笼统好评。

失败时由技术负责人补足反例、代码定位或验证策略。

## role-activation-gate

必须满足：

- 工作流启动时已按 `docs/methodologies/role-activation-methodology.md` 写入 `rolePlan`。
- 每个被评估角色都有 `active`、`consulted` 或 `not_applicable` 状态、场景依据和参与阶段。
- `active` 角色必须产生可追溯的决策、实现、验证或门禁结论。
- `not_applicable` 角色不得生成虚假产物、参与记录或评分；交付摘要必须说明不适用依据。
- 范围扩大、复现失败、验证失败、P0/P1、跨端、接口、数据或权限影响出现时，必须重新评估角色计划。

失败时由交付经理补齐角色选择依据，或停止推进并激活缺失的领域角色。

## test-gate

必须满足：

- 测试覆盖正常、异常、边界和回归路径。
- 测试步骤、数据和期望结果清楚。
- 自动化或人工验证结果可复现。
- 阻塞缺陷已关闭或明确被接受。
- test selection 使用显式任务路径，catalog health 和 execution 独立记录；
  partial/unknown、相关未映射路径、catalog 非健康均不得伪装成完整测试通过。
- 修复的原反例、保留路径和适用消费方均映射到独立 check；
  同一次运行可覆盖多项，但退出码或全局等级不能替代逐项 observation。
- async/SSR/cache 风险命中时，所选验证包的 required check 已通过；未命中时有范围依据。

失败时回到 QA 和研发补测或修复。

## verification-gate

必须满足：

- `workflow-status.json` 记录当前 `verificationLevel`，并与证据类型一致。
- 交付结论不超过验证等级允许的范围：`V1` 只能声明静态检查通过，`V2` 只能声明受测行为通过。
- 需要浏览器、运行时、灰度或人工验收的核心路径，在未完成时必须作为剩余风险保留。
- 验证失败、无法执行或环境阻塞必须说明原因、影响和下一步采证动作。
- 每个运行关联 current impact scope digest 和环境 probe；required 环境维度、probe 时序、证据哈希和资源状态匹配。
- 运行时/浏览器/manual 验证同时有 before/after 环境确认；端口占用或 health 心跳不得单独证明 app、worktree、构建、账号或数据正确。
- 项目声明 Local Gateway、runner 或资源锁时优先复用；不得重复启动、绕过锁或关闭用户原有服务。
- v2 required check 必须匹配当前契约 digest、方法、caseKey、环境、文件快照和输出摘要。
- 2.2 必须有从原文复核的 requirements→acceptance/check 覆盖和当前 coverageReview；
  selected 风险义务的方法、入口、fixture、断言匹配，适用消费者 facets 有真实消费检查与样本。
- 2.2 自动入账的 assertion/runner/wrapper 独立明确；unknown、整体失败或 executed=0 不能关闭 required。
- FAILED/CONFLICT 阻断，NOT_RUN/BLOCKED/STALE 保持待验；评分和更高 V 等级均不能覆盖。

失败时降低结论或补充验证，不得用质量评分掩盖证据缺口。

## delivery-gate

必须满足：

- 变更范围、关键决策和验证结果明确。
- 已激活的产品、UI、QA 走查结论已汇总；未激活角色不生成形式结论。
- `rolePlan` 已汇总；未参与角色及对应 N/A 维度有场景依据。
- 风险和后续建议清楚。
- 用户可根据交付摘要完成验收。
- `workflow-status.json` 权威记录已更新；`recordPolicy.requiredArtifacts` 已存在，
  省略的独立 decision/risk/handoff 文件有内联记录或可追溯 decisionRef。
- 业务价值、收益观测、证据索引和复盘计划已进入交付摘要。
- 当前执行档位、验证等级和未覆盖范围已进入交付摘要。
- 当前 invocation 与用户授权一致；verify/review/deliver 没有执行禁止动作。
- `/team deliver` 只汇总已有有效结果；若 required check、范围或环境证据失效，结论为 review/blocked，不隐式启动新执行。
- 实现交付的 claim 为 accepted，并通过只读当前有效性评估；candidate 只能交付为候选和缺口。
- review/design 的 analysis_complete 只表示报告完成；open P0/P1 必须保留 changes_required，不能表述为代码通过。

失败时由交付经理列出阻塞项和下一步动作。

## decision-gate

必须满足：

- 关键范围、优先级、技术取舍、上线风险和延期项写入 `decision-log.md`，
  或按 `recordPolicy` 内联到 `workflow-status.json` 并提供可追溯 `decisionRef`。
- 每条决策包含背景、选项、最终选择、影响、负责人和时间。
- 影响范围、成本、风险或用户体验的决策不得只存在于对话中。

仅当 `recordPolicy.requiredArtifacts` 包含 `decision-log.md` 时，独立文件才是必需产物。

失败时由交付经理补齐决策记录，必要时要求用户裁决。

## handoff-gate

必须满足：

- 每次角色交接写入 `role-handoff.md` 或权威状态引用的等价交接记录。
- 交接必须包含背景、当前阶段、已确认决策、待确认问题、风险、产物和验证。
- 下游角色不得在缺少关键交接字段时继续推进阶段。

`lightweight`、verify-only、recheck 和 deliver 汇总可省略独立 `role-handoff.md`，
前提是 `recordPolicy` 记录省略理由和 decisionRef，且上述信息已在权威状态或现有任务记录中可追溯。
standard/assurance 只有在确无独立审批、所有权转移或跨角色风险时才能采用同等省略。

失败时由交付经理要求上游角色补齐交接信息。

## complexity-gate

必须满足：

- 需求复杂度按 `S / M / L / XL` 分级，并说明依据。
- `S`：单角色或小范围变更，可走轻量流程。
- `M`：多角色协作或有限跨模块变更，必须有风险登记和回归范围。
- `L`：跨模块、跨端、数据或发布风险较高，必须拆里程碑、技术 spike、QA 策略、灰度和回滚方案。
- `XL`：跨团队或高资损/高安全/高运营风险，必须先形成阶段性交付计划和用户确认的风险接受条件。

失败时由技术负责人和交付经理裁剪为可交付切片。

## evidence-gate

必须满足：

- 所有“已完成”“已验证”“可交付”“收益可观测”的结论都有证据。
- 证据可以是命令结果、截图、日志摘要、数据来源、人工验收记录或外部系统链接。
- 证据索引必须写入 `evidence/README.md` 或交付摘要。
- 无法采证时必须说明原因、影响和替代检查。

失败时回到对应角色补验证或降低交付结论。

## no-legacy-contract

必须满足：

- 主文档、模板、脚本和非生成 workspace 文档不得出现旧快捷入口、旧项目短名或旧本地路径。
- 当前合法技能名 `ai-work-team` 不属于旧项目短名。
- 生成目录、依赖目录和构建产物不作为规范来源，但新模板和样例文档必须通过遗留扫描。

失败时先清理遗留入口和旧路径，再继续发布或交付。
