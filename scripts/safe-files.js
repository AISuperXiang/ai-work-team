"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { CliArgumentError } = require("./cli-args");

function isSafeRelativePath(value, options = {}) {
  if (typeof value !== "string" || !value || value.startsWith("/") ||
      /^[A-Za-z]:/.test(value) || value.includes("\\") ||
      /[\0-\x1f]/.test(value)) return false;
  if (options.allowDot === true && value === ".") return true;
  const parts = value.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) return false;
  if (options.rejectSensitive !== false &&
      (parts.some((part) => /^(\.git|\.env(?:\..*)?|\.ssh|\.aws|credentials(?:\..*)?|auth-state(?:\..*)?|storage-state(?:\..*)?)$/i.test(part)) ||
       /(?:^|\/)(?:account|cookies|tokens|secrets)\.json$/i.test(value))) return false;
  return true;
}

function resolveSafePath(root, relativePath, options = {}) {
  const label = options.label || "Input path";
  if (!isSafeRelativePath(relativePath, {
    allowDot: options.allowDot,
    rejectSensitive: options.rejectSensitive,
  })) {
    throw new CliArgumentError(`${label} must be a normalized relative path`);
  }
  let current = root;
  const parts = relativePath.split("/");
  for (const [index, part] of parts.entries()) {
    current = path.join(current, part);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if (options.allowMissing && error.code === "ENOENT") return null;
      throw new Error(`${label} is unavailable`);
    }
    if (stat.isSymbolicLink()) {
      throw new CliArgumentError("Symlink paths are not allowed");
    }
    if (index < parts.length - 1 && !stat.isDirectory()) {
      throw new CliArgumentError("Parent path is not a directory");
    }
  }
  return current;
}

function readStableFile(file, options) {
  const descriptor = fs.openSync(
    file,
    fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK,
  );
  try {
    const before = fs.fstatSync(descriptor);
    if (!before.isFile()) {
      throw new CliArgumentError(options.regularFileMessage || "Input must be a regular file");
    }
    if (before.size > options.maxBytes) {
      throw new Error(options.sizeLimitMessage || "Input exceeds the size limit");
    }
    const hash = createHash("sha256");
    const chunks = [];
    const buffer = Buffer.alloc(65536);
    let total = 0;
    let length;
    while ((length = fs.readSync(descriptor, buffer, 0, buffer.length, null)) > 0) {
      total += length;
      if (total > options.maxBytes) {
        throw new Error(options.sizeLimitMessage || "Input exceeds the size limit");
      }
      const chunk = buffer.subarray(0, length);
      hash.update(chunk);
      if (!options.hashOnly) chunks.push(Buffer.from(chunk));
    }
    const after = fs.fstatSync(descriptor);
    if (before.size !== after.size ||
        before.mtimeMs !== after.mtimeMs ||
        before.ctimeMs !== after.ctimeMs) {
      throw new Error(options.changedMessage || "Input changed while reading");
    }
    return options.hashOnly
      ? hash.digest("hex")
      : Buffer.concat(chunks).toString(options.encoding || "utf8");
  } finally {
    fs.closeSync(descriptor);
  }
}

module.exports = {
  isSafeRelativePath,
  readStableFile,
  resolveSafePath,
};
