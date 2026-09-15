# Delivery Controls

本文件是交付控制的权威规范：有效契约、修复对照验证、逐项证据、续跑/仅验证、
增量审查、行为影响面和环境复用。复用现有工作流与门禁，不新增执行引擎。

## 1. 适用与责任

- 新 build、bugfix、code-review 状态使用 `schemaVersion: "2.1"`，在既有 `workflow-status.json.deliveryControl` 记录控制数据。
- `2.0` 继续按 P0/P1 契约读取；只有 `2.1` 提供测试选择分层、finding 归因、风险验证包和权威记录策略，不静默补造历史字段。
- walk/deliver 必须读取原任务状态并核对有效性。没有 v2 数据时明确为 legacy_unverified，不把旧 completed 当作新门禁通过。
- goal-design 保留原四类自治契约；批准进入 build 时引用其目标与决定生成 v2，不重新发明目标。
- 交付经理维护有效来源与结论；实现 owner 维护影响范围、反例和保留行为；QA 核对预期依据与证据。
- 单人可承担多个视角，但不得把顺序自查写成独立评审。角色数量不代表验证可信度。

## 2. 有效契约

在 Scope/Triage/Tech Design 固定目标、非目标、适用 app/API/依赖版本及必须保留的行为。遵守系统和开发者约束；在允许范围内落实最新明确用户意图；技能通用偏好不得静默覆盖项目领域约束。

区分“应当怎样”和“现在怎样”。当前实现、旧测试和 CR 建议只能提供证据，不能单独决定期望。来源冲突可用代码/版本/文档解决的先调查；需要产品取舍时只询问那一项。

`contracts[]` 记录来源、`decisionRef`、适用范围及 draft/confirmed/conflicted。`activeContractRevision` 只能引用一个有效版本。confirmed 表示已有明确依据，不要求每次局部改动重复请求用户审批。

修改预期、required、验证方法、兼容范围或保留项时追加新 revision，并写 supersedes/changeReason 和批准依据，不覆盖原决定。降低验收标准不是让测试变绿的手段。

`decision-log.md` 解释取舍，状态只保存 ID 与引用。业务代码纯粹不自动等于删除独立测试；用户明确要求删除时遵守并记录验证降低。

## 3. 修复对照

每个修复先明确：

1. 原反例：输入、实际失败、正确期望、基线快照和可重复证据。
2. 保留项：本修复最容易破坏的正常/恢复/边界路径，不机械展开全量矩阵。
3. 消费方：公开 API、跨模块接线或共享状态变化的直接消费者。

fixes 把上述项关联到 acceptance。原反例修复前失败、修复后通过；保留项和适用消费方修复后通过。可共用一次命令，不强制三个测试文件。不适用必须有理由及 decisionRef。

CR Optimize 必须先核实建议及预期来源，再进行同样的对照验证。review-only 不修改代码。新功能无旧失败时用验收探针，不强行造红测。

依赖导入失败、setup 错误、环境超时不是业务红测。修复测试预期前，先核实调用方/协议；在未修实现上重跑修正后的探针，否则保留基线缺口。

无法复现时可交付采证计划；明确授权下可提供隔离候选修复，但不得关闭原缺陷。设备/环境缺失时 required 项保持待验，其他 V2/V3 不替代。

## 4. 数据与单一结果

完整字段及枚举见 [status.schema.json](../schemas/status.schema.json)。不维护第二份可独立编辑的“通过”清单。

| 字段 | 责任 |
| --- | --- |
| taskMode | implementation / review / design，区分交付对象 |
| contracts / activeContractRevision | 期望来源、适用范围、修订替代关系 |
| acceptance | expected、basisRefs、required；kind 为 target/preserve/consumer/analysis |
| checks | 唯一 id、caseKey、method、minimumLevel、environmentKey、requiredEnvironmentDimensions、evidenceIds |
| fixes | 原反例、保留项、消费方、baselineRunIds；不适用理由 |
| snapshots | id、Git 出处、显式 files 清单、codeDigest |
| verificationRuns | 不覆盖的运行记录、逐检查项 observation、原始证据索引 |
| findingDisposition | 本任务内问题 ID、级别、open/closed/retracted、关联验收 |
| authorizedActions / invocations / currentInvocationId | 任务授权上限；每次 start/resume/verify/review/deliver 的允许动作和必要阶段 |
| impactScopes / currentImpactScopeIds | 入口、共享决策、同类入口、消费者、结果、检查和排除依据 |
| reviewRuns | initial/delta/recheck 的 requested/reviewed/inherited/gaps 与 finding 复核 |
| environmentProbes | 运行前后环境、项目适配器、资源所有权和脱敏证据 |
| testSelections / catalogHealth | 任务路径如何选择 check/test；catalog 自身是否健康；二者不替代 verificationRuns |
| knownFailures | 已知失败的稳定签名、owner、基线和失效条件；不屏蔽当前失败 |
| verificationPacks | async/SSR/cache 风险是否触发及关联 required check |
| recordPolicy | 权威状态、派生摘要、按档位保留或省略的产物 |
| completion | 实现状态、claim 和当次 evidenceReview |

