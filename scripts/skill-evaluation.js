"use strict";

const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function validateSkillEvaluation(input) {
  const diagnostics = [];
  const error = (code, at, detail) => diagnostics.push({ code, at, detail });
  const rejectUnknown = (value, allowed, at) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    for (const key of Object.keys(value)) {
      if (!allowed.includes(key)) error("UNKNOWN_FIELD", at, key);
    }
  };
  const validText = (value) => typeof value === "string" && /\S/.test(value);
  const validIds = (value) => Array.isArray(value) &&
    value.every(validText) && new Set(value).size === value.length;
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return [{ code: "INVALID_EVALUATION", at: "$" }];
  }
  const rootFields = [
    "schemaVersion",
    "evaluationId",
    "baseline",
    "candidate",
    "policy",
    "offlineCases",
    "pilotTasks",
  ];
  rejectUnknown(input, rootFields, "$");
  let missingRootField = false;
  for (const field of rootFields) {
    if (!own(input, field)) {
      error("MISSING_FIELD", "$", field);
      missingRootField = true;
    }
  }
  if (missingRootField) return diagnostics;
  if (input.schemaVersion !== "1.0.0") {
    error("UNSUPPORTED_VERSION", "$.schemaVersion");
  }
  if (!validText(input.evaluationId)) error("INVALID_EVALUATION_ID", "evaluationId");
  for (const [name, variant] of [
    ["baseline", input.baseline],
    ["candidate", input.candidate],
  ]) {
    if (!variant || typeof variant !== "object" || Array.isArray(variant)) {
      error("INVALID_VARIANT", name);
      continue;
    }
    const variantFields = ["id", "skillVersion", "modelRef", "toolsetRef", "budgetRef"];
    rejectUnknown(variant, variantFields, name);
    for (const field of variantFields) {
      if (typeof variant[field] !== "string" || !variant[field].trim()) {
        error("INVALID_VARIANT_FIELD", name, field);
      }
    }
  }
  if (input.baseline?.id === input.candidate?.id) {
    error("VARIANT_ID_COLLISION", "baseline");
  }
  for (const field of ["modelRef", "toolsetRef", "budgetRef"]) {
    if (input.baseline?.[field] !== input.candidate?.[field]) {
      error("VARIANT_CONTEXT_MISMATCH", field);
    }
  }
  const policy = input.policy || {};
  const policyFields = [
    "minimumHoldoutCases",
    "minimumPilotTasksPerArm",
    "minimumTimeReductionRatio",
    "maxEscapeRegressionDelta",
    "criticalErrorCodes",
  ];
  rejectUnknown(policy, policyFields, "policy");
  for (const field of ["minimumHoldoutCases", "minimumPilotTasksPerArm"]) {
    if (!Number.isInteger(policy[field]) || policy[field] < 1) {
      error("INVALID_POLICY", `policy.${field}`);
    }
  }
  for (const field of ["minimumTimeReductionRatio", "maxEscapeRegressionDelta"]) {
    if (typeof policy[field] !== "number" || policy[field] < 0 ||
        (field === "minimumTimeReductionRatio" && policy[field] > 1)) {
      error("INVALID_POLICY", `policy.${field}`);
    }
  }
  if (!validIds(policy.criticalErrorCodes)) {
    error("INVALID_POLICY", "policy.criticalErrorCodes");
  }
  const caseIds = new Set();
  if (!Array.isArray(input.offlineCases)) {
    error("INVALID_CASES", "offlineCases");
  } else {
    for (const [index, item] of input.offlineCases.entries()) {
      const at = `offlineCases[${index}]`;
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        error("INVALID_CASE", at);
        continue;
      }
      const caseFields = [
        "id", "split", "fidelity", "riskClass", "inputRef", "oracleRef",
        "answerLeakage", "baselineResult", "candidateResult",
      ];
      rejectUnknown(item, caseFields, at);
      for (const field of caseFields) {
        if (!own(item, field)) error("MISSING_FIELD", at, field);
      }
      if (caseIds.has(item.id)) error("DUPLICATE_CASE", at, item.id);
      caseIds.add(item.id);
      for (const field of ["id", "riskClass", "inputRef", "oracleRef"]) {
        if (!validText(item[field])) error("INVALID_CASE_FIELD", at, field);
      }
      if (!["development", "holdout"].includes(item.split)) {
        error("INVALID_CASE_SPLIT", at);
      }
      if (!["exact", "reconstructed"].includes(item.fidelity)) {
        error("INVALID_CASE_FIDELITY", at);
      }
      if (item.answerLeakage !== false) error("ANSWER_LEAKAGE", at);
      for (const [resultName, result] of [
        ["baselineResult", item.baselineResult],
        ["candidateResult", item.candidateResult],
      ]) {
        if (!result || typeof result !== "object" || Array.isArray(result)) {
          error("INVALID_CASE_RESULT", `${at}.${resultName}`);
          continue;
        }
        rejectUnknown(
          result,
          ["correct", "criticalErrors", "humanActiveMinutes"],
          `${at}.${resultName}`,
        );
        if (typeof result.correct !== "boolean" ||
            !validIds(result.criticalErrors) ||
            typeof result.humanActiveMinutes !== "number" ||
            result.humanActiveMinutes < 0) {
          error("INVALID_CASE_RESULT", `${at}.${resultName}`);
        }
      }
    }
  }
  const pilotIds = new Set();
  if (!Array.isArray(input.pilotTasks)) {
    error("INVALID_PILOTS", "pilotTasks");
  } else {
    for (const [index, item] of input.pilotTasks.entries()) {
      const at = `pilotTasks[${index}]`;
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        error("INVALID_PILOT", at);
        continue;
      }
      const pilotFields = [
        "id", "arm", "riskClass", "status", "changeClass",
        "humanActiveMinutes", "toolMinutes", "environmentWaitMinutes",
        "criticalErrors", "escapedRegression",
      ];
      rejectUnknown(item, pilotFields, at);
      for (const field of pilotFields) {
        if (!own(item, field)) error("MISSING_FIELD", at, field);
      }
      if (pilotIds.has(item.id)) error("DUPLICATE_PILOT", at, item.id);
      pilotIds.add(item.id);
      for (const field of ["id", "riskClass"]) {
        if (!validText(item[field])) error("INVALID_PILOT_FIELD", at, field);
      }
      if (!["baseline", "candidate"].includes(item.arm)) {
        error("INVALID_PILOT_ARM", at);
      }
      if (!["delivered", "blocked", "abandoned"].includes(item.status)) {
        error("INVALID_PILOT_STATUS", at);
      }
      if (![
        "same_goal",
        "requirement_change",
        "dependency_change",
        "merge_work",
        "historical_backlog",
      ].includes(item.changeClass)) {
        error("INVALID_CHANGE_CLASS", at);
      }
      for (const field of [
        "humanActiveMinutes",
        "toolMinutes",
        "environmentWaitMinutes",
      ]) {
        if (typeof item[field] !== "number" || item[field] < 0) {
          error("INVALID_DURATION", `${at}.${field}`);
        }
      }
      if (!validIds(item.criticalErrors)) {
        error("INVALID_CRITICAL_ERRORS", at);
      }
      const escaped = item.escapedRegression;
      rejectUnknown(
        escaped,
        ["state", "count", "observationEnd"],
        `${at}.escapedRegression`,
      );
      if (!escaped || typeof escaped !== "object" ||
          !["mature", "pending", "not_exposed"].includes(escaped.state) ||
          !Number.isInteger(escaped.count) || escaped.count < 0) {
        error("INVALID_ESCAPE_RESULT", at);
      }
      if (own(escaped || {}, "observationEnd") &&
          escaped.observationEnd !== null &&
          !validText(escaped.observationEnd)) {
        error("INVALID_ESCAPE_RESULT", at);
      }
      if (escaped?.state !== "mature" && escaped?.count !== 0) {
        error("IMMATURE_ESCAPE_COUNT", at);
      }
    }
  }
  return diagnostics;
}

