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
  const root = createTempDir("ai-work-team-init-task");
  t.after(() => cleanupDir(root));
  fs.mkdirSync(path.join(root, "workspace"));
  return root;
}

function runInit(root, slug, workflow, extra = []) {
  return runCli("scripts/init-task.js", [
    "--root",
    root,
    "--slug",
    slug,
    "--workflow",
    workflow,
    "--date",
    "20261104",
    "--authorization-ref",
    "test-authorization",
    ...extra,
  ]);
}

function readStatus(root, slug) {
  return JSON.parse(
    fs.readFileSync(
      path.join(root, "workspace", `20261104-${slug}`, "workflow-status.json"),
      "utf8",
    ),
  );
}

test("init-task creates all supported workflow states with task identity", (t) => {
  const root = createProject(t);
  const cases = [
    [
      "build",
      "requirement-end-to-end",
      "implementation",
      ["Intake", "PRD", "UI/UX", "Tech Design", "Implementation", "QA", "Delivery"],
    ],
    [
      "bug",
      "bugfix-delivery",
      "implementation",
      ["Triage", "Reproduce", "Diagnose", "Fix", "Regression", "Delivery"],
    ],
    [
      "review",
      "code-review-delivery",
      "review",
      ["Scope", "Behavior Review", "Domain Review", "Test Review", "Optimize", "Verify & Deliver"],
    ],
    [
      "design",
      "technical-design-review",
      "design",
      ["Context", "Architecture", "QA Review", "Decision"],
    ],
  ];

  for (const [slug, workflow, taskMode, stages] of cases) {
    const result = runInit(root, slug, workflow);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^CREATED /);

    const status = readStatus(root, slug);
    assert.equal(status.schemaVersion, "2.2");
    assert.equal(status.workflow, workflow);
    assert.equal(status.requirementFolder, `workspace/20261104-${slug}`);
    assert.equal(status.deliveryControl.taskMode, taskMode);
    assert.match(status.deliveryControl.taskId, /^task-[0-9a-f-]+$/);
    assert.match(
      status.deliveryControl.currentInvocationId,
      /^invoke-[0-9a-f-]+$/,
    );
    assert.equal(status.deliveryControl.invocations.length, 1);
    assert.equal(
      status.deliveryControl.assurance.executionIdentities.length,
      1,
    );
    assert.deepEqual(
      status.stages.map((stage) => stage.name),
      stages,
    );
    for (const roleName of [
      "ui-designer",
      "frontend-engineer",
      "backend-engineer",
    ]) {
      const role = status.rolePlan.find((item) => item.role === roleName);
      if (role) {
        assert.equal(role.mode, "not_applicable");
        assert.deepEqual(role.stages, []);
      }
    }
  }
});

test("init-task is idempotent and preserves conflicting existing state", (t) => {
  const root = createProject(t);
  const first = runInit(root, "stable", "requirement-end-to-end", [
    "--profile",
    "assurance",
    "--complexity",
    "L",
  ]);
  assert.equal(first.status, 0, first.stderr);
  const statusPath = path.join(
    root,
    "workspace",
    "20261104-stable",
    "workflow-status.json",
  );
  const original = fs.readFileSync(statusPath, "utf8");

  const repeated = runInit(root, "stable", "requirement-end-to-end", [
    "--profile",
    "assurance",
    "--complexity",
    "L",
  ]);
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.match(repeated.stdout, /^EXISTS /);
  assert.equal(fs.readFileSync(statusPath, "utf8"), original);

  const conflict = runInit(root, "stable", "bugfix-delivery");
  assert.equal(conflict.status, 1);
  assert.match(conflict.stderr, /conflicts/i);
  assert.equal(fs.readFileSync(statusPath, "utf8"), original);
});

test("init-task can add one status to an existing task directory", (t) => {
  const root = createProject(t);
  const taskDir = path.join(root, "workspace", "20261104-existing");
  fs.mkdirSync(taskDir);
  fs.writeFileSync(path.join(taskDir, "notes.md"), "keep me\n");

  const result = runInit(root, "existing", "technical-design-review", [
    "--profile",
    "lightweight",
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(path.join(taskDir, "notes.md"), "utf8"), "keep me\n");
  assert.equal(readStatus(root, "existing").executionProfile, "lightweight");
});

test("init-task dry-run and JSON preview never write", (t) => {
  const root = createProject(t);
  const dryRun = runInit(root, "dry", "bugfix-delivery", ["--dry-run"]);
  assert.equal(dryRun.status, 0, dryRun.stderr);
  assert.match(dryRun.stdout, /^WOULD_CREATE /);
  assert.equal(
    fs.existsSync(path.join(root, "workspace", "20261104-dry")),
    false,
  );

  const json = runInit(root, "json", "code-review-delivery", ["--json"]);
  assert.equal(json.status, 0, json.stderr);
  const output = JSON.parse(json.stdout);
  assert.equal(output.preview, true);
  assert.equal(output.created, false);
  assert.equal(
    fs.existsSync(path.join(root, "workspace", "20261104-json")),
    false,
  );
});

test("init-task rejects unsafe and unsupported inputs without writing", (t) => {
  const root = createProject(t);
  const cases = [
    ["--slug", "../escape", "--workflow", "requirement-end-to-end"],
    ["--slug", "UPPER", "--workflow", "requirement-end-to-end"],
    ["--slug", "bad-date", "--workflow", "requirement-end-to-end", "--date", "20260230"],
    ["--slug", "unknown", "--workflow", "unknown-workflow"],
    ["--slug", "missing-workflow"],
    ["--slug", "unknown-option", "--workflow", "requirement-end-to-end", "--wat"],
  ];

  for (const args of cases) {
    const result = runCli("scripts/init-task.js", [
      "--root",
      root,
      ...args,
    ]);
    assert.equal(result.status, 2, `${args.join(" ")}\n${result.stderr}`);
  }
  assert.deepEqual(fs.readdirSync(path.join(root, "workspace")), []);
});

test("init-task rejects a symlink workspace and does not touch its target", (t) => {
  const root = createProject(t);
  const outside = createTempDir("ai-work-team-init-outside");
  t.after(() => cleanupDir(outside));
  fs.rmdirSync(path.join(root, "workspace"));
  fs.symlinkSync(outside, path.join(root, "workspace"));

  const result = runInit(root, "escape", "requirement-end-to-end");
  assert.equal(result.status, 2);
  assert.match(result.stderr, /symlink/i);
  assert.deepEqual(fs.readdirSync(outside), []);
});

test("init-task rejects a symlink task target without overwriting it", (t) => {
  const root = createProject(t);
  const outside = createTempDir("ai-work-team-init-target-outside");
  t.after(() => cleanupDir(outside));
  fs.writeFileSync(path.join(outside, "keep.txt"), "keep\n");
  fs.symlinkSync(
    outside,
    path.join(root, "workspace", "20261104-linked"),
  );

  const result = runInit(root, "linked", "requirement-end-to-end");
  assert.equal(result.status, 2);
  assert.match(result.stderr, /symlink/i);
  assert.equal(fs.readFileSync(path.join(outside, "keep.txt"), "utf8"), "keep\n");
});
