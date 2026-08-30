/* ============================================
   Spark ERP — Person Entity Repository
   Manages Suppliers, Contractors, Clients & Workers
   offline persistence with multi-role support.
   ============================================ */

import { BaseRepository } from "./base-repository.js";
import { db } from "../db/db.js";

class PersonRepository extends BaseRepository {
  constructor() {
    super("people", "person");
  }

  /**
   * Get all people matching a specific collection kind / role
   * (e.g. kind = 'suppliers' | 'contractors' | 'clients' | 'others')
   */
  async getByKind(kind) {
    return await db.people
      .filter((p) => !p.deletedAt && (p.kind === kind || (Array.isArray(p.roles) && p.roles.includes(kind))))
      .toArray();
  }

  /**
   * Search people by name or phone
   */
  async search(query, kindFilter = null) {
    const q = (query || "").trim().toLowerCase();
    return await db.people
      .filter((p) => {
        if (p.deletedAt) return false;
        if (kindFilter && p.kind !== kindFilter && (!Array.isArray(p.roles) || !p.roles.includes(kindFilter))) {
          return false;
        }
        if (!q) return true;
        return (p.name || "").toLowerCase().includes(q) || (p.phone || "").includes(q);
      })
      .toArray();
  }
}

export const personRepository = new PersonRepository();