function summarizeSkillEvaluation(input) {
  const diagnostics = validateSkillEvaluation(input);
  const result = {
    evaluationId: input?.evaluationId || null,
    offline: { status: "inconclusive" },
    pilot: { status: "inconclusive" },
    decision: "hold",
    diagnostics,
  };
  if (diagnostics.length) return result;

  const critical = new Set(input.policy.criticalErrorCodes);
  const candidateCriticalErrors = [];
  const holdout = input.offlineCases.filter((item) => item.split === "holdout");
  for (const item of holdout) {
    for (const code of item.candidateResult.criticalErrors) {
      if (critical.has(code)) candidateCriticalErrors.push({ id: item.id, code });
    }
  }
  const offlineCorrect = holdout.filter((item) =>
    item.candidateResult.correct).length;
  const offlineEnough = holdout.length >= input.policy.minimumHoldoutCases;
  result.offline = {
    status: !offlineEnough ? "inconclusive" :
      candidateCriticalErrors.length || offlineCorrect !== holdout.length ?
        "failed" : "passed",
    holdoutCases: holdout.length,
    correctCases: offlineCorrect,
    reconstructedCases: holdout.filter((item) =>
      item.fidelity === "reconstructed").length,
    criticalErrors: candidateCriticalErrors,
    baselineMedianHumanMinutes: median(holdout.map((item) =>
      item.baselineResult.humanActiveMinutes)),
    candidateMedianHumanMinutes: median(holdout.map((item) =>
      item.candidateResult.humanActiveMinutes)),
  };

  const sameGoal = input.pilotTasks.filter((item) =>
    item.changeClass === "same_goal");
  const riskClasses = [...new Set(sameGoal.map((item) => item.riskClass))].sort();
  const groups = riskClasses.map((riskClass) => {
    const byArm = Object.fromEntries(["baseline", "candidate"].map((arm) => {
      const tasks = sameGoal.filter((item) =>
        item.arm === arm && item.riskClass === riskClass);
      const delivered = tasks.filter((item) => item.status === "delivered");
      const mature = delivered.filter((item) =>
        item.escapedRegression.state === "mature");
      return [arm, {
        tasks,
        delivered,
        mature,
        deliveryRate: tasks.length ? delivered.length / tasks.length : null,
        medianHumanMinutes: median(tasks.map((item) =>
          item.humanActiveMinutes)),
        escapeCount: mature.reduce((sum, item) =>
          sum + item.escapedRegression.count, 0),
        criticalErrors: tasks.flatMap((item) =>
          item.criticalErrors.filter((code) => critical.has(code))
            .map((code) => ({ id: item.id, code }))),
      }];
    }));
    const enough = ["baseline", "candidate"].every((arm) =>
      byArm[arm].delivered.length >= input.policy.minimumPilotTasksPerArm);
    const observationMature = enough &&
      ["baseline", "candidate"].every((arm) =>
        byArm[arm].mature.length === byArm[arm].delivered.length);
    const deliveryPassed = byArm.candidate.deliveryRate >=
      byArm.baseline.deliveryRate;
    const baselineMedian = byArm.baseline.medianHumanMinutes;
    const candidateMedian = byArm.candidate.medianHumanMinutes;
    const timeReductionRatio = baselineMedian && candidateMedian !== null
      ? (baselineMedian - candidateMedian) / baselineMedian
      : null;
    const escapeDelta = byArm.candidate.escapeCount -
      byArm.baseline.escapeCount;
    return {
      riskClass,
      enough,
      observationMature,
      baselineTasks: byArm.baseline.tasks.length,
      candidateTasks: byArm.candidate.tasks.length,
      baselineDeliveredTasks: byArm.baseline.delivered.length,
      candidateDeliveredTasks: byArm.candidate.delivered.length,
      baselineDeliveryRate: byArm.baseline.deliveryRate,
      candidateDeliveryRate: byArm.candidate.deliveryRate,
      baselineMedianHumanMinutes: baselineMedian,
      candidateMedianHumanMinutes: candidateMedian,
      timeReductionRatio,
      baselineEscapes: byArm.baseline.escapeCount,
      candidateEscapes: byArm.candidate.escapeCount,
      escapeDelta,
      criticalErrors: byArm.candidate.criticalErrors,
      qualityPassed: observationMature &&
        deliveryPassed &&
        byArm.candidate.criticalErrors.length === 0 &&
        escapeDelta <= input.policy.maxEscapeRegressionDelta,
      efficiencyPassed: timeReductionRatio !== null &&
        timeReductionRatio >= input.policy.minimumTimeReductionRatio,
    };
  });
  const pilotEnough = groups.length > 0 && groups.every((group) => group.enough);
  const observationMature = pilotEnough &&
    groups.every((group) => group.observationMature);
  const qualityPassed = observationMature &&
    groups.every((group) => group.qualityPassed);
  const efficiencyPassed = pilotEnough &&
    groups.every((group) => group.efficiencyPassed);
  const baselineTasks = sameGoal.filter((item) =>
    item.arm === "baseline");
  const candidateTasks = sameGoal.filter((item) =>
    item.arm === "candidate");
  const baselineMedian = median(baselineTasks.map((item) =>
    item.humanActiveMinutes));
  const candidateMedian = median(candidateTasks.map((item) =>
    item.humanActiveMinutes));
  const timeReductionRatio = baselineMedian && candidateMedian !== null
    ? (baselineMedian - candidateMedian) / baselineMedian
    : null;
  const baselineEscapes = groups.reduce((sum, group) =>
    sum + group.baselineEscapes, 0);
  const candidateEscapes = groups.reduce((sum, group) =>
    sum + group.candidateEscapes, 0);
  const candidatePilotCritical = groups.flatMap((group) =>
    group.criticalErrors);
  result.pilot = {
    status: !pilotEnough || !observationMature ? "inconclusive" :
      qualityPassed ? efficiencyPassed ? "passed" : "no_efficiency_gain" :
        "quality_regressed",
    baselineTasks: baselineTasks.length,
    candidateTasks: candidateTasks.length,
    baselineDeliveredTasks: baselineTasks.filter((item) =>
      item.status === "delivered").length,
    candidateDeliveredTasks: candidateTasks.filter((item) =>
      item.status === "delivered").length,
    baselineMedianHumanMinutes: baselineMedian,
    candidateMedianHumanMinutes: candidateMedian,
    timeReductionRatio,
    baselineEscapes,
    candidateEscapes,
    escapeDelta: candidateEscapes - baselineEscapes,
    criticalErrors: candidatePilotCritical,
    groups,
  };

  if (result.offline.status === "failed" ||
      result.pilot.status === "quality_regressed") {
    result.decision = "reject";
  } else if (result.offline.status === "passed" &&
      result.pilot.status === "passed") {
    result.decision = "adopt";
  }
  return result;
}

module.exports = {
  median,
  validateSkillEvaluation,
  summarizeSkillEvaluation,
};
