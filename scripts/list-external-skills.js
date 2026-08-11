#!/usr/bin/env node

const {
  collectRoleIds,
  collectSkillIds,
  formatSkillMatch,
  matchSkills,
  readCatalog,
} = require("./external-skill-utils");
const {
  CliArgumentError,
  assertNoConflict,
  parseCliArgs,
} = require("./cli-args");

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

function parseCommandLine(argv) {
  const parsed = parseCliArgs(argv, {
    options: {
      "--help": { key: "help", type: "boolean", aliases: ["-h"] },
      "--role": { key: "role", type: "value" },
      "--quality": {
        key: "quality",
        type: "value",
        choices: ["recommended", "candidate"],
      },
      "--skill": { key: "skillId", type: "value" },
      "--task": { key: "task", type: "value" },
      "--query": { key: "query", type: "value" },
      "--top": {
        key: "top",
        type: "value",
        validate: (value) => /^[1-9]\d*$/.test(value),
      },
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

  return {
    help: false,
    role: options.role,
    quality: options.quality,
    skillId: options.skillId,
    task: options.task || options.query,
    top: options.top,
    positionals,
  };
}

function main(argv = process.argv.slice(2)) {
  try {
    const command = parseCommandLine(argv);
    if (command.help) {
      usage();
      return 0;
    }

    const catalog = readCatalog();
    const roleIds = collectRoleIds(catalog);
    const skillIds = collectSkillIds(catalog);
    const positionals = [...command.positionals];
    let role = command.role;
    let skillId = command.skillId;
    let task = command.task;

    if (role && !roleIds.includes(role)) {
      throw new CliArgumentError(`Invalid role: ${role}`);
    }
    if (!role && positionals[0] && roleIds.includes(positionals[0])) {
      role = positionals.shift();
    }
    if (!skillId && positionals[0] && skillIds.has(positionals[0])) {
      skillId = positionals.shift();
    }
    if (task && positionals.length > 0) {
      throw new CliArgumentError(
        "task text cannot be provided both positionally and with --task/--query",
      );
    }
    if (!task && positionals.length > 0) {
      task = positionals.join(" ");
    }

    const matches = matchSkills(catalog, {
      role,
      quality: command.quality,
      skillId,
      task,
      top: command.top,
    });

    if (matches.length === 0) {
      console.log("No external skills matched the query.");
      console.log("Try: node scripts/list-external-skills.js --role <role-id>");
      console.log(
        'Try: node scripts/list-external-skills.js --query "React 页面性能"',
      );
      return 0;
    }

    for (const match of matches) {
      console.log(formatSkillMatch(match));
      console.log("");
    }
    return 0;
  } catch (error) {
    console.error(error.message);
    if (error instanceof CliArgumentError) {
      return error.exitCode;
    }
    return 1;
  }
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  main,
  parseCommandLine,
};
