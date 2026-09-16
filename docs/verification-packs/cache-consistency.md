# Cache Consistency Verification

## 触发

修改 cache key、TTL、命中结构、refresh、invalidate、持久化写、代次或成功事件语义时选择本包。

2.2 选择 `consumer-cache-hit` 义务（integration/runtime/browser），
记录真实消费者入口、snapshot 内 fixture、返回结构/事件断言及 checkIds；
仅验证控制器内部状态的 unit 不能关闭消费链义务。

仅改变内部时序、隔离或失效策略时可选 `cache-ordering`（另允许 unit），
用可控 fixture 证明相关状态，不因此强加页面消费链。

## 最短证伪路径

1. 覆盖真实消费者的 miss -> write -> hit 链，而不是只测 controller 内部状态。
2. 用可控存储在关键 write pending 窗口触发 invalidate/refresh，再完成旧写。
3. 分别断言存储内容、方法返回值、成功/失败事件和消费者可见结果。
4. 覆盖 key 隔离、异常后的恢复和并行调用者。

## 必须保留

- 新鲜命中返回完整消费结构。
- 失效后恢复不会发布旧代次成功。
- 异常不会永久污染命中状态或阻止重试。
- 其他 key、租户或调用者不被误清理。

await 后复查可以阻止旧成功回执，但不能撤销已经完成的物理写。若契约禁止旧值可见，必须验证存储层 fencing、CAS、串行化或已选择的等价保护。控制器单测通过不能自动关闭页面缓存命中或 bootstrap 消费链的问题。
