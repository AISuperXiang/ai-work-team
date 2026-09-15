# Risk Verification Packs

验证包是按行为风险加载的短方法，不是每个任务都执行的全量清单，也不携带项目业务断言。

## 选择规则

| 风险包 | 触发信号 | 文件 |
| --- | --- | --- |
| async ownership | await、并发、取消、重试、分页或状态所有权变化 | `async-ownership.md` |
| SSR recovery | server import、loader、bootstrap、hydration 或 SSR 终态变化 | `ssr-recovery.md` |
| cache consistency | key、TTL、命中结构、refresh、invalidate 或持久化写变化 | `cache-consistency.md` |

- 技术负责人从当前 impact scope 决定 selected / not_applicable，并记录 triggerRef 和理由。
- selected 包的 check 必须属于当前 scope 和 required acceptance；同一个 check 可以服务多个包。
- 关键词只辅助发现风险。没有真实语义影响时不加载，不生成空验证矩阵。
- 无法获得 fixture、目标分支或运行环境时保持 NOT_RUN/BLOCKED，并给出 owner；不得用重复压力运行、截图数量或更高全局验证等级补位。
