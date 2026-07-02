# External CLI 能力注册

`external-cli/` 是 ai-work-team 预留的本地 CLI 能力注册目录。它不内置任何外部 CLI，也不负责安装 CLI；它只维护用户本地已接入 CLI 的能力摘要，帮助产品、运营、UI、研发、测试和交付角色在执行工作流时准确判断哪些 CLI 可用、适合谁用、何时用、如何安全使用。

当前目录默认没有已注册 CLI。用户完成本地 CLI 安装、登录和权限配置后，可以通过 `/team register-cli` 让 Agent 在本目录生成或更新能力卡。

## 注册指令

推荐使用以下指令注册本地 CLI：

```text
/team register-cli <cli-id> \
  --command "<可执行命令或二进制名>" \
  --roles "<role-id,role-id>" \
  --capabilities "<一句话能力概述>" \
  --when "<适用场景>" \
  --verify "<只读验证命令>"
```

示例：

```text
/team register-cli github-cli \
  --command "gh" \
  --roles "tech-lead,frontend-engineer,delivery-manager" \
  --capabilities "查询和管理 GitHub issue、PR、review、release" \
  --when "需要查看 PR 状态、创建 issue、读取 review 反馈或整理 release 说明" \
  --verify "gh --version"
```

如果命令涉及内部系统或需要登录态，注册时只记录能力、适用角色、验证方式和安全边界，不记录 token、cookie、私钥、账号密码或一次性验证码。

## Agent 注册流程

收到 `/team register-cli` 后，Agent 应按以下流程处理：

1. 读取本 README，确认注册字段是否完整。
2. 使用只读方式检查 CLI 是否存在，例如 `command -v <binary>` 或用户提供的 `--verify` 命令。
3. 不替用户安装未知 CLI；若 CLI 不存在，说明缺失并停止注册。
4. 在 `external-cli/<cli-id>.md` 创建或更新能力卡。
5. 能力卡只写入稳定能力摘要、安全边界、适用角色、验证方式和使用示例。
6. 注册完成后提示哪些角色可以在什么场景读取该能力卡。

## 能力卡格式

每个已注册 CLI 使用一个 Markdown 文件维护，命名为：

```text
external-cli/<cli-id>.md
```

建议格式：

````markdown
---
id: github-cli
name: GitHub CLI
command: gh
status: local-registered
roles:
  - tech-lead
  - frontend-engineer
  - delivery-manager
capabilities:
  - 查询 issue、PR、review 和 release
  - 创建 issue 或评论 PR
requiresAuth: true
verifiedAt: 2026-07-02
verifyCommand: gh --version
---

# GitHub CLI

## 能力概述

一句话说明这个 CLI 能帮 ai-work-team 解决什么问题。

## 适用角色

- `tech-lead`：何时使用。
- `frontend-engineer`：何时使用。
- `delivery-manager`：何时使用。

## 适用场景

- 场景 1。
- 场景 2。

## 常用只读命令

```bash
gh pr view <id>
gh issue view <id>
```

## 写操作边界

- 写操作必须得到用户明确授权。
- 不执行破坏性命令，除非用户明确说明目标、范围和回滚方式。

## 验证方式

```bash
gh --version
```

## 注意事项

- 不记录密钥、token、cookie、私钥或账号密码。
- 若依赖特定登录态、网络或 VPN，必须在使用前说明。
````

## 角色使用规则

角色需要外部 CLI 能力时，应先读取本 README，再读取匹配的 `external-cli/<cli-id>.md` 能力卡。

- `tech-lead`：判断 CLI 是否适合当前技术方案、风险排查、PR/CI/仓库操作。
- `frontend-engineer`：只使用与前端实现、构建、测试、发布相关的 CLI 能力。
- `backend-engineer`：只使用与服务、数据库、接口、部署、日志相关的 CLI 能力。
- `qa-engineer`：只使用与测试执行、报告读取、缺陷验证相关的 CLI 能力。
- `ui-designer`：只使用与设计资源、截图、视觉检查相关的 CLI 能力。
- `product-manager`、`operations-manager`：只使用与需求、数据、内容、运营平台查询相关的 CLI 能力。
- `delivery-manager`：负责汇总 CLI 使用结果、风险、授权状态和交付记录。

角色不得因为能力卡存在就默认执行写操作。凡是创建、修改、删除、发布、审批、发消息、提交评论、变更线上资源的动作，都必须先获得用户明确授权。

## 维护规则

- CLI 能力变化、命令参数变化、权限范围变化时，更新对应能力卡。
- CLI 长期不可用、无人维护或存在安全风险时，将 `status` 改为 `disabled` 或删除能力卡。
- 能力卡中不要保存环境特定密钥、私有路径、账号信息或内部敏感数据。
- 如果必须记录本机路径，优先使用占位符，例如 `<local-cli-path>`，并说明由用户本地替换。
- 本目录是能力索引，不是安装目录；不要把第三方 CLI 二进制文件提交到这里。
