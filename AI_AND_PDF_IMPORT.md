# Mutegurire assistant and PDF import

## What is included

- A more usable chat panel with loading state, conversation reset, suggested questions, and graceful fallback to the existing deterministic dashboard assistant.
- An optional server-side language-model endpoint. The model receives the current district values and is instructed not to invent missing data, sources, causes, or forecasts.
- A PDF preview endpoint that extracts possible district/indicator/percentage rows and preserves the page number and source text.
- The UI labels extracted values as **candidates requiring review**. This version does **not** publish extracted values into `src/data/districts.js` or `validation.json`.

## Start the frontend

In one terminal, from the project root:

```bash
npm install
npm run dev
```

## Start the API

Use Python 3.12 or another supported Python version. In a second terminal from the project root:

```bash
python -m venv .venv
```

Activate it in Git Bash:

```bash
source .venv/Scripts/activate
```

Install API dependencies and start the service:

```bash
python -m pip install -r api/requirements.txt
python -m uvicorn api.server:app --reload --port 8000
```

The Vite development server proxies `/api` requests to `http://127.0.0.1:8000`.

## Optional model connection

Copy `api/.env.example` to `api/.env` for your own reference, then set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` in the environment used to start the API. The example file is not loaded automatically; set the environment variables in your shell or use a local environment-file loader that you trust. Do not commit real keys and never prefix a secret with `VITE_`.

Git Bash example for the current terminal session:

```bash
export OPENAI_API_KEY='your-secret-key'
export OPENAI_MODEL='gpt-4.1-mini'
python -m uvicorn api.server:app --reload --port 8000
```

The model name must be available to the provider account you configure. Without a key, the frontend uses the deterministic, local assistant. This is an API-connected model, not a newly trained Mutegurire model; a custom fine-tuned model would require a curated training/evaluation dataset and separate model-training workflow.

## PDF import workflow and limitations

1. Choose a readable PDF in the Ask Mutegurire panel (maximum 15 MB and 200 pages).
2. The API extracts text and table candidates, retaining the page number and excerpt.
3. Inspect every candidate against the original table: indicator definition, year, denominator, geography, column, and reliability note.
4. Have an authorized reviewer approve the corrected values in a future review/publishing workflow.
5. Only after approval should a controlled process update the dataset and re-run `python tools/validate.py`.

Current extraction is conservative and heuristic. Scanned/image-only PDFs need OCR; complex tables may not produce candidates. A value extracted from a report is not automatically a verified statistic. This endpoint is preview-only and keeps uploads in memory; it does not save the original PDF, store extracted values permanently, or modify the dashboard data.

## Production deployment

The Vite frontend and Python API are separate services. Deploy the API to a Python-capable host and set `VITE_API_BASE_URL` to its HTTPS base URL when building the frontend. Configure `CORS_ORIGINS` to the exact frontend origin(s). Keep API keys on the server. Add authentication, rate limits, upload malware scanning, audit logs, and an authenticated approval workflow before using this with official or sensitive documents.

## Continuing PDF processing while navigating

The Ask Mutegurire panel is kept mounted while the user switches between dashboard sections. It is hidden when another section is selected rather than being removed from the React component tree. This preserves the in-progress PDF request, its loading state, and the extracted preview when the user returns to Ask Mutegurire.

This behaviour covers navigation between sections in the same open browser page. It does not guarantee that an upload survives a browser refresh, closing the tab, loss of network connectivity, or a server restart. Durable recovery across those events would require a backend job record and a status/result endpoint.
