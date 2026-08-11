"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");

const { PROJECT_ROOT, runCli } = require("./cli-test-helpers");

test("core contract validation ignores historical workspace statuses", (t) => {
  const fixtureName = `.contract-audit-fixture-${process.pid}-${Date.now()}`;
  const fixtureDir = path.join(PROJECT_ROOT, "workspace", fixtureName);
  fs.mkdirSync(fixtureDir, { recursive: true });
  fs.writeFileSync(path.join(fixtureDir, "workflow-status.json"), "{}\n");
  t.after(() => fs.rmSync(fixtureDir, { recursive: true, force: true }));

  const core = runCli("scripts/validate-contracts.js");
  assert.equal(core.status, 0, core.stderr);
  assert.doesNotMatch(core.stdout, new RegExp(fixtureName));

  const workspaceAudit = runCli("scripts/validate-contracts.js", [
    "--workspace",
    path.join("workspace", fixtureName),
  ]);
  assert.equal(workspaceAudit.status, 1);
  assert.match(
    `${workspaceAudit.stdout}\n${workspaceAudit.stderr}`,
    new RegExp(fixtureName),
  );
});

test("validate-contracts accepts a technical-design-review workspace", (t) => {
  const fixtureName = `.contract-design-fixture-${process.pid}-${Date.now()}`;
  const relativeDir = path.join("workspace", fixtureName);
  const fixtureDir = path.join(PROJECT_ROOT, relativeDir);
  fs.mkdirSync(fixtureDir, { recursive: true });
  t.after(() => fs.rmSync(fixtureDir, { recursive: true, force: true }));

  const stages = ["Context", "Architecture", "QA Review", "Decision"].map(
    (name) => ({
      name,
      owner: "delivery-manager",
      status: "pending",
      gates: [],
      artifacts: [],
      evidence: [],
    }),
  );
  fs.writeFileSync(
    path.join(fixtureDir, "workflow-status.json"),
    `${JSON.stringify(
      {
        workflow: "technical-design-review",
        requirementFolder: relativeDir,
        complexityLevel: "S",
        executionProfile: "lightweight",
        verificationLevel: "V0",
        rolePlan: [
          {
            role: "delivery-manager",
            mode: "active",
            reason: "Own the review delivery.",
            stages: ["Context", "Decision"],
          },
        ],
        updatedAt: "2026-08-11T00:00:00Z",
        stages,
      },
      null,
      2,
    )}\n`,
  );

  const result = runCli("scripts/validate-contracts.js", [
    "--workspace",
    relativeDir,
  ]);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("validate-contracts rejects unknown arguments", () => {
  const result = runCli("scripts/validate-contracts.js", ["--unknown"]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /unknown option/i);
});
