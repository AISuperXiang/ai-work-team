#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const {
  CliArgumentError,
  assertNoConflict,
  parseCliArgs,
} = require("./cli-args");
const { isSafeRelativePath, readStableFile, resolveSafePath } = require("./safe-files");
const {
  COMPLEXITIES,
  MAX_STATUS_BYTES,
  PROFILES,
  WORKFLOW_TEMPLATES,
  buildInitialStatus,
  inspectStatus,
  localDateStamp,
  normalizeDate,
  validateSlug,
} = require("./workspace-tasks");

const SKILL_ROOT = path.resolve(__dirname, "..");

class InitError extends Error {}

function usage() {
  console.log(`Usage:
  node scripts/init-task.js --root <project-root> --slug <short-slug>
      --workflow <workflow> [--workspace workspace]
      [--profile lightweight|standard|assurance] [--complexity S|M|L|XL]
      [--date YYYYMMDD|YYYY-MM-DD] [--authorization-ref <ref>]
      [--dry-run|--json]
`);
}

function parseCommandLine(argv) {
  const { options, positionals } = parseCliArgs(argv, {
    options: {
      "--help": { key: "help", type: "boolean", aliases: ["-h"] },
      "--root": { key: "root", type: "value" },
      "--workspace": { key: "workspace", type: "value" },
      "--slug": { key: "slug", type: "value" },
      "--workflow": {
        key: "workflow",
        type: "value",
        choices: Object.keys(WORKFLOW_TEMPLATES),
      },
      "--profile": {
        key: "profile",
        type: "value",
        choices: [...PROFILES],
      },
      "--complexity": {
        key: "complexity",
        type: "value",
        choices: [...COMPLEXITIES],
      },
      "--date": { key: "date", type: "value" },
      "--authorization-ref": { key: "authorizationRef", type: "value" },
      "--dry-run": { key: "dryRun", type: "boolean" },
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
  assertNoConflict(
    options,
    ["dryRun", "json"],
    "--dry-run and --json cannot be combined",
  );
  if (!options.root || !options.slug || !options.workflow) {
    throw new CliArgumentError("--root, --slug and --workflow are required");
  }
  return {
    help: false,
    root: options.root,
    workspace: options.workspace || "workspace",
    slug: validateSlug(options.slug),
    workflow: options.workflow,
    profile: options.profile,
    complexity: options.complexity,
    date: options.date
      ? normalizeDate(options.date)
      : localDateStamp(),
    authorizationRef: options.authorizationRef || "user-request",
    preview: Boolean(options.dryRun || options.json),
    json: Boolean(options.json),
  };
}

function readExistingStatus(statusPath) {
  const stat = fs.lstatSync(statusPath);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new CliArgumentError(
      "Existing workflow-status.json must be a regular non-symlink file",
    );
  }
  try {
    return JSON.parse(
      readStableFile(statusPath, { maxBytes: MAX_STATUS_BYTES }),
    );
  } catch {
    throw new InitError("Existing workflow-status.json is invalid");
  }
}

function assertCompatible(status, expected, command) {
  const diagnostics = inspectStatus(status, {
    expectedRequirementFolder: expected,
    skillRoot: SKILL_ROOT,
  });
  if (diagnostics.length) {
    throw new InitError(
      `Existing task state is invalid: ${diagnostics.map((item) => item.code).join(",")}`,
    );
  }
  const conflicts = [];
  if (status.schemaVersion !== "2.2") conflicts.push("schemaVersion");
  if (status.workflow !== command.workflow) conflicts.push("workflow");
  if (command.profile && status.executionProfile !== command.profile) {
    conflicts.push("executionProfile");
  }
  if (command.complexity && status.complexityLevel !== command.complexity) {
    conflicts.push("complexityLevel");
  }
  if (conflicts.length) {
    throw new InitError(
      `Existing task conflicts with requested initialization: ${conflicts.join(",")}`,
    );
  }
}

function writeNewStatus(targetDir, serialized) {
  const statusPath = path.join(targetDir, "workflow-status.json");
  const temporary = path.join(targetDir, `.init-task-${randomUUID()}.tmp`);
  try {
    fs.writeFileSync(temporary, serialized, {
      flag: "wx",
      mode: 0o600,
    });
    fs.linkSync(temporary, statusPath);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

function renderResult(result, json) {
  if (json) return `${JSON.stringify(result, null, 2)}\n`;
  const action = result.preview
    ? "WOULD_CREATE"
    : result.created
      ? "CREATED"
      : "EXISTS";
  return `${action} ${result.requirementFolder}\n`;
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
  if (!isSafeRelativePath(command.workspace)) {
    throw new CliArgumentError(
      "workspace must be a normalized relative path",
    );
  }
  const workspace = resolveSafePath(root, command.workspace, {
    label: "workspace",
  });
  if (!fs.statSync(workspace).isDirectory()) {
    throw new CliArgumentError("workspace must be a directory");
  }

  const folder = `${command.date}-${command.slug}`;
  const requirementFolder = path.posix.join(command.workspace, folder);
  const targetDir = path.join(workspace, folder);
  const statusPath = path.join(targetDir, "workflow-status.json");

  if (fs.existsSync(targetDir)) {
    const targetStat = fs.lstatSync(targetDir);
    if (targetStat.isSymbolicLink() || !targetStat.isDirectory()) {
      throw new CliArgumentError(
        "Target task must be a regular non-symlink directory",
      );
    }
    const realTarget = fs.realpathSync(targetDir);
    if (
      realTarget !== targetDir ||
      path.dirname(realTarget) !== fs.realpathSync(workspace)
    ) {
      throw new CliArgumentError("Target task must remain inside workspace");
    }
    if (fs.existsSync(statusPath)) {
      const status = readExistingStatus(statusPath);
      assertCompatible(status, requirementFolder, command);
      process.stdout.write(
        renderResult(
          {
            operation: "init",
            preview: command.preview,
            created: false,
            requirementFolder,
            workflow: status.workflow,
            executionProfile: status.executionProfile,
            complexityLevel: status.complexityLevel,
            taskId: status.deliveryControl.taskId,
            invocationId: status.deliveryControl.currentInvocationId,
          },
          command.json,
        ),
      );
      return 0;
    }
  }

  const plan = {
    operation: "init",
    preview: command.preview,
    created: false,
    requirementFolder,
    workflow: command.workflow,
    executionProfile: command.profile || null,
    complexityLevel: command.complexity || null,
  };
  if (command.preview) {
    process.stdout.write(renderResult(plan, command.json));
    return 0;
  }

  let createdDirectory = false;
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir);
    createdDirectory = true;
  }
  try {
    const status = buildInitialStatus(SKILL_ROOT, {
      workflow: command.workflow,
      requirementFolder,
      profile: command.profile,
      complexity: command.complexity,
      authorizationRef: command.authorizationRef,
    });
    const serialized = `${JSON.stringify(status, null, 2)}\n`;
    if (Buffer.byteLength(serialized) > MAX_STATUS_BYTES) {
      throw new InitError("Generated workflow status exceeds 256 KiB");
    }
    writeNewStatus(targetDir, serialized);
    process.stdout.write(
      renderResult(
        {
          ...plan,
          preview: false,
          created: true,
          executionProfile: status.executionProfile,
          complexityLevel: status.complexityLevel,
          taskId: status.deliveryControl.taskId,
          invocationId: status.deliveryControl.currentInvocationId,
        },
        command.json,
      ),
    );
    return 0;
  } catch (error) {
    if (
      createdDirectory &&
      fs.existsSync(targetDir) &&
      fs.readdirSync(targetDir).length === 0
    ) {
      fs.rmdirSync(targetDir);
    }
    if (error?.code === "EEXIST") {
      throw new InitError("Task initialization raced with another writer");
    }
    throw error;
  }
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  const exitCode = error instanceof CliArgumentError ? 2 : 1;
  if (process.argv.includes("--json")) {
    console.log(
      JSON.stringify({
        operation: "error",
        code: exitCode === 2 ? "INVALID_INPUT" : "INIT_FAILED",
        detail: error.message,
      }),
    );
  } else {
    console.error(
      error instanceof CliArgumentError || error instanceof InitError
        ? error.message
        : "Cannot safely initialize workspace task",
    );
  }
  process.exitCode = exitCode;
}

