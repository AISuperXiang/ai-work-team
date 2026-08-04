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

## 使用方式

工作流阶段需要深入角色判断时，先读取对应成员文件，再按需读取方法论文档。

涉及实现、缺陷修复或代码审查时，先读取 `execution-methodology.md`，按风险、未知度和影响范围选择 `lightweight`、`standard` 或 `assurance` 执行档位，并记录验证等级。

所有工作流开始前读取 `role-activation-methodology.md`，先形成 `rolePlan`，再加载实际参与角色。产品、运营、UI、技术负责人、前端、后端、QA 和交付经理各自的方法论只在该角色处于 `active` 或 `consulted` 时按需加载。
