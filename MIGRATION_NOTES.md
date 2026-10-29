# Migration notes

The original `umwana-ku-isonga.html` was the source for the embedded district values and geographic features. The React implementation intentionally restructures the interface rather than wrapping the old page in an iframe.

## Deliberate improvements
- React state controls language, view mode, selected indicator/district, search, province filter, and allocation scenario.
- Three.js rendering is isolated in `DistrictMap.jsx`; dataset and metric calculations are separate modules.
- Missing values render as unavailable and are excluded from metric ranking.
- A source/limitations panel explains the population proxy and non-causal nature of the prototype.
- Allocation is clearly labelled illustrative and only affects the local UI.

## Check before presenting as research output
1. Validate each copied district indicator against the exact NISR source tables and publication version.
2. Replace the under-five proxy with an appropriate district estimate or suppress the affected-child total.
3. Validate district boundaries/names against a current administrative source.
4. Review priority-weighting rules with domain experts; do not present them as evidence-based funding rules without validation.
