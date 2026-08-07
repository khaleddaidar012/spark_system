# Task 1 — Per-Material Cost per m² in Project Analytics

## Task Description
The project analytics section must show, for **each consumed material**, how much that
material costs **per square meter (m²)** of the project.

The owner's example:
- Project area = 100 m²
- Consumed 500 meters of sand, price per meter = 100 EGP
- Total sand cost = 500 × 100 = 50,000 EGP
- Sand cost per m² = 50,000 / 100 = **500 EGP / m²**
- Repeat the same calculation for every material added to the project.

## Goal
Let the user see, at a glance, exactly how much each individual material contributes to
the cost of every square meter of the project, in addition to the existing totals
(total / m², materials / m², labor / m²).

## Required Implementation Steps
1. Add a `materialAnalytics(project)` (or similar) helper in `frontend/assets/js/modules/calc.js`
   that returns, for each material in `project.materials`:
   - material name
   - quantity, unit
   - total cost
   - total cost per m² (total / area; 0 when area is 0)
2. Group identical material names if consumed multiple times (optional but preferred) so
   one line per material shows the combined quantity and cost.
3. Update `renderAnalytics` in `frontend/assets/js/pages/project.js` to render a
   **per-material breakdown table** inside the analytics card:
   - Material name
   - Quantity + unit
   - Total cost
   - Cost per m²
4. Keep the existing summary items (Area, Total/m², Materials/m², Labor/m²) and the
   consumed-materials badges.
5. Add i18n keys (en/ar) for the new table headers:
   - Material / الخامة
   - Quantity / الكمية
   - Total Cost / التكلفة الإجمالية
   - Cost per m² / التكلفة لكل م²
6. Add responsive CSS for the new table inside the analytics card.

## Expected Files to Modify
- `frontend/assets/js/modules/calc.js`
- `frontend/assets/js/pages/project.js`
- `frontend/data/i18n/en.json`
- `frontend/data/i18n/ar.json`
- `frontend/assets/css/pages/project.css`

## Completion Criteria
- The analytics card shows one row per consumed material.
- Each row shows the material cost per m² computed as (total material cost / project area).
- Numbers match the owner's example logic exactly (e.g. 100 m², 500 m sand @ 100 → 500 EGP/m²).
- Existing analytics totals still render correctly.
- English and Arabic translations work for all new labels.
