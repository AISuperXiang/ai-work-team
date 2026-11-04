"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { CliArgumentError } = require("./cli-args");
const {
  isSafeRelativePath,
  readStableFile,
  resolveSafePath,
} = require("./safe-files");
const {
  recordSourceDigest,
  validateShape,
} = require("./delivery-controls");
const statusSchema = require("../schemas/status.schema.json");

const MAX_STATUS_BYTES = 256 * 1024;
const PROFILES = new Set(["lightweight", "standard", "assurance"]);
const COMPLEXITIES = new Set(["S", "M", "L", "XL"]);
const ROLE_MODES = new Set(["active", "consulted", "not_applicable"]);
const WORKFLOW_TEMPLATES = Object.freeze({
  "requirement-end-to-end": "assets/templates/workflow-status.json",
  "bugfix-delivery": "assets/templates/bugfix-workflow-status.json",
  "code-review-delivery": "assets/templates/code-review-workflow-status.json",
  "technical-design-review": "assets/templates/technical-design-workflow-status.json",
});

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function normalizeDate(value, label = "date") {
  if (typeof value !== "string") {
    throw new CliArgumentError(`${label} must use YYYYMMDD or YYYY-MM-DD`);
  }
  const normalized = value.replaceAll("-", "");
  if (!/^\d{8}$/.test(normalized)) {
    throw new CliArgumentError(`${label} must use YYYYMMDD or YYYY-MM-DD`);
  }
  const year = Number(normalized.slice(0, 4));
  const month = Number(normalized.slice(4, 6));
  const day = Number(normalized.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new CliArgumentError(`${label} is not a valid calendar date`);
  }
  return normalized;
}

function localDateStamp(now = new Date()) {
  return [
    String(now.getFullYear()).padStart(4, "0"),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
}

function validateSlug(value) {
  if (
    typeof value !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  ) {
    throw new CliArgumentError(
      "slug must contain lowercase letters, numbers, and single hyphen separators",
    );
  }
  return value;
}

function readJson(file, maxBytes = MAX_STATUS_BYTES) {
  try {
    return JSON.parse(readStableFile(file, { maxBytes }));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("JSON input is invalid");
    }
    throw error;
  }
}

function loadWorkflowTemplate(skillRoot, workflow) {
  const template = WORKFLOW_TEMPLATES[workflow];
  if (!template) {
    throw new CliArgumentError(`Unsupported workflow: ${workflow}`);
  }
  const status = readJson(resolveSafePath(skillRoot, template));
  if (status.workflow && status.workflow !== workflow) {
    throw new Error(`Workflow template mismatch: ${workflow}`);
  }
  return status;
}

function skillIdentity(skillRoot, invocationId, capturedAt) {
  const packageJson = readJson(resolveSafePath(skillRoot, "package.json"));
  const entryHash = readStableFile(resolveSafePath(skillRoot, "SKILL.md"), {
    maxBytes: MAX_STATUS_BYTES,
    hashOnly: true,
  });
  return {
    invocationId,
    version: packageJson.version,
    entryHash,
    runtime: process.version,
    capturedAt,
  };
}

function startTask(status, options) {
  const control = status.deliveryControl;
  if (!control || status.schemaVersion !== "2.2") {
    throw new Error("Explicit 2.2 delivery control is required");
  }
  const authorizationRef = String(options.authorizationRef || "").trim();
  if (!authorizationRef) {
    throw new CliArgumentError("authorization-ref must be non-empty");
  }
  const createId = options.createId || randomUUID;
  const capturedAt = options.capturedAt || new Date().toISOString();

  if (!control.invocations.length) {
    if (control.taskId === "replace-with-stable-task-id") {
      control.taskId = `task-${createId()}`;
    }
    control.currentInvocationId = `invoke-${createId()}`;
    control.invocations.push({
      id: control.currentInvocationId,
      operation: "start",
      authorizationRef,
      contractRevision: control.activeContractRevision,
      snapshotId: control.snapshots.at(-1)?.id || null,
      selectedCheckIds: [],
      selectedFindingIds: [],
      allowedActions: [...control.authorizedActions],
      necessaryStages: [],
      reason: "Start authorized task",
    });
  }

  if (
    !control.assurance.executionIdentities.some(
      (identity) => identity.invocationId === control.currentInvocationId,
    )
  ) {
    control.assurance.executionIdentities.push(
      skillIdentity(options.skillRoot, control.currentInvocationId, capturedAt),
    );
  }

  return {
    taskId: control.taskId,
    invocationId: control.currentInvocationId,
  };
}

