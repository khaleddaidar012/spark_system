/* ============================================
   Spark ERP — Project Phase Logic Module
   Business logic for all project phase operations.

   Phases are embedded inside project.phases[] in
   the project JSON blob. Phase log entries are in
   project.phaseLog[]. Both persist via the existing
   save("projects", project) flow — no new API needed.

   NOTE: Retroactive phase assignment is NOT supported.
   Transactions saved when no phase was active remain
   unassociated even if phases are later activated.
   ============================================ */

import { get, save, uid } from "./store.js";
import { seedPhases } from "./phases-catalog.js";

/* ---------- Internal helpers ---------- */

function notifyDataChanged() {
  window.dispatchEvent(new CustomEvent("spark:data-changed"));
}

function nowISO() {
  return new Date().toISOString();
}

function makeLogId() {
  return "log_" + uid();
}

/**
 * Find a phase by id within a project's phases array.
 * @param {object} project
 * @param {string} phaseId
 * @returns {{ phase: object, index: number }|null}
 */
function findPhase(project, phaseId) {
  const index = (project.phases || []).findIndex((p) => p.id === phaseId);
  if (index === -1) return null;
  return { phase: project.phases[index], index };
}

/**
 * Find a sub-phase by id within a parent phase.
 * @param {object} phase
 * @param {string} subPhaseId
 * @returns {{ sub: object, index: number }|null}
 */
function findSubPhase(phase, subPhaseId) {
  const subs = phase.subPhases || [];
  const index = subs.findIndex((s) => s.id === subPhaseId);
  if (index === -1) return null;
  return { sub: subs[index], index };
}

function appendLog(project, entry) {
  if (!Array.isArray(project.phaseLog)) project.phaseLog = [];
  project.phaseLog.push(entry);
}

/* ---------- Phase Initialization ---------- */

/**
 * Ensure the project has a phases[] array. Seeds from DEFAULT_PHASES if missing.
 * Persists the seeded project to the store.
 * @param {object} project
 * @returns {object} The project with phases guaranteed to exist
 */
export function ensureProjectPhases(project) {
  if (!Array.isArray(project.phases) || project.phases.length === 0) {
    project.phases = seedPhases();
    project.phaseLog = project.phaseLog || [];
    save("projects", project);
  }
  if (!Array.isArray(project.phaseLog)) {
    project.phaseLog = [];
    save("projects", project);
  }
  return project;
}

/**
 * Get all phases for a project, seeding if necessary.
 * @param {string} projectId
 * @returns {object[]|null} phases array, or null if project not found
 */
export function getProjectPhases(projectId) {
  let project = get("projects", projectId);
  if (!project) return null;
  project = ensureProjectPhases(project);
  return project.phases;
}

/**
 * Returns all phases where status === "active".
 * @param {string} projectId
 * @returns {object[]}
 */
export function getActivePhases(projectId) {
  return (getProjectPhases(projectId) || []).filter((p) => p.status === "active");
}

/**
 * Returns the single most prominent active phase for display on the project card.
 * Priority: highest-order active phase → if none, last done phase → if none, first pending.
 * @param {string} projectId
 * @returns {object|null}
 */
export function getPrimaryActivePhase(projectId) {
  const phases = getProjectPhases(projectId);
  if (!phases || phases.length === 0) return null;

  const active = phases.filter((p) => p.status === "active");
  if (active.length > 0) {
    return active.reduce((a, b) => (b.order > a.order ? b : a));
  }

  const done = phases.filter((p) => p.status === "done");
  if (done.length > 0) {
    return done.reduce((a, b) => (b.order > a.order ? b : a));
  }

  return phases[0] || null;
}

/* ---------- Phase Transitions ---------- */

/**
 * Activate a pending phase (pending → active).
 * Done phases cannot be reactivated.
 * @param {string} projectId
 * @param {string} phaseId
 * @returns {{ success: boolean, error?: string }}
 */
