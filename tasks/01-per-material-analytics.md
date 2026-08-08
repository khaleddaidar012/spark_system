# Task 1 — Per-Material Cost per m² in Project Analytics

## Task Description
The project analytics section must show, for **each consumed material**, how much that
material costs **per square meter (m²)** of the project, plus its **unit price** and
**total material cost**.

The owner's example:
- Project area = 100 m²
- Consumed 500 m³ of sand, unit price = 100 EGP / m³
- Total sand cost = 500 × 100 = 50,000 EGP
- Sand cost per m² = 50,000 / 100 = **500 EGP / m²**
- Repeat the same calculation for every material added to the project.

For every material the system calculates automatically:
1. Total Quantity
2. Unit
3. Unit Price
4. Total Material Cost (= Quantity × Unit Price)
5. Material Cost Per m² (= Total Material Cost ÷ Project Area)

## Project Material Summary (KPI)
- Project Area
- Total Material Cost (absolute, whole project)
- Material Cost / m²
- Labor Cost / m²
- Total Project Cost / m² = Material Cost / m² + Labor Cost / m²

## Required Implementation Steps
1. `materialAnalytics(project)` in `frontend/assets/js/modules/calc.js` returns, for each
   material in `project.materials`:
   - material name
   - quantity, unit
   - **unit price** (weighted average: total / quantity so that quantity × unitPrice = total)
   - total cost
   - total cost per m² (total / area; 0 when area is 0)
2. Group identical material names if consumed multiple times (optional but preferred) so
   one line per material shows the combined quantity and cost.
3. `projectAnalytics(project)` returns:
   - `materialTotal` (absolute total material cost)
   - `materialPerM2` = materialCost / area
   - `laborPerM2` = contractorCost / area
   - `totalPerM2` = materialPerM2 + laborPerM2 (per the owner's formula)
4. Update `renderAnalytics` in `frontend/assets/js/pages/project.js` to render the KPI grid
   (Area, Total Material Cost, Materials/m², Labor/m², Total Project Cost/m²) and a
   **per-material breakdown table** with columns:
   - Material name
   - Quantity + unit
   - Unit Price
   - Total cost
   - Cost per m²
5. Keep the consumed-materials badges.
6. Add i18n keys (en/ar) for the new labels:
   - Material / الخامة
   - Quantity / الكمية
   - Unit Price / سعر الوحدة
   - Total Cost / التكلفة الإجمالية
   - Cost per m² / التكلفة لكل م²
   - Total Material Cost / إجمالي تكلفة الخامات
   - Total Project Cost / m² / إجمالي تكلفة المشروع / م²
7. Add responsive CSS for the new table inside the analytics card.

## Expected Files to Modify
- `frontend/assets/js/modules/calc.js`
- `frontend/assets/js/pages/project.js`
- `frontend/pages/project.html`
- `frontend/data/i18n/en.json`
- `frontend/data/i18n/ar.json`
- `frontend/assets/css/pages/project.css`

## Completion Criteria
- The analytics card shows one row per consumed material with unit price, total cost and
  cost / m².
- Each row shows the material cost per m² computed as (total material cost / project area).
- Numbers match the owner's example logic exactly (e.g. 100 m², 500 m³ sand @ 100 →
  500 EGP/m²).
- KPI shows Total Material Cost (absolute) and Total Project Cost / m² = material + labor.
- The calculation updates automatically on add/edit/delete material and area change (all
  handlers re-run `renderAll()` which recomputes from the store).
- English and Arabic translations work for all new labels.
- Verified on the sample project (150 m²): materials/m² 410, labor/m² 633,
  total project cost/m² 1,043, unit prices 110 / 250 / 12,000.