function neutralizeUnresolvedDomainRoles(rolePlan) {
  const unresolved = {
    "ui-designer": "初始化阶段尚未确认 UI 或交互影响；命中后必须重新激活。",
    "frontend-engineer": "初始化阶段尚未确认客户端实现归属；命中后必须重新激活。",
    "backend-engineer": "初始化阶段尚未确认服务端实现归属；命中后必须重新激活。",
  };
  return rolePlan.map((role) =>
    unresolved[role.role]
      ? {
          ...role,
          mode: "not_applicable",
          reason: unresolved[role.role],
          stages: [],
        }
      : role,
  );
}

function buildInitialStatus(skillRoot, options) {
  const status = loadWorkflowTemplate(skillRoot, options.workflow);
  const capturedAt = options.capturedAt || new Date().toISOString();
  status.workflow = options.workflow;
  status.requirementFolder = options.requirementFolder;
  status.updatedAt = capturedAt;
  status.complexityLevel = options.complexity || status.complexityLevel;
  status.executionProfile = options.profile || status.executionProfile;
  status.rolePlan = neutralizeUnresolvedDomainRoles(status.rolePlan);
  status.deliveryControl.recordPolicy.profile =
    status.executionProfile === "lightweight"
      ? "minimal"
      : status.executionProfile;
  startTask(status, {
    authorizationRef: options.authorizationRef,
    capturedAt,
    createId: options.createId,
    skillRoot,
  });
  status.deliveryControl.recordPolicy.summarySourceDigest =
    recordSourceDigest(status.deliveryControl);

  const diagnostics = inspectStatus(status, {
    expectedRequirementFolder: options.requirementFolder,
    skillRoot,
  });
  if (diagnostics.length) {
    throw new Error(
      `Generated status is invalid: ${diagnostics.map((item) => item.code).join(",")}`,
    );
  }
  return status;
}

function inspectStatus(status, options) {
  const diagnostics = [];
  const flag = (code, at) => diagnostics.push({ code, at });
  if (!status || typeof status !== "object" || Array.isArray(status)) {
    return [{ code: "STATUS_NOT_OBJECT", at: "workflow-status.json" }];
  }
  for (const field of [
    "workflow",
    "requirementFolder",
    "complexityLevel",
    "executionProfile",
    "verificationLevel",
    "updatedAt",
  ]) {
    if (typeof status[field] !== "string" || !status[field].trim()) {
      flag("STATUS_FIELD_INVALID", field);
    }
  }
  if (!COMPLEXITIES.has(status.complexityLevel)) {
    flag("COMPLEXITY_INVALID", "complexityLevel");
  }
  if (!PROFILES.has(status.executionProfile)) {
    flag("PROFILE_INVALID", "executionProfile");
  }
  if (!/^V[0-4]$/.test(status.verificationLevel || "")) {
    flag("VERIFICATION_LEVEL_INVALID", "verificationLevel");
  }
  if (
    options.expectedRequirementFolder &&
    status.requirementFolder !== options.expectedRequirementFolder
  ) {
    flag("REQUIREMENT_FOLDER_MISMATCH", "requirementFolder");
  }

  let template;
  try {
    template = loadWorkflowTemplate(options.skillRoot, status.workflow);
  } catch {
    flag("WORKFLOW_UNSUPPORTED", "workflow");
  }
  const expectedStages = new Set(
    Array.isArray(template?.stages)
      ? template.stages.map((stage) => stage.name)
      : [],
  );
  const actualStages = new Set();
  if (!Array.isArray(status.stages) || status.stages.length === 0) {
    flag("STAGES_INVALID", "stages");
  } else {
    for (const [index, stage] of status.stages.entries()) {
      if (!stage || typeof stage !== "object" || Array.isArray(stage)) {
        flag("STAGE_INVALID", `stages[${index}]`);
        continue;
      }
      actualStages.add(stage.name);
      if (
        typeof stage.name !== "string" ||
        typeof stage.owner !== "string" ||
        !["pending", "in_progress", "blocked", "review", "completed"].includes(
          stage.status,
        ) ||
        !Array.isArray(stage.gates) ||
        !Array.isArray(stage.artifacts) ||
        !Array.isArray(stage.evidence)
      ) {
        flag("STAGE_INVALID", `stages[${index}]`);
      }
    }
  }
  for (const stageName of expectedStages) {
    if (!actualStages.has(stageName)) {
      flag("STAGE_MISSING", stageName);
    }
  }

  const roles = new Set();
  if (!Array.isArray(status.rolePlan) || status.rolePlan.length === 0) {
    flag("ROLE_PLAN_INVALID", "rolePlan");
  } else {
    for (const [index, role] of status.rolePlan.entries()) {
      if (
        !role ||
        typeof role !== "object" ||
        typeof role.role !== "string" ||
        roles.has(role.role) ||
        !ROLE_MODES.has(role.mode) ||
        typeof role.reason !== "string" ||
        !role.reason.trim() ||
        !Array.isArray(role.stages) ||
        (role.mode === "not_applicable"
          ? role.stages.length !== 0
          : role.stages.length === 0) ||
        role.stages.some((stage) => !actualStages.has(stage))
      ) {
        flag("ROLE_PLAN_INVALID", `rolePlan[${index}]`);
      }
      if (role?.role) roles.add(role.role);
    }
  }
  if (!roles.has("delivery-manager")) {
    flag("DELIVERY_MANAGER_REQUIRED", "rolePlan");
  }

  if (status.schemaVersion) {
    for (const diagnostic of validateShape(status, statusSchema)) {
      flag(diagnostic.code, diagnostic.at);
    }
  }
  return diagnostics;
}

