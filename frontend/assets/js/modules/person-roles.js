/* ============================================
   Spark ERP — Person Roles
   Shared labels for person types (supplier /
   contractor / client / other) and contractor
   specialties used by the quick add form and
   supplier selects.
   ============================================ */

export const PERSON_TYPE_LABELS = {
  supplier: { en: "Supplier", ar: "مورد" },
  contractor: { en: "Contractor", ar: "مقاول" },
  client: { en: "Client", ar: "عميل" },
  other: { en: "Other", ar: "أخرى" },
};

export const CONTRACTOR_SPECIALTIES = [
  { value: "electrical", en: "Electrical", ar: "كهرباء" },
  { value: "plumbing", en: "Plumbing", ar: "سباكة" },
  { value: "painting", en: "Painting", ar: "دهانات" },
  { value: "tiles", en: "Tiles", ar: "سيراميك" },
  { value: "carpentry", en: "Carpentry", ar: "نجارة" },
  { value: "finishing", en: "Finishing", ar: "تشطيب" },
  { value: "other", en: "Other", ar: "أخرى" },
];

export function personTypeLabel(type, lang) {
  const label = PERSON_TYPE_LABELS[type] || PERSON_TYPE_LABELS.other;
  return label[lang] || label.en;
}

export function personRolesLabel(person, lang) {
  const roles = Array.isArray(person.roles) ? person.roles : [];
  if (roles.length <= 1) return "";
  return roles.map((r) => personTypeLabel(r, lang)).join(" • ");
}

export function contractorLabel(role, name, lang = "en") {
  const specialty = CONTRACTOR_SPECIALTIES.find((s) => s.value === role) || CONTRACTOR_SPECIALTIES[CONTRACTOR_SPECIALTIES.length - 1];
  const roleLabel = specialty[lang] || specialty.en;
  const personName = String(name || "").trim();
  return lang === "ar"
    ? `مقاول ${roleLabel} (${personName})`
    : `${roleLabel} Contractor (${personName})`;
}

export function contractorSpecialty(person) {
  if (person && person.role) return person.role;
  if (Array.isArray(person && person.roles)) {
    const known = CONTRACTOR_SPECIALTIES.map((s) => s.value);
    for (const r of person.roles) {
      if (known.includes(r)) return r;
    }
  }
  return "other";
}
