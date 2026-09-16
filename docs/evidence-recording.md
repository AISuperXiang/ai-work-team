# 证据自动入账（2.2）

`record-evidence.js` 把本轮结构化工具结果写入唯一权威状态。它不执行 argv、不解析任意日志语义、不迁移历史状态。项目既有 runner/CI/浏览器工具负责执行并在来源侧脱敏。所有命令从技能根目录运行。

## 1. 入场与执行前绑定

使用新状态模板，填好工作流、授权、阶段和业务契约。首次 start 可以在空 invocations 时生成 task/invocation ID；后续 invocation 由 Agent 按原操作边界追加，start 为当前 invocation 记录一次身份。身份包含此安装副本的 package 版本、SKILL.md SHA-256、Node 和采集时间；不声称这是执行模型或第三方工具版本。

```bash
node scripts/record-evidence.js --project-root /absolute/project --workspace workspace/task --mode start --authorization-ref decision-log.md --json
node scripts/record-evidence.js --project-root /absolute/project --workspace workspace/task --mode start --authorization-ref decision-log.md --expected-state-digest <stateDigest>
```

JSON/start 是预览，返回当前整个状态的规范 JSON SHA-256。只有普通 start/import 加正确 expected digest 才写入。JSON 与 dry-run 均不创建锁或临时文件，二者不可同时使用。重复 start 保留已有身份；不得把现在采集的身份补写为历史执行身份。

确认 contract、impact scope、checks、test selection、before probes、catalog，以及 capture 后的真实 snapshot 后：

```bash
node scripts/record-evidence.js --project-root /absolute/project --workspace workspace/task --mode prepare --selection selection-unit --snapshot S1 --probes env-before --json
```

保存返回的 bindingDigest 到本轮执行结果信封。它绑定 task、契约/覆盖定义、impact scope、selection 定义（不含 runIds）、snapshot、before probes 和该 invocation 的技能身份。运行时所需 after probe 在执行结束后追加，仍由既有环境摘要与时序门禁核验。缺 after 不会通过。

prepare 也返回 coverageDigest。QA 必须从原始需求逐条检查 requirements 的完整性、check 的目标分支及方法，再将 digest、reviewer、ref 填入 `assurance.coverageReview`。不能仅拷贝摘要冒充语义复核。

## 2. 来源侧结构化结果

示例见 [verification-result.json](../assets/templates/verification-result.json)。它是输入格式模板，包含无效占位绑定，不能直接作为运行证据。

- id 唯一；purpose 为 acceptance/postfix/baseline；selectionId/snapshotId/probe IDs 必须指向当前获准运行。
- 原始适配结果必须明确 assertion（pass/fail/not_run/unknown）、executed（实际执行的断言/检查数）、runner 和 wrapper。echo-only、全 skip 的 executed=0。static 检查只记录实际执行的静态验证，不能冒充业务断言。
- runner/wrapper 各记录 status、exitCode、sourceRef。工具不是进程时，项目适配器可以把明确工具成功/失败映射到 0/非0，并在 sourceRef 说明映射；未知仍为 null。无 wrapper 显式 not_applicable/null 并说明依据。manual 可以 runner not_applicable；其他来源不可以。
- 缺 assertion/runner/wrapper 不自动补 pass；unknown 被诚实记录为 blocked，零检查为 not_run。wrapper 失败/未知或整体 runner 失败时，局部 pass 不能关闭 required。
- assertion fail 只有 runner 完整结束、wrapper 成功或明确不适用时，才有资格作为业务失败基线；setup 失败记 runner failed。
- observations 必须精确关联 check/case/output。outputPaths 为 workspace 相对普通文件；工具自动计算输出及导入信封的 SHA-256，仅哈希输出，不把内容读入状态。
- baseline 必须给出 fixIds，自动写 baselineRunIds；postfix/acceptance 自动写 check.evidenceIds；selection.runIds 同步追加。
- 执行参数也是证据，写入前移除凭据和敏感值。sanitized=true 是来源适配器的责任声明，不是工具已自动脱敏的证明。严格字段白名单拒绝任意 rawOutput 字段；禁止把未脱敏输出先落盘再清理。

## 3. 入账与派生摘要

```bash
node scripts/record-evidence.js --project-root /absolute/project --workspace workspace/task --mode import --input evidence/result-01.json --json
node scripts/record-evidence.js --project-root /absolute/project --workspace workspace/task --mode import --input evidence/result-01.json --expected-state-digest <stateDigest>
node scripts/record-evidence.js --project-root /absolute/project --workspace workspace/task --mode summary --json
node scripts/check-delivery.js --project-root /absolute/project --workspace workspace/task --mode assess --json
```

导入时重新核对绑定、源码与 probe 哈希；旧输入不能拿当前摘要重新盖章。自动摘要包含 task/invocation、claim、run 数、sourceDigest，summary 另给逐项检查和 readiness。它们均由状态派生；工具不自动确认 evidenceReview、不提高 claim、不关闭 finding。导入成功（exit 0）不表示验收通过。终态任务先由获准 resume 重开再追加运行。

同 ID 重复导入退出 1，状态保持不变，包括同内容重试；新运行使用新 ID，合法重跑可显式 supersedesRunIds 和 reason。基线不能被替换。

start/import 采用同目录独占锁、整个状态 CAS、临时文件原子替换；已有锁不抢占，异常中断后由 owner 查明没有活跃写入者再清理。保护协作工具写入，不宣称能防恶意篡改、未遵守锁的编辑器竞争或断电丢失。状态与输入均最多 256 KiB，追加后超限也拒绝；输出仅流式哈希，最多 1 GiB。

非法/缺值/重复/冲突参数及非法路径退出 2；读写失败、绑定冲突、重复 ID 退出 1；summary 未 ready 退出 1。所有模式不运行验证、不访问 URL、不更改源码/测试/fixture。保留来源复核和项目环境确认责任。

## 4. 升级与试点

2.0/2.1 的读取和判定语义保留。旧记录仍使用原版证据，不加 2.2 字段；新开任务使用 2.2。若必须升级一个历史任务，保留原档案，引用原决定建立新 invocation 和当前证据，不能只改 schemaVersion 后把旧摘要伪装为本次实测。

机械黑盒测试不等于独立 holdout。上线真实任务前按原评估方法冻结样本、成本及观察窗口；尚无成熟 pilot 数据时不宣称已提效或已降低逃逸缺陷。
