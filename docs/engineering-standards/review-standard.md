# Review Standard

## 评审顺序

1. 固定模式、范围与基线：确认 initial/delta/recheck、diff、提交、路径、目标行为和非目标。
2. 选择角色：按审查范围形成 `rolePlan`，只激活命中前端、后端、QA、产品或 UI 领域的角色。
3. 需求符合性：是否实现了约定范围。
4. 行为正确性：从调用链构造核心路径、异常和边界反例。
5. Finding 裁决：核真、反证、归因、已修核对，再决定是否进入修复。
6. 风险控制：安全、兼容、性能、数据和发布风险。
7. 代码质量：可读性、复用、测试和维护。

具体调用链、requested/reviewed/inherited/gaps、稳定 finding ID 和合并后保护规则见
[`behavior-impact-standard.md`](behavior-impact-standard.md)。

## 发现契约

每个发现必须包含：

- 严重度：P0/P1/P2/P3。
- 代码位置：文件与行范围，或明确的调用路径。
- 失效场景：什么输入、状态或环境会触发。
- 支持证据：代码、测试、日志、规格或可重复推理。
- 反证检查：最可能推翻结论的 guard、catch、调用方约束、fallback 或真实入口，以及检查结果。
- 证据状态：confirmed / disputed / insufficient。
- 变更归因：introduced / worsened / pre_existing / unknown，并给基线或无法归因的理由。
- 置信度：high / medium / low，不能用严重度代替置信度。
- 已修核对：当前实现、历史 finding ID、修复证据和原反例的现态。
- 建议动作：最小修复、优化或明确不修改的理由。
- 验证方式：修复后应运行的测试、命令或人工路径。

没有发现时，也必须写明已检查范围、检查维度和未覆盖范围。
未激活领域必须写明不适用依据，不得被表述为已审查无风险。

## 必查项

- 是否有无关改动。
- 是否遗漏验收标准。
- 是否有硬编码凭据、环境或权限绕过。
- 是否引入跨端或跨业务功能泄漏。
- 是否有失败测试或未解释的跳过测试。
- 是否把静态检查误写成运行时行为验证。
- 是否存在与当前审查范围无关的重构建议。
- 是否只审 changed files 而遗漏共享契约、同类入口和真实消费者。
- 是否把增量审查、问题复核或合并前 candidate 表述为完整最终审查。
- 是否把 reviewer 建议直接变成测试期望，未核对有效契约和消费行为。
- 是否仅凭行在 diff 内、blame 或 import 字符串链认定本次引入和运行时故障。
- 是否在同根因已有当前有效修复时重复创建 finding 或修改生产代码。

## 按风险加载验证

- await、并发、取消、重试、分页或状态所有权变化：读取 `../verification-packs/async-ownership.md`。
- server import、loader、bootstrap、hydration 或 SSR 终态变化：读取 `../verification-packs/ssr-recovery.md`。
- key、TTL、refresh、invalidate 或持久化写变化：读取 `../verification-packs/cache-consistency.md`。

选择由行为影响面决定，关键词只作提示。无相关风险时不加载，不生成空检查表。

## 结论

评审结论使用：

- `通过`。
- `修改后通过`。
- `不通过`。

结论必须附带阻塞项和建议修复顺序。

P0/P1 发现未关闭时不得给出“通过”或“带风险通过”。
