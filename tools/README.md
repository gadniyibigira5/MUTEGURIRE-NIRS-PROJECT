# Mutegurire data extraction and validation tools

These scripts provide a reproducible **starting pipeline** for extracting candidate figures from manually downloaded NISR publications, comparing them with the existing prototype dataset, and displaying transparent statuses. They are heuristic helpers, not a substitute for reviewing the original tables.

## 1. Prepare the source files

1. Visit the NISR publication page **Demographic and Health Survey (2025)**: <https://www.statistics.gov.rw/data-sources/surveys/Demographic-and-Health-Survey/demographic-and-health-survey-2025>. Open **Demographic and Health Survey (2025) - FINAL REPORT** and manually download the PDF. The final report is linked from this page; do not substitute the key-indicators report if you need district-level tables that appear only in the final report.
2. Visit **Integrated Household Living Conditions Survey 7 (EICV7)**: <https://alpha.statistics.gov.rw/data-sources/surveys/EICV/integrated-household-living-conditions-survey-7-eicv-7>. Open **EICV7 - District disseminations (PowerPoint)** and manually download the district PPTX files you need. The NISR publication page may change its file links over time.
3. Place the PDF and the PPTX files in local folders. These scripts do not download source documents automatically.

## 2. Install requirements

From the project root, use Python 3.10 or newer where possible:

```bash
python -m pip install -r tools/requirements.txt
```

`pandas` is included in the requirements list for downstream tabular work; the current scripts use `pdfplumber` and `python-pptx` directly.

## 3. Extract candidate RDHS cells

```bash
python tools/extract_rdhs.py --pdf "data/2025 RDHS Final Report.pdf" --pages all --out tools/out/rdhs_extracted.json
```

You can restrict the scan to 1-based page numbers or ranges, for example `--pages 180-220,245`. The script looks for district rows on tables whose page/table text indicates one of the requested indicators (`st`, `anc`, `pnc`, `teen`, `un`). Values wrapped in parentheses are marked `low_reliability: true`, following the requested DHS small-sample convention. It uses the first parseable numeric cell after the district name, so inspect each extracted value against the actual indicator column, year, denominator, and notes. Tables with multiple indicators or complex headers may need manual handling.

## 4. Extract candidate EICV7 poverty cells

```bash
python tools/extract_eicv.py --pptx-dir "data/eicv7-district-ppts" --out tools/out/eicv_extracted.json
```

The script scans PowerPoint slide text and tables. It accepts a district only when the slide mentions poverty and exactly one percentage candidate is found. Slides with multiple candidate percentages are skipped and warned about rather than guessed. Check the slide and figure definition manually.

## 5. Compare sources and create the report

```bash
python tools/validate.py
```

The script reads `src/data/districts.js` without Node, and reads the extracted JSON files when they exist. It writes `src/data/validation.json` and `tools/out/validation_report.md`. If extracted JSON files do not exist yet, the prototype's non-null values are kept as `single_source`, and nulls remain `missing`.

## Status meanings

- **validated** — two available sources agree within 2.0 percentage points; the preferred newer source is used. This is only a rule-based agreement check, not proof of significance, causation, or correctness.
- **single_source** — only one usable source value is available.
- **discrepancy** — two available source values differ by more than 2.0 percentage points; both are recorded in notes and the preferred primary source is retained where available.
- **missing** — no usable source value is available. Missing values are never replaced with guessed values or zero.
- **proxy** — under-five population is a province-share estimate, not a district projection.
- **derived** — affected-child estimate calculated as proxy under-five population × stunting prevalence; it is not an official count.

The extraction process may misread multi-column tables, repeated headings, footnotes, or values with unusual formatting. Do not describe the dataset as fully validated until a human has reviewed the original source tables and recorded any corrections.
