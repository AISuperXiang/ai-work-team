"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");

const {
  cleanupDir,
  createFakeNpx,
  createTempDir,
  runCli,
} = require("./cli-test-helpers");

function createInstallHarness(t, exitCode = 0) {
  const root = createTempDir("ai-work-team-install");
  const binDir = path.join(root, "bin");
  const logPath = path.join(root, "npx.log");
  const fake = createFakeNpx(binDir, logPath);
  t.after(() => cleanupDir(root));

  return {
    env: {
      ...fake.env,
      MOCK_NPX_EXIT: String(exitCode),
    },
    readCalls() {
      if (!fs.existsSync(logPath)) return [];
      return fs
        .readFileSync(logPath, "utf8")
        .trim()
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line));
    },
  };
}

test("install-external-skills dry-run never invokes npx", (t) => {
  const harness = createInstallHarness(t);
  const result = runCli(
    "scripts/install-external-skills.js",
    ["frontend-design", "--dry-run", "--force-external"],
    { env: harness.env },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Status: dry-run/);
  assert.deepEqual(harness.readCalls(), []);
});

for (const args of [
  ["--dryrun", "--force-external"],
  ["--role"],
  ["--force-external"],
  ["--allow-candidate"],
  ["frontend-design", "--unknown", "--force-external"],
]) {
  test(`install-external-skills rejects invalid arguments: ${args.join(" ")}`, (t) => {
    const harness = createInstallHarness(t);
    const result = runCli("scripts/install-external-skills.js", args, {
      env: harness.env,
    });

    assert.equal(result.status, 2);
    assert.match(
      result.stderr,
      /(unknown option|requires a value|requires a .*selector|explicit --all)/i,
    );
    assert.deepEqual(harness.readCalls(), []);
  });
}

test("install-external-skills forwards exact argv and subprocess failure", (t) => {
  const harness = createInstallHarness(t, 7);
  const result = runCli(
    "scripts/install-external-skills.js",
    ["frontend-design", "--force-external"],
    { env: harness.env },
  );

  assert.equal(result.status, 7);
  assert.deepEqual(harness.readCalls(), [
    ["skills", "add", "anthropics/skills@frontend-design", "-g", "-y"],
  ]);
  assert.match(result.stdout, /Status: failed/);
  assert.match(result.stdout, /exit code 7/);
});

test("install-external-skills blocks candidate by default", (t) => {
  const harness = createInstallHarness(t);
  const result = runCli(
    "scripts/install-external-skills.js",
    ["vue-pinia-unit-test", "--force-external"],
    { env: harness.env },
  );

  assert.equal(result.status, 2);
  assert.match(result.stdout, /Status: skipped-candidate/);
  assert.deepEqual(harness.readCalls(), []);
});

test("install-external-skills installs an explicitly allowed candidate once", (t) => {
  const harness = createInstallHarness(t);
  const result = runCli(
    "scripts/install-external-skills.js",
    [
      "vue-pinia-unit-test",
      "--allow-candidate",
      "--force-external",
    ],
    { env: harness.env },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Status: installed/);
  assert.equal(harness.readCalls().length, 1);
});
