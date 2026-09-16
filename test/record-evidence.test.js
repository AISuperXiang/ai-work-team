"use strict";

const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { spawn, spawnSync } = require("node:child_process");
const test = require("node:test");
const { fixture, source, environmentOutput, hash } = require("./delivery-controls-fixture");
const { createTempDir, cleanupDir, runCli, PROJECT_ROOT } = require("./cli-test-helpers");
const { digest, contractDigest, impactScopeDigest, coverageDigest, snapshotDigest, recordSourceDigest } = require("../scripts/delivery-controls");

function project(t, configure = () => {}) {
  const root = createTempDir("evidence-import");
  t.after(() => cleanupDir(root));
  const workspace = path.join(root, "workspace/task");
  fs.mkdirSync(path.join(workspace, "evidence"), { recursive: true });
  fs.mkdirSync(path.join(root, "src"));
  fs.writeFileSync(path.join(root, "src/example.js"), source);
  fs.writeFileSync(path.join(workspace, "evidence/environment.json"), environmentOutput);
  const { status } = fixture();
  status.schemaVersion = "2.2";
  status.workflow = "requirement-end-to-end";
  const c = status.deliveryControl;
  c.fixes = []; c.verificationRuns = []; c.invocations.pop(); c.currentInvocationId = "invoke-verify";
  c.testSelections[0].runIds = [];
  delete c.completion.evidenceReview;
  for (const a of c.acceptance) a.checks[0].evidenceIds = [];
  c.assurance = { executionIdentities: [], requirements: c.acceptance.map((a) => ({
    id: `R-${a.id}`, contractRevision: "C1", sourceRef: "prd.md", behavior: a.expected,
    required: true, checkIds: a.checks.map((ch) => ch.id),
  })), obligations: [], consumerContracts: [], consumerExclusions: [], coverageReview: null };
  configure(c, status, root);
  c.snapshots[0].codeDigest = snapshotDigest(c.snapshots[0].files);
  c.assurance.coverageReview = { definitionDigest: coverageDigest(c), reviewer: "qa", ref: "prd.md#review" };
  const statusPath = path.join(workspace, "workflow-status.json");
  const save = (s) => fs.writeFileSync(statusPath, JSON.stringify(s));
  const read = () => JSON.parse(fs.readFileSync(statusPath));
  save(status);
  const args = ["--project-root", root, "--workspace", "workspace/task"];
  const cli = (mode, rest = []) => runCli("scripts/record-evidence.js", [...args, "--mode", mode, ...rest]);
  const start = cli("start", ["--expected-state-digest", digest(read())]);
  assert.equal(start.status, 0, start.stdout);
  const prepare = () => cli("prepare", ["--selection", "selection-unit", "--snapshot", "S1", "--probes", "env-before", "--json"]);
  const prepared = prepare();
  assert.equal(prepared.status, 0, prepared.stdout);
  const executed = spawnSync(process.execPath, ["-e",
    "const assert=require('node:assert/strict');const value=require('./src/example');assert.equal(value,1);assert.equal(value+1,2);console.log(JSON.stringify({assertion:'pass',executed:2}));"],
  { cwd: root, encoding: "utf8", shell: false });
  assert.equal(executed.status, 0, executed.stderr);
  fs.writeFileSync(path.join(workspace, "evidence/run.json"), executed.stdout);
  const processResult = { status: "completed", exitCode: executed.status, sourceRef: "node assertion adapter" };
  const input = {
    id: "run-1", purpose: "acceptance", selectionId: "selection-unit", snapshotId: "S1",
    environmentProbeIds: ["env-before"], bindingDigest: JSON.parse(prepared.stdout).bindingDigest,
    startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(),
    source: "agent_run", method: "unit", level: "V2", execution: { argv: ["node", "-e", "assertions"], cwd: ".", exitCode: 0 },
    ...JSON.parse(executed.stdout), runner: processResult,
    wrapper: { status: "not_applicable", exitCode: null, sourceRef: "direct node child; no wrapper" },
    observations: c.acceptance.map((a) => ({ checkId: a.checks[0].id, caseKey: a.checks[0].caseKey, outcome: "pass", outputRef: "evidence/run.json" })),
    outputPaths: ["evidence/run.json"], fixIds: [], sanitized: true,
  };
  const writeInput = (i = input, name = "input.json") => fs.writeFileSync(path.join(workspace, name), JSON.stringify(i));
  writeInput();
  const importArgs = (name = "input.json") => ["--input", name, "--expected-state-digest", digest(read())];
  const record = () => cli("import", importArgs());
  const assess = () => JSON.parse(runCli("scripts/check-delivery.js", [...args, "--json"]).stdout);
  const review = () => {
    const s = read(), d = s.deliveryControl;
    d.completion.evidenceReview = { snapshotId: "S1", contractDigest: contractDigest(d), impactScopeDigest: impactScopeDigest(d),
      runIds: d.verificationRuns.map((r) => r.id), checkedAt: new Date(Date.now() + 1000).toISOString(),
      reviewer: "qa", environmentConfirmed: true, ref: "evidence/review.md" };
    d.recordPolicy.summarySourceDigest = recordSourceDigest(d);
    save(s);
  };
  return { root, workspace, statusPath, read, save, args, cli, prepare, input, writeInput, importArgs, record, assess, review };
}

