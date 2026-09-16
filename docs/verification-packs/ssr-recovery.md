# SSR Recovery Verification

## 触发

修改 server import、loader、bootstrap、hydration、SSR 错误终态、fallback 或服务端/客户端去重逻辑时选择本包。

2.2 按风险选 `server-entry-import`（integration/runtime）或 `unresolved-recovery`
（integration/runtime/browser）义务，记录真实入口、fixture、断言和 check。
分页 unit check 即使 V4 也不能关闭 server import 义务；没有触发的义务不强加。

## 最短证伪路径

1. 从真实 server entry import/render，不以组件 harness 或 barrel 字符串链代替。
2. 验证首请求与后续请求，并证明 fixture 实际触达目标 SSR 分支。
3. 按有效契约组合 success/error 与 resolved/unresolved，不把“请求结束”直接当作“内容可用”。
4. 检查响应正文、loaderData、fallback 标记和客户端接管结果。

## 必须保留

- unresolved SSR failure 仍允许必要的 CSR 补偿。
- resolved 内容不重复加载或重复发布错误。
- CSR-only 路径和非目标入口保持原语义。
- merge/rebase 后真实 server entry 仍使用预期依赖边界。

静态 import 关系可以证明架构风险，不能自动升级为已复现的运行时循环。缺少目标数据时保持 NOT_RUN，不从串行或未触达分支的成功结果推导 SSR 目标路径通过。
