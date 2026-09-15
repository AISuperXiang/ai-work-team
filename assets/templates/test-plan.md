# Test Plan

## 测试目标

-

## 测试范围

- In scope：
- Out of scope：

## 测试选择与 Catalog 健康

| Selection ID | 显式任务路径 / Scope 来源 | Selector | 命中 Check / Test | 未映射 / 排除依据 | Catalog Health | 完整性 |
| --- | --- | --- | --- | --- | --- | --- |
|  |  | project_declared / manual / not_applicable |  |  | healthy / degraded / invalid / not_applicable | complete / partial / unknown |

> 选择结果、catalog 健康和实际执行结果独立记录。诊断模式不执行测试；
> 工作树范围、退出 0、skip 或已知失败均不能替代任务范围和逐项断言。

## 风险与测试策略

| 风险/失效条件 | 测试层级 | 负责人 | 最低验证等级 | 不覆盖的影响 |
| --- | --- | --- | --- | --- |

## 风险验证包

| Pack | 触发依据 | 选择 | Required Check | 不适用理由 |
| --- | --- | --- | --- | --- |
| async_ownership / ssr_recovery / cache_consistency |  | selected / not_applicable |  |  |

## 测试场景

| 验收 ID | Check ID / caseKey | 类型 | 方法/环境 | 场景与步骤 | 期望结果 | Run ID / 结果 |
| --- | --- | --- | --- | --- | --- | --- |
|  |  | target / preserve / consumer / analysis |  |  |  |  |

## 回归范围

-

## 测试数据

-

## 环境与资源

| Check ID | Required Dimensions | Project / App / Worktree | Build / Proxy | Account / Data | Resource Owner / Lock | Probe |
| --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |

> 项目已有 Gateway、runner 或资源锁时必须复用。端口占用或心跳健康不等于目标实例、当前构建和数据条件正确。

## 验证命令

```bash

```

## 验证等级与未覆盖范围

| 验证等级 | 证据 | 未覆盖范围 | 下一步 |
| --- | --- | --- | --- |

> 全局验证等级仅作汇总。每个 required check 必须匹配有效契约、方法、
> caseKey、环境、当前快照和原始证据；不同分支或更高等级不能补位。

## 风险

-