test("records real structured results and links evidence without self-approval", (t) => {
  const p = project(t);
  const result = p.record();
  assert.equal(result.status, 0, result.stdout);
  const c = p.read().deliveryControl;
  assert.equal(c.verificationRuns.length, 1);
  assert.deepEqual(c.testSelections[0].runIds, ["run-1"]);
  assert.deepEqual(c.acceptance[0].checks[0].evidenceIds, ["run-1"]);
  assert.equal(c.completion.evidenceReview, undefined);
  assert.equal(c.completion.claim, "pending");
  assert.equal(c.assurance.executionIdentities[0].entryHash, hash(fs.readFileSync(path.join(PROJECT_ROOT, "SKILL.md"))));
  assert.notEqual(p.assess().readiness, "ready");
  p.review();
  assert.equal(p.assess().readiness, "ready");
  const summary = p.cli("summary", ["--json"]);
  assert.equal(summary.status, 0, summary.stdout);
  assert.equal(JSON.parse(summary.stdout).sourceDigest, recordSourceDigest(p.read().deliveryControl));
  const before = fs.readFileSync(p.statusPath, "utf8");
  assert.equal(p.record().status, 1);
  assert.equal(fs.readFileSync(p.statusPath, "utf8"), before);
});

test("unknown wrapper, infrastructure failure and zero assertions cannot pass", async (t) => {
  for (const variant of ["unknown-wrapper", "runner-failed", "global-fail", "zero", "skipped", "missing"]) await t.test(variant, (t) => {
    const p = project(t);
    if (variant === "unknown-wrapper") p.input.wrapper = { status: "unknown", exitCode: null, sourceRef: "wrapper incomplete" };
    if (variant === "runner-failed") { p.input.runner.status = "failed"; p.input.runner.exitCode = 1; p.input.execution.exitCode = 1; }
    if (variant === "global-fail") { p.input.assertion = "fail"; p.input.runner.exitCode = 1; p.input.execution.exitCode = 1; }
    if (variant === "zero") p.input.executed = 0;
    if (variant === "skipped") p.input.assertion = "not_run";
    if (variant === "missing") { delete p.input.assertion; delete p.input.wrapper; delete p.input.runner; }
    p.writeInput();
    assert.equal(p.record().status, 0);
    p.review();
    assert.notEqual(p.assess().checks[0].status, "PASSED");
    assert.equal(p.read().deliveryControl.completion.claim, "pending");
  });
});

