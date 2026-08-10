# AI Work Team

**Language: [简体中文](./README.md) | English**

> A product-engineering expert team orchestration Skill for Agent / IDE environments. It turns a natural-language request or `/team` command into a reviewable delivery with plans, implementation, verification evidence, risks, and handoff records.

## Overview

`ai-work-team` turns collaboration among product, operations, UI, technical leadership, frontend, backend, QA, and delivery roles into executable workflows. It does not replace individual specialists. Instead, it:

- Identifies the task type before selecting a delivery workflow.
- Activates only the roles required by the task scope and risk.
- Records decisions, risks, handoffs, and verification evidence in traceable documents.
- Keeps every conclusion within the boundary supported by its verification level.
- Provides a shared definition of done for feature delivery, bug fixes, code reviews, and walkthroughs.

## Contents

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

## When to Use It

`ai-work-team` is a good fit when:

- A one-line request needs clearer users, business value, scope, and acceptance criteria.
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
| Technical and UI design | Cross-platform design, interaction, or risk review | UI review, technical design, implementation plan |
| End-to-end feature delivery | Moving a request from design to code and verification | Code changes, test plan, delivery summary |
| Bug-fix delivery | Reproducing, diagnosing, fixing, and regressing a defect | Bug analysis, regression evidence, risk record |
| Code review and optimization | Finding defects, risks, and missing tests | Prioritized findings, fixes, verification result |
| Product / UI / QA walkthrough | Reaching one multi-role acceptance decision | Walkthrough report, blockers, delivery decision |
| Project context generation | Giving Agents project structure and constraints | `AGENTS.md` |
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
| `/team build <request>` | Drive a request through implementation, verification, and delivery |
| `/team buildContext <working-directory> [request/scope]` | Scan a project and create or update `AGENTS.md` |
| `/team bugfix <problem>` | Handle a defect through reproduction, diagnosis, fix, and regression |
| `/team code-review <path\|diff\|commit\|PR>` | Review code and produce prioritized findings with verification guidance |
| `/team walk <implementation/page/change>` | Run a joint product, UI, and QA walkthrough |
| `/team deliver <context>` | Summarize scope, evidence, risks, and follow-up work |
| `/team install [skill-id\|role task]` | Recommend or install an external Skill registered in the catalog |
| `/team register-cli <cli-id> ...` | Register a local CLI capability and its safety boundaries |
| `/team status` | Show the current workflow status |

Examples:

```text
/team build Create a membership renewal page with coupon support and success feedback
/team review Review this PRD, focusing on business value and acceptance criteria
/team bugfix Fix order submission failures and add regression verification
/team code-review Review the current diff for race conditions and regression risks
/team buildContext <project-root> Build Agent context for future work
```

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
  -> Verify
  -> Score
  -> Deliver
```

1. **Intake**: Confirm the goal, success criteria, constraints, and information gaps.
2. **Route**: Select requirement review, end-to-end delivery, bug fix, code review, walkthrough, or another primary workflow.
3. **Profile**: Choose an execution profile based on risk, uncertainty, and blast radius.
4. **Activate Roles**: Create a `rolePlan` and load only active or consulted roles.
5. **Plan**: Establish stages, owners, outputs, and gate status.
6. **Workspace**: Create a dedicated delivery directory when evidence must be retained.
7. **Execute**: Let activated roles produce documents, designs, code, or review findings.
8. **Verify**: Run available checks and record a `V0-V4` verification level.
9. **Score**: Evaluate business impact, robustness, test confidence, and delivery completeness.
10. **Deliver**: Summarize scope, decisions, evidence, risks, and next steps.

Key principles:

- **Workflow first**: Determine the task type before loading context.
- **On-demand role activation**: Mark each role as `active`, `consulted`, or `not_applicable`.
- **Evidence-backed conclusions**: Do not claim verification without commands, logs, screenshots, data, or human acceptance records.
- **Durable decisions**: Scope, tradeoffs, risks, and deferred work must not exist only in chat.

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

Each new requirement receives a dedicated directory under `workspace/`:

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

An existing requirement directory is reused with a `features/` subdirectory only when the user explicitly asks to add or append a feature to that requirement.

## Quality and Verification

### Execution Profiles

| Profile | Appropriate for | Requirements |
| --- | --- | --- |
| `lightweight` | Clear, localized, low-risk work | Minimal but complete decision, change, and verification evidence |
| `standard` | Multi-module work or moderate uncertainty | Core workflow artifacts and explicit role handoffs |
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
- `decision-gate`: Scope, priority, technical tradeoffs, release risks, and deferred items are recorded.
- `handoff-gate`: Role transitions have explicit inputs, outputs, risks, and acceptance.
- `complexity-gate`: The task is classified as `S/M/L/XL`; `L/XL` work includes milestones, rollout, and rollback.
- `evidence-gate`: Every completion or verification claim has traceable evidence.
- `reproduction-gate`: A bug is reproduced first, or an executable evidence-collection plan is recorded.
- `review-gate`: Code review findings include scope, location, counterexample, severity, and verification guidance.
- `verification-gate`: The delivery conclusion does not exceed its verification level.
- `role-activation-gate`: Every role has an active, consulted, or not-applicable rationale.
- `no-legacy-contract`: Primary documents, templates, and scripts contain no deprecated entrypoints, aliases, or paths.

See [`docs/quality-gates.md`](./docs/quality-gates.md) and [`docs/quality-rubrics.md`](./docs/quality-rubrics.md) for the full rules.

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
| `docs/` | Methodologies, engineering standards, quality gates, rubrics, and integration contracts |
| `assets/templates/` | Templates for PRDs, technical designs, tests, risks, and delivery |
| `workspace/` | Per-requirement process artifacts and evidence indexes |
| `scripts/` | Structure validation, contract validation, context generation, and Skill installation |

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
```

## Document Responsibilities

- [`README.md`](./README.md): Default Simplified Chinese user documentation.
- [`README_EN.md`](./README_EN.md): English user documentation.
- [`SKILL.md`](./SKILL.md): Agent entrypoint defining triggers, routing, loading order, and hard constraints.
- [`skill-runtime.json`](./skill-runtime.json): Machine-readable runtime metadata for installers and generic Agents.

## Release and Privacy

`ai-work-team` can reuse code review, security review, runtime debugging, database analysis, frontend design, test generation, product planning, and project triage capabilities already available in the current IDE / Agent.

Public documentation and runtime metadata describe capability domains only. They do not record company-internal, private, or environment-specific local Skill inventories, and they never store secrets, cookies, or tokens.
