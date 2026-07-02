const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CATALOG_PATH = path.join(ROOT, "external-skills", "catalog.json");
const PACKAGE_PATTERN = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+@[a-zA-Z0-9_.-]+$/;

function readCatalog() {
  return JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
}

function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function flattenText(value) {
  if (Array.isArray(value)) {
    return value.map(flattenText).join(" ");
  }
  if (value && typeof value === "object") {
    return Object.values(value).map(flattenText).join(" ");
  }
  return normalizeText(value);
}

function tokenize(query) {
  const text = normalizeText(query);
  if (!text) return [];

  const splitTokens = text
    .split(/[\s,，。.;；:：/\\|()[\]{}"'`~!！?？<>《》+-]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);

  const tokens = new Set(splitTokens);
  if (/[\u4e00-\u9fa5]/.test(text)) {
    tokens.add(text);
  }
  return [...tokens];
}

function collectRoleIds(catalog) {
  return [...new Set(catalog.skills.flatMap((skill) => skill.roles || []))];
}

function collectSkillIds(catalog) {
  return new Set(catalog.skills.map((skill) => skill.id));
}

function isPackageValid(packageName) {
  return PACKAGE_PATTERN.test(packageName);
}

function scoreSkill(skill, options = {}) {
  const role = options.role;
  const task = normalizeText(options.task);
  const tokens = tokenize(task);
  const keywords = (skill.keywords || []).map(normalizeText);
  const searchableText = flattenText([
    skill.id,
    skill.name,
    skill.package,
    skill.roles,
    skill.scenarios,
    skill.useWhen,
    keywords
  ]);
  const negativeText = flattenText(skill.doNotUseWhen || []);
  const matchedKeywords = new Set();
  let score = 0;
  let taskMatched = !task;
  const roleMatched = !role || (skill.roles || []).includes(role);

  if (!roleMatched) {
    return { score: -1000, matchedKeywords: [], roleMatched, taskMatched: false };
  }

  if (role) {
    score += 10;
  }

  if (task) {
    if (normalizeText(skill.id) === task || normalizeText(skill.name) === task) {
      score += 40;
      taskMatched = true;
      matchedKeywords.add(task);
    }

    for (const keyword of keywords) {
      if (!keyword) continue;
      if (task.includes(keyword) || keyword.includes(task)) {
        score += 10;
        taskMatched = true;
        matchedKeywords.add(keyword);
      }
    }

    for (const token of tokens) {
      if (searchableText.includes(token)) {
        score += 3;
        taskMatched = true;
        matchedKeywords.add(token);
      }
      if (negativeText.includes(token)) {
        score -= 12;
      }
    }
  }

  if (skill.qualityTier === "recommended") {
    score += 3;
  }

  if (typeof skill.trustScore === "number") {
    score += Math.round(skill.trustScore * 10);
  }

  return {
    score,
    matchedKeywords: [...matchedKeywords],
    roleMatched,
    taskMatched
  };
}

function matchSkills(catalog, options = {}) {
  const role = options.role;
  const task = options.task;
  const skillId = options.skillId;
  const quality = options.quality;
  const top = Number(options.top || 0);

  let skills = catalog.skills;

  if (skillId) {
    skills = skills.filter((skill) => skill.id === skillId);
  }

  if (quality) {
    skills = skills.filter((skill) => skill.qualityTier === quality);
  }

  const matches = skills
    .map((skill) => ({
      skill,
      match: scoreSkill(skill, { role, task })
    }))
    .filter((item) => item.match.roleMatched)
    .filter((item) => !task || item.match.taskMatched)
    .sort((a, b) => b.match.score - a.match.score || b.skill.trustScore - a.skill.trustScore);

  return top > 0 ? matches.slice(0, top) : matches;
}

function localSkillSearchDirs() {
  const home = os.homedir();
  return [
    path.resolve(ROOT, "../../.trae/skills"),
    path.join(home, ".trae-cn", "skills"),
    path.join(home, ".trae-cn", "builtin_skills"),
    path.join(home, ".trae-cn", "builtin", "trae", "iphigenia", "skills"),
    path.join(home, ".trae-cn", "builtin", "global", "skills")
  ];
}

function findLocalSkill(skillName) {
  for (const dir of localSkillSearchDirs()) {
    const skillDir = path.join(dir, skillName);
    const skillFile = path.join(skillDir, "SKILL.md");
    if (fs.existsSync(skillFile)) {
      return skillDir;
    }
  }
  return undefined;
}

function resolveLocalSkillStatus(skill) {
  const priority = skill.localSkillPriority || {};
  const names = priority.installedSkillNames || [];
  const installed = names
    .map((name) => ({ name, path: findLocalSkill(name) }))
    .filter((item) => Boolean(item.path));

  return {
    preferInstalled: Boolean(priority.preferInstalled),
    installed,
    updateCheckCommand: priority.updateCheckCommand || "npx skills check",
    updateAdvice: priority.updateAdvice || "如本地已有同能力 Skill，请先确认是否最新，再决定是否安装外部版本。"
  };
}

function formatSkillMatch(item) {
  const { skill, match } = item;
  const localStatus = resolveLocalSkillStatus(skill);
  const lines = [
    `${skill.id} [${skill.qualityTier}] score=${match.score}`,
    `  package: ${skill.package}`,
    `  trustScore: ${skill.trustScore}`,
    `  reviewedAt: ${skill.reviewedAt}`,
    `  lastInstallCheck: ${skill.lastInstallCheck}`,
    `  installs: ${skill.installCount}`,
    `  roles: ${(skill.roles || []).join(", ")}`,
    `  matched: ${match.matchedKeywords.length > 0 ? match.matchedKeywords.join(", ") : "none"}`,
    `  url: ${skill.sourceUrl}`,
    `  install: ${skill.installCommand}`
  ];

  if (localStatus.preferInstalled) {
    const installedText = localStatus.installed.length > 0
      ? localStatus.installed.map((item) => `${item.name} (${item.path})`).join("; ")
      : "none detected";
    lines.push(`  localPriority: prefer-installed`);
    lines.push(`  localInstalled: ${installedText}`);
    lines.push(`  updateCheck: ${localStatus.updateCheckCommand}`);
    lines.push(`  updateAdvice: ${localStatus.updateAdvice}`);
  }

  return lines.join("\n");
}

module.exports = {
  collectRoleIds,
  collectSkillIds,
  formatSkillMatch,
  isPackageValid,
  matchSkills,
  readCatalog,
  resolveLocalSkillStatus
};
