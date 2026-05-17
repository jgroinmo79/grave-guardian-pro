Generate a branded PDF price sheet (Granite & Bronze theme) saved to `/mnt/documents/grave-detail-price-sheet.pdf` and delivered as a downloadable artifact.

## Contents

1. **Cover / Header** — Grave Detail, "Products & Services Price Sheet", contact info (info@gravedetail.net, (573) 545-5759).
2. **One-Time Monument Cleaning** — table of all 7 monument types with prices:
   - Single Marker $135, Double Marker $195, Single Slant $185, Single Upright $215, Double Slant $265, Double Upright $295, Grave Ledger $395
   - "What's included" bullet list (SERVICE_FEATURES).
3. **Annual Maintenance Plans** — 2/3/4 cleanings per year. Full price matrix per monument type (from `MAINTENANCE_PLAN_PRICES`).
4. **Flower-Only Plans** — 1/2/3/4 placements: $125 / $200 / $275 / $350.
5. **Add-Ons** — full list from `ADD_ONS` (Damage Report $65, Holiday Date Lock $35, Inscription Repainting $75–$150, Weeding $75+, Flag Placement $35, plus quoted items).
6. **Travel Zones** — pulled live from the `travel_zones` table (Zone 1/2/3 with fees).
7. **Footer** — preservation notes, Benton MO origin, generated date.

## Technical

- Python + `reportlab` (Platypus) for layout.
- Source pricing constants from `src/lib/pricing.ts` (transcribed into the script — no TS runtime needed).
- Fetch travel zones via `psql` using the existing `PG*` env vars.
- Bronze (#C9976B) headings, dark text on white for print legibility.
- QA: render each page to JPEG with `pdftoppm`, inspect for overflow/clipping, iterate.
- Final output: `<presentation-artifact>` tag pointing at the PDF.

No source files in the project will be modified.