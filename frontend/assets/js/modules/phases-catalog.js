/* ============================================
   Spark ERP — Project Phases Catalog
   Defines the DEFAULT_PHASES catalog seeded into
   every new project. Phases are stored embedded
   inside project.phases[] in the project JSON blob
   (the D1 `data` column). No SQL migration needed.

   Existing projects without a `phases` field are
   seeded from this catalog on first access (in
   project-phases.js → ensureProjectPhases()).
   ============================================ */

/**
 * @typedef {"pending"|"active"|"done"} PhaseStatus
 */

/**
 * @typedef {Object} SubPhase
 * @property {string}      id        — unique identifier (e.g. "sub_concrete_iron")
 * @property {string}      label     — Arabic label
 * @property {string}      labelEn   — English label
 * @property {string}      color     — hex color string
 * @property {PhaseStatus} status    — current status
 * @property {string|null} [startedAt]   — ISO timestamp when activated
 * @property {string|null} [completedAt] — ISO timestamp when completed
 */

/**
 * @typedef {Object} Phase
 * @property {string}      id          — unique identifier (e.g. "phase_concrete")
 * @property {string}      label       — Arabic label
 * @property {string}      labelEn     — English label
 * @property {string}      color       — hex color string
 * @property {PhaseStatus} status      — current status
 * @property {number}      order       — display/sort order (1 = first)
 * @property {boolean}     isCustom    — true only for user-added custom phases
 * @property {SubPhase[]}  subPhases   — nested sub-phases (may be empty)
 * @property {string|null} activeSubPhaseId — id of the currently active sub-phase
 * @property {string|null} startedAt   — ISO timestamp when phase was first activated
 * @property {string|null} completedAt — ISO timestamp when phase was marked done
 */

/**
 * @typedef {Object} PhaseLogEntryBase
 * @property {string} id        — unique log entry id
 * @property {string} type      — "status_change" | "finance"
 * @property {string} phaseId   — parent phase id
 * @property {string|null} subPhaseId — sub-phase id (if applicable)
 * @property {string} timestamp — ISO timestamp
 */

/**
 * @typedef {PhaseLogEntryBase & {
 *   type: "status_change",
 *   fromStatus: PhaseStatus,
 *   toStatus:   PhaseStatus,
 *   note: string
 * }} StatusChangeLogEntry
 */

/**
 * @typedef {PhaseLogEntryBase & {
 *   type:          "finance",
 *   transactionId: string,
 *   direction:     "in"|"out",
 *   amount:        number,
 *   note:          string
 * }} FinanceLogEntry
 */

/**
 * @typedef {StatusChangeLogEntry|FinanceLogEntry} PhaseLogEntry
 */

/**
 * The predefined phase catalog. Deep-cloned and seeded into every new project.
 * Status is always "pending" — it is set at seed time, not stored here.
 *
 * @type {Omit<Phase, "status"|"startedAt"|"completedAt"|"activeSubPhaseId">[]}
 */
export const DEFAULT_PHASES = [
  {
    id:       "phase_land",
    label:    "شراء الارض",
    labelEn:  "Land Purchase",
    color:    "#f59e0b",
    order:    1,
    isCustom: false,
    subPhases: [],
  },
  {
    id:       "phase_license",
    label:    "الرخصة",
    labelEn:  "License / Permit",
    color:    "#10b981",
    order:    2,
    isCustom: false,
    subPhases: [],
  },
  {
    id:       "phase_concrete",
    label:    "الخرسانة المسلحة",
    labelEn:  "Reinforced Concrete",
    color:    "#6366f1",
    order:    3,
    isCustom: false,
    subPhases: [
      { id: "sub_concrete_iron",  label: "حداده",  labelEn: "Ironwork",    color: "#818cf8", status: "pending", startedAt: null, completedAt: null },
      { id: "sub_concrete_carp",  label: "نجارة",  labelEn: "Carpentry",   color: "#818cf8", status: "pending", startedAt: null, completedAt: null },
      { id: "sub_concrete_maint", label: "صيانة",  labelEn: "Maintenance", color: "#818cf8", status: "pending", startedAt: null, completedAt: null },
    ],
  },
  {
    id:       "phase_elec",
    label:    "الكهرباء جواها",
    labelEn:  "Internal Electrical",
    color:    "#f97316",
    order:    4,
    isCustom: false,
    subPhases: [
      { id: "sub_elec_found",  label: "تأسيس",        labelEn: "Rough-in",     color: "#fb923c", status: "pending", startedAt: null, completedAt: null },
      { id: "sub_elec_spots",  label: "تفتيح سبوتات", labelEn: "Spot Opening", color: "#fb923c", status: "pending", startedAt: null, completedAt: null },
      { id: "sub_elec_finish", label: "تشطيب",         labelEn: "Finishing",    color: "#fb923c", status: "pending", startedAt: null, completedAt: null },
    ],
  },
  {
    id:       "phase_plumb",
    label:    "تأسيس سباكة",
    labelEn:  "Plumbing Rough-in",
    color:    "#0ea5e9",
    order:    5,
    isCustom: false,
    subPhases: [],
  },
  {
    id:       "phase_freon",
    label:    "تأسيس فريون",
    labelEn:  "Freon / AC Rough-in",
    color:    "#06b6d4",
    order:    6,
    isCustom: false,
    subPhases: [],
  },
  {
    id:       "phase_plaster",
    label:    "محارة",
    labelEn:  "Plastering",
    color:    "#84cc16",
    order:    7,
    isCustom: false,
    subPhases: [],
  },
  {
    id:       "phase_tiles",
    label:    "بلاط",
    labelEn:  "Tiling",
    color:    "#ec4899",
    order:    8,
    isCustom: false,
    subPhases: [],
  },
  {
    id:       "phase_gypsum",
    label:    "جبس",
    labelEn:  "Gypsum",
    color:    "#a78bfa",
    order:    9,
    isCustom: false,
    subPhases: [],
  },
  {
    id:       "phase_marble",
    label:    "رخام",
    labelEn:  "Marble",
    color:    "#e879f9",
    order:    10,
    isCustom: false,
    subPhases: [],
  },
  {
    id:       "phase_insul",
    label:    "عزل",
    labelEn:  "Insulation",
    color:    "#f43f5e",
    order:    11,
    isCustom: false,
    subPhases: [],
  },
];

/**
 * Returns a deep clone of DEFAULT_PHASES with all statuses initialized to
 * "pending" and all timestamp fields set to null. Use this to seed a new project.
 *
 * @returns {Phase[]}
 */
export function seedPhases() {
  return DEFAULT_PHASES.map((p) => ({
    ...p,
    status:          "pending",
    startedAt:       null,
    completedAt:     null,
    activeSubPhaseId: null,
    subPhases: p.subPhases.map((s) => ({
      ...s,
      status:      "pending",
      startedAt:   null,
      completedAt: null,
    })),
  }));
}
