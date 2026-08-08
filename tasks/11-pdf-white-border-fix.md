# Task 11 — Statement PDF: keep all text inside the page (white border)

## Requirement (all_plan.md lines 108–111)

> ال pdf ال طلع الكلام خارج برا الشاشة
> خلي في بورد ابيض عشان الكلام كله يبقي ظاره جوا الملف

When printing the statement of account to PDF, text was going outside the page.
Fix: add a white border/padding around the content so everything stays visible
inside the A4 file.

## Changes (`frontend/assets/css/pages/statement.css`)

- `@media print`:
  - `.statement-page` → `display: block` (was flex-centered, which let the sheet grow
    wider than the printable area).
  - `.statement-sheet` → `width: 100%`, `padding: 6mm 8mm` (a white border around the
    content), `overflow: hidden` so nothing can push past the page edge.
  - `.statement-meta` → `min-width: 0` so the header cannot force horizontal overflow.

## Verification (Playwright, print-media at A4 width = 703px)

- Sheet fills the page (0 → 703px).
- Materials table sits inside the padding (30 → 673px).
- Summary box fits (253 → 673px).
- `overflowCount = 0` — no element extends beyond the printable area.
- `page.pdf({ format: 'A4' })` generates a valid 128KB PDF.
