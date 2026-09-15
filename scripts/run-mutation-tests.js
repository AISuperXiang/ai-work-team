#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const THRESHOLD = 85;
const ALL_TESTS = [
  "test/build-context.test.js",
  "test/external-skill-utils.test.js",
  "test/install-external-skills.test.js",
  "test/list-external-skills.test.js",
  "test/validate-contracts.test.js",
  "test/delivery-controls.test.js",
  "test/check-delivery.test.js",
  "test/skill-evaluation.test.js",
];

const MUTANTS = [
  {
    id: "delivery-locale-independent-impact-sort",
    file: "scripts/delivery-controls.js",
    search: "const compareText = (left, right) => left < right ? -1 : left > right ? 1 : 0;",
    replacement: "const compareText = (left, right) => left.localeCompare(right);",
    tests: ["test/delivery-controls.test.js"],
    critical: false,
  },
  {
    id: "delivery-contract-digest",
    file: "scripts/delivery-controls.js",
    search: "      run.contractRevision === c.activeContractRevision && run.contractDigest === definitionDigest &&",
    replacement: "      run.contractRevision === c.activeContractRevision && true &&",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-preserve-gate",
    file: "scripts/delivery-controls.js",
    search: "        if (ids.length === 0 && !(reason && fix.decisionRef)) flag(\"PRESERVATION_REQUIRED\", fix.id, true);",
    replacement: "        if (false) flag(\"PRESERVATION_REQUIRED\", fix.id, true);",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-stale-as-pass",
    file: "scripts/delivery-controls.js",
    search: "      (baseline || (current && current.codeDigest === snapshot.codeDigest)) && outputValid(run);",
    replacement: "      (baseline || true) && outputValid(run);",
    tests: ["test/delivery-controls.test.js", "test/check-delivery.test.js"],
    critical: true,
  },
  {
    id: "delivery-skip-as-pass",
    file: "scripts/delivery-controls.js",
    search: "    if (run.runStatus !== \"completed\" || observation.outcome === \"not_run\") return \"NOT_RUN\";",
    replacement: "    if (run.runStatus !== \"completed\") return \"NOT_RUN\";",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-open-p1",
    file: "scripts/delivery-controls.js",
    search: "    if (subject === \"implementation\" && finding.status === \"open\" && [\"P0\", \"P1\"].includes(finding.severity)) flag(\"OPEN_BLOCKER\", finding.id, true);",
    replacement: "    if (false) flag(\"OPEN_BLOCKER\", finding.id, true);",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-active-fix",
    file: "scripts/delivery-controls.js",
    search: "      if (missingTargets.length > 0) flag(\"FIX_REQUIRED\", missingTargets.map((item) => item.id).join(\",\"), true);",
    replacement: "      if (false) flag(\"FIX_REQUIRED\", missingTargets.map((item) => item.id).join(\",\"), true);",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-mode-kind",
    file: "scripts/delivery-controls.js",
    search: "  if (c.acceptance.some((item) => c.taskMode === \"implementation\" ? item.kind === \"analysis\" : item.kind !== \"analysis\")) {",
    replacement: "  if (false) {",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-active-contract",
    file: "scripts/delivery-controls.js",
    search: "  if (c.contracts.some((item) => item.status === \"confirmed\" && item.supersedes === c.activeContractRevision)) {",
    replacement: "  if (false) {",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-operation-action-boundary",
    file: "scripts/delivery-controls.js",
    search: "    if (allowed && invocation.allowedActions.some((action) => !allowed.has(action))) {",
    replacement: "    if (false) {",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-task-authorization",
    file: "scripts/delivery-controls.js",
    search: "    if (invocation.allowedActions.some((action) => !c.authorizedActions.includes(action))) {",
    replacement: "    if (false) {",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-invocation-history",
    file: "scripts/delivery-controls.js",
    search: "    if (invocation.previousInvocationId !== expectedPrevious) {",
    replacement: "    if (false) {",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-impact-scope-coverage",
    file: "scripts/delivery-controls.js",
    search: "      if (a.required && !scopedChecks.has(check.id)) flag(\"CHECK_NOT_IN_IMPACT_SCOPE\", check.id);",
    replacement: "      if (false) flag(\"CHECK_NOT_IN_IMPACT_SCOPE\", check.id);",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-environment-readiness",
    file: "scripts/delivery-controls.js",
    search: "        probe.requirements.some((item) => item.dimension === dimension && item.status === \"ready\"));",
    replacement: "        probe.requirements.some((item) => item.dimension === dimension));",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-runtime-after-probe",
    file: "scripts/delivery-controls.js",
    search: "        ([\"runtime\", \"browser\", \"manual\"].includes(run.method) && !phases.has(\"after\"))) return false;",
    replacement: "        (false && !phases.has(\"after\"))) return false;",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-review-scope-partition",
    file: "scripts/delivery-controls.js",
    search:
      "    if (new Set(partition).size !== partition.length ||\n" +
      "        !sameMembers(reviewRun.requestedScopeIds, partition)) {",
    replacement: "    if (false) {",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-review-inheritance-proof",
    file: "scripts/delivery-controls.js",
    search: "      if (inheritedFrom && !inheritedCoverage.includes(item.scopeId)) {",
    replacement: "      if (false) {",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-review-history-snapshot",
    file: "scripts/delivery-controls.js",
    search:
      "      if (previousReview &&\n" +
      "          previousReview.currentTargetSnapshotId !== reviewRun.previousTargetSnapshotId) {",
    replacement: "      if (false) {",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-current-review-scope-digest",
    file: "scripts/delivery-controls.js",
    search:
      "  if (c.reviewRuns.length > 0 &&\n" +
      "      c.reviewRuns.at(-1).impactScopeDigest !== impactScopeDigest(c)) {",
    replacement: "  if (false) {",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-merge-guard-required",
    file: "scripts/delivery-controls.js",
    search: "    if (reviewRun.mergeState !== \"not_applicable\" && mergeGuards.length === 0) {",
    replacement: "    if (false) {",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-environment-fingerprint",
    file: "scripts/delivery-controls.js",
    search: "    if (probe.fingerprint !== environmentProbeFingerprint(probe)) {",
    replacement: "    if (false) {",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-environment-run-binding",
    file: "scripts/delivery-controls.js",
    search:
      "    if (selectedProbes.length === run.environmentProbeIds.length &&\n" +
      "        run.environmentDigest !== environmentSelectionDigest(selectedProbes)) {",
    replacement: "    if (false) {",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-environment-stability",
    file: "scripts/delivery-controls.js",
    search:
      "      return new Set(requirements.map((item) => item.expectedRef)).size === 1 &&\n" +
      "        new Set(requirements.map((item) => item.observedRef)).size === 1;",
    replacement: "      return true;",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-resource-claim",
    file: "scripts/delivery-controls.js",
    search: "          (probe.resources.length === 0 || probe.resources.some((resource) =>",
    replacement: "          (false || probe.resources.some((resource) =>",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-resource-owner",
    file: "scripts/delivery-controls.js",
    search: "             ![run.id, c.taskId].includes(resource.owner))))) return false;",
    replacement: "             false)))) return false;",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-project-adapter",
    file: "scripts/delivery-controls.js",
    search: "        probe.adapterKind !== \"project-declared\") return false;",
    replacement: "        false) return false;",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-terminal-snapshot-binding",
    file: "scripts/delivery-controls.js",
    search:
      "  if ([\"accepted\", \"analysis_complete\"].includes(c.completion.claim) &&\n" +
      "      currentInvocation?.operation === \"deliver\" &&\n" +
      "      (currentInvocation.contractRevision === null || currentInvocation.snapshotId === null)) {\n" +
      "    error(\"DELIVERY_BINDING_REQUIRED\", currentInvocation.id);\n" +
      "  }",
    replacement: "  if (false) {\n    error(\"DELIVERY_BINDING_REQUIRED\", currentInvocation.id);\n  }",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-version-fallback",
    file: "scripts/delivery-controls.js",
    search:
      "  if (![\"2.0\", \"2.1\"].includes(status.schemaVersion)) {\n" +
      "    return [{ code: \"UNSUPPORTED_VERSION\", at: \"$.schemaVersion\" }];\n" +
      "  }",
    replacement:
      "  if (![\"2.0\", \"2.1\"].includes(status.schemaVersion)) {\n" +
      "    return [];\n" +
      "  }",
    tests: ["test/delivery-controls.test.js", "test/check-delivery.test.js"],
    critical: true,
  },
  {
    id: "delivery-v21-required-fields",
    file: "scripts/delivery-controls.js",
    search: "      if (!own(c, field)) error(\"V21_FIELD_REQUIRED\", `deliveryControl.${field}`);",
    replacement: "      if (false) error(\"V21_FIELD_REQUIRED\", `deliveryControl.${field}`);",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-task-scoped-selection",
    file: "scripts/delivery-controls.js",
    search: "      if (selection.scopeSource === \"working_tree\") {",
    replacement: "      if (false) {",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-catalog-health-gate",
    file: "scripts/delivery-controls.js",
    search:
      "      if (selection.selectorKind === \"project_declared\" &&\n" +
      "          (!health || health.status !== \"healthy\")) {",
    replacement: "      if (false) {",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-finding-retraction-evidence",
    file: "scripts/delivery-controls.js",
    search: "        error(\"FINDING_RETRACTION_EVIDENCE_REQUIRED\", finding.id);",
    replacement: "        void finding;",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-derived-summary-freshness",
    file: "scripts/delivery-controls.js",
    search: "        policy.summarySourceDigest !== recordSourceDigest(c)) {",
    replacement: "        false) {",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-summary-claim-binding",
    file: "scripts/delivery-controls.js",
    search:
      "  return digest({\n" +
      "    ...control,\n" +
      "    recordPolicy,\n" +
      "  });",
    replacement:
      "  const { claim, ...completion } = control.completion || {};\n" +
      "  return digest({\n" +
      "    ...control,\n" +
      "    recordPolicy,\n" +
      "    completion,\n" +
      "  });",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "delivery-selection-observation-binding",
    file: "scripts/delivery-controls.js",
    search: "          if (!selection.selectedCheckIds.includes(observation.checkId)) {",
    replacement: "          if (false) {",
    tests: ["test/delivery-controls.test.js"],
    critical: true,
  },
  {
    id: "evaluation-answer-leakage",
    file: "scripts/skill-evaluation.js",
    search: "      if (item.answerLeakage !== false) error(\"ANSWER_LEAKAGE\", at);",
    replacement: "      if (false) error(\"ANSWER_LEAKAGE\", at);",
    tests: ["test/skill-evaluation.test.js"],
    critical: true,
  },
  {
    id: "evaluation-unknown-field",
    file: "scripts/skill-evaluation.js",
    search: "      if (!allowed.includes(key)) error(\"UNKNOWN_FIELD\", at, key);",
    replacement: "      if (false) error(\"UNKNOWN_FIELD\", at, key);",
    tests: ["test/skill-evaluation.test.js"],
    critical: true,
  },
  {
    id: "evaluation-critical-error-gate",
    file: "scripts/skill-evaluation.js",
    search:
      "      candidateCriticalErrors.length || offlineCorrect !== holdout.length ?\n" +
      "        \"failed\" : \"passed\",",
    replacement:
      "      false || offlineCorrect !== holdout.length ?\n" +
      "        \"failed\" : \"passed\",",
    tests: ["test/skill-evaluation.test.js"],
    critical: true,
  },
  {
    id: "evaluation-variant-context",
    file: "scripts/skill-evaluation.js",
    search: "    if (input.baseline?.[field] !== input.candidate?.[field]) {",
    replacement: "    if (false) {",
    tests: ["test/skill-evaluation.test.js"],
    critical: true,
  },
  {
    id: "evaluation-risk-grouping",
    file: "scripts/skill-evaluation.js",
    search: "        item.arm === arm && item.riskClass === riskClass);",
    replacement: "        item.arm === arm);",
    tests: ["test/skill-evaluation.test.js"],
    critical: true,
  },
  {
    id: "evaluation-cli-kill-switch",
    file: "scripts/evaluate-skill.js",
    search: "try {\n  main(process.argv.slice(2));\n}",
    replacement: "process.exit(0);\ntry {\n  main(process.argv.slice(2));\n}",
    tests: ["test/skill-evaluation.test.js"],
    critical: true,
  },
  {
    id: "evaluation-input-size-limit",
    file: "scripts/safe-files.js",
    search: "function readStableFile(file, options) {",
    replacement: "function readStableFile(file, options) {\n  options = { ...options, maxBytes: Infinity };",
    tests: ["test/skill-evaluation.test.js"],
    critical: true,
  },
  {
    id: "evaluation-delivered-sample-minimum",
    file: "scripts/skill-evaluation.js",
    search: "      byArm[arm].delivered.length >= input.policy.minimumPilotTasksPerArm);",
    replacement: "      byArm[arm].tasks.length >= input.policy.minimumPilotTasksPerArm);",
    tests: ["test/skill-evaluation.test.js"],
    critical: true,
  },
  {
    id: "evaluation-delivery-rate-regression",
    file: "scripts/skill-evaluation.js",
    search: "        deliveryPassed &&",
    replacement: "        true &&",
    tests: ["test/skill-evaluation.test.js"],
    critical: true,
  },
  {
    id: "delivery-path-traversal",
    file: "scripts/safe-files.js",
    search: "  if (parts.some((part) => !part || part === \".\" || part === \"..\")) return false;",
    replacement: "  if (false) return false;",
    tests: ["test/delivery-controls.test.js", "test/check-delivery.test.js"],
    critical: true,
  },
  {
    id: "delivery-cli-kill-switch",
    file: "scripts/check-delivery.js",
    search: "try { main(process.argv.slice(2)); }",
    replacement: "process.exit(0);\ntry { main(process.argv.slice(2)); }",
    tests: ["test/check-delivery.test.js"],
    critical: true,
  },
  {
    id: "cli-unknown-option",
    file: "scripts/cli-args.js",
    search: "      throw new CliArgumentError(`Unknown option: ${arg}`);",
    replacement: "      continue;",
    tests: [
      "test/build-context.test.js",
      "test/install-external-skills.test.js",
      "test/list-external-skills.test.js",
    ],
    critical: true,
  },
  {
    id: "cli-missing-value",
    file: "scripts/cli-args.js",
    search: '    if (value === undefined || value.startsWith("-")) {',
    replacement: "    if (false) {",
    tests: [
      "test/install-external-skills.test.js",
      "test/list-external-skills.test.js",
    ],
    critical: true,
  },
  {
    id: "build-output-containment",
    file: "scripts/build-context.js",
    search:
      "function isInsideRoot(root, candidate) {\n" +
      "  return candidate !== root && candidate.startsWith(`${root}${path.sep}`);\n" +
      "}",
    replacement:
      "function isInsideRoot() {\n" +
      "  return true;\n" +
      "}",
    tests: ["test/build-context.test.js"],
    critical: true,
  },
  {
    id: "build-large-file-limit",
    file: "scripts/build-context.js",
    search: "  if (stat.size > MAX_READ_BYTES) {",
    replacement: "  if (false) {",
    tests: ["test/build-context.test.js"],
    critical: true,
  },
  {
    id: "build-symlink-output",
    file: "scripts/build-context.js",
    search: "    const stat = fs.lstatSync(outputPath);",
    replacement: "    const stat = fs.statSync(outputPath);",
    tests: ["test/build-context.test.js"],
    critical: true,
  },
  {
    id: "package-dot-segment",
    file: "scripts/external-skill-utils.js",
    search:
      "      match.slice(1).every((part) => !INVALID_PACKAGE_PARTS.has(part)),",
    replacement: "      match.slice(1).every(() => true),",
    tests: ["test/external-skill-utils.test.js"],
    critical: true,
  },
  {
    id: "list-top-validation",
    file: "scripts/list-external-skills.js",
    search: "        validate: (value) => /^[1-9]\\d*$/.test(value),",
    replacement: "        validate: () => true,",
    tests: ["test/list-external-skills.test.js"],
    critical: false,
  },
  {
    id: "install-implicit-bulk",
    file: "scripts/install-external-skills.js",
    search:
      "const defaultCatalogMode =\n" +
      "  rawArgs.length === 0 || (rawArgs.length === 1 && dryRun);",
    replacement: "const defaultCatalogMode = !hasSelector;",
    tests: ["test/install-external-skills.test.js"],
    critical: true,
  },
  {
    id: "install-candidate-gate",
    file: "scripts/install-external-skills.js",
    search:
      '  if (skill.qualityTier !== "recommended" && !allowCandidate) {',
    replacement: "  if (false) {",
    tests: ["test/install-external-skills.test.js"],
    critical: true,
  },
  {
    id: "install-dry-run-gate",
    file: "scripts/install-external-skills.js",
    search: "  if (dryRun) {",
    replacement: "  if (false) {",
    tests: ["test/install-external-skills.test.js"],
    critical: true,
  },
  {
    id: "install-subprocess-exit",
    file: "scripts/install-external-skills.js",
    search: "      exitCode: spawnResult.status || 1,",
    replacement: "      exitCode: 0,",
    tests: ["test/install-external-skills.test.js"],
    critical: true,
  },
  {
    id: "contracts-goal-design-stage-contract",
    file: "scripts/validate-contracts.js",
    search:
      '    "Design Revision",\n' +
      '    "Decision Handoff"\n',
    replacement:
      '    "Design Rework",\n' +
      '    "Decision Handoff"\n',
    tests: ["test/validate-contracts.test.js"],
    critical: true,
  },
  {
    id: "contracts-goal-design-template-names",
    file: "workflows/goal-driven-technical-design.md",
    search: "`assets/templates/goal-contract.json`、`assets/templates/milestones.json`、`assets/templates/tasks.json`、`assets/templates/autonomy-policy.json`",
    replacement: "`assets/templates/goal-contract.json`、`assets/templates/milestone-plan.json`、`assets/templates/task-plan.json`、`assets/templates/autonomy-policy.json`",
    tests: ["test/validate-contracts.test.js"],
    critical: true,
  },
  {
    id: "contracts-high-risk-task-approval",
    file: "scripts/validate-contracts.js",
    search: '    if (task.riskLevel === "high" || task.riskLevel === "critical") {',
    replacement: "    if (false) {",
    tests: ["test/validate-contracts.test.js"],
    critical: true,
  },
  {
    id: "contracts-default-workspace-scan",
    file: "scripts/validate-contracts.js",
    search: "  } else if (command.allWorkspaces) {",
    replacement: "  } else {",
    tests: ["test/validate-contracts.test.js"],
    critical: true,
  },
  {
    id: "build-cli-kill-switch",
    file: "scripts/build-context.js",
    search: "  process.exitCode = main();",
    replacement: "  process.exitCode = 0;",
    tests: ["test/build-context.test.js"],
    critical: true,
  },
  {
    id: "list-cli-kill-switch",
    file: "scripts/list-external-skills.js",
    search: "  process.exitCode = main();",
    replacement: "  process.exitCode = 0;",
    tests: ["test/list-external-skills.test.js"],
    critical: true,
  },
  {
    id: "install-cli-kill-switch",
    file: "scripts/install-external-skills.js",
    search: "const rawArgs = process.argv.slice(2);",
    replacement: "process.exit(0);\nconst rawArgs = process.argv.slice(2);",
    tests: ["test/install-external-skills.test.js"],
    critical: true,
  },
];

