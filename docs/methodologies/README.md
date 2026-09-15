# Methodologies

本目录维护角色方法论。方法论用于指导角色思考和产出，不替代具体工作流和质量门禁。

## 文件

- `product-methodology.md`
- `operations-methodology.md`
- `ui-methodology.md`
- `engineering-methodology.md`
- `technical-lead-methodology.md`
- `frontend-engineering-methodology.md`
- `backend-engineering-methodology.md`
- `qa-methodology.md`
- `delivery-methodology.md`
- `execution-methodology.md`
- `role-activation-methodology.md`
- `goal-driven-technical-design-methodology.md`
- `skill-evaluation-methodology.md`

## 使用方式

工作流阶段需要深入角色判断时，先读取对应成员文件，再按需读取方法论文档。

涉及实现、缺陷修复或代码审查时，先读取 `execution-methodology.md`，按风险、未知度和影响范围选择 `lightweight`、`standard` 或 `assurance` 执行档位，并记录验证等级。

所有工作流开始前读取 `role-activation-methodology.md`，先形成 `rolePlan`，再加载实际参与角色。产品、运营、UI、技术负责人、前端、后端、QA 和交付经理各自的方法论只在该角色处于 `active` 或 `consulted` 时按需加载。

从目标生成 PRD、四类自治契约和评审后技术方案时，读取 `goal-driven-technical-design-methodology.md`，并把计划/最大迭代轮数、预算、审批、停止和重规划规则写入方案。

修改 Skill 执行规则、门禁或默认产物后，读取 `skill-evaluation-methodology.md`，
先用隔离答案的历史 holdout 场景检查错误动作，再比较同风险真实任务的人工成本和逃逸回归。
