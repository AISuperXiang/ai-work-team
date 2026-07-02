# External Skills

`external-skills/` 用于维护 ai-work-team 推荐使用的外部优质开源 Skills。它不是把所有市场技能都装进来，而是建立一个可治理的能力资产库：先筛选、再映射角色、再通过 `/team install` 安装，最后由角色在自己的 SOP、方法论和工作流行动中按需使用。

## 目标

- 收集开源场景下高质量、可复用、可安装的 Skills。
- 将每个 Skill 映射到可能使用它的 `members/` 角色和典型任务。
- 支持 `/team install` 基于角色、任务或 skill id 推荐安装。
- 支持用户只描述问题时，由角色基于任务关键词匹配可用能力，而不是只按 role 粗过滤。
- 让工作流保持“Workflow 调度角色，Role 调度能力，Capability 完成行动，Context 传递结果”的结构。
- 避免角色为了某个具体功能重复沉淀低质量临时方法论。

## 文件结构

```text
external-skills/
├── README.md
├── catalog.json
├── install-policy.md
├── role-map.md
└── workflow-template.md
```

## 核心概念

| 概念 | 说明 |
| --- | --- |
| `catalog` | 可安装 Skill 清单，包含包名、来源、质量等级、适用角色和安装命令 |
| `role-map` | 从角色视角说明哪些场景可调用哪些外部 Skill |
| `install-policy` | 安装、升级、禁用和安全校验规则 |
| `workflow-template` | 定义“工作流调度角色，角色调度能力”的传递模板 |

## Catalog 字段

每个外部 Skill 条目必须包含以下治理字段：

| 字段 | 说明 |
| --- | --- |
| `reviewedAt` | 最近一次复审日期，用于定期检查来源和适用性 |
| `trustScore` | 0-1 可信度评分，综合来源、安装量、适配度和风险 |
| `lastInstallCheck` | 最近一次确认安装命令可用的日期 |
| `keywords` | 用于自然语言任务匹配的关键词 |
| `localSkillPriority` | 本地已安装同能力 Skill 的优先级与更新建议 |

## 使用入口

推荐由 `/team install` 触发：

```text
/team install
/team install frontend-engineer react 页面性能与最佳实践
/team install ui-designer 高质量前端视觉设计
/team install --list
/team install --dry-run frontend-design
```

也可以直接使用脚本：

```bash
node scripts/list-external-skills.js
node scripts/list-external-skills.js --role frontend-engineer
node scripts/list-external-skills.js frontend-engineer "React 页面性能"
node scripts/list-external-skills.js --query "高质量前端页面设计"
node scripts/install-external-skills.js --dry-run
node scripts/install-external-skills.js
node scripts/install-external-skills.js frontend-design --dry-run
node scripts/install-external-skills.js frontend-design
```

`node scripts/install-external-skills.js` 无参数时会按 `catalog.json` 批量处理所有 `recommended` 条目，跳过 `candidate`。检测到本地已有同能力 Skill 时，默认不安装外部版本，并输出固定结构提醒用户自行执行更新检查。

## 收录标准

- 优先官方、知名组织或高安装量来源。
- 必须有明确 install package，例如 `owner/repo@skill`。
- 必须声明适用角色、典型场景、安装命令和风险。
- 默认只安装 `qualityTier` 为 `recommended` 的条目。
- `candidate` 条目只能提示人工评估，不自动安装。

## 角色使用原则

1. 工作流只定义阶段、行动、输入和输出，不直接把外部 Skill 写死为唯一实现。
2. 成员在处理行动时，先根据自身方法论判断是否需要外部 Skill。
3. 若需要，成员从 `external-skills/catalog.json` 和 `role-map.md` 选择能力；任务不明确时先用 `node scripts/list-external-skills.js --query "<task>"` 做能力匹配。
4. 交付经理负责汇总外部 Skill 使用情况、安装结果、验证和风险。
5. 若命中本地已安装同能力 Skill，默认优先本地能力，并提醒用户判断该 Skill 是否最新；如存在更新，建议先更新本地能力后再决定是否安装外部版本。

## 维护规则

- 新增条目时先更新 `catalog.json`。
- 同步更新 `role-map.md`，明确可能使用的角色。
- 若条目改变安装策略，更新 `install-policy.md`。
- 修改后运行 `npm test`。
