#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  CliArgumentError,
  assertNoConflict,
  parseCliArgs,
} = require("./cli-args");
const { validateDeliveryControl, evaluateDeliveryControl } = require("./delivery-controls");
const { validateSkillEvaluation } = require("./skill-evaluation");

const ROOT = path.resolve(__dirname, "..");
const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", "coverage", ".next", ".turbo"]);

function usage() {
  console.log(`Usage:
  node scripts/validate-contracts.js
  node scripts/validate-contracts.js --workspace workspace/<requirement-folder>
  node scripts/validate-contracts.js --all-workspaces
`);
}

function parseCommandLine(argv) {
  const parsed = parseCliArgs(argv, {
    options: {
      "--help": { key: "help", type: "boolean", aliases: ["-h"] },
      "--workspace": { key: "workspace", type: "value" },
      "--all-workspaces": { key: "allWorkspaces", type: "boolean" },
    },
  });
  const { options, positionals } = parsed;
  if (positionals.length > 0) {
    throw new CliArgumentError(
      `Unexpected positional input: ${positionals.join(" ")}`,
    );
  }
  if (options.help) {
    if (Object.keys(options).length > 1) {
      throw new CliArgumentError("--help cannot be combined with other arguments");
    }
    return { help: true };
  }
  assertNoConflict(
    options,
    ["workspace", "allWorkspaces"],
    "--workspace and --all-workspaces cannot be combined",
  );
  return {
    help: false,
    workspace: options.workspace,
    allWorkspaces: Boolean(options.allWorkspaces),
  };
}

