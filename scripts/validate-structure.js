#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const requiredFiles = [
  "SKILL.md",
  "README.md",
  "package.json",
  "skill-runtime.json",
  "members/README.md",
  "workflows/README.md",
  "workflows/route-table.md",
  "workflows/execution-protocol.md",
  "workflows/implementation-protocol.md",
  "commands/README.md",
  "commands/team.md",
  "external-cli/README.md",
  "docs/README.md",
  "docs/quality-gates.md",
  "docs/quality-rubrics.md",
  "docs/business-impact-rubric.md",
  "docs/handoff-contract.md",
  "scripts/README.md",
  "workspace/README.md"
];

const requiredDirs = [
  "members",
  "workflows",
  "commands",
  "external-cli",
  "external-skills",
  "docs/methodologies",
  "docs/engineering-standards",
  "docs/integrations",
  "schemas",
  "assets/templates",
  "workspace",
  "scripts"
];

const memberFiles = [
  "members/product-manager.md",
  "members/operations-manager.md",
  "members/ui-designer.md",
  "members/tech-lead.md",
  "members/frontend-engineer.md",
  "members/backend-engineer.md",
  "members/qa-engineer.md",
  "members/delivery-manager.md"
];

const workflowFiles = [
  "workflows/route-table.md",
  "workflows/execution-protocol.md",
  "workflows/implementation-protocol.md",
  "workflows/requirement-end-to-end.md",
  "workflows/requirement-review.md",
  "workflows/technical-design-review.md",
  "workflows/bugfix-delivery.md",
  "workflows/code-review-delivery.md",
  "workflows/product-ui-qa-walkthrough.md",
  "workflows/external-skill-install.md",
  "workflows/project-context-build.md"
];

const schemaFiles = [
  "schemas/member.schema.json",
  "schemas/workflow.schema.json",
  "schemas/command.schema.json",
  "schemas/status.schema.json",
  "schemas/skill-runtime.schema.json"
];

const templateFiles = [
  "assets/templates/requirement-brief.md",
  "assets/templates/prd.md",
  "assets/templates/decision-log.md",
  "assets/templates/risk-register.md",
  "assets/templates/role-handoff.md",
  "assets/templates/workflow-status.json",
  "assets/templates/bugfix-workflow-status.json",
  "assets/templates/code-review-workflow-status.json",
  "assets/templates/bug-analysis.md",
  "assets/templates/code-review.md",
  "assets/templates/ui-review.md",
  "assets/templates/technical-design.md",
  "assets/templates/implementation-plan.md",
  "assets/templates/test-plan.md",
  "assets/templates/walkthrough-report.md",
  "assets/templates/delivery-summary.md",
  "assets/templates/workflow-status.md",
  "assets/templates/workspace-requirement-readme.md",
  "assets/templates/agents-context.md"
];

const methodologyFiles = [
  "docs/methodologies/README.md",
  "docs/methodologies/product-methodology.md",
  "docs/methodologies/operations-methodology.md",
  "docs/methodologies/ui-methodology.md",
  "docs/methodologies/engineering-methodology.md",
  "docs/methodologies/technical-lead-methodology.md",
  "docs/methodologies/frontend-engineering-methodology.md",
  "docs/methodologies/backend-engineering-methodology.md",
  "docs/methodologies/qa-methodology.md",
  "docs/methodologies/delivery-methodology.md",
  "docs/methodologies/execution-methodology.md",
  "docs/methodologies/role-activation-methodology.md"
];

const standardFiles = [
  "docs/engineering-standards/README.md",
  "docs/engineering-standards/code-change-standard.md",
  "docs/engineering-standards/technical-design-standard.md",
  "docs/engineering-standards/testing-standard.md",
  "docs/engineering-standards/review-standard.md",
  "docs/engineering-standards/release-standard.md",
  "docs/engineering-standards/security-standard.md"
];

const integrationFiles = [
  "docs/integrations/README.md",
  "docs/integrations/lark-contract.md",
  "docs/integrations/issue-tracker-contract.md",
  "docs/integrations/code-platform-contract.md"
];

const externalSkillFiles = [
  "external-skills/README.md",
  "external-skills/catalog.json",
  "external-skills/install-policy.md",
  "external-skills/role-map.md",
  "external-skills/workflow-template.md",
  "scripts/list-external-skills.js",
  "scripts/install-external-skills.js",
  "scripts/external-skill-utils.js",
  "scripts/build-context.js"
];

const commandFiles = ["commands/team.md"];

const results = [];

function record(ok, message) {
  results.push({ ok, message });
}

function abs(relativePath) {
  return path.join(ROOT, relativePath);
}

function existsFile(relativePath) {
  return fs.existsSync(abs(relativePath)) && fs.statSync(abs(relativePath)).isFile();
}

function existsDir(relativePath) {
  return fs.existsSync(abs(relativePath)) && fs.statSync(abs(relativePath)).isDirectory();
}

function read(relativePath) {
  return fs.readFileSync(abs(relativePath), "utf8");
}

function frontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[1] : null;
}