test("prepared results cannot be rebound after inputs change even with fresh CAS", async (t) => {
  for (const variant of ["task", "contract", "selection", "source", "probe", "identity", "case"]) await t.test(variant, (t) => {
    const p = project(t), s = p.read(), c = s.deliveryControl;
    if (variant === "task") c.taskId = "changed-task";
    if (variant === "contract") c.contracts[0].goal = "changed goal";
    if (variant === "selection") c.testSelections[0].selectedTestIds.push("another-test");
    if (variant === "source") fs.writeFileSync(path.join(p.root, "src/example.js"), "changed");
    if (variant === "probe") fs.writeFileSync(path.join(p.workspace, "evidence/environment.json"), "changed");
    if (variant === "identity") c.assurance.executionIdentities[0].entryHash = hash("other skill");
    if (variant === "case") p.input.observations[0].caseKey = "unrelated";
    p.save(s); p.writeInput();
    const before = fs.readFileSync(p.statusPath, "utf8");
    assert.equal(p.record().status, 1, variant);
    assert.equal(fs.readFileSync(p.statusPath, "utf8"), before);
  });
});

test("JSON and dry-run create no files; stored argv is never replayed", (t) => {
  const p = project(t);
  const marker = path.join(p.root, "must-not-exist");
  p.input.execution.argv = [process.execPath, "-e", `require("fs").writeFileSync(${JSON.stringify(marker)}, "bad")`];
  p.writeInput();
  const before = fs.readFileSync(p.statusPath, "utf8"), files = fs.readdirSync(p.workspace);
  for (const mode of ["--json", "--dry-run"]) {
    assert.equal(p.cli("import", [...p.importArgs(), mode]).status, 0);
    assert.equal(fs.readFileSync(p.statusPath, "utf8"), before);
    assert.deepEqual(fs.readdirSync(p.workspace), files);
  }
  assert.equal(p.record().status, 0);
  assert.equal(fs.existsSync(marker), false);
});

test("strict flags, state size, locks and unsafe files fail without altering state", async (t) => {
  for (const variant of ["stale-cas", "locked", "symlink-input", "symlink-status", "parent", "directory", "large-input", "large-status", "large-next"]) await t.test(variant, (t) => {
    const p = project(t);
    let args = p.importArgs();
    if (variant === "stale-cas") {
      const s = p.read(); s.updatedAt = "changed"; p.save(s);
      assert.equal(p.cli("import", [...args, "--json"]).status, 1);
    }
    if (variant === "locked") fs.writeFileSync(path.join(p.workspace, ".record-evidence.lock"), "other owner");
    if (variant === "symlink-input" || variant === "symlink-status") {
      const file = variant === "symlink-input" ? path.join(p.workspace, "input.json") : p.statusPath;
      fs.renameSync(file, `${file}.original`); fs.symlinkSync(`${file}.original`, file);
    }
    if (variant === "parent") { const evidence = path.join(p.workspace, "evidence"); fs.renameSync(evidence, `${evidence}-real`); fs.symlinkSync(`${evidence}-real`, evidence); }
    if (variant === "directory") { fs.unlinkSync(path.join(p.workspace, "input.json")); fs.mkdirSync(path.join(p.workspace, "input.json")); }
    if (variant === "large-input") fs.writeFileSync(path.join(p.workspace, "input.json"), " ".repeat(256 * 1024 + 1));
    if (variant === "large-status") fs.writeFileSync(p.statusPath, " ".repeat(256 * 1024 + 1));
    if (variant === "large-next") {
      p.input.execution.argv = ["x".repeat(252 * 1024)]; p.writeInput();
      assert.ok(fs.statSync(path.join(p.workspace, "input.json")).size <= 256 * 1024);
    }
    const before = fs.readFileSync(p.statusPath, "utf8");
    assert.notEqual(p.cli("import", args).status, 0, variant);
    assert.equal(fs.readFileSync(p.statusPath, "utf8"), before);
    if (variant === "locked") assert.equal(fs.readFileSync(path.join(p.workspace, ".record-evidence.lock"), "utf8"), "other owner");
  });
  const p = project(t);
  for (const extra of [["--wat"], ["--input"], ["--json", "--json"], ["--json", "--dry-run"], ["--selection", "x"], ["--help"], ["positional"]]) {
    assert.equal(p.cli("import", [...p.importArgs(), ...extra]).status, 2);
  }
  for (const file of ["../escape", "/tmp/escape", ".env", "a\\b"]) {
    assert.equal(p.cli("import", ["--input", file, "--json"]).status, 2);
  }
  assert.equal(p.cli("import", ["--input", "input.json"]).status, 2);
  assert.equal(runCli("scripts/record-evidence.js", ["--help"]).status, 0);
});

