#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  collectRoleIds,
  collectSkillIds,
  formatSkillMatch,
  isPackageValid,
  matchSkills,
  resolveLocalSkillStatus,
} = require("./external-skill-utils");
const {
  CliArgumentError,
  assertNoConflict,
  parseCliArgs,
} = require("./cli-args");

const ROOT = path.resolve(__dirname, "..");
const CATALOG_PATH = path.join(ROOT, "external-skills", "catalog.json");

function usage() {
  console.log(`Usage:
  node scripts/install-external-skills.js [--dry-run]
  node scripts/install-external-skills.js --all [--dry-run]
  node scripts/install-external-skills.js <skill-id> [--dry-run]
  node scripts/install-external-skills.js --skill <skill-id> [--dry-run]
  node scripts/install-external-skills.js <skill-id> --allow-candidate
  node scripts/install-external-skills.js <role-id> "<task>" [--dry-run]
  node scripts/install-external-skills.js --role <role-id> --task "<task>" [--dry-run]
  node scripts/install-external-skills.js <skill-id> --force-external

Examples:
  node scripts/install-external-skills.js --dry-run
  node scripts/install-external-skills.js
  node scripts/install-external-skills.js frontend-design --dry-run
  node scripts/install-external-skills.js frontend-engineer "React 页面性能" --dry-run
  node scripts/install-external-skills.js frontend-design
`);
}

function readCatalog() {
  return JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
}

function parseCommandLine(argv) {
  const parsed = parseCliArgs(argv, {
    options: {
      "--help": { key: "help", type: "boolean", aliases: ["-h"] },
      "--dry-run": { key: "dryRun", type: "boolean" },
      "--allow-candidate": { key: "allowCandidate", type: "boolean" },
      "--force-external": { key: "forceExternal", type: "boolean" },
      "--all": { key: "allCatalog", type: "boolean" },
      "--list": { key: "listOnly", type: "boolean" },
      "--role": { key: "role", type: "value" },
      "--task": { key: "task", type: "value" },
      "--query": { key: "query", type: "value" },
      "--skill": { key: "skillId", type: "value" },
    },
  });
  const { options, positionals } = parsed;

  if (options.help) {
    if (positionals.length > 0 || Object.keys(options).length > 1) {
      throw new CliArgumentError("--help cannot be combined with other arguments");
    }
    return { help: true };
  }
  assertNoConflict(
    options,
    ["task", "query"],
    "--task and --query cannot be combined",
  );
  if (options.listOnly && (positionals.length > 0 || Object.keys(options).length > 1)) {
    throw new CliArgumentError("--list cannot be combined with other arguments");
  }
  if (
    options.allCatalog &&
    (positionals.length > 0 ||
      options.role ||
      options.task ||
      options.query ||
      options.skillId)
  ) {
    throw new CliArgumentError("--all cannot be combined with a selector");
  }
  if (options.skillId && positionals.length > 0) {
    throw new CliArgumentError("--skill cannot be combined with positional input");
  }

  return {
    help: false,
    dryRun: Boolean(options.dryRun),
    allowCandidate: Boolean(options.allowCandidate),
    forceExternal: Boolean(options.forceExternal),
    allCatalog: Boolean(options.allCatalog),
    listOnly: Boolean(options.listOnly),
    role: options.role,
    task: options.task || options.query,
    skillId: options.skillId,
    positionals,
  };
}

const rawArgs = process.argv.slice(2);
let command;
try {
  command = parseCommandLine(rawArgs);
} catch (error) {
  console.error(error.message);
  process.exit(error instanceof CliArgumentError ? error.exitCode : 1);
}

if (command.help) {
  usage();
  process.exit(0);
}

const {
  dryRun,
  allowCandidate,
  forceExternal,
  allCatalog,
  listOnly,
} = command;

const catalog = readCatalog();
const roleIds = collectRoleIds(catalog);
const skillIds = collectSkillIds(catalog);
const positionals = [...command.positionals];
let role = command.role;
let task = command.task;
let skillId = command.skillId;

