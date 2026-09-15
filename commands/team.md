---
id: team
title: /team 快捷指令
triggers:
  - /team
members:
  - delivery-manager
execution_mode: sequential
---

# /team 快捷指令

## 命令表

| 指令 | 工作流 | 文件 | 必需输入 | 默认输出 |
| --- | --- | --- | --- | --- |
| `/team intake <需求>` | 需求评审 | `workflows/requirement-review.md` | 需求描述 | 需求简报、缺口、推荐工作流 |
| `/team review <需求/PRD>` | 需求评审 | `workflows/requirement-review.md` | 需求或 PRD | 评审结论、风险、下一步 |
| `/team design <需求>` | 技术方案评审 | `workflows/technical-design-review.md` | 需求和约束 | 技术方案、实现计划、测试策略 |
| `/team goal-design <目标>` | 目标驱动技术方案 | `workflows/goal-driven-technical-design.md` | 目标；可选项目路径和约束 | PRD、需求/UI 评审、四类自治 Schema、评审后技术方案、用户决策摘要 |
| `/team build <需求>` | 端到端需求交付 | `workflows/requirement-end-to-end.md` | 需求描述 | workspace、权威状态、必要方案/决策、代码实现、验证、风险和交付视图 |
| `/team buildContext <工作目录> [需求/范围]` | 项目上下文构建 | `workflows/project-context-build.md` | 工作目录 | `AGENTS.md`、角色索引、技术上下文、约束和验证结果 |
| `/team bugfix <问题>` | 缺陷修复交付 | `workflows/bugfix-delivery.md` | 问题现象 | 根因、修复、回归、交付摘要 |
| `/team resume <任务>` | 原工作流续跑 | `workflows/execution-protocol.md` | task ID 或 workspace 路径 | 变化核对、必要阶段、续跑结果 |
| `/team verify <任务> [check IDs]` | 仅验证 | `workflows/execution-protocol.md` | task ID 或 workspace 路径；可选 check ID | 缺失/失败/失效检查结果，不修改业务代码 |
| `/team code-review <范围> [--mode initial\|delta\|recheck] [--findings F1,F2]` | 代码审查与优化 | `workflows/code-review-delivery.md` | 路径、diff、提交、PR 或模块；recheck 需 finding ID | 分级发现、本轮/继承/缺口范围、验证和交付摘要 |
| `/team walk <实现/页面/改动>` | 产品 UI QA 联合走查 | `workflows/product-ui-qa-walkthrough.md` | 实现上下文 | 走查报告、是否可交付 |
| `/team deliver <任务>` | 交付结果汇总 | `workflows/delivery-summary.md` | task ID 或 workspace 路径 | 基于有效证据的交付摘要、风险、后续建议 |
| `/team install [skill-id\|role task]` | 外部优质 Skill 安装 | `workflows/external-skill-install.md` | 可为空；为空时安装 catalog 内置 recommended 清单 | 匹配得分、推荐清单、安装结果、角色能力上下文 |
| `/team register-cli <cli-id> --command "<cmd>" --roles "<roles>" --capabilities "<summary>"` | 外部本地 CLI 能力注册 | `external-cli/README.md` | CLI id、命令、适用角色、能力概述 | `external-cli/<cli-id>.md` 能力卡、验证结果、角色使用边界 |
| `/team status` | 当前工作流状态 | `workflows/execution-protocol.md` | 当前上下文 | 状态板 |

## 自然语言触发

| 用户说法 | 等价指令 |
| --- | --- |
| “承接这个需求并实现” | `/team build` |
| “给这个项目生成 AGENTS.md 上下文” | `/team buildContext` |
| “帮我评审这个需求” | `/team review` |
| “先出技术方案” | `/team design` |
| “根据这个目标先完善需求并出可控迭代的技术方案” | `/team goal-design` |
| “给我目标驱动的 PRD、自治契约和评审后技术方案” | `/team goal-design` |
| “修这个 bug” | `/team bugfix` |
| “继续上次任务”“从中断处继续” | `/team resume` |
| “只验证，不改代码”“仅复跑失败项” | `/team verify` |
| “review 这段代码并优化” | `/team code-review` |
| “只看上轮以后改了什么” | `/team code-review --mode delta` |
| “只复核 F1、F2” | `/team code-review --mode recheck --findings F1,F2` |
| “产品 UI 测试一起走查” | `/team walk` |
| “总结交付结果” | `/team deliver` |
| “安装推荐的前端设计 skill” | `/team install frontend-design` |
| “给前端工程师安装 React 最佳实践能力” | `/team install frontend-engineer React 最佳实践` |
| “我想解决 React 页面性能问题，有没有合适能力” | `/team install frontend-engineer React 页面性能` |
| “安装团队内置 external skills” | `/team install` |
| “注册本地 gh CLI 给研发和交付使用” | `/team register-cli github-cli --command "gh"` |
| “把公司内部发布 CLI 注册到团队能力里” | `/team register-cli <cli-id>` |

## 执行要求

