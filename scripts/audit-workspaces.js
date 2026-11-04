#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { CliArgumentError, parseCliArgs } = require("./cli-args");
const { discoverWorkspaceTasks } = require("./workspace-tasks");

const SKILL_ROOT = path.resolve(__dirname, "..");

function usage() {
  console.log(`Usage:
  node scripts/audit-workspaces.js --root <project-root> [--workspace workspace]
      [--since YYYYMMDD|YYYY-MM-DD] [--until YYYYMMDD|YYYY-MM-DD] [--json]
`);
}

function parseCommandLine(argv) {
  const { options, positionals } = parseCliArgs(argv, {
    options: {
      "--help": { key: "help", type: "boolean", aliases: ["-h"] },
      "--root": { key: "root", type: "value" },
      "--workspace": { key: "workspace", type: "value" },
      "--since": { key: "since", type: "value" },
      "--until": { key: "until", type: "value" },
      "--json": { key: "json", type: "boolean" },
    },
  });
  if (positionals.length) {
    throw new CliArgumentError("Unexpected positional input");
  }
  if (options.help) {
    if (Object.keys(options).length !== 1) {
      throw new CliArgumentError("--help must be used alone");
    }
    return { help: true };
  }
  if (!options.root) {
    throw new CliArgumentError("--root is required");
  }
  return {
    help: false,
    root: options.root,
    workspace: options.workspace || "workspace",
    since: options.since,
    until: options.until,
    json: Boolean(options.json),
  };
}

function formatText(result) {
  const lines = [
    [
      `primary=${result.summary.primaryTasks}`,
      `child=${result.summary.childTasks}`,
      `status=${result.summary.withStatus}`,
      `valid=${result.summary.validStatus}`,
      `missing=${result.summary.missingStatus}`,
      `invalid=${result.summary.invalidStatus}`,
      `unsafe=${result.summary.unsafeEntries}`,
    ].join(" "),
  ];
  for (const task of result.tasks) {
    if (task.status.state !== "present") {
      lines.push(`${task.status.state.toUpperCase()} ${task.path}`);
    }
  }
  for (const diagnostic of result.diagnostics) {
    lines.push(`${diagnostic.code} ${diagnostic.path}`);
  }
  return `${lines.join("\n")}\n`;
}

function main(argv) {
  const command = parseCommandLine(argv);
  if (command.help) {
    usage();
    return 0;
  }
  let root;
  try {
    root = fs.realpathSync(command.root);
  } catch {
    throw new CliArgumentError("--root must reference an existing directory");
  }
  if (!fs.statSync(root).isDirectory()) {
    throw new CliArgumentError("--root must reference a directory");
  }
  const result = discoverWorkspaceTasks({
    root,
    workspaceRelative: command.workspace,
    since: command.since,
    until: command.until,
    skillRoot: SKILL_ROOT,
  });
  process.stdout.write(
    command.json
      ? `${JSON.stringify(result, null, 2)}\n`
      : formatText(result),
  );
  return result.summary.missingStatus ||
    result.summary.invalidStatus ||
    result.summary.unsafeEntries
    ? 1
    : 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  const exitCode = error instanceof CliArgumentError ? 2 : 1;
  if (process.argv.includes("--json")) {
    console.log(
      JSON.stringify({
        operation: "error",
        code: exitCode === 2 ? "INVALID_INPUT" : "AUDIT_FAILED",
        detail: error.message,
      }),
    );
  } else {
    console.error(error.message);
  }
  process.exitCode = exitCode;
}
