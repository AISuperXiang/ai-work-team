# Code Platform Contract

## 目标

未来可将代码评审摘要、变更说明、测试结果和风险同步到代码平台的 MR/PR。

## 输入字段

- `repository`。
- `branch`。
- `change_summary`。
- `test_result`。
- `review_findings`。
- `risk_notes`。
- `related_issue`。

## 写入前检查

- 用户授权。
- 本地验证完成或失败原因明确。
- 评论内容定位准确，不刷屏。
- 不包含敏感信息。

## 输出字段

- `review_url`。
- `comment_ids`。
- `sync_status`。

## 首版状态

只保留契约，不调用代码平台 API。
