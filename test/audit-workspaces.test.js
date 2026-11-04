"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  cleanupDir,
  createTempDir,
  runCli,
} = require("./cli-test-helpers");

function createProject(t) {
  const root = createTempDir("ai-work-team-audit-workspaces");
  t.after(() => cleanupDir(root));
  fs.mkdirSync(path.join(root, "workspace"));
  return root;
}

function init(root, workspace, slug, workflow, date = "20261104") {
  const result = runCli("scripts/init-task.js", [
    "--root",
    root,
    "--workspace",
    workspace,
    "--slug",
    slug,
    "--workflow",
    workflow,
    "--date",
    date,
    "--authorization-ref",
    "audit-fixture",
  ]);
  assert.equal(result.status, 0, result.stderr);
  return path.join(root, workspace, `${date}-${slug}`);
}

function snapshot(root) {
  const result = [];
  function visit(dir) {
    for (const entry of fs
      .readdirSync(dir, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))) {
      const absolute = path.join(dir, entry.name);
      const relative = path.relative(root, absolute);
      const stat = fs.lstatSync(absolute);
      result.push([
        relative,
        entry.isSymbolicLink() ? "symlink" : entry.isDirectory() ? "dir" : "file",
        stat.size,
        stat.mtimeMs,
        entry.isFile() ? fs.readFileSync(absolute, "utf8") : "",
      ]);
      if (entry.isDirectory()) visit(absolute);
    }
  }
  visit(root);
  return result;
}

test("audit-workspaces inventories primary and child status gaps without writes", (t) => {
  const root = createProject(t);
  const primary = init(
    root,
    "workspace",
    "primary",
    "requirement-end-to-end",
  );
  fs.mkdirSync(path.join(primary, "features"));
  init(
    root,
    "workspace/20261104-primary/features",
    "child",
    "bugfix-delivery",
  );
  fs.mkdirSync(path.join(primary, "features", "undated-child"));

  const implementation = path.join(primary, "implementation");
  fs.mkdirSync(implementation);
  const implementationStatus = JSON.parse(
    fs.readFileSync(path.join(primary, "workflow-status.json"), "utf8"),
  );
  implementationStatus.requirementFolder =
    "workspace/20261104-primary/implementation";
  fs.writeFileSync(
    path.join(implementation, "workflow-status.json"),
    `${JSON.stringify(implementationStatus, null, 2)}\n`,
  );

  fs.mkdirSync(path.join(root, "workspace", "20261104-missing"));
  const before = snapshot(root);
  const result = runCli("scripts/audit-workspaces.js", [
    "--root",
    root,
    "--json",
  ]);
  const after = snapshot(root);

  assert.equal(result.status, 1, result.stderr);
  assert.deepEqual(after, before);
  const output = JSON.parse(result.stdout);
  assert.deepEqual(output.summary, {
    primaryTasks: 2,
    childTasks: 3,
    withStatus: 3,
    validStatus: 3,
    missingStatus: 2,
    missingPrimaryStatus: 1,
    missingChildStatus: 1,
    invalidStatus: 0,
    invalidPrimaryStatus: 0,
    invalidChildStatus: 0,
    legacyStatus: 0,
    unsafeEntries: 0,
  });
  assert.deepEqual(
    output.tasks.map((task) => [task.path, task.kind, task.status.state]),
    [
      ["20261104-missing", "primary", "missing"],
      ["20261104-primary", "primary", "present"],
      [
        "20261104-primary/features/20261104-child",
        "feature",
        "present",
      ],
      [
        "20261104-primary/features/undated-child",
        "feature",
        "missing",
      ],
      ["20261104-primary/implementation", "implementation", "present"],
    ],
  );
});

test("audit-workspaces applies inclusive date filters and stable ordering", (t) => {
  const root = createProject(t);
  init(root, "workspace", "later", "code-review-delivery", "20261104");
  init(root, "workspace", "earlier", "technical-design-review", "20261001");

  const args = [
    "--root",
    root,
    "--since",
    "2026-11-04",
    "--until",
    "20261104",
    "--json",
  ];
  const first = runCli("scripts/audit-workspaces.js", args);
  const second = runCli("scripts/audit-workspaces.js", args);
  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(first.stdout, second.stdout);
  const output = JSON.parse(first.stdout);
  assert.equal(output.summary.primaryTasks, 1);
  assert.equal(output.tasks[0].path, "20261104-later");
});

test("audit-workspaces reports invalid status and rejects symlink tasks", (t) => {
  const root = createProject(t);
  const invalid = path.join(root, "workspace", "20261104-invalid");
  fs.mkdirSync(invalid);
  fs.writeFileSync(path.join(invalid, "workflow-status.json"), "{bad json");

  const outside = createTempDir("ai-work-team-audit-outside");
  t.after(() => cleanupDir(outside));
  fs.writeFileSync(path.join(outside, "workflow-status.json"), "{}");
  fs.symlinkSync(outside, path.join(root, "workspace", "20261104-linked"));

  const result = runCli("scripts/audit-workspaces.js", [
    "--root",
    root,
    "--json",
  ]);
  assert.equal(result.status, 1, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.summary.primaryTasks, 1);
  assert.equal(output.summary.invalidPrimaryStatus, 1);
  assert.equal(output.summary.unsafeEntries, 1);
  assert.equal(output.diagnostics[0].code, "SYMLINK_TASK_REJECTED");
});

test("audit-workspaces handles an empty workspace and strict CLI input", (t) => {
  const root = createProject(t);
  const empty = runCli("scripts/audit-workspaces.js", [
    "--root",
    root,
    "--json",
  ]);
  assert.equal(empty.status, 0, empty.stderr);
  assert.equal(JSON.parse(empty.stdout).summary.primaryTasks, 0);

  for (const args of [
    ["--root", root, "--wat"],
    ["--root", root, "--root", root],
    ["--root", root, "--since"],
    ["--root", root, "--since", "20261105", "--until", "20261104"],
    ["--root", root, "unexpected"],
  ]) {
    const result = runCli("scripts/audit-workspaces.js", args);
    assert.equal(result.status, 2, `${args.join(" ")}\n${result.stderr}`);
  }
});
