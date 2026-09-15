"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  fixture,
  source,
  output,
  environmentOutput,
  hash,
} = require("./delivery-controls-fixture");
const { createTempDir, cleanupDir, runCli } = require("./cli-test-helpers");

function project(t) {
  const root = createTempDir("delivery-input");
  t.after(() => cleanupDir(root));
  const workspace = path.join(root, "workspace/task");
  fs.mkdirSync(path.join(workspace, "evidence"), { recursive: true });
  fs.mkdirSync(path.join(root, "src"));
  fs.writeFileSync(path.join(root, "src/example.js"), source);
  fs.writeFileSync(path.join(workspace, "evidence/run.txt"), output);
  fs.writeFileSync(
    path.join(workspace, "evidence/environment.json"),
    environmentOutput,
  );
  const { status } = fixture();
  const save = () => fs.writeFileSync(path.join(workspace, "workflow-status.json"), JSON.stringify(status));
  save();
  const args = ["--project-root", root, "--workspace", "workspace/task", "--json"];
  return { root, workspace, status, save, args };
}

test("check-delivery captures and assesses real files without modifying them", (t) => {
  const p = project(t);
  const before = fs.readFileSync(path.join(p.workspace, "workflow-status.json"), "utf8");
  const capture = runCli("scripts/check-delivery.js", [...p.args, "--mode", "capture"]);
  assert.equal(capture.status, 0, capture.stdout + capture.stderr);
  const snapshot = JSON.parse(capture.stdout);
  assert.equal(snapshot.operation, "capture"); assert.equal(snapshot.readiness, undefined);
  assert.equal(snapshot.snapshot.files[0].hash, hash(source));
  assert.match(snapshot.impactScopeDigest, /^[a-f0-9]{64}$/);
  const assess = runCli("scripts/check-delivery.js", p.args);
  assert.equal(assess.status, 0, assess.stdout + assess.stderr);
  assert.equal(JSON.parse(assess.stdout).readiness, "ready");
  assert.equal(fs.readFileSync(path.join(p.workspace, "workflow-status.json"), "utf8"), before);
  fs.writeFileSync(path.join(p.root, "notes.md"), "unrelated");
  assert.equal(runCli("scripts/check-delivery.js", p.args).status, 0);
  fs.writeFileSync(path.join(p.root, "src/example.js"), "changed");
  const stale = runCli("scripts/check-delivery.js", p.args);
  assert.equal(stale.status, 1); assert.equal(JSON.parse(stale.stdout).readiness, "review");
});

test("check-delivery detects deleted source and altered or missing evidence", async (t) => {
  for (const variant of ["delete-source", "delete-output", "alter-output", "alter-environment"]) await t.test(variant, (t) => {
    const p = project(t);
    if (variant === "delete-source") fs.unlinkSync(path.join(p.root, "src/example.js"));
    else if (variant === "delete-output") fs.unlinkSync(path.join(p.workspace, "evidence/run.txt"));
    else if (variant === "alter-output") fs.writeFileSync(path.join(p.workspace, "evidence/run.txt"), "different result");
    else fs.writeFileSync(path.join(p.workspace, "evidence/environment.json"), "{\"build\":\"old\"}\n");
    assert.equal(runCli("scripts/check-delivery.js", p.args).status, 1);
  });
});

test("check-delivery rejects unsafe CLI inputs and never executes recorded argv", async (t) => {
  const p = project(t);
  for (const extra of [["--unknown"], ["--mode"], ["--mode", "other"], ["--json"], ["--help"], ["unexpected"]]) {
    const result = runCli("scripts/check-delivery.js", [...p.args, ...extra]);
    assert.equal(result.status, 2); assert.equal(JSON.parse(result.stdout).readiness, "blocked");
  }
  for (const relative of ["../escape", "/tmp/escape", "C:escape", "workspace/../task", "workspace\\task", ".env", ".git/config", "tests/account.json"]) {
    const result = runCli("scripts/check-delivery.js", ["--project-root", p.root, "--workspace", relative, "--json"]);
    assert.equal(result.status, 2, relative + result.stdout);
  }
  for (const args of [[], ["--project-root", p.root], ["--workspace", "workspace/task"]]) {
    assert.equal(runCli("scripts/check-delivery.js", args).status, 2);
  }
  assert.equal(runCli("scripts/check-delivery.js", ["--help"]).status, 0);
  const marker = path.join(p.root, "must-not-exist");
  p.status.deliveryControl.verificationRuns[1].execution.argv = ["node", "-e", `require("fs").writeFileSync(${JSON.stringify(marker)}, "bad")`];
  p.save();
  assert.equal(runCli("scripts/check-delivery.js", p.args).status, 0);
  assert.equal(fs.existsSync(marker), false);
});

test("check-delivery rejects symlink sources, parents, outputs, environment evidence and status", async (t) => {
  for (const kind of ["source", "parent", "output", "environment", "status"]) await t.test(kind, (t) => {
    const p = project(t);
    const victim = kind === "source" ? path.join(p.root, "src/example.js") :
      kind === "parent" ? path.join(p.root, "src") :
      kind === "output" ? path.join(p.workspace, "evidence/run.txt") :
      kind === "environment" ? path.join(p.workspace, "evidence/environment.json") :
      path.join(p.workspace, "workflow-status.json");
    const replacement = `${victim}.original`;
    fs.renameSync(victim, replacement); fs.symlinkSync(replacement, victim);
    const result = runCli("scripts/check-delivery.js", p.args);
    assert.equal(result.status, 2, result.stdout + result.stderr);
  });
});

test("check-delivery rejects non-files, oversized and malformed states", async (t) => {
  for (const variant of ["large", "json", "directory", "missing"]) await t.test(variant, (t) => {
    const p = project(t);
    const statusFile = path.join(p.workspace, "workflow-status.json");
    if (variant === "large") fs.writeFileSync(statusFile, " ".repeat(256 * 1024 + 1));
    if (variant === "json") fs.writeFileSync(statusFile, "{");
    if (variant === "directory") { fs.unlinkSync(statusFile); fs.mkdirSync(statusFile); }
    if (variant === "missing") fs.unlinkSync(statusFile);
    const result = runCli("scripts/check-delivery.js", p.args);
    assert.notEqual(result.status, 0); assert.doesNotThrow(() => JSON.parse(result.stdout));
  });
});

test("check-delivery preserves explicit legacy and version failures", (t) => {
  const p = project(t);
  delete p.status.schemaVersion; delete p.status.deliveryControl; p.save();
  let result = runCli("scripts/check-delivery.js", p.args);
  assert.equal(result.status, 1); assert.equal(JSON.parse(result.stdout).readiness, "legacy_unverified");
  p.status.schemaVersion = "3.0"; p.save();
  result = runCli("scripts/check-delivery.js", p.args);
  assert.equal(result.status, 1); assert.equal(JSON.parse(result.stdout).readiness, "blocked");
});
