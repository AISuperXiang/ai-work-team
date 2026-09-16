# 真实消费者契约

公开 SDK/API、配置 schema、序列化字段、默认值、共享常量和 lookup 规则变化时加载。先找最相关的真实消费入口及已确认契约，再决定验证范围。跨仓读取不扩大修改、发布或数据迁移授权。

## 必须形成的链

`生产者入口/版本 → 脱敏代表样本 → 消费者安装版本/真实入口 → 可观察结果`

在 `deliveryControl.assurance.consumerContracts` 记录 kind、scopeId、两侧 repository/version/entryRef、samplePath 和 facets。consumer.entryRef 必须出现在当前 scope.consumers；没有 SDK/API/config 契约影响的其他消费者，在 consumerExclusions 用相同入口、reason、evidenceRef 排除，不生成空矩阵。

samplePath 是项目相对 fixture，必须进入 snapshot 的 fixture 清单；样本改变会使旧结果失效。外仓源码不由检查器隐式扫描：通过目标项目既有测试导入安装产物或读取获准外仓，固定真实 commit/package 版本，把脱敏样本和 provenance 放在本任务可读边界。版本号存在不证明远端部署仍是该版本，owner 必须确认环境。

每个 facet 要么 required 且关联当前 required **consumer** acceptance 的 check，要么 not_applicable 且有 basisRef。至少一个 facet 实际受测；所选 checks 必须位于同一 scope，方法为 integration/runtime/browser/manual。名字相同和改 method 标签不证明触达入口。

review/design 的验收种类保持 analysis，消费者检查关联 required analysis acceptance；
受测通过只支持分析结论，不把未实施的方案标为实现已验收。

| kind | 必须逐项决定适用性的 facets | 最短反例 |
| --- | --- | --- |
| sdk | default-export、legacy-call、instance-identity、installed-entry | 原项目无参 installer、legacy init→默认导出、同一实例引用；从实际发布入口导入并核对声明和返回行为 |
| api | required-parameters、caller-entry、response | 专用 DTO 的必填/非空字段；所有实际调用入口及产品分支；响应 status/body/trace 契约 |
| config | serialization、lookup、render、defaults、migration | 选择→填写→保存序列化→真实 lookup→渲染；缺字段/默认值与旧内容迁移 |

## 验证与裁决

1. 从真实调用方复制最小脱敏 fixture，不复制整套业务实现到技能。
2. 明确断言能推翻什么，优先运行消费者入口，再运行适用库内测试、生成声明、ESM/CJS/打包入口。
3. config 样本分别送入两侧既有代码；避免各测各的理想对象而不经过序列化。
4. API 的宽泛可选类型不替代端点运行时必填条件；没有实际断言的 test 命令保持 NOT_RUN。
5. 破坏性新契约已明确批准时，记录新 revision、迁移/退役依据并将原不再支持 facet 标记不适用；不从失败测试反推允许破坏兼容。
6. 真实消费者环境不可得时保留缺口，不能用生产者单测全绿宣称安装后或部署后兼容。

可复制的记录片段见 [consumer-contract.json](../../assets/templates/consumer-contract.json)。片段只表示结构，不能当已完成验收。结构校验能检查关联、方法和样本新鲜度，不能证明样本代表性、完整调用链或业务期望正确。
