# Lark Contract

## 目标

未来可将 PRD、评审结论、测试报告、交付摘要发布到飞书文档或群消息。

## 输入字段

- `artifact_type`：PRD、技术方案、测试报告、交付摘要。
- `title`：文档或消息标题。
- `content_markdown`：正文内容。
- `owner`：负责人。
- `reviewers`：评审人。
- `visibility`：可见范围。

## 写入前检查

- 用户明确授权。
- 内容不包含密钥、内部凭据和不该公开的信息。
- 目标空间、群或文档已确认。

## 输出字段

- `external_url`。
- `external_id`。
- `created_at`。
- `sync_status`。

## 首版状态

只保留契约，不调用飞书 API。
