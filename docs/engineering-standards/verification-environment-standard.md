# Verification Environment Standard

本规范约束运行时、浏览器、集成和依赖真实环境的验证。目标是复用项目已有能力，减少错误 app/worktree、旧构建、错误账号/数据及重复启动造成的无效调试。

## 1. 项目能力优先

Skill 只定义需要确认的事实、失败分类和动作边界，不硬编码项目端口、app 清单、登录方式或进程命令。

执行顺序：

1. 读取项目 `AGENTS.md`、调试/测试规范和已登记能力。
2. 优先调用项目已有只读 status、health、instance discovery 或 test runner。
3. 项目声明 Local Gateway 时必须复用该 Gateway、实例选择协议和启动入口，不另起代理或凭端口猜实例。
4. 项目已有 worktree/build 锁时通过正式入口获取；预检结果不是锁。
5. 没有适配能力时采用人工可重复步骤并标记证据边界，不臆造命令。

适配器只输出脱敏事实摘要。涉及 instance/proxy 的 check 必须引用 `adapterKind=project-declared`
的项目能力；人工文本不能替代项目实例协议。控制 token、Cookie、口令、账号文件、storage state、
完整业务响应和私密日志不得进入 workspace 状态。

## 2. 按检查项声明环境

每个 check 使用 `requiredEnvironmentDimensions` 声明需要的维度：

| 维度 | 要确认的事实 |
| --- | --- |
| `project` | 正确仓库和真实 worktree |
| `instance` | 正确 app/runtime、实例 ID 和进程代次 |
| `build` | 源码/依赖/配置与实际加载构建或编译代次一致 |
| `proxy` | 页面、资源和请求实际命中目标实例/后端 |
| `account` | guest/auth、角色、租户和授权范围匹配 |
| `data` | fixture、远端数据、分支条件和前置状态匹配 |
| `tool` | 测试、浏览器或运行工具健康且版本适用 |
| `resource` | worktree、缓存、浏览器会话、账号或数据锁可用 |

不相关维度无需检查。缺少 required 维度、状态为 mismatch/unavailable/unknown，或资源为 conflict/unknown 时，该运行不能通过。

`healthy` 只表示对应健康协议成功，不自动表示目标 app、最新构建、页面可用、账号正确或断言已执行。端口占用也不是实例身份。

## 3. 探测与运行绑定

`environmentProbes[]` 保存 before/after 探测的脱敏摘要、来源、适配器、环境 key、资源状态、证据哈希和失效条件。`verificationRuns.environmentProbeIds` 显式绑定探测：

- static/unit/integration 至少需要 before。
- runtime/browser/manual 同时需要 before 和 after。
- probe 必须匹配 run 的 environment key、时间范围和证据文件哈希。
- run 保存所选 probe 的 environment digest；probe 内容变化后旧运行不得继续使用。
- build、实例、账号、fixture 或资源在运行期间变化时，结果不得跨代次拼成 pass。

服务可复用与证据可复用是两个决定。继续使用健康服务不代表旧运行仍属于当前源码、数据和会话。

源码 Git SHA 只作出处。需要运行时证据时，应引用项目可观察的构建/编译代次或产物摘要，并证明实际页面、SSR 入口或消费者加载了该代次。无法绑定时保留待验，不在生产业务代码中加入只为测试服务的逻辑。

## 4. Local Gateway 与实例复用

项目声明 Local Gateway 时：

1. 只读发现候选实例，精确匹配 real worktree、app/runtime 和页面 host。
2. 显式 URL、app 和 instance override 必须互相一致。
3. 通过项目协议选择实例，并核对响应中的 resolved instance；目标实例失败不得静默回退。
4. 页面、静态资源、XHR/Fetch 和 WebSocket 按项目规则使用相同实例选择。
5. 选择 Header 或控制凭据不得转发给无关本地服务或线上 API。
6. 没有匹配实例时才提出启动；仅在授权和无锁冲突时使用项目 `start:*` 入口。

Skill 不负责安装浏览器插件、读取用户插件配置或接管已有浏览器会话。

## 5. 资源所有权

| 资源 | 默认规则 |
| --- | --- |
| 源码、状态文件 | 一个写入 owner；并行角色只读冻结快照 |
| worktree 生成目录/构建缓存 | dev 与 build 按项目真实锁互斥 |
| Gateway/代理 | 共享复用，不因单任务结束关闭 |
| 浏览器 profile/session | 独立上下文可并行；共享登录和 Header 变更串行 |
| 账号、可变 fixture、额度 | 可隔离则按 run 隔离，否则独占或排队 |

状态中的 resource owner 是证据记录，不是原子锁。必须由项目已有锁或真实协调能力完成互斥。不得删除锁、杀未知进程、清共享缓存或关闭用户原有服务来规避冲突。
check 要求 resource 时必须存在实际 resource claim；exclusive 资源只有 `held_by_run`
且 owner 为当前 task 或 run 才能使用，单纯 `available` 不代表已取得锁。

完整构建与 dev 共用生成目录时，应使用携带当前未提交改动的隔离 worktree，或经用户确认停止本轮拥有的 dev。仅构建分支 HEAD 不能证明当前候选。

## 6. 有界恢复

环境失败先按 project/instance/build/proxy/account/data/tool/resource 分类。默认允许一次已知、可逆且已授权的纠正，再复查一次；同一指纹下无新证据时停止重复启动、登录或切换工具，并给出 owner 与解阻动作。

环境事实发生变化后可重新评估，不把重试预算视为永久禁测。环境失败不得触发猜测性业务补丁。

## 7. 数据与例外

- 账号只记录别名、角色和匹配结论。
- 数据只记录 fixture 版本或脱敏摘要。
- 日志使用 task/run ID；适用时保存脱敏 request-id。
- 写真实后端、消费额度、发布、权限提升和共享数据修改需要单独授权。

用户可批准有限候选验证，但必须记录范围、责任人、到期或补验条件。例外不能把未运行、错实例或旧构建写成通过。
