---
id: project-context-build
title: 项目上下文构建
triggers:
  - /team buildContext
  - 构建项目上下文
  - 生成 AGENTS.md
commands:
  - /team buildContext
members:
  - delivery-manager
  - tech-lead
  - frontend-engineer
  - backend-engineer
  - ui-designer
  - qa-engineer
execution_mode: sequential
quality_gates:
  - technical-gate
  - delivery-gate
outputs:
  - agents-context
  - role-context-index
  - technical-context-summary
---

# 项目上下文构建

## 适用场景

用户希望对一个工作目录建立 Agent 可复用上下文，使后续 `/team build`、`/team design`、`/team bugfix` 能更准确地理解项目技术栈、目录组织、依赖、样式规范、状态管理和角色职责边界。

目标目录可以是代码仓库，也可以是 workspace 中的局部工程目录。

## 输入契约

支持以下输入：

```text
/team buildContext <工作目录> <用户需求或更新范围>
/team buildContext /path/to/repo 为后续会员页需求建立上下文
/team buildContext ./workspace/demo --dry-run
```

最小输入：

- 工作目录。

可选输入：

- 用户需求或更新范围。
- dry-run 模式。

## 执行策略

1. 若目标目录已有 `AGENTS.md`：
   - 保留人工维护内容。
   - 只更新 `<!-- ai-work-team:buildContext:start -->` 到 `<!-- ai-work-team:buildContext:end -->` 的管理区块。
   - 若无管理区块，则追加一个 ai-work-team 管理区块。
2. 若目标目录没有 `AGENTS.md`：
   - 根据静态扫描结果创建初始 `AGENTS.md`。
3. 静态扫描必须覆盖：
   - monorepo 配置：`pnpm-workspace.yaml` 和 `package.json workspaces`。
   - workspace 子包 package 列表和按 package 聚合的技术栈矩阵。
   - 包管理器、构建配置、测试配置。
   - `package.json` 依赖和 scripts。
   - 前端框架、状态管理、UI 组件库、样式方案。
   - 后端语言、服务框架、接口/服务目录。
   - 测试框架、测试目录和验证命令。
   - 目录组织规范。
4. 根据扫描结果识别相关角色：
   - `frontend-engineer`
   - `backend-engineer`
   - `ui-designer`
   - `qa-engineer`
   - `tech-lead`
5. 输出内容必须服务后续工作流上下文传递，不替代真实代码阅读。

## 阶段表

| 阶段 | 负责人 | 动作 | 产出 | 门禁 |
| --- | --- | --- | --- | --- |
| Parse | 交付经理 | 解析工作目录、需求范围和 dry-run | 请求摘要 | delivery-gate |
| Scan | 技术负责人 | 静态扫描目录、配置、依赖、scripts 和结构 | 技术上下文摘要 | technical-gate |
| Role Detection | 技术负责人 | 判断目录涉及的角色和上下文需求 | role-context-index | technical-gate |
| Context Build | 前端/后端/UI/QA | 将技术栈、样式、状态、测试、目录规范转成 Agent 可用上下文 | AGENTS.md 管理区块 | technical-gate |
| Update | 交付经理 | 创建或更新 `AGENTS.md`，保留人工内容 | agents-context | delivery-gate |
| Verify | QA | dry-run、JSON 输出或脚本运行验证 | 验证结果 | delivery-gate |

## 推荐脚本

```bash
node scripts/build-context.js <workdir> --request "<用户需求>"
node scripts/build-context.js <workdir> --dry-run
node scripts/build-context.js <workdir> --json
```

## 完成定义

- 目标目录存在且可扫描。
- `AGENTS.md` 被创建或 ai-work-team 管理区块被更新。
- 输出包含角色索引、技术栈、外部资源库、目录组织、状态管理、UI/样式、验证命令和后续 `/team build` 约束。
- 若检测到 monorepo，输出必须包含按 package 聚合的技术栈矩阵。
- 若无法识别某项上下文，明确标为待确认。

## 失败处理

- 工作目录不存在：停止并提示提供有效目录。
- 目录过大：脚本限制扫描数量，并在输出中记录扫描文件数。
- 已有 `AGENTS.md` 无管理区块：追加管理区块，不覆盖人工内容。
- 无法解析配置：保留“待确认”，不凭空推断。
