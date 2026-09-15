"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  fixture,
  reseal,
  finding,
  hash,
} = require("./delivery-controls-fixture");
const {
  evaluateDeliveryControl: evaluate,
  validateDeliveryControl: validate,
  validateShape,
  contractDigest,
  environmentProbeFingerprint,
  impactScopeDigest,
  snapshotDigest,
} = require("../scripts/delivery-controls");

function configureInitialReview(status) {
  const c = status.deliveryControl;
  status.workflow = "code-review-delivery";
  c.taskMode = "review";
  c.completion.implementation = "not_applicable";
  c.acceptance.forEach((item) => { item.kind = "analysis"; });
  c.fixes = [];
  c.invocations = [
    {
      id: "invoke-review", operation: "review", reviewMode: "initial",
      authorizationRef: "user requested review", contractRevision: "C1", snapshotId: "S1",
      selectedCheckIds: ["target-check", "preserve-check"], selectedFindingIds: [],
      allowedActions: ["read", "run_verification", "run_assessment", "append_evidence", "write_summary"],
      necessaryStages: ["Implementation"], reason: "Review the requested behavior scope",
    },
    {
      id: "invoke-deliver", operation: "deliver", authorizationRef: "user requested review",
      contractRevision: "C1", snapshotId: "S1", selectedCheckIds: [], selectedFindingIds: [],
      allowedActions: ["read", "run_assessment", "write_summary"],
      necessaryStages: ["Delivery"], reason: "Deliver the bounded review result",
      previousInvocationId: "invoke-review",
    },
  ];
  c.currentInvocationId = "invoke-deliver";
  c.testSelections[0].invocationId = "invoke-review";
  c.reviewRuns = [{
    id: "review-initial", invocationId: "invoke-review", mode: "initial",
    reviewBaseRef: "base-sha", previousTargetSnapshotId: null,
    currentTargetSnapshotId: "S1", impactScopeDigest: impactScopeDigest(c),
    requestedScopeIds: ["scope-main"], reviewedScopeIds: ["scope-main"],
    inheritedScopes: [], gapScopes: [], selectedFindingIds: [], findingResults: [],
    mergeState: "not_applicable", mergedSnapshotId: null, conclusionScope: "requested",
  }];
}

test("delivery controls preserve valid repair evidence and immutable input", () => {
  const { status, context } = fixture();
  const before = JSON.stringify(status);
  assert.deepEqual(validate(status), []);
  assert.equal(evaluate(status, context).readiness, "ready");
  assert.equal(JSON.stringify(status), before);
  status.deliveryControl.completion.claim = "accepted";
  assert.equal(evaluate(status, context).readiness, "blocked");
  reseal(status);
  assert.equal(evaluate(status, context).readiness, "ready");
});

test("delivery controls reject invalid contracts and references", async (t) => {
  const cases = {
    "missing active contract": (c) => { c.activeContractRevision = "unknown"; },
    "duplicate contract": (c) => c.contracts.push(structuredClone(c.contracts[0])),
    "self cycle": (c) => { c.contracts[0].supersedes = "C1"; c.contracts[0].changeReason = "changed"; },
    "superseded contract left active": (c) => c.contracts.push({ ...structuredClone(c.contracts[0]), id: "C2", supersedes: "C1", changeReason: "approved replacement" }),
    "run cycle": (c) => { c.verificationRuns[1].supersedesRunIds = ["green"]; c.verificationRuns[1].reason = "again"; },
    "unknown snapshot": (c) => { c.verificationRuns[1].snapshotId = "unknown"; },
    "unknown evidence": (c) => { c.acceptance[0].checks[0].evidenceIds = ["unknown"]; },
    "unknown output": (c) => { c.verificationRuns[1].observations[0].outputRef = "missing.txt"; },
    "unknown field": (c) => { c.complete = true; },
    "empty expected": (c) => { c.acceptance[0].expected = " "; },
    "duplicate observation": (c) => c.verificationRuns[1].observations.push(c.verificationRuns[1].observations[0]),
    "missing execution": (c) => { c.verificationRuns[1].execution = null; },
    "invalid time": (c) => { c.verificationRuns[1].finishedAt = "invalid"; },
    "invalid kind": (c) => { c.acceptance[1].kind = "target"; },
    "output traversal": (c) => { c.verificationRuns[1].outputRefs[0].path = "../secret"; },
    "unknown environment probe": (c) => { c.verificationRuns[1].environmentProbeIds = ["unknown"]; },
    "tampered environment probe": (c) => { c.environmentProbes[0].sourceRef = "changed without reseal"; },
    "duplicate environment dimension": (c) => c.environmentProbes[0].requirements.push(c.environmentProbes[0].requirements[0]),
    "impact check outside declared acceptance": (c) => { c.impactScopes[0].acceptanceIds = ["target"]; },
  };
  for (const [name, mutate] of Object.entries(cases)) await t.test(name, () => {
    const { status, context } = fixture();
    mutate(status.deliveryControl);
    assert.ok(validate(status).length);
    assert.equal(evaluate(status, context).readiness, "blocked");
  });
});

