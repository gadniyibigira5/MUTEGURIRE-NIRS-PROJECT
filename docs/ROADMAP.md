# Roadmap

Priorities are ordered by risk reduction and submission value, not by visual novelty.

## P0 — Before public submission

- [ ] Run the frontend build on the exact final commit.
- [ ] Deploy the frontend and verify the public URL.
- [ ] Make the problem statement, source status, and limitations easy to find.
- [ ] Record the source provenance for every value that can be verified now.
- [ ] Keep missing/unverified values explicit; do not invent or infer figures to complete a table.
- [ ] Complete AI disclosure and the team's truthful originality declaration.
- [ ] Capture a short demo of only the working deployed features.

## P1 — Data reliability

- [ ] Download original NISR reports and record exact source pages/tables.
- [ ] Review extracted values manually; record reviewer and date.
- [ ] Add explicit year, unit, denominator, definition, and reliability metadata to the data register.
- [ ] Replace the under-five proxy with an authoritative district estimate or remove the derived burden count.
- [ ] Check boundary geometry against a current authoritative source.
- [ ] Add automated schema/range checks and regression tests for the validation script.

## P2 — PDF import workflow

- [ ] Add a review queue with draft/approved/rejected states.
- [ ] Require authenticated reviewer identity for approval.
- [ ] Preserve source document metadata, page/table reference, extracted text, and review history.
- [ ] Add duplicate detection, range checks, and indicator-specific units/definitions.
- [ ] Keep published data versioned and allow rollback.
- [ ] Add OCR only if scanned reports are a recurring need, then test it against known examples.
- [ ] Never allow upload alone to modify live data.

## P3 — Assistant quality

- [ ] Build a curated evaluation set of real, answerable and unanswerable questions in English and Kinyarwanda.
- [ ] Test numerical fidelity, missing-data behavior, citation/source grounding, refusal of unsupported claims, and language quality.
- [ ] Use deterministic calculations for all numeric comparisons; let a language model explain the result rather than calculate from memory.
- [ ] If a custom model is justified, first define the task, training examples, held-out evaluation, acceptance threshold, and maintenance plan.
- [ ] Do not describe a provider-connected model as “trained by the team.”

## P4 — Responsible planning

- [ ] Consult district/public-health practitioners about indicator definitions and decision workflow.
- [ ] Consider uncertainty intervals and rank robustness only when reliable sampling-error inputs are available.
- [ ] Evaluate the planner scenario with explicit constraints such as travel, service capacity, costs, equity, and intervention evidence before calling it an optimizer.
- [ ] Keep family-planning analysis rights-based, voluntary, and focused on unmet need/access.
