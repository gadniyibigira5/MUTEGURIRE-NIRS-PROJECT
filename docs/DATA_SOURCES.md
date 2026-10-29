# Data sources and provenance

This register distinguishes **intended source publications** from **sources already verified against individual values**. The existence of a publication link does not mean every dashboard value has been checked against it.

| Data domain | Intended source | Geographic level / use | Current status | Acquisition and review |
|---|---|---|---|---|
| Maternal and child health | NISR, *Demographic and Health Survey (2025) — Final Report* | District indicators where the report publishes them; selected health metrics | Prototype values remain partly unverified; extraction script is heuristic | Download the final report manually from the [NISR DHS 2025 page](https://statistics.gov.rw/data-sources/surveys/Demographic-and-Health-Survey/demographic-and-health-survey-2025). Verify table title, indicator definition, year, denominator, district row, column, footnotes, and reliability markings. |
| Poverty | NISR, *Integrated Household Living Conditions Survey 7 (EICV7), 2023/24*; district disseminations and main indicators report | District poverty context | Prototype values remain partly unverified; extraction script is heuristic | Use the [NISR EICV7 publication page](https://alpha.statistics.gov.rw/data-sources/surveys/EICV/integrated-household-living-conditions-survey-7-eicv-7). Download relevant district materials manually and verify each slide/table and definition. |
| Population | NISR, *Rwanda Fifth Population and Housing Census (PHC) 2022* and related official population tables | Population context | District total population values need traceable table-level citations in the project data register; under-five district values are currently proxies | Start at the NISR census/publications site and record exact publication title and table. Do not infer district age structure from a province distribution without labelling it a proxy. |
| Boundaries | GeoJSON files included in `public/data/` | Map rendering and geographic joins | Bundled geometry is described as 2006 vintage; current alignment has not been independently confirmed | Check against current authoritative NISR or National Land Authority boundary data before operational use. Record licence and source version. |
| National context / policy targets | Current official NST2 documentation | Context for problem framing | Target statements in the prototype require direct verification against the current official strategy document | Do not repeat a target, target year, or denominator as official until the primary document and page are recorded. |

## Per-value provenance required

Before a value is considered ready for public-facing analysis, the data register should record:

- Canonical district name and indicator ID.
- Numeric value and unit (percent, count, rate per denominator, etc.).
- Indicator definition, target population, denominator, and reference period.
- Source institution, publication title, version/year, URL, page/table/slide.
- Extraction method and whether the value was transcribed manually or extracted automatically.
- Validation status, reviewer, review date, and any footnote/reliability caveat.
- Any transformation, rounding, proxy, or derivation applied.

## Attribution

Cite the original publication, not only the NISR landing page. Preserve required licence attribution for every dataset and boundary file. The NISR competition page notes that source references must be acknowledged and that AI assistance must be disclosed. Check each dataset's licence and terms individually; do not assume every third-party boundary or external dataset uses the same licence.

## Known provenance gaps

The current validation report marks prototype values as `single_source` when carried forward from legacy data and marks unavailable values as `missing`. The source extraction scripts have not been documented as successfully reviewed against the original source reports. See [Data gaps](../DATA_GAPS.md) and [the validation tool guide](../tools/README.md).
