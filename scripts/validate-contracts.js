#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", "coverage", ".next", ".turbo"]);

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
  "bugfix-delivery": ["Triage", "Reproduce", "Diagnose", "Fix", "Regression", "Delivery"],
  "code-review-delivery": ["Scope", "Behavior Review", "Domain Review", "Test Review", "Optimize", "Verify & Deliver"]
};
const REQUIRED_PRD_BUSINESS_ROWS = ["目标用户", "用户价值", "业务价值", "价值假设", "预期收益", "成本收益比"];
const REQUIRED_PRD_METRIC_HEADERS = ["指标", "当前基线", "目标变化", "数据来源", "观察周期", "异常阈值"];
const REQUIRED_DELIVERY_BUSINESS_ROWS = ["价值假设", "指标基线", "收益目标", "成本收益比", "上线后观测结果/计划"];
const REQUIRED_QUALITY_DIMENSIONS = ["业务影响", "技术先进性", "健壮性", "测试可信度", "UI 美观与可用性", "安全与兼容性", "交付完整度"];
const REQUIRED_HANDOFF_SECTIONS = ["背景", "当前阶段", "已确认决策", "待确认问题", "风险", "产出物", "验证"];

const checks = [
  {
    file: "SKILL.md",
    mustContain: [
      "workspace/<requirement-folder>",
      "workflows/implementation-protocol.md",
      "docs/quality-rubrics.md",
      "docs/business-impact-rubric.md",
      "docs/handoff-contract.md",
      "value-gate",
      "decision-log.md",
      "role-handoff.md",
      "S / M / L / XL",
      "executionProfile",
      "verificationLevel",
      "rolePlan",
      "role-activation-gate",
      "code-review-delivery.md",
      "质量评分"
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
      "质量评分达到最低线"
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
      "risk-register.md",
      "role-handoff.md",
      "workflow-status.json",
      "execution-methodology.md",
      "业务影响",
      "质量评分"
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
      "交付最低线"
    ]
  },
  {
    file: "commands/team.md",
    mustContain: [
      "workspace 目录",
      "代码实现",
      "质量评分",
      "未能确定项目根目录",
      "价值门禁",
      "决策日志",
      "风险台账",
      "交接记录",
      "/team buildContext",
      "/team install",
      "/team code-review",
      "external-skills/catalog.json"
    ]
  },
  {
    file: "docs/quality-gates.md",
    mustContain: [
      "value-gate",
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
      "评分标准",
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
      "质量评分",
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
      "evidence"
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
      "验证等级"
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
}

function collectFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(absolute, files);
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

function validateWorkflowStatusTemplate(relativePath) {
  const parsed = parseJsonFile(relativePath);
  if (!parsed) return;
  validateStatusObject(parsed, relativePath, { templateMode: true });
}

function validateBusinessImpactRubric() {
  const relativePath = "docs/business-impact-rubric.md";
  for (const heading of ["必填输入", "评分标准", "阻断规则", "产物映射", "证据要求"]) {
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
  requireTableRows("assets/templates/delivery-summary.md", "质量评分", REQUIRED_QUALITY_DIMENSIONS);
  requireTableHeaders("assets/templates/delivery-summary.md", "证据索引", ["结论", "证据类型", "路径/来源", "说明"]);
  requireTableHeaders("assets/templates/delivery-summary.md", "执行档位与验证等级", ["项", "内容"]);
  requireTableHeaders("assets/templates/delivery-summary.md", "角色激活计划", ["角色", "模式", "场景依据", "实际贡献/未参与原因"]);
  requireTableHeaders("assets/templates/technical-design.md", "事实与假设", ["类型", "内容", "证据/来源", "对方案的影响"]);
  requireTableHeaders("assets/templates/technical-design.md", "决策与职责边界", ["决策", "候选方案", "最终选择与依据", "责任角色", "验证/回滚"]);
  requireTableHeaders("assets/templates/test-plan.md", "风险与测试策略", ["风险/失效条件", "测试层级", "负责人", "最低验证等级", "不覆盖的影响"]);
  requireTableHeaders("assets/templates/bug-analysis.md", "复现与基线证据", ["项", "内容"]);
  requireTableHeaders("assets/templates/bug-analysis.md", "假设与排除", ["假设", "证据", "结论", "下一步"]);
  requireTableHeaders("assets/templates/code-review.md", "分级发现", [
    "严重度",
    "代码位置",
    "失效场景",
    "证据",
    "建议动作",
    "验证方式",
    "状态"
  ]);
  requireTableHeaders("assets/templates/code-review.md", "角色激活计划", ["角色", "模式", "审查维度/场景依据", "参与阶段"]);

  for (const heading of REQUIRED_HANDOFF_SECTIONS) {
    requireSectionExists("assets/templates/role-handoff.md", heading);
  }
  requireTableHeaders("assets/templates/role-handoff.md", "角色激活计划", ["角色", "模式", "场景依据", "参与阶段"]);
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

function roleParticipates(status, role) {
  return Array.isArray(status.rolePlan) && status.rolePlan.some(
    (item) => item.role === role && (item.mode === "active" || item.mode === "consulted")
  );
}

function scoreMayBeNotApplicable(dimension, status, row) {
  const reason = String(row[2] || "").trim();
  if (!isMeaningful(reason)) return false;
  if (dimension === "UI 美观与可用性") return !roleParticipates(status, "ui-designer");
  if (dimension === "业务影响") {
    return /纯内部|缺陷修复|代码审查|不涉及.*业务|非业务变化/.test(reason);
  }
  return false;
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

  const qualityTable = requireTableRows(relativePath, "质量评分", REQUIRED_QUALITY_DIMENSIONS);
  if (!qualityTable) return;
  const rows = tableRowsByFirstColumn(qualityTable);
  const minimums = new Map([
    ["业务影响", 4],
    ["技术先进性", 3],
    ["健壮性", 4],
    ["测试可信度", 4],
    ["安全与兼容性", 4],
    ["交付完整度", 4]
  ]);
  for (const dimension of REQUIRED_QUALITY_DIMENSIONS) {
    const row = rows.get(dimension);
    if (!row) continue;
    const score = parseScore(row[1]);
    if (score === null && scoreMayBeNotApplicable(dimension, status, row)) {
      pass(`${relativePath} ${dimension} is N/A with rolePlan basis`);
      continue;
    }
    const minimum = minimums.get(dimension) || 4;
    if (typeof score === "number" && score >= minimum) {
      pass(`${relativePath} ${dimension} score meets minimum ${minimum}`);
    } else {
      fail(`${relativePath} ${dimension} score must be >= ${minimum} or valid rolePlan-backed N/A`);
    }
  }
}

function tableHasRows(relativePath, heading) {
  const table = findFirstTable(readText(relativePath), heading);
  return Boolean(table && table.rows.length > 0);
}

function validateWorkspaceHandoff(workspaceDir) {
  const relativePath = path.join(workspaceDir, "role-handoff.md");
  if (!fs.existsSync(path.join(ROOT, relativePath))) {
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
  const statusPath = path.join(workspaceDir, "workflow-status.json");
  const status = parseJsonFile(statusPath);
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

function validateWorkspaceStatuses() {
  const workspaceRoot = path.join(ROOT, "workspace");
  if (!fs.existsSync(workspaceRoot)) return;

  const entries = fs.readdirSync(workspaceRoot, { withFileTypes: true });
  let checked = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const workspaceDir = path.join("workspace", entry.name);
    const statusPath = path.join(workspaceDir, "workflow-status.json");
    if (!fs.existsSync(path.join(ROOT, statusPath))) continue;
    checked += 1;
    const status = parseJsonFile(statusPath);
    if (!status) continue;
    validateStatusObject(status, statusPath, { templateMode: false });
    validateCompletedWorkspaceArtifacts(workspaceDir, status);

    const completedStages = new Set((status.stages || []).filter((stage) => stage.status === "completed").map((stage) => stage.name));
    if (completedStages.has("PRD")) validateWorkspacePrd(workspaceDir);
    if (completedStages.has("Delivery")) validateWorkspaceDeliverySummary(workspaceDir, status);
    if ((status.stages || []).some((stage) => stage.status === "completed" && Array.isArray(stage.gates) && stage.gates.includes("handoff-gate"))) {
      validateWorkspaceHandoff(workspaceDir);
    }
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
validateWorkflowStatusTemplate("assets/templates/bugfix-workflow-status.json");
validateWorkflowStatusTemplate("assets/templates/code-review-workflow-status.json");
validateBusinessImpactRubric();
validateTemplateContracts();
validateWorkspaceStatuses();
validateLegacyPatternContract();
validateNoLegacyContract();

if (failed > 0) {
  console.error(`\n${failed} contract check(s) failed.`);
  process.exit(1);
}

console.log("\nAll implementation contract checks passed.");
