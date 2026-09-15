"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  summarizeSkillEvaluation,
  validateSkillEvaluation,
} = require("../scripts/skill-evaluation");
const {
  cleanupDir,
  createTempDir,
  runCli,
} = require("./cli-test-helpers");

function result(correct, humanActiveMinutes, criticalErrors = []) {
  return { correct, humanActiveMinutes, criticalErrors };
}

function pilot(id, arm, humanActiveMinutes, overrides = {}) {
  return {
    id,
    arm,
    riskClass: "standard",
    status: "delivered",
    changeClass: "same_goal",
    humanActiveMinutes,
    toolMinutes: 2,
    environmentWaitMinutes: 1,
    criticalErrors: [],
    escapedRegression: {
      state: "mature",
      count: 0,
      observationEnd: "2026-09-29",
    },
    ...overrides,
  };
}

function evaluation() {
  return {
    schemaVersion: "1.0.0",
    evaluationId: "eval-third-part",
    baseline: {
      id: "baseline",
      skillVersion: "0.5.0",
      modelRef: "model-fixed",
      toolsetRef: "tools-fixed",
      budgetRef: "budget-fixed",
    },
    candidate: {
      id: "candidate",
      skillVersion: "0.6.0",
      modelRef: "model-fixed",
      toolsetRef: "tools-fixed",
      budgetRef: "budget-fixed",
    },
    policy: {
      minimumHoldoutCases: 2,
      minimumPilotTasksPerArm: 1,
      minimumTimeReductionRatio: 0.2,
      maxEscapeRegressionDelta: 0,
      criticalErrorCodes: [
        "UNAUTHORIZED_CHANGE",
        "FALSE_ACCEPTANCE",
        "STALE_EVIDENCE_REUSED",
      ],
    },
    offlineCases: [
      {
        id: "case-review-counterexample",
        split: "holdout",
        fidelity: "exact",
        riskClass: "review",
        inputRef: "cases/review/input",
        oracleRef: "oracles/review",
        answerLeakage: false,
        baselineResult: result(false, 12),
        candidateResult: result(true, 8),
      },
      {
        id: "case-catalog-separation",
        split: "holdout",
        fidelity: "reconstructed",
        riskClass: "testing",
        inputRef: "cases/catalog/input",
        oracleRef: "oracles/catalog",
        answerLeakage: false,
        baselineResult: result(false, 10),
        candidateResult: result(true, 7),
      },
    ],
    pilotTasks: [
      pilot("pilot-baseline", "baseline", 10),
      pilot("pilot-candidate", "candidate", 7),
    ],
  };
}

test("skill evaluation adopts only after offline and mature pilot gates pass", () => {
  const input = evaluation();
  assert.deepEqual(validateSkillEvaluation(input), []);
  const summary = summarizeSkillEvaluation(input);
  assert.equal(summary.offline.status, "passed");
  assert.equal(summary.pilot.status, "passed");
  assert.equal(summary.pilot.timeReductionRatio, 0.3);
  assert.equal(summary.decision, "adopt");
});

test("critical errors and escaped regressions cannot be averaged away", async (t) => {
  await t.test("offline critical error rejects", () => {
    const input = evaluation();
    input.offlineCases[0].candidateResult.criticalErrors = ["FALSE_ACCEPTANCE"];
    const summary = summarizeSkillEvaluation(input);
    assert.equal(summary.offline.status, "failed");
    assert.equal(summary.decision, "reject");
  });
  await t.test("pilot quality regression rejects", () => {
    const input = evaluation();
    input.pilotTasks[1].escapedRegression.count = 1;
    const summary = summarizeSkillEvaluation(input);
    assert.equal(summary.pilot.status, "quality_regressed");
    assert.equal(summary.decision, "reject");
  });
});

test("immature observation and insufficient samples remain inconclusive", async (t) => {
  await t.test("pending observation", () => {
    const input = evaluation();
    input.pilotTasks[1].escapedRegression = {
      state: "pending",
      count: 0,
      observationEnd: null,
    };
    const summary = summarizeSkillEvaluation(input);
    assert.equal(summary.pilot.status, "inconclusive");
    assert.equal(summary.decision, "hold");
  });
  await t.test("missing holdout", () => {
    const input = evaluation();
    input.offlineCases.pop();
    const summary = summarizeSkillEvaluation(input);
    assert.equal(summary.offline.status, "inconclusive");
    assert.equal(summary.decision, "hold");
  });
  await t.test("abandoned tasks do not satisfy the delivered sample minimum", () => {
    const input = evaluation();
    input.pilotTasks[1] = pilot(
      "pilot-candidate",
      "candidate",
      1,
      {
        status: "abandoned",
        escapedRegression: {
          state: "not_exposed",
          count: 0,
          observationEnd: null,
        },
      },
    );
    const summary = summarizeSkillEvaluation(input);
    assert.equal(summary.pilot.status, "inconclusive");
    assert.equal(summary.pilot.candidateDeliveredTasks, 0);
    assert.equal(summary.decision, "hold");
  });
});