export function activatePhase(projectId, phaseId) {
  const project = get("projects", projectId);
  if (!project) return { success: false, error: "Project not found" };

  ensureProjectPhases(project);
  const found = findPhase(project, phaseId);
  if (!found) return { success: false, error: "Phase not found" };

  const { phase } = found;
  if (phase.status === "done") return { success: false, error: "Cannot reactivate a completed phase" };
  if (phase.status === "active") return { success: true };  // already active — no-op

  phase.status    = "active";
  phase.startedAt = nowISO();

  appendLog(project, {
    id:         makeLogId(),
    type:       "status_change",
    phaseId:    phaseId,
    subPhaseId: null,
    fromStatus: "pending",
    toStatus:   "active",
    timestamp:  phase.startedAt,
    note:       "",
  });

  try {
    save("projects", project);
    notifyDataChanged();
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Mark an active phase as done (active → done).
 * Optionally activate the next phase in the same call.
 * @param {string} projectId
 * @param {string} phaseId
 * @param {string} [nextPhaseId] — optional phase to activate after completing
 * @returns {{ success: boolean, completedPhase?: object, nextPhase?: object, error?: string }}
 */
export function completePhase(projectId, phaseId, nextPhaseId) {
  const project = get("projects", projectId);
  if (!project) return { success: false, error: "Project not found" };

  ensureProjectPhases(project);
  const found = findPhase(project, phaseId);
  if (!found) return { success: false, error: "Phase not found" };

  const { phase } = found;
  if (phase.status === "done") return { success: false, error: "Phase already completed" };

  const prevStatus   = phase.status;
  const completedAt  = nowISO();
  phase.status       = "done";
  phase.completedAt  = completedAt;

  appendLog(project, {
    id:         makeLogId(),
    type:       "status_change",
    phaseId:    phaseId,
    subPhaseId: null,
    fromStatus: prevStatus,
    toStatus:   "done",
    timestamp:  completedAt,
    note:       "",
  });

  let nextPhase = null;
  if (nextPhaseId) {
    const nextFound = findPhase(project, nextPhaseId);
    if (nextFound && nextFound.phase.status === "pending") {
      nextFound.phase.status    = "active";
      nextFound.phase.startedAt = nowISO();
      nextPhase = nextFound.phase;
      appendLog(project, {
        id:         makeLogId(),
        type:       "status_change",
        phaseId:    nextPhaseId,
        subPhaseId: null,
        fromStatus: "pending",
        toStatus:   "active",
        timestamp:  nextFound.phase.startedAt,
        note:       "",
      });
    }
  }

  try {
    save("projects", project);
    notifyDataChanged();
    return { success: true, completedPhase: phase, nextPhase };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Activate a sub-phase within an active parent phase.
 * @param {string} projectId
 * @param {string} phaseId
 * @param {string} subPhaseId
 * @returns {{ success: boolean, error?: string }}
 */
export function activateSubPhase(projectId, phaseId, subPhaseId) {
  const project = get("projects", projectId);
  if (!project) return { success: false, error: "Project not found" };

  ensureProjectPhases(project);
  const found = findPhase(project, phaseId);
  if (!found) return { success: false, error: "Phase not found" };

  const { phase } = found;
  if (phase.status !== "active") return { success: false, error: "Parent phase must be active to activate a sub-phase" };

  const subFound = findSubPhase(phase, subPhaseId);
  if (!subFound) return { success: false, error: "Sub-phase not found" };

  const { sub } = subFound;
  if (sub.status === "done") return { success: false, error: "Cannot reactivate a completed sub-phase" };

  sub.status           = "active";
  sub.startedAt        = nowISO();
  phase.activeSubPhaseId = subPhaseId;

  appendLog(project, {
    id:         makeLogId(),
    type:       "status_change",
    phaseId:    phaseId,
    subPhaseId: subPhaseId,
    fromStatus: "pending",
    toStatus:   "active",
    timestamp:  sub.startedAt,
    note:       "",
  });

  try {
    save("projects", project);
    notifyDataChanged();
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Complete a sub-phase (active → done).
 * @param {string} projectId
 * @param {string} phaseId
 * @param {string} subPhaseId
 * @returns {{ success: boolean, allSubsDone: boolean, error?: string }}
 */
export function completeSubPhase(projectId, phaseId, subPhaseId) {
  const project = get("projects", projectId);
  if (!project) return { success: false, error: "Project not found" };

  ensureProjectPhases(project);
  const found = findPhase(project, phaseId);
  if (!found) return { success: false, error: "Phase not found" };

  const { phase } = found;
  const subFound = findSubPhase(phase, subPhaseId);
  if (!subFound) return { success: false, error: "Sub-phase not found" };

  const { sub } = subFound;
  const prevStatus  = sub.status;
  const completedAt = nowISO();
  sub.status        = "done";
  sub.completedAt   = completedAt;

  // Clear active sub-phase pointer if this was the active one
  if (phase.activeSubPhaseId === subPhaseId) phase.activeSubPhaseId = null;

  appendLog(project, {
    id:         makeLogId(),
    type:       "status_change",
    phaseId:    phaseId,
    subPhaseId: subPhaseId,
    fromStatus: prevStatus,
    toStatus:   "done",
    timestamp:  completedAt,
    note:       "",
  });

  const allSubsDone = (phase.subPhases || []).every((s) => s.status === "done");

  try {
    save("projects", project);
    notifyDataChanged();
    return { success: true, allSubsDone };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/* ---------- Custom Phase Management ---------- */

/**
 * Add a new user-defined phase to the project.
 * @param {string} projectId
 * @param {{ label: string, labelEn?: string, color: string, subPhases?: object[] }} opts
 * @returns {{ success: boolean, phase?: object, error?: string }}
 */
export function addCustomPhase(projectId, { label, labelEn = "", color = "#64748b", subPhases = [] } = {}) {
  if (!label || !label.trim()) return { success: false, error: "Phase name is required" };

  const project = get("projects", projectId);
  if (!project) return { success: false, error: "Project not found" };

  ensureProjectPhases(project);

  const maxOrder = (project.phases || []).reduce((m, p) => Math.max(m, p.order), 0);
  const now = nowISO();

  const newPhase = {
    id:              "phase_custom_" + uid(),
    label:           label.trim(),
    labelEn:         labelEn.trim(),
    color,
    order:           maxOrder + 1,
    isCustom:        true,
    status:          "pending",
    startedAt:       null,
    completedAt:     null,
    activeSubPhaseId: null,
    subPhases:       subPhases.map((s) => ({
      id:          "sub_custom_" + uid(),
      label:       String(s.label || "").trim(),
      labelEn:     String(s.labelEn || "").trim(),
      color:       s.color || color,
      status:      "pending",
      startedAt:   null,
      completedAt: null,
    })).filter((s) => s.label),
  };

  project.phases.push(newPhase);

  try {
    save("projects", project);
    notifyDataChanged();
    return { success: true, phase: newPhase };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Remove a custom phase (only isCustom=true, only if pending).
 * @param {string} projectId
 * @param {string} phaseId
 * @returns {{ success: boolean, error?: string }}
 */
export function removeCustomPhase(projectId, phaseId) {
  const project = get("projects", projectId);
  if (!project) return { success: false, error: "Project not found" };

  ensureProjectPhases(project);
  const found = findPhase(project, phaseId);
  if (!found) return { success: false, error: "Phase not found" };

  const { phase } = found;
  if (!phase.isCustom) return { success: false, error: "Cannot remove a built-in phase" };
  if (phase.status !== "pending") return { success: false, error: "لا يمكن حذف مرحلة نشطة أو مكتملة / Cannot remove an active or completed phase" };

  project.phases.splice(found.index, 1);
  // Remove associated log entries
  project.phaseLog = (project.phaseLog || []).filter((e) => e.phaseId !== phaseId);

  try {
    save("projects", project);
    notifyDataChanged();
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/* ---------- Phase Log ---------- */

/**
 * Get the phase history log, newest first.
 * @param {string} projectId
 * @returns {object[]}
 */
export function getPhaseLog(projectId) {
  const project = get("projects", projectId);
  if (!project) return [];
  const log = project.phaseLog || [];
  return [...log].sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1));
}

/**
 * Record a financial transaction against the currently active phases.
 * Called automatically after recording a money or material transaction for a project.
 * Safe to call when no phases are active — no log entry is created in that case.
 * @param {string} projectId
 * @param {{ transactionId: string, phaseId: string, subPhaseId?: string, direction: "in"|"out", amount: number, note?: string }} opts
 * @returns void
 */
export function addFinanceToPhaseLog(projectId, { transactionId, phaseId, subPhaseId = null, direction, amount, note = "" }) {
  const project = get("projects", projectId);
  if (!project) return;

  ensureProjectPhases(project);

  appendLog(project, {
    id:            makeLogId(),
    type:          "finance",
    phaseId,
    subPhaseId,
    transactionId,
    direction,
    amount:        Number(amount) || 0,
    note,
    timestamp:     nowISO(),
  });

  save("projects", project);
  // Note: no notifyDataChanged() here — the transaction save already fired it
}

/* ---------- Phase Cost Summary ---------- */

/**
 * Sum the finance log entries per phase (direction === "out" only).
 * @param {string} projectId
 * @returns {{ phaseId: string, label: string, color: string, totalCost: number }[]}
 */
export function phaseCostSummary(projectId) {
  const project = get("projects", projectId);
  if (!project) return [];

  ensureProjectPhases(project);

  const totals = {};
  for (const entry of project.phaseLog || []) {
    if (entry.type !== "finance" || entry.direction !== "out") continue;
    totals[entry.phaseId] = (totals[entry.phaseId] || 0) + Number(entry.amount || 0);
  }

  return (project.phases || []).map((p) => ({
    phaseId:   p.id,
    label:     p.label,
    color:     p.color,
    totalCost: totals[p.id] || 0,
  }));
}

/* ---------- Completion Candidates ---------- */

/**
 * When user is about to complete a phase, return the other phases that are still active.
 * Used by the UI to show an informational list in the confirmation dialog.
 * @param {string} projectId
 * @param {string} completingPhaseId — the phase the user wants to complete
 * @returns {object[]} Other currently active phases
 */
export function getCompletionCandidates(projectId, completingPhaseId) {
  return getActivePhases(projectId).filter((p) => p.id !== completingPhaseId);
}

/**
 * Return pending phases that can be offered as "next phase" after completion.
 * @param {string} projectId
 * @param {string} completingPhaseId
 * @returns {object[]}
 */
export function getPendingPhasesAfter(projectId, completingPhaseId) {
  const project = get("projects", projectId);
  if (!project) return [];
  ensureProjectPhases(project);
  const completing = findPhase(project, completingPhaseId);
  const completingOrder = completing ? completing.phase.order : 0;
  return (project.phases || [])
    .filter((p) => p.status === "pending" && p.order > completingOrder)
    .sort((a, b) => a.order - b.order);
}