test("two processes with the same state digest cannot lose an update", async (t) => {
  const p = project(t);
  p.writeInput({ ...p.input, id: "run-2" }, "second.json");
  const launch = (name) => new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(PROJECT_ROOT, "scripts/record-evidence.js"), ...p.args, "--mode", "import", ...p.importArgs(name)], { shell: false });
    child.stdout.resume(); child.stderr.resume();
    child.on("close", resolve);
  });
  const first = launch("input.json");
  const second = launch("second.json");
  const results = [await first, await second].sort();
  assert.deepEqual(results, [0, 1]);
  const c = p.read().deliveryControl;
  assert.equal(c.verificationRuns.length, 1);
  assert.deepEqual(c.testSelections[0].runIds, [c.verificationRuns[0].id]);
  const remaining = c.verificationRuns[0].id === "run-1" ? "second.json" : "input.json";
  assert.equal(p.cli("import", p.importArgs(remaining)).status, 0);
  assert.equal(p.read().deliveryControl.verificationRuns.length, 2);
});

test("baseline import links the fix while setup failure never reproduces it", (t) => {
  const p = project(t, (c, status) => {
    status.workflow = "bugfix-delivery";
    c.fixes = [{ id: "F1", targetAcceptanceIds: ["target"], preservedAcceptanceIds: ["preserve"],
      consumerAcceptanceIds: [], consumerNotApplicableReason: "internal", decisionRef: "prd.md", baselineRunIds: [] }];
  });
  p.input.purpose = "baseline"; p.input.fixIds = ["F1"]; p.input.assertion = "fail";
  p.input.observations[0].outcome = "fail"; p.input.observations.pop();
  p.input.execution.exitCode = 1; p.input.runner.exitCode = 1;
  p.writeInput();
  assert.equal(p.record().status, 0);
  assert.deepEqual(p.read().deliveryControl.fixes[0].baselineRunIds, ["run-1"]);
  assert.deepEqual(p.read().deliveryControl.acceptance[0].checks[0].evidenceIds, []);
  assert.equal(p.assess().diagnostics.some((d) => d.code === "BASELINE_NOT_REPRODUCED"), false);
  const s = p.read();
  s.deliveryControl.verificationRuns[0].result.runner.status = "failed";
  p.save(s);
  assert.equal(p.assess().diagnostics.some((d) => d.code === "BASELINE_NOT_REPRODUCED"), true);
});

test("deliver and old formats cannot import new verification", (t) => {
  const p = project(t), s = p.read(), c = s.deliveryControl;
  c.invocations.push({ ...c.invocations.at(-1), id: "deliver", operation: "deliver",
    previousInvocationId: c.currentInvocationId, allowedActions: ["read", "run_assessment", "write_summary"] });
  c.currentInvocationId = "deliver"; p.save(s);
  assert.equal(p.record().status, 1);
  for (const version of ["2.0", "2.1", "3.0"]) {
    const old = fixture().status; old.schemaVersion = version; p.save(old);
    assert.equal(p.cli("start", ["--json"]).status, 1);
  }
});

test("coverage detects omitted loading, optional mappings and stale review", async (t) => {
  for (const variant of ["missing", "optional", "review"]) await t.test(variant, (t) => {
    const p = project(t);
    assert.equal(p.record().status, 0); p.review();
    assert.equal(p.assess().readiness, "ready");
    const s = p.read(), a = s.deliveryControl.assurance;
    if (variant === "missing") a.requirements.push({ id: "loading", contractRevision: "C1", sourceRef: "prd.md#loading", behavior: "pending shows loading", required: true, checkIds: [] });
    if (variant === "optional") s.deliveryControl.acceptance[0].required = false;
    if (variant === "review") a.coverageReview.definitionDigest = hash("old definition");
    p.save(s);
    const result = p.assess();
    assert.notEqual(result.readiness, "ready");
    const code = { missing: "REQUIREMENT_UNCOVERED", optional: "COVERAGE_CHECK_INVALID", review: "COVERAGE_REVIEW_REQUIRED" }[variant];
    assert.ok(result.diagnostics.some((d) => d.code === code), JSON.stringify(result));
  });
});

