"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  isPackageValid,
  matchSkills,
} = require("../scripts/external-skill-utils");

const catalog = {
  skills: [
    {
      id: "react-performance",
      name: "React Performance",
      package: "owner/repo@react-performance",
      qualityTier: "recommended",
      trustScore: 0.9,
      roles: ["frontend-engineer"],
      keywords: ["react", "performance"],
      scenarios: ["React render performance"],
      useWhen: ["optimize React"],
      doNotUseWhen: ["backend"],
    },
    {
      id: "react-candidate",
      name: "React Candidate",
      package: "owner/repo@react-candidate",
      qualityTier: "candidate",
      trustScore: 0.7,
      roles: ["frontend-engineer"],
      keywords: ["react"],
      scenarios: [],
      useWhen: [],
      doNotUseWhen: [],
    },
    {
      id: "backend-performance",
      name: "Backend Performance",
      package: "owner/repo@backend-performance",
      qualityTier: "recommended",
      trustScore: 0.95,
      roles: ["backend-engineer"],
      keywords: ["performance"],
      scenarios: [],
      useWhen: [],
      doNotUseWhen: [],
    },
  ],
};

test("isPackageValid accepts only owner/repo@skill selectors", () => {
  assert.equal(isPackageValid("owner/repo@skill"), true);
  assert.equal(isPackageValid("owner/repo@skill;rm"), false);
  assert.equal(isPackageValid("https://example.com/repo"), false);
  assert.equal(isPackageValid("../local@skill"), false);
});

test("matchSkills applies role, quality, task, and top constraints", () => {
  const matches = matchSkills(catalog, {
    role: "frontend-engineer",
    quality: "recommended",
    task: "React performance",
    top: 1,
  });

  assert.equal(matches.length, 1);
  assert.equal(matches[0].skill.id, "react-performance");
  assert.equal(matches[0].match.roleMatched, true);
  assert.equal(matches[0].match.taskMatched, true);
});

test("matchSkills excludes role mismatches and negative-only queries", () => {
  const roleMismatch = matchSkills(catalog, {
    role: "qa-engineer",
    task: "performance",
  });
  const negativeOnly = matchSkills(catalog, {
    role: "frontend-engineer",
    task: "backend",
  });

  assert.deepEqual(roleMismatch, []);
  assert.deepEqual(negativeOnly, []);
});