同一验收需要不同方法时列多个 check，必须各自满足。高等级不能代替方法和 caseKey 匹配。环境 key 必须具体到目标 runtime/设备/fixture 条件，不能把 Node24 模拟标成真实 Node14。

运行记录包含 purpose（baseline/postfix/acceptance）、契约、impact scope 与 environment digest、快照、
时间、argv/cwd/exitCode、方法、环境及 probe 引用、fixture/artifact digest、runStatus、
failureKind、observations、outputRefs。manual 记录步骤与验收人引用，execution 为 null。

输出证据位于 workspace 内，每个 outputRef 带 SHA-256。原始命令结果不只保留“passed”一句话。不得记录秘密或业务敏感输入。状态上限 256 KiB，大日志拆分并引用。

一次运行全局失败时，首批保守地不接受其中的 pass 观察关闭 required 项；隔离复跑后再记录。退出 0、全部 skip 或未触达目标分支都不能推导通过。

重复结果需显式 supersedesRunIds/invalidatesRunIds 和原因。替代关系无环、时间顺序有效；仅对新记录实际匹配的 check 生效，不能一个绿测清除其他检查的失败。基线失败不参与当前 pass/fail 冲突，也不得用后续绿测删除基线。

## 5. 快照与新鲜度

- files 清单由 Agent 从影响调用链确定，覆盖源码、测试、fixture、锁文件、配置与适用产物；不自动推断全依赖图。
- 每项含 path/kind/hash；删除项为 `missing`，不当作空文件。
- codeDigest 对按路径排序的 files 做规范 JSON SHA-256；Git SHA 只作出处。
- contractDigest 覆盖有效契约、验收定义与 fixes，不含 evidenceIds、baselineRunIds 等可追加的结果引用。
- postfix/acceptance 要匹配当前文件内容；baseline 允许不同源码快照，但必须仍能核对基线原始输出。
- fixture/artifact 摘要来自对应 kind 的清单；不适用为 null，不能把未知当不适用。
- evidenceReview 记录当次复核的 snapshotId、contractDigest、runIds、checkedAt、reviewer、environmentConfirmed、ref。环境复核是责任人的可追溯声明，不是 CLI 自动发现。
- evidenceReview 同时绑定 current impact scope digest；范围变化会使旧复核失效。
- 源码、fixture、构建、输出或契约变更使关联证据失效。环境身份无法确认也不能复用。
- 同 SHA 不代表永远有效；不相关说明文档变化也不自动要求全量重测。

首个 capture 前，在 snapshots 最后一项列出本轮 manifest：文件 hash 暂填 `missing`、codeDigest 暂填 64 个 `0`、Git 出处未知为 null。capture 只输出真实 snapshot 和 contractDigest，使用编辑工具替换占位快照再运行验证。占位记录本身不能用于通过评估。

## 6. 判定与门禁

| 现有门禁 | 首批加强 |
| --- | --- |
| decision-gate | 实现前 active contract confirmed，无未决冲突 |
| reproduction-gate | 业务断言失败的真实基线；无法复现不得宣称已修复 |
| test-gate | 原反例、保留项和适用消费方的 check 映射 |
| verification-gate | 当前方法/分支/环境/快照/输出一致；逐 check 派生结果 |
| delivery-gate | claim 不超过证据，相关 P0/P1 未关时不得验收实现 |

评估结果 `subject` 区分 implementation/analysis；`readiness` 为 ready/review/blocked/legacy_unverified。check 结果为 PASSED/FAILED/NOT_RUN/BLOCKED/STALE/CONFLICT。

required FAILED/CONFLICT、契约冲突或实现相关 open P0/P1 阻断。缺测、过期和环境不可得保持 review。ready 只是交付必要条件，不绕过权限、用户审批或现有质量门禁。

