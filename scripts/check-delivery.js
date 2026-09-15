#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const { CliArgumentError, parseCliArgs } = require("./cli-args");
const { readStableFile, resolveSafePath } = require("./safe-files");
const {
  validateDeliveryControl,
  evaluateDeliveryControl,
  contractDigest,
  impactScopeDigest,
  snapshotDigest,
} = require("./delivery-controls");

const MAX_STATUS_BYTES = 256 * 1024;

function main(argv) {
  const { options, positionals } = parseCliArgs(argv, { options: {
    "--help": { key: "help", type: "boolean", aliases: ["-h"] },
    "--project-root": { key: "projectRoot", type: "value" },
    "--workspace": { key: "workspace", type: "value" },
    "--mode": { key: "mode", type: "value", choices: ["capture", "assess"] },
    "--json": { key: "json", type: "boolean" },
  } });
  if (positionals.length) throw new CliArgumentError("Unexpected positional input");
  if (options.help) {
    if (Object.keys(options).length !== 1) throw new CliArgumentError("--help cannot be combined with other arguments");
    console.log("Usage: node scripts/check-delivery.js --project-root <root> --workspace <relative-dir> [--mode capture|assess] [--json]");
    return;
  }
  if (!options.projectRoot || !options.workspace) throw new CliArgumentError("--project-root and --workspace are required");
  const root = fs.realpathSync(options.projectRoot);
  if (!fs.statSync(root).isDirectory()) throw new CliArgumentError("Project root must be a directory");
  const workspace = resolveSafePath(root, options.workspace);
  if (!fs.statSync(workspace).isDirectory()) throw new CliArgumentError("Workspace must be a directory");
  const statusPath = resolveSafePath(workspace, "workflow-status.json");
  let status;
  try {
    status = JSON.parse(readStableFile(statusPath, {
      maxBytes: MAX_STATUS_BYTES,
      changedMessage: "Input changed during capture",
    }));
  }
  catch (error) {
    if (error instanceof CliArgumentError) throw error;
    throw new Error("Status is unavailable, oversized or invalid JSON");
  }
  const operation = options.mode || "assess";
  const errors = validateDeliveryControl(status);
  let output;
  if (errors.length) output = { operation, subject: "unknown", readiness: "blocked", diagnostics: errors };
  else if (!status.schemaVersion) output = { operation, ...evaluateDeliveryControl(status) };
  else {
    const c = status.deliveryControl;
    // The last snapshot is the explicit capture manifest, not an inferred
    // dependency graph. "missing" hashes permit initial capture and deletions.
    const manifest = c.snapshots.at(-1);
    if (!manifest) throw new Error("Add an explicit snapshot file manifest before capture");
    const files = manifest.files.map((entry) => {
      const file = resolveSafePath(root, entry.path, { allowMissing: true });
      return {
        ...entry,
        hash: file ? readStableFile(file, {
          maxBytes: 1024 * 1024 * 1024,
          hashOnly: true,
          changedMessage: "Input changed during capture",
        }) : "missing",
      };
    });
    const git = spawnSync("git", ["-C", root, "rev-parse", "HEAD"], { shell: false, encoding: "utf8", timeout: 5000 });
    const snapshot = { id: manifest.id, headSha: git.status === 0 ? git.stdout.trim() : null,
      baseSha: manifest.baseSha, files, codeDigest: snapshotDigest(files) };
    if (operation === "capture") {
      output = { operation, subject: c.taskMode === "implementation" ? "implementation" : "analysis",
        snapshot, contractDigest: contractDigest(c), impactScopeDigest: impactScopeDigest(c), diagnostics: [] };
    } else {
      const outputHashes = Object.create(null);
      const evidence = [
        ...c.verificationRuns.flatMap((run) => run.outputRefs),
        ...c.environmentProbes.map((probe) => probe.evidence),
      ];
      for (const entry of evidence) {
        if (Object.prototype.hasOwnProperty.call(outputHashes, entry.path)) continue;
        const file = resolveSafePath(workspace, entry.path, { allowMissing: true });
        outputHashes[entry.path] = file ? readStableFile(file, {
          maxBytes: 1024 * 1024 * 1024,
          hashOnly: true,
          changedMessage: "Input changed during capture",
        }) : null;
      }
      output = { operation, ...evaluateDeliveryControl(status, { snapshot, outputHashes }) };
    }
  }
  if (options.json) console.log(JSON.stringify(output, null, 2));
  else {
    console.log(`${output.operation}: ${output.readiness || "captured"} (${output.subject})`);
    console.log(JSON.stringify(output, null, 2));
  }
  process.exitCode = output.operation === "capture" && output.snapshot || output.readiness === "ready" ? 0 : 1;
}

try { main(process.argv.slice(2)); }
catch (error) {
  const exitCode = error instanceof CliArgumentError ? 2 : 1;
  const output = { operation: "error", subject: "unknown", readiness: "blocked",
    diagnostics: [{ code: exitCode === 2 ? "INVALID_INPUT" : "READ_FAILED", detail: exitCode === 2 ? error.message : "Cannot safely read delivery inputs" }] };
  if (process.argv.includes("--json")) console.log(JSON.stringify(output));
  else console.error(output.diagnostics[0].detail);
  process.exitCode = exitCode;
}