test("delivery controls do not infer acceptance from unrelated green checks", async (t) => {
  const cases = {
    "contract draft": (c) => { c.contracts[0].status = "draft"; },
    "contract conflict": (c) => { c.contracts[0].status = "conflicted"; },
    "expected changed": (c) => { c.acceptance[0].expected = "different behavior"; },
    "required changed": (c) => { c.acceptance[1].required = false; },
    "method changed": (c) => { c.acceptance[0].checks[0].method = "browser"; },
    "no preserve": (c) => { c.fixes[0].preservedAcceptanceIds = []; },
    "no consumer rationale": (c) => { delete c.fixes[0].consumerNotApplicableReason; },
    "no fix": (c) => { c.fixes = []; },
    "baseline setup error": (c) => { c.verificationRuns[0].failureKind = "setup"; },
    "baseline missing": (c) => { c.fixes[0].baselineRunIds = []; },
    "missing observation": (c) => { c.verificationRuns[1].observations = []; },
    "skipped observation": (c) => { c.verificationRuns[1].observations[0].outcome = "not_run"; },
    "preserve failed": (c) => { c.verificationRuns[1].observations[1].outcome = "fail"; c.verificationRuns[1].failureKind = "assertion"; },
    "whole process failed": (c) => { c.verificationRuns[1].execution.exitCode = 1; },
    "wrong branch": (c) => { c.verificationRuns[1].observations[0].caseKey = "serial-not-parallel"; },
    "wrong environment": (c) => { c.verificationRuns[1].environmentKey = "node14-simulation"; },
    "environment unconfirmed": (c) => { c.completion.evidenceReview.environmentConfirmed = false; },
    "missing evidence review": (c) => { delete c.completion.evidenceReview; },
    "evidence review too early": (c) => { c.completion.evidenceReview.checkedAt = "2026-09-14T00:00:00Z"; },
    "open P1": (c) => c.findingDisposition.push(finding()),
    "closed finding without evidence": (c) => c.findingDisposition.push(finding({
      status: "closed",
      fixedState: "fixed",
    })),
  };
  for (const [name, mutate] of Object.entries(cases)) await t.test(name, () => {
    const { status, context } = fixture();
    mutate(status.deliveryControl);
    assert.notEqual(evaluate(status, context).readiness, "ready");
    status.deliveryControl.completion.claim = "accepted";
    assert.equal(evaluate(status, context).readiness, "blocked");
  });
});

test("contract digest mismatch alone makes run evidence stale", () => {
  const { status, context } = fixture();
  status.deliveryControl.verificationRuns[1].contractDigest = hash("different-contract");
  const result = evaluate(status, context);
  assert.notEqual(result.readiness, "ready");
  assert.equal(result.checks[0].status, "STALE");
});

test("fix must map a preserved path even when all remaining evidence is resealed", () => {
  const { status, context } = fixture();
  status.deliveryControl.fixes[0].preservedAcceptanceIds = [];
  reseal(status);
  const result = evaluate(status, context);
  assert.equal(result.readiness, "blocked");
  assert.ok(result.diagnostics.some((item) => item.code === "PRESERVATION_REQUIRED"));
});

test("a current review cannot refresh evidence from a stale run snapshot", () => {
  const { status, context } = fixture();
  const c = status.deliveryControl;
  const stale = structuredClone(c.snapshots[0]);
  stale.id = "S0";
  stale.files[0].hash = hash("old code");
  stale.codeDigest = snapshotDigest(stale.files);
  c.snapshots.unshift(stale);
  c.verificationRuns[1].snapshotId = "S0";
  const result = evaluate(status, context);
  assert.notEqual(result.readiness, "ready");
  assert.equal(result.checks[0].status, "STALE");
});

test("snapshot and output identity invalidate only current evidence", async (t) => {
  for (const kind of ["source", "test", "fixture", "config", "lock", "artifact"]) await t.test(kind, () => {
    const { status, context } = fixture();
    context.snapshot = structuredClone(context.snapshot);
    context.snapshot.files[0] = { ...context.snapshot.files[0], kind, hash: hash("changed") };
    context.snapshot.codeDigest = snapshotDigest(context.snapshot.files);
    assert.notEqual(evaluate(status, context).readiness, "ready");
  });
  const { status, context } = fixture();
  context.outputHashes["evidence/run.txt"] = hash("tampered");
  assert.notEqual(evaluate(status, context).readiness, "ready");
});

test("baseline snapshot differs legitimately while postfix evidence stays current", () => {
  const { status, context } = fixture();
  const c = status.deliveryControl;
  const old = structuredClone(c.snapshots[0]);
  old.id = "S0"; old.files[0].hash = hash("old implementation"); old.codeDigest = snapshotDigest(old.files);
  c.snapshots.unshift(old); c.verificationRuns[0].snapshotId = "S0";
  assert.equal(evaluate(status, context).readiness, "ready");
});

test("conflicting observations require explicit check-local replacement", () => {
  const { status, context } = fixture();
  const c = status.deliveryControl;
  const failure = structuredClone(c.verificationRuns[1]);
  failure.id = "failed"; failure.failureKind = "assertion"; failure.observations[0].outcome = "fail";
  c.verificationRuns.push(failure);
  c.testSelections[0].runIds.push("failed");
  c.acceptance[0].checks[0].evidenceIds.push("failed"); c.completion.evidenceReview.runIds.push("failed");
  assert.equal(evaluate(status, context).checks[0].status, "CONFLICT");
  const rerun = structuredClone(c.verificationRuns[1]);
  rerun.id = "rerun"; rerun.startedAt = "2026-09-15T00:02:10Z"; rerun.finishedAt = "2026-09-15T00:02:20Z";
  rerun.supersedesRunIds = ["failed"]; rerun.reason = "Fixture corrected and original assertion rerun";
  c.verificationRuns.push(rerun); c.acceptance[0].checks[0].evidenceIds.push("rerun"); c.completion.evidenceReview.runIds.push("rerun");
  c.testSelections[0].runIds.push("rerun");
  assert.equal(evaluate(status, context).readiness, "ready");
  rerun.observations[0].caseKey = "unrelated";
  assert.notEqual(evaluate(status, context).readiness, "ready");
});

