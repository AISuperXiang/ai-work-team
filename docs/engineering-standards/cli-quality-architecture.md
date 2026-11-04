# CLI Quality Architecture

本文定义 `ai-work-team` Node CLI 的输入、文件写入、行为测试、突变测试和持续集成架构。修改 `scripts/*.js`、测试命令或 CI 时必须遵守。

## 1. 严格参数契约

- CLI 使用 `scripts/cli-args.js` 解析参数。
- 未知参数、缺值、重复参数和冲突参数必须输出明确错误并退出 `2`。
- 不得忽略拼错的 flag，也不得从错误参数退化到默认批量行为。
- 外部 Skill 批量安装只允许：
  - 真正零参数的既有默认模式。
  - 单独 `--dry-run` 的批量预览模式。
  - 显式 `--all` 模式。
- `--force-external` 和 `--allow-candidate` 无 selector 时必须配合 `--all`。
- 子进程必须使用参数数组和 `shell: false`，不得拼接 shell 命令。

## 2. 文件写入边界

- 用户提供的输出路径必须是目标根目录内的相对路径。
- 拒绝绝对路径、`..` 路径穿越、父目录 symlink 越界和输出文件 symlink。
- 仅允许写普通文件；父目录必须已存在。
- 已有受管文件超过 256 KiB 时失败关闭，不能把读取失败当成空文件。
- dry-run 和 JSON 模式不得产生文件写入。
- 更新带受管 marker 的文件时必须保留 marker 外的人工内容，并保证重复执行幂等。
- `init-task.js` 只创建一个新的 `workflow-status.json`；相同状态幂等返回，冲突或无效状态不得隐式 repair/overwrite。
- `audit-workspaces.js` 必须全程只读，递归主任务与 `features/*`/`implementation` 子任务，不跟随 symlink，也不把结构健康表述为交付 readiness。

只读证据检查还必须：

- 复用 `scripts/safe-files.js` 统一执行路径、symlink、文件类型、大小和稳定读取检查。
- 以调用者显式提供且 realpath 后的 project root 为边界，只读取状态 manifest 中的相对普通文件。
- 拒绝凭据路径、路径穿越、反斜杠、控制字符、父目录/目标 symlink 和非普通文件。
- 对状态设置 256 KiB 上限；大证据只流式哈希，不读取到状态或模型。
- capture/assess、普通/JSON 输出均零写入，不执行状态中的命令或访问证据 URL。

2.2 证据入账器遵循 [evidence-recording](../evidence-recording.md)：start/import 是显式写操作，
必须校验整个状态 expected digest 并持有独占锁，单文件原子替换；prepare/summary 与所有
JSON/dry-run 零写入。导入必须匹配执行前绑定，分离 assertion/runner/wrapper，来源侧先脱敏；
不执行 argv、不自动提高 claim。锁只保护协作写入，不承诺对未守锁编辑器或断电的事务性。

只读 Skill 评估器还必须：

- 只读取当前工作目录内显式相对 JSON，拒绝 symlink、越界、重复参数和超过 256 KiB 的输入。
- 不运行 Agent、不访问隐藏 oracle、不回写评估结果。
- answer leakage、候选关键错误和未成熟逃逸观察不得被平均分或耗时改善覆盖。

## 3. 行为测试

- 使用 Node 内置 `node:test` 与 `node:assert`，不为当前 CommonJS CLI 引入测试框架依赖。
- 黑盒测试通过 `process.execPath` 启动真实 CLI。
- 外部安装测试必须在临时 `PATH` 中使用 fake `npx`，禁止访问网络或修改真实全局环境。
- 文件测试使用 `mkdtempSync` 创建临时目录，结束后递归清理。
- 必须覆盖正常、异常、边界和副作用路径，不能用断言数量代替关键行为。
- `npm test` 必须包含结构、核心契约和行为测试。

## 4. 突变门禁

- `npm run test:mutation` 在隔离副本中执行定向 mutant。
- 总体 mutation score 必须不低于 85%。
- 以下关键 mutant 存活数必须为 0：
  - 未知参数与缺值绕过。
  - 输出目录、symlink 和大文件保护绕过。
  - candidate、dry-run、隐式批量与子进程退出码绕过。
  - 核心 contracts 重新扫描历史 workspace。
  - 三个核心 CLI 被替换为直接成功退出。
  - workspace audit 缺口退出码或 symlink 范围被绕过。
  - workspace init 的 preview 零写入、已有状态保护、目录绑定或入口 kill switch 被绕过。
- 新增关键分支时必须同步增加 mutant 或说明已有 mutant 如何覆盖。
- 交付控制的关键 mutant 还包括：忽略契约 digest/保留项、STALE 或 skip 当 PASS、
  open P1 仍接受、旧版本降级、路径校验绕过、verify/deliver 动作越权、
  impact scope 缺口、环境 probe 失配和 check-delivery 直接成功。
- 测试选择回退到 working tree、catalog 非健康被放行、finding 撤回缺反证、
  answer leakage 被接纳、候选关键错误被平均掉和 evaluate-skill 直接成功。
- 2.2 定向 mutant 覆盖未知 wrapper/零断言通过、旧绑定导入、状态 CAS/锁/只读保护、
  coverage 漏项、SSR 方法冒充、消费者样本/检查缺口和 record-evidence 直接成功。

## 5. 契约校验边界

- `npm run validate:contracts` 只校验可发布核心、模板和规范，不扫描历史 workspace 状态。
- `npm run validate:workspaces` 显式扫描全部 workspace。
- `npm run workspace:audit -- --root <project>` 对任意项目做递归库存/结构审计；与只扫描 Skill 归档的 `validate:workspaces` 分工独立。
- 单目录审计使用：

```bash
node scripts/validate-contracts.js --workspace workspace/<requirement-folder>
```

- 核心门禁与历史交付物审计不得互相掩盖失败。

## 6. 持续集成

- Node 18.20.8、20.20.2、22.22.2 必须分别执行 `npm test`。
- 三个版本均为阻塞门禁，不允许 `continue-on-error`。
- Node 22 单独执行 mutation，避免在矩阵中重复高成本任务。
- 测试结束后工作树必须无新增文件。
- 当前项目无运行依赖和 lockfile，CI 不执行无意义的 `npm ci`；新增依赖后必须提交 lockfile 并切换到可复现安装。

## 7. 变更同步

修改本架构时同步检查：

- `AGENTS.md`
- `README.md` 与 `README_EN.md`
- `scripts/README.md`
- `package.json`
- `.github/workflows/ci.yml`
- `skill-runtime.json`
- 结构与契约校验规则
