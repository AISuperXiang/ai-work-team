"use strict";

const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");

const {
  PROJECT_ROOT,
  cleanupDir,
  createTempDir,
  runCli,
} = require("./cli-test-helpers");

function createGoalDesignStatus(relativeDir) {
  const template = JSON.parse(
    fs.readFileSync(
      path.join(
        PROJECT_ROOT,
        "assets",
        "templates",
        "goal-design-workflow-status.json",
      ),
      "utf8",
    ),
  );
  template.requirementFolder = relativeDir;
  template.updatedAt = "2026-08-11T00:00:00Z";
  return template;
}

function writeGoalDesignContracts(fixtureDir, mutateTasks = (tasks) => tasks) {
  for (const fileName of [
    "goal-contract.json",
    "milestones.json",
    "autonomy-policy.json",
  ]) {
    fs.copyFileSync(
      path.join(PROJECT_ROOT, "assets", "templates", fileName),
      path.join(fixtureDir, fileName),
    );
  }
  const tasks = JSON.parse(
    fs.readFileSync(
      path.join(PROJECT_ROOT, "assets", "templates", "tasks.json"),
      "utf8",
    ),
  );
  fs.writeFileSync(
    path.join(fixtureDir, "tasks.json"),
    `${JSON.stringify(mutateTasks(tasks), null, 2)}\n`,
  );
}

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

test("validate-contracts accepts a goal-driven technical design workspace", (t) => {
  const fixtureName = `.contract-goal-design-${process.pid}-${Date.now()}`;
  const relativeDir = path.join("workspace", fixtureName);
  const fixtureDir = path.join(PROJECT_ROOT, relativeDir);
  fs.mkdirSync(fixtureDir, { recursive: true });
  t.after(() => fs.rmSync(fixtureDir, { recursive: true, force: true }));

  fs.writeFileSync(
    path.join(fixtureDir, "workflow-status.json"),
    `${JSON.stringify(createGoalDesignStatus(relativeDir), null, 2)}\n`,
  );

  const result = runCli("scripts/validate-contracts.js", [
    "--workspace",
    relativeDir,
  ]);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("validate-contracts rejects an incomplete goal-design stage contract", (t) => {
  const fixtureName = `.contract-goal-design-invalid-${process.pid}-${Date.now()}`;
  const relativeDir = path.join("workspace", fixtureName);
  const fixtureDir = path.join(PROJECT_ROOT, relativeDir);
  fs.mkdirSync(fixtureDir, { recursive: true });
  t.after(() => fs.rmSync(fixtureDir, { recursive: true, force: true }));

  const status = createGoalDesignStatus(relativeDir);
  status.stages = status.stages.filter(
    (stage) => stage.name !== "Design Revision",
  );
  for (const role of status.rolePlan) {
    role.stages = role.stages.filter((stage) => stage !== "Design Revision");
  }
  fs.writeFileSync(
    path.join(fixtureDir, "workflow-status.json"),
    `${JSON.stringify(status, null, 2)}\n`,
  );

  const result = runCli("scripts/validate-contracts.js", [
    "--workspace",
    relativeDir,
  ]);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /missing required stage: Design Revision/);
});

test("validate-contracts rejects high-risk tasks without approval", (t) => {
  const fixtureName = `.contract-goal-design-risk-${process.pid}-${Date.now()}`;
  const relativeDir = path.join("workspace", fixtureName);
  const fixtureDir = path.join(PROJECT_ROOT, relativeDir);
  fs.mkdirSync(fixtureDir, { recursive: true });
  t.after(() => fs.rmSync(fixtureDir, { recursive: true, force: true }));

  const status = createGoalDesignStatus(relativeDir);
  const architecture = status.stages.find(
    (stage) => stage.name === "Architecture Design",
  );
  architecture.status = "completed";
  architecture.artifacts = [
    "goal-contract.json",
    "milestones.json",
    "tasks.json",
    "autonomy-policy.json",
  ];
  architecture.evidence = ["tasks.json"];
  fs.writeFileSync(
    path.join(fixtureDir, "workflow-status.json"),
    `${JSON.stringify(status, null, 2)}\n`,
  );
  writeGoalDesignContracts(fixtureDir, (tasks) => {
    tasks.tasks[0].riskLevel = "high";
    tasks.tasks[0].decisionMode = "notify";
    return tasks;
  });

  const result = runCli("scripts/validate-contracts.js", [
    "--workspace",
    relativeDir,
  ]);
  assert.equal(result.status, 1);
  assert.match(
    result.stdout,
    /high-risk task task-first-vertical-slice must use decisionMode approval/,
  );
});

test("validate-contracts rejects unknown arguments", () => {
  const result = runCli("scripts/validate-contracts.js", ["--unknown"]);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /unknown option/i);
});

test("validate-contracts checks v2 archive claims without reading current source", (t) => {
  const { fixture, reseal } = require("./delivery-controls-fixture");
  const { status } = fixture();
  const relativeDir = `workspace/.delivery-v2-${process.pid}`;
  const dir = path.join(PROJECT_ROOT, relativeDir);
  fs.mkdirSync(dir, { recursive: true });
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  status.workflow = "requirement-end-to-end";
  status.requirementFolder = relativeDir;
  status.deliveryControl.completion.claim = "accepted";
  reseal(status);
  const save = () => fs.writeFileSync(path.join(dir, "workflow-status.json"), JSON.stringify(status));
  save();
  let result = runCli("scripts/validate-contracts.js", ["--workspace", relativeDir]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /archive claim is consistent/);
  status.deliveryControl.verificationRuns[1].observations = [];
  save();
  result = runCli("scripts/validate-contracts.js", ["--workspace", relativeDir]);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /CLAIM_EXCEEDS_EVIDENCE|DERIVED_SUMMARY_STALE/);
});

