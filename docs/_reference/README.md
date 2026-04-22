# Reference archive

Historical artifacts kept in the repo as a reference for what the active code reproduces or was built from. **Not a spec, not live documentation** — don't ship code that imports from here. Everything here is safe to ignore for day-to-day work.

## Contents

- **`original-offer-template.doc`** — the hotel's actual Word offer letter (authored by "Reservierung — BLEICHE RESORT & SPA", 2021). Our backend's `_offer_export_html` and `frontend/src/utils/docxExport.ts` reproduce this layout section-for-section (salutation, date format, room amenities, Genusspauschale bullets, four closing paragraphs, signature). If the active export ever visually drifts from this, this file is the ground truth to check against.

- **`original-belegungsliste.xlsx`** — the hotel's actual Belegungsliste from 8 April 2026. The reference for what the Belegung editor and Excel export should look like — column layout, section rhythm, German abbreviations (TK, HSK, FS, AE, etc.).

- **`prompt.md`** — an earlier task brief that drove the hardening / export-porting work. Kept as context for why certain design choices were made.

- **`AUDIT.md`** — output of an earlier whole-codebase audit (data model, backend, frontend). Useful if you want to see which issues had been flagged and which were resolved.

## Replacing

If the hotel's templates change:
1. Drop the new version into this folder with the same filename.
2. Verify the exports still match — `frontend/src/utils/docxExport.ts` for the Word output, `frontend/src/utils/excelExport.ts` for the Excel output, `backend/app/routers/offers.py::_offer_export_html` for the HTML / print view.
3. Update whichever doesn't match.
