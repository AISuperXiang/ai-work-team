#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { CliArgumentError, parseCliArgs } = require("./cli-args");
const { resolveSafePath } = require("./safe-files");
const { MAX_STATUS_BYTES, readJson, hashFile, openDelivery, captureSnapshot, captureContext } = require("./delivery-inputs");
const { validateShape, validateDeliveryControl, evaluateDeliveryControl, digest, contractDigest,
  impactScopeDigest, kindDigest, environmentSelectionDigest, recordSourceDigest, coverageDigest } = require("./delivery-controls");
const { runBinding, layerOutcome } = require("./delivery-assurance");
const { startTask } = require("./workspace-tasks");
const schema = require("../schemas/status.schema.json");
const ref = (name) => ({ $ref: `#/$defs/${name}` });
class RecordError extends Error {}
const INPUT = {
  type: "object", additionalProperties: false,
  required: ["id", "purpose", "selectionId", "snapshotId", "environmentProbeIds", "bindingDigest",
    "startedAt", "finishedAt", "source", "method", "level", "execution", "observations", "outputPaths", "fixIds", "sanitized"],
  properties: {
    id: ref("text"), purpose: schema.$defs.run.properties.purpose,
    selectionId: ref("text"), snapshotId: ref("text"), environmentProbeIds: ref("ids"),
    bindingDigest: ref("digest"), startedAt: ref("text"), finishedAt: ref("text"),
    source: schema.$defs.run.properties.source, method: schema.$defs.check.properties.method,
    level: schema.$defs.run.properties.level, execution: schema.$defs.run.properties.execution,
    manualRef: ref("text"), assertion: schema.$defs.result.properties.assertion,
    executed: { type: "integer" }, runner: ref("processResult"), wrapper: ref("processResult"),
    observations: schema.$defs.run.properties.observations, outputPaths: ref("paths"),
    fixIds: ref("ids"), sanitized: { const: true },
    supersedesRunIds: ref("ids"), reason: ref("text"),
  },
};

function requireValid(status) {
  const errors = validateDeliveryControl(status);
  if (errors.length) throw new RecordError(`Invalid state: ${errors.map((e) => e.code).join(",")}`);
}

function inputs(c, selectionId, snapshotId, probeIds) {
  const selection = c.testSelections.find((s) => s.id === selectionId);
  const snapshot = c.snapshots.find((s) => s.id === snapshotId);
  const probes = probeIds.map((id) => c.environmentProbes.find((p) => p.id === id));
  const invocation = c.invocations.find((i) => i.id === c.currentInvocationId);
  if (!selection || !snapshot || probes.some((p) => !p) ||
      !probes.some((p) => p.phase === "before") || new Set(probeIds).size !== probeIds.length) {
    throw new RecordError("Missing or ambiguous run inputs");
  }
  if (selection.invocationId !== invocation?.id ||
      !["run_verification", "append_evidence"].every((action) => invocation.allowedActions.includes(action))) {
    throw new RecordError("Current invocation cannot record verification");
  }
  if (invocation.contractRevision !== c.activeContractRevision || invocation.snapshotId !== snapshot.id ||
      !c.assurance.executionIdentities.some((i) => i.invocationId === invocation.id)) {
    throw new RecordError("Initialize the current invocation and snapshot first");
  }
  return { selection, snapshot, probes, invocation };
}

function checkFiles(root, workspace, snapshot, probes) {
  if (captureSnapshot(root, snapshot).codeDigest !== snapshot.codeDigest) throw new RecordError("Snapshot changed");
  for (const probe of probes) {
    if (hashFile(workspace, probe.evidence.path) !== probe.evidence.hash) throw new RecordError("Probe evidence changed");
  }
}

