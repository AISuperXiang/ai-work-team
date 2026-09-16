#!/usr/bin/env node
"use strict";

const { CliArgumentError, parseCliArgs } = require("./cli-args");
const { openDelivery, captureSnapshot, captureContext } = require("./delivery-inputs");
const {
  validateDeliveryControl,
  evaluateDeliveryControl,
  contractDigest,
  impactScopeDigest,
} = require("./delivery-controls");

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
  const { root, workspace, status } = openDelivery(options.projectRoot, options.workspace);
  const operation = options.mode || "assess";
  const errors = validateDeliveryControl(status);
  let output;
  if (errors.length) output = { operation, subject: "unknown", readiness: "blocked", diagnostics: errors };
  else if (!status.schemaVersion) output = { operation, ...evaluateDeliveryControl(status) };
  else {
    const c = status.deliveryControl;
    // The last snapshot is the explicit capture manifest, not an inferred
    // dependency graph. "missing" hashes permit initial capture and deletions.
    if (operation === "capture") {
      const snapshot = captureSnapshot(root, c.snapshots.at(-1));
      output = { operation, subject: c.taskMode === "implementation" ? "implementation" : "analysis",
        snapshot, contractDigest: contractDigest(c), impactScopeDigest: impactScopeDigest(c), diagnostics: [] };
    } else {
      output = { operation, ...evaluateDeliveryControl(status, captureContext(root, workspace, c)) };
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