function taskDate(name, inheritedDate = null) {
  const match = /^(\d{8})-/.exec(name);
  if (!match) return inheritedDate;
  try {
    return normalizeDate(match[1]);
  } catch {
    return inheritedDate;
  }
}

function taskInRange(date, since, until) {
  if (!since && !until) return true;
  if (!date) return false;
  return (!since || date >= since) && (!until || date <= until);
}

function inspectTask(task, context) {
  const statusPath = path.join(task.absolutePath, "workflow-status.json");
  const expectedRequirementFolder = path.posix.join(
    context.workspaceRelative,
    task.path,
  );
  if (!fs.existsSync(statusPath)) {
    return {
      ...task,
      status: { state: "missing" },
    };
  }
  const stat = fs.lstatSync(statusPath);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    return {
      ...task,
      status: {
        state: "invalid",
        diagnostics: [{ code: "STATUS_FILE_UNSAFE", at: task.path }],
      },
    };
  }
  try {
    const status = readJson(statusPath);
    const diagnostics = inspectStatus(status, {
      expectedRequirementFolder,
      skillRoot: context.skillRoot,
    });
    const legacy = !status.schemaVersion;
    return {
      ...task,
      status: {
        state: legacy ? "legacy" : diagnostics.length ? "invalid" : "present",
        schemaVersion: status.schemaVersion || "legacy",
        workflow: status.workflow || null,
        executionProfile: status.executionProfile || null,
        verificationLevel: status.verificationLevel || null,
        taskId: status.deliveryControl?.taskId || status.taskId || null,
        claim:
          status.deliveryControl?.completion?.claim ||
          status.completion?.claim ||
          null,
        ...(diagnostics.length
          ? { [legacy ? "warnings" : "diagnostics"]: diagnostics }
          : {}),
      },
    };
  } catch (error) {
    return {
      ...task,
      status: {
        state: "invalid",
        diagnostics: [
          {
            code: "STATUS_READ_FAILED",
            at: task.path,
            detail: error.message,
          },
        ],
      },
    };
  }
}

