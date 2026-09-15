"use strict";

const { createHash } = require("node:crypto");
const {
  contractDigest,
  environmentProbeFingerprint,
  environmentSelectionDigest,
  impactScopeDigest,
  snapshotDigest,
  kindDigest,
  recordSourceDigest,
} = require("../scripts/delivery-controls");
const hash = (text) => createHash("sha256").update(text).digest("hex");
const source = "module.exports = 1;\n";
const output = "original and preserved behavior passed\n";
const environmentOutput = "{\"project\":\"example\",\"build\":\"current\",\"tool\":\"node\"}\n";

function fixture() {
  const base = structuredClone(require("../assets/templates/workflow-status.json"));
  const reference = { kind: "user", ref: "decision-log.md#approved" };
  const acceptance = ["target", "preserve"].map((kind) => ({
    id: kind, contractRevision: "C1", kind, expected: `${kind} behavior`, basisRefs: [reference], required: true,
    checks: [{
      id: `${kind}-check`, caseKey: kind, method: "unit", minimumLevel: "V2",
      environmentKey: "node-local",
      requiredEnvironmentDimensions: ["project", "build", "tool"],
      evidenceIds: ["green"],
    }],
  }));
  const files = [{ path: "src/example.js", kind: "source", hash: hash(source) }];
  const snapshot = { id: "S1", headSha: null, baseSha: null, files, codeDigest: snapshotDigest(files) };
  const c = {
    taskId: "task-example", taskMode: "implementation", activeContractRevision: "C1",
    authorizedActions: [
      "read", "modify_source", "modify_tests", "modify_fixture",
      "run_verification", "run_assessment", "append_evidence",
      "write_summary", "start_service", "stop_owned_service",
    ],
    currentInvocationId: "invoke-deliver", currentImpactScopeIds: ["scope-main"],
    contracts: [{ id: "C1", status: "confirmed", sourceRefs: [reference], decisionRef: reference.ref,
      appliesTo: "example API", goal: "preserve recovery", nonGoals: ["redesign"] }],
    acceptance,
    fixes: [{ id: "F1", targetAcceptanceIds: ["target"], preservedAcceptanceIds: ["preserve"],
      consumerAcceptanceIds: [], consumerNotApplicableReason: "No external consumer", decisionRef: reference.ref, baselineRunIds: ["red"] }],
    snapshots: [snapshot],
    invocations: [
      {
        id: "invoke-start", operation: "start", authorizationRef: "user request",
        contractRevision: "C1", snapshotId: "S1", selectedCheckIds: [], selectedFindingIds: [],
        allowedActions: ["read", "modify_source", "modify_tests", "run_verification", "append_evidence"],
        necessaryStages: ["Implementation"], reason: "Implement the authorized repair",
      },
      {
        id: "invoke-verify", operation: "verify", authorizationRef: "user request",
        contractRevision: "C1", snapshotId: "S1",
        selectedCheckIds: ["target-check", "preserve-check"], selectedFindingIds: [],
        allowedActions: ["read", "run_verification", "run_assessment", "append_evidence"],
        necessaryStages: ["QA"], reason: "Run the selected acceptance checks",
        previousInvocationId: "invoke-start",
      },
      {
        id: "invoke-deliver", operation: "deliver", authorizationRef: "user request",
        contractRevision: "C1", snapshotId: "S1", selectedCheckIds: [], selectedFindingIds: [],
        allowedActions: ["read", "run_assessment", "write_summary"],
        necessaryStages: ["Delivery"], reason: "Summarize existing valid results",
        previousInvocationId: "invoke-verify",
      },
    ],
    impactScopes: [{
      id: "scope-main", contractRevision: "C1", snapshotId: "S1",
      behavior: "Example API preserves target and recovery behavior",
      entryPoints: ["src/example.js#module.exports"], sharedDecisions: [], siblingEntries: [],
      consumers: [], consumerNotApplicableReason: "No external consumer",
      observableOutcomes: ["Target and preserve checks pass"],
      acceptanceIds: ["target", "preserve"], checkIds: ["target-check", "preserve-check"],
      mergeGuardCheckIds: [], exclusions: [],
    }],
    reviewRuns: [],
    environmentProbes: [{
      id: "env-before", phase: "before", environmentKey: "node-local",
      capturedAt: "2026-09-14T23:59:00Z", sourceRef: "project verification adapter",
      adapterKind: "project-declared", adapterRef: "AGENTS.md#verification",
      requirements: ["project", "build", "tool"].map((dimension) => ({
        dimension, status: "ready", expectedRef: `expected ${dimension}`,
        observedRef: `observed ${dimension}`, owner: "task-example",
        invalidatedBy: [`${dimension} changes`],
      })),
      resources: [],
      evidence: { path: "evidence/environment.json", hash: hash(environmentOutput) },
      fingerprint: hash("placeholder"),
    }],
    testSelections: [{
      id: "selection-unit", invocationId: "invoke-verify",
      impactScopeIds: ["scope-main"], scopeSource: "explicit_task",
      paths: ["src/example.js"], selectorKind: "project_declared",
      selectorRef: "package.json#test", catalogHealthId: "catalog-current",
      selectedCheckIds: ["target-check", "preserve-check"],
      selectedTestIds: ["unit:example"], unmappedPaths: [], exclusions: [],
      completeness: "complete", runIds: ["red", "green"],
      createdAt: "2026-09-15T00:00:00Z",
    }],
    catalogHealth: [{
      id: "catalog-current", selectorRef: "package.json#test",
      status: "healthy", checkedAt: "2026-09-15T00:00:00Z",
      catalogDigest: hash("catalog"), validatorDigest: hash("validator"),
      inventoryDigest: hash("inventory"), diagnostics: [],
      evidenceRef: "evidence/catalog-health.json",
    }],
    knownFailures: [],
    verificationPacks: [],
    recordPolicy: {
      profile: "standard", authoritativeRecord: "workflow-status.json",
      summaryMode: "derived", requiredArtifacts: ["workflow-status.json"],
      derivedArtifacts: ["delivery-summary.md"], omittedArtifacts: [],
      summarySourceDigest: null,
    },
    verificationRuns: [], findingDisposition: [],
    completion: { implementation: "complete", claim: "pending" },
  };
  c.environmentProbes[0].fingerprint = environmentProbeFingerprint(c.environmentProbes[0]);
  const status = { ...base, schemaVersion: "2.1", workflow: "bugfix-delivery",
    requirementFolder: "workspace/task", updatedAt: "2026-09-15", deliveryControl: c };
  const run = { id: "green", purpose: "postfix", contractRevision: "C1", contractDigest: contractDigest(c),
    impactScopeDigest: impactScopeDigest(c),
    snapshotId: "S1", source: "agent_run", method: "unit", level: "V2",
    startedAt: "2026-09-15T00:01:00Z", finishedAt: "2026-09-15T00:02:00Z",
    execution: { argv: ["node", "--test"], cwd: ".", exitCode: 0 },
    environmentKey: "node-local", environmentRef: "evidence/environment.md",
    environmentProbeIds: ["env-before"],
    environmentDigest: environmentSelectionDigest(c.environmentProbes),
    artifactDigest: null, fixtureDigest: null,
    runStatus: "completed", failureKind: "none",
    observations: acceptance.map((a) => ({ checkId: a.checks[0].id, caseKey: a.kind, outcome: "pass", outputRef: "evidence/run.txt" })),
    outputRefs: [{ path: "evidence/run.txt", hash: hash(output) }] };
  const red = structuredClone(run);
  Object.assign(red, { id: "red", purpose: "baseline", startedAt: "2026-09-15T00:00:00Z",
    finishedAt: "2026-09-15T00:00:30Z", failureKind: "assertion" });
  red.execution.exitCode = 1;
  red.observations = [{ checkId: "target-check", caseKey: "target", outcome: "fail", outputRef: "evidence/run.txt" }];
  c.verificationRuns = [red, run];
  c.completion.evidenceReview = { snapshotId: "S1", contractDigest: contractDigest(c), runIds: ["red", "green"],
    impactScopeDigest: impactScopeDigest(c),
    checkedAt: "2026-09-15T00:03:00Z", reviewer: "qa", environmentConfirmed: true, ref: "evidence/review.md" };
  c.recordPolicy.summarySourceDigest = recordSourceDigest(c);
  return {
    status,
    context: {
      snapshot,
      outputHashes: {
        "evidence/run.txt": hash(output),
        "evidence/environment.json": hash(environmentOutput),
      },
    },
  };
}

