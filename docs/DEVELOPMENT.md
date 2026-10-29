# Development setup

## Requirements

- Node.js and npm compatible with the Vite version in `package.json`.
- Python 3.10+ for extraction tools; Python 3.12 is a practical choice for the optional API.
- Git for version control.

## Frontend only

From the repository root:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, typically `http://localhost:5173`.

Build check:

```bash
npm run build
npm run preview
```

## Optional API

Open a second terminal in the project root. Git Bash on Windows:

```bash
python -m venv .venv
source .venv/Scripts/activate
python -m pip install -r api/requirements.txt
npm run api
```

The Vite development server proxies `/api` to `http://127.0.0.1:8000`. Check API health at `http://127.0.0.1:8000/api/health`.

To enable the external language model, set the key in the same shell that launches the API:

```bash
export OPENAI_API_KEY='your-key'
export OPENAI_MODEL='gpt-4.1-mini'
npm run api
```

Use a model name available to the provider account. Do not commit a real key and do not place it in `VITE_*` variables. Without a key, the local deterministic assistant remains available.

## Data extraction tools

See [`tools/README.md`](../tools/README.md). Download original source reports manually and review candidate values against the source pages. Do not assume the extraction scripts have been validated against every table layout.

## Useful checks before commit

```bash
git status --short
git diff --check
npm run build
```

If Python dependencies are already installed in `.venv`, use that environment rather than repeatedly recreating it. Ensure `.venv/`, `node_modules/`, `dist/`, `.env`, and generated temporary outputs are ignored by Git.