test("SSR obligation cannot be discharged by pagination unit tests", (t) => {
  const p = project(t), s = p.read(), c = s.deliveryControl;
  c.verificationPacks = [{ id: "ssr", kind: "ssr_recovery", version: "2", decision: "selected", triggerRef: "prd.md", rationale: "server entry changes", checkIds: ["target-check"] }];
  c.assurance.obligations = [{ id: "import", packId: "ssr", kind: "server-entry-import", entryRef: "src/server", fixtureRef: "test/ssr.json", assertion: "server imports without browser globals", checkIds: ["target-check"] }];
  p.save(s);
  assert.ok(p.assess().diagnostics.some((d) => d.code === "OBLIGATION_METHOD_MISMATCH"));
});

test("consumer facets require real checks and a snapshot-bound payload", (t) => {
  const p = project(t, (c, status, root) => {
    fs.writeFileSync(path.join(root, "payload.json"), '{"name":"root-media"}');
    c.snapshots[0].files.push({ path: "payload.json", kind: "fixture", hash: hash('{"name":"root-media"}') });
    c.acceptance[1].kind = "consumer";
    c.acceptance.forEach((a) => { a.checks[0].method = "integration"; });
    c.impactScopes[0].consumers = ["consumer#lookup"];
    c.assurance.consumerContracts.push({ id: "config", scopeId: "scope-main", kind: "config",
      producer: { repository: "console", version: "commit-a", entryRef: "producer#serialize" },
      consumer: { repository: "web", version: "commit-b", entryRef: "consumer#lookup" },
      samplePath: "payload.json", facets: ["serialization", "lookup", "render", "defaults", "migration"].map((name) => ({
        name, decision: "required", basisRef: "prd.md#config", checkIds: ["preserve-check"],
      })) });
  });
  p.input.method = "integration"; p.writeInput();
  assert.equal(p.record().status, 0); p.review();
  assert.equal(p.assess().readiness, "ready");
  const before = p.read();
  for (const variant of ["facet", "sample", "version"]) {
    const s = structuredClone(before);
    if (variant === "facet") s.deliveryControl.assurance.consumerContracts[0].facets[1].checkIds = [];
    if (variant === "version") s.deliveryControl.assurance.consumerContracts[0].consumer.version = "commit-c";
    if (variant === "sample") fs.writeFileSync(path.join(p.root, "payload.json"), '{"name":"header.image"}');
    p.save(s);
    const assessment = p.assess();
    assert.notEqual(assessment.readiness, "ready", variant);
    if (variant === "facet") assert.ok(assessment.diagnostics.some((d) => d.code === "CONSUMER_FACET_UNCOVERED"));
  }
});

test("initial start assigns IDs and preserves the first captured identity", (t) => {
  const p = project(t), s = p.read(), c = s.deliveryControl;
  c.taskId = "replace-with-stable-task-id"; c.currentInvocationId = null; c.invocations = [];
  c.testSelections = []; c.assurance.executionIdentities = []; p.save(s);
  const args = ["--authorization-ref", "user approved", "--expected-state-digest", digest(p.read())];
  assert.equal(p.cli("start", args).status, 0);
  const started = p.read();
  assert.match(started.deliveryControl.taskId, /^task-/);
  assert.equal(started.deliveryControl.invocations.length, 1);
  assert.equal(p.cli("start", ["--expected-state-digest", digest(started)]).status, 0);
  assert.deepEqual(p.read(), started);
  const missing = p.read();
  missing.deliveryControl.assurance.executionIdentities = [];
  p.save(missing);
  assert.ok(p.assess().diagnostics.some((d) => d.code === "EXECUTION_IDENTITY_REQUIRED"));
});