function shouldCopy(source) {
  const relative = path.relative(ROOT, source).split(path.sep).join("/");
  if (!relative) return true;
  if (
    relative === ".git" ||
    relative.startsWith(".git/") ||
    relative === "node_modules" ||
    relative.startsWith("node_modules/")
  ) {
    return false;
  }
  if (
    relative.startsWith("workspace/") &&
    relative !== "workspace/README.md"
  ) {
    return false;
  }
  return true;
}

function copyProject() {
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "ai-work-team-mutation-"),
  );
  const sandbox = path.join(tempRoot, "project");
  fs.cpSync(ROOT, sandbox, {
    recursive: true,
    filter: shouldCopy,
  });
  return { tempRoot, sandbox };
}

function runTests(projectRoot, testFiles) {
  return spawnSync(
    process.execPath,
    ["--test", ...testFiles.map((file) => path.join(projectRoot, file))],
    {
      cwd: projectRoot,
      encoding: "utf8",
      timeout: 120_000,
    },
  );
}

function applyMutant(projectRoot, mutant) {
  const filePath = path.join(projectRoot, mutant.file);
  const content = fs.readFileSync(filePath, "utf8");
  const occurrences = content.split(mutant.search).length - 1;
  if (occurrences !== 1) {
    throw new Error(
      `${mutant.id} expected one mutation target in ${mutant.file}, found ${occurrences}`,
    );
  }
  fs.writeFileSync(
    filePath,
    content.replace(mutant.search, mutant.replacement),
    "utf8",
  );
}