test("validate-contracts flushes piped output before exiting", async (t) => {
  const { fixture, reseal } = require("./delivery-controls-fixture");
  const { status } = fixture();
  const relativeDir = `workspace/.contract-output-${process.pid}`;
  const dir = path.join(PROJECT_ROOT, relativeDir);
  const preloadDir = createTempDir("contract-output");
  fs.mkdirSync(dir, { recursive: true });
  t.after(() => {
    cleanupDir(dir);
    cleanupDir(preloadDir);
  });

  status.workflow = "requirement-end-to-end";
  status.requirementFolder = relativeDir;
  status.deliveryControl.completion.claim = "accepted";
  reseal(status);
  status.deliveryControl.verificationRuns[1].observations = [];
  fs.writeFileSync(
    path.join(dir, "workflow-status.json"),
    JSON.stringify(status),
  );

  // Queue more than a pipe can hold so premature process.exit() is observable
  // on every platform, including machines where ordinary CLI output fits.
  const prefixBytes = 2 * 1024 * 1024;
  const preloadPath = path.join(preloadDir, "backpressure.cjs");
  fs.writeFileSync(
    preloadPath,
    `process.stdout.write("x".repeat(${prefixBytes}));\n`,
  );

  const cases = [
    {
      name: "failed archive claim",
      args: ["--workspace", relativeDir],
      exitCode: 1,
      stdout: /CLAIM_EXCEEDS_EVIDENCE|DERIVED_SUMMARY_STALE/,
      stderr: /contract check\(s\) failed/,
    },
    {
      name: "invalid workspace path",
      args: ["--workspace", "../outside"],
      exitCode: 2,
      stderr: /workspace.*inside/i,
    },
    {
      name: "unknown argument",
      args: ["--unknown"],
      exitCode: 2,
      stderr: /unknown option/i,
    },
    {
      name: "help",
      args: ["--help"],
      exitCode: 0,
      stdout: /Usage:/,
    },
    {
      name: "successful core validation",
      args: [],
      exitCode: 0,
      stdout: /All implementation contract checks passed/,
    },
  ];

  for (const scenario of cases) {
    await t.test(scenario.name, () => {
      const result = spawnSync(
        process.execPath,
        [
          "--require",
          preloadPath,
          path.join(PROJECT_ROOT, "scripts/validate-contracts.js"),
          ...scenario.args,
        ],
        {
          cwd: PROJECT_ROOT,
          encoding: "utf8",
          maxBuffer: 4 * 1024 * 1024,
          timeout: 30_000,
        },
      );
      assert.ifError(result.error);
      assert.equal(result.status, scenario.exitCode, result.stderr);
      assert.ok(
        result.stdout.startsWith("x".repeat(prefixBytes)),
        `stdout was truncated: received ${Buffer.byteLength(result.stdout)} bytes`,
      );
      const output = result.stdout.slice(prefixBytes);
      if (scenario.stdout) assert.match(output, scenario.stdout);
      if (scenario.stderr) assert.match(result.stderr, scenario.stderr);
      if (scenario.exitCode !== 0) {
        assert.doesNotMatch(output, /All implementation contract checks passed/);
      }
      if (scenario.name === "help") assert.doesNotMatch(output, /^PASS /m);
    });
  }
});

test("v2.1 lightweight workspace can omit derived handoff and delivery files", (t) => {
  const { fixture } = require("./delivery-controls-fixture");
  const { status } = fixture();
  const relativeDir = `workspace/.delivery-v21-minimal-${process.pid}`;
  const dir = path.join(PROJECT_ROOT, relativeDir);
  fs.mkdirSync(dir, { recursive: true });
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  status.workflow = "requirement-end-to-end";
  status.requirementFolder = relativeDir;
  status.executionProfile = "lightweight";
  status.deliveryControl.recordPolicy = {
    profile: "minimal",
    authoritativeRecord: "workflow-status.json",
    summaryMode: "derived",
    requiredArtifacts: ["workflow-status.json"],
    derivedArtifacts: [],
    summarySourceDigest: null,
    omittedArtifacts: [
      {
        artifact: "role-handoff.md",
        reason: "The bounded task keeps equivalent handoff data in the authoritative status",
        decisionRef: "workflow-status.json#deliveryControl.recordPolicy",
      },
      {
        artifact: "delivery-summary.md",
        reason: "The final response is the derived delivery view",
        decisionRef: "workflow-status.json#deliveryControl.recordPolicy",
      },
    ],
  };
  for (const stage of status.stages) {
    if (stage.name === "UI/UX") {
      stage.status = "completed";
      stage.artifacts = ["workflow-status.json"];
      stage.evidence = ["workflow-status.json"];
    }
    if (stage.name === "Delivery") {
      stage.status = "completed";
      stage.artifacts = ["workflow-status.json"];
      stage.evidence = ["workflow-status.json"];
    }
  }
  status.deliveryControl.completion.claim = "accepted";
  fs.writeFileSync(
    path.join(dir, "workflow-status.json"),
    `${JSON.stringify(status, null, 2)}\n`,
  );

  const result = runCli("scripts/validate-contracts.js", [
    "--workspace",
    relativeDir,
  ]);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /omitted by recordPolicy with decisionRef/);
});
