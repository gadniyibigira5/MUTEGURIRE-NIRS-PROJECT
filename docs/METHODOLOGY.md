# Methodology and interpretation

## Purpose

Mutegurire is a descriptive district-planning prototype. It is intended to make available data easier to inspect and discuss. It is not a causal analysis, a validated forecast, a clinical decision system, or an automatic allocator of budgets or services.

## Indicator handling

The current district table includes fields such as stunting prevalence (`st`), poverty (`pov`), antenatal care (`anc`), postnatal checks (`pnc`), teenage childbearing (`teen`), unmet family-planning need (`un`), older stunting values (`st20`), total population (`pop`), under-five population (`u5`), and derived burden context. The precise definition and denominator must be read from the source publication before comparing a metric across surveys or years.

## Validation statuses

| Status | Meaning in this prototype | What it does not mean |
|---|---|---|
| `validated` | Two available values meet the configured agreement threshold (within 2 percentage points) and the pipeline selects a preferred source value. | Not proof of correctness, statistical significance, comparability, or causal validity. |
| `single_source` | One usable source value is available; existing legacy values may be carried forward. | Not independently verified or necessarily official. |
| `discrepancy` | Two candidate source values differ by more than 2 percentage points; alternatives are retained in the validation record/report. | Not a licence to choose whichever number looks plausible. A reviewer must investigate definitions and source tables. |
| `missing` | No usable value is available. | Not zero, and not evidence that the condition is absent. |
| `proxy` | A value approximates the desired district quantity using a higher-level share or other proxy method. | Not a direct district estimate. |
| `derived` | A value is calculated from other fields. | Not an official count or independently observed measure. |

The 2-percentage-point rule is an operational consistency threshold, not a statistical test. Before using it across sources, confirm the definitions, population, denominator, reference period, and uncertainty are sufficiently comparable.

## Missing data

Missing values are not replaced with zero and should not be imputed without a documented statistical method and suitable evidence. Rankings exclude missing values for the selected indicator; therefore the number of districts represented can differ between indicators. Users must not compare rankings across indicators as if coverage were identical.

## Ranking and visualization

The interface orders districts using the currently selected indicator and available values. The ranking is a descriptive screening aid, not a recommendation that a district must receive resources first. A small difference in rank may not be meaningful, especially when district estimates have sampling uncertainty. The current prototype does not implement a full survey-weighted rank-uncertainty simulation, and users should not infer one from the ranking display.

## Change across time

A displayed change is the arithmetic difference between available values from two survey periods. It is not a forecast, and it should not be interpreted as a real trend unless indicator definitions, sampling, reference periods, and uncertainty are comparable. Report changes in percentage points when comparing percentages (for example, 30% to 25% is a decrease of 5 percentage points).

## Under-five proxy and derived burden

The `u5` field is a province-share proxy rather than an official district-level under-five population estimate. The affected-child burden is derived by multiplying that proxy by stunting prevalence. It inherits uncertainty from both inputs and must not be presented as an official number of children affected. Where this limitation could mislead, suppress the derived total or make the caveat prominent.

## Outreach scenario

The outreach-capacity scenario is illustrative. It allocates a hypothetical number of teams using a simple rule based on the selected indicator or an equal baseline. It does not account for costs, travel time, staff availability, facility capacity, intervention effectiveness, community preferences, or equity constraints. It is not a validated budget/staffing recommendation.

## PDF extraction and AI

PDF extraction identifies candidate values and page excerpts using heuristic text/table parsing. It can select the wrong column, misread footnotes, miss scanned pages, or confuse similarly formatted percentages. A candidate must be reviewed against the original publication. The current PDF preview does not write to the live district data. The optional language model receives dashboard values and is instructed to acknowledge missing data; generated language still requires review and must not be treated as a source of statistics.

## Family planning and rights

Where family-planning indicators are included, interpret them as access and unmet-need information, not as a target to reduce births in poor districts. Planning language must respect voluntary, informed choice and avoid coercive or stigmatizing recommendations.

## Boundaries and targets

The supplied district/province geometry is labelled as 2006 vintage. Verify current boundary alignment before operational use. The NST2 target context shown in the app must be checked against the latest official NST2 document before it is quoted as an official target.