test("analysis completion is not approval of reviewed code", () => {
  const { status, context } = fixture();
  const c = status.deliveryControl;
  configureInitialReview(status);
  c.completion.claim = "analysis_complete";
  c.findingDisposition.push(finding());
  reseal(status);
  const result = evaluate(status, context);
  assert.equal(result.subject, "analysis"); assert.equal(result.readiness, "ready");
  assert.equal(result.reviewVerdict, "changes_required");
  c.completion.claim = "accepted";
  assert.equal(evaluate(status, context).readiness, "blocked");
});

test("code-review optimization must switch to implementation controls", () => {
  const review = fixture();
  const c = review.status.deliveryControl;
  review.status.workflow = "code-review-delivery"; c.taskMode = "review";
  c.completion.implementation = "not_applicable";
  c.acceptance.forEach((item) => { item.kind = "analysis"; });
  c.fixes = [];
  review.status.stages.push({ name: "Optimize", owner: "engineer", status: "in_progress", gates: [], artifacts: [], evidence: [] });
  assert.ok(validate(review.status).some((item) => item.at === "stages.Optimize"));

  const implementation = fixture();
  implementation.status.workflow = "code-review-delivery";
  implementation.status.stages.push({ name: "Optimize", owner: "engineer", status: "in_progress", gates: [], artifacts: [], evidence: [] });
  implementation.status.deliveryControl.fixes = [];
  reseal(implementation.status);
  assert.ok(evaluate(implementation.status, implementation.context).diagnostics.some((item) => item.code === "FIX_REQUIRED"));
});

test("new features and confirmed no-preserve exceptions do not need invented failures", () => {
  const { status, context } = fixture();
  status.workflow = "requirement-end-to-end"; status.deliveryControl.fixes = [];
  reseal(status); assert.equal(evaluate(status, context).readiness, "ready");
  const repair = fixture();
  repair.status.deliveryControl.fixes[0].preservedAcceptanceIds = [];
  repair.status.deliveryControl.fixes[0].preserveNotApplicableReason = "No existing behavior changes";
  reseal(repair.status); assert.equal(evaluate(repair.status, repair.context).readiness, "ready");
});

test("a historical revision fix cannot satisfy the active bugfix gate", () => {
  const { status, context } = fixture();
  const c = status.deliveryControl;
  c.contracts.push({ ...structuredClone(c.contracts[0]), id: "C0" });
  const historical = structuredClone(c.acceptance[0]);
  historical.id = "old-target"; historical.contractRevision = "C0";
  historical.checks[0].id = "old-target-check";
  c.acceptance.push(historical);
  c.fixes[0].targetAcceptanceIds = ["old-target"];
  reseal(status);
  const result = evaluate(status, context);
  assert.equal(result.readiness, "blocked");
  assert.ok(result.diagnostics.some((item) => item.code === "FIX_REQUIRED"));
});

test("every required active target needs its own fix mapping", () => {
  const { status, context } = fixture();
  const c = status.deliveryControl;
  const second = structuredClone(c.acceptance[0]);
  second.id = "target-two";
  second.checks[0].id = "target-two-check";
  c.acceptance.push(second);
  c.verificationRuns[1].observations.push({
    checkId: "target-two-check", caseKey: "target", outcome: "pass", outputRef: "evidence/run.txt",
  });
  c.impactScopes[0].acceptanceIds.push("target-two");
  c.impactScopes[0].checkIds.push("target-two-check");
  c.testSelections[0].selectedCheckIds.push("target-two-check");
  c.invocations[1].selectedCheckIds.push("target-two-check");
  reseal(status);
  const result = evaluate(status, context);
  assert.equal(result.readiness, "blocked");
  assert.ok(result.diagnostics.some((item) => item.code === "FIX_REQUIRED" && item.at === "target-two"));
});

test("implementation cannot be accepted using analysis-only acceptance", () => {
  const { status, context } = fixture();
  const c = status.deliveryControl;
  status.workflow = "requirement-end-to-end";
  c.acceptance.forEach((item) => { item.kind = "analysis"; });
  c.fixes = [];
  reseal(status);
  assert.ok(validate(status).some((item) => item.code === "ACCEPTANCE_MODE_MISMATCH"));
  assert.equal(evaluate(status, context).readiness, "blocked");
});

test("schema and evaluator use the same safe path domain as the CLI", () => {
  for (const invalid of ["./src/example.js", "src//example.js", "C:secret", ".env", ".git/config", "state/secrets.json", "src/\u0001file"]) {
    const { status, context } = fixture();
    status.deliveryControl.snapshots[0].files[0].path = invalid;
    assert.ok(validateShape(status).length, invalid);
    assert.equal(evaluate(status, context).readiness, "blocked", invalid);
  }
});

test("v2 and legacy schemas cannot silently fall back to each other", () => {
  assert.equal(evaluate({ workflow: "legacy" }).readiness, "legacy_unverified");
  for (const status of [{ schemaVersion: "3.0" }, { deliveryControl: {} }, null, [], { schemaVersion: "2.0" }]) {
    assert.equal(evaluate(status).readiness, "blocked");
  }
  const { status } = fixture();
  assert.deepEqual(validateShape(status), []);
  status.deliveryControl.verificationRuns[0].execution.exitCode = "1";
  assert.ok(validateShape(status).length);
  assert.ok(validate(status).length);
});