- candidate：代码候选，不表示原问题解决；实现完成但关键验收未过时不得把 Delivery 标 completed。
- accepted：仅 implementation complete 且所有必需条件满足。
- analysis_complete：review/design 报告完成，被审代码仍可有 open P1；另输出 changes_required，不写代码通过。
- 评分、整体 verificationLevel 和角色意见不得覆盖逐项结果。分析报告可以交付失败结论，不因被审代码有 P1 而阻止交付报告。

## 7. 只读工具

从技能仓库执行：

```bash
node scripts/check-delivery.js --project-root /absolute/project --workspace workspace/task --mode capture --json
node scripts/check-delivery.js --project-root /absolute/project --workspace workspace/task --mode assess --json
```

使用 `scripts/cli-args.js`。未知/重复/缺值/冲突参数与非法路径退出 2；无法读取、不满足或 legacy_unverified 退出 1；capture 成功或当前 subject ready 退出 0。capture 不返回 ready，analysis 的退出 0 不是代码批准。

capture/assess 均不写文件、不执行记录的 argv、不访问 URL、不启动/关闭服务。JSON stdout 只有结构化结果。读取显式 allowlist，禁止路径穿越、symlink、非普通文件及凭据路径；单个哈希输入最大 1 GiB，超限失败关闭。

[validate-contracts.js](../scripts/validate-contracts.js) 校验档案结构及已声明结果的一致性，不验证历史运行时的当前有效性；check-delivery 在明确用户项目中读取实际文件。两者复用同一纯判定逻辑。

## 8. 兼容与诚实边界

无 schemaVersion 的旧档案仍按旧规则审计，不自动改写或补证据。`2.0` 保留 P0/P1 能力；新任务使用 `2.1`。未知版本或有 deliveryControl 无版本均报错。旧任务重新实现/验收前显式升级并补足证据。

core validate:contracts 不扫描历史 workspace；历史失败由显式 validate:workspaces 输出，不删除档案来换全绿。

哈希和结构校验不能证明原始输出真实、业务期望正确、影响清单完整或历史不可篡改。Agent 必须做语义和来源复核；本工具不是防篡改审计或远端验证平台。首批不宣称已测得研发提效。

## 9. 操作与续跑

`start/resume/verify/review/deliver` 是原工作流之上的操作层。每次调用追加 invocation，
不得覆盖历史调用；除第一项外必须引用紧邻的前序 invocation，当前 invocation 必须为数组最后一项。
每次 invocation 的 allowedActions 必须是任务 authorizedActions 的子集。resume 不继承或创造
发布、删除、权限、账号或跨仓库写入授权；扩大权限必须有新的明确用户决定并更新授权来源。

- resume 读取原任务的最小事实包，比较契约、相关快照、finding 和证据，只重开必要阶段。
- verify 只允许读取、运行验证/评估、追加证据及有界启停本轮服务；禁止改源码、测试期望和 fixture。
- review 只允许读取、验证、追加证据和写审查摘要；代码优化必须另有实现授权。
- deliver 只允许读取、只读评估和写摘要；不得隐式启动新验证或修复。

上轮副作用命令结果不明时先查文件、进程和完整输出，不自动重放。历史授权不自动扩大到新仓库、
发布、删除、权限、账号或数据写入。

## 10. 行为影响与增量审查

完整规则见
[Behavior Impact Standard](engineering-standards/behavior-impact-standard.md)。
实现、修复和审查共用 current impact scopes；每个 required check 必须属于当前 scope。
scope 定义改变会改变 impact scope digest，使相关当前证据失效。

code-review 使用 initial/delta/recheck：

- requested 必须精确分区为 reviewed、inherited 和 gaps。
- inherited 引用更早 review、其真实 target snapshot 和相同 impact scope digest；
  上轮 gap 或定义已变化的 scope 不得继承。
- recheck 对每个选中 finding 给出 resolved/still_open/regressed/retracted/unknown。
- gaps 存在时只允许 reviewed_only 结论。
- 最终合并状态必须绑定 current target snapshot；merge guard 未通过不能验收实现。

## 11. 环境与资源

完整规则见
[Verification Environment Standard](engineering-standards/verification-environment-standard.md)。
每个 check 声明 required environment dimensions，每个 run 绑定环境 probe。

