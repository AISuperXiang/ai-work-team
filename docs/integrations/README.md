# Integrations

首版 `ai-work-team` 不真实调用外部系统。本目录只定义未来接入飞书、Issue Tracker、代码平台等系统时的契约。

## 接入原则

- 任何外部写操作必须由用户明确授权。
- 默认先生成可审阅的 Markdown 产物，再由用户决定是否发布到外部系统。
- 不在 Skill 文档中存储密钥、Cookie 或个人凭据。
- 外部系统失败不得阻塞本地交付物生成。

## 文件

- `lark-contract.md`
- `issue-tracker-contract.md`
- `code-platform-contract.md`