test("answer leakage and malformed durations fail validation", () => {
  const input = evaluation();
  input.offlineCases[0].answerLeakage = true;
  input.pilotTasks[0].humanActiveMinutes = -1;
  const diagnostics = validateSkillEvaluation(input);
  assert.ok(diagnostics.some((item) => item.code === "ANSWER_LEAKAGE"));
  assert.ok(diagnostics.some((item) => item.code === "INVALID_DURATION"));
  assert.equal(summarizeSkillEvaluation(input).decision, "hold");
});

test("escaped-regression observation end follows the published schema", () => {
  const input = evaluation();
  input.pilotTasks[0].escapedRegression.observationEnd = 42;
  assert.ok(validateSkillEvaluation(input).some((item) =>
    item.code === "INVALID_ESCAPE_RESULT"));
});

test("evaluation input rejects fields outside the published schema", () => {
  const input = evaluation();
  input.privateConversation = "must not be accepted";
  input.pilotTasks[0].untrackedMetric = 1;
  const diagnostics = validateSkillEvaluation(input);
  assert.ok(diagnostics.some((item) =>
    item.code === "UNKNOWN_FIELD" && item.at === "$"));
  assert.ok(diagnostics.some((item) =>
    item.code === "UNKNOWN_FIELD" && item.at === "pilotTasks[0]"));
});

test("baseline and candidate must use the same model, tools, and budget", () => {
  const input = evaluation();
  input.candidate.modelRef = "different-model";
  assert.ok(validateSkillEvaluation(input).some((item) =>
    item.code === "VARIANT_CONTEXT_MISMATCH" && item.at === "modelRef"));
});

test("pilot thresholds are enforced within every risk class", () => {
  const input = evaluation();
  input.pilotTasks.push(pilot("pilot-cache-candidate", "candidate", 5, {
    riskClass: "cache",
  }));
  const summary = summarizeSkillEvaluation(input);
  assert.equal(summary.pilot.status, "inconclusive");
  assert.equal(summary.decision, "hold");
  assert.equal(summary.pilot.groups.find((group) =>
    group.riskClass === "cache").enough, false);
});

test("candidate delivery rate cannot regress behind the baseline", () => {
  const input = evaluation();
  input.pilotTasks.push(
    pilot("pilot-baseline-two", "baseline", 11),
    pilot("pilot-candidate-two", "candidate", 1, {
      status: "blocked",
      escapedRegression: {
        state: "not_exposed",
        count: 0,
        observationEnd: null,
      },
    }),
  );
  const summary = summarizeSkillEvaluation(input);
  assert.equal(summary.pilot.groups[0].baselineDeliveryRate, 1);
  assert.equal(summary.pilot.groups[0].candidateDeliveryRate, 0.5);
  assert.equal(summary.pilot.status, "quality_regressed");
  assert.equal(summary.decision, "reject");
});

test("evaluate-skill CLI is read-only and rejects unsafe inputs", (t) => {
  const root = createTempDir("skill-evaluation");
  t.after(() => cleanupDir(root));
  const file = path.join(root, "evaluation.json");
  fs.writeFileSync(file, JSON.stringify(evaluation()));
  const before = fs.readFileSync(file, "utf8");
  const output = runCli(
    "scripts/evaluate-skill.js",
    ["--input", "evaluation.json", "--json"],
    { cwd: root },
  );
  assert.equal(output.status, 0, output.stdout + output.stderr);
  assert.equal(JSON.parse(output.stdout).decision, "adopt");
  assert.equal(fs.readFileSync(file, "utf8"), before);

  for (const args of [
    [],
    ["--unknown"],
    ["--input"],
    ["--input", "../evaluation.json", "--json"],
    ["--input", "/tmp/evaluation.json", "--json"],
    ["--input", "evaluation.json", "--json", "--json"],
  ]) {
    const rejected = runCli("scripts/evaluate-skill.js", args, { cwd: root });
    assert.equal(rejected.status, 2, `${args.join(" ")}\n${rejected.stdout}${rejected.stderr}`);
  }
  assert.equal(runCli("scripts/evaluate-skill.js", ["--help"], { cwd: root }).status, 0);
});

test("evaluate-skill CLI rejects symlink and invalid JSON inputs", (t) => {
  const root = createTempDir("skill-evaluation-unsafe");
  t.after(() => cleanupDir(root));
  fs.writeFileSync(path.join(root, "target.json"), JSON.stringify(evaluation()));
  fs.symlinkSync(path.join(root, "target.json"), path.join(root, "linked.json"));
  let output = runCli(
    "scripts/evaluate-skill.js",
    ["--input", "linked.json", "--json"],
    { cwd: root },
  );
  assert.equal(output.status, 2);
  fs.writeFileSync(path.join(root, "invalid.json"), "{");
  output = runCli(
    "scripts/evaluate-skill.js",
    ["--input", "invalid.json", "--json"],
    { cwd: root },
  );
  assert.equal(output.status, 1);
  assert.equal(JSON.parse(output.stdout).decision, "hold");
  const large = evaluation();
  large.offlineCases[0].riskClass = "x".repeat(256 * 1024 + 1);
  fs.writeFileSync(path.join(root, "large.json"), JSON.stringify(large));
  output = runCli(
    "scripts/evaluate-skill.js",
    ["--input", "large.json", "--json"],
    { cwd: root },
  );
  assert.equal(output.status, 1);
});
