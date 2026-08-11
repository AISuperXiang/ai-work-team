#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const THRESHOLD = 85;
const ALL_TESTS = [
  "test/build-context.test.js",
  "test/external-skill-utils.test.js",
  "test/install-external-skills.test.js",
  "test/list-external-skills.test.js",
  "test/validate-contracts.test.js",
];

const MUTANTS = [
  {
    id: "cli-unknown-option",
    file: "scripts/cli-args.js",
    search: "      throw new CliArgumentError(`Unknown option: ${arg}`);",
    replacement: "      continue;",
    tests: [
      "test/build-context.test.js",
      "test/install-external-skills.test.js",
      "test/list-external-skills.test.js",
    ],
    critical: true,
  },
  {
    id: "cli-missing-value",
    file: "scripts/cli-args.js",
    search: '    if (value === undefined || value.startsWith("-")) {',
    replacement: "    if (false) {",
    tests: [
      "test/install-external-skills.test.js",
      "test/list-external-skills.test.js",
    ],
    critical: true,
  },
  {
    id: "build-output-containment",
    file: "scripts/build-context.js",
    search:
      "function isInsideRoot(root, candidate) {\n" +
      "  return candidate !== root && candidate.startsWith(`${root}${path.sep}`);\n" +
      "}",
    replacement:
      "function isInsideRoot() {\n" +
      "  return true;\n" +
      "}",
    tests: ["test/build-context.test.js"],
    critical: true,
  },
  {
    id: "build-large-file-limit",
    file: "scripts/build-context.js",
    search: "  if (stat.size > MAX_READ_BYTES) {",
    replacement: "  if (false) {",
    tests: ["test/build-context.test.js"],
    critical: true,
  },
  {
    id: "build-symlink-output",
    file: "scripts/build-context.js",
    search: "    const stat = fs.lstatSync(outputPath);",
    replacement: "    const stat = fs.statSync(outputPath);",
    tests: ["test/build-context.test.js"],
    critical: true,
  },
  {
    id: "package-dot-segment",
    file: "scripts/external-skill-utils.js",
    search:
      "      match.slice(1).every((part) => !INVALID_PACKAGE_PARTS.has(part)),",
    replacement: "      match.slice(1).every(() => true),",
    tests: ["test/external-skill-utils.test.js"],
    critical: true,
  },
  {
    id: "list-top-validation",
    file: "scripts/list-external-skills.js",
    search: "        validate: (value) => /^[1-9]\\d*$/.test(value),",
    replacement: "        validate: () => true,",
    tests: ["test/list-external-skills.test.js"],
    critical: false,
  },
  {
    id: "install-implicit-bulk",
    file: "scripts/install-external-skills.js",
    search:
      "const defaultCatalogMode =\n" +
      "  rawArgs.length === 0 || (rawArgs.length === 1 && dryRun);",
    replacement: "const defaultCatalogMode = !hasSelector;",
    tests: ["test/install-external-skills.test.js"],
    critical: true,
  },
  {
    id: "install-candidate-gate",
    file: "scripts/install-external-skills.js",
    search:
      '  if (skill.qualityTier !== "recommended" && !allowCandidate) {',
    replacement: "  if (false) {",
    tests: ["test/install-external-skills.test.js"],
    critical: true,
  },
  {
    id: "install-dry-run-gate",
    file: "scripts/install-external-skills.js",
    search: "  if (dryRun) {",
    replacement: "  if (false) {",
    tests: ["test/install-external-skills.test.js"],
    critical: true,
  },
  {
    id: "install-subprocess-exit",
    file: "scripts/install-external-skills.js",
    search: "      exitCode: spawnResult.status || 1,",
    replacement: "      exitCode: 0,",
    tests: ["test/install-external-skills.test.js"],
    critical: true,
  },
  {
    id: "contracts-default-workspace-scan",
    file: "scripts/validate-contracts.js",
    search: "  } else if (command.allWorkspaces) {",
    replacement: "  } else {",
    tests: ["test/validate-contracts.test.js"],
    critical: true,
  },
  {
    id: "build-cli-kill-switch",
    file: "scripts/build-context.js",
    search: "  process.exitCode = main();",
    replacement: "  process.exitCode = 0;",
    tests: ["test/build-context.test.js"],
    critical: true,
  },
  {
    id: "list-cli-kill-switch",
    file: "scripts/list-external-skills.js",
    search: "  process.exitCode = main();",
    replacement: "  process.exitCode = 0;",
    tests: ["test/list-external-skills.test.js"],
    critical: true,
  },
  {
    id: "install-cli-kill-switch",
    file: "scripts/install-external-skills.js",
    search: "const rawArgs = process.argv.slice(2);",
    replacement: "process.exit(0);\nconst rawArgs = process.argv.slice(2);",
    tests: ["test/install-external-skills.test.js"],
    critical: true,
  },
];