test("contract digest excludes mutable evidence links but includes behavior", () => {
  const { status } = fixture();
  const c = status.deliveryControl, before = contractDigest(c);
  c.acceptance[0].checks[0].evidenceIds.push("another-run");
  assert.equal(contractDigest(c), before);
  c.acceptance[0].checks[0].caseKey = "changed";
  assert.notEqual(contractDigest(c), before);
});

test("confirmed contract replacement keeps old evidence historical", () => {
  const { status, context } = fixture();
  const c = status.deliveryControl;
  c.contracts.push({ ...structuredClone(c.contracts[0]), id: "C2", supersedes: "C1", changeReason: "Approved expectation change" });
  c.activeContractRevision = "C2";
  for (const a of c.acceptance) a.contractRevision = "C2";
  assert.notEqual(evaluate(status, context).readiness, "ready");
  for (const run of c.verificationRuns) run.contractRevision = "C2";
  for (const scope of c.impactScopes) scope.contractRevision = "C2";
  for (const invocation of c.invocations) invocation.contractRevision = "C2";
  reseal(status);
  assert.equal(evaluate(status, context).readiness, "ready");
});

test("verify and deliver invocations reject actions outside their authority", async (t) => {
  const cases = {
    "verify modifies source": (c) => c.invocations[1].allowedActions.push("modify_source"),
    "verify modifies tests": (c) => c.invocations[1].allowedActions.push("modify_tests"),
    "deliver runs verification": (c) => c.invocations[2].allowedActions.push("run_verification"),
    "deliver publishes": (c) => c.invocations[2].allowedActions.push("publish"),
    "resume expands task authorization": (c) => {
      c.invocations[1].operation = "resume";
      c.invocations[1].allowedActions.push("publish");
    },
    "invocation history skips a run": (c) => {
      c.invocations[2].previousInvocationId = "invoke-start";
    },
    "current invocation is not latest": (c) => { c.currentInvocationId = "invoke-verify"; },
  };
  for (const [name, mutate] of Object.entries(cases)) await t.test(name, () => {
    const { status } = fixture();
    mutate(status.deliveryControl);
    assert.ok(validate(status).length);
  });
});

test("terminal delivery must bind the active contract and current snapshot", () => {
  const { status } = fixture();
  const c = status.deliveryControl;
  c.completion.claim = "accepted";
  c.invocations.at(-1).snapshotId = null;
  assert.ok(validate(status).some((item) => item.code === "DELIVERY_BINDING_REQUIRED"));
});

test("resume requires traceable prior execution and known stage references", async (t) => {
  const { status } = fixture();
  const c = status.deliveryControl;
  c.invocations.splice(-1, 0, {
    id: "invoke-resume", operation: "resume", authorizationRef: "user resume request",
    contractRevision: "C1", snapshotId: "S1", selectedCheckIds: [], selectedFindingIds: [],
    allowedActions: ["read", "run_verification"], necessaryStages: ["QA"],
    reason: "Continue from the first necessary stage",
  });
  assert.ok(validate(status).some((item) => item.code === "PREVIOUS_INVOCATION_REQUIRED"));
  c.invocations.at(-2).previousInvocationId = "invoke-verify";
  c.invocations.at(-2).necessaryStages = ["Unknown Stage"];
  assert.ok(validate(status).some((item) => item.code === "UNKNOWN_STAGE"));
});

test("placeholder task identity cannot reach ready", () => {
  const { status, context } = fixture();
  status.deliveryControl.taskId = "replace-with-stable-task-id";
  assert.equal(evaluate(status, context).readiness, "blocked");
});

test("required checks must be mapped by the current behavior impact scope", () => {
  const { status, context } = fixture();
  status.deliveryControl.impactScopes[0].checkIds = ["target-check"];
  status.deliveryControl.testSelections[0].selectedCheckIds = ["target-check"];
  status.deliveryControl.verificationRuns[1].observations =
    status.deliveryControl.verificationRuns[1].observations.filter((item) =>
      item.checkId === "target-check");
  reseal(status);
  const result = evaluate(status, context);
  assert.equal(result.readiness, "review");
  assert.ok(result.diagnostics.some((item) =>
    item.code === "CHECK_NOT_IN_IMPACT_SCOPE" && item.at === "preserve-check"));
});

test("behavior impact scope cannot stay bound to an old source snapshot", () => {
  const { status, context } = fixture();
  const c = status.deliveryControl;
  const old = structuredClone(c.snapshots[0]);
  old.id = "S0";
  old.files[0].hash = hash("old code");
  old.codeDigest = snapshotDigest(old.files);
  c.snapshots.unshift(old);
  c.impactScopes[0].snapshotId = "S0";
  reseal(status);
  const result = evaluate(status, context);
  assert.equal(result.readiness, "review");
  assert.ok(result.diagnostics.some((item) => item.code === "IMPACT_SCOPE_STALE"));
});

