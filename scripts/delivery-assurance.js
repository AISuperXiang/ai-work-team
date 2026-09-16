"use strict";

// Definitions are part of the acceptance contract; reviews and run references
// are appendable evidence and must not change that contract.
function assuranceDefinition(c) {
  const a = c.assurance;
  return a && {
    requirements: a.requirements.filter((r) => r.contractRevision === c.activeContractRevision),
    obligations: a.obligations,
    consumerContracts: a.consumerContracts,
    consumerExclusions: a.consumerExclusions,
  };
}

function coverageDigest(c) {
  const { digest, contractDigest, impactScopeDigest } = require("./delivery-controls");
  return digest({ contract: contractDigest(c), impact: impactScopeDigest(c) });
}

function runBinding(c, selection, snapshot, probes) {
  const { digest, contractDigest, impactScopeDigest } = require("./delivery-controls");
  const { runIds, ...selectionDefinition } = selection;
  return digest({
    taskId: c.taskId, contract: contractDigest(c), impact: impactScopeDigest(c),
    selection: selectionDefinition, snapshot,
    probes: probes.filter((p) => p.phase === "before"),
    identity: c.assurance.executionIdentities.find((i) => i.invocationId === selection.invocationId),
  });
}

function layerOutcome(result, manual = false) {
  const successful = (p, allowNA) => p.status === "completed" && p.exitCode === 0 ||
    allowNA && p.status === "not_applicable" && p.exitCode === null;
  if (!successful(result.wrapper, true)) return "unknown";
  const runnerFinished = result.runner.status === "completed" && result.runner.exitCode !== null ||
    manual && result.runner.status === "not_applicable" && result.runner.exitCode === null;
  if (!runnerFinished) return "unknown";
  if (result.executed <= 0 || result.assertion === "not_run") return "not_run";
  if (result.assertion === "fail") return "fail";
  if (result.assertion !== "pass" || !successful(result.runner, manual)) return "unknown";
  return "pass";
}

const OBLIGATIONS = {
  "server-entry-import": { pack: "ssr_recovery", methods: ["integration", "runtime"] },
  "unresolved-recovery": { pack: "ssr_recovery", methods: ["integration", "runtime", "browser"] },
  "async-ordering": { pack: "async_ownership", methods: ["unit", "integration", "runtime", "browser"] },
  "cache-ordering": { pack: "cache_consistency", methods: ["unit", "integration", "runtime", "browser"] },
  "consumer-cache-hit": { pack: "cache_consistency", methods: ["integration", "runtime", "browser"] },
};
const FACETS = {
  sdk: ["default-export", "legacy-call", "instance-identity", "installed-entry"],
  api: ["required-parameters", "caller-entry", "response"],
  config: ["serialization", "lookup", "render", "defaults", "migration"],
};

