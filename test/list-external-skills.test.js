"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { runCli } = require("./cli-test-helpers");

test("list-external-skills returns the requested skill", () => {
  const result = runCli("scripts/list-external-skills.js", [
    "--skill",
    "frontend-design",
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^frontend-design \[recommended\]/m);
  assert.doesNotMatch(result.stdout, /^security-review \[/m);
});

test("list-external-skills applies role, query, and top filters", () => {
  const result = runCli("scripts/list-external-skills.js", [
    "--role",
    "frontend-engineer",
    "--query",
    "React 页面性能",
    "--top",
    "1",
  ]);

  assert.equal(result.status, 0, result.stderr);
  const resultLines = result.stdout
    .split(/\r?\n/)
    .filter((line) => /^\S+ \[(recommended|candidate)\] score=/.test(line));
  assert.equal(resultLines.length, 1);
  assert.match(resultLines[0], /vercel-react-best-practices/);
});

for (const args of [
  ["--unknown"],
  ["--role"],
  ["--top", "NaN"],
  ["--quality", "trusted"],
]) {
  test(`list-external-skills rejects invalid arguments: ${args.join(" ")}`, () => {
    const result = runCli("scripts/list-external-skills.js", args);

    assert.equal(result.status, 2);
    assert.match(result.stderr, /(unknown option|requires a value|invalid)/i);
  });
}