`build`、`bugfix`、`resume`、`verify`、`code-review`、`walk`、`deliver`
加载 [`delivery-controls.md`](../docs/delivery-controls.md)：
实现前确认有效契约，修复时验证原反例与保留路径，交付时汇总同一 v2.1 状态的测试选择、catalog 健康和逐项执行证据。
review-only 的 `analysis_complete` 只表示报告完成，不表示被审代码通过；
获准进入 Optimize 时将 taskMode 切为 implementation 并补齐 fix 对照记录。

1. 解析指令后读取目标工作流。
2. `resume`、`verify`、`code-review --mode ...` 和 `deliver` 先记录 invocation；
   操作语义优先于问题关键词，不能把“只复核 bug”误路由为修改代码。
3. 读取 `workflows/execution-protocol.md` 和 `docs/methodologies/role-activation-methodology.md`，先形成 `rolePlan`。
4. 对 `/team build`、`/team bugfix` 和 `/team code-review` 读取 `docs/methodologies/execution-methodology.md`，记录执行档位与验证等级。
5. 对 `/team goal-design` 读取 `workflows/goal-driven-technical-design.md`、`docs/methodologies/goal-driven-technical-design-methodology.md`、`docs/quality-gates.md`、`docs/handoff-contract.md`、四类 Schema 和对应模板。
6. `/team goal-design` 必须创建 workspace，从目标依次完成 Goal Contract、PRD、需求评审、条件式 UI 评审、技术设计、技术评审、跨角色回审、方案修订和用户决策交接。
7. `/team goal-design` 不进入代码实现；最终结论必须写明“方案已评审，等待用户批准执行”，批准后才进入 `/team build`。
8. 对 `/team build` 读取 `workspace/README.md`、`workflows/implementation-protocol.md`、`docs/handoff-contract.md` 和 `docs/quality-rubrics.md`。
9. 对 `/team code-review` 读取 `docs/engineering-standards/review-standard.md` 和
   `docs/engineering-standards/behavior-impact-standard.md`，明确 requested/reviewed/inherited/gaps。
10. 运行集成、浏览器或真实环境验证时读取
    `docs/engineering-standards/verification-environment-standard.md`，优先复用项目声明的 Gateway、runner 和资源锁。
11. 对 `/team buildContext` 读取 `workflows/project-context-build.md`，并使用 `scripts/build-context.js` 扫描目标工作目录。
12. 对 `/team install` 读取 `workflows/external-skill-install.md`、`external-skills/catalog.json`、`external-skills/install-policy.md` 和 `external-skills/role-map.md`。
13. 对 `/team register-cli` 读取 `external-cli/README.md`，检查 CLI 是否可用，并创建或更新 `external-cli/<cli-id>.md` 能力卡。
14. 建立状态板和 `rolePlan`。
15. 仅加载 `rolePlan` 中 `active` 或 `consulted` 的成员文件与方法论。
16. 按阶段执行并检查质量门禁，包含 role activation、value、decision、handoff、complexity、evidence、verification 和 no-legacy 约束。
17. 代码落地场景必须写入 workspace 需求目录，并在项目代码中完成文件改动和验证。

## 失败处理

- 指令缺少输入：要求用户补充需求、PRD、问题或上下文。
- 指令未知：展示命令表并推荐最近似命令。
- 输入同时匹配多个工作流：优先选择命令指定工作流，不再二次猜测。
- `/team goal-design` 缺少目标：要求用户提供目标或期望改变的结果；不得把空目标扩写成 PRD。
- `/team goal-design` 未提供项目路径：允许输出绿色项目方案或技术 spike，但必须标记代码、接口和运行环境假设，不得伪造现状。
- `/team goal-design` 达到最大方案评审轮数仍不收敛：停止自动修订，输出冲突、证据和最多 3 个用户决策项。
- `/team build` 未能确定项目根目录：先询问或探索，不能伪造实现结果。
- `/team resume` 找到多个候选任务：不得按目录时间自动选择；先用 task ID、显式路径和当前会话关联消歧。
- `/team resume` 上轮命令是否完成不明：先检查文件、进程和完整结果，不重放可能产生副作用的命令。
- `/team verify` 的检查失败：记录失败分类和下一动作，不修改源码、测试期望或 fixture；需要修复时等待明确授权。
- `/team code-review` 未提供范围：先读取当前未提交 diff；无 diff 时要求用户指定路径、提交或 PR。
- `/team code-review --mode delta` 缺少可信上轮 review：降级为 initial 或明确缺口，不伪装成增量覆盖。
- `/team code-review --mode recheck` 缺 finding ID：只展示未关闭 finding 供选择，不启动全量审查。
- `/team deliver` 存在失效证据或未关闭 required 项：只汇总为 review/blocked，不顺便启动全测或修复。
- `/team buildContext` 未提供工作目录：询问用户提供代码仓库或工作区路径；不得默认扫描无关目录。
- `/team install` 未带参数：按 `external-skills/catalog.json` 安装内置 `recommended` 清单，跳过 `candidate`。
- `/team install` 带参数但未命中 catalog：展示 `/team install --list` 和可用角色，不安装未知来源 Skill。
- `/team register-cli` 缺少 `cli-id`、`--command`、`--roles` 或 `--capabilities`：要求用户补充，不创建不完整能力卡。
- `/team register-cli` 的验证命令不可用：说明阻塞原因，不伪造 CLI 能力。