function importRun(input, source, c, root, workspace) {
  if (validateShape(input, INPUT).length) throw new CliArgumentError("Invalid structured result");
  const { selection, snapshot, probes } = inputs(c, input.selectionId, input.snapshotId, input.environmentProbeIds);
  checkFiles(root, workspace, snapshot, probes);
  const binding = runBinding(c, selection, snapshot, probes);
  if (input.bindingDigest !== binding) throw new RecordError("Prepared inputs changed");
  if (c.verificationRuns.some((run) => run.id === input.id)) throw new RecordError("Run ID already recorded");
  if (Date.parse(input.startedAt) < Date.parse(c.assurance.executionIdentities.find((i) => i.invocationId === selection.invocationId).capturedAt) ||
      Date.parse(input.startedAt) < Date.parse(selection.createdAt)) throw new RecordError("Result predates invocation or selection");
  const unknown = { status: "unknown", exitCode: null, sourceRef: "not reported by source" };
  const result = {
    origin: "structured_import", source, assertion: input.assertion || "unknown",
    executed: input.executed ?? 0, runner: input.runner || unknown, wrapper: input.wrapper || unknown,
    bindingDigest: binding,
  };
  const outcome = layerOutcome(result, input.source === "manual");
  const paths = [...new Set([...input.outputPaths, source.path])];
  const run = {
    id: input.id, purpose: input.purpose, contractRevision: c.activeContractRevision,
    contractDigest: contractDigest(c), impactScopeDigest: impactScopeDigest(c),
    snapshotId: snapshot.id, source: input.source, method: input.method, level: input.level,
    startedAt: input.startedAt, finishedAt: input.finishedAt,
    execution: input.execution && { ...input.execution, exitCode: result.runner.exitCode },
    ...(input.manualRef ? { manualRef: input.manualRef } : {}),
    environmentKey: probes[0].environmentKey, environmentRef: probes[0].sourceRef,
    environmentProbeIds: input.environmentProbeIds, environmentDigest: environmentSelectionDigest(probes),
    artifactDigest: kindDigest(snapshot.files, "artifact"), fixtureDigest: kindDigest(snapshot.files, "fixture"),
    runStatus: outcome === "unknown" ? "blocked" : outcome === "not_run" ? "not_run" : "completed",
    failureKind: outcome === "unknown" ? "unknown" : outcome === "fail" ? "assertion" : "none",
    observations: input.observations, outputRefs: paths.map((p) => ({ path: p, hash: hashFile(workspace, p) })),
    result,
    ...(input.supersedesRunIds ? { supersedesRunIds: input.supersedesRunIds } : {}),
    ...(input.reason ? { reason: input.reason } : {}),
  };
  if (input.execution && input.runner && input.execution.exitCode !== input.runner.exitCode) {
    throw new CliArgumentError("Runner and execution exit codes disagree");
  }
  if (input.purpose !== "baseline" && input.fixIds.length) throw new CliArgumentError("fixIds only link baselines");
  if (input.purpose === "baseline" && !input.fixIds.length) throw new CliArgumentError("Baseline fixIds are required");
  for (const id of input.fixIds) {
    const fix = c.fixes.find((f) => f.id === id);
    const targets = c.acceptance.filter((a) => fix?.targetAcceptanceIds.includes(a.id)).flatMap((a) => a.checks.map((ch) => ch.id));
    if (!fix || !input.observations.some((o) => targets.includes(o.checkId))) throw new RecordError("Baseline does not observe this fix");
    fix.baselineRunIds.push(run.id);
  }
  c.verificationRuns.push(run);
  selection.runIds.push(run.id);
  for (const observation of run.observations) {
    const check = c.acceptance.flatMap((a) => a.checks).find((ch) => ch.id === observation.checkId);
    if (!check || check.caseKey !== observation.caseKey || check.method !== run.method ||
        check.environmentKey !== run.environmentKey || !selection.selectedCheckIds.includes(check.id)) {
      throw new RecordError("Observation does not match selected check");
    }
    if (run.purpose !== "baseline") check.evidenceIds.push(run.id);
  }
  return run;
}

function commitState(opened, expected, next) {
  const { root, workspace, statusPath } = opened;
  const serialized = `${JSON.stringify(next, null, 2)}\n`;
  if (Buffer.byteLength(serialized) > MAX_STATUS_BYTES) throw new RecordError("State exceeds size limit");
  // Cooperating writers serialize via an exclusive lock, then recheck the
  // caller's digest. A stale lock is never removed by this command.
  const lock = path.join(workspace, ".record-evidence.lock");
  const descriptor = fs.openSync(lock, "wx", 0o600);
  const temporary = path.join(workspace, `.record-evidence-${randomUUID()}.json`);
  try {
    resolveSafePath(root, path.relative(root, statusPath).split(path.sep).join("/"));
    if (digest(readJson(statusPath)) !== expected) throw new RecordError("State digest conflict");
    fs.writeFileSync(temporary, serialized, { flag: "wx", mode: 0o600 });
    if (digest(readJson(statusPath)) !== expected) throw new RecordError("State digest conflict");
    fs.renameSync(temporary, statusPath);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    fs.closeSync(descriptor);
    fs.unlinkSync(lock);
  }
}

