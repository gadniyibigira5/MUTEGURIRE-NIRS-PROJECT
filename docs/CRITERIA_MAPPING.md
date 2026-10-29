# NISR hackathon criteria mapping

The official NISR 2026 hackathon page lists five evaluation dimensions worth 20 points each: problem relevance, data and methodology, technical innovation, usability/design, and tangible impact. This mapping describes evidence currently present and the gaps that should be closed; it is not a claim about a score.

| Criterion | Mutegurire evidence | Current gap / action |
|---|---|---|
| Problem understanding and relevance | District-level maternal and child health planning, poverty context, and visible geographic variation; Track 3 open-innovation framing | Keep the user/problem statement prominent. Verify national-priority targets from the primary NST2 document. Do not claim health impact before evaluation. |
| Data use and methodology | NISR RDHS/EICV7/Census publications are the intended primary sources; status-aware dataset and reproducible extraction/validation scripts | The current validation output has zero fully validated records, 129 single-source and 81 missing across seven indicator groups. Review original tables and record page-level provenance before claiming validated data. |
| Technical innovation | Interactive 2D/3D district map, ranking/profile/insight views, data-aware assistant, optional model endpoint, PDF candidate extraction | The optional API and PDF flow require production deployment and testing. Do not call the model “trained” unless a custom training/evaluation pipeline exists. |
| Usability and design | Responsive React interface, English/Kinyarwanda toggle, dark mode, district selection, visible status pills and caveats | Test at 375px and desktop, keyboard navigation, contrast, empty states, loading/errors, and the deployed site. Record results. |
| Tangible impact | Helps users identify data gaps and compare district indicators before planning discussions | Conduct user testing with appropriate stakeholders when possible; measure task completion/time only if actually tested. Recommendations are discussion prompts, not proven interventions. |

## Submission package checklist

The official page asks for a public GitHub link, deployed application link, and documentation. It also requires source acknowledgement, AI-use disclosure, and a truthful originality declaration. Before submitting, verify the exact public repository, deployed URL, team eligibility, and all declarations.

Source: [NISR 2026 Big Data Hackathon](https://statistics.gov.rw/about/hackathon/2026-hackathon-competition).
