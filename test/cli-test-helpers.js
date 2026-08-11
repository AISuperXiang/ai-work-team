"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");

function createTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
}

function cleanupDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function runCli(script, args = [], options = {}) {
  return spawnSync(process.execPath, [path.join(PROJECT_ROOT, script), ...args], {
    cwd: options.cwd || PROJECT_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      ...options.env,
    },
  });
}

function createFakeNpx(binDir, logPath) {
  const scriptPath = path.join(binDir, "npx");
  const nodePath = path.join(binDir, "node");
  const homeDir = path.join(binDir, "home");
  fs.mkdirSync(binDir, { recursive: true });
  fs.mkdirSync(homeDir, { recursive: true });
  fs.symlinkSync(process.execPath, nodePath);
  fs.writeFileSync(
    scriptPath,
    [
      "#!/usr/bin/env node",
      '"use strict";',
      'const fs = require("fs");',
      "fs.appendFileSync(",
      "  process.env.MOCK_NPX_LOG,",
      '  `${JSON.stringify(process.argv.slice(2))}\\n`,',
      ");",
      "process.exit(Number(process.env.MOCK_NPX_EXIT || 0));",
      "",
    ].join("\n"),
    "utf8",
  );
  fs.chmodSync(scriptPath, 0o755);

  return {
    env: {
      HOME: homeDir,
      MOCK_NPX_LOG: logPath,
      PATH: `${binDir}${path.delimiter}${process.env.PATH || ""}`,
    },
  };
}

module.exports = {
  PROJECT_ROOT,
  cleanupDir,
  createFakeNpx,
  createTempDir,
  runCli,
};
