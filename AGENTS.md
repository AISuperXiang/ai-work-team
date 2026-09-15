# AGENTS.md

## Scope

These rules apply to the entire `ai-work-team` repository. Read `SKILL.md` first, then load only the workflow, role, methodology, and template files required by the current task.

## CLI Safety Rules

- Use `scripts/cli-args.js` for Node CLI argument parsing.
- Unknown options, missing values, duplicate flags, and conflicting flags must exit with code `2`.
- Never ignore a misspelled flag or let invalid input fall back to bulk installation.
- Keep child-process calls as argv arrays with `shell: false`.
- Preserve existing public CLI paths and valid argument behavior unless a breaking change is explicitly approved.

## File Write Rules

- User-controlled output paths must be relative and remain inside the declared workdir.
- Read-only CLI inputs must reuse `scripts/safe-files.js` instead of duplicating path, symlink, size, or stable-read checks.
- Reject absolute paths, `..` traversal, parent-directory symlink escapes, and symlink output files.
- Only write regular files whose parent directory already exists.
- If an existing managed file exceeds 256 KiB or cannot be read safely, fail without modifying it.
- Dry-run and JSON modes must not write files.
- Preserve manual content outside managed markers and keep repeated updates idempotent.

## Test Rules

- Use CommonJS with Node built-in `node:test` and `node:assert` for CLI behavior tests.
- Execute real CLI entrypoints with `process.execPath`; do not test only internal helpers.
- Use a fake `npx` through an isolated temporary `PATH`. Tests must not access the network or modify the real global Skill installation.
- Use temporary directories for all write tests and clean them after each test.
- Cover success, failure, boundary, exit-code, and side-effect behavior.
- `npm test` must run structure validation, core contract validation, and behavior tests.

## Mutation Rules

- `npm run test:mutation` must report a score of at least 85%.
- Critical mutants must have zero survivors.
- Critical mutants include argument-validation bypasses, path and file-size guard bypasses, install policy bypasses, subprocess exit-code loss, workspace/core contract coupling, and direct-success CLI kill switches.
- Add or update mutation cases whenever a new critical branch is introduced.

## Contract Validation Rules

- `npm run validate:contracts` validates publishable core contracts only.
- `scripts/check-delivery.js` is read-only. It may hash only explicit relative regular files under the declared project/workspace roots; it must never execute recorded argv, fetch evidence URLs, write status, or infer that hashes prove business correctness.
- V2.1 delivery claims require a confirmed active contract, explicit task-scoped test selection, catalog health, and per-check evidence. Global verification levels, successful process exit, known-failure labels, or quality scores must not replace method, case, environment, snapshot, output, and evidence-review matching.
- Resume, verify, review, and deliver invocations must preserve their action boundary. Verify/review/deliver cannot modify source, test expectations, or fixtures; deliver cannot start new verification.
- Current evidence must bind the active behavior impact scope and sanitized environment probes. Never treat a port, heartbeat, status JSON owner, or old browser result as proof of the target app, build, account, data, or lock.
- Review findings must record counterevidence, attribution, confidence, and current fixed state. Retracted findings require explicit counterevidence; pre-existing findings do not create repair authorization.
- `workflow-status.json` is the authoritative current record. Derived summaries cannot override contracts, findings, runs, readiness, or resource ownership; numeric quality scores are advisory only.
- `scripts/evaluate-skill.js` is read-only. It may aggregate only explicit evaluation input, must reject answer leakage and unsafe paths, and must not run agents, access hidden oracles, or write results.
- Historical workspace validation is explicit:
  - All workspaces: `npm run validate:workspaces`
  - One workspace: `node scripts/validate-contracts.js --workspace workspace/<requirement-folder>`
- Do not make ignored or historical workspace artifacts block the core release gate.

## CI Rules

- Node 18.20.8, 20.20.2, and 22.22.2 must all pass `npm test`.
- Mutation runs once on Node 22 after the version matrix succeeds.
- CI must verify that tests leave the Git worktree clean.
- Do not add `continue-on-error` to required quality jobs.

## Documentation Sync

When CLI behavior, test gates, runtime support, or validation boundaries change, update:

- `README.md` and `README_EN.md`
- `docs/engineering-standards/cli-quality-architecture.md`
- `scripts/README.md`
- `skill-runtime.json` when packaged files or runtime requirements change
- the active workspace technical design, decisions, risks, handoff, evidence, and delivery summary

## Verification

Run from the repository root:

```bash
npm test
npm run test:mutation
npm run validate:workspaces
```