test("environment probes bind readiness, evidence and runtime phases", async (t) => {
  await t.test("required build identity mismatch blocks the check", () => {
    const { status, context } = fixture();
    status.deliveryControl.environmentProbes[0].requirements
      .find((item) => item.dimension === "build").status = "mismatch";
    reseal(status);
    assert.equal(evaluate(status, context).checks[0].status, "BLOCKED");
  });
  await t.test("runtime verification needs before and after probes", () => {
    const { status, context } = fixture();
    const c = status.deliveryControl;
    for (const item of c.acceptance) {
      item.checks[0].method = "browser";
      item.checks[0].minimumLevel = "V3";
    }
    c.verificationRuns[1].method = "browser";
    c.verificationRuns[1].level = "V3";
    reseal(status);
    assert.equal(evaluate(status, context).checks[0].status, "BLOCKED");
  });
  await t.test("resource conflicts block evidence reuse", () => {
    const { status, context } = fixture();
    const probe = status.deliveryControl.environmentProbes[0];
    probe.resources.push({
      resource: "worktree-build", mode: "exclusive", status: "conflict",
      owner: "another-run", evidenceRef: "evidence/environment.json",
    });
    reseal(status);
    assert.equal(evaluate(status, context).checks[0].status, "BLOCKED");
  });
  await t.test("required exclusive resources must be held by this run or task", () => {
    const { status, context } = fixture();
    const c = status.deliveryControl;
    for (const item of c.acceptance) item.checks[0].requiredEnvironmentDimensions.push("resource");
    c.environmentProbes[0].requirements.push({
      dimension: "resource", status: "ready", expectedRef: "exclusive worktree lock",
      observedRef: "lock is visible", owner: "task-example", invalidatedBy: ["lock owner changes"],
    });
    reseal(status);
    assert.equal(evaluate(status, context).checks[0].status, "BLOCKED");
    c.environmentProbes[0].resources.push({
      resource: "worktree-build", mode: "exclusive", status: "available",
      owner: "task-example", evidenceRef: "evidence/environment.json",
    });
    reseal(status);
    assert.equal(evaluate(status, context).checks[0].status, "BLOCKED");
    c.environmentProbes[0].resources[0].status = "held_by_run";
    c.environmentProbes[0].resources[0].owner = "another-run";
    reseal(status);
    assert.equal(evaluate(status, context).checks[0].status, "BLOCKED");
    c.environmentProbes[0].resources[0].owner = "task-example";
    reseal(status);
    assert.equal(evaluate(status, context).readiness, "ready");
  });
  await t.test("instance and proxy checks require a project-declared adapter", () => {
    const { status, context } = fixture();
    const c = status.deliveryControl;
    for (const item of c.acceptance) item.checks[0].requiredEnvironmentDimensions.push("instance");
    c.environmentProbes[0].requirements.push({
      dimension: "instance", status: "ready", expectedRef: "target app/worktree",
      observedRef: "matching instance", owner: "task-example", invalidatedBy: ["instance restarts"],
    });
    c.environmentProbes[0].adapterKind = "manual";
    reseal(status);
    assert.equal(evaluate(status, context).checks[0].status, "BLOCKED");
  });
  await t.test("before and after probes cannot describe different builds", () => {
    const { status, context } = fixture();
    const c = status.deliveryControl;
    for (const item of c.acceptance) {
      item.checks[0].method = "browser";
      item.checks[0].minimumLevel = "V3";
    }
    c.verificationRuns[1].method = "browser";
    c.verificationRuns[1].level = "V3";
    const after = structuredClone(c.environmentProbes[0]);
    after.id = "env-after";
    after.phase = "after";
    after.capturedAt = "2026-09-15T00:03:00Z";
    after.evidence = {
      path: "evidence/environment-after.json",
      hash: hash("after environment"),
    };
    after.requirements.find((item) => item.dimension === "build").observedRef = "different build";
    c.environmentProbes.push(after);
    c.verificationRuns[1].environmentProbeIds.push("env-after");
    context.outputHashes["evidence/environment-after.json"] = hash("after environment");
    reseal(status);
    assert.equal(evaluate(status, context).checks[0].status, "BLOCKED");
  });
  await t.test("a rewritten probe cannot reuse the original run binding", () => {
    const { status, context } = fixture();
    const probe = status.deliveryControl.environmentProbes[0];
    probe.requirements.find((item) => item.dimension === "build").observedRef = "rewritten build";
    probe.fingerprint = environmentProbeFingerprint(probe);
    assert.ok(validate(status).some((item) => item.code === "ENVIRONMENT_DIGEST_MISMATCH"));
    assert.equal(evaluate(status, context).readiness, "blocked");
  });
});

test("incremental review coverage is an exact requested-scope partition", () => {
  const { status } = fixture();
  configureInitialReview(status);
  const c = status.deliveryControl;
  c.reviewRuns[0].gapScopes = [{
    scopeId: "scope-main", reason: "Runtime evidence unavailable",
    nextAction: "Run the consumer integration check",
  }];
  assert.ok(validate(status).some((item) => item.code === "REVIEW_SCOPE_PARTITION_INVALID"));
  c.reviewRuns[0].reviewedScopeIds = [];
  assert.ok(validate(status).some((item) => item.code === "REVIEW_CONCLUSION_EXCEEDS_SCOPE"));
  c.reviewRuns[0].conclusionScope = "reviewed_only";
  assert.deepEqual(validate(status), []);
});

test("an explicit review gap delivers a partial report, not whole-scope approval", () => {
  const { status, context } = fixture();
  configureInitialReview(status);
  const c = status.deliveryControl;
  c.completion.claim = "analysis_complete";
  c.reviewRuns[0].reviewedScopeIds = [];
  c.reviewRuns[0].gapScopes = [{
    scopeId: "scope-main", reason: "Consumer runtime is unavailable",
    nextAction: "Run the consumer integration check",
  }];
  c.reviewRuns[0].conclusionScope = "reviewed_only";
  reseal(status);
  const result = evaluate(status, context);
  assert.equal(result.readiness, "ready");
  assert.equal(result.reviewVerdict, "partial");
  assert.ok(result.diagnostics.some((item) => item.code === "REVIEW_SCOPE_GAPS"));
});

test("the current review cannot retain an obsolete impact scope digest", () => {
  const { status } = fixture();
  configureInitialReview(status);
  status.deliveryControl.impactScopes[0].behavior = "Changed consumer behavior";
  assert.ok(validate(status).some((item) =>
    item.code === "CURRENT_REVIEW_SCOPE_DIGEST_MISMATCH"));
});

