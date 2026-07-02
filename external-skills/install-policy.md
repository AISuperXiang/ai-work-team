# External Skills Install Policy

## 安装原则

`/team install` 只安装 `external-skills/catalog.json` 中已收录的外部 Skill。未收录的市场结果必须先进入候选评估，不得直接安装。

## 默认策略

- 默认只安装 `qualityTier: recommended` 的条目。
- `qualityTier: candidate` 只能展示推荐原因和安装命令，不自动安装。
- 每个条目必须维护 `reviewedAt`、`trustScore`、`lastInstallCheck`，用于定期复审和安装前判断。
- 每个条目必须维护 `keywords`，用于从自然语言任务中匹配能力。
- 每个条目必须维护 `localSkillPriority`，用于处理本地已安装 Skill 与外部 Skill 的优先级。
- 安装命令统一使用：

```bash
npx skills add <owner/repo@skill> -g -y
```

- 安装前必须说明：
  - Skill 名称与来源。
  - 适用角色。
  - 适用场景。
  - 与本地已安装 Skill 是否重叠。
  - 安装后如何验证。

## 安全边界

- 不安装来源不明、安装量极低且缺少用途说明的 Skill。
- 不执行 catalog 之外的任意 shell 片段。
- 不把外部 Skill 当作事实权威；角色仍需结合项目上下文判断。
- 对安全、支付、凭据、权限、生产运维场景，外部 Skill 只能辅助审查，不替代本地安全标准和人工确认。

## 安装决策

| 输入 | 行为 |
| --- | --- |
| `/team install --list` | 列出 catalog 全部条目 |
| `/team install` | 按 catalog 批量处理所有 `qualityTier: recommended` 条目，跳过 candidate |
| `/team install <skill-id>` | 安装指定 recommended Skill，candidate 只输出提示 |
| `/team install <role-id> <task>` | 根据角色和任务关键词打分匹配 Skill，再安装 recommended 条目 |
| `/team install --dry-run <...>` | 只输出匹配结果和安装命令，不执行安装 |

## 能力匹配

当用户没有显式输入 `/team install`，只是描述“我要解决什么问题”时，角色可以在方案、实现、测试等阶段用同一套匹配规则判断是否需要外部能力：

```bash
node scripts/list-external-skills.js --query "React 页面性能"
node scripts/list-external-skills.js frontend-engineer "React 页面性能"
```

匹配信号包括：

- 角色 `roles`。
- 任务关键词 `keywords`。
- 典型场景 `scenarios`。
- 适用条件 `useWhen`。
- 不适用条件 `doNotUseWhen`，命中时会降低得分。
- `qualityTier` 和 `trustScore`。

## 冲突处理

- 如果本地已有同名或同能力 Skill，优先使用本地 Skill，并提示是否仍需安装外部版本。
- 如果本地已有同能力 Skill，必须提醒用户判断该 Skill 是否为最新。
- 本地已有同能力 Skill 时，脚本必须输出固定结构：`Status`、`Reason`、`Local installed`、`Update check`、`Update advice`、`User action`，并默认跳过外部安装。
- 如果 `npx skills check` 或本地来源提示有更新，建议先更新本地 Skill，再决定是否安装外部版本。
- 需要强制安装外部版本时，脚本必须显式使用 `--force-external`。
- 如果多个 recommended Skill 命中同一任务，默认只推荐最匹配的 1-2 个，避免能力堆叠。
- 如果安装失败，记录失败命令、失败原因和替代方案。

## 定期复审

- `reviewedAt`：最近一次人工或半自动质量复审日期。
- `trustScore`：0-1 分，综合来源可信度、安装量、适用性和与本地能力重叠程度。
- `lastInstallCheck`：最近一次确认安装命令和市场链接有效的日期。
- 建议每 90 天复审一次；超过复审窗口时，`/team install` 应提示先复核再安装。

## 验证要求

安装后至少执行：

```bash
npx skills check
```

若当前任务会马上使用该 Skill，还需要在交付摘要中记录：

- 使用了哪个外部 Skill。
- 由哪个角色调用。
- 输入上下文是什么。
- 输出如何被当前工作流吸收。
