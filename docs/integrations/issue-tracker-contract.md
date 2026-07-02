# Issue Tracker Contract

## 目标

未来可把需求、缺陷、任务拆解和验收项同步到 Issue Tracker。

## 输入字段

- `issue_type`：requirement、task、bug、test、release。
- `title`。
- `description`。
- `priority`。
- `owner`。
- `labels`。
- `acceptance_criteria`。
- `links`。

## 写入前检查

- 用户授权创建或更新 issue。
- 需求范围和验收标准已确认。
- 不重复创建已有 issue。
- 优先级和负责人明确。

## 输出字段

- `issue_url`。
- `issue_id`。
- `sync_status`。

## 首版状态

只保留契约，不调用 Issue Tracker API。
