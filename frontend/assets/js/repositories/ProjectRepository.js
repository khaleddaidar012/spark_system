/* ============================================
   Spark ERP — Project & Project Cases Repository
   Handles project creation, case assignment,
   progress updates, and project hierarchy offline.
   ============================================ */

import { BaseRepository } from "./base-repository.js";
import { db } from "../db/db.js";
import { generateUUID } from "../modules/uuid.js";

class ProjectRepository extends BaseRepository {
  constructor() {
    super("projects", "project");
  }

  /**
   * Get all active projects with their cases
   */
  async getAllWithCases() {
    const projects = await this.getAll();
    const allCases = await db.projectCases.filter((c) => !c.deletedAt).toArray();
    
    return projects.map((p) => {
      const pCases = allCases.filter((c) => c.projectId === p.id);
      return {
        ...p,
        cases: pCases,
      };
    });
  }

  /**
   * Add a case to a project
   */
  async addProjectCase(projectId, caseData) {
    const now = Date.now();
    const caseRecord = {
      ...caseData,
      id: caseData.id || generateUUID(),
      projectId,
      status: caseData.status || "active",
      progress: caseData.progress || 0,
      createdAt: now,
      updatedAt: now,
      version: 1,
      syncStatus: "pending",
      deletedAt: null,
    };

    await db.transaction("rw", [db.projectCases, db.syncQueue], async () => {
      await db.projectCases.put(caseRecord);
      await db.syncQueue.add({
        id: generateUUID(),
        entity: "projectCase",
        entityId: caseRecord.id,
        operation: "create",
        payload: caseRecord,
        createdAt: now,
        status: "pending",
      });
    });

    return caseRecord;
  }

  /**
   * Update case progress percentage
   */
  async updateCaseProgress(caseId, progress) {
    const c = await db.projectCases.get(caseId);
    if (!c) return false;

    const now = Date.now();
    const updated = {
      ...c,
      progress: Math.min(100, Math.max(0, Number(progress) || 0)),
      updatedAt: now,
      version: (c.version || 0) + 1,
      syncStatus: "pending",
    };

    await db.transaction("rw", [db.projectCases, db.syncQueue], async () => {
      await db.projectCases.put(updated);
      await db.syncQueue.add({
        id: generateUUID(),
        entity: "projectCase",
        entityId: caseId,
        operation: "update",
        payload: updated,
        createdAt: now,
        status: "pending",
      });
    });

    return updated;
  }
}

export const projectRepository = new ProjectRepository();
