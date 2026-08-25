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
  { value: "electrical",   en: "Electrical",          ar: "كهرباء" },
  { value: "plumbing",     en: "Plumbing",             ar: "سباكة" },
  { value: "painting",     en: "Painting",             ar: "نقاشة" },
  { value: "tiles",        en: "Tiles",                ar: "مبلطية" },
  { value: "carpentry",    en: "Carpentry",            ar: "نجارة" },
  { value: "finishing",    en: "Finishing",            ar: "تشطيب" },
  { value: "gypsum",       en: "Gypsum",               ar: "جبس" },
  { value: "plastering",   en: "Plastering",           ar: "محارة" },
  { value: "masonry",      en: "Masonry",              ar: "مباني" },
  { value: "marble",       en: "Marble",               ar: "رخام" },
  { value: "insulation",   en: "Insulation",           ar: "عزل" },
  { value: "aluminum",     en: "Aluminum & PVC",       ar: "ألومنيوم و PVC" },
  { value: "kitchens",     en: "Wood Kitchens",        ar: "مطابخ خشب" },
  { value: "wooddoors",    en: "Wood Doors",           ar: "أبواب خشب" },
  { value: "woodcladding", en: "Wood Cladding",        ar: "تجاليد خشب" },
  { value: "hvac",         en: "HVAC / AC",            ar: "تكييفات" },
  { value: "demolition",   en: "Demolition & Cleanup", ar: "تكسير / تشوين / تنظيف" },
  { value: "fireworks",    en: "Fire Safety",          ar: "أعمال الحريق" },
  { value: "ironwork",     en: "Ironwork / Formwork",  ar: "حداده / وصلة صب" },
  { value: "lean",         en: "Lean Contractor",      ar: "مقاول لين" },
  { value: "insulplumb",   en: "Insulation & Plumbing", ar: "عزل / سباكة" },
  { value: "other",        en: "Other",                ar: "أخرى" },
];

export const SUPPLIER_CATEGORIES = [
  { value: "plumbing_damietta",  en: "Plumbing Supplies (Damietta)",  ar: "بضاعة سباكة (دمياط)" },
  { value: "plumbing_cairo",     en: "Plumbing Supplies (Cairo)",      ar: "بضاعة سباكة (القاهرة)" },
  { value: "electrical",         en: "Electrical Supplies",            ar: "توريدات كهرباء" },
  { value: "insulation",         en: "Insulation Materials",           ar: "مواد عزل" },
  { value: "ceramics",           en: "Ceramics",                       ar: "موردين سيراميك" },
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
