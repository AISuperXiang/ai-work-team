# Members

本目录维护专家团队成员定义。工作流只加载它声明需要的成员文件，避免一次性加载全部角色上下文。

## 成员文件约定

每个成员文件必须包含 YAML frontmatter：

```yaml
---
id: product-manager
name: 产品经理
role: product
when_to_load:
  - 需求澄清
primary_outputs:
  - PRD
quality_gates:
  - requirement-gate
---
```

正文必须包含：

- 职责边界
- 场景判断
- 方法论
- 输入
- 输出
- 工作逻辑
- 可调用外部 Skills（如适用）
- 检查清单
- 升级条件
- 不可做事项

## 当前成员

| 成员 | 文件 | 主要职责 |
| --- | --- | --- |
| 产品经理 | `product-manager.md` | 需求澄清、范围裁剪、PRD、验收标准 |
| 运营经理 | `operations-manager.md` | 业务目标、运营策略、上线节奏、指标 |
| UI 设计师 | `ui-designer.md` | 信息架构、交互、视觉走查、可用性 |
| 技术负责人 | `tech-lead.md` | 技术方案、架构边界、风险、实现计划 |
| 前端工程师 | `frontend-engineer.md` | 前端实现、状态/UI/集成验证 |
| 后端工程师 | `backend-engineer.md` | 接口、数据模型、服务边界、兼容性 |
| 测试工程师 | `qa-engineer.md` | 测试策略、用例、回归、缺陷闭环 |
| 交付经理 | `delivery-manager.md` | 流程监控、风险同步、交付摘要 |

## 引用规则

- 工作流 frontmatter 的 `members` 必须引用本目录中的 `id`，但只表示候选池。
- 每次执行先按 `docs/methodologies/role-activation-methodology.md` 将角色标记为 `active`、`consulted` 或 `not_applicable`，并记录理由。
- 角色之间冲突时，由 `delivery-manager` 汇总问题并要求决策。
- 成员只对自己的职责域给结论，不跨域替其他角色做最终判断。
- 角色调用外部 Skill 时，必须先参考 `external-skills/role-map.md`，并把外部输出转成自身职责域内可执行、可验证的上下文。
