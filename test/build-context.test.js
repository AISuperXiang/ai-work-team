"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");

const {
  cleanupDir,
  createTempDir,
  runCli,
} = require("./cli-test-helpers");

function createProject(t) {
  const root = createTempDir("ai-work-team-build-context");
  t.after(() => cleanupDir(root));
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ name: "fixture", scripts: { test: "node --test" } }),
  );
  return root;
}

test("build-context dry-run does not write and repeated writes are idempotent", (t) => {
  const root = createProject(t);
  const agentsPath = path.join(root, "AGENTS.md");
  fs.writeFileSync(agentsPath, "# Manual Rules\n\nKeep this section.\n");

  const dryRun = runCli("scripts/build-context.js", [root, "--dry-run"]);
  assert.equal(dryRun.status, 0, dryRun.stderr);
  assert.match(dryRun.stdout, /ai-work-team:buildContext:start/);
  assert.equal(
    fs.readFileSync(agentsPath, "utf8"),
    "# Manual Rules\n\nKeep this section.\n",
  );

  const firstWrite = runCli("scripts/build-context.js", [root]);
  const secondWrite = runCli("scripts/build-context.js", [root]);
  assert.equal(firstWrite.status, 0, firstWrite.stderr);
  assert.equal(secondWrite.status, 0, secondWrite.stderr);

  const content = fs.readFileSync(agentsPath, "utf8");
  assert.match(content, /Keep this section\./);
  assert.equal(
    content.match(/<!-- ai-work-team:buildContext:start -->/g).length,
    1,
  );
});

test("build-context rejects unknown options without writing", (t) => {
  const root = createProject(t);
  const result = runCli("scripts/build-context.js", [root, "--dryrun"]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /unknown option/i);
  assert.equal(fs.existsSync(path.join(root, "AGENTS.md")), false);
});

test("build-context refuses to overwrite an oversized AGENTS.md", (t) => {
  const root = createProject(t);
  const agentsPath = path.join(root, "AGENTS.md");
  const original = `# Existing\n${"x".repeat(256 * 1024 + 1)}`;
  fs.writeFileSync(agentsPath, original);

  const result = runCli("scripts/build-context.js", [root]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /exceeds.*256.*KiB/i);
  assert.equal(fs.readFileSync(agentsPath, "utf8"), original);
});

test("build-context rejects output paths outside the project root", (t) => {
  const root = createProject(t);
  const outside = path.join(path.dirname(root), `${path.basename(root)}-outside.md`);
  t.after(() => fs.rmSync(outside, { force: true }));

  const traversal = runCli("scripts/build-context.js", [
    root,
    "--output",
    `../${path.basename(outside)}`,
  ]);
  assert.equal(traversal.status, 2);
  assert.match(traversal.stderr, /inside the workdir/i);
  assert.equal(fs.existsSync(outside), false);

  const absolute = runCli("scripts/build-context.js", [
    root,
    "--output",
    outside,
  ]);
  assert.equal(absolute.status, 2);
  assert.match(absolute.stderr, /relative path/i);
  assert.equal(fs.existsSync(outside), false);
});

test("build-context rejects a symlink output target", (t) => {
  const root = createProject(t);
  const outsideDir = createTempDir("ai-work-team-build-context-outside");
  t.after(() => cleanupDir(outsideDir));
  const outside = path.join(outsideDir, "outside.md");
  const link = path.join(root, "linked-agents.md");
  fs.writeFileSync(outside, "do not replace");
  fs.symlinkSync(outside, link);

  const result = runCli("scripts/build-context.js", [
    root,
    "--output",
    "linked-agents.md",
  ]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /symbolic link/i);
  assert.equal(fs.readFileSync(outside, "utf8"), "do not replace");
});
