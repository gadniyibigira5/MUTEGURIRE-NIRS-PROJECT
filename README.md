# Mutegurire — Improved React frontend

A React + Vite prototype for exploring district-level maternal and child health indicators in Rwanda. It is a **descriptive decision-support prototype**, not a causal model, individual prediction system, or validated funding-allocation engine.

## Problem and intended users

National health indicators can improve while needs still differ between districts. District health planners and public-health analysts need to compare the available indicators, see where information is missing, and investigate potential service gaps. This prototype brings available district indicators into one interface and makes comparisons more transparent.

## Run locally

Requirements: Node.js 20.19+ or 22.12+ recommended.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To test a production build, run `npm run build`.

## Frontend features

- 3D and 2D district map with hover and click interactions.
- Indicator selector and ranking, with missing values excluded rather than treated as zero.
- District profile with descriptive stunting change between 2019–20 and 2025 only where both values exist.
- Side-by-side district comparison.
- Illustrative outreach-team distribution scenario, not a budget recommendation.
- English/Kinyarwanda toggle, province filter, search, light/dark mode, and responsive layout.
- Visible problem statement, intended audience, source links, and methodology notes.

## Methods and limitations

- **Sources:** RDHS 2025 district profile values where available, EICV7 poverty values in the prototype, population context derived from the supplied dataset, and district boundary geometry carried over from the original HTML prototype. Validate each number against its exact source table before formal use.
- **Missing data:** Missing values remain `null`/unavailable; they are not converted to zero. Rankings only use districts with a value for the selected indicator. Completeness varies by indicator, so comparisons across indicators or across differently covered districts require care.
- **Stunting change:** Where both `st20` and `st` exist, the interface shows `2025 value - 2019–20 value` in percentage points. This is descriptive only; with two survey periods it does not establish a trend, cause, or statistical significance.
- **Affected-child estimate:** The estimate is computed as under-five population proxy × stunting prevalence. Because the district under-five population values are proxies, the result is not an official district count and should not be used as a precise burden estimate.
- **Allocation scenario:** The illustrative weighting uses the selected indicator to distribute a chosen number of hypothetical outreach teams. It does not consider intervention cost, staff availability, uncertainty, service capacity, equity weights, or expected impact. It is not a validated allocation model.
- **Causality:** Correlations and district-level co-occurrence do not prove causation. The app is a pattern-exploration tool.
- **Boundaries:** Geographic data is inherited from the supplied prototype and may reflect an older administrative-boundary vintage. Verify boundaries and district names before official use.
- **Survey uncertainty:** Differences between survey estimates can reflect sampling uncertainty. Do not interpret small differences as meaningful without confidence intervals or significance tests from the source.

## AI assistance disclosure

AI assistance was used to support code generation, interface refinement, and documentation. The project team remains responsible for verifying sources, validating data, reviewing analytical assumptions, and approving the final submission.

## Before backend development

1. Validate all district values against NISR tables and record the exact table/page, reference year, definition, and denominator.
2. Verify administrative boundaries and district names.
3. Replace proxy population figures with a defensible district-level source or remove the affected-child count.
4. Review the allocation scenario with a public-health/planning expert before presenting it as a decision-support method.
5. Test keyboard access, narrow mobile widths, and English/Kinyarwanda translations.
