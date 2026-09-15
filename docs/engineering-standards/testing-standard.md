# Testing Standard

## 测试层级

按风险选择：

- 单元测试：纯逻辑、工具函数、状态转换。
- 集成测试：接口、数据、跨模块契约。
- E2E 或浏览器验证：关键用户路径。
- 手工验证：自动化不可覆盖但必须验收的体验路径。

测试层级由风险而不是测试偏好决定。每个高风险失效条件要记录负责人、最低验证等级、未覆盖影响和下一步采证动作。

本仓库 Node CLI 的行为测试、fake `npx`、突变阈值和 Node 版本矩阵还必须满足 [`cli-quality-architecture.md`](cli-quality-architecture.md)。
依赖运行时、浏览器、账号、fixture 或共享服务的验证还必须满足
[`verification-environment-standard.md`](verification-environment-standard.md)。

## 三层测试结果

测试选择、catalog 健康和执行结果必须分开：

- 选择结果：从显式任务路径和 impact scope 映射命中的 check/test、未映射路径、排除依据与完整性。
- catalog 健康：测试目录、命名、登记、selector 和 inventory 的独立诊断。
- 执行结果：实际命令、环境、断言、skip/NOT RUN、退出码和原始输出。

Agent 不得用全工作树 diff 冒充当前任务范围；没有显式路径时停止自动执行。项目没有 catalog 时记录 selectorKind=manual/not_applicable，不建立第二份 catalog。诊断模式不得执行测试或绕过正式 CI/发布门禁。

catalog 失败不自动等于业务失败；任务测试通过也不等于 catalog 健康或全部 required check 完成。已知失败只复用签名、owner 和诊断，不能屏蔽当前失败。

## 必测内容

- 正常路径。
- 异常和错误提示。
- 空态和边界数据。
- 权限差异。
- 兼容和回归影响面。

## 记录要求

每次测试记录：

- 命令或步骤。
- 环境。
- 输入数据。
- 结果。
- 失败原因和修复状态。
- 当前 `verificationLevel` 与结论边界。
- 关联 impact scope、environment probe、构建/实例身份和资源 owner。
- 关联 test selection、catalog health 和 known failure；三者不覆盖 run observation。

## 失败处理

测试失败不得忽略。必须判断：

- 是实现缺陷。
- 是测试用例问题。
- 是环境问题。
- 是需求或验收标准不清。