test("a merge candidate must declare behavior guard checks", () => {
  const { status } = fixture();
  configureInitialReview(status);
  status.deliveryControl.reviewRuns[0].mergeState = "candidate";
  assert.ok(validate(status).some((item) => item.code === "MERGE_GUARD_REQUIRED"));
  status.deliveryControl.impactScopes[0].mergeGuardCheckIds = ["target-check"];
  status.deliveryControl.reviewRuns[0].impactScopeDigest =
    impactScopeDigest(status.deliveryControl);
  assert.deepEqual(validate(status), []);
});

test("delta and recheck reviews require history and complete finding disposition", async (t) => {
  await t.test("delta needs previous review and target snapshot", () => {
    const { status } = fixture();
    configureInitialReview(status);
    const c = status.deliveryControl;
    c.invocations[0].reviewMode = "delta";
    c.reviewRuns[0].mode = "delta";
    assert.ok(validate(status).some((item) => item.code === "REVIEW_HISTORY_REQUIRED"));
  });
  await t.test("recheck covers every selected finding with current status", () => {
    const { status } = fixture();
    configureInitialReview(status);
    const c = status.deliveryControl;
    c.findingDisposition.push(finding({
      id: "F1",
      decisionRef: "code-review.md#F1",
      currentAssessmentRef: "code-review.md#F1",
    }));
    c.invocations[0].reviewMode = "recheck";
    c.invocations[0].selectedFindingIds = ["F1"];
    c.reviewRuns[0].mode = "recheck";
    c.reviewRuns[0].previousReviewId = "review-previous";
    c.reviewRuns[0].previousTargetSnapshotId = "S1";
    c.reviewRuns[0].selectedFindingIds = ["F1"];
    assert.ok(validate(status).some((item) =>
      ["UNKNOWN_REFERENCE", "RECHECK_FINDING_COVERAGE_REQUIRED"].includes(item.code)));
  });
});

test("delta review can inherit only an explicitly justified previous scope", () => {
  const { status, context } = fixture();
  configureInitialReview(status);
  const c = status.deliveryControl;
  const current = structuredClone(c.snapshots[0]);
  current.id = "S2";
  c.snapshots.push(current);
  c.impactScopes[0].snapshotId = "S2";
  c.invocations.splice(-1, 0, {
    id: "invoke-delta", operation: "review", reviewMode: "delta",
    authorizationRef: "user requested delta review", contractRevision: "C1", snapshotId: "S2",
    selectedCheckIds: [], selectedFindingIds: [],
    allowedActions: ["read", "run_assessment", "append_evidence", "write_summary"],
    necessaryStages: ["Implementation"], reason: "Review only the changed behavior and affected consumers",
    previousInvocationId: "invoke-review",
  });
  c.invocations.at(-1).snapshotId = "S2";
  c.invocations.at(-1).previousInvocationId = "invoke-delta";
  c.reviewRuns.push({
    id: "review-delta", invocationId: "invoke-delta", mode: "delta",
    reviewBaseRef: "base-sha", previousReviewId: "review-initial",
    previousTargetSnapshotId: "S1", currentTargetSnapshotId: "S2",
    impactScopeDigest: impactScopeDigest(c),
    requestedScopeIds: ["scope-main"], reviewedScopeIds: [],
    inheritedScopes: [{
      scopeId: "scope-main", fromReviewId: "review-initial",
      basisRef: "No dependency, contract, or environment requirement changed",
    }],
    gapScopes: [], selectedFindingIds: [], findingResults: [],
    mergeState: "not_applicable", mergedSnapshotId: null, conclusionScope: "requested",
  });
  reseal(status);
  assert.deepEqual(validate(status), []);
  assert.equal(evaluate(status, context).readiness, "ready");
  const unrelated = structuredClone(c.snapshots[0]);
  unrelated.id = "S0";
  c.snapshots.unshift(unrelated);
  c.reviewRuns.at(-1).previousTargetSnapshotId = "S0";
  assert.ok(validate(status).some((item) => item.code === "REVIEW_HISTORY_SNAPSHOT_MISMATCH"));
});

test("delta review cannot inherit a scope that was a previous gap", () => {
  const { status } = fixture();
  configureInitialReview(status);
  const c = status.deliveryControl;
  c.reviewRuns[0].reviewedScopeIds = [];
  c.reviewRuns[0].gapScopes = [{
    scopeId: "scope-main", reason: "Consumer unavailable",
    nextAction: "Run consumer verification",
  }];
  c.reviewRuns[0].conclusionScope = "reviewed_only";
  const current = structuredClone(c.snapshots[0]);
  current.id = "S2";
  c.snapshots.push(current);
  c.impactScopes[0].snapshotId = "S2";
  c.invocations.splice(-1, 0, {
    id: "invoke-delta", operation: "review", reviewMode: "delta",
    authorizationRef: "user requested delta review", contractRevision: "C1", snapshotId: "S2",
    selectedCheckIds: [], selectedFindingIds: [],
    allowedActions: ["read", "run_assessment", "write_summary"],
    necessaryStages: ["Implementation"], reason: "Attempt to inherit the previous result",
    previousInvocationId: "invoke-review",
  });
  c.invocations.at(-1).snapshotId = "S2";
  c.invocations.at(-1).previousInvocationId = "invoke-delta";
  c.reviewRuns.push({
    id: "review-delta", invocationId: "invoke-delta", mode: "delta",
    reviewBaseRef: "base-sha", previousReviewId: "review-initial",
    previousTargetSnapshotId: "S1", currentTargetSnapshotId: "S2",
    impactScopeDigest: impactScopeDigest(c),
    requestedScopeIds: ["scope-main"], reviewedScopeIds: [],
    inheritedScopes: [{
      scopeId: "scope-main", fromReviewId: "review-initial",
      basisRef: "Incorrectly assumes the previous gap was reviewed",
    }],
    gapScopes: [], selectedFindingIds: [], findingResults: [],
    mergeState: "not_applicable", mergedSnapshotId: null, conclusionScope: "requested",
  });
  assert.ok(validate(status).some((item) =>
    item.code === "INHERITED_SCOPE_NOT_PREVIOUSLY_REVIEWED"));
});