function stripQuotes(value) {
  return value.trim().replace(/^["']|["']$/g, "");
}

function parseFrontmatter(content) {
  const block = frontmatter(content);
  if (!block) return null;

  const data = {};
  let currentKey = null;

  for (const line of block.split(/\r?\n/)) {
    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (keyMatch) {
      const [, key, rawValue] = keyMatch;
      currentKey = key;
      if (rawValue.trim() === "") {
        data[key] = [];
      } else {
        data[key] = stripQuotes(rawValue);
      }
      continue;
    }

    const arrayMatch = line.match(/^\s+-\s+(.+)$/);
    if (arrayMatch && currentKey && Array.isArray(data[currentKey])) {
      data[currentKey].push(stripQuotes(arrayMatch[1]));
    }
  }

  return data;
}

function workflowRefs(content) {
  const refs = new Set();
  const pattern = /`workflows\/([^`]+\.md)`/g;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    refs.add(`workflows/${match[1]}`);
  }
  return [...refs];
}

function validateJson(relativePath) {
  try {
    JSON.parse(read(relativePath));
    record(true, `valid JSON: ${relativePath}`);
  } catch (error) {
    record(false, `invalid JSON: ${relativePath} (${error.message})`);
  }
}

function parseJson(relativePath) {
  try {
    return JSON.parse(read(relativePath));
  } catch (error) {
    return null;
  }
}

for (const dir of requiredDirs) {
  record(existsDir(dir), `required directory: ${dir}`);
}

for (const file of [
  ...requiredFiles,
  ...memberFiles,
  ...workflowFiles,
  ...schemaFiles,
  ...templateFiles,
  ...methodologyFiles,
  ...standardFiles,
  ...integrationFiles,
  ...externalSkillFiles
]) {
  record(existsFile(file), `required file: ${file}`);
}

if (existsFile("SKILL.md")) {
  const skillFrontmatter = parseFrontmatter(read("SKILL.md"));
  record(Boolean(skillFrontmatter), "SKILL.md has frontmatter");
  record(skillFrontmatter && skillFrontmatter.name === "ai-work-team", "SKILL.md name is ai-work-team");
  record(Boolean(skillFrontmatter && skillFrontmatter.description), "SKILL.md has description");
}

const memberIds = new Set();
for (const file of memberFiles) {
  if (!existsFile(file)) continue;
  const data = parseFrontmatter(read(file));
  record(Boolean(data), `${file} has frontmatter`);
  record(Boolean(data && data.id), `${file} has id`);
  if (data && data.id) memberIds.add(data.id);
}

for (const file of workflowFiles) {
  if (!existsFile(file)) continue;
  const content = read(file);
  const data = parseFrontmatter(content);
  record(Boolean(data), `${file} has frontmatter`);
  record(Boolean(data && data.id), `${file} has id`);
  if (data && Array.isArray(data.members)) {
    for (const member of data.members) {
      record(memberIds.has(member), `${file} references existing member: ${member}`);
    }
  }
}

for (const file of commandFiles) {
  if (!existsFile(file)) continue;
  const data = parseFrontmatter(read(file));
  record(Boolean(data), `${file} has frontmatter`);
  record(Boolean(data && data.id), `${file} has id`);
}

for (const source of ["workflows/route-table.md", "commands/team.md"]) {
  if (!existsFile(source)) continue;
  for (const ref of workflowRefs(read(source))) {
    record(existsFile(ref), `${source} references existing workflow: ${ref}`);
  }
}

for (const file of schemaFiles) {
  if (existsFile(file)) validateJson(file);
}

if (existsFile("skill-runtime.json")) {
  validateJson("skill-runtime.json");
  const runtimeConfig = parseJson("skill-runtime.json");
  const packageJson = existsFile("package.json") ? parseJson("package.json") : null;
  record(packageJson && packageJson.name === "ai-work-team", "package.json name is ai-work-team");
  record(runtimeConfig && runtimeConfig.skill && runtimeConfig.skill.id === "ai-work-team", "skill-runtime.json skill id is ai-work-team");
  record(runtimeConfig && runtimeConfig.skill && runtimeConfig.skill.entry === "SKILL.md", "skill-runtime.json entry is SKILL.md");
  record(
    runtimeConfig && packageJson && runtimeConfig.skill && runtimeConfig.skill.version === packageJson.version,
    "skill-runtime.json version matches package.json"
  );
  record(
    runtimeConfig && packageJson && packageJson.engines && runtimeConfig.runtime && runtimeConfig.runtime.node === packageJson.engines.node,
    "skill-runtime.json node runtime matches package.json"
  );
  record(
    runtimeConfig && runtimeConfig.install && Array.isArray(runtimeConfig.install.methods) && runtimeConfig.install.methods.length > 0,
    "skill-runtime.json has install methods"
  );
  record(
    runtimeConfig && packageJson && runtimeConfig.install && runtimeConfig.install.packageName === packageJson.name,
    "skill-runtime.json packageName matches package.json"
  );
  record(
    runtimeConfig && !Object.prototype.hasOwnProperty.call(runtimeConfig, "referencedLocalSkills"),
    "skill-runtime.json omits environment-specific local skill names"
  );
  record(
    runtimeConfig && runtimeConfig.privacy && runtimeConfig.privacy.omitLocalSkillNames === true,
    "skill-runtime.json declares local skill name privacy policy"
  );
  record(
    runtimeConfig && !JSON.stringify(runtimeConfig).includes(["/path", "to/"].join("/")),
    "skill-runtime.json omits local absolute path placeholders"
  );
  if (runtimeConfig && runtimeConfig.install && Array.isArray(runtimeConfig.install.requiredFiles)) {
    for (const requiredFile of runtimeConfig.install.requiredFiles) {
      const normalized = requiredFile.replace(/\/$/, "");
      const exists = requiredFile.endsWith("/") ? existsDir(normalized) : existsFile(normalized);
      record(exists, `skill-runtime.json required package path exists: ${requiredFile}`);
    }
  }
}

if (existsFile("external-skills/catalog.json")) {
  validateJson("external-skills/catalog.json");
  const catalog = JSON.parse(read("external-skills/catalog.json"));
  record(Array.isArray(catalog.skills), "external-skills/catalog.json has skills array");
  if (Array.isArray(catalog.skills)) {
    const skillIds = new Set();
    for (const skill of catalog.skills) {
      record(Boolean(skill.id), `external skill has id: ${skill.name || "unknown"}`);
      record(Boolean(skill.package), `external skill ${skill.id || "unknown"} has package`);
      record(
        typeof skill.package === "string" && /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+@[a-zA-Z0-9_.-]+$/.test(skill.package),
        `external skill ${skill.id || "unknown"} package format`
      );
      record(
        skill.qualityTier === "recommended" || skill.qualityTier === "candidate",
        `external skill ${skill.id || "unknown"} quality tier`
      );
      record(
        typeof skill.reviewedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(skill.reviewedAt),
        `external skill ${skill.id || "unknown"} has reviewedAt`
      );
      record(
        typeof skill.lastInstallCheck === "string" && /^\d{4}-\d{2}-\d{2}$/.test(skill.lastInstallCheck),
        `external skill ${skill.id || "unknown"} has lastInstallCheck`
      );
      record(
        typeof skill.trustScore === "number" && skill.trustScore >= 0 && skill.trustScore <= 1,
        `external skill ${skill.id || "unknown"} trustScore is 0..1`
      );
      record(Array.isArray(skill.keywords), `external skill ${skill.id || "unknown"} has keywords`);
      record(Array.isArray(skill.roles), `external skill ${skill.id || "unknown"} has roles`);
      if (Array.isArray(skill.roles)) {
        for (const role of skill.roles) {
          record(memberIds.has(role), `external skill ${skill.id || "unknown"} references existing member: ${role}`);
        }
      }
      record(
        Boolean(
          skill.localSkillPriority &&
          typeof skill.localSkillPriority === "object" &&
          Array.isArray(skill.localSkillPriority.installedSkillNames) &&
          typeof skill.localSkillPriority.updateAdvice === "string"
        ),
        `external skill ${skill.id || "unknown"} has localSkillPriority`
      );
      if (skill.id) {
        record(!skillIds.has(skill.id), `external skill id is unique: ${skill.id}`);
        skillIds.add(skill.id);
      }
    }
  }
}

function parseTableLine(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
  return trimmed.slice(1, -1).split("|").map((cell) => cell.trim());
}

function stageTableGates(content) {
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length - 1; index += 1) {
    const headers = parseTableLine(lines[index]);
    const separator = parseTableLine(lines[index + 1]);
    if (!headers || !separator || !separator.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
    const gateIndex = headers.indexOf("门禁");
    if (headers.indexOf("阶段") === -1 || gateIndex === -1) continue;

    const gates = new Set();
    for (let rowIndex = index + 2; rowIndex < lines.length; rowIndex += 1) {
      const row = parseTableLine(lines[rowIndex]);
      if (!row) break;
      for (const gate of String(row[gateIndex] || "").split(/[、，,]/)) {
        const normalized = gate.replace(/`/g, "").trim();
        if (normalized) gates.add(normalized);
      }
    }
    return gates;
  }
  return null;
}

for (const file of workflowFiles) {
  if (!existsFile(file)) continue;
  const content = read(file);
  const data = parseFrontmatter(content);
  const declaredGates = data && Array.isArray(data.quality_gates) ? data.quality_gates : [];
  const stageGates = stageTableGates(content);
  if (declaredGates.length === 0 || !stageGates) continue;
  for (const gate of declaredGates) {
    record(stageGates.has(gate), `${file} declared quality gate appears in a stage: ${gate}`);
  }
}

const failed = results.filter((result) => !result.ok);
for (const result of results) {
  const marker = result.ok ? "PASS" : "FAIL";
  console.log(`${marker} ${result.message}`);
}

if (failed.length > 0) {
  console.error(`\n${failed.length} validation check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${results.length} validation checks passed.`);
