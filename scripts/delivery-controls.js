"use strict";

const { createHash } = require("node:crypto");
const schema = require("../schemas/status.schema.json");
const { isSafeRelativePath } = require("./safe-files");
const { assuranceDefinition, coverageDigest, runBinding, layerOutcome,
  validateAssurance, assessAssurance } = require("./delivery-assurance");
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function digest(value) {
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

function snapshotDigest(files) {
  return digest([...files].sort((a, b) => compareText(a.path, b.path)));
}

function kindDigest(files, kind) {
  const selected = files.filter((file) => file.kind === kind);
  return selected.length ? snapshotDigest(selected) : null;
}

function contractDigest(control, revision = control.activeContractRevision) {
  return digest({
    contract: control.contracts.find((item) => item.id === revision),
    acceptance: control.acceptance.filter((item) => item.contractRevision === revision).map((item) => ({
      ...item,
      checks: item.checks.map(({ evidenceIds, ...definition }) => definition),
    })),
    fixes: control.fixes.map(({ baselineRunIds, ...definition }) => definition),
    ...(control.assurance ? { assurance: assuranceDefinition(control) } : {}),
  });
}

function impactScopeDigest(control) {
  const current = new Set(control.currentImpactScopeIds || []);
  return digest((control.impactScopes || [])
    .filter((scope) => current.has(scope.id))
    .map((scope) => {
      const { snapshotId, ...definition } = scope;
      return {
        ...definition,
        entryPoints: [...scope.entryPoints].sort(),
        sharedDecisions: [...scope.sharedDecisions].sort(),
        siblingEntries: [...scope.siblingEntries].sort(),
        consumers: [...scope.consumers].sort(),
        observableOutcomes: [...scope.observableOutcomes].sort(),
        acceptanceIds: [...scope.acceptanceIds].sort(),
        checkIds: [...scope.checkIds].sort(),
        mergeGuardCheckIds: [...scope.mergeGuardCheckIds].sort(),
        exclusions: [...scope.exclusions].sort((left, right) =>
          compareText(JSON.stringify(canonical(left)), JSON.stringify(canonical(right)))),
      };
    })
    .sort((left, right) => compareText(left.id, right.id)));
}

function environmentProbeFingerprint(probe) {
  const { fingerprint, ...definition } = probe;
  return digest(definition);
}

function environmentSelectionDigest(probes) {
  return digest(probes
    .map((probe) => ({ id: probe.id, fingerprint: probe.fingerprint }))
    .sort((left, right) => compareText(left.id, right.id)));
}

function recordSourceDigest(control) {
  const { summarySourceDigest, ...recordPolicy } = control.recordPolicy || {};
  return digest({
    ...control,
    recordPolicy,
  });
}

// Interpret only the keywords used by this repository's status schema.
// Schema additions must extend this walker and its parity tests together.
function validateShape(value, definition = schema, at = "$", errors = []) {
  const report = (detail) => errors.push({ code: "INVALID_SHAPE", at, detail });
  if (definition.$ref) {
    const target = definition.$ref.split("/").slice(1).reduce((node, key) => node?.[key], schema);
    if (!target) report("Unknown schema reference");
    else validateShape(value, target, at, errors);
  }
  if (definition.anyOf && !definition.anyOf.some((part) => validateShape(value, part, at, []).length === 0)) {
    report("No allowed shape matches");
    return errors;
  }
  if (own(definition, "const") && value !== definition.const) report("Invalid constant");
  if (definition.enum && !definition.enum.includes(value)) report("Invalid enum");
  const type = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
  if (definition.type) {
    const allowed = [].concat(definition.type);
    if (!allowed.includes(type) && !(allowed.includes("integer") && Number.isInteger(value))) {
      report("Invalid type");
      return errors;
    }
  }
  if (type === "string") {
    if (definition.minLength && value.length < definition.minLength) report("Empty string");
    if (definition.pattern && !new RegExp(definition.pattern).test(value)) report("Invalid string");
    if (definition.format === "safe-relative-file" && !isSafeRelativePath(value)) report("Unsafe path");
    if (definition.format === "safe-relative-dir" && !isSafeRelativePath(value, { allowDot: true, rejectSensitive: false })) report("Unsafe path");
  }
  if (type === "array") {
    if (definition.minItems && value.length < definition.minItems) report("Too few items");
    if (definition.uniqueItems && new Set(value.map((item) => JSON.stringify(canonical(item)))).size !== value.length) report("Duplicate items");
    if (definition.items) value.forEach((item, index) => validateShape(item, definition.items, `${at}[${index}]`, errors));
  }
  if (type === "object") {
    for (const key of definition.required || []) if (!own(value, key)) report(`Missing ${key}`);
    for (const [key, dependencies] of Object.entries(definition.dependentRequired || {})) {
      if (own(value, key)) for (const dependency of dependencies) if (!own(value, dependency)) report(`Missing ${dependency}`);
    }
    for (const [key, item] of Object.entries(value)) {
      if (own(definition.properties || {}, key)) validateShape(item, definition.properties[key], `${at}.${key}`, errors);
      else if (definition.additionalProperties === false) report(`Unknown field ${key}`);
    }
  }
  return errors;
}

function validateDeliveryControl(status) {
  const diagnostics = [];
  const error = (code, at, detail) => diagnostics.push({ code, at, detail });
  if (!status || typeof status !== "object" || Array.isArray(status)) return [{ code: "INVALID_STATUS", at: "$" }];
  if (!own(status, "schemaVersion")) {
    return own(status, "deliveryControl") ? [{ code: "VERSION_REQUIRED", at: "$" }] : [];
  }
  if (!["2.0", "2.1", "2.2"].includes(status.schemaVersion)) {
    return [{ code: "UNSUPPORTED_VERSION", at: "$.schemaVersion" }];
  }
  validateShape(status, schema, "$", diagnostics);
  if (diagnostics.length) return diagnostics;
  const c = status.deliveryControl;
  const enhancedControls = ["2.1", "2.2"].includes(status.schemaVersion);
  const enhancedFields = [
    "testSelections",
    "catalogHealth",
    "knownFailures",
    "verificationPacks",
    "recordPolicy",
  ];
  if (enhancedControls) {
    for (const field of enhancedFields) {
      if (!own(c, field)) error("V21_FIELD_REQUIRED", `deliveryControl.${field}`);
    }
  }
  if (diagnostics.length) return diagnostics;
  validateAssurance(status, error);
  if (diagnostics.length) return diagnostics;
  const index = (items, label) => {
    const map = new Map();
    for (const item of items) {
      if (map.has(item.id)) error("DUPLICATE_ID", label, item.id);
      map.set(item.id, item);
    }
    return map;
  };
  const contracts = index(c.contracts, "contracts");
  const acceptance = index(c.acceptance, "acceptance");
  const checks = index(c.acceptance.flatMap((a) => a.checks), "checks");
  const checkOwners = new Map(c.acceptance.flatMap((item) =>
    item.checks.map((check) => [check.id, item.id])));
  const runs = index(c.verificationRuns, "verificationRuns");
  const snapshots = index(c.snapshots, "snapshots");
  const invocations = index(c.invocations, "invocations");
  const impactScopes = index(c.impactScopes, "impactScopes");
  const reviewRuns = index(c.reviewRuns, "reviewRuns");
  const environmentProbes = index(c.environmentProbes, "environmentProbes");
  const testSelections = index(c.testSelections || [], "testSelections");
  const catalogHealth = index(c.catalogHealth || [], "catalogHealth");
  const knownFailures = index(c.knownFailures || [], "knownFailures");
  const verificationPacks = index(c.verificationPacks || [], "verificationPacks");
  index(c.fixes, "fixes");
  const findings = index(c.findingDisposition, "findingDisposition");
  const reference = (map, id, at) => { if (!map.has(id)) error("UNKNOWN_REFERENCE", at, id); };
  const sameMembers = (left, right) =>
    left.length === right.length && left.every((item) => right.includes(item));
  const graph = (map, edges, label) => {
    const done = new Set();
    const visiting = new Set();
    const visit = (id) => {
      if (visiting.has(id)) { error("REFERENCE_CYCLE", label, id); return; }
      if (done.has(id) || !map.has(id)) return;
      visiting.add(id);
      for (const next of edges(map.get(id))) { reference(map, next, label); visit(next); }
      visiting.delete(id);
      done.add(id);
    };
    for (const id of map.keys()) visit(id);
  };
  if (c.activeContractRevision !== null) reference(contracts, c.activeContractRevision, "activeContractRevision");
  if (c.currentInvocationId !== null) reference(invocations, c.currentInvocationId, "currentInvocationId");
  for (const id of c.currentImpactScopeIds) reference(impactScopes, id, "currentImpactScopeIds");
  graph(contracts, (item) => item.supersedes ? [item.supersedes] : [], "contracts");
  graph(invocations, (item) => item.previousInvocationId ? [item.previousInvocationId] : [], "invocations");
  graph(reviewRuns, (item) => item.previousReviewId ? [item.previousReviewId] : [], "reviewRuns");
  if (c.contracts.some((item) => item.status === "confirmed" && item.supersedes === c.activeContractRevision)) {
    error("ACTIVE_CONTRACT_SUPERSEDED", "activeContractRevision");
  }
  if (c.currentInvocationId !== null && c.invocations.at(-1)?.id !== c.currentInvocationId) {
    error("CURRENT_INVOCATION_NOT_LATEST", "currentInvocationId");
  }
  graph(runs, (item) => [...(item.supersedesRunIds || []), ...(item.invalidatesRunIds || [])], "runs");
  for (const a of c.acceptance) {
    reference(contracts, a.contractRevision, a.id);
    for (const check of a.checks) for (const id of check.evidenceIds) reference(runs, id, check.id);
  }
  const expectedKind = c.taskMode === "implementation" ? "target" : "analysis";
  if (c.acceptance.some((item) => c.taskMode === "implementation" ? item.kind === "analysis" : item.kind !== "analysis")) {
    error("ACCEPTANCE_MODE_MISMATCH", "acceptance");
  }
  if (c.acceptance.length > 0 && !c.acceptance.some((item) => item.required && item.kind === expectedKind)) {
    error("REQUIRED_ACCEPTANCE_MISSING", "acceptance");
  }
  for (const snapshot of c.snapshots) {
    const paths = snapshot.files.map((file) => file.path);
    if (new Set(paths).size !== paths.length) error("DUPLICATE_PATH", snapshot.id);
  }
  const stageNames = new Set(status.stages.map((stage) => stage.name));
  const verifyActions = new Set([
    "read", "run_verification", "run_assessment", "append_evidence",
    "start_service", "stop_owned_service",
  ]);
  const reviewActions = new Set([
    "read", "run_verification", "run_assessment", "append_evidence", "write_summary",
  ]);
  const deliverActions = new Set(["read", "run_assessment", "write_summary"]);
  for (const [invocationIndex, invocation] of c.invocations.entries()) {
    if (invocation.contractRevision !== null) reference(contracts, invocation.contractRevision, invocation.id);
    if (invocation.snapshotId !== null) reference(snapshots, invocation.snapshotId, invocation.id);
    for (const id of invocation.selectedCheckIds) reference(checks, id, invocation.id);
    for (const id of invocation.selectedFindingIds) reference(findings, id, invocation.id);
    for (const stage of invocation.necessaryStages) {
      if (!stageNames.has(stage)) error("UNKNOWN_STAGE", invocation.id, stage);
    }
    if (invocation.operation === "resume" && !invocation.previousInvocationId) {
      error("PREVIOUS_INVOCATION_REQUIRED", invocation.id);
    }
    const expectedPrevious = invocationIndex === 0 ? undefined : c.invocations[invocationIndex - 1].id;
    if (invocation.previousInvocationId !== expectedPrevious) {
      error("INVOCATION_HISTORY_INVALID", invocation.id);
    }
    if (invocation.operation === "review" ? !invocation.reviewMode : own(invocation, "reviewMode")) {
      error("REVIEW_MODE_MISMATCH", invocation.id);
    }
    const allowed = invocation.operation === "verify" ? verifyActions :
      invocation.operation === "review" ? reviewActions :
      invocation.operation === "deliver" ? deliverActions : null;
    if (invocation.allowedActions.some((action) => !c.authorizedActions.includes(action))) {
      error("TASK_AUTHORIZATION_EXCEEDED", invocation.id);
    }
    if (allowed && invocation.allowedActions.some((action) => !allowed.has(action))) {
      error("OPERATION_ACTION_FORBIDDEN", invocation.id);
    }
    if (invocation.operation === "verify" &&
        !invocation.allowedActions.some((action) => ["run_verification", "run_assessment"].includes(action))) {
      error("VERIFY_ACTION_REQUIRED", invocation.id);
    }
  }
  for (const scope of c.impactScopes) {
    reference(contracts, scope.contractRevision, scope.id);
    reference(snapshots, scope.snapshotId, scope.id);
    for (const id of scope.acceptanceIds) {
      reference(acceptance, id, scope.id);
      if (acceptance.has(id) && acceptance.get(id).contractRevision !== scope.contractRevision) {
        error("IMPACT_ACCEPTANCE_CONTRACT_MISMATCH", scope.id, id);
      }
    }
    for (const id of scope.checkIds) {
      reference(checks, id, scope.id);
      if (checkOwners.has(id) && !scope.acceptanceIds.includes(checkOwners.get(id))) {
        error("IMPACT_CHECK_OUTSIDE_ACCEPTANCE", scope.id, id);
      }
    }
    for (const id of scope.mergeGuardCheckIds) {
      reference(checks, id, scope.id);
      if (!scope.checkIds.includes(id)) error("MERGE_GUARD_OUTSIDE_SCOPE", scope.id, id);
    }
    if (scope.consumers.length === 0 && !scope.consumerNotApplicableReason) {
      error("CONSUMER_SCOPE_REQUIRED", scope.id);
    }
  }
  for (const probe of c.environmentProbes) {
    if (!Number.isFinite(Date.parse(probe.capturedAt))) error("INVALID_TIME", probe.id);
    const dimensions = probe.requirements.map((item) => item.dimension);
    if (new Set(dimensions).size !== dimensions.length) error("DUPLICATE_ENVIRONMENT_DIMENSION", probe.id);
    const resources = probe.resources.map((item) => item.resource);
    if (new Set(resources).size !== resources.length) error("DUPLICATE_RESOURCE", probe.id);
    if (probe.fingerprint !== environmentProbeFingerprint(probe)) {
      error("ENVIRONMENT_FINGERPRINT_MISMATCH", probe.id);
    }
  }
  const latestFindingResults = new Map();
  for (const reviewRun of c.reviewRuns) {
    reference(invocations, reviewRun.invocationId, reviewRun.id);
    reference(snapshots, reviewRun.currentTargetSnapshotId, reviewRun.id);
    if (reviewRun.previousTargetSnapshotId !== null) {
      reference(snapshots, reviewRun.previousTargetSnapshotId, reviewRun.id);
    }
    if (reviewRun.mergedSnapshotId !== null) reference(snapshots, reviewRun.mergedSnapshotId, reviewRun.id);
    for (const id of reviewRun.requestedScopeIds) reference(impactScopes, id, reviewRun.id);
    for (const id of reviewRun.reviewedScopeIds) reference(impactScopes, id, reviewRun.id);
    for (const item of reviewRun.inheritedScopes) {
      reference(impactScopes, item.scopeId, reviewRun.id);
      reference(reviewRuns, item.fromReviewId, reviewRun.id);
      const inheritedFrom = reviewRuns.get(item.fromReviewId);
      const inheritedCoverage = inheritedFrom ? [
        ...inheritedFrom.reviewedScopeIds,
        ...inheritedFrom.inheritedScopes.map((scope) => scope.scopeId),
      ] : [];
      if (inheritedFrom && !inheritedCoverage.includes(item.scopeId)) {
        error("INHERITED_SCOPE_NOT_PREVIOUSLY_REVIEWED", reviewRun.id, item.scopeId);
      }
      const inheritedIndex = c.reviewRuns.findIndex((review) => review.id === item.fromReviewId);
      const currentIndex = c.reviewRuns.findIndex((review) => review.id === reviewRun.id);
      if (inheritedIndex >= currentIndex) error("INHERITED_SCOPE_ORDER_INVALID", reviewRun.id, item.scopeId);
    }
    for (const item of reviewRun.gapScopes) reference(impactScopes, item.scopeId, reviewRun.id);
    for (const id of reviewRun.requestedScopeIds) {
      if (!c.currentImpactScopeIds.includes(id)) error("REVIEW_SCOPE_NOT_CURRENT", reviewRun.id, id);
    }
    for (const id of reviewRun.selectedFindingIds) reference(findings, id, reviewRun.id);
    for (const item of reviewRun.findingResults) {
      reference(findings, item.findingId, reviewRun.id);
      const finding = findings.get(item.findingId);
      const expectedStatus = item.status === "resolved" ? "closed" :
        item.status === "retracted" ? "retracted" : "open";
      if (finding && finding.status !== expectedStatus) {
        error("FINDING_RESULT_MISMATCH", reviewRun.id, item.findingId);
      }
      if (enhancedControls) {
        for (const field of [
          "contractRef",
          "evidenceStatus",
          "attribution",
          "confidence",
          "fixedState",
          "counterEvidenceRefs",
        ]) {
          if (!own(item, field)) error("FINDING_ASSESSMENT_REQUIRED", reviewRun.id, `${item.findingId}.${field}`);
        }
        if (item.status === "retracted" || item.evidenceStatus === "disputed") {
          if (!item.counterEvidenceRefs?.length) {
            error("FINDING_COUNTER_EVIDENCE_REQUIRED", reviewRun.id, item.findingId);
          }
        }
      }
      latestFindingResults.set(item.findingId, item);
    }
    const invocation = invocations.get(reviewRun.invocationId);
    if (invocation && (invocation.operation !== "review" || invocation.reviewMode !== reviewRun.mode)) {
      error("REVIEW_INVOCATION_MISMATCH", reviewRun.id);
    }
    if (invocation && (invocation.snapshotId !== reviewRun.currentTargetSnapshotId ||
        !sameMembers(invocation.selectedFindingIds, reviewRun.selectedFindingIds))) {
      error("REVIEW_INVOCATION_SCOPE_MISMATCH", reviewRun.id);
    }
    const partition = [
      ...reviewRun.reviewedScopeIds,
      ...reviewRun.inheritedScopes.map((item) => item.scopeId),
      ...reviewRun.gapScopes.map((item) => item.scopeId),
    ];
    if (new Set(partition).size !== partition.length ||
        !sameMembers(reviewRun.requestedScopeIds, partition)) {
      error("REVIEW_SCOPE_PARTITION_INVALID", reviewRun.id);
    }
    if (reviewRun.mode === "initial" &&
        (reviewRun.previousReviewId || reviewRun.previousTargetSnapshotId != null ||
         reviewRun.inheritedScopes.length > 0)) {
      error("INITIAL_REVIEW_HAS_HISTORY", reviewRun.id);
    }
    if (["delta", "recheck"].includes(reviewRun.mode) &&
        (!reviewRun.previousReviewId || reviewRun.previousTargetSnapshotId == null)) {
      error("REVIEW_HISTORY_REQUIRED", reviewRun.id);
    }
    if (["delta", "recheck"].includes(reviewRun.mode) &&
        reviewRun.previousTargetSnapshotId === reviewRun.currentTargetSnapshotId) {
      error("REVIEW_TARGET_NOT_ADVANCED", reviewRun.id);
    }
    if (reviewRun.previousReviewId) {
      const previousReview = reviewRuns.get(reviewRun.previousReviewId);
      if (previousReview &&
          previousReview.currentTargetSnapshotId !== reviewRun.previousTargetSnapshotId) {
        error("REVIEW_HISTORY_SNAPSHOT_MISMATCH", reviewRun.id);
      }
      const previousIndex = c.reviewRuns.findIndex((item) => item.id === reviewRun.previousReviewId);
      const currentIndex = c.reviewRuns.findIndex((item) => item.id === reviewRun.id);
      if (previousIndex >= currentIndex) error("REVIEW_HISTORY_ORDER_INVALID", reviewRun.id);
    }
    for (const inherited of reviewRun.inheritedScopes) {
      const previousReview = reviewRuns.get(inherited.fromReviewId);
      if (previousReview && previousReview.impactScopeDigest !== reviewRun.impactScopeDigest) {
        error("INHERITED_SCOPE_DIGEST_MISMATCH", reviewRun.id, inherited.scopeId);
      }
    }
    if (reviewRun.mode === "recheck" &&
        (reviewRun.selectedFindingIds.length === 0 ||
         !sameMembers(reviewRun.selectedFindingIds, reviewRun.findingResults.map((item) => item.findingId)))) {
      error("RECHECK_FINDING_COVERAGE_REQUIRED", reviewRun.id);
    }
    if (reviewRun.mode !== "recheck" && reviewRun.findingResults.length > 0 &&
        !sameMembers(reviewRun.selectedFindingIds, reviewRun.findingResults.map((item) => item.findingId))) {
      error("FINDING_RESULT_SELECTION_MISMATCH", reviewRun.id);
    }
    if (reviewRun.gapScopes.length > 0 && reviewRun.conclusionScope !== "reviewed_only") {
      error("REVIEW_CONCLUSION_EXCEEDS_SCOPE", reviewRun.id);
    }
    const mergeGuards = reviewRun.requestedScopeIds.flatMap((id) =>
      impactScopes.get(id)?.mergeGuardCheckIds || []);
    if (reviewRun.mergeState !== "not_applicable" && mergeGuards.length === 0) {
      error("MERGE_GUARD_REQUIRED", reviewRun.id);
    }
    if (reviewRun.mergeState === "final" ?
        reviewRun.mergedSnapshotId !== reviewRun.currentTargetSnapshotId :
        reviewRun.mergedSnapshotId !== null) {
      error("MERGE_SNAPSHOT_MISMATCH", reviewRun.id);
    }
  }
  if (c.reviewRuns.length > 0 &&
      c.reviewRuns.at(-1).impactScopeDigest !== impactScopeDigest(c)) {
    error("CURRENT_REVIEW_SCOPE_DIGEST_MISMATCH", c.reviewRuns.at(-1).id);
  }
  for (const run of c.verificationRuns) {
    reference(contracts, run.contractRevision, run.id);
    reference(snapshots, run.snapshotId, run.id);
    for (const id of run.environmentProbeIds) reference(environmentProbes, id, run.id);
    if (!Number.isFinite(Date.parse(run.startedAt)) || !Number.isFinite(Date.parse(run.finishedAt)) ||
        Date.parse(run.finishedAt) < Date.parse(run.startedAt)) error("INVALID_TIME", run.id);
    if (run.source === "manual" ? (!run.manualRef || run.execution !== null) : !run.execution) error("EXECUTION_REQUIRED", run.id);
    const outputPaths = new Set(run.outputRefs.map((o) => o.path));
    if (outputPaths.size !== run.outputRefs.length) error("DUPLICATE_PATH", run.id);
    const observed = new Set();
    for (const observation of run.observations) {
      reference(checks, observation.checkId, run.id);
      if (observed.has(observation.checkId)) error("DUPLICATE_OBSERVATION", run.id);
      observed.add(observation.checkId);
      if (!outputPaths.has(observation.outputRef)) error("OUTPUT_REFERENCE_REQUIRED", run.id);
    }
    const replacements = [...(run.supersedesRunIds || []), ...(run.invalidatesRunIds || [])];
    if (replacements.length && !run.reason) error("REPLACEMENT_REASON_REQUIRED", run.id);
    for (const id of replacements) {
      const previous = runs.get(id);
      if (previous && (previous.purpose === "baseline" || run.purpose === "baseline" ||
          previous.contractRevision !== run.contractRevision || Date.parse(previous.finishedAt) > Date.parse(run.startedAt))) {
        error("INVALID_REPLACEMENT", run.id, id);
      }
    }
    for (const id of run.environmentProbeIds) {
      const probe = environmentProbes.get(id);
      if (!probe) continue;
      if (probe.environmentKey !== run.environmentKey) error("ENVIRONMENT_KEY_MISMATCH", run.id, id);
      if (probe.phase === "before" && Date.parse(probe.capturedAt) > Date.parse(run.startedAt)) {
        error("ENVIRONMENT_PROBE_TIME_INVALID", run.id, id);
      }
      if (probe.phase === "after" && Date.parse(probe.capturedAt) < Date.parse(run.finishedAt)) {
        error("ENVIRONMENT_PROBE_TIME_INVALID", run.id, id);
      }
    }
    const selectedProbes = run.environmentProbeIds
      .map((id) => environmentProbes.get(id))
      .filter(Boolean);
    if (selectedProbes.length === run.environmentProbeIds.length &&
        run.environmentDigest !== environmentSelectionDigest(selectedProbes)) {
      error("ENVIRONMENT_DIGEST_MISMATCH", run.id);
    }
  }
  for (const fix of c.fixes) {
    for (const [field, kind] of [["targetAcceptanceIds", "target"], ["preservedAcceptanceIds", "preserve"], ["consumerAcceptanceIds", "consumer"]]) {
      for (const id of fix[field]) {
        reference(acceptance, id, fix.id);
        const item = acceptance.get(id);
        if (item && (item.kind !== kind || !item.required)) error("INVALID_FIX_ACCEPTANCE", fix.id, id);
      }
    }
    for (const id of fix.baselineRunIds) {
      reference(runs, id, fix.id);
      if (runs.has(id) && runs.get(id).purpose !== "baseline") error("BASELINE_REQUIRED", fix.id);
    }
  }
  for (const finding of c.findingDisposition) {
    for (const id of finding.acceptanceIds) reference(acceptance, id, finding.id);
    if (finding.status === "closed" && finding.acceptanceIds.length === 0) error("CLOSURE_EVIDENCE_REQUIRED", finding.id);
    if (enhancedControls) {
      for (const field of [
        "evidenceStatus",
        "attribution",
        "confidence",
        "fixedState",
        "currentAssessmentRef",
        "counterEvidenceRefs",
      ]) {
        if (!own(finding, field)) error("FINDING_ASSESSMENT_REQUIRED", finding.id, field);
      }
      if (finding.status === "closed" && finding.fixedState !== "fixed") {
        error("FINDING_FIXED_STATE_MISMATCH", finding.id);
      }
      if (finding.status === "retracted" &&
          (finding.evidenceStatus !== "disputed" ||
           finding.fixedState !== "not_applicable" ||
           !finding.counterEvidenceRefs?.length)) {
        error("FINDING_RETRACTION_EVIDENCE_REQUIRED", finding.id);
      }
      const latest = latestFindingResults.get(finding.id);
      if (latest && (
        finding.evidenceStatus !== latest.evidenceStatus ||
        finding.attribution !== latest.attribution ||
        finding.confidence !== latest.confidence ||
        finding.fixedState !== latest.fixedState ||
        finding.currentAssessmentRef !== latest.evidenceRef
      )) {
        error("FINDING_CURRENT_ASSESSMENT_MISMATCH", finding.id);
      }
    }
  }
  const runSelectionOwners = new Map();
  for (const selection of c.testSelections || []) {
    reference(invocations, selection.invocationId, selection.id);
    const selectionInvocation = invocations.get(selection.invocationId);
    for (const id of selection.impactScopeIds) reference(impactScopes, id, selection.id);
    for (const id of selection.selectedCheckIds) reference(checks, id, selection.id);
    if (selectionInvocation) {
      for (const id of selection.selectedCheckIds) {
        if (!selectionInvocation.selectedCheckIds.includes(id)) {
          error("SELECTION_INVOCATION_CHECK_MISMATCH", selection.id, id);
        }
      }
      if (selection.runIds.length > 0 &&
          !selectionInvocation.allowedActions.includes("run_verification")) {
        error("SELECTION_INVOCATION_ACTION_REQUIRED", selection.id);
      }
    }
    for (const id of selection.runIds) {
      reference(runs, id, selection.id);
      if (runSelectionOwners.has(id)) {
        error("RUN_SELECTION_AMBIGUOUS", selection.id, id);
      }
      runSelectionOwners.set(id, selection.id);
      const run = runs.get(id);
      if (run) {
        for (const observation of run.observations) {
          if (!selection.selectedCheckIds.includes(observation.checkId)) {
            error("SELECTION_RUN_CHECK_MISMATCH", selection.id, observation.checkId);
          }
        }
      }
    }
    if (selection.catalogHealthId !== null) {
      reference(catalogHealth, selection.catalogHealthId, selection.id);
    }
    if (!Number.isFinite(Date.parse(selection.createdAt))) {
      error("INVALID_TIME", selection.id);
    }
    if (selection.completeness === "complete" && selection.unmappedPaths.length > 0) {
      error("SELECTION_COMPLETENESS_MISMATCH", selection.id);
    }
    if (selection.scopeSource === "not_applicable" ?
        selection.paths.length > 0 || selection.selectorKind !== "not_applicable" :
        selection.paths.length === 0) {
      error("SELECTION_PATH_SCOPE_MISMATCH", selection.id);
    }
    if (selection.selectorKind === "project_declared" &&
        selection.catalogHealthId === null) {
      error("CATALOG_HEALTH_REQUIRED", selection.id);
    }
    if (selection.selectorKind === "not_applicable" &&
        (selection.catalogHealthId !== null ||
         selection.selectedTestIds.length > 0 ||
         selection.runIds.length > 0)) {
      error("SELECTION_NOT_APPLICABLE_MISMATCH", selection.id);
    }
    const scopedChecks = new Set(selection.impactScopeIds.flatMap((id) =>
      impactScopes.get(id)?.checkIds || []));
    for (const id of selection.selectedCheckIds) {
      if (!scopedChecks.has(id)) error("SELECTION_CHECK_OUTSIDE_SCOPE", selection.id, id);
    }
  }
  if (enhancedControls) {
    for (const run of c.verificationRuns) {
      if (!runSelectionOwners.has(run.id)) error("RUN_SELECTION_REQUIRED", run.id);
    }
  }
  for (const health of c.catalogHealth || []) {
    if (!Number.isFinite(Date.parse(health.checkedAt))) error("INVALID_TIME", health.id);
    if (health.status === "healthy" && health.diagnostics.length > 0) {
      error("CATALOG_HEALTH_MISMATCH", health.id);
    }
    if (["degraded", "invalid"].includes(health.status) &&
        health.diagnostics.length === 0) {
      error("CATALOG_DIAGNOSTIC_REQUIRED", health.id);
    }
  }
  for (const knownFailure of c.knownFailures || []) {
    for (const id of knownFailure.affectedCheckIds) reference(checks, id, knownFailure.id);
    if (knownFailure.baselineRunId !== null) {
      reference(runs, knownFailure.baselineRunId, knownFailure.id);
      if (runs.get(knownFailure.baselineRunId)?.purpose !== "baseline") {
        error("KNOWN_FAILURE_BASELINE_REQUIRED", knownFailure.id);
      }
    }
    if (knownFailure.expiresAt !== null &&
        !Number.isFinite(Date.parse(knownFailure.expiresAt))) {
      error("INVALID_TIME", knownFailure.id);
    }
  }
  const packKinds = new Set();
  for (const pack of c.verificationPacks || []) {
    if (packKinds.has(pack.kind)) error("DUPLICATE_VERIFICATION_PACK", pack.id, pack.kind);
    packKinds.add(pack.kind);
    for (const id of pack.checkIds) reference(checks, id, pack.id);
    if (pack.decision === "selected" && pack.checkIds.length === 0) {
      error("VERIFICATION_PACK_CHECK_REQUIRED", pack.id);
    }
    if (pack.decision === "not_applicable" && pack.checkIds.length > 0) {
      error("VERIFICATION_PACK_NOT_APPLICABLE_MISMATCH", pack.id);
    }
    const scopedChecks = new Set(c.currentImpactScopeIds.flatMap((id) =>
      impactScopes.get(id)?.checkIds || []));
    for (const id of pack.checkIds) {
      if (!scopedChecks.has(id)) error("VERIFICATION_PACK_OUTSIDE_SCOPE", pack.id, id);
      if (checkOwners.has(id) && !acceptance.get(checkOwners.get(id))?.required) {
        error("VERIFICATION_PACK_CHECK_NOT_REQUIRED", pack.id, id);
      }
    }
  }
  if (enhancedControls) {
    const policy = c.recordPolicy;
    const expectedProfile = status.executionProfile === "lightweight" ? "minimal" :
      status.executionProfile;
    if (policy.profile !== expectedProfile) {
      error("RECORD_PROFILE_MISMATCH", "recordPolicy.profile");
    }
    if (policy.authoritativeRecord !== "workflow-status.json") {
      error("AUTHORITATIVE_RECORD_INVALID", "recordPolicy.authoritativeRecord");
    }
    const artifacts = [
      ...policy.requiredArtifacts,
      ...policy.derivedArtifacts,
      ...policy.omittedArtifacts.map((item) => item.artifact),
    ];
    if (new Set(artifacts).size !== artifacts.length) {
      error("ARTIFACT_POLICY_OVERLAP", "recordPolicy");
    }
    if (!policy.requiredArtifacts.includes("workflow-status.json")) {
      error("AUTHORITATIVE_RECORD_NOT_REQUIRED", "recordPolicy.requiredArtifacts");
    }
    if (["accepted", "analysis_complete"].includes(c.completion.claim) &&
        policy.derivedArtifacts.length > 0 &&
        policy.summarySourceDigest !== recordSourceDigest(c)) {
      error("DERIVED_SUMMARY_STALE", "recordPolicy.summarySourceDigest");
    }
  }
  const review = c.completion.evidenceReview;
  if (review) {
    reference(snapshots, review.snapshotId, "evidenceReview");
    for (const id of review.runIds) reference(runs, id, "evidenceReview");
    if (!Number.isFinite(Date.parse(review.checkedAt))) error("INVALID_TIME", "evidenceReview");
  }
  if (c.taskMode !== "implementation" && c.completion.implementation !== "not_applicable") error("MODE_MISMATCH", "completion");
  if (c.completion.claim === "accepted" && c.taskMode !== "implementation") error("MODE_MISMATCH", "claim");
  if (c.completion.claim === "analysis_complete" && c.taskMode === "implementation") error("MODE_MISMATCH", "claim");
  const currentInvocation = invocations.get(c.currentInvocationId);
  if (["accepted", "analysis_complete"].includes(c.completion.claim) &&
      currentInvocation?.operation === "deliver" &&
      (currentInvocation.contractRevision === null || currentInvocation.snapshotId === null)) {
    error("DELIVERY_BINDING_REQUIRED", currentInvocation.id);
  }
  if (c.taskMode !== "implementation" && status.stages.some((stage) =>
    stage.name === "Optimize" && ["in_progress", "completed"].includes(stage.status))) {
    error("MODE_MISMATCH", "stages.Optimize");
  }
  const active = contracts.get(c.activeContractRevision);
  if (c.taskMode === "implementation" && status.stages.some((stage) =>
    ["Implementation", "Fix", "Optimize"].includes(stage.name) && ["in_progress", "completed"].includes(stage.status))) {
    if (active?.status !== "confirmed" || c.contracts.some((item) => item.status === "conflicted")) error("CONTRACT_NOT_CONFIRMED", "stages");
  }
  if (c.taskMode === "implementation" && status.stages.some((stage) =>
    ["Delivery", "Verify & Deliver"].includes(stage.name) && stage.status === "completed") && c.completion.claim !== "accepted") {
    error("DELIVERY_CLAIM_REQUIRED", "stages");
  }
  return diagnostics;
}

function evaluateDeliveryControl(status, currentContext) {
  const diagnostics = validateDeliveryControl(status);
  const subject = status?.deliveryControl?.taskMode === "implementation" ? "implementation" : "analysis";
  const result = {
    subject,
    readiness: "blocked",
    reviewVerdict: "not_assessed",
    checks: [],
    testing: { selections: [], catalogHealth: [] },
    diagnostics,
  };
  if (diagnostics.length) return result;
  if (!own(status, "schemaVersion")) {
    result.readiness = "legacy_unverified";
    diagnostics.push({ code: "LEGACY_UNVERIFIED" });
    return result;
  }
  const c = status.deliveryControl;
  const enhancedControls = ["2.1", "2.2"].includes(status.schemaVersion);
  let blocked = false;
  let pending = false;
  const flag = (code, at, hard = false) => {
    diagnostics.push({ code, at });
    if (hard) blocked = true;
    else pending = true;
  };
  const active = c.contracts.find((item) => item.id === c.activeContractRevision);
  if (!active || active.status !== "confirmed") flag("CONTRACT_NOT_CONFIRMED", "contracts", true);
  if (c.contracts.some((item) => item.status === "conflicted")) flag("CONTRACT_CONFLICT", "contracts", true);
  const definitionDigest = contractDigest(c);
  const scopeDigest = impactScopeDigest(c);
  const acceptance = c.acceptance.filter((a) => a.contractRevision === c.activeContractRevision);
  const expectedKind = subject === "implementation" ? "target" : "analysis";
  if (!acceptance.some((a) => a.required && a.kind === expectedKind)) flag("REQUIRED_ACCEPTANCE_MISSING", "acceptance");
  const runs = new Map(c.verificationRuns.map((run) => [run.id, run]));
  const snapshots = new Map(c.snapshots.map((snapshot) => [snapshot.id, snapshot]));
  const probes = new Map(c.environmentProbes.map((probe) => [probe.id, probe]));
  const review = c.completion.evidenceReview;
  const current = currentContext?.snapshot;
  if (status.schemaVersion === "2.2") assessAssurance(c, current, flag);
  if (c.taskId === "replace-with-stable-task-id") flag("TASK_ID_REQUIRED", "taskId", true);
  const currentInvocation = c.invocations.find((item) => item.id === c.currentInvocationId);
  if (!currentInvocation) flag("CURRENT_INVOCATION_REQUIRED", "currentInvocationId");
  if (currentInvocation?.contractRevision !== c.activeContractRevision) {
    flag("INVOCATION_CONTRACT_MISMATCH", "currentInvocationId", true);
  }
  if (currentInvocation?.snapshotId && current &&
      snapshots.get(currentInvocation.snapshotId)?.codeDigest !== current.codeDigest) {
    flag("INVOCATION_SNAPSHOT_STALE", "currentInvocationId");
  }
  if (["accepted", "analysis_complete"].includes(c.completion.claim) &&
      currentInvocation?.operation !== "deliver") {
    flag("DELIVER_INVOCATION_REQUIRED", "currentInvocationId", true);
  }
  if (["accepted", "analysis_complete"].includes(c.completion.claim) &&
      (currentInvocation?.contractRevision === null || currentInvocation?.snapshotId === null)) {
    flag("DELIVERY_BINDING_REQUIRED", "currentInvocationId", true);
  }
  const activeScopes = c.impactScopes.filter((scope) => c.currentImpactScopeIds.includes(scope.id));
  if (["implementation", "review"].includes(c.taskMode) && activeScopes.length === 0) {
    flag("IMPACT_SCOPE_REQUIRED", "currentImpactScopeIds");
  }
  if (activeScopes.some((scope) => scope.contractRevision !== c.activeContractRevision)) {
    flag("IMPACT_SCOPE_CONTRACT_MISMATCH", "currentImpactScopeIds", true);
  }
  const scopedChecks = new Set(activeScopes.flatMap((scope) => scope.checkIds));
  for (const a of acceptance) {
    for (const check of a.checks) {
      if (a.required && !scopedChecks.has(check.id)) flag("CHECK_NOT_IN_IMPACT_SCOPE", check.id);
    }
  }
  if (!current) flag("CURRENT_CONTEXT_REQUIRED", "snapshot");
  if (current && activeScopes.some((scope) =>
    snapshots.get(scope.snapshotId)?.codeDigest !== current.codeDigest)) {
    flag("IMPACT_SCOPE_STALE", "currentImpactScopeIds");
  }
  const outputValid = (run) => run.outputRefs.length > 0 && run.outputRefs.every((output) =>
    currentContext?.outputHashes?.[output.path] === output.hash);
  const environmentValid = (run, check) => {
    const selected = run.environmentProbeIds.map((id) => probes.get(id)).filter(Boolean);
    const phases = new Set(selected.map((probe) => probe.phase));
    if (run.environmentDigest !== environmentSelectionDigest(selected) ||
        !phases.has("before") ||
        (["runtime", "browser", "manual"].includes(run.method) && !phases.has("after"))) return false;
    if (new Set(selected.map((probe) => probe.adapterRef)).size !== 1) return false;
    if (!selected.every((probe) => {
      if (probe.environmentKey !== run.environmentKey ||
          probe.fingerprint !== environmentProbeFingerprint(probe) ||
          currentContext?.outputHashes?.[probe.evidence.path] !== probe.evidence.hash) return false;
      if (check.requiredEnvironmentDimensions.some((dimension) =>
        ["instance", "proxy"].includes(dimension)) &&
        probe.adapterKind !== "project-declared") return false;
      if (probe.resources.some((resource) => ["conflict", "unknown"].includes(resource.status))) return false;
      if (check.requiredEnvironmentDimensions.includes("resource") &&
          (probe.resources.length === 0 || probe.resources.some((resource) =>
            resource.mode === "exclusive" &&
            (resource.status !== "held_by_run" ||
             ![run.id, c.taskId].includes(resource.owner))))) return false;
      return check.requiredEnvironmentDimensions.every((dimension) =>
        probe.requirements.some((item) => item.dimension === dimension && item.status === "ready"));
    })) return false;
    return check.requiredEnvironmentDimensions.every((dimension) => {
      const requirements = selected.map((probe) =>
        probe.requirements.find((item) => item.dimension === dimension));
      return new Set(requirements.map((item) => item.expectedRef)).size === 1 &&
        new Set(requirements.map((item) => item.observedRef)).size === 1;
    });
  };
  const identityValid = (run, baseline = false) => {
    const snapshot = snapshots.get(run.snapshotId);
    if (status.schemaVersion === "2.2") {
      const selection = c.testSelections.find((s) => s.runIds.includes(run.id));
      if (!selection || run.result.bindingDigest !== runBinding(c, selection, snapshot,
        run.environmentProbeIds.map((id) => probes.get(id)))) return false;
    }
    return snapshot && snapshot.codeDigest === snapshotDigest(snapshot.files) &&
      run.contractRevision === c.activeContractRevision && run.contractDigest === definitionDigest &&
      (baseline || run.impactScopeDigest === scopeDigest) &&
      run.artifactDigest === kindDigest(snapshot.files, "artifact") &&
      run.fixtureDigest === kindDigest(snapshot.files, "fixture") &&
      (baseline || (current && current.codeDigest === snapshot.codeDigest)) && outputValid(run);
  };
  const reviewed = (run) => review && review.environmentConfirmed === true &&
    review.contractDigest === definitionDigest && review.impactScopeDigest === scopeDigest &&
    snapshots.get(review.snapshotId)?.codeDigest === current?.codeDigest &&
    review.runIds.includes(run.id) && Date.parse(review.checkedAt) >= Date.parse(run.finishedAt);
  const observedRun = (run, check, baseline = false) => {
    const observation = run.observations.find((item) => item.checkId === check.id && item.caseKey === check.caseKey);
    if (!observation || run.method !== check.method || run.environmentKey !== check.environmentKey ||
        Number(run.level.slice(1)) < Number(check.minimumLevel.slice(1))) return null;
    if (!identityValid(run, baseline) || (!baseline && !reviewed(run))) return "STALE";
    if (!environmentValid(run, check)) return "BLOCKED";
    if (status.schemaVersion === "2.2") {
      const outcome = layerOutcome(run.result, run.source === "manual");
      if (outcome === "unknown" || outcome === "fail" && observation.outcome === "pass") return "BLOCKED";
      if (outcome === "not_run") return "NOT_RUN";
      if (outcome === "pass" && observation.outcome === "fail") return "BLOCKED";
    }
    if (run.runStatus === "blocked" || ["setup", "environment", "unknown"].includes(run.failureKind)) return "BLOCKED";
    if (run.runStatus !== "completed" || observation.outcome === "not_run") return "NOT_RUN";
    if (observation.outcome === "fail") return run.failureKind === "assertion" ? "FAILED" : "BLOCKED";
    if (run.failureKind !== "none" || (run.execution && run.execution.exitCode !== 0)) return "BLOCKED";
    return "PASSED";
  };
  const activeChecks = acceptance.flatMap((a) => a.checks);
  for (const a of acceptance) for (const check of a.checks) {
    const candidates = check.evidenceIds.map((id) => runs.get(id)).filter((r) => r.purpose !== "baseline");
    // Supersession is check-local and only takes effect when the replacing
    // observation itself matches this contract, snapshot and environment.
    const replaced = new Set();
    for (const run of candidates) {
      if (identityValid(run) && reviewed(run) && observedRun(run, check) === "PASSED") {
        for (const id of run.supersedesRunIds || []) replaced.add(id);
      }
      if (identityValid(run) && reviewed(run) && run.observations.some((o) => o.checkId === check.id && o.caseKey === check.caseKey)) {
        for (const id of run.invalidatesRunIds || []) replaced.add(id);
      }
    }
    const outcomes = candidates.filter((run) => !replaced.has(run.id)).map((run) => observedRun(run, check)).filter(Boolean);
    let state = "NOT_RUN";
    if (outcomes.includes("PASSED") && outcomes.includes("FAILED")) state = "CONFLICT";
    else if (outcomes.includes("FAILED")) state = "FAILED";
    else if (outcomes.includes("BLOCKED")) state = "BLOCKED";
    else if (outcomes.includes("STALE")) state = "STALE";
    else if (outcomes.includes("PASSED")) state = "PASSED";
    result.checks.push({ acceptanceId: a.id, checkId: check.id, required: a.required, status: state });
    if (a.required && state !== "PASSED") flag(`CHECK_${state}`, check.id, ["FAILED", "CONFLICT"].includes(state));
  }
  if (enhancedControls) {
    const healthById = new Map(c.catalogHealth.map((item) => [item.id, item]));
    const activeRunIds = new Set(activeChecks.flatMap((check) => check.evidenceIds));
    for (const selection of c.testSelections) {
      const used = selection.runIds.some((id) => activeRunIds.has(id));
      const health = selection.catalogHealthId === null ? null :
        healthById.get(selection.catalogHealthId);
      result.testing.selections.push({
        id: selection.id,
        completeness: selection.completeness,
        scopeSource: selection.scopeSource,
        used,
      });
      if (!used) continue;
      if (selection.completeness !== "complete") {
        flag("TEST_SELECTION_INCOMPLETE", selection.id);
      }
      if (selection.scopeSource === "working_tree") {
        flag("TEST_SELECTION_NOT_TASK_SCOPED", selection.id);
      }
      if (selection.selectorKind === "project_declared" &&
          (!health || health.status !== "healthy")) {
        flag("CATALOG_HEALTH_NOT_READY", selection.catalogHealthId || selection.id);
      }
      if (health?.diagnostics.some((item) =>
        ["current_scope", "unknown"].includes(item.relevance))) {
        flag("CATALOG_RELEVANCE_UNRESOLVED", health.id);
      }
    }
    result.testing.catalogHealth = c.catalogHealth.map((item) => ({
      id: item.id,
      status: item.status,
      diagnostics: item.diagnostics.length,
    }));
    for (const pack of c.verificationPacks) {
      if (pack.decision !== "selected") continue;
      const incomplete = pack.checkIds.some((id) =>
        result.checks.find((item) => item.checkId === id)?.status !== "PASSED");
      if (incomplete) flag("VERIFICATION_PACK_INCOMPLETE", pack.id);
    }
  }
  const latestReviewRun = c.reviewRuns.at(-1);
  let reviewHasGaps = false;
  let mergePending = false;
  let mergeGuardFailed = false;
  if (status.workflow === "code-review-delivery") {
    if (!latestReviewRun) {
      flag("REVIEW_RUN_REQUIRED", "reviewRuns");
    } else {
      const reviewSnapshot = snapshots.get(latestReviewRun.currentTargetSnapshotId);
      if (!current || reviewSnapshot?.codeDigest !== current.codeDigest) {
        flag("REVIEW_SNAPSHOT_STALE", latestReviewRun.id);
      }
      reviewHasGaps = latestReviewRun.gapScopes.length > 0;
      if (reviewHasGaps) diagnostics.push({ code: "REVIEW_SCOPE_GAPS", at: latestReviewRun.id });
      if (latestReviewRun.mergeState === "candidate") {
        mergePending = activeScopes.some((scope) => scope.mergeGuardCheckIds.length > 0);
        diagnostics.push({ code: "FINAL_MERGE_VERIFICATION_PENDING", at: latestReviewRun.id });
        if (mergePending && subject === "implementation") pending = true;
      }
      if (latestReviewRun.mergeState === "final") {
        const guards = activeScopes.flatMap((scope) => scope.mergeGuardCheckIds);
        mergeGuardFailed = guards.some((id) =>
          result.checks.find((item) => item.checkId === id)?.status !== "PASSED");
        if (mergeGuardFailed && subject === "implementation") {
          flag("MERGE_GUARD_INCOMPLETE", latestReviewRun.id);
        }
      }
    }
  }
  const passAcceptance = (id) => {
    const checks = result.checks.filter((item) => item.acceptanceId === id);
    return checks.length > 0 && checks.every((item) => item.status === "PASSED");
  };
  if (subject === "implementation") {
    const applicableFixes = c.fixes.filter((fix) =>
      fix.targetAcceptanceIds.some((id) => acceptance.some((a) => a.id === id)));
    const optimizingReview = status.workflow === "code-review-delivery" && status.stages.some((stage) =>
      stage.name === "Optimize" && ["in_progress", "completed"].includes(stage.status));
    const requiresFix = status.workflow === "bugfix-delivery" || optimizingReview;
    if (requiresFix) {
      const coveredTargets = new Set(applicableFixes.flatMap((fix) => fix.targetAcceptanceIds));
      const missingTargets = acceptance.filter((item) =>
        item.required && item.kind === "target" && !coveredTargets.has(item.id));
      if (missingTargets.length > 0) flag("FIX_REQUIRED", missingTargets.map((item) => item.id).join(","), true);
    }
    for (const fix of applicableFixes) {
      for (const [ids, reason] of [[fix.preservedAcceptanceIds, fix.preserveNotApplicableReason], [fix.consumerAcceptanceIds, fix.consumerNotApplicableReason]]) {
        if (ids.length === 0 && !(reason && fix.decisionRef)) flag("PRESERVATION_REQUIRED", fix.id, true);
      }
      for (const id of [...fix.targetAcceptanceIds, ...fix.preservedAcceptanceIds, ...fix.consumerAcceptanceIds]) {
        if (!passAcceptance(id)) flag("FIX_CHECK_INCOMPLETE", fix.id);
      }
      for (const id of fix.targetAcceptanceIds) {
        const target = acceptance.find((a) => a.id === id);
        const reproduced = target && target.checks.some((check) => fix.baselineRunIds.some((runId) => {
          const run = runs.get(runId);
          return observedRun(run, check, true) === "FAILED";
        }));
        if (!reproduced) flag("BASELINE_NOT_REPRODUCED", fix.id);
      }
    }
    if (c.completion.implementation !== "complete") flag("IMPLEMENTATION_INCOMPLETE", "completion");
  }
  for (const finding of c.findingDisposition) {
    if (finding.status === "closed" && !finding.acceptanceIds.every(passAcceptance)) flag("FINDING_NOT_VERIFIED", finding.id, true);
    if (subject === "implementation" && finding.status === "open" && ["P0", "P1"].includes(finding.severity)) flag("OPEN_BLOCKER", finding.id, true);
  }
  if (!review || !review.environmentConfirmed || review.contractDigest !== definitionDigest ||
      review.impactScopeDigest !== scopeDigest ||
      snapshots.get(review.snapshotId)?.codeDigest !== current?.codeDigest) flag("EVIDENCE_REVIEW_REQUIRED", "completion");
  if (activeChecks.length === 0) flag("CHECKS_REQUIRED", "acceptance");
  result.readiness = blocked ? "blocked" : pending ? "review" : "ready";
  const terminalClaim = ["accepted", "analysis_complete"].includes(c.completion.claim);
  if (terminalClaim && result.readiness !== "ready") {
    flag("CLAIM_EXCEEDS_EVIDENCE", "completion.claim", true);
    result.readiness = "blocked";
  }
  if (subject === "analysis") {
    result.reviewVerdict = c.findingDisposition.some((f) => f.status === "open" && ["P0", "P1"].includes(f.severity)) ||
      mergeGuardFailed ? "changes_required" :
      reviewHasGaps || mergePending ? "partial" :
      result.readiness === "ready" ? "no_blocking_findings" : "not_assessed";
  }
  return result;
}

module.exports = {
  validateShape,
  validateDeliveryControl,
  evaluateDeliveryControl,
  digest,
  snapshotDigest,
  kindDigest,
  contractDigest,
  impactScopeDigest,
  environmentProbeFingerprint,
  environmentSelectionDigest,
  recordSourceDigest,
  coverageDigest,
  isSafeRelativePath,
};