function main(argv) {
  const { options: o, positionals } = parseCliArgs(argv, { options: {
    "--help": { key: "help", type: "boolean", aliases: ["-h"] },
    "--project-root": { key: "root", type: "value" }, "--workspace": { key: "workspace", type: "value" },
    "--mode": { key: "mode", type: "value", choices: ["start", "prepare", "import", "summary"] },
    "--input": { key: "input", type: "value" },
    "--selection": { key: "selection", type: "value" }, "--snapshot": { key: "snapshot", type: "value" },
    "--probes": { key: "probes", type: "value" },
    "--authorization-ref": { key: "authorization", type: "value" },
    "--expected-state-digest": { key: "expected", type: "value", validate: (v) => /^[a-f0-9]{64}$/.test(v) },
    "--json": { key: "json", type: "boolean" }, "--dry-run": { key: "dry", type: "boolean" },
  } });
  if (positionals.length) throw new CliArgumentError("Unexpected positional input");
  if (o.help) {
    if (Object.keys(o).length !== 1) throw new CliArgumentError("--help must be used alone");
    console.log("Usage: record-evidence --project-root <root> --workspace <relative-dir> --mode start|prepare|import|summary [--expected-state-digest <sha256>] [--input <relative-json>] [--selection <id> --snapshot <id> --probes <id,id>] [--authorization-ref <ref>] [--json|--dry-run]");
    return;
  }
  if (!o.root || !o.workspace || !o.mode) throw new CliArgumentError("project-root, workspace and mode are required");
  if (o.json && o.dry) throw new CliArgumentError("Choose --json or --dry-run");
  const extras = { start: ["authorization", "expected"], prepare: ["selection", "snapshot", "probes"],
    import: ["input", "expected"], summary: [] };
  for (const k of ["authorization", "expected", "selection", "snapshot", "probes", "input"]) {
    if (o[k] && !extras[o.mode].includes(k)) throw new CliArgumentError(`Option ${k} conflicts with mode`);
  }
  if (o.mode === "prepare" && (!o.selection || !o.snapshot || !o.probes) ||
      o.mode === "import" && !o.input) throw new CliArgumentError("Mode arguments are missing");
  const opened = openDelivery(o.root, o.workspace);
  const { root, workspace, status } = opened;
  if (status.schemaVersion !== "2.2") throw new RecordError("Explicit 2.2 state required; no automatic migration");
  requireValid(status);
  const expected = digest(status);
  if (o.expected && expected !== o.expected) throw new RecordError("State digest conflict");
  const c = status.deliveryControl;
  let output = { operation: o.mode, stateDigest: expected };
  if (o.mode === "prepare") {
    const { selection, snapshot, probes } = inputs(c, o.selection, o.snapshot, o.probes.split(","));
    checkFiles(root, workspace, snapshot, probes);
    output.bindingDigest = runBinding(c, selection, snapshot, probes);
    output.coverageDigest = coverageDigest(c);
  } else if (o.mode === "summary") {
    output = { ...output, sourceDigest: recordSourceDigest(c),
      claim: c.completion.claim, ...evaluateDeliveryControl(status, captureContext(root, workspace, c)) };
  } else {
    if (!o.expected && !o.json && !o.dry) throw new CliArgumentError("Writes require --expected-state-digest");
    if (o.mode === "start") {
      if (!c.invocations.length && !o.authorization) {
        throw new CliArgumentError("First invocation requires --authorization-ref");
      }
      startTask(status, {
        authorizationRef: o.authorization || c.invocations.at(-1)?.authorizationRef,
        skillRoot: path.resolve(__dirname, ".."),
      });
    } else {
      if (["accepted", "analysis_complete"].includes(c.completion.claim)) throw new RecordError("Reopen before importing evidence");
      const inputPath = resolveSafePath(workspace, o.input);
      const source = { path: o.input, hash: hashFile(workspace, o.input) };
      const input = readJson(inputPath);
      output.run = importRun(input, source, c, root, workspace);
      if (hashFile(workspace, o.input) !== source.hash) throw new RecordError("Result changed during import");
    }
    c.recordPolicy.summarySourceDigest = recordSourceDigest(c);
    requireValid(status);
    output.nextStateDigest = digest(status);
    output.summary = { taskId: c.taskId, invocationId: c.currentInvocationId, claim: c.completion.claim,
      sourceDigest: recordSourceDigest(c), runCount: c.verificationRuns.length };
    if (!o.json && !o.dry) commitState(opened, o.expected, status);
    output.written = !o.json && !o.dry;
  }
  console.log(JSON.stringify(output, null, 2));
  if (o.mode === "summary" && output.readiness !== "ready") process.exitCode = 1;
}

try { main(process.argv.slice(2)); }
catch (error) {
  process.exitCode = error instanceof CliArgumentError ? 2 : 1;
  console.log(JSON.stringify({ operation: "error", code: process.exitCode === 2 ? "INVALID_INPUT" : "RECORD_FAILED",
    detail: error instanceof CliArgumentError || error instanceof RecordError ? error.message : "Cannot safely read or write evidence files; check paths, size and lock owner" }));
}
