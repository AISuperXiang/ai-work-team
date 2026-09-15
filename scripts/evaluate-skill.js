#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const { CliArgumentError, parseCliArgs } = require("./cli-args");
const { readStableFile, resolveSafePath } = require("./safe-files");
const {
  summarizeSkillEvaluation,
} = require("./skill-evaluation");

const MAX_INPUT_BYTES = 256 * 1024;

function readSafeJson(root, relativePath) {
  const file = resolveSafePath(root, relativePath, {
    label: "--input",
    rejectSensitive: true,
  });
  const content = readStableFile(file, {
    maxBytes: MAX_INPUT_BYTES,
    regularFileMessage: "Evaluation input must be a regular file",
    sizeLimitMessage: "Evaluation input exceeds the size limit",
    changedMessage: "Evaluation input changed while reading",
  });
  try {
    return JSON.parse(content);
  } catch {
    throw new Error("Evaluation input is not valid JSON");
  }
}

function main(argv) {
  const { options, positionals } = parseCliArgs(argv, {
    options: {
      "--help": { key: "help", type: "boolean", aliases: ["-h"] },
      "--input": { key: "input", type: "value" },
      "--json": { key: "json", type: "boolean" },
    },
  });
  if (positionals.length) throw new CliArgumentError("Unexpected positional input");
  if (options.help) {
    if (Object.keys(options).length !== 1) {
      throw new CliArgumentError("--help cannot be combined with other arguments");
    }
    console.log("Usage: node scripts/evaluate-skill.js --input <relative-json> [--json]");
    return;
  }
  if (!options.input) throw new CliArgumentError("--input is required");
  const root = fs.realpathSync(process.cwd());
  const summary = summarizeSkillEvaluation(readSafeJson(root, options.input));
  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`offline=${summary.offline.status} pilot=${summary.pilot.status} decision=${summary.decision}`);
    if (summary.diagnostics.length) {
      console.log(JSON.stringify(summary.diagnostics, null, 2));
    }
  }
  process.exitCode = summary.decision === "adopt" ? 0 : 1;
}

try {
  main(process.argv.slice(2));
} catch (error) {
  const exitCode = error instanceof CliArgumentError ? 2 : 1;
  const output = {
    evaluationId: null,
    offline: { status: "inconclusive" },
    pilot: { status: "inconclusive" },
    decision: "hold",
    diagnostics: [{
      code: exitCode === 2 ? "INVALID_INPUT" : "READ_FAILED",
      detail: exitCode === 2 ? error.message : "Cannot safely read evaluation input",
    }],
  };
  if (process.argv.includes("--json")) console.log(JSON.stringify(output));
  else console.error(output.diagnostics[0].detail);
  process.exitCode = exitCode;
}
