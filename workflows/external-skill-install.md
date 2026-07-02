---
id: external-skill-install
title: 外部优质 Skill 安装
triggers:
  - /team install
  - 安装外部 Skill
  - 推荐开源 Skill
commands:
  - /team install
members:
  - delivery-manager
  - tech-lead
execution_mode: sequential
quality_gates:
  - delivery-gate
outputs:
  - external-skill-recommendation
  - install-result
  - role-skill-context
---

# 外部优质 Skill 安装

## 适用场景

用户希望根据当前角色、任务或具体 skill id，从 `external-skills/catalog.json` 中选择并安装 ai-work-team 推荐的外部优质开源 Skill。

当用户只执行 `/team install`，不带明确 skill id、角色或任务时，按 `external-skills/catalog.json` 中内置的 `qualityTier: recommended` 清单批量处理，语义类似 `pnpm install`：根据项目配置安装声明过的外部优质 Skill。

当用户没有显式输入 `/team install`，只是描述要解决的问题时，角色也可以在自己的阶段使用同一套能力匹配规则，判断是否存在更适配的外部 Skill；但安装动作仍必须由明确的 `/team install` 或用户授权触发。

## 输入契约

支持以下输入：

- `/team install --list`：列出当前 catalog。
- `/team install`：批量处理 catalog 内置 recommended 清单，candidate 不自动安装。
- `/team install <skill-id>`：安装指定 Skill。
- `/team install <role-id> <task>`：按角色和任务关键词打分匹配 Skill。
- `/team install --dry-run <...>`：只输出推荐和安装命令，不执行安装。

## 阶段表

| 阶段 | 负责人 | 动作 | 产出 | 门禁 |
| --- | --- | --- | --- | --- |
| Parse | 交付经理 | 解析参数、角色、任务、dry-run 和 list 模式 | 请求摘要 | delivery-gate |
| Match | 技术负责人 | 读取 `external-skills/catalog.json` 和 `role-map.md`，按 role、task、keywords、scenarios、useWhen 打分匹配 | 推荐清单 | delivery-gate |
| Risk Check | 技术负责人 | 按 `install-policy.md` 判断 qualityTier、trustScore、reviewedAt、lastInstallCheck、本地同能力 Skill 和风险 | 安装决策 | delivery-gate |
| Install | 交付经理 | 对 recommended 条目执行安装；dry-run 只输出命令 | 安装结果 | delivery-gate |
| Context Handoff | 交付经理 | 说明安装后哪些角色、阶段、行动可调用该 Skill | role-skill-context | delivery-gate |

## 执行规则

1. 必须先读取：
   - `external-skills/catalog.json`
   - `external-skills/install-policy.md`
   - `external-skills/role-map.md`
2. 不安装 catalog 之外的 Skill。
3. `candidate` 条目默认不安装，只输出原因和人工确认建议。
4. 安装命令优先使用脚本：

```bash
node scripts/install-external-skills.js
node scripts/install-external-skills.js --dry-run
node scripts/install-external-skills.js <skill-id>
node scripts/install-external-skills.js <role-id> "<task>"
```

5. 列表和匹配优先使用：

```bash
node scripts/list-external-skills.js --role <role-id>
node scripts/list-external-skills.js --query "<task>"
node scripts/list-external-skills.js <role-id> "<task>"
```

6. 若脚本检测到本地已安装同能力 Skill：
   - 默认优先本地能力，不重复安装外部 Skill。
   - 必须按固定结构输出本地命中、更新检查命令和用户操作提醒。
   - 如果 `npx skills check` 或本地来源提示有更新，建议先更新本地 Skill。
   - 只有显式使用 `--force-external` 或用户确认时，才安装外部版本。
7. 安装后运行：

```bash
npx skills check
```

若环境无法运行 `npx skills`，说明阻塞原因，并输出可手动执行的安装命令。

## 完成定义

- 推荐条目、安装决策和风险说明明确。
- 推荐条目包含匹配得分、命中关键词、trustScore 和复审信息。
- 安装命令执行成功，或 dry-run 明确未执行。
- 已说明该外部 Skill 将由哪些角色在哪些行动中使用。
- 交付摘要包含安装结果和后续使用建议。

## 失败处理

- 未命中 Skill：列出可用角色和 `--list` 用法。
- 匹配到 candidate：停止安装，要求用户确认后再执行。
- 安装失败：记录命令、错误摘要、可重试命令和替代方案。
- 本地已有重叠 Skill：优先说明重叠关系，不默认重复安装。