function installCommandFor(skill) {
  return ["npx", "skills", "add", skill.package, "-g", "-y"];
}

function localInstalledText(localStatus) {
  if (localStatus.installed.length === 0) return "none detected";
  return localStatus.installed
    .map((item) => `${item.name} (${item.path})`)
    .join("; ");
}

function printHeader(mode, selectedCount, candidateCount) {
  console.log("== External Skill Install ==");
  console.log(`Mode: ${mode}`);
  console.log(`Catalog: ${path.relative(process.cwd(), CATALOG_PATH)}`);
  console.log(`Selected skills: ${selectedCount}`);
  console.log(`Candidate skills excluded: ${candidateCount}`);
  console.log(`Dry run: ${dryRun ? "yes" : "no"}`);
  console.log(`Force external: ${forceExternal ? "yes" : "no"}`);
  console.log(`Allow candidate: ${allowCandidate ? "yes" : "no"}`);
}

function printSkillResult(result) {
  const { skill, match, status, reason, command, localStatus, error } = result;
  console.log("");
  console.log(`--- ${skill.id} ---`);
  console.log(`Status: ${status}`);
  console.log(`Reason: ${reason}`);
  console.log(`Package: ${skill.package}`);
  console.log(`Quality: ${skill.qualityTier}`);
  console.log(`Trust score: ${skill.trustScore}`);
  console.log(`Reviewed at: ${skill.reviewedAt}`);
  console.log(`Last install check: ${skill.lastInstallCheck}`);
  console.log(`Roles: ${(skill.roles || []).join(", ")}`);
  console.log(`Command: ${command.join(" ")}`);
  if (match) {
    console.log(`Match score: ${match.score}`);
    console.log(
      `Matched keywords: ${match.matchedKeywords.join(", ") || "none"}`,
    );
  }

  if (localStatus && localStatus.preferInstalled) {
    console.log(
      "Local installed skill priority: prefer local installed skill.",
    );
    console.log(`Local installed: ${localInstalledText(localStatus)}`);
    console.log(`Update check: ${localStatus.updateCheckCommand}`);
    console.log(`Update advice: ${localStatus.updateAdvice}`);
    if (localStatus.installed.length > 0) {
      console.log(
        `User action: 本地已有同能力 Skill，默认不安装外部版本；请自行运行 ${localStatus.updateCheckCommand} 检查并更新本地 Skill。确需安装外部版本时，重新执行同一命令并追加 --force-external。`,
      );
    }
  }

  if (error) {
    console.log(`Error: ${error}`);
  }
}

function printSummary(results) {
  const counts = results.reduce((acc, result) => {
    acc[result.status] = (acc[result.status] || 0) + 1;
    return acc;
  }, {});
  const installed = counts.installed || 0;
  const failed = counts.failed || 0;

  console.log("");
  console.log("== Summary ==");
  console.log(`Installed: ${installed}`);
  console.log(`Skipped local: ${counts["skipped-local"] || 0}`);
  console.log(`Dry run: ${counts["dry-run"] || 0}`);
  console.log(`Skipped candidate: ${counts["skipped-candidate"] || 0}`);
  console.log(`Invalid package: ${counts["invalid-package"] || 0}`);
  console.log(`Failed: ${failed}`);
  if (installed > 0) {
    console.log("Verification: run npx skills check");
  }
}

