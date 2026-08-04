---
id: code-review-delivery
title: 代码审查与优化交付
triggers:
  - /team code-review
  - 代码审查
  - review 代码
  - 逻辑审查
  - 审查并优化
commands:
  - /team code-review
members:
  - delivery-manager
  - tech-lead
  - frontend-engineer
  - backend-engineer
  - qa-engineer
execution_mode: hybrid
quality_gates:
  - role-activation-gate
  - review-gate
  - technical-gate
  - implementation-gate
  - test-gate
  - evidence-gate
  - verification-gate
  - delivery-gate
outputs:
  - code-review
  - implementation-plan
  - test-plan
  - delivery-summary
---

# 代码审查与优化交付

## 适用场景

用户要求审查已有 diff、提交、PR、模块或代码逻辑，并在发现问题时完成最小优化、验证与交付。若用户只要评审，不得擅自修改代码。

## 输入契约

- 审查范围：路径、diff、提交、PR 或模块。
- 预期行为、已知风险或优化目标。
- 可用测试命令、运行环境或现有证据。

未提供范围时，优先检查当前未提交 diff；没有 diff 时请求用户提供路径或提交。

## 阶段表

| 阶段 | 负责人 | 动作 | 产出 | 门禁 |
| --- | --- | --- | --- | --- |
| Scope | 交付经理 + 技术负责人 | 固定审查边界、目标行为、非目标、执行档位、基线和 `rolePlan` | `code-review.md` | role-activation-gate、review-gate |
| Behavior Review | 技术负责人 | 从调用链验证正确性，构造失败场景并按严重度记录发现；业务预期不清时追加产品角色 | `code-review.md` | review-gate、technical-gate |
| Domain Review | 命中领域工程师 | 仅由命中前端、后端或安全/数据领域角色检查状态、接口、并发、性能、安全与兼容 | `code-review.md` | review-gate |
| Test Review | QA | 对行为或回归风险存在时将关键发现映射为复现、回归与未覆盖范围；纯静态审查可记录 N/A | `test-plan.md`、`code-review.md` | test-gate、evidence-gate |
| Optimize | 对应工程师 | 仅在用户授权且存在可修复发现时，由文件所有者实施最小变更 | 代码改动、`implementation-plan.md` | implementation-gate |
| Verify & Deliver | QA + 交付经理 | 运行可用验证，记录验证等级、剩余风险和最终结论 | `delivery-summary.md` | verification-gate、delivery-gate |

## 审查原则

- 先定义目标行为和审查范围，再阅读代码；不以代码风格偏好替代正确性判断。
- 发现必须包含严重度、代码位置、失效条件、证据、建议和验证方式。
- “无发现”也必须列出已检查范围、证据和未覆盖路径。
- 性能、安全和兼容性只在相关路径上深入，不做与范围无关的清单式扫描。
- 用户未授权修改时，交付修复建议与最小验证方案，不落地代码。
- 领域角色未激活时，在审查结论中写明范围不涉及该领域，不能把未审查伪装成“无风险”。

## 分级发现

- `P0`：安全、数据损坏、资损或系统不可用风险，必须阻断交付。
- `P1`：核心功能错误、明显回归或高概率兼容问题，修复前不得通过。
- `P2`：边界、可维护性或性能风险，给出最小修复与验证建议。
- `P3`：非阻塞改进，说明收益和不处理的影响，避免伪装为缺陷。

## 失败处理

- 无法获得 diff、代码或运行上下文：输出审查阻塞项和最小所需输入。
- 发现 P0/P1：停止“带风险通过”，优先交付复现、影响和修复建议。
- 验证不可运行：记录 `V0/V1/V2` 结论上限和需要补齐的运行时证据。
- 优化会扩大范围：先升级执行档位并请求裁决，不把重构伪装成修复。

## 完成定义

- 每个发现可追溯到代码位置、行为证据和验证建议。
- 已修改代码时，改动、验证等级和回归范围明确。
- 未修改代码时，明确说明用户授权边界和可执行后续动作。
- `rolePlan` 明确说明哪些领域已审查、哪些未覆盖及原因。