test("impact scope digest treats semantic sets as order independent", () => {
  const { status, context } = fixture();
  const c = status.deliveryControl;
  c.impactScopes[0].entryPoints.push("src/á-entry.js");
  c.impactScopes[0].exclusions.push({
    subject: "ä-entry", reason: "Equivalent adapter", evidenceRef: "review.md#equivalent",
  });
  c.impactScopes[0].exclusions.push({
    subject: "z-entry", reason: "Out of contract", evidenceRef: "review.md#excluded",
  });
  reseal(status);
  const before = impactScopeDigest(c);
  c.impactScopes[0].acceptanceIds.reverse();
  c.impactScopes[0].checkIds.reverse();
  c.impactScopes[0].entryPoints.reverse();
  c.impactScopes[0].exclusions.reverse();
  const originalLocaleCompare = String.prototype.localeCompare;
  String.prototype.localeCompare = () => {
    throw new Error("locale-dependent comparison used");
  };
  try {
    assert.equal(impactScopeDigest(c), before);
  } finally {
    String.prototype.localeCompare = originalLocaleCompare;
  }
  assert.equal(evaluate(status, context).readiness, "ready");
});

test("v2.0 delivery controls remain compatible without enhanced governance fields", () => {
  const { status, context } = fixture();
  status.schemaVersion = "2.0";
  for (const field of [
    "testSelections",
    "catalogHealth",
    "knownFailures",
    "verificationPacks",
    "recordPolicy",
  ]) {
    delete status.deliveryControl[field];
  }
  assert.deepEqual(validate(status), []);
  assert.equal(evaluate(status, context).readiness, "ready");
});

test("v2.1 requires every enhanced governance field", async (t) => {
  for (const field of [
    "testSelections",
    "catalogHealth",
    "knownFailures",
    "verificationPacks",
    "recordPolicy",
  ]) {
    await t.test(field, () => {
      const { status } = fixture();
      delete status.deliveryControl[field];
      assert.ok(validate(status).some((item) =>
        item.code === "V21_FIELD_REQUIRED" &&
        item.at === `deliveryControl.${field}`));
    });
  }
});

test("test selection, catalog health, and execution remain independent gates", async (t) => {
  const cases = {
    "partial selection": {
      mutate: (c) => {
        c.testSelections[0].completeness = "partial";
        c.testSelections[0].unmappedPaths = ["src/unmapped.js"];
      },
      code: "TEST_SELECTION_INCOMPLETE",
    },
    "working-tree scope": {
      mutate: (c) => { c.testSelections[0].scopeSource = "working_tree"; },
      code: "TEST_SELECTION_NOT_TASK_SCOPED",
    },
    "degraded catalog": {
      mutate: (c) => {
        c.catalogHealth[0].status = "degraded";
        c.catalogHealth[0].diagnostics.push({
          code: "UNREGISTERED_TEST",
          relevance: "unrelated",
          owner: "test-catalog-owner",
          evidenceRef: "evidence/catalog-health.json",
        });
      },
      code: "CATALOG_HEALTH_NOT_READY",
    },
    "unknown catalog relevance": {
      mutate: (c) => {
        c.catalogHealth[0].status = "degraded";
        c.catalogHealth[0].diagnostics.push({
          code: "UNMAPPED_PATH",
          relevance: "unknown",
          owner: "test-catalog-owner",
          evidenceRef: "evidence/catalog-health.json",
        });
      },
      code: "CATALOG_RELEVANCE_UNRESOLVED",
    },
  };
  for (const [name, item] of Object.entries(cases)) {
    await t.test(name, () => {
      const { status, context } = fixture();
      item.mutate(status.deliveryControl);
      const result = evaluate(status, context);
      assert.equal(result.readiness, "review");
      assert.ok(result.diagnostics.some((diagnostic) =>
        diagnostic.code === item.code));
    });
  }
});

test("every v2.1 verification run has one unambiguous selection record", () => {
  const { status } = fixture();
  status.deliveryControl.testSelections[0].runIds = ["green"];
  assert.ok(validate(status).some((item) =>
    item.code === "RUN_SELECTION_REQUIRED" && item.at === "red"));

  const duplicate = structuredClone(status.deliveryControl.testSelections[0]);
  duplicate.id = "selection-duplicate";
  duplicate.runIds = ["green"];
  status.deliveryControl.testSelections.push(duplicate);
  assert.ok(validate(status).some((item) =>
    item.code === "RUN_SELECTION_AMBIGUOUS" && item.detail === "green"));
});

