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
- 新增关键分支时必须同步增加 mutant 或说明已有 mutant 如何覆盖。

## 5. 契约校验边界

- `npm run validate:contracts` 只校验可发布核心、模板和规范，不扫描历史 workspace 状态。
- `npm run validate:workspaces` 显式扫描全部 workspace。
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