function finding(overrides = {}) {
  return {
    id: "issue",
    severity: "P1",
    status: "open",
    decisionRef: "review.md",
    acceptanceIds: [],
    evidenceStatus: "confirmed",
    attribution: "introduced",
    confidence: "high",
    fixedState: "not_fixed",
    currentAssessmentRef: "review.md#issue",
    counterEvidenceRefs: [],
    ...overrides,
  };
}

function reseal(status) {
  const c = status.deliveryControl;
  const d = contractDigest(c);
  const scope = impactScopeDigest(c);
  for (const probe of c.environmentProbes) {
    probe.fingerprint = environmentProbeFingerprint(probe);
  }
  for (const run of c.verificationRuns) {
    run.contractDigest = d;
    run.impactScopeDigest = scope;
    run.environmentDigest = environmentSelectionDigest(run.environmentProbeIds
      .map((id) => c.environmentProbes.find((probe) => probe.id === id))
      .filter(Boolean));
    const s = c.snapshots.find((item) => item.id === run.snapshotId);
    if (s) { s.codeDigest = snapshotDigest(s.files); run.artifactDigest = kindDigest(s.files, "artifact"); run.fixtureDigest = kindDigest(s.files, "fixture"); }
  }
  if (c.completion.evidenceReview) {
    c.completion.evidenceReview.contractDigest = d;
    c.completion.evidenceReview.impactScopeDigest = scope;
  }
  if (c.recordPolicy) {
    c.recordPolicy.summarySourceDigest = c.recordPolicy.derivedArtifacts.length > 0
      ? recordSourceDigest(c)
      : null;
  }
}

module.exports = {
  fixture,
  reseal,
  finding,
  hash,
  source,
  output,
  environmentOutput,
};
