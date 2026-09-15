# Commands

本目录维护 `/team` 快捷指令和自然语言触发规则。

## 使用方式

用户可以直接输入：

```text
/team build 做一个会员续费页
/team buildContext <project-root> 为后续需求建立项目上下文
/team review 评审这份 PRD
/team goal-design 根据这个目标生成 PRD、自治契约和评审后的技术方案
/team bugfix 修复订单提交失败
/team resume workspace/20260915-order-fix
/team verify workspace/20260915-order-fix target-check,preserve-check
/team code-review 当前 diff --mode delta
/team code-review workspace/20260915-order-fix --mode recheck --findings F1,F2
/team walk 走查这个页面改动
/team install
/team install frontend-design
/team register-cli github-cli --command "gh" --roles "tech-lead,delivery-manager" --capabilities "查询和管理 GitHub issue、PR、release"
```

Agent 也可以在自然语言命中时自动路由，例如“帮我承接这个需求并实现”会进入端到端需求交付。
“根据这个目标先完善需求，再给出可控迭代的技术方案”会进入 `/team goal-design`；该流程只产出等待用户批准的设计包，不直接编码。
外部能力安装类输入，例如“给前端工程师安装 React 最佳实践 Skill”，会进入 `/team install`。仅输入 `/team install` 时，按项目内置 external skills catalog 批量处理 recommended 条目。
本地 CLI 能力注册类输入，例如“注册本地 gh CLI 给研发和交付使用”，会进入 `/team register-cli`，并在 `external-cli/` 下生成或更新能力卡。

## 路由优先级

1. 明确 `/team` 指令优先。
2. `resume`、`verify`、`recheck` 等受限操作语义优先于 bug、review 等领域关键词。
3. 没有指令时读取 `workflows/route-table.md`。
4. 命中多个工作流时选择更具体的工作流。
5. 无法判断时由交付经理给出候选并询问。

详细命令见 [`team.md`](team.md)。