function shouldCopy(source) {
  const relative = path.relative(ROOT, source).split(path.sep).join("/");
  if (!relative) return true;
  if (
    relative === ".git" ||
    relative.startsWith(".git/") ||
    relative === "node_modules" ||
    relative.startsWith("node_modules/")
  ) {
    return false;
  }
  if (
    relative.startsWith("workspace/") &&
    relative !== "workspace/README.md"
  ) {
    return false;
  }
  return true;
}

function copyProject() {
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "ai-work-team-mutation-"),
  );
  const sandbox = path.join(tempRoot, "project");
  fs.cpSync(ROOT, sandbox, {
    recursive: true,
    filter: shouldCopy,
  });
  return { tempRoot, sandbox };
}

function runTests(projectRoot, testFiles) {
  return spawnSync(
    process.execPath,
    ["--test", ...testFiles.map((file) => path.join(projectRoot, file))],
    {
      cwd: projectRoot,
      encoding: "utf8",
      timeout: 120_000,
    },
  );
}

function applyMutant(projectRoot, mutant) {
  const filePath = path.join(projectRoot, mutant.file);
  const content = fs.readFileSync(filePath, "utf8");
  const occurrences = content.split(mutant.search).length - 1;
  if (occurrences !== 1) {
    throw new Error(
      `${mutant.id} expected one mutation target in ${mutant.file}, found ${occurrences}`,
    );
  }
  fs.writeFileSync(
    filePath,
    content.replace(mutant.search, mutant.replacement),
    "utf8",
  );
}

function main() {
  const baseline = runTests(ROOT, ALL_TESTS);
  if (baseline.status !== 0) {
    process.stderr.write(baseline.stdout || "");
    process.stderr.write(baseline.stderr || "");
    console.error("Mutation baseline failed; refusing to score mutants.");
    return 1;
  }

  const results = [];
  for (const mutant of MUTANTS) {
    const { tempRoot, sandbox } = copyProject();
    try {
      applyMutant(sandbox, mutant);
      const result = runTests(sandbox, mutant.tests);
      const killed = result.status !== 0;
      results.push({ ...mutant, killed });
      console.log(`${killed ? "KILLED" : "SURVIVED"} ${mutant.id}`);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  }

  const killedCount = results.filter((result) => result.killed).length;
  const criticalSurvivors = results.filter(
    (result) => result.critical && !result.killed,
  );
  const score = (killedCount / results.length) * 100;

  console.log("");
  console.log(`Mutation score: ${score.toFixed(1)}%`);
  console.log(`Killed: ${killedCount}/${results.length}`);
  console.log(`Critical survivors: ${criticalSurvivors.length}`);
  console.log(`Threshold: ${THRESHOLD}%`);

  if (score < THRESHOLD || criticalSurvivors.length > 0) {
    for (const survivor of criticalSurvivors) {
      console.error(`Critical mutant survived: ${survivor.id}`);
    }
    return 1;
  }
  return 0;
}

process.exitCode = main();
