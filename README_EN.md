# AI Work Team — Product Engineering Workflow for AI Agents

[![CI](https://github.com/AISuperXiang/ai-work-team/actions/workflows/ci.yml/badge.svg)](https://github.com/AISuperXiang/ai-work-team/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?logo=node.js&logoColor=white)](./package.json)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

**Language: [简体中文](./README.md) | English**

> A product-engineering team Skill for Trae, Codex, Claude, and general Agent / IDE environments. Turn one natural-language request into a PRD, technical design, implementation, test evidence, code review, and traceable delivery.

`ai-work-team` is an executable AI agent workflow / multi-agent product engineering workflow, not a prompt collection. It orchestrates product, UI, technical leadership, frontend, backend, QA, and delivery responsibilities by risk, then uses workspaces, quality gates, and evidence records to define what “done” actually means.

Current version: `0.8.0`. This release adds safe, idempotent Workspace Init and recursive read-only Audit.

## Start in 30 Seconds

Install:

```bash
npx skills add AISuperXiang/ai-work-team@ai-work-team -g -y
```

Then tell your Agent:

```text
/team build Create a membership renewal page with coupons, then implement, test, and deliver it
```

Or use plain natural language:

```text
Own this requirement end to end, from PRD and technical design through implementation and acceptance testing.
```

The Skill selects a workflow, activates only the required roles, creates a workspace, and records decisions, risks, verification, and remaining gaps.

## Why AI Work Team

| Problem | What AI Work Team provides |
| --- | --- |
| The request is one sentence with unclear scope | Requirement intake, PRD, value hypotheses, and testable acceptance criteria |
| Technical plans lose context after handoff | Goal Contract, decision logs, Task DAGs, and role handoffs |
| An Agent changes code but cannot prove correctness | Explicit test selection, V0-V4 verification levels, and per-check evidence gates |
| A bug fix covers only the visible failure | Original counterexample, preserved paths, consumers, and regression checks |
| Code review becomes a list of style opinions | Call-chain, counterevidence, attribution, severity, and missing-test analysis |
| Long-running tasks are hard to resume | Task/invocation history, active contracts, snapshots, and reusable evidence |
| Workspace tasks are silently lost | Idempotent Init, recursive Audit, and primary/child task gap reports |

It does not activate every role mechanically, and it never treats lint, a zero exit code, or “looks good” as business acceptance.

## Contents

- [Start in 30 Seconds](#start-in-30-seconds)
- [Why AI Work Team](#why-ai-work-team)
- [When to Use It](#when-to-use-it)
- [Core Capabilities](#core-capabilities)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [How It Works](#how-it-works)
- [Team Roles](#team-roles)
- [Deliverables](#deliverables)
- [Quality and Verification](#quality-and-verification)
- [IDE / Agent Integration](#ide--agent-integration)
- [Project Structure](#project-structure)
- [Extensibility](#extensibility)
- [Maintenance and Validation](#maintenance-and-validation)
- [Related Terms and Search Keywords](#related-terms-and-search-keywords)

## When to Use It

`ai-work-team` is a good fit when:

- A one-line request needs clearer users, business value, scope, and acceptance criteria.
- A directional goal needs a PRD, conditional UI review, autonomy contracts, and a reviewed technical design before the user decides whether to execute.
- A feature must move from PRD and UI/UX through technical design, implementation, testing, and delivery.
- A bug fix requires reproduction, root-cause analysis, impact assessment, regression evidence, and residual-risk reporting.
- A code review must distinguish behavioral defects and engineering risks from style preferences, then map findings to verifiable fixes.
- Product, UI, and QA need a joint walkthrough and a unified acceptance decision.
- A project needs an `AGENTS.md` that helps future Agents understand its stack, structure, constraints, and verification commands.
- A team needs to register reusable external Skills or local CLI capabilities with explicit role and safety boundaries.

It is usually unnecessary when:

- The request is a simple knowledge question.
- The task is a clear, low-risk, single-file change that does not require product, testing, or delivery coordination.
- The task requires direct access to external systems such as Lark, Jira, or Codebase. The current version only defines integration contracts under [`docs/integrations/`](./docs/integrations/) and does not call those systems directly.

## Core Capabilities

| Capability | Problem addressed | Primary outputs |
| --- | --- | --- |
| Requirement intake and review | Unclear goals, value, scope, or acceptance criteria | Requirement brief, PRD, decision log |
| Goal-driven technical design | Turning a goal into a constrained, controllably iterative design reviewed across roles | Goal Contract, milestones, Task DAG, autonomy policy, reviewed technical design |
| Technical and UI design | Cross-platform design, interaction, or risk review | UI review, technical design, implementation plan |
| End-to-end feature delivery | Moving a request from design to code and verification | Code changes, test plan, delivery summary |
| Bug-fix delivery | Reproducing, diagnosing, fixing, and regressing a defect | Bug analysis, regression evidence, risk record |
| Code review and optimization | Finding defects, risks, and missing tests | Prioritized findings, fixes, verification result |
| Resume, verify, and delivery summary | Reusing an existing task while preserving operation boundaries | Invocation history, valid evidence, read-only delivery conclusion |
| Skill-effect evaluation | Comparing whether rule changes reduce errors and human effort | Holdout cases, real-task pilots, adopt/hold/reject |
| Product / UI / QA walkthrough | Reaching one multi-role acceptance decision | Walkthrough report, blockers, delivery decision |
| Project context generation | Giving Agents project structure and constraints | `AGENTS.md` |
| Workspace Init / Audit | Preventing new, nested, or historical tasks from missing authoritative state | Minimal v2.2 state plus recursive inventory and structural gaps |
| Capability extension | Adding external Skills or local CLI tools safely | Capability catalog, role mapping, safety boundaries |

## Quick Start

### Requirements

- Node.js `>=18`
- `npm`
- No environment variables are required for the core workflows

### Install from the Skills Marketplace

```bash
npx skills add AISuperXiang/ai-work-team@ai-work-team -g -y
```

If the marketplace displays a different official package name, use the name shown there.

### Install from Git

```bash
SKILLS_DIR="${SKILLS_DIR:?set SKILLS_DIR to your skills directory}"
REPO_URL="https://github.com/AISuperXiang/ai-work-team.git"

mkdir -p "$SKILLS_DIR"
git clone "$REPO_URL" "$SKILLS_DIR/ai-work-team"
cd "$SKILLS_DIR/ai-work-team"
npm test
```

Repository: <https://github.com/AISuperXiang/ai-work-team>

### Install from a Local Directory

```bash
SKILLS_DIR="${SKILLS_DIR:?set SKILLS_DIR to your skills directory}"
SOURCE_DIR="${SOURCE_DIR:?set SOURCE_DIR to the ai-work-team source directory}"

mkdir -p "$SKILLS_DIR"
cp -R "$SOURCE_DIR" "$SKILLS_DIR/ai-work-team"
cd "$SKILLS_DIR/ai-work-team"
npm test
```

## Usage

After installation, use either a natural-language request or an explicit `/team` command.

| Command | Purpose |
| --- | --- |
| `/team intake <request>` | Clarify goals, value, scope, constraints, and information gaps |
| `/team review <request/PRD>` | Review requirement completeness, business value, and acceptance criteria |
| `/team design <request>` | Design or review UI, technical approach, and implementation boundaries |
| `/team goal-design <goal>` | Generate a PRD, requirement/UI reviews, four autonomy Schemas, and a reviewed technical design for user approval |
| `/team build <request>` | Drive a request through implementation, verification, and delivery |
| `/team buildContext <working-directory> [request/scope]` | Scan a project and create or update `AGENTS.md` |
| `/team init-workspace <project-root> <slug> <workflow>` | Safely initialize a minimal v2.2 task state |
| `/team audit-workspaces <project-root> [date range]` | Recursively inventory primary, feature, and implementation task gaps |
| `/team bugfix <problem>` | Handle a defect through reproduction, diagnosis, fix, and regression |
| `/team resume <task>` | Reconcile changes and resume the original workflow from the first necessary stage |
| `/team verify <task> [check IDs]` | Run only missing, failed, or stale checks without changing source, test expectations, or fixtures |
| `/team code-review <scope> [--mode initial\|delta\|recheck]` | Run an initial review, delta review, or finding-specific recheck |
| `/team walk <implementation/page/change>` | Run a joint product, UI, and QA walkthrough |
| `/team deliver <task>` | Summarize valid evidence, risks, and follow-up work from a task ID or workspace |
| `/team install [skill-id\|role task]` | Recommend or install an external Skill registered in the catalog |
| `/team register-cli <cli-id> ...` | Register a local CLI capability and its safety boundaries |
| `/team status` | Show the current workflow status |

Examples:

```text
/team build Create a membership renewal page with coupon support and success feedback
/team review Review this PRD, focusing on business value and acceptance criteria
/team goal-design Design an app for managing complex personal goals with bounded autonomous iterations
/team bugfix Fix order submission failures and add regression verification
/team resume workspace/20260915-order-fix
/team verify workspace/20260915-order-fix target-check,preserve-check
/team code-review current diff --mode delta
/team code-review workspace/20260915-order-fix --mode recheck --findings F1,F2
/team buildContext <project-root> Build Agent context for future work
/team init-workspace <project-root> workspace-init-audit requirement-end-to-end
/team audit-workspaces <project-root> --since 2026-08-04 --until 2026-11-04
```

You do not need to memorize commands. Plain-language requests work too:

| Natural-language request | Routed capability |
| --- | --- |
| “Turn this idea into an implementation-ready PRD” | requirement review / goal-design |
| “Own this feature, implement it, verify it, and deliver the result” | build |
| “Reproduce this production bug, fix it, and add regression coverage” | bugfix |
| “Review the current changes for logic bugs and missing tests” | code-review |
| “Resume the previous task and rerun only stale checks” | resume / verify |
| “Audit the workspace for missing or invalid task state” | audit-workspaces |

See [`commands/team.md`](./commands/team.md) for the complete command reference.

## How It Works

A standard run follows this sequence:

```text
Intake
  -> Route
  -> Profile
  -> Activate Roles
  -> Plan
  -> Workspace
  -> Execute
  -> Select Tests
  -> Verify
  -> Assess Quality
  -> Deliver
```

1. **Intake**: Confirm the goal, success criteria, constraints, and information gaps.
2. **Route**: Select requirement review, end-to-end delivery, bug fix, code review, walkthrough, or another primary workflow.
3. **Profile**: Choose an execution profile based on risk, uncertainty, and blast radius.
4. **Activate Roles**: Create a `rolePlan` and load only active or consulted roles.
5. **Plan**: Establish stages, owners, outputs, and gate status.
6. **Workspace**: Create a dedicated delivery directory when evidence must be retained.
7. **Execute**: Let activated roles produce documents, designs, code, or review findings.
8. **Select Tests**: Use explicit task paths and record catalog health separately from execution.
9. **Verify**: Run available checks and record a `V0-V4` verification level.
10. **Assess Quality**: Check applicable quality dimensions; numeric scores are optional comparison aids.
11. **Deliver**: Derive scope, decisions, evidence, risks, and next steps from the authoritative status.

Key principles:

- **Workflow first**: Determine the task type before loading context.
- **On-demand role activation**: Mark each role as `active`, `consulted`, or `not_applicable`.
- **Evidence-backed conclusions**: Do not claim verification without commands, logs, screenshots, data, or human acceptance records.
- **Durable decisions**: Scope, tradeoffs, risks, and deferred work must not exist only in chat.
- **One effective contract**: The latest explicit intent, repository constraints, and approved decisions form one active revision. Old documents, current code, tests, and review suggestions cannot change expectations by themselves.
- **Repair comparison**: A fix verifies the original counterexample, the most exposed preserved behavior, and applicable consumers.
- **Per-check evidence**: The global `V0-V4` level is a summary and cannot replace method, branch, environment, and snapshot matching for every required check.
- **Bounded resume**: Reuse the task, contract, findings, and still-valid evidence, reopening only necessary stages.
- **Behavior impact scope**: Implementation, tests, and review share entrypoint, sibling, consumer, and merge-guard coverage.
- **Environment identity**: Reuse project-provided gateways, runners, and resource locks while separately confirming app/worktree, build, account, and data.
- **Separated test signals**: Test selection, catalog health, and execution are independent; known failures never suppress gates.
- **Evidence-led review**: Verify, challenge, attribute, and check current fix state before a finding drives changes; load async, SSR, or cache checks only when risk triggers them.
- **One authoritative record**: `workflow-status.json` owns current facts; summaries and handoffs are derived views.

## Team Roles

| Role | Primary responsibilities |
| --- | --- |
| Product Manager | User goals, requirement scope, business value, and acceptance criteria |
| Operations Manager | Metrics, experiments, release cadence, user outreach, and benefit observation |
| UI Designer | Information architecture, interaction, visual consistency, responsiveness, and accessibility |
| Technical Lead | Architecture, technical tradeoffs, cross-module risk, migration, and rollback |
| Frontend Engineer | Pages, components, client state, browser behavior, and frontend builds |
| Backend Engineer | APIs, services, jobs, databases, permissions, and data consistency |
| QA Engineer | Test strategy, risk coverage, regression scope, and verification evidence |
| Delivery Manager | Workflow orchestration, gates, handoffs, risks, and final delivery |

Roles form a candidate pool, not a mandatory attendance list. UI can be excluded when there is no interface change, and backend can be excluded when there is no server-side impact. Every exclusion must include a reason.

## Deliverables

Each new requirement receives a dedicated directory under `workspace/`. The tree below is a
standard reference; lightweight, verify-only, recheck, and deliver operations keep only the artifacts selected by `recordPolicy`:

```text
workspace/
└── YYYYMMDD-short-requirement-slug/
    ├── README.md
    ├── requirement-brief.md
    ├── prd.md
    ├── decision-log.md
    ├── risk-register.md
    ├── role-handoff.md
    ├── workflow-status.json
    ├── ui-review.md
    ├── technical-design.md
    ├── implementation-plan.md
    ├── test-plan.md
    ├── walkthrough-report.md
    ├── delivery-summary.md
    └── evidence/
        └── README.md
```

Code changes remain in the user's project repository. `workspace/` stores process documents, key decisions, role handoffs, risks, verification evidence, and delivery summaries.

`/team goal-design` also produces `goal-contract.json`, `milestones.json`, `tasks.json`, `autonomy-policy.json`, `technical-design-review.md`, and `design-decision-summary.md`. It does not modify project code; an approved design proceeds through `/team build`.

An existing requirement directory is reused with a `features/` subdirectory only when the user explicitly asks to add or append a feature to that requirement.

## Quality and Verification

### Execution Profiles

| Profile | Appropriate for | Requirements |
| --- | --- | --- |
| `lightweight` | Clear, localized, low-risk work | Authoritative status, required evidence, and a readable conclusion; decisions, risks, and handoffs may be inline |
| `standard` | Multi-module work or moderate uncertainty | Authoritative status, required design/contract sources, and evidence; summaries are derived |
| `assurance` | High-risk, `L/XL`, permissions, data, or costly rollback | Independent risk review, rollout, rollback, and runtime verification |

The profile is determined by risk, uncertainty, and blast radius, not urgency.

### Verification Levels

| Level | Evidence | Supported conclusion |
| --- | --- | --- |
| `V0` | No verification or reasoning only | Describe only designs, hypotheses, or pending conclusions |
| `V1` | Formatting, lint, typecheck, static review | Claim only that static checks passed |
| `V2` | Unit tests, integration tests, or reproducible scripts | Claim that tested behavior passed and identify uncovered scope |
| `V3` | Runtime, browser, or end-to-end critical paths | Claim that critical paths were verified while retaining environment-difference risks |
| `V4` | Production rollout, real acceptance, or post-release observation | Claim delivery or benefit verification with data source and timestamp |

### Quality Gates

- `value-gate`: The PRD defines target users, value hypothesis, metric baseline, benefit target, and observation plan.
- `goal-contract-gate`: The goal, non-goals, constraints, metrics, success criteria, assumptions, and review triggers are frozen.
- `autonomy-gate`: Milestones, the Task DAG, planned/maximum iterations, budgets, approvals, stop conditions, and replanning rules are consistent.
- `design-review-gate`: Technical, product, applicable UI, engineering, and QA findings have evidence, disposition, and re-review within the configured round limit.
- `decision-gate`: Scope, priority, technical tradeoffs, release risks, and deferred items are recorded.
- `handoff-gate`: Role transitions have explicit inputs, outputs, risks, and acceptance.
- `complexity-gate`: The task is classified as `S/M/L/XL`; `L/XL` work includes milestones, rollout, and rollback.
- `evidence-gate`: Every completion or verification claim has traceable evidence.
- `reproduction-gate`: A bug is reproduced first, or an executable evidence-collection plan is recorded.
- `review-gate`: Code review findings include scope, location, counterexample, counterevidence, attribution, current fix state, severity, and verification guidance.
- `verification-gate`: The delivery conclusion does not exceed its verification level.
- `role-activation-gate`: Every role has an active, consulted, or not-applicable rationale.
- `no-legacy-contract`: Primary documents, templates, and scripts contain no deprecated entrypoints, aliases, or paths.

See [`docs/quality-gates.md`](./docs/quality-gates.md) and [`docs/quality-rubrics.md`](./docs/quality-rubrics.md) for the full rules.

New build, bug-fix, and code-review tasks use v2.2 `workflow-status.json.deliveryControl`; 2.0/2.1 retain their existing read semantics.
[record-evidence](./docs/evidence-recording.md) provides start/prepare/import/summary for skill identity,
pre-run input binding, separate assertion/runner/wrapper results, and derived summaries.
JSON/dry-run never write files; recorded commands are never executed.
Requirements, risk obligations, and [real consumers](./docs/engineering-standards/consumer-contract-standard.md)
link to explicit checks. Owners still review completeness and business meaning; no real pilot efficiency gains have been measured.
Before delivery, run the read-only assessment:

```bash
node scripts/check-delivery.js \
  --project-root /absolute/project \
  --workspace workspace/task \
  --mode assess \
  --json
```

The tool never executes commands recorded in status and does not replace human review of business meaning, impact scope, or environment identity. Legacy statuses remain auditable but evaluate as `legacy_unverified`, not currently acceptable.

Initialize minimal task state and audit workspace inventory with:

```bash
npm run workspace:init -- --root /absolute/project --slug short-task \
  --workflow requirement-end-to-end
npm run workspace:audit -- --root /absolute/project --since 2026-08-04 --json
```

Init creates only `workflow-status.json`, reuses an exact existing state idempotently, and never overwrites conflicts.
`--dry-run` and `--json` are preview-only. Audit is always read-only and exits `1` for missing/invalid
status or symlink tasks. It does not replace live `check-delivery` assessment.

Incremental reviews report current reviewed scope, valid inherited scope, and gaps separately.
Runtime evidence is bound to an impact scope and sanitized environment probes; a listening
port or healthy heartbeat alone does not establish the target instance or current build.

Evaluate important Skill-rule changes with `schemas/skill-evaluation.schema.json` and the read-only evaluator:

```bash
node scripts/evaluate-skill.js --input <relative-evaluation-json> --json
```

Run hidden-answer historical holdout cases first, then compare human time and escaped regressions on real tasks of similar risk. Critical errors cannot be averaged away; immature observation remains `hold`.

## IDE / Agent Integration

- **Trae**: Place `ai-work-team` in a Skills directory scanned by Trae, reload Skills, and invoke it with `/team` or natural language.
- **Codex / Claude / generic Agents**: Ensure the Agent can read `SKILL.md` and `skill-runtime.json`, then follow `skill-runtime.json.agentHints.readOrder`.
- **Offline environments**: Copying this repository is sufficient for core workflows. Installing external Skills through `/team install` still requires network access and user approval.

## Project Structure

```text
ai-work-team/
├── SKILL.md
├── README.md
├── README_EN.md
├── package.json
├── skill-runtime.json
├── members/
├── workflows/
├── commands/
├── external-skills/
├── external-cli/
├── docs/
├── schemas/
├── assets/
│   └── templates/
├── workspace/
└── scripts/
```

| Directory | Responsibility |
| --- | --- |
| `members/` | Product, operations, UI, engineering, QA, and delivery role definitions |
| `workflows/` | Requirement review, delivery, bug fix, code review, and walkthrough workflows |
| `commands/` | `/team` commands and natural-language routing rules |
| `docs/` | Methodologies, risk verification packs, engineering standards, quality gates, optional assessments, and integration contracts |
| `assets/templates/` | Templates for PRDs, technical designs, tests, risks, and delivery |
| `workspace/` | Per-requirement process artifacts and evidence indexes |
| `scripts/` | Structure validation, contract/evidence validation, Skill-effect evaluation, context generation, and installation |

## Extensibility

### External Skills

`external-skills/` contains the external Skills that may be recommended or installed:

- `catalog.json`: Skill catalog and trust metadata.
- `role-map.md`: Role-to-capability mapping.
- `install-policy.md`: Installation, security, candidate, and conflict rules.

```bash
node scripts/list-external-skills.js --role frontend-engineer
node scripts/install-external-skills.js --dry-run
node scripts/install-external-skills.js web-design-guidelines --dry-run
```

No external Skill is installed without explicit user approval.

### Local CLI Capabilities

`external-cli/` registers CLI capabilities already available in the user's environment. A capability card stores only its purpose, applicable roles, verification method, and safety boundaries. It does not bundle, install, distribute, or store credentials for third-party CLIs.

```text
/team register-cli github-cli \
  --command "gh" \
  --roles "tech-lead,frontend-engineer,delivery-manager" \
  --capabilities "Query and manage GitHub issues, PRs, reviews, and releases" \
  --when "PR state, issue creation, review feedback, or release notes are needed" \
  --verify "gh --version"
```

## Engineering Quality Architecture

Node CLIs follow [`cli-quality-architecture.md`](./docs/engineering-standards/cli-quality-architecture.md):

- Unknown options, missing values, duplicate options, and conflicts exit with code `2`; invalid input never falls back to bulk installation.
- Contract validation sets `process.exitCode` and exits naturally so CI pipes receive complete diagnostics; exit codes remain `0` for success, `1` for validation failure, and `2` for invalid input.
- User-controlled output is limited to regular relative files inside the target root; traversal, absolute paths, and symlinks are rejected.
- Existing managed files larger than 256 KiB fail closed and are never overwritten.
- Behavior tests use `node:test`, temporary directories, and a fake `npx` without network or real global Skill changes.
- Mutation detection must remain at or above 85%, with zero critical survivors for argument, write, install, and CLI kill-switch mutants.
- Node 18.20.8, 20.20.2, and 22.22.2 run the core quality gate independently in CI.
- Core contracts and historical workspace audits are separate so local delivery artifacts cannot contaminate release validation.

Repository-level Agent rules are defined in [`AGENTS.md`](./AGENTS.md).

## Maintenance and Validation

Common maintenance entrypoints:

- Add a role: update `members/` and [`members/README.md`](./members/README.md).
- Add a workflow: update `workflows/`, [`workflows/route-table.md`](./workflows/route-table.md), and [`commands/team.md`](./commands/team.md).
- Add a command: update [`commands/team.md`](./commands/team.md).
- Add an external Skill: update `external-skills/catalog.json`, `external-skills/role-map.md`, and relevant role files.
- Add a local CLI: use `/team register-cli` to create or update `external-cli/<cli-id>.md`.
- Change runtime requirements, entrypoints, or installation methods: update `skill-runtime.json`, its Schema, and both README files.

Run after any structural or contract change:

```bash
npm test
```

Or run the checks separately:

```bash
npm run validate:structure
npm run validate:contracts
npm run test:behavior
npm run test:mutation
npm run validate:workspaces
npm run workspace:audit -- --root /absolute/project --json
```

## Document Responsibilities

- [`README.md`](./README.md): Default Simplified Chinese user documentation.
- [`README_EN.md`](./README_EN.md): English user documentation.
- [`SKILL.md`](./SKILL.md): Agent entrypoint defining triggers, routing, loading order, and hard constraints.
- [`skill-runtime.json`](./skill-runtime.json): Machine-readable runtime metadata for installers and generic Agents.

## Release and Privacy

`ai-work-team` can reuse code review, security review, runtime debugging, database analysis, frontend design, test generation, product planning, and project triage capabilities already available in the current IDE / Agent.

Public documentation and runtime metadata describe capability domains only. They do not record company-internal, private, or environment-specific local Skill inventories, and they never store secrets, cookies, or tokens.

## Related Terms and Search Keywords

AI agent team, multi-agent workflow, product engineering agent, AI software development lifecycle, PRD generator, requirement review, technical design, implementation agent, bug fixing, code review, test automation, TDD, quality gates, delivery orchestration, agent workspace, Trae Skill, Codex Skill, Claude Skill.
