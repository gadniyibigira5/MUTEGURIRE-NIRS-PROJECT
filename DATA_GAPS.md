# Data gaps: what is missing, why, and what we did

Checked 29 October 2026 against the NISR RDHS 2025 page.

| Gap | Districts | Why | What the app does |
|---|---|---|---|
| ANC 4+, postnatal check, teen childbearing, unmet family-planning need | 15: all of Western, Northern and Kigali City | NISR has published only the Eastern and Southern 2025 province profiles. The other three are not yet released. | Shows "not available" with the reason. Rankings on these indicators compare the 15 districts that have data and say so. |
| Exact stunting value | Nyamasheke, Rulindo | Press coverage of RDHS 2025 lists the 11 districts above 30%; these two are not among them, but no exact value is published. | Shows "below 30%" in the profile and leaves them out of stunting rankings and the map colouring. |
| 2019-20 stunting baseline | 19 of 30 districts | Only 11 districts have a published 2020 value in the sources we found. | Change is shown only where both values exist. |
| Under-five population | all 30 | NISR province projections exist, but no district age table was found. | A province-share proxy, labelled as an estimate; the stunted-children count inherits that uncertainty. |
| District sampling error | all | Sample sizes and confidence intervals by district were not extracted from the final report. | Ranks are described as a priority group, not a strict order. |

## What we deliberately did not do
- No imputation or modelling to fill missing values. A guessed number would look like data.
- No mixing of 2019-20 and 2025 survey values in one ranking. Antenatal 4+ coverage moved from 47% to 78% nationally, so the two surveys are not comparable on one colour scale.

## How to fill the gaps when NISR publishes
1. Download the new province profile PDFs.
2. Run `tools/extract_rdhs.py`, review the output against the source tables, then run `tools/validate.py`.
3. Add the values to `src/data/districts.js`; the map, rankings and coverage counts update automatically.

## Sources that disagree
- NST2 stunting target: New Times coverage says "at least 15% by 2029"; a KT Press article says "15% by 2030". Verify against the NST2 document before quoting a year.
- NISR data is released under CC BY 4.0; keep the attribution in the app footer.