test("2.2 cannot omit assurance or run results, or downgrade new fields", (t) => {
  const p = project(t);
  assert.equal(p.record().status, 0);
  const saved = p.read();
  for (const variant of ["assurance", "result", "downgrade"]) {
    const s = structuredClone(saved);
    if (variant === "assurance") delete s.deliveryControl.assurance;
    if (variant === "result") delete s.deliveryControl.verificationRuns[0].result;
    if (variant === "downgrade") s.schemaVersion = "2.1";
    p.save(s);
    assert.equal(p.assess().readiness, "blocked");
  }
});

test("selection changes invalidate recorded results; summary cannot reseal them", (t) => {
  const p = project(t);
  assert.equal(p.record().status, 0); p.review();
  const s = p.read();
  s.deliveryControl.testSelections[0].selectedTestIds.push("new-case");
  p.save(s);
  assert.equal(p.assess().checks[0].status, "STALE");
  const before = fs.readFileSync(p.statusPath, "utf8");
  assert.equal(p.cli("summary", ["--json"]).status, 1);
  assert.equal(fs.readFileSync(p.statusPath, "utf8"), before);
});

test("selected obligations require fixture evidence and accept compatible methods", (t) => {
  const p = project(t, (c, status, root) => {
    fs.writeFileSync(path.join(root, "fixture.json"), "{}");
    c.snapshots[0].files.push({ path: "fixture.json", kind: "fixture", hash: hash("{}") });
    c.verificationPacks = [{ id: "cache", kind: "cache_consistency", version: "2", decision: "selected",
      triggerRef: "prd.md", rationale: "internal ordering", checkIds: ["target-check"] }];
    c.assurance.obligations = [{ id: "order", packId: "cache", kind: "cache-ordering",
      entryRef: "src/example.js", fixtureRef: "fixture.json", assertion: "late result cannot replace new value", checkIds: ["target-check"] }];
  });
  assert.equal(p.record().status, 0); p.review();
  assert.equal(p.assess().readiness, "ready");
  const saved = p.read();
  const noObligation = structuredClone(saved);
  noObligation.deliveryControl.assurance.obligations = [];
  p.save(noObligation);
  assert.ok(p.assess().diagnostics.some((d) => d.code === "PACK_OBLIGATION_REQUIRED"));
  p.save(saved); fs.unlinkSync(path.join(p.root, "fixture.json"));
  assert.ok(p.assess().diagnostics.some((d) => d.code === "OBLIGATION_FIXTURE_REQUIRED"));
});

test("SDK/API consumers require complete facets and reject unit-only evidence", async (t) => {
  for (const kind of ["sdk", "api"]) await t.test(kind, (t) => {
    const p = project(t), s = p.read(), c = s.deliveryControl;
    c.acceptance[1].kind = "consumer"; c.impactScopes[0].consumers = ["actual consumer"];
    const names = kind === "sdk" ? ["default-export", "legacy-call", "instance-identity", "installed-entry"] :
      ["required-parameters", "caller-entry", "response"];
    c.assurance.consumerContracts = [{ id: kind, scopeId: "scope-main", kind,
      producer: { repository: "producer", version: "a", entryRef: "actual producer" },
      consumer: { repository: "consumer", version: "b", entryRef: "actual consumer" },
      samplePath: "missing-sample.json",
      facets: names.map((name) => ({ name, decision: "required", basisRef: "spec.md", checkIds: ["preserve-check"] })),
    }];
    p.save(s);
    assert.ok(p.assess().diagnostics.some((d) => d.code === "CONSUMER_CHECK_INVALID"));
    c.acceptance[1].checks[0].method = "integration"; p.save(s);
    assert.ok(p.assess().diagnostics.some((d) => d.code === "CONSUMER_SAMPLE_REQUIRED"));
    c.assurance.consumerContracts[0].facets.pop(); p.save(s);
    assert.ok(p.assess().diagnostics.some((d) => d.code === "CONSUMER_FACET_UNCOVERED"));
    c.assurance.consumerContracts = []; p.save(s);
    assert.ok(p.assess().diagnostics.some((d) => d.code === "CONSUMER_CONTRACT_REQUIRED"));
  });
});
