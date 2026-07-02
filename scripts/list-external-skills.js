#!/usr/bin/env node

const {
  collectRoleIds,
  collectSkillIds,
  formatSkillMatch,
  matchSkills,
  readCatalog,
} = require("./external-skill-utils");

function usage() {
  console.log(`Usage:
  node scripts/list-external-skills.js
  node scripts/list-external-skills.js --role <role-id>
  node scripts/list-external-skills.js --role <role-id> --task "<task>"
  node scripts/list-external-skills.js <role-id> "<task>"
  node scripts/list-external-skills.js --query "<task>"
  node scripts/list-external-skills.js --quality <recommended|candidate>
  node scripts/list-external-skills.js --skill <skill-id>
  node scripts/list-external-skills.js --top 2 frontend-engineer "React 页面性能"
`);
}

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function positionalArgs() {
  const flagsWithValue = new Set([
    "--role",
    "--quality",
    "--skill",
    "--task",
    "--query",
    "--top",
  ]);
  const result = [];
  for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    if (flagsWithValue.has(arg)) {
      index += 1;
      continue;
    }
    if (arg.startsWith("--")) {
      continue;
    }
    result.push(arg);
  }
  return result;
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  usage();
  process.exit(0);
}

const catalog = readCatalog();
const roleIds = collectRoleIds(catalog);
const skillIds = collectSkillIds(catalog);
const positionals = positionalArgs();

let role = getArgValue("--role");
const quality = getArgValue("--quality");
let skillId = getArgValue("--skill");
let task = getArgValue("--task") || getArgValue("--query");
const top = getArgValue("--top");

if (!role && positionals[0] && roleIds.includes(positionals[0])) {
  role = positionals.shift();
}

if (!skillId && positionals[0] && skillIds.has(positionals[0])) {
  skillId = positionals.shift();
}

if (!task && positionals.length > 0) {
  task = positionals.join(" ");
}

const matches = matchSkills(catalog, { role, quality, skillId, task, top });

if (matches.length === 0) {
  console.log("No external skills matched the query.");
  console.log("Try: node scripts/list-external-skills.js --role <role-id>");
  console.log(
    'Try: node scripts/list-external-skills.js --query "React 页面性能"',
  );
  process.exit(0);
}

for (const match of matches) {
  console.log(formatSkillMatch(match));
  console.log("");
}