function discoverWorkspaceTasks(options) {
  const root = fs.realpathSync(options.root);
  const workspaceRelative = options.workspaceRelative || "workspace";
  if (!isSafeRelativePath(workspaceRelative)) {
    throw new CliArgumentError(
      "workspace must be a normalized relative path",
    );
  }
  const workspace = resolveSafePath(root, workspaceRelative, {
    label: "workspace",
  });
  if (!fs.statSync(workspace).isDirectory()) {
    throw new CliArgumentError("workspace must be a directory");
  }
  const since = options.since ? normalizeDate(options.since, "since") : null;
  const until = options.until ? normalizeDate(options.until, "until") : null;
  if (since && until && since > until) {
    throw new CliArgumentError("since must not be after until");
  }

  const tasks = [];
  const diagnostics = [];
  const primaryEntries = fs
    .readdirSync(workspace, { withFileTypes: true })
    .sort((left, right) => compareText(left.name, right.name));

  for (const entry of primaryEntries) {
    if (entry.name.startsWith(".")) continue;
    const entryPath = path.join(workspace, entry.name);
    if (entry.isSymbolicLink()) {
      diagnostics.push({
        code: "SYMLINK_TASK_REJECTED",
        path: entry.name,
      });
      continue;
    }
    if (!entry.isDirectory()) continue;
    const date = taskDate(entry.name);
    if (!taskInRange(date, since, until)) continue;
    tasks.push({
      kind: "primary",
      path: entry.name,
      parentPath: null,
      date,
      absolutePath: entryPath,
    });

    const childEntries = fs
      .readdirSync(entryPath, { withFileTypes: true })
      .sort((left, right) => compareText(left.name, right.name));
    for (const childEntry of childEntries) {
      if (childEntry.name === "features") {
        const featuresPath = path.join(entryPath, childEntry.name);
        if (childEntry.isSymbolicLink()) {
          diagnostics.push({
            code: "SYMLINK_TASK_REJECTED",
            path: `${entry.name}/features`,
          });
          continue;
        }
        if (!childEntry.isDirectory()) continue;
        const featureEntries = fs
          .readdirSync(featuresPath, { withFileTypes: true })
          .sort((left, right) => compareText(left.name, right.name));
        for (const feature of featureEntries) {
          if (feature.name.startsWith(".")) continue;
          const featurePath = `${entry.name}/features/${feature.name}`;
          if (feature.isSymbolicLink()) {
            diagnostics.push({
              code: "SYMLINK_TASK_REJECTED",
              path: featurePath,
            });
            continue;
          }
          if (!feature.isDirectory()) continue;
          const featureDate = taskDate(feature.name, date);
          if (!taskInRange(featureDate, since, until)) continue;
          tasks.push({
            kind: "feature",
            path: featurePath,
            parentPath: entry.name,
            date: featureDate,
            absolutePath: path.join(featuresPath, feature.name),
          });
        }
      } else if (childEntry.name === "implementation") {
        const implementationPath = `${entry.name}/implementation`;
        if (childEntry.isSymbolicLink()) {
          diagnostics.push({
            code: "SYMLINK_TASK_REJECTED",
            path: implementationPath,
          });
          continue;
        }
        if (childEntry.isDirectory()) {
          tasks.push({
            kind: "implementation",
            path: implementationPath,
            parentPath: entry.name,
            date,
            absolutePath: path.join(entryPath, childEntry.name),
          });
        }
      }
    }
  }

  const inspected = tasks
    .map((task) =>
      inspectTask(task, {
        skillRoot: options.skillRoot,
        workspaceRelative,
      }),
    )
    .map(({ absolutePath, ...task }) => task)
    .sort((left, right) => compareText(left.path, right.path));
  const summary = {
    primaryTasks: inspected.filter((task) => task.kind === "primary").length,
    childTasks: inspected.filter((task) => task.kind !== "primary").length,
    withStatus: inspected.filter((task) => task.status.state !== "missing")
      .length,
    validStatus: inspected.filter((task) => task.status.state === "present")
      .length,
    missingStatus: inspected.filter((task) => task.status.state === "missing")
      .length,
    missingPrimaryStatus: inspected.filter(
      (task) => task.kind === "primary" && task.status.state === "missing",
    ).length,
    missingChildStatus: inspected.filter(
      (task) => task.kind !== "primary" && task.status.state === "missing",
    ).length,
    invalidStatus: inspected.filter((task) => task.status.state === "invalid")
      .length,
    invalidPrimaryStatus: inspected.filter(
      (task) => task.kind === "primary" && task.status.state === "invalid",
    ).length,
    invalidChildStatus: inspected.filter(
      (task) => task.kind !== "primary" && task.status.state === "invalid",
    ).length,
    legacyStatus: inspected.filter(
      (task) => task.status.schemaVersion === "legacy",
    ).length,
    unsafeEntries: diagnostics.length,
  };
  return {
    root,
    workspace: workspaceRelative,
    filters: { since, until },
    summary,
    tasks: inspected,
    diagnostics,
  };
}

module.exports = {
  COMPLEXITIES,
  MAX_STATUS_BYTES,
  PROFILES,
  WORKFLOW_TEMPLATES,
  buildInitialStatus,
  discoverWorkspaceTasks,
  inspectStatus,
  localDateStamp,
  normalizeDate,
  startTask,
  validateSlug,
};
