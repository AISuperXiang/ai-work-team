# Workflow Capability Template

本模板定义 ai-work-team 的推荐调度模型：

```text
Workflow 调度角色
Role 调度能力
Capability 处理行动
Context 传递结果
Workflow 汇总目标结果
```

## 模板结构

| 层级 | 职责 | 产物 |
| --- | --- | --- |
| Workflow | 定义阶段、负责人、输入、输出和门禁 | 阶段表、状态板、质量门禁 |
| Role | 根据自身职责、SOP、方法论和可用 Skills 判断行动方式 | 角色结论、风险、下一步 |
| Capability | 外部 Skill、本地 Skill、脚本、工具或方法论 | 具体分析、代码、测试、设计建议 |
| Context | 把行动结果转成下个角色可消费上下文 | 决策、约束、证据、开放问题 |
| Delivery | 汇总多角色结果并验证目标达成 | 交付摘要、评分、风险 |

## 能力匹配模板

当用户没有明确使用 `/team install`，只是描述“我要解决什么问题”时，角色可以在自己的阶段先执行能力匹配：

```text
用户问题：
当前角色：
当前阶段：
任务关键词：
候选 Skills：
本地同能力 Skill：
是否需要安装：
是否需要更新本地 Skill：
传递给下游的 Context：
```

推荐脚本：

```bash
node scripts/list-external-skills.js --query "<task>"
node scripts/list-external-skills.js <role-id> "<task>"
```

匹配结果只用于辅助角色判断。安装外部 Skill 仍需要明确的 `/team install` 或用户授权。

## 工作流阶段模板

```text
阶段：
负责人：
输入：
行动：
可调用能力：
上下文传递：
门禁：
产出：
```

## 示例：UI 到前端实现

```text
阶段：UI/UX
负责人：ui-designer
输入：PRD、用户故事、验收标准
行动：设计信息架构、状态覆盖、视觉方向
可调用能力：frontend-design
上下文传递：UI 约束、状态矩阵、响应式要求、视觉风险
门禁：design-gate
产出：ui-review.md

阶段：Implementation
负责人：frontend-engineer
输入：ui-review.md、technical-design.md、项目代码
行动：按现有架构实现 UI 与交互
可调用能力：vercel-react-best-practices、frontend-design
上下文传递：实现说明、验证结果、剩余 UI 风险
门禁：implementation-gate、test-gate
产出：代码改动、verification-result
```

## Context 传递规则

- 上游角色必须把结论转成可执行约束，不传递抽象口号。
- 外部 Skill 的输出必须被角色消化后再进入工作流，不直接原样交给下游。
- 下游角色可以拒绝不可执行、不可验证或跨职责越界的输出。
- 交付经理记录每次外部 Skill 调用的原因、输入、输出和风险。

## 能力选择规则

1. 先使用本地已安装且更贴合组织环境的 Skill。
2. 如果本地已有同能力 Skill，先提醒用户判断是否最新；如有更新，建议先更新本地 Skill。
3. 本地 Skill 不覆盖时，再从 `external-skills/catalog.json` 选择。
4. 命中多个能力时，选择对当前阶段最小充分的能力。
5. 外部 Skill 输出必须通过对应质量门禁，不得绕过工作流。

## 扩展点

- 可以为每类问题维护专属 workflow template，例如：
  - 前端 UI 交付模板。
  - 后端接口交付模板。
  - 安全审查模板。
  - 测试补强模板。
  - 增长实验模板。
- 每个模板只声明角色行动和上下文契约，不写死具体 Skill，避免能力库更新导致工作流失效。
