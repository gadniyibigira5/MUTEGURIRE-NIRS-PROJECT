# Mutegurire

**Evidence-aware district planning for maternal and child health in Rwanda**  
*NISR Big Data Hackathon 2026 · Track 3: Open Innovation*

Mutegurire brings selected maternal and child health, poverty, and population-context indicators for Rwanda's 30 districts into one interactive planning view. It is designed to help district health planners and public-health analysts inspect geographic differences, compare indicators, understand data gaps, and discuss possible service-planning priorities.

> **Interpretation rule:** Mutegurire is a descriptive planning prototype, not a clinical tool, causal model, validated forecast, or automatic funding allocator. Several prototype values remain unverified. The interface and documentation deliberately identify missing, single-source, proxy, and derived values rather than silently filling gaps.

## Start here

- **Explore the dashboard:** district map, rankings, district profiles, comparison/insight views, planning scenario, and Ask Mutegurire assistant.
- **Understand the evidence:** read [Data sources](docs/DATA_SOURCES.md), [Methodology](docs/METHODOLOGY.md), and [Data gaps](DATA_GAPS.md).
- **Run locally:** follow [Local setup](docs/DEVELOPMENT.md).
- **Deploy:** follow [Deployment plan](docs/DEPLOYMENT.md).
- **Prepare a demo:** use [Demo script](docs/DEMO_SCRIPT.md).
- **Review limitations and AI use:** see [Limitations and testing](docs/TESTING_AND_LIMITATIONS.md) and [AI disclosure](docs/AI_DISCLOSURE.md).

## Why this problem matters

National averages can hide meaningful differences between districts. Planners need a way to view available indicators together, see where evidence is incomplete, and identify questions that deserve further investigation. Mutegurire makes those comparisons easier while keeping uncertainty and source limitations visible. It does not claim that an indicator causes another outcome, or that a district's rank alone establishes which intervention will work.

## What the prototype includes

- Interactive Rwanda district map with 2D/3D views.
- Indicator-based district ranking and district profile.
- Descriptive comparison and quadrant/insight view.
- English and Kinyarwanda interface toggle.
- Light/dark display mode.
- Illustrative outreach-capacity scenario; not a validated budget or staffing model.
- Data-quality status pills and missing-data explanations.
- Rule-based, offline assistant that answers a limited set of questions from the dashboard table.
- Optional server-side language-model endpoint when configured.
- PDF extraction preview that returns candidate statistics with page references for human review. It does **not** publish extracted values to the live dataset.

## Technology

- Frontend: React 18, Vite, Three.js, Lucide React.
- Data preparation: Python scripts using `pdfplumber`, `python-pptx`, and `pandas`.
- Optional API: FastAPI and Uvicorn; PDF parsing uses `pdfplumber`.
- Hosting configuration: Vercel static build for the frontend; optional Python API hosted separately.

## Quick start

Requirements: Node.js/npm and Python 3.10+ (Python 3.12 is a practical choice for the API and extraction tools).

```bash
npm install
npm run dev
```

For the optional API, open a second terminal in the project root:

```bash
python -m venv .venv
# Git Bash on Windows:
source .venv/Scripts/activate
python -m pip install -r api/requirements.txt
npm run api
```

Vite normally serves the frontend at `http://localhost:5173` and proxies `/api` to `http://127.0.0.1:8000`. The deterministic assistant works without an API key. The optional model-backed response requires a server-side `OPENAI_API_KEY`; never put the key in browser code or a `VITE_` variable.

See [AI and PDF import](AI_AND_PDF_IMPORT.md) for exact behavior and limitations.

## Data status

The committed `src/data/validation.json` is a starter validation file generated from the prototype's current data. Its `single_source` status means “carried from the prototype and not independently cross-checked,” not “officially verified.” The validation pipeline ran against the local starter dataset, but the project documentation states that the source-report extraction scripts have not yet been run and human-reviewed against the original RDHS/EICV7 reports. Do not describe all dashboard values as validated.

Status meanings and rules are documented in [Methodology](docs/METHODOLOGY.md). To reproduce the extraction pipeline, follow [tools/README.md](tools/README.md). Do not run the validator against real source files and publish the result without reviewing the extracted values, source pages, definitions, survey years, denominators, and reliability notes.

## Repository map

```text
src/                       React application and dashboard data
  components/               District map, assistant, insight chart
  data/                     District table and validation metadata
  utils/                    Metric and assistant logic
public/data/                District/province GeoJSON used by the map
tools/                      RDHS/EICV7 extraction and validation scripts
api/                        Optional FastAPI chat/PDF preview service
docs/                       Project, data, methods, deployment, and demo docs
DATA_GAPS.md                Known missing data and handling decisions
METHODS_AND_LIMITATIONS.md  Detailed method and limitation note
AI_AND_PDF_IMPORT.md        Optional model and PDF preview guide
```

## Evaluation alignment

Mutegurire is positioned under Track 3 because it addresses maternal and child health planning, using NISR data alongside public information where available. The NISR hackathon evaluates problem relevance, data/methodology, technical innovation, usability, and tangible impact, each worth 20 points. The project aims to address all five through a clearly defined public-health planning problem, traceable data, explicit limitations, accessible visual exploration, and a demonstration focused on practical decisions. See [Criteria mapping](docs/CRITERIA_MAPPING.md).

## Sources and attribution

Primary source pages and acquisition notes are maintained in [Data sources](docs/DATA_SOURCES.md). NISR publication pages may change, so verify the exact report title, edition, table, and page in the downloaded publication. Do not cite a source as confirming a figure until the source table has been checked directly.

## AI use, originality, and competition rules

AI tools assisted with code generation, extraction-script scaffolding, and documentation drafting. The team remains responsible for checking the code, source data, calculations, and claims. See [AI disclosure](docs/AI_DISCLOSURE.md). The team must review and approve the final originality declaration before submission; do not submit a declaration that the team cannot truthfully confirm. Review the current official [NISR hackathon rules](https://statistics.gov.rw/about/hackathon/2026-hackathon-competition), including the published public GitHub link, deployed app link, documentation, AI disclosure, source acknowledgement, and intellectual-property terms.

## Current project status

This is a working prototype and documentation package, not a certified public-health decision system. Local run/build and production deployment must be tested using the exact final commit. The optional API needs a separate host and correct environment settings if enabled. See [Testing and limitations](docs/TESTING_AND_LIMITATIONS.md) and [Deployment](docs/DEPLOYMENT.md).