test("test selections bind invoked checks to actual run observations", async (t) => {
  await t.test("run observations must be selected", () => {
    const { status } = fixture();
    status.deliveryControl.testSelections[0].selectedCheckIds = ["preserve-check"];
    assert.ok(validate(status).some((item) =>
      item.code === "SELECTION_RUN_CHECK_MISMATCH" &&
      item.detail === "target-check"));
  });

  await t.test("selected checks must be authorized by the invocation", () => {
    const { status } = fixture();
    status.deliveryControl.invocations[1].selectedCheckIds = ["preserve-check"];
    assert.ok(validate(status).some((item) =>
      item.code === "SELECTION_INVOCATION_CHECK_MISMATCH" &&
      item.detail === "target-check"));
  });

  await t.test("an invocation owning runs must allow verification", () => {
    const { status } = fixture();
    status.deliveryControl.testSelections[0].invocationId = "invoke-deliver";
    assert.ok(validate(status).some((item) =>
      item.code === "SELECTION_INVOCATION_ACTION_REQUIRED"));
  });
});

test("known failure metadata reuses diagnosis without suppressing current outcomes", () => {
  const { status, context } = fixture();
  const c = status.deliveryControl;
  c.knownFailures.push({
    id: "known-environment-failure",
    layer: "environment",
    signature: "node-local:fixture-service-unavailable",
    status: "active",
    owner: "qa",
    environmentKey: "node-local",
    affectedCheckIds: ["target-check"],
    baselineRunId: "red",
    firstEvidenceRef: "evidence/run.txt",
    latestEvidenceRef: "evidence/run.txt",
    invalidatedBy: ["environment fingerprint changes"],
    expiresAt: null,
  });
  assert.deepEqual(validate(status), []);
  assert.equal(evaluate(status, context).readiness, "ready");

  c.verificationRuns[1].failureKind = "assertion";
  c.verificationRuns[1].execution.exitCode = 1;
  c.verificationRuns[1].observations[0].outcome = "fail";
  assert.equal(evaluate(status, context).readiness, "blocked");
});

test("risk-triggered verification packs reference required scoped checks", () => {
  const { status, context } = fixture();
  const c = status.deliveryControl;
  c.verificationPacks.push({
    id: "pack-async",
    kind: "async_ownership",
    version: "1.0.0",
    decision: "selected",
    triggerRef: "technical-design.md#async-risk",
    rationale: "The change crosses an await ownership boundary",
    checkIds: ["target-check", "preserve-check"],
  });
  assert.deepEqual(validate(status), []);
  assert.equal(evaluate(status, context).readiness, "ready");

  c.acceptance[1].required = false;
  reseal(status);
  assert.ok(validate(status).some((item) =>
    item.code === "VERIFICATION_PACK_CHECK_NOT_REQUIRED"));
});

test("v2.1 findings separate evidence, attribution, confidence, and fixed state", () => {
  const { status } = fixture();
  configureInitialReview(status);
  const c = status.deliveryControl;
  c.findingDisposition.push(finding());
  c.invocations[0].selectedFindingIds = ["issue"];
  c.reviewRuns[0].selectedFindingIds = ["issue"];
  c.reviewRuns[0].findingResults = [{
    findingId: "issue",
    status: "still_open",
    evidenceRef: "review.md#issue",
    contractRef: "decision-log.md#approved",
    evidenceStatus: "confirmed",
    attribution: "introduced",
    confidence: "high",
    fixedState: "not_fixed",
    counterEvidenceRefs: ["code-review.md#guard-check"],
  }];
  assert.deepEqual(validate(status), []);

  delete c.reviewRuns[0].findingResults[0].attribution;
  assert.ok(validate(status).some((item) =>
    item.code === "FINDING_ASSESSMENT_REQUIRED"));
});

test("finding retraction requires explicit counterevidence", () => {
  const { status } = fixture();
  status.deliveryControl.findingDisposition.push(finding({
    status: "retracted",
    evidenceStatus: "disputed",
    fixedState: "not_applicable",
    counterEvidenceRefs: [],
  }));
  assert.ok(validate(status).some((item) =>
    item.code === "FINDING_RETRACTION_EVIDENCE_REQUIRED"));
});

test("record policy matches execution profile and keeps one authoritative record", () => {
  const { status } = fixture();
  status.deliveryControl.recordPolicy.profile = "minimal";
  assert.ok(validate(status).some((item) =>
    item.code === "RECORD_PROFILE_MISMATCH"));

  status.deliveryControl.recordPolicy.profile = "standard";
  status.deliveryControl.recordPolicy.derivedArtifacts.push("workflow-status.json");
  assert.ok(validate(status).some((item) =>
    item.code === "ARTIFACT_POLICY_OVERLAP"));

  status.deliveryControl.recordPolicy.derivedArtifacts = ["delivery-summary.md"];
  status.deliveryControl.recordPolicy.authoritativeRecord = "delivery-summary.md";
  assert.ok(validate(status).some((item) =>
    item.code === "AUTHORITATIVE_RECORD_INVALID"));
});

test("terminal derived summaries bind the current authoritative record", () => {
  const { status, context } = fixture();
  status.deliveryControl.completion.claim = "accepted";
  assert.equal(evaluate(status, context).readiness, "blocked");
  reseal(status);
  assert.equal(evaluate(status, context).readiness, "ready");
  status.deliveryControl.knownFailures.push({
    id: "new-known-failure",
    layer: "tool",
    signature: "new-diagnostic-after-summary",
    status: "unknown",
    owner: "qa",
    environmentKey: "node-local",
    affectedCheckIds: [],
    baselineRunId: null,
    firstEvidenceRef: "evidence/new-diagnostic.txt",
    latestEvidenceRef: "evidence/new-diagnostic.txt",
    invalidatedBy: ["tool version changes"],
    expiresAt: null,
  });
  const result = evaluate(status, context);
  assert.equal(result.readiness, "blocked");
  assert.ok(result.diagnostics.some((item) =>
    item.code === "DERIVED_SUMMARY_STALE"));
});
