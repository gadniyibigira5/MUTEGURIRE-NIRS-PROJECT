# Mutegurire — Methods and limitations

This root-level file is retained for compatibility with the original project documentation. The canonical, reorganized methodology is now in [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md).

For source provenance, read [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md). For known missing indicators and current gaps, read [`DATA_GAPS.md`](DATA_GAPS.md). For the validation pipeline, see [`tools/README.md`](tools/README.md). For the optional model-backed assistant and PDF extraction preview, read [`AI_AND_PDF_IMPORT.md`](AI_AND_PDF_IMPORT.md).

## Summary of key limitations

- The current starter validation output contains 0 fully validated records, 129 single-source records, and 81 missing records across seven indicator groups. Single-source values are carried from the prototype and have not been independently cross-checked.
- The under-five district population is a proxy; the derived burden is not an official count.
- The bundled district/province boundaries are described as 2006 vintage.
- The allocation scenario is illustrative, not a cost/effectiveness/equity optimizer.
- PDF extraction is heuristic and preview-only. It does not update the live data.
- The optional model endpoint is an existing language-model API, not a custom-trained Mutegurire model.
- National strategy target statements must be verified against the current official NST2 document before use.

AI assisted with code and documentation. The team is responsible for checking all source data, calculations, implementation, and claims.