function validateAssurance(status, error) {
  const c = status.deliveryControl;
  if (status.schemaVersion !== "2.2") {
    if (c.assurance || c.verificationRuns.some((r) => r.result)) error("V22_VERSION_REQUIRED", "assurance");
    return;
  }
  const a = c.assurance;
  if (!a) { error("V22_FIELD_REQUIRED", "assurance"); return; }
  const unique = (items, key, at) => {
    if (new Set(items.map((i) => i[key])).size !== items.length) error("DUPLICATE_ID", at);
  };
  unique(a.executionIdentities, "invocationId", "executionIdentities");
  for (const identity of a.executionIdentities) {
    if (!c.invocations.some((i) => i.id === identity.invocationId)) error("UNKNOWN_REFERENCE", identity.invocationId);
    if (!Number.isFinite(Date.parse(identity.capturedAt))) error("INVALID_TIME", identity.invocationId);
  }
  for (const list of ["requirements", "obligations", "consumerContracts"]) unique(a[list], "id", list);
  unique(a.consumerExclusions, "subject", "consumerExclusions");
  const owners = new Map(c.acceptance.flatMap((item) => item.checks.map((ch) => [ch.id, item])));
  const checks = new Map(c.acceptance.flatMap((item) => item.checks.map((ch) => [ch.id, ch])));
  const scoped = new Set(c.impactScopes.filter((s) => c.currentImpactScopeIds.includes(s.id)).flatMap((s) => s.checkIds));
  const requiredChecks = (ids, at, revision = c.activeContractRevision) => {
    for (const id of ids) {
      const owner = owners.get(id);
      if (!owner || !owner.required || owner.contractRevision !== revision || !scoped.has(id)) {
        error("COVERAGE_CHECK_INVALID", at, id);
      }
    }
  };
  for (const r of a.requirements) {
    if (!c.contracts.some((item) => item.id === r.contractRevision)) error("UNKNOWN_REFERENCE", r.id);
    for (const id of r.checkIds) {
      if (owners.get(id)?.contractRevision !== r.contractRevision) error("REQUIREMENT_CHECK_MISMATCH", r.id, id);
    }
    if (r.required && r.contractRevision === c.activeContractRevision) requiredChecks(r.checkIds, r.id);
  }
  for (const o of a.obligations) {
    const rule = OBLIGATIONS[o.kind];
    const pack = c.verificationPacks.find((p) => p.id === o.packId);
    if (!pack || pack.decision !== "selected" || pack.kind !== rule.pack ||
        o.checkIds.some((id) => !pack.checkIds.includes(id))) error("OBLIGATION_PACK_MISMATCH", o.id);
    requiredChecks(o.checkIds, o.id);
    for (const id of o.checkIds) {
      if (!rule.methods.includes(checks.get(id)?.method)) error("OBLIGATION_METHOD_MISMATCH", o.id, id);
    }
  }
  for (const contract of a.consumerContracts) {
    if (!contract.facets.some((f) => f.decision === "required" && f.checkIds.length)) {
      error("CONSUMER_CHECK_REQUIRED", contract.id);
    }
    const scope = c.impactScopes.find((s) => s.id === contract.scopeId);
    if (!scope || !c.currentImpactScopeIds.includes(scope.id) || !scope.consumers.includes(contract.consumer.entryRef)) {
      error("CONSUMER_SCOPE_MISMATCH", contract.id);
    }
    unique(contract.facets, "name", contract.id);
    for (const facet of contract.facets) {
      if (!FACETS[contract.kind].includes(facet.name)) error("UNKNOWN_CONSUMER_FACET", contract.id, facet.name);
      if (facet.decision === "not_applicable" && facet.checkIds.length) error("CONSUMER_EXCLUSION_MISMATCH", contract.id);
      requiredChecks(facet.checkIds, contract.id);
      for (const id of facet.checkIds) {
        if (owners.get(id)?.kind !== (c.taskMode === "implementation" ? "consumer" : "analysis") || !scope?.checkIds.includes(id) ||
            !["integration", "runtime", "browser", "manual"].includes(checks.get(id)?.method)) {
          error("CONSUMER_CHECK_INVALID", contract.id, id);
        }
      }
    }
  }
  const consumers = c.impactScopes.filter((s) => c.currentImpactScopeIds.includes(s.id)).flatMap((s) => s.consumers);
  for (const e of a.consumerExclusions) {
    if (!consumers.includes(e.subject) || a.consumerContracts.some((item) => item.consumer.entryRef === e.subject)) {
      error("CONSUMER_EXCLUSION_MISMATCH", e.subject);
    }
  }
  for (const run of c.verificationRuns) {
    if (!run.result) { error("RUN_RESULT_REQUIRED", run.id); continue; }
    if (run.result.executed < 0 || !Number.isSafeInteger(run.result.executed)) error("ASSERTION_COUNT_INVALID", run.id);
    if (!run.outputRefs.some((o) => o.path === run.result.source.path && o.hash === run.result.source.hash)) {
      error("RESULT_SOURCE_REQUIRED", run.id);
    }
    if (run.execution && run.execution.exitCode !== run.result.runner.exitCode) error("RUNNER_EXIT_MISMATCH", run.id);
  }
}

function assessAssurance(c, current, flag) {
  const a = c.assurance;
  const requirements = a.requirements.filter((r) => r.contractRevision === c.activeContractRevision);
  if (!requirements.some((r) => r.required)) flag("REQUIREMENTS_REQUIRED", "requirements");
  for (const r of requirements) {
    if (r.required && !r.checkIds.length) flag("REQUIREMENT_UNCOVERED", r.id);
  }
  const covered = new Set(requirements.filter((r) => r.required).flatMap((r) => r.checkIds));
  for (const item of c.acceptance.filter((item) => item.required && item.contractRevision === c.activeContractRevision)) {
    for (const check of item.checks) if (!covered.has(check.id)) flag("CHECK_SOURCE_REQUIRED", check.id);
  }
  if (a.coverageReview?.definitionDigest !== coverageDigest(c)) flag("COVERAGE_REVIEW_REQUIRED", "coverageReview");
  if (!a.executionIdentities.some((i) => i.invocationId === c.currentInvocationId)) {
    flag("EXECUTION_IDENTITY_REQUIRED", c.currentInvocationId);
  }
  const fixturePresent = (p) => current?.files.some((f) => f.path === p && f.kind === "fixture" && f.hash !== "missing");
  for (const pack of c.verificationPacks.filter((p) => p.decision === "selected")) {
    for (const id of pack.checkIds) {
      if (!a.obligations.some((o) => o.packId === pack.id && o.checkIds.includes(id))) flag("PACK_OBLIGATION_REQUIRED", pack.id);
    }
  }
  for (const o of a.obligations) if (!fixturePresent(o.fixtureRef)) flag("OBLIGATION_FIXTURE_REQUIRED", o.id);
  for (const scope of c.impactScopes.filter((s) => c.currentImpactScopeIds.includes(s.id))) {
    for (const consumer of scope.consumers) {
      if (!a.consumerContracts.some((item) => item.scopeId === scope.id && item.consumer.entryRef === consumer) &&
          !a.consumerExclusions.some((e) => e.subject === consumer)) flag("CONSUMER_CONTRACT_REQUIRED", consumer);
    }
  }
  for (const contract of a.consumerContracts) {
    if (!fixturePresent(contract.samplePath)) flag("CONSUMER_SAMPLE_REQUIRED", contract.id);
    for (const name of FACETS[contract.kind]) {
      const facet = contract.facets.find((f) => f.name === name);
      if (!facet || facet.decision === "required" && !facet.checkIds.length) flag("CONSUMER_FACET_UNCOVERED", `${contract.id}.${name}`);
    }
  }
}

module.exports = { assuranceDefinition, coverageDigest, runBinding, layerOutcome, validateAssurance, assessAssurance };