let command;
try {
  command = parseCommandLine(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  process.exit(error instanceof CliArgumentError ? error.exitCode : 1);
}
if (command.help) {
  usage();
  process.exit(0);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const LEGACY_COMMAND = "+" + "team";
const LEGACY_SHORT_NAME = "work" + "-team";
const LEGACY_LOCAL_PATH = ["lumina-skills", LEGACY_SHORT_NAME].join("/");
const LEGACY_ENCODED_LOCAL_PATH = encodeURIComponent(LEGACY_LOCAL_PATH);
const LEGACY_PATTERNS = [
  { label: "legacy command", pattern: new RegExp(`\\${LEGACY_COMMAND}`) },
  { label: "legacy local path", pattern: new RegExp(escapeRegExp(LEGACY_LOCAL_PATH)) },
  { label: "legacy encoded local path", pattern: new RegExp(escapeRegExp(LEGACY_ENCODED_LOCAL_PATH)) },
  { label: "legacy project short name", pattern: new RegExp(`(^|[^A-Za-z0-9_-])${LEGACY_SHORT_NAME}([^A-Za-z0-9_-]|$)`) }
];
const LEGACY_SCAN_EXTENSIONS = new Set([".md", ".json", ".js", ".cjs", ".mjs", ".ts", ".tsx", ".jsx"]);
const STAGE_STATUSES = new Set(["pending", "in_progress", "blocked", "review", "completed"]);
const COMPLEXITY_LEVELS = new Set(["S", "M", "L", "XL"]);
const EXECUTION_PROFILES = new Set(["lightweight", "standard", "assurance"]);
const VERIFICATION_LEVELS = new Set(["V0", "V1", "V2", "V3", "V4"]);
const ROLE_PLAN_MODES = new Set(["active", "consulted", "not_applicable"]);
const MEMBER_IDS = new Set([
  "product-manager",
  "operations-manager",
  "ui-designer",
  "tech-lead",
  "frontend-engineer",
  "backend-engineer",
  "qa-engineer",
  "delivery-manager"
]);
const REQUIRED_STATUS_FIELDS = ["name", "owner", "status", "gates", "artifacts", "evidence"];
const REQUIRED_STATUS_STAGES_BY_WORKFLOW = {
  "requirement-end-to-end": ["Intake", "PRD", "UI/UX", "Tech Design", "Implementation", "QA", "Delivery"],
  "goal-driven-technical-design": [
    "Goal Intake",
    "PRD",
    "Requirement Review",
    "UI Review",
    "Architecture Design",
    "Technical Review",
    "Cross-Role Review",
    "Design Revision",
    "Decision Handoff"
  ],
  "bugfix-delivery": ["Triage", "Reproduce", "Diagnose", "Fix", "Regression", "Delivery"],
  "code-review-delivery": ["Scope", "Behavior Review", "Domain Review", "Test Review", "Optimize", "Verify & Deliver"],
  "technical-design-review": ["Context", "Architecture", "QA Review", "Decision"]
};
const REQUIRED_PRD_BUSINESS_ROWS = ["目标用户", "用户价值", "业务价值", "价值假设", "预期收益", "成本收益比"];
const REQUIRED_PRD_METRIC_HEADERS = ["指标", "当前基线", "目标变化", "数据来源", "观察周期", "异常阈值"];
const REQUIRED_DELIVERY_BUSINESS_ROWS = ["价值假设", "指标基线", "收益目标", "成本收益比", "上线后观测结果/计划"];
const REQUIRED_HANDOFF_SECTIONS = ["背景", "当前阶段", "已确认决策", "待确认问题", "风险", "产出物", "验证"];
const GOAL_DESIGN_SCHEMA_CONTRACTS = [
  {
    schema: "schemas/goal-contract.schema.json",
    template: "assets/templates/goal-contract.json",
    required: [
      "schemaVersion",
      "goalId",
      "title",
      "statement",
      "targetUsers",
      "problem",
      "desiredOutcomes",
      "nonGoals",
      "constraints",
      "successCriteria",
      "metrics",
      "assumptions",
      "owner",
      "reviewTriggers"
    ]
  },
  {
    schema: "schemas/milestone.schema.json",
    template: "assets/templates/milestones.json",
    required: [
      "schemaVersion",
      "goalId",
      "plannedIterations",
      "maxIterations",
      "milestones"
    ]
  },
  {
    schema: "schemas/task.schema.json",
    template: "assets/templates/tasks.json",
    required: ["schemaVersion", "goalId", "tasks"]
  },
  {
    schema: "schemas/autonomy-policy.schema.json",
    template: "assets/templates/autonomy-policy.json",
    required: [
      "schemaVersion",
      "policyId",
      "goalId",
      "defaultDecisionMode",
      "iterationPolicy",
      "budgetPolicy",
      "decisionRights",
      "approvalGates",
      "forbiddenActions",
      "stopConditions",
      "replanTriggers",
      "escalationRules",
      "reviewCadence"
    ]
  }
];

const checks = [
  {
    file: "SKILL.md",
    mustContain: [
      "workspace/<requirement-folder>",
      "workflows/implementation-protocol.md",
      "docs/quality-rubrics.md",
      "docs/business-impact-rubric.md",
      "docs/handoff-contract.md",
      "docs/delivery-controls.md",
      "scripts/check-delivery.js",
      "value-gate",
      "decision-log.md",
      "role-handoff.md",
      "S / M / L / XL",
      "executionProfile",
      "verificationLevel",
      "rolePlan",
      "role-activation-gate",
      "code-review-delivery.md",
      "/team goal-design",
      "goal-contract-gate",
      "autonomy-gate",
      "design-review-gate",
      "Select Tests",
      "数字评分"
    ]
  },
  {
    file: "AGENTS.md",
    mustContain: [
      "scripts/cli-args.js",
      "exit with code `2`",
      "256 KiB",
      "node:test",
      "fake `npx`",
      "at least 85%",
      "zero survivors",
      "npm run validate:workspaces",
      "check-delivery.js",
      "evaluate-skill.js",
      "Node 18.20.8, 20.20.2, and 22.22.2"
    ]
  },
  {
    file: "docs/engineering-standards/cli-quality-architecture.md",
    mustContain: [
      "严格参数契约",
      "文件写入边界",
      "行为测试",
      "突变门禁",
      "契约校验边界",
      "持续集成",
      "mutation score",
      "85%",
      "Node 18.20.8、20.20.2、22.22.2"
    ]
  },
  {
    file: "README.md",
    mustContain: [
      "工程质量架构",
      "AGENTS.md",
      "fake `npx`",
      "85%",
      "Node 18.20.8、20.20.2、22.22.2",
      "check-delivery.js",
      "evaluate-skill.js",
      "npm run validate:workspaces",
      "/team resume",
      "/team verify",
      "--mode initial\\|delta\\|recheck"
    ]
  },
  {
    file: "README_EN.md",
    mustContain: [
      "Engineering Quality Architecture",
      "AGENTS.md",
      "fake `npx`",
      "85%",
      "Node 18.20.8, 20.20.2, and 22.22.2",
      "check-delivery.js",
      "evaluate-skill.js",
      "npm run validate:workspaces",
      "/team resume",
      "/team verify",
      "--mode initial\\|delta\\|recheck"
    ]
  },
  {
    file: "package.json",
    mustContain: [
      "\"test:behavior\"",
      "\"test:mutation\"",
      "\"validate:workspaces\"",
      "\"eval:skill\"",
      "\"test:ci\""
    ]
  },
  {
    file: ".github/workflows/ci.yml",
    mustContain: [
      "18.20.8",
      "20.20.2",
      "22.22.2",
      "npm test",
      "npm run test:mutation",
      "git status --porcelain"
    ]
  },
  {
    file: "workflows/requirement-end-to-end.md",
    mustContain: [
      "workspace/YYYYMMDD-short-requirement-slug/",
      "implementation-protocol.md",
      "PROJECT_ROOT",
      "workflow-status.json",
      "decision-log.md",
      "risk-register.md",
      "role-handoff.md",
      "value-gate",
      "decision-gate",
      "handoff-gate",
      "complexity-gate",
      "evidence-gate",
      "no-legacy-contract",
      "未修改项目代码，不得声称完成实现",
      "recordPolicy.requiredArtifacts",
      "Delivery Controls"
    ]
  },
  {
    file: "workflows/goal-driven-technical-design.md",
    mustContain: [
      "/team goal-design",
      "goal-contract.json",
      "milestones.json",
      "tasks.json",
      "autonomy-policy.json",
      "goal-contract-gate",
      "autonomy-gate",
      "design-review-gate",
      "maxDesignReviewRounds",
      "等待用户批准执行",
      "/team build"
    ],
    mustNotContain: [
      "milestone-plan.json",
      "task-plan.json"
    ]
  },
  {
    file: "workflows/implementation-protocol.md",
    mustContain: [
      "定位项目",
      "执行代码改动",
      "失败修复循环",
      "不可跳过门禁",
      "没有代码改动却声称完成实现",
      "decision-log.md",
      "role-handoff.md",
      "workflow-status.json",
      "execution-methodology.md",
      "业务影响",
      "选择测试",
      "质量评估",
      "check-delivery.js",
      "Behavior Impact Standard",
      "Verification Environment Standard",
      "mergeGuardCheckIds"
    ]
  },
  {
    file: "docs/delivery-controls.md",
    mustContain: [
      "有效契约",
      "修复对照",
      "逐项证据",
      "legacy_unverified",
      "analysis_complete",
      "check-delivery.js",
      "不执行",
      "start/resume/verify/review/deliver",
      "Behavior Impact Standard",
      "Verification Environment Standard",
      "testSelections",
      "catalogHealth",
      "Finding 裁决",
      "风险验证包",
      "recordPolicy"
    ]
  },
  {
    file: "workspace/README.md",
    mustContain: [
      "每一个功能需求默认对应一个独立交付文件夹",
      "features/",
      "代码改动仍发生在用户项目仓库",
      "decision-log.md",
      "risk-register.md",
      "role-handoff.md",
      "workflow-status.json",
      "/team build",
      "只有当用户明确说"
    ]
  },
  {
    file: "docs/quality-rubrics.md",
    mustContain: [
      "技术先进性",
      "业务影响",
      "business-impact-rubric.md",
      "价值假设",
      "指标基线",
      "收益目标",
      "成本收益比",
      "健壮性",
      "UI 美观与可用性",
      "测试可信度",
      "安全与兼容性",
      "辅助评估规则",
      "实质门禁"
    ]
  },
  {
    file: "commands/team.md",
    mustContain: [
      "workspace、权威状态",
      "代码实现",
      "权威状态",
      "未能确定项目根目录",
      "必要方案/决策",
      "风险和交付视图",
      "/team buildContext",
      "/team install",
      "/team code-review",
      "/team goal-design",
      "/team resume",
      "/team verify",
      "--mode initial\\|delta\\|recheck",
      "goal-driven-technical-design.md",
      "external-skills/catalog.json"
    ]
  },
  {
    file: "docs/quality-gates.md",
    mustContain: [
      "value-gate",
      "goal-contract-gate",
      "autonomy-gate",
      "design-review-gate",
      "decision-gate",
      "handoff-gate",
      "complexity-gate",
      "evidence-gate",
      "reproduction-gate",
      "review-gate",
      "verification-gate",
      "role-activation-gate",
      "no-legacy-contract",
      "no-legacy-contract",
      "指标基线",
      "成本收益比",
      "business-impact-rubric.md",
      "S / M / L / XL"
    ]
  },
  {
    file: "docs/business-impact-rubric.md",
    mustContain: [
      "必填输入",
      "辅助评估",
      "阻断规则",
      "产物映射",
      "workflow-status.json",
      "evidence/README.md"
    ]
  },
  {
    file: "docs/handoff-contract.md",
    mustContain: [
      "强制交接规则",
      "Hybrid 子 Agent 输出契约",
      "结论",
      "证据",
      "风险",
      "置信度",
      "需决策项"
    ]
  },
  {
    file: "assets/templates/requirement-review.md",
    mustContain: [
      "评审输入",
      "范围与价值",
      "验收与可测性",
      "状态、异常与边界",
      "冻结输入",
      "评审结论"
    ]
  },
  {
    file: "assets/templates/goal-driven-technical-design.md",
    mustContain: [
      "背景与目标",
      "需求分析",
      "技术核心模块设计",
      "复杂逻辑拆解",
      "实现方案对比",
      "Contract Schemas",
      "goal-contract",
      "milestone",
      "task",
      "autonomy-policy",
      "迭代节奏与迭代路径",
      "Review Resolution",
      "User Decision"
    ]
  },
  {
    file: "assets/templates/technical-design-review.md",
    mustContain: [
      "角色评审结论",
      "契约一致性",
      "评审意见处置",
      "maxDesignReviewRounds",
      "待用户决策",
      "最终结论"
    ]
  },
  {
    file: "docs/methodologies/goal-driven-technical-design-methodology.md",
    mustContain: [
      "目标收敛",
      "从目标到 PRD",
      "四类契约",
      "Task DAG",
      "Autonomy Policy",
      "评审与修订",
      "等待用户批准执行"
    ]
  },
  {
    file: "assets/templates/prd.md",
    mustContain: [
      "价值假设与业务影响",
      "指标基线与观测计划",
      "成本收益比",
      "上线后复盘计划"
    ]
  },
  {
    file: "assets/templates/delivery-summary.md",
    mustContain: [
      "业务影响与收益观测",
      "证据索引",
      "质量评估（可选）",
      "业务影响",
      "上线后复盘计划",
      "decision-log.md",
      "risk-register.md",
      "role-handoff.md",
      "workflow-status.json"
    ]
  },
  {
    file: "assets/templates/decision-log.md",
    mustContain: [
      "决策记录",
      "决策主题",
      "最终选择",
      "影响",
      "负责人"
    ]
  },
  {
    file: "assets/templates/risk-register.md",
    mustContain: [
      "复杂度分级",
      "S / M / L / XL",
      "风险台账",
      "L / XL 项目强制项",
      "技术 spike",
      "收益复盘"
    ]
  },
  {
    file: "assets/templates/role-handoff.md",
    mustContain: [
      "交接信息包",
      "已确认决策",
      "待确认问题",
      "产出物",
      "验证",
      "Hybrid 子 Agent 输出汇总"
    ]
  },
  {
    file: "assets/templates/workspace-requirement-readme.md",
    mustContain: [
      "decision-log.md",
      "risk-register.md",
      "role-handoff.md",
      "workflow-status.json",
      "业务价值记录"
    ]
  },
  {
    file: "assets/templates/workflow-status.json",
    mustContain: [
      "complexityLevel",
      "executionProfile",
      "verificationLevel",
      "value-gate",
      "decision-gate",
      "handoff-gate",
      "evidence-gate",
      "artifacts"
    ]
  },
  {
    file: "schemas/status.schema.json",
    mustContain: [
      "requirementFolder",
      "complexityLevel",
      "executionProfile",
      "verificationLevel",
      "stages",
      "artifacts",
      "evidence",
      "testSelections",
      "catalogHealth",
      "verificationPacks",
      "recordPolicy"
    ]
  },
  {
    file: "workflows/project-context-build.md",
    mustContain: [
      "/team buildContext",
      "AGENTS.md",
      "scripts/build-context.js",
      "ai-work-team:buildContext:start",
      "pnpm-workspace.yaml",
      "package.json workspaces",
      "技术栈矩阵",
      "状态管理",
      "UI 组件库"
    ]
  },
  {
    file: "workflows/external-skill-install.md",
    mustContain: [
      "/team install",
      "external-skills/catalog.json",
      "external-skills/install-policy.md",
      "external-skills/role-map.md",
      "npx skills check"
    ]
  },
  {
    file: "external-skills/README.md",
    mustContain: [
      "Workflow 调度角色",
      "Role 调度能力",
      "Context 传递结果",
      "/team install",
      "catalog.json",
      "role-map.md"
    ]
  },
  {
    file: "external-skills/install-policy.md",
    mustContain: [
      "qualityTier: recommended",
      "candidate",
      "npx skills add",
      "catalog 之外",
      "本地已有同能力 Skill"
    ]
  },
  {
    file: "external-skills/catalog.json",
    mustContain: [
      "reviewedAt",
      "trustScore",
      "lastInstallCheck",
      "localSkillPriority",
      "keywords"
    ]
  },
  {
    file: "scripts/list-external-skills.js",
    mustContain: [
      "--task",
      "--query",
      "matchSkills",
      "formatSkillMatch"
    ]
  },
  {
    file: "scripts/install-external-skills.js",
    mustContain: [
      "--force-external",
      "Mode: ${mode}",
      "Selected skills",
      "Local installed skill priority",
      "Update advice",
      "User action",
      "matchSkills"
    ]
  },
  {
    file: "scripts/build-context.js",
    mustContain: [
      "AGENTS.md",
      "ai-work-team:buildContext:start",
      "package.json",
      "pnpm-workspace.yaml",
      "workspaces",
      "Monorepo Package 技术栈矩阵",
      "zustand",
      "UI 组件",
      "状态管理"
    ]
  },
  {
    file: "assets/templates/agents-context.md",
    mustContain: [
      "AGENTS.md",
      "ai-work-team:buildContext:start",
      "ai-work-team:buildContext:end"
    ]
  },
  {
    file: "workflows/bugfix-delivery.md",
    mustContain: [
      "Reproduce",
      "reproduction-gate",
      "decision-gate",
      "verification-gate",
      "不得交付“已修复”"
    ]
  },
  {
    file: "workflows/code-review-delivery.md",
    mustContain: [
      "/team code-review",
      "review-gate",
      "分级发现",
      "用户未授权修改时",
      "验证等级",
      "initial",
      "delta",
      "recheck",
      "reviewed",
      "inherited",
      "gaps",
      "mergeGuardCheckIds",
      "反证",
      "pre_existing",
      "cache-consistency"
    ]
  },
  {
    file: "workflows/delivery-summary.md",
    mustContain: [
      "/team deliver",
      "只读",
      "check-delivery",
      "不运行新的业务测试",
      "不启动服务",
      "review/blocked"
    ]
  },
  {
    file: "docs/methodologies/execution-methodology.md",
    mustContain: [
      "lightweight",
      "standard",
      "assurance",
      "verificationLevel",
      "V0",
      "V4"
    ]
  },
  {
    file: "docs/methodologies/role-activation-methodology.md",
    mustContain: [
      "rolePlan",
      "active",
      "consulted",
      "not_applicable",
      "工作流最小组合"
    ]
  },
  {
    file: "docs/methodologies/skill-evaluation-methodology.md",
    mustContain: [
      "历史场景",
      "真实任务试点",
      "answer leakage",
      "holdout",
      "人工活跃",
      "逃逸回归",
      "evaluate-skill.js"
    ]
  },
  {
    file: "scripts/evaluate-skill.js",
    mustContain: [
      "--input",
      "summarizeSkillEvaluation",
      "resolveSafePath",
      "decision"
    ]
  },
  {
    file: "scripts/safe-files.js",
    mustContain: [
      "Symlink paths are not allowed",
      "Input exceeds the size limit",
      "Input changed while reading",
      "O_NOFOLLOW"
    ]
  }
];

let failed = 0;

function fail(message) {
  console.log(`FAIL ${message}`);
  failed += 1;
}

function pass(message) {
  console.log(`PASS ${message}`);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function parseJsonFile(relativePath) {
  try {
    return JSON.parse(readText(relativePath));
  } catch (error) {
    fail(`${relativePath} invalid JSON: ${error.message}`);
    return null;
  }
}

function hasOwn(object, field) {
  return Object.prototype.hasOwnProperty.call(object, field);
}

function isMeaningful(value) {
  const normalized = String(value || "")
    .replace(/`/g, "")
    .replace(/<br\s*\/?>/gi, " ")
    .trim();
  return Boolean(normalized) && !/^[-—_]+$/.test(normalized) && !/^(TODO|TBD|N\/A|待补充|待确认|暂无)$/i.test(normalized);
}

function parseTableLine(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
  return trimmed.slice(1, -1).split("|").map((cell) => cell.trim());
}

function findSection(content, heading) {
  const escaped = escapeRegExp(heading);
  const pattern = new RegExp(`^#{2,3}\\s+(?:\\d+(?:\\.\\d+)*\\.\\s*)?${escaped}\\s*$`, "m");
  const match = content.match(pattern);
  if (!match || match.index === undefined) return "";
  const start = match.index + match[0].length;
  const rest = content.slice(start);
  const nextHeading = rest.search(/^#{2,3}\s+/m);
  return nextHeading === -1 ? rest : rest.slice(0, nextHeading);
}

function findFirstTable(content, heading) {
  const section = findSection(content, heading);
  if (!section) return null;
  const lines = section.split(/\r?\n/);
  for (let index = 0; index < lines.length - 1; index += 1) {
    const headers = parseTableLine(lines[index]);
    const separator = parseTableLine(lines[index + 1]);
    if (!headers || !separator || !separator.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
    const rows = [];
    for (let rowIndex = index + 2; rowIndex < lines.length; rowIndex += 1) {
      const row = parseTableLine(lines[rowIndex]);
      if (!row) break;
      rows.push(row);
    }
    return { headers, rows };
  }
  return null;
}

function tableRowsByFirstColumn(table) {
  const rows = new Map();
  if (!table) return rows;
  for (const row of table.rows) {
    if (row[0]) rows.set(row[0], row);
  }
  return rows;
}

function requireTableHeaders(relativePath, heading, requiredHeaders) {
  const table = findFirstTable(readText(relativePath), heading);
  if (!table) {
    fail(`${relativePath} missing table under heading: ${heading}`);
    return null;
  }
  for (const header of requiredHeaders) {
    if (table.headers.includes(header)) {
      pass(`${relativePath} ${heading} table has header: ${header}`);
    } else {
      fail(`${relativePath} ${heading} table missing header: ${header}`);
    }
  }
  return table;
}

function requireTableRows(relativePath, heading, requiredRows) {
  const table = findFirstTable(readText(relativePath), heading);
  if (!table) {
    fail(`${relativePath} missing table under heading: ${heading}`);
    return null;
  }
  const rows = tableRowsByFirstColumn(table);
  for (const rowLabel of requiredRows) {
    if (rows.has(rowLabel)) {
      pass(`${relativePath} ${heading} table has row: ${rowLabel}`);
    } else {
      fail(`${relativePath} ${heading} table missing row: ${rowLabel}`);
    }
  }
  return table;
}

function requireMeaningfulRows(relativePath, heading, requiredRows, requiredColumnIndexes) {
  const table = requireTableRows(relativePath, heading, requiredRows);
  if (!table) return;
  const rows = tableRowsByFirstColumn(table);
  for (const rowLabel of requiredRows) {
    const row = rows.get(rowLabel);
    if (!row) continue;
    for (const columnIndex of requiredColumnIndexes) {
      const header = table.headers[columnIndex] || `column ${columnIndex}`;
      if (isMeaningful(row[columnIndex])) {
        pass(`${relativePath} ${heading} row ${rowLabel} has ${header}`);
      } else {
        fail(`${relativePath} ${heading} row ${rowLabel} missing meaningful ${header}`);
      }
    }
  }
}

function requireSectionHasContent(relativePath, heading) {
  const section = findSection(readText(relativePath), heading);
  if (!section) {
    fail(`${relativePath} missing heading: ${heading}`);
    return;
  }
  const content = section
    .split(/\r?\n/)
    .filter((line) => isMeaningful(line.replace(/^[-*]\s*/, "").replace(/^#+\s*/, "")))
    .join("\n");
  if (isMeaningful(content)) {
    pass(`${relativePath} section has content: ${heading}`);
  } else {
    fail(`${relativePath} section missing meaningful content: ${heading}`);
  }
}

function requireSectionExists(relativePath, heading) {
  const content = readText(relativePath);
  const escaped = escapeRegExp(heading);
  const pattern = new RegExp(`^#{2,3}\\s+(?:\\d+(?:\\.\\d+)*\\.\\s*)?${escaped}\\s*$`, "m");
  if (pattern.test(content)) {
    pass(`${relativePath} has section: ${heading}`);
  } else {
    fail(`${relativePath} missing section: ${heading}`);
  }
}

for (const check of checks) {
  const absolutePath = path.join(ROOT, check.file);
  if (!fs.existsSync(absolutePath)) {
    fail(`missing file: ${check.file}`);
    continue;
  }

  const content = fs.readFileSync(absolutePath, "utf8");
  for (const needle of check.mustContain) {
    if (content.includes(needle)) {
      pass(`${check.file} contains: ${needle}`);
    } else {
      fail(`${check.file} missing: ${needle}`);
    }
  }
  for (const needle of check.mustNotContain || []) {
    if (content.includes(needle)) {
      fail(`${check.file} must not contain: ${needle}`);
    } else {
      pass(`${check.file} omits obsolete value: ${needle}`);
    }
  }
}

function collectFiles(dir, files = [], options = {}) {
  const relativeDir = path.relative(ROOT, dir).split(path.sep).join("/");
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        !options.includeWorkspaceGenerated &&
        relativeDir === "workspace"
      ) {
        continue;
      }
      collectFiles(absolute, files, options);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name);
    if (LEGACY_SCAN_EXTENSIONS.has(ext)) files.push(absolute);
  }
  return files;
}

function validateRolePlan(rolePlan, stageNames, relativePath, templateMode) {
  if (!Array.isArray(rolePlan) || rolePlan.length === 0) {
    fail(`${relativePath} rolePlan must be a non-empty array`);
    return;
  }

  const roles = new Set();
  for (const [index, item] of rolePlan.entries()) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      fail(`${relativePath} rolePlan item ${index} must be an object`);
      continue;
    }
    if (MEMBER_IDS.has(item.role)) {
      pass(`${relativePath} rolePlan item ${index} references existing role: ${item.role}`);
    } else {
      fail(`${relativePath} rolePlan item ${index} references unknown role: ${item.role || "missing"}`);
    }
    if (ROLE_PLAN_MODES.has(item.mode)) {
      pass(`${relativePath} rolePlan ${item.role || index} mode is valid: ${item.mode}`);
    } else {
      fail(`${relativePath} rolePlan ${item.role || index} mode must be active/consulted/not_applicable`);
    }
    if (isMeaningful(item.reason)) {
      pass(`${relativePath} rolePlan ${item.role || index} has scenario reason`);
    } else {
      fail(`${relativePath} rolePlan ${item.role || index} missing scenario reason`);
    }
    if (!Array.isArray(item.stages)) {
      fail(`${relativePath} rolePlan ${item.role || index} stages must be an array`);
      continue;
    }
    if (item.mode === "not_applicable" && item.stages.length === 0) {
      pass(`${relativePath} not_applicable role ${item.role || index} has no execution stages`);
    } else if (item.mode !== "not_applicable" && item.stages.length > 0) {
      pass(`${relativePath} participating role ${item.role || index} has execution stages`);
    } else {
      fail(`${relativePath} rolePlan ${item.role || index} mode and stages are inconsistent`);
    }
    for (const stageName of item.stages) {
      if (stageNames.has(stageName)) {
        pass(`${relativePath} rolePlan ${item.role || index} references stage: ${stageName}`);
      } else {
        fail(`${relativePath} rolePlan ${item.role || index} references unknown stage: ${stageName}`);
      }
    }
    if (MEMBER_IDS.has(item.role)) {
      if (!roles.has(item.role)) {
        pass(`${relativePath} rolePlan role is unique: ${item.role}`);
        roles.add(item.role);
      } else {
        fail(`${relativePath} rolePlan has duplicate role: ${item.role}`);
      }
    }
  }

  if (!templateMode && !roles.has("delivery-manager")) {
    fail(`${relativePath} rolePlan must include delivery-manager for a workspace workflow`);
  }
}

function validateStatusObject(parsed, relativePath, options = {}) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    fail(`${relativePath} must be a JSON object`);
    return false;
  }

  const templateMode = options.templateMode === true;
  const controlErrors = validateDeliveryControl(parsed);
  for (const diagnostic of controlErrors) fail(`${relativePath} ${diagnostic.code}: ${diagnostic.at || ""}`);
  if (controlErrors.length && parsed.schemaVersion) return false;
  if (["2.0", "2.1", "2.2"].includes(parsed.schemaVersion) && !templateMode) {
    const control = parsed.deliveryControl;
    const terminal = ["accepted", "analysis_complete"].includes(control.completion.claim);
    if (terminal) {
      // Archive consistency only. Live file/environment validity is checked by
      // check-delivery in the explicitly selected consumer project.
      const recorded = control.snapshots.find((item) => item.id === control.completion.evidenceReview?.snapshotId);
      const outputHashes = Object.fromEntries([
        ...control.verificationRuns.flatMap((run) => run.outputRefs),
        ...control.environmentProbes.map((probe) => probe.evidence),
      ].map((item) => [item.path, item.hash]));
      const assessment = evaluateDeliveryControl(parsed, { snapshot: recorded, outputHashes });
      if (assessment.readiness !== "ready") {
        for (const diagnostic of assessment.diagnostics) fail(`${relativePath} archive ${diagnostic.code}`);
      } else pass(`${relativePath} versioned archive claim is consistent; live assessment still required`);
    }
  }
  for (const field of ["workflow", "requirementFolder", "complexityLevel", "executionProfile", "verificationLevel", "rolePlan", "updatedAt", "stages"]) {
    if (hasOwn(parsed, field)) {
      pass(`${relativePath} has top-level field: ${field}`);
    } else {
      fail(`${relativePath} missing top-level field: ${field}`);
    }
  }

  if (!templateMode) {
    for (const field of ["workflow", "requirementFolder", "updatedAt"]) {
      if (isMeaningful(parsed[field])) {
        pass(`${relativePath} ${field} is meaningful`);
      } else {
        fail(`${relativePath} ${field} is empty in completed workspace status`);
      }
    }
  }

  if (COMPLEXITY_LEVELS.has(parsed.complexityLevel)) {
    pass(`${relativePath} complexityLevel is valid: ${parsed.complexityLevel}`);
  } else {
    fail(`${relativePath} complexityLevel must be one of S/M/L/XL`);
  }

  if (EXECUTION_PROFILES.has(parsed.executionProfile)) {
    pass(`${relativePath} executionProfile is valid: ${parsed.executionProfile}`);
  } else {
    fail(`${relativePath} executionProfile must be lightweight/standard/assurance`);
  }

  if (VERIFICATION_LEVELS.has(parsed.verificationLevel)) {
    pass(`${relativePath} verificationLevel is valid: ${parsed.verificationLevel}`);
  } else {
    fail(`${relativePath} verificationLevel must be V0/V1/V2/V3/V4`);
  }

  if (!Array.isArray(parsed.stages)) {
    fail(`${relativePath} stages must be an array`);
    return false;
  }
  pass(`${relativePath} stages is an array`);

  const stageNames = new Set();
  for (const [index, stage] of parsed.stages.entries()) {
    if (!stage || typeof stage !== "object" || Array.isArray(stage)) {
      fail(`${relativePath} stage ${index} must be an object`);
      continue;
    }
    for (const field of REQUIRED_STATUS_FIELDS) {
      if (hasOwn(stage, field)) {
        pass(`${relativePath} stage ${index} has ${field}`);
      } else {
        fail(`${relativePath} stage ${index} missing ${field}`);
      }
    }
    if (isMeaningful(stage.name)) stageNames.add(stage.name);
    if (STAGE_STATUSES.has(stage.status)) {
      pass(`${relativePath} stage ${stage.name || index} status is valid: ${stage.status}`);
    } else {
      fail(`${relativePath} stage ${stage.name || index} has invalid status: ${stage.status}`);
    }
    for (const field of ["gates", "artifacts", "evidence"]) {
      if (Array.isArray(stage[field])) {
        pass(`${relativePath} stage ${stage.name || index} ${field} is an array`);
      } else {
        fail(`${relativePath} stage ${stage.name || index} ${field} must be an array`);
      }
    }
    if (!templateMode && stage.status === "completed") {
      if (Array.isArray(stage.gates) && stage.gates.length > 0) {
        pass(`${relativePath} completed stage ${stage.name} has gates`);
      } else {
        fail(`${relativePath} completed stage ${stage.name} missing gates`);
      }
      if (Array.isArray(stage.artifacts) && stage.artifacts.length > 0) {
        pass(`${relativePath} completed stage ${stage.name} has artifacts`);
      } else {
        fail(`${relativePath} completed stage ${stage.name} missing artifacts`);
      }
      if (Array.isArray(stage.evidence) && stage.evidence.length > 0) {
        pass(`${relativePath} completed stage ${stage.name} has evidence`);
      } else {
        fail(`${relativePath} completed stage ${stage.name} missing evidence`);
      }
    }
  }

  validateRolePlan(parsed.rolePlan, stageNames, relativePath, templateMode);

  const expectedStages = REQUIRED_STATUS_STAGES_BY_WORKFLOW[parsed.workflow] ||
    (templateMode ? REQUIRED_STATUS_STAGES_BY_WORKFLOW["requirement-end-to-end"] : null);
  if (!expectedStages) {
    fail(`${relativePath} has unknown workflow stage contract: ${parsed.workflow}`);
    return false;
  }
  for (const stageName of expectedStages) {
    if (stageNames.has(stageName)) {
      pass(`${relativePath} includes stage: ${stageName}`);
    } else {
      fail(`${relativePath} missing required stage: ${stageName}`);
    }
  }
  return true;
}

function validateStatusSchemaContract() {
  const relativePath = "schemas/status.schema.json";
  const schema = parseJsonFile(relativePath);
  if (!schema) return;
  const supportedVersions = schema.properties?.schemaVersion?.enum || [];
  if (supportedVersions.includes("2.0") &&
      supportedVersions.includes("2.1") &&
      supportedVersions.includes("2.2") &&
      schema.dependentRequired?.schemaVersion?.includes("deliveryControl") &&
      schema.dependentRequired?.deliveryControl?.includes("schemaVersion") &&
      schema.$defs?.deliveryControl) {
    pass("status schema requires versioned delivery controls without changing legacy required fields");
  } else {
    fail("status schema missing versioned delivery control contract");
  }
  const deliveryRequired = schema.$defs?.deliveryControl?.required || [];
  const v22 = schema.allOf?.find((item) => item.if?.properties?.schemaVersion?.const === "2.2")
    ?.then?.properties?.deliveryControl;
  if (v22?.required?.includes("assurance") &&
      v22?.properties?.verificationRuns?.items?.required?.includes("result")) {
    pass("status schema requires v2.2 assurance and structured results");
  } else fail("status schema missing v2.2 assurance/result requirement");
  for (const definition of ["assurance", "requirement", "obligation", "consumerContract", "result", "executionIdentity"]) {
    if (schema.$defs?.[definition]) pass(`${relativePath} defines v2.2 contract: ${definition}`);
    else fail(`${relativePath} missing v2.2 contract: ${definition}`);
  }
  for (const field of [
    "taskId",
    "authorizedActions",
    "currentInvocationId",
    "currentImpactScopeIds",
    "invocations",
    "impactScopes",
    "reviewRuns",
    "environmentProbes",
  ]) {
    if (deliveryRequired.includes(field)) {
      pass(`${relativePath} deliveryControl requires P1 field: ${field}`);
    } else {
      fail(`${relativePath} deliveryControl missing P1 field: ${field}`);
    }
  }
  for (const definition of ["invocation", "impactScope", "reviewRun", "environmentProbe"]) {
    if (schema.$defs?.[definition]) {
      pass(`${relativePath} defines P1 contract: ${definition}`);
    } else {
      fail(`${relativePath} missing P1 contract: ${definition}`);
    }
  }
  for (const definition of [
    "testSelection",
    "catalogHealth",
    "knownFailure",
    "verificationPack",
    "recordPolicy",
  ]) {
    if (schema.$defs?.[definition]) {
      pass(`${relativePath} defines v2.1 contract: ${definition}`);
    } else {
      fail(`${relativePath} missing v2.1 contract: ${definition}`);
    }
  }
  for (const field of [
    "testSelections",
    "catalogHealth",
    "knownFailures",
    "verificationPacks",
    "recordPolicy",
  ]) {
    if (schema.$defs?.deliveryControl?.properties?.[field]) {
      pass(`${relativePath} deliveryControl defines v2.1 field: ${field}`);
    } else {
      fail(`${relativePath} deliveryControl missing v2.1 field: ${field}`);
    }
  }
  const enhancedRequired = schema.allOf?.find((item) =>
    item.if?.properties?.schemaVersion?.const === "2.1")
    ?.then?.properties?.deliveryControl?.required || [];
  for (const field of [
    "testSelections",
    "catalogHealth",
    "knownFailures",
    "verificationPacks",
    "recordPolicy",
  ]) {
    if (enhancedRequired.includes(field)) {
      pass(`${relativePath} conditionally requires v2.1 field: ${field}`);
    } else {
      fail(`${relativePath} does not conditionally require v2.1 field: ${field}`);
    }
  }

  const required = Array.isArray(schema.required) ? schema.required : [];
  for (const field of ["workflow", "requirementFolder", "complexityLevel", "executionProfile", "verificationLevel", "rolePlan", "updatedAt", "stages"]) {
    if (required.includes(field)) {
      pass(`${relativePath} requires top-level field: ${field}`);
    } else {
      fail(`${relativePath} does not require top-level field: ${field}`);
    }
  }

  const stageRequired = schema.properties && schema.properties.stages && schema.properties.stages.items
    ? schema.properties.stages.items.required
    : [];
  for (const field of REQUIRED_STATUS_FIELDS) {
    if (Array.isArray(stageRequired) && stageRequired.includes(field)) {
      pass(`${relativePath} stage requires field: ${field}`);
    } else {
      fail(`${relativePath} stage does not require field: ${field}`);
    }
  }

  const rolePlanRequired = schema.properties && schema.properties.rolePlan && schema.properties.rolePlan.items
    ? schema.properties.rolePlan.items.required
    : [];
  for (const field of ["role", "mode", "reason", "stages"]) {
    if (Array.isArray(rolePlanRequired) && rolePlanRequired.includes(field)) {
      pass(`${relativePath} rolePlan item requires field: ${field}`);
    } else {
      fail(`${relativePath} rolePlan item does not require field: ${field}`);
    }
  }
}

function validateDirectedAcyclicGraph(items, idField, dependencyField, label, relativePath) {
  if (!Array.isArray(items) || items.length === 0) {
    fail(`${relativePath} ${label} must be a non-empty array`);
    return;
  }

  const nodes = new Map();
  for (const item of items) {
    const id = item && item[idField];
    if (!isMeaningful(id)) {
      fail(`${relativePath} ${label} item missing ${idField}`);
      continue;
    }
    if (nodes.has(id)) {
      fail(`${relativePath} ${label} has duplicate id: ${id}`);
    } else {
      nodes.set(id, item);
      pass(`${relativePath} ${label} id is unique: ${id}`);
    }
  }

  for (const [id, item] of nodes) {
    const dependencies = item[dependencyField];
    if (!Array.isArray(dependencies)) {
      fail(`${relativePath} ${label} ${id} ${dependencyField} must be an array`);
      continue;
    }
    for (const dependency of dependencies) {
      if (dependency === id) {
        fail(`${relativePath} ${label} ${id} must not depend on itself`);
      } else if (!nodes.has(dependency)) {
        fail(`${relativePath} ${label} ${id} references unknown dependency: ${dependency}`);
      } else {
        pass(`${relativePath} ${label} ${id} dependency exists: ${dependency}`);
      }
    }
  }

  const visiting = new Set();
  const visited = new Set();
  let hasCycle = false;
  function visit(id) {
    if (visiting.has(id)) {
      hasCycle = true;
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    const item = nodes.get(id);
    for (const dependency of Array.isArray(item && item[dependencyField]) ? item[dependencyField] : []) {
      if (nodes.has(dependency)) visit(dependency);
    }
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of nodes.keys()) visit(id);
  if (hasCycle) {
    fail(`${relativePath} ${label} dependency graph must be acyclic`);
  } else {
    pass(`${relativePath} ${label} dependency graph is acyclic`);
  }
}

function validateGoalDesignDocumentSet(documents, label) {
  const { goal, milestones, tasks, autonomy } = documents;
  if (!goal || !milestones || !tasks || !autonomy) return;

  const goalIds = new Set([
    goal.goalId,
    milestones.goalId,
    tasks.goalId,
    autonomy.goalId,
  ]);
  if (goalIds.size === 1 && isMeaningful(goal.goalId)) {
    pass(`${label} uses one goalId across all contracts: ${goal.goalId}`);
  } else {
    fail(`${label} must use one meaningful goalId across all contracts`);
  }

  if (
    Number.isInteger(milestones.plannedIterations) &&
    Number.isInteger(milestones.maxIterations) &&
    milestones.plannedIterations <= milestones.maxIterations
  ) {
    pass(`${label} milestone plannedIterations does not exceed maxIterations`);
  } else {
    fail(`${label} milestone iteration limits are invalid`);
  }

  const iterationPolicy = autonomy.iterationPolicy || {};
  if (
    Number.isInteger(iterationPolicy.plannedIterations) &&
    Number.isInteger(iterationPolicy.maxIterations) &&
    iterationPolicy.plannedIterations <= iterationPolicy.maxIterations
  ) {
    pass(`${label} autonomy plannedIterations does not exceed maxIterations`);
  } else {
    fail(`${label} autonomy iteration limits are invalid`);
  }
  if (
    milestones.plannedIterations === iterationPolicy.plannedIterations &&
    milestones.maxIterations === iterationPolicy.maxIterations
  ) {
    pass(`${label} milestone and autonomy iteration limits match`);
  } else {
    fail(`${label} milestone and autonomy iteration limits must match`);
  }
  if (Number.isInteger(iterationPolicy.maxDesignReviewRounds) && iterationPolicy.maxDesignReviewRounds > 0) {
    pass(`${label} defines a bounded design review loop`);
  } else {
    fail(`${label} must define maxDesignReviewRounds`);
  }

  validateDirectedAcyclicGraph(
    milestones.milestones,
    "milestoneId",
    "dependsOn",
    "milestones",
    label,
  );
  validateDirectedAcyclicGraph(
    tasks.tasks,
    "taskId",
    "dependsOn",
    "tasks",
    label,
  );

  const milestoneMap = new Map(
    (Array.isArray(milestones.milestones) ? milestones.milestones : [])
      .filter((item) => isMeaningful(item && item.milestoneId))
      .map((item) => [item.milestoneId, item]),
  );
  const taskMap = new Map(
    (Array.isArray(tasks.tasks) ? tasks.tasks : [])
      .filter((item) => isMeaningful(item && item.taskId))
      .map((item) => [item.taskId, item]),
  );
  for (const [taskId, task] of taskMap) {
    const milestone = milestoneMap.get(task.milestoneId);
    if (!milestone) {
      fail(`${label} task ${taskId} references unknown milestone: ${task.milestoneId}`);
      continue;
    }
    if (Array.isArray(milestone.taskIds) && milestone.taskIds.includes(taskId)) {
      pass(`${label} task ${taskId} is linked from milestone ${task.milestoneId}`);
    } else {
      fail(`${label} milestone ${task.milestoneId} must reference task ${taskId}`);
    }
    if (task.riskLevel === "high" || task.riskLevel === "critical") {
      if (task.decisionMode === "approval") {
        pass(`${label} high-risk task ${taskId} requires approval`);
      } else {
        fail(`${label} high-risk task ${taskId} must use decisionMode approval`);
      }
    }
  }
  for (const [milestoneId, milestone] of milestoneMap) {
    for (const taskId of Array.isArray(milestone.taskIds) ? milestone.taskIds : []) {
      if (taskMap.has(taskId)) {
        pass(`${label} milestone ${milestoneId} task exists: ${taskId}`);
      } else {
        fail(`${label} milestone ${milestoneId} references unknown task: ${taskId}`);
      }
    }
  }

  const decisionRights = autonomy.decisionRights || {};
  if (
    Array.isArray(decisionRights.approvalRequired) &&
    decisionRights.approvalRequired.length > 0 &&
    Array.isArray(autonomy.approvalGates) &&
    autonomy.approvalGates.length > 0
  ) {
    pass(`${label} defines human approval boundaries`);
  } else {
    fail(`${label} must define approvalRequired decisions and approvalGates`);
  }
  if (Array.isArray(autonomy.stopConditions) && autonomy.stopConditions.length > 0) {
    pass(`${label} defines hard stop conditions`);
  } else {
    fail(`${label} must define stop conditions`);
  }
}

function validateGoalDesignSchemaContracts() {
  const documents = {};
  for (const contract of GOAL_DESIGN_SCHEMA_CONTRACTS) {
    const schema = parseJsonFile(contract.schema);
    const template = parseJsonFile(contract.template);
    if (!schema || !template) continue;

    if (schema.$schema === "https://json-schema.org/draft/2020-12/schema") {
      pass(`${contract.schema} uses JSON Schema draft 2020-12`);
    } else {
      fail(`${contract.schema} must use JSON Schema draft 2020-12`);
    }
    if (schema.type === "object" && schema.additionalProperties === false) {
      pass(`${contract.schema} is a closed object contract`);
    } else {
      fail(`${contract.schema} must be a closed object contract`);
    }
    const schemaRequired = Array.isArray(schema.required) ? schema.required : [];
    for (const field of contract.required) {
      if (schemaRequired.includes(field) && schema.properties && hasOwn(schema.properties, field)) {
        pass(`${contract.schema} requires and defines: ${field}`);
      } else {
        fail(`${contract.schema} must require and define: ${field}`);
      }
      if (hasOwn(template, field)) {
        pass(`${contract.template} provides: ${field}`);
      } else {
        fail(`${contract.template} missing: ${field}`);
      }
    }
    if (template.schemaVersion === "1.0.0") {
      pass(`${contract.template} uses schemaVersion 1.0.0`);
    } else {
      fail(`${contract.template} must use schemaVersion 1.0.0`);
    }

    if (contract.schema.includes("goal-contract")) documents.goal = template;
    if (contract.schema.includes("milestone")) documents.milestones = template;
    if (contract.schema.includes("task.schema")) documents.tasks = template;
    if (contract.schema.includes("autonomy-policy")) documents.autonomy = template;
  }
  validateGoalDesignDocumentSet(documents, "goal design templates");
}

function validateSkillEvaluationContract() {
  const schemaPath = "schemas/skill-evaluation.schema.json";
  const templatePath = "assets/templates/skill-evaluation.json";
  const schema = parseJsonFile(schemaPath);
  const template = parseJsonFile(templatePath);
  if (!schema || !template) return;
  if (schema.$schema === "https://json-schema.org/draft/2020-12/schema") {
    pass(`${schemaPath} uses JSON Schema draft 2020-12`);
  } else {
    fail(`${schemaPath} must use JSON Schema draft 2020-12`);
  }
  for (const field of [
    "schemaVersion",
    "evaluationId",
    "baseline",
    "candidate",
    "policy",
    "offlineCases",
    "pilotTasks",
  ]) {
    if (schema.required?.includes(field) && hasOwn(schema.properties || {}, field)) {
      pass(`${schemaPath} requires and defines: ${field}`);
    } else {
      fail(`${schemaPath} missing required field: ${field}`);
    }
    if (hasOwn(template, field)) {
      pass(`${templatePath} provides: ${field}`);
    } else {
      fail(`${templatePath} missing: ${field}`);
    }
  }
  const diagnostics = validateSkillEvaluation(template);
  if (diagnostics.length === 0) {
    pass(`${templatePath} passes deterministic evaluation validation`);
  } else {
    for (const diagnostic of diagnostics) {
      fail(`${templatePath} ${diagnostic.code}: ${diagnostic.at || ""}`);
    }
  }
}

function validateWorkflowStatusTemplate(relativePath) {
  const parsed = parseJsonFile(relativePath);
  if (!parsed) return;
  validateStatusObject(parsed, relativePath, { templateMode: true });
}

function validateBusinessImpactRubric() {
  const relativePath = "docs/business-impact-rubric.md";
  for (const heading of ["必填输入", "辅助评估", "阻断规则", "产物映射", "证据要求"]) {
    requireSectionHasContent(relativePath, heading);
  }
  const mappingTable = requireTableRows(relativePath, "产物映射", [
    "`prd.md`",
    "`delivery-summary.md`",
    "`workflow-status.json`",
    "`evidence/README.md`"
  ]);
  if (mappingTable && mappingTable.rows.length >= 4) {
    pass(`${relativePath} maps business impact to required artifacts`);
  } else {
    fail(`${relativePath} must map business impact to required artifacts`);
  }
}

function validateTemplateContracts() {
  requireTableRows("assets/templates/prd.md", "价值假设与业务影响", REQUIRED_PRD_BUSINESS_ROWS);
  requireTableHeaders("assets/templates/prd.md", "指标基线与观测计划", REQUIRED_PRD_METRIC_HEADERS);
  requireSectionExists("assets/templates/prd.md", "上线后复盘计划");

  requireTableRows("assets/templates/delivery-summary.md", "业务影响与收益观测", REQUIRED_DELIVERY_BUSINESS_ROWS);
  requireTableHeaders("assets/templates/delivery-summary.md", "质量评估（可选）", ["维度", "证据化判断", "可选分数"]);
  requireTableHeaders("assets/templates/delivery-summary.md", "证据索引", ["结论", "证据类型", "路径/来源", "说明"]);
  requireTableHeaders("assets/templates/delivery-summary.md", "执行档位与验证等级", ["项", "内容"]);
  requireTableHeaders("assets/templates/delivery-summary.md", "角色激活计划", ["角色", "模式", "场景依据", "实际贡献/未参与原因"]);
  requireTableHeaders("assets/templates/delivery-summary.md", "验证结果", ["验收 ID / Check ID", "Run ID", "方法/环境", "结果", "证据", "说明"]);
  requireTableHeaders("assets/templates/technical-design.md", "事实与假设", ["类型", "内容", "证据/来源", "对方案的影响"]);
  requireTableHeaders("assets/templates/technical-design.md", "决策与职责边界", ["决策", "候选方案", "最终选择与依据", "责任角色", "验证/回滚"]);
  requireTableHeaders("assets/templates/requirement-review.md", "验收与可测性", [
    "验收编号",
    "前置条件",
    "输入/动作",
    "可观察结果",
    "证据",
    "QA 结论"
  ]);
  for (const heading of [
    "背景与目标",
    "需求分析",
    "技术核心模块设计",
    "复杂逻辑拆解",
    "实现方案对比",
    "Contract Schemas",
    "里程碑与 Task DAG",
    "迭代节奏与迭代路径",
    "Review Resolution",
    "User Decision"
  ]) {
    requireSectionExists("assets/templates/goal-driven-technical-design.md", heading);
  }
  requireTableHeaders("assets/templates/goal-driven-technical-design.md", "Contract Schemas", [
    "契约",
    "Schema",
    "当前目标实例",
    "用途",
    "关键约束"
  ]);
  requireTableHeaders("assets/templates/technical-design-review.md", "角色评审结论", [
    "意见编号",
    "角色",
    "结论",
    "严重度",
    "关联章节/契约",
    "证据或反例",
    "必须修改项",
    "置信度"
  ]);
  requireTableHeaders("assets/templates/technical-design-review.md", "评审意见处置", [
    "意见编号",
    "处置",
    "修改内容",
    "修改位置",
    "责任角色",
    "复核角色",
    "状态"
  ]);
  requireTableHeaders("assets/templates/test-plan.md", "风险与测试策略", ["风险/失效条件", "测试层级", "负责人", "最低验证等级", "不覆盖的影响"]);
  requireTableHeaders("assets/templates/test-plan.md", "测试场景", ["验收 ID", "Check ID / caseKey", "类型", "方法/环境", "场景与步骤", "期望结果", "Run ID / 结果"]);
  requireTableHeaders("assets/templates/test-plan.md", "测试选择与 Catalog 健康", ["Selection ID", "显式任务路径 / Scope 来源", "Selector", "命中 Check / Test", "未映射 / 排除依据", "Catalog Health", "完整性"]);
  requireTableHeaders("assets/templates/test-plan.md", "风险验证包", ["Pack", "触发依据", "选择", "Required Check", "不适用理由"]);
  requireTableHeaders("assets/templates/bug-analysis.md", "复现与基线证据", ["项", "内容"]);
  requireTableHeaders("assets/templates/bug-analysis.md", "期望行为", ["验收 ID", "契约修订", "正确期望", "依据", "适用范围"]);
  requireTableHeaders("assets/templates/bug-analysis.md", "保留行为与消费方", ["验收 ID", "类型", "必须保持的行为/消费入口", "不适用理由与决策"]);
  requireTableHeaders("assets/templates/bug-analysis.md", "假设与排除", ["假设", "证据", "结论", "下一步"]);
  requireTableHeaders("assets/templates/code-review.md", "分级发现", [
    "Finding ID",
    "严重度",
    "代码位置",
    "失效场景",
    "证据",
    "建议动作",
    "验证方式",
    "Acceptance / Check ID",
    "状态"
  ]);
  requireTableHeaders("assets/templates/code-review.md", "角色激活计划", ["角色", "模式", "审查维度/场景依据", "参与阶段"]);
  requireTableHeaders("assets/templates/code-review.md", "Finding 裁决", [
    "Finding ID",
    "契约依据",
    "支持证据",
    "反证检查 / Counterevidence",
    "证据状态",
    "变更归因",
    "置信度",
    "已修核对 / Fixed State"
  ]);

  for (const heading of REQUIRED_HANDOFF_SECTIONS) {
    requireSectionExists("assets/templates/role-handoff.md", heading);
  }
  requireTableHeaders("assets/templates/role-handoff.md", "角色激活计划", ["角色", "模式", "场景依据", "参与阶段"]);
  requireTableHeaders("assets/templates/role-handoff.md", "交付控制", ["Active Contract", "Required Checks", "Selection / Catalog / Run", "Readiness", "Record Policy / Evidence Review"]);
  requireTableHeaders("assets/templates/role-handoff.md", "Hybrid 子 Agent 输出汇总", [
    "角色",
    "结论",
    "证据",
    "风险",
    "置信度",
    "需决策项"
  ]);
}

function validateWorkspacePrd(workspaceDir) {
  const relativePath = path.join(workspaceDir, "prd.md");
  if (!fs.existsSync(path.join(ROOT, relativePath))) {
    fail(`${relativePath} missing for completed PRD stage`);
    return;
  }
  requireMeaningfulRows(relativePath, "价值假设与业务影响", REQUIRED_PRD_BUSINESS_ROWS, [1, 2]);
  const metricTable = requireTableHeaders(relativePath, "指标基线与观测计划", REQUIRED_PRD_METRIC_HEADERS);
  if (metricTable && metricTable.rows.some((row) => REQUIRED_PRD_METRIC_HEADERS.every((_, index) => isMeaningful(row[index])))) {
    pass(`${relativePath} has at least one meaningful metric baseline row`);
  } else {
    fail(`${relativePath} missing meaningful metric baseline row`);
  }
  requireSectionHasContent(relativePath, "上线后复盘计划");
}

function parseScore(value) {
  const normalized = String(value || "").trim();
  if (/^N\/A$/i.test(normalized)) return null;
  const match = normalized.match(/^([0-5])(?:\s*\/\s*5)?/);
  return match ? Number(match[1]) : undefined;
}

function validateWorkspaceRolePlanTable(relativePath, status, heading, requiredColumns) {
  const table = findFirstTable(readText(relativePath), heading);
  if (!table) {
    fail(`${relativePath} missing rolePlan table: ${heading}`);
    return;
  }
  for (const column of requiredColumns) {
    if (table.headers.includes(column)) {
      pass(`${relativePath} ${heading} table has header: ${column}`);
    } else {
      fail(`${relativePath} ${heading} table missing header: ${column}`);
    }
  }
  const expectedCount = Array.isArray(status.rolePlan) ? status.rolePlan.length : 0;
  if (
    table.rows.length >= expectedCount &&
    table.rows.every((row) => row.slice(0, requiredColumns.length).every(isMeaningful))
  ) {
    pass(`${relativePath} ${heading} records every rolePlan decision`);
  } else {
    fail(`${relativePath} ${heading} must contain a meaningful row for every rolePlan decision`);
  }
}

function validateWorkspaceDeliverySummary(workspaceDir, status) {
  const relativePath = path.join(workspaceDir, "delivery-summary.md");
  if (!fs.existsSync(path.join(ROOT, relativePath))) {
    fail(`${relativePath} missing for completed Delivery stage`);
    return;
  }
  if (status.workflow === "requirement-end-to-end") {
    requireMeaningfulRows(relativePath, "业务影响与收益观测", REQUIRED_DELIVERY_BUSINESS_ROWS, [1, 2, 3]);
  } else {
    requireTableRows(relativePath, "业务影响与收益观测", REQUIRED_DELIVERY_BUSINESS_ROWS);
  }
  const evidenceTable = findFirstTable(readText(relativePath), "证据索引");
  if (evidenceTable && evidenceTable.rows.length > 0 && evidenceTable.rows.every((row) => row.slice(0, 3).every(isMeaningful))) {
    pass(`${relativePath} has non-empty evidence index`);
  } else {
    fail(`${relativePath} missing non-empty evidence index`);
  }

  const verificationTable = findFirstTable(readText(relativePath), "执行档位与验证等级");
  const verificationRows = verificationTable ? tableRowsByFirstColumn(verificationTable) : new Map();
  const profileRow = verificationRows.get("执行档位");
  const levelRow = verificationRows.get("当前验证等级");
  if (profileRow && profileRow[1] === status.executionProfile) {
    pass(`${relativePath} executionProfile matches workflow status`);
  } else {
    fail(`${relativePath} executionProfile must match workflow status`);
  }
  if (levelRow && levelRow[1] === status.verificationLevel) {
    pass(`${relativePath} verificationLevel matches workflow status`);
  } else {
    fail(`${relativePath} verificationLevel must match workflow status`);
  }
  validateWorkspaceRolePlanTable(relativePath, status, "角色激活计划", ["角色", "模式", "场景依据", "实际贡献/未参与原因"]);

  const qualityTable = findFirstTable(readText(relativePath), "质量评估（可选）");
  if (qualityTable) {
    for (const row of qualityTable.rows) {
      const score = parseScore(row[2]);
      if (score === undefined && isMeaningful(row[2])) {
        fail(`${relativePath} optional quality score must be 0-5 or N/A`);
      }
    }
    pass(`${relativePath} optional quality assessment does not gate delivery`);
  }
}

function tableHasRows(relativePath, heading) {
  const table = findFirstTable(readText(relativePath), heading);
  return Boolean(table && table.rows.length > 0);
}

function artifactOmitted(status, artifact) {
  return ["2.1", "2.2"].includes(status?.schemaVersion) &&
    status.deliveryControl?.recordPolicy?.omittedArtifacts?.some((item) =>
      item.artifact === artifact && isMeaningful(item.reason) &&
      isMeaningful(item.decisionRef));
}

function validateWorkspaceHandoff(workspaceDir, status) {
  const relativePath = path.join(workspaceDir, "role-handoff.md");
  if (!fs.existsSync(path.join(ROOT, relativePath))) {
    if (artifactOmitted(status, "role-handoff.md")) {
      pass(`${relativePath} omitted by recordPolicy with decisionRef`);
      return;
    }
    fail(`${relativePath} missing for completed handoff-gate stage`);
    return;
  }
  if (tableHasRows(relativePath, "交接记录")) {
    pass(`${relativePath} has handoff records`);
  } else {
    fail(`${relativePath} missing handoff records`);
  }
  for (const heading of ["背景", "当前阶段", "已确认决策", "待确认问题"]) {
    requireSectionHasContent(relativePath, heading);
  }
  for (const heading of ["风险", "产出物", "验证"]) {
    if (tableHasRows(relativePath, heading)) {
      pass(`${relativePath} ${heading} table has rows`);
    } else {
      fail(`${relativePath} ${heading} table missing rows`);
    }
  }
  if (status) {
    validateWorkspaceRolePlanTable(relativePath, status, "角色激活计划", ["角色", "模式", "场景依据", "参与阶段"]);
  }
  if (tableHasRows(relativePath, "Hybrid 子 Agent 输出汇总")) {
    pass(`${relativePath} has hybrid sub-agent output summary`);
  } else {
    fail(`${relativePath} missing hybrid sub-agent output summary`);
  }
}

function shouldCheckWorkspacePath(value) {
  const normalized = String(value || "").trim();
  return Boolean(normalized) && !/^https?:\/\//.test(normalized) && (normalized.includes("/") || path.extname(normalized));
}

function validateCompletedWorkspaceArtifacts(workspaceDir, status) {
  for (const stage of status.stages || []) {
    if (stage.status !== "completed") continue;
    for (const artifact of stage.artifacts || []) {
      if (!shouldCheckWorkspacePath(artifact)) continue;
      const artifactPath = path.join(ROOT, workspaceDir, artifact);
      if (fs.existsSync(artifactPath)) {
        pass(`${workspaceDir} completed stage ${stage.name} artifact exists: ${artifact}`);
      } else {
        fail(`${workspaceDir} completed stage ${stage.name} missing artifact path: ${artifact}`);
      }
    }
    for (const evidence of stage.evidence || []) {
      if (!shouldCheckWorkspacePath(evidence)) continue;
      const evidencePath = path.join(ROOT, workspaceDir, evidence);
      if (fs.existsSync(evidencePath)) {
        pass(`${workspaceDir} completed stage ${stage.name} evidence exists: ${evidence}`);
      } else {
        fail(`${workspaceDir} completed stage ${stage.name} missing evidence path: ${evidence}`);
      }
    }
  }
}

function validateWorkspaceGoalDesignContracts(workspaceDir) {
  const files = {
    goal: "goal-contract.json",
    milestones: "milestones.json",
    tasks: "tasks.json",
    autonomy: "autonomy-policy.json",
  };
  const documents = {};
  for (const [key, fileName] of Object.entries(files)) {
    const relativePath = path.join(workspaceDir, fileName);
    if (!fs.existsSync(path.join(ROOT, relativePath))) {
      fail(`${relativePath} missing for completed goal-driven design`);
      continue;
    }
    documents[key] = parseJsonFile(relativePath);
  }
  validateGoalDesignDocumentSet(documents, workspaceDir);
}

function validateWorkspaceStatus(workspaceDir) {
  const statusPath = path.join(workspaceDir, "workflow-status.json");
  if (!fs.existsSync(path.join(ROOT, statusPath))) {
    fail(`${statusPath} missing`);
    return false;
  }

  const status = parseJsonFile(statusPath);
  if (!status) return true;
  validateStatusObject(status, statusPath, { templateMode: false });
  validateCompletedWorkspaceArtifacts(workspaceDir, status);

  const completedStages = new Set(
    (status.stages || [])
      .filter((stage) => stage.status === "completed")
      .map((stage) => stage.name),
  );
  if (completedStages.has("PRD")) validateWorkspacePrd(workspaceDir);
  if (
    status.workflow === "goal-driven-technical-design" &&
    (completedStages.has("Architecture Design") || completedStages.has("Decision Handoff"))
  ) {
    validateWorkspaceGoalDesignContracts(workspaceDir);
  }
  if (completedStages.has("Delivery")) {
    if (artifactOmitted(status, "delivery-summary.md")) {
      pass(`${workspaceDir}/delivery-summary.md omitted by recordPolicy with decisionRef`);
    } else {
      validateWorkspaceDeliverySummary(workspaceDir, status);
    }
  }
  if (
    (status.stages || []).some(
      (stage) =>
        stage.status === "completed" &&
        Array.isArray(stage.gates) &&
        stage.gates.includes("handoff-gate"),
    )
  ) {
    validateWorkspaceHandoff(workspaceDir, status);
  }
  return true;
}

function normalizeWorkspaceDir(value) {
  const workspaceRoot = path.join(ROOT, "workspace");
  if (path.isAbsolute(value)) {
    throw new CliArgumentError("--workspace must be a relative path");
  }
  const absolute = path.resolve(ROOT, value);
  if (
    absolute === workspaceRoot ||
    !absolute.startsWith(`${workspaceRoot}${path.sep}`)
  ) {
    throw new CliArgumentError(
      "--workspace must resolve inside the workspace directory",
    );
  }
  return path.relative(ROOT, absolute);
}

function validateWorkspaceStatuses(workspaceDirs) {
  const workspaceRoot = path.join(ROOT, "workspace");
  if (!fs.existsSync(workspaceRoot)) return;

  if (Array.isArray(workspaceDirs)) {
    let checked = 0;
    for (const workspaceDir of workspaceDirs) {
      if (validateWorkspaceStatus(workspaceDir)) checked += 1;
    }
    pass(`validated ${checked} workspace status file(s)`);
    return;
  }

  const entries = fs.readdirSync(workspaceRoot, { withFileTypes: true });
  let checked = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const workspaceDir = path.join("workspace", entry.name);
    const statusPath = path.join(ROOT, workspaceDir, "workflow-status.json");
    if (!fs.existsSync(statusPath)) continue;
    if (validateWorkspaceStatus(workspaceDir)) checked += 1;
  }

  if (checked === 0) {
    pass("no completed workspace status files found; template contracts still validated");
  } else {
    pass(`validated ${checked} workspace status file(s)`);
  }
}

function validateLegacyPatternContract() {
  const commandPattern = LEGACY_PATTERNS.find((item) => item.label === "legacy command").pattern;
  const shortNamePattern = LEGACY_PATTERNS.find((item) => item.label === "legacy project short name").pattern;
  const pathPattern = LEGACY_PATTERNS.find((item) => item.label === "legacy local path").pattern;
  const encodedPathPattern = LEGACY_PATTERNS.find((item) => item.label === "legacy encoded local path").pattern;

  if (commandPattern.test(`${LEGACY_COMMAND} build`)) {
    pass("no-legacy-contract pattern detects legacy command");
  } else {
    fail("no-legacy-contract pattern must detect legacy command");
  }
  if (shortNamePattern.test(["legacy", LEGACY_SHORT_NAME, "docs"].join(" "))) {
    pass("no-legacy-contract pattern detects legacy short name");
  } else {
    fail("no-legacy-contract pattern must detect legacy short name");
  }
  if (!shortNamePattern.test("ai-work-team")) {
    pass("no-legacy-contract pattern allows current skill name ai-work-team");
  } else {
    fail("no-legacy-contract pattern must not flag ai-work-team");
  }
  if (pathPattern.test(`${LEGACY_LOCAL_PATH}/workspace`)) {
    pass("no-legacy-contract pattern detects legacy local path");
  } else {
    fail("no-legacy-contract pattern must detect legacy local path");
  }
  if (encodedPathPattern.test(`${LEGACY_ENCODED_LOCAL_PATH}%2Fworkspace`)) {
    pass("no-legacy-contract pattern detects URL-encoded legacy local path");
  } else {
    fail("no-legacy-contract pattern must detect URL-encoded legacy local path");
  }
}

function validateNoLegacyContract() {
  const files = collectFiles(ROOT);
  let legacyHits = 0;
  for (const absolutePath of files) {
    const relativePath = path.relative(ROOT, absolutePath);
    const content = fs.readFileSync(absolutePath, "utf8");
    for (const { label, pattern } of LEGACY_PATTERNS) {
      const match = content.match(pattern);
      if (match) {
        fail(`no-legacy-contract ${label} in ${relativePath}`);
        legacyHits += 1;
      }
    }
  }
  if (legacyHits === 0) {
    pass("no-legacy-contract has no legacy command, short name, or local path in source documents");
  }
}

validateStatusSchemaContract();
validateWorkflowStatusTemplate("assets/templates/workflow-status.json");
validateWorkflowStatusTemplate("assets/templates/goal-design-workflow-status.json");
validateWorkflowStatusTemplate("assets/templates/bugfix-workflow-status.json");
validateWorkflowStatusTemplate("assets/templates/code-review-workflow-status.json");
validateGoalDesignSchemaContracts();
validateSkillEvaluationContract();
validateBusinessImpactRubric();
validateTemplateContracts();
try {
  if (command.workspace) {
    validateWorkspaceStatuses([normalizeWorkspaceDir(command.workspace)]);
  } else if (command.allWorkspaces) {
    validateWorkspaceStatuses();
  }
} catch (error) {
  console.error(error.message);
  process.exit(error instanceof CliArgumentError ? error.exitCode : 1);
}
validateLegacyPatternContract();
validateNoLegacyContract();

if (failed > 0) {
  console.error(`\n${failed} contract check(s) failed.`);
  process.exit(1);
}

console.log("\nAll implementation contract checks passed.");