function installOne(match, options = {}) {
  const skill = match.skill;
  const command = installCommandFor(skill);
  const localStatus = resolveLocalSkillStatus(skill);

  if (skill.qualityTier !== "recommended" && !allowCandidate) {
    return {
      skill,
      match: match.match,
      status: "skipped-candidate",
      reason:
        "candidate 条目默认不安装；需要人工确认后追加 --allow-candidate。",
      command,
      localStatus,
      exitCode: options.explicit ? 2 : 0,
    };
  }

  if (!isPackageValid(skill.package)) {
    return {
      skill,
      match: match.match,
      status: "invalid-package",
      reason: "catalog 中的 package 不符合 owner/repo@skill 格式。",
      command,
      localStatus,
      exitCode: 3,
    };
  }

  if (
    localStatus.preferInstalled &&
    localStatus.installed.length > 0 &&
    !forceExternal
  ) {
    return {
      skill,
      match: match.match,
      status: "skipped-local",
      reason: "检测到本地已有同能力 Skill，按策略跳过外部安装。",
      command,
      localStatus,
      exitCode: 0,
    };
  }

  if (dryRun) {
    return {
      skill,
      match: match.match,
      status: "dry-run",
      reason: "dry-run 模式只输出安装决策，不执行安装。",
      command,
      localStatus,
      exitCode: 0,
    };
  }

  const spawnResult = spawnSync(command[0], command.slice(1), {
    stdio: "inherit",
    shell: false,
  });

  if (spawnResult.error || spawnResult.status !== 0) {
    return {
      skill,
      match: match.match,
      status: "failed",
      reason: "npx skills add 执行失败。",
      command,
      localStatus,
      error: spawnResult.error
        ? spawnResult.error.message
        : `exit code ${spawnResult.status}`,
      exitCode: spawnResult.status || 1,
    };
  }

  return {
    skill,
    match: match.match,
    status: "installed",
    reason: "安装完成。",
    command,
    localStatus,
    exitCode: 0,
  };
}

function catalogMatches() {
  return catalog.skills
    .filter((skill) => allowCandidate || skill.qualityTier === "recommended")
    .map((skill) => ({
      skill,
      match: {
        score: 0,
        matchedKeywords: ["catalog"],
        roleMatched: true,
        taskMatched: true,
      },
    }));
}

function printCatalogList() {
  for (const skill of catalog.skills) {
    console.log(`${skill.id} [${skill.qualityTier}] ${skill.package}`);
  }
}

if (listOnly) {
  printCatalogList();
  process.exit(0);
}

if (!skillId && positionals[0] && skillIds.has(positionals[0])) {
  skillId = positionals.shift();
}

if (role && !roleIds.includes(role)) {
  console.error(`Invalid role: ${role}`);
  process.exit(2);
}

if (!skillId && !role && positionals[0] && roleIds.includes(positionals[0])) {
  role = positionals.shift();
}

if (task && positionals.length > 0) {
  console.error(
    "task text cannot be provided both positionally and with --task/--query",
  );
  process.exit(2);
}

if (!task && positionals.length > 0) {
  task = positionals.join(" ");
}

const hasSelector = Boolean(skillId || role || task);
const defaultCatalogMode =
  rawArgs.length === 0 || (rawArgs.length === 1 && dryRun);
const installCatalog = allCatalog || defaultCatalogMode;

if (!hasSelector && !installCatalog) {
  console.error(
    "Installation modifiers require a skill/role/task selector or explicit --all.",
  );
  process.exit(2);
}

if (installCatalog) {
  const matches = catalogMatches();
  const candidateCount = allowCandidate
    ? 0
    : catalog.skills.filter((skill) => skill.qualityTier === "candidate")
        .length;
  printHeader("catalog", matches.length, candidateCount);

  const results = [];
  for (const match of matches) {
    const result = installOne(match, { explicit: false });
    results.push(result);
    printSkillResult(result);
  }
  printSummary(results);
  process.exit(results.some((result) => result.exitCode > 0) ? 1 : 0);
}

const matches = matchSkills(catalog, {
  role,
  task,
  skillId,
  top: skillId ? 1 : 3,
});

if (matches.length === 0) {
  console.error(
    `No external skill matched: ${[skillId, role, task].filter(Boolean).join(" ")}`,
  );
  console.error(
    'Run: node scripts/list-external-skills.js --query "your task"',
  );
  process.exit(1);
}

const selected = matches[0];
const skill = selected.skill;

if (!skillId && matches.length > 1 && dryRun) {
  console.log("Matched candidates:");
  for (const match of matches) {
    console.log(formatSkillMatch(match));
    console.log("");
  }
  console.log(`Dry-run selected top match: ${skill.id}`);
}

printHeader("single", 1, 0);
const result = installOne(selected, { explicit: true });
printSkillResult(result);
printSummary([result]);
process.exit(result.exitCode);
