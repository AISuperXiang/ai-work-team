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
| `/team build <需求>` | 端到端需求交付 | `workflows/requirement-end-to-end.md` | 需求描述 | workspace 目录、PRD、价值门禁、决策日志、风险台账、交接记录、代码实现、验证、质量评分、交付 |
| `/team buildContext <工作目录> [需求/范围]` | 项目上下文构建 | `workflows/project-context-build.md` | 工作目录 | `AGENTS.md`、角色索引、技术上下文、约束和验证结果 |
| `/team bugfix <问题>` | 缺陷修复交付 | `workflows/bugfix-delivery.md` | 问题现象 | 根因、修复、回归、交付摘要 |
| `/team code-review <范围>` | 代码审查与优化 | `workflows/code-review-delivery.md` | 路径、diff、提交、PR 或模块 | 分级发现、修复计划、验证和交付摘要 |
| `/team walk <实现/页面/改动>` | 产品 UI QA 联合走查 | `workflows/product-ui-qa-walkthrough.md` | 实现上下文 | 走查报告、是否可交付 |
| `/team deliver <上下文>` | 产品 UI QA 联合走查 | `workflows/product-ui-qa-walkthrough.md` | 交付上下文 | 交付摘要、风险、后续建议 |
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
| “修这个 bug” | `/team bugfix` |
| “review 这段代码并优化” | `/team code-review` |
| “产品 UI 测试一起走查” | `/team walk` |
| “总结交付结果” | `/team deliver` |
| “安装推荐的前端设计 skill” | `/team install frontend-design` |
| “给前端工程师安装 React 最佳实践能力” | `/team install frontend-engineer React 最佳实践` |
| “我想解决 React 页面性能问题，有没有合适能力” | `/team install frontend-engineer React 页面性能` |
| “安装团队内置 external skills” | `/team install` |
| “注册本地 gh CLI 给研发和交付使用” | `/team register-cli github-cli --command "gh"` |
| “把公司内部发布 CLI 注册到团队能力里” | `/team register-cli <cli-id>` |

## 执行要求

1. 解析指令后读取目标工作流。
2. 读取 `workflows/execution-protocol.md` 和 `docs/methodologies/role-activation-methodology.md`，先形成 `rolePlan`。
3. 对 `/team build`、`/team bugfix` 和 `/team code-review` 读取 `docs/methodologies/execution-methodology.md`，记录执行档位与验证等级。
4. 对 `/team build` 读取 `workspace/README.md`、`workflows/implementation-protocol.md`、`docs/handoff-contract.md` 和 `docs/quality-rubrics.md`。
5. 对 `/team code-review` 读取 `docs/engineering-standards/review-standard.md`，先确认审查范围、领域角色和基线，再输出分级发现。
6. 对 `/team buildContext` 读取 `workflows/project-context-build.md`，并使用 `scripts/build-context.js` 扫描目标工作目录。
7. 对 `/team install` 读取 `workflows/external-skill-install.md`、`external-skills/catalog.json`、`external-skills/install-policy.md` 和 `external-skills/role-map.md`。
8. 对 `/team register-cli` 读取 `external-cli/README.md`，检查 CLI 是否可用，并创建或更新 `external-cli/<cli-id>.md` 能力卡。
9. 建立状态板和 `rolePlan`。
10. 仅加载 `rolePlan` 中 `active` 或 `consulted` 的成员文件与方法论。
11. 按阶段执行并检查质量门禁，包含 role activation、value、decision、handoff、complexity、evidence、verification 和 no-legacy 约束。
12. 代码落地场景必须写入 workspace 需求目录，并在项目代码中完成文件改动和验证。

## 失败处理

- 指令缺少输入：要求用户补充需求、PRD、问题或上下文。
- 指令未知：展示命令表并推荐最近似命令。
- 输入同时匹配多个工作流：优先选择命令指定工作流，不再二次猜测。
- `/team build` 未能确定项目根目录：先询问或探索，不能伪造实现结果。
- `/team code-review` 未提供范围：先读取当前未提交 diff；无 diff 时要求用户指定路径、提交或 PR。
- `/team buildContext` 未提供工作目录：询问用户提供代码仓库或工作区路径；不得默认扫描无关目录。
- `/team install` 未带参数：按 `external-skills/catalog.json` 安装内置 `recommended` 清单，跳过 `candidate`。
- `/team install` 带参数但未命中 catalog：展示 `/team install --list` 和可用角色，不安装未知来源 Skill。
- `/team register-cli` 缺少 `cli-id`、`--command`、`--roles` 或 `--capabilities`：要求用户补充，不创建不完整能力卡。
- `/team register-cli` 的验证命令不可用：说明阻塞原因，不伪造 CLI 能力。