function main() {
  const baseline = runTests(ROOT, ALL_TESTS);
  if (baseline.status !== 0) {
    process.stderr.write(baseline.stdout || "");
    process.stderr.write(baseline.stderr || "");
    console.error("Mutation baseline failed; refusing to score mutants.");
    return 1;
  }

  const results = [];
  for (const mutant of MUTANTS) {
    const { tempRoot, sandbox } = copyProject();
    try {
      applyMutant(sandbox, mutant);
      const result = runTests(sandbox, mutant.tests);
      const killed = result.status !== 0;
      results.push({ ...mutant, killed });
      console.log(`${killed ? "KILLED" : "SURVIVED"} ${mutant.id}`);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  }

  const killedCount = results.filter((result) => result.killed).length;
  const criticalSurvivors = results.filter(
    (result) => result.critical && !result.killed,
  );
  const score = (killedCount / results.length) * 100;

  console.log("");
  console.log(`Mutation score: ${score.toFixed(1)}%`);
  console.log(`Killed: ${killedCount}/${results.length}`);
  console.log(`Critical survivors: ${criticalSurvivors.length}`);
  console.log(`Threshold: ${THRESHOLD}%`);

  if (score < THRESHOLD || criticalSurvivors.length > 0) {
    for (const survivor of criticalSurvivors) {
      console.error(`Critical mutant survived: ${survivor.id}`);
    }
    return 1;
  }
  return 0;
}

process.exitCode = main();
