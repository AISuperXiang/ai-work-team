"use strict";

const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const { CliArgumentError } = require("./cli-args");
const { readStableFile, resolveSafePath } = require("./safe-files");
const { snapshotDigest } = require("./delivery-controls");
const MAX_STATUS_BYTES = 256 * 1024;
const readJson = (file) => JSON.parse(readStableFile(file, { maxBytes: MAX_STATUS_BYTES }));
const hashFile = (root, relative, allowMissing = false) => {
  const file = resolveSafePath(root, relative, { allowMissing });
  return file ? readStableFile(file, { maxBytes: 1024 * 1024 * 1024, hashOnly: true }) : null;
};

function openDelivery(projectRoot, relativeWorkspace) {
  const root = fs.realpathSync(projectRoot);
  if (!fs.statSync(root).isDirectory()) throw new CliArgumentError("Project root must be a directory");
  const workspace = resolveSafePath(root, relativeWorkspace);
  if (!fs.statSync(workspace).isDirectory()) throw new CliArgumentError("Workspace must be a directory");
  const statusPath = resolveSafePath(workspace, "workflow-status.json");
  return { root, workspace, statusPath, status: readJson(statusPath) };
}

function captureSnapshot(root, manifest) {
  if (!manifest) throw new Error("Add an explicit snapshot file manifest before capture");
  const files = manifest.files.map((entry) => ({ ...entry, hash: hashFile(root, entry.path, true) || "missing" }));
  const git = spawnSync("git", ["-C", root, "rev-parse", "HEAD"], { shell: false, encoding: "utf8", timeout: 5000 });
  return { id: manifest.id, headSha: git.status === 0 ? git.stdout.trim() : null,
    baseSha: manifest.baseSha, files, codeDigest: snapshotDigest(files) };
}

function captureContext(root, workspace, c) {
  const snapshot = captureSnapshot(root, c.snapshots.at(-1));
  const outputHashes = Object.create(null);
  for (const entry of [...c.verificationRuns.flatMap((run) => run.outputRefs),
    ...c.environmentProbes.map((probe) => probe.evidence)]) {
    if (!Object.prototype.hasOwnProperty.call(outputHashes, entry.path)) {
      outputHashes[entry.path] = hashFile(workspace, entry.path, true);
    }
  }
  return { snapshot, outputHashes };
}

module.exports = { MAX_STATUS_BYTES, readJson, hashFile, openDelivery, captureSnapshot, captureContext };