- static/unit/integration 至少有 before probe。
- runtime/browser/manual 同时有 before 与 after probe。
- probe 的 environment key、时间、内部 fingerprint、脱敏证据哈希和 required 维度必须匹配。
- 资源 conflict/unknown、实例/构建/账号/数据 mismatch 或缺少维度时，该 run 为 BLOCKED。

项目声明 Local Gateway 时优先复用其实例发现、线上 host、runner 和 worktree 锁。
Skill 不硬编码端口、app 或凭据，不把 heartbeat healthy 当作编译完成或版本正确。
环境状态 JSON 不是原子锁；不得删除锁、关闭用户服务或清共享缓存绕过冲突。

## 12. 测试选择、catalog 健康与执行结果

三个问题独立记录：

1. `testSelections` 回答任务路径命中哪些 check/test、哪些路径未映射、选择是否完整。
2. `catalogHealth` 回答测试目录、登记、选择器和 inventory 是否健康，并标注诊断与当前 scope 的相关性。
3. `verificationRuns` 只回答实际执行、断言、环境和输出结果。

Agent 默认从 current impact scope 生成显式项目根相对路径。没有任务范围时停止自动执行；人工兼容入口使用 working_tree 时必须如实记录，不能冒充任务范围。项目声明 selector 时必须使用其结构化结果，不建立第二份 catalog。

诊断模式只读，不得与执行组合。catalog degraded/invalid、选择 partial/unknown、当前路径未映射或相关性 unknown 时，当前实现保持 review；已有测试通过只能声明受测行为通过，不能覆盖仓库门禁。

每个 `verificationRun` 在 2.1 中必须且只能关联一个 selection。run 的 observation
只能引用该 selection 已选 check，selection 只能引用其 invocation 已授权的 check；
拥有 run 的 invocation 必须允许 `run_verification`。退出 0、全部 skip、NOT RUN
或未触达目标分支仍不能推导 PASSED。

`knownFailures` 只复用诊断与 owner。签名必须包含稳定 case/error 身份和环境条件；源码、依赖、fixture、工具、catalog inventory 或影响范围变化时重新评估。已知失败不抹掉 required 失败，不降低发布门禁。

## 13. Finding 裁决

每个 finding 在进入 Optimize 前依次完成：

1. 核真失效输入、实际路径、有效期望和可观察后果。
2. 检查最可能推翻结论的 guard、catch、调用方约束、fallback 和实际入口。
3. 区分缺陷是否存在，以及 introduced / worsened / pre_existing / unknown。
4. 按稳定 ID 核对当前实现和已有修复证据。
5. 只有 confirmed 且获得修改授权才进入实现；insufficient 保持采证，retracted 必须有反证。

evidenceStatus、attribution、confidence、fixedState 相互独立。pre_existing 不误算本次责任，也不自动授权顺手修复；相关 open P0/P1 仍按真实依赖和发布规则阻断。closed 必须 fixed 且验收通过；retracted 必须 disputed、not_applicable 并有 counterEvidenceRefs。

## 14. 风险验证包

按 [verification-packs](verification-packs/README.md) 选择 async_ownership、ssr_recovery、cache_consistency。selected 包只引用 current impact scope 中的 required check；同一 check 可以服务多个包。not_applicable 必须有触发分析和理由，不制造空矩阵。

验证包不规定业务实现，不要求所有项目使用同一种取消、重试、SSR 或缓存方案。selected 包有 check 未通过时保持 review。

## 15. 权威记录与效果评估

`recordPolicy.authoritativeRecord` 固定为 `workflow-status.json`。状态保存当前事实和索引，原始证据不可覆盖；交付摘要是 derived view，不能反写 finding、run 或 readiness。终态摘要用 `summarySourceDigest` 绑定生成时的权威状态，包括最终 `completion.claim`；当前事实改变后旧摘要失效。

- lightweight 使用 minimal：保留权威状态、必要证据和可读结论；独立 PRD、评分表或角色交接文件可在有 decisionRef 时省略。
- standard 保留改变关键决定或跨角色责任所需的方案/交接，但不重复手填同一事实。
- assurance 继续保留审批、回滚、发布和强制独立原文。

数字质量评分仅作诊断，不参与 accepted 判定。业务目标、required checks、安全、审批和发布规则仍是实质门禁。

Skill 规则的重要变更按
[Skill Evaluation Methodology](methodologies/skill-evaluation-methodology.md)
先做隐藏答案历史场景，再做同风险真实任务试点。使用只读 `evaluate-skill.js` 汇总已记录结果；critical error 不能被平均分抵消，观察未成熟只能 hold。
