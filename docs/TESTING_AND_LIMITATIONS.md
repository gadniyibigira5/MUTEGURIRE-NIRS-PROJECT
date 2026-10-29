# Testing status and limitations

## Test status

This document intentionally separates code that exists from code that has been verified. Re-run the commands below on the final release commit and record actual results before submission.

| Check | Status based on current project evidence | Required next step |
|---|---|---|
| Python validation script against starter dataset | Ran locally and wrote `src/data/validation.json` plus `tools/out/validation_report.md` | Keep the report; review statuses and do not describe single-source records as verified. |
| Python package imports for extraction tools | Required packages imported successfully in the user's local `.venv` | Reuse the working environment. |
| Extraction against original RDHS/EICV7 files | Not confirmed | Run only after source files are downloaded; compare every candidate with the original page/slide. |
| Frontend production build | Not confirmed for the current final package | Run `npm run build` locally and fix errors before deployment. |
| Optional API health endpoint | Not confirmed on the deployed host | Run locally and after deployment. |
| Chat model response | Not confirmed with a real provider key | Test with a non-sensitive question; verify fallback when no key is configured. |
| PDF extraction preview | Candidate extraction is implemented, but accuracy has not been validated against a representative source corpus | Test at least one known table and one scanned PDF; document failure behavior. |
| Mobile/accessibility | Not confirmed by automated or manual test evidence | Test 375px width, keyboard focus, labels, contrast, errors, and long names. |
| Production deployment | Not confirmed | Follow [Deployment](DEPLOYMENT.md) and save the exact deployed URL. |

## Current validation report

The local report on 29 October 2026 counted seven indicators across 30 districts: 0 `validated`, 129 `single_source`, 0 `discrepancy`, and 81 `missing`. This is a count of statuses, not a data-accuracy score. The single-source values were carried from the prototype and had not been cross-checked against NISR tables.

## Data and analytical limitations

- The source-extraction scripts use heuristic parsing and may misread columns, units, repeated headings, footnotes, or table structure.
- The dataset is not fully source-verified.
- The under-five population value is a proxy; derived affected-child counts are not official counts.
- The 2006-vintage boundaries need checking against current authoritative geometry.
- Indicator rankings may compare different subsets of districts because data availability differs by indicator.
- The prototype does not account fully for survey sampling uncertainty or prove that small rank differences are meaningful.
- The outreach scenario is illustrative, not a validated cost/effectiveness/equity optimization.
- The optional language model may still produce misleading wording despite grounding instructions; it must not be treated as a statistical source.
- PDF extraction supports text/table candidates; scanned image-only PDFs may require OCR and manual review.
- The current API has no authentication, durable audit log, malware scanning, persistent review queue, or approved publication workflow. Do not use it for confidential files or official live-data updates.

## Minimum manual test plan

1. Open the home page and dismiss the intro banner.
2. Switch the selected indicator; verify ranking and map update.
3. Select districts from different provinces; check missing values and status labels.
4. Toggle English/Kinyarwanda and light/dark mode.
5. Open the insight/chart and planner; verify no console/runtime errors.
6. Ask the deterministic assistant a ranking question, a comparison, and a missing-data question.
7. If API enabled, test a model question with the key configured and with it absent.
8. Upload a small, non-sensitive, text-based PDF; inspect candidate values, page references, warnings, and review-required message.
9. Try a non-PDF or oversized file and confirm a useful error appears.
10. Test at 375px width and a desktop viewport.
11. Run `npm run build` and verify the deployed app from a private window.

Record only tests actually performed and the observed result. Do not mark this checklist complete based on the instructions alone.
