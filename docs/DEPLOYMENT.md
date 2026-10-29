# Deployment plan

## Recommendation

Use **Vercel for the Vite frontend**, because the repository already contains a Vercel configuration and the competitor demonstrates a simple, public, no-login deployment pattern at `https://ntawusigara.vercel.app`. Keep the first release simple: a public app that opens directly, clear first-use guidance, no secrets in the browser, and a short demo recording.

Mutegurire differs from the competitor because it has an optional Python API for model-backed chat and PDF extraction. The Vercel configuration in this repository builds the frontend only; it does not deploy `api/server.py` as a Python service. Therefore choose one of these release modes deliberately:

### Mode A — safest demo fallback

Deploy only the frontend. The rule-based assistant continues to work locally in the browser. Do not advertise model-backed chat or server-side PDF extraction as live features unless the API is reachable from the deployed frontend. This is the lowest-complexity way to ensure the map and dashboard are accessible to judges.

### Mode B — full demo with optional AI and PDF preview

1. Deploy the frontend to Vercel from the public GitHub repository.
2. Deploy `api/` as a separate Python ASGI web service on a host that supports FastAPI/Uvicorn.
3. Configure the API service's start command as `uvicorn api.server:app --host 0.0.0.0 --port $PORT` (adapt if the host provides a different port variable or root-directory setting).
4. Set `VITE_API_BASE_URL` in the Vercel project to the API's HTTPS origin, with no trailing slash, then redeploy. Vite embeds this variable at build time.
5. Set `CORS_ORIGINS` on the API to the exact production frontend origin (for example, the Vercel production domain), plus any required preview origin. Avoid wildcard origins for a public service that may process uploads.
6. If enabling the language model, set `OPENAI_API_KEY` and `OPENAI_MODEL` as server-side environment variables on the API host only. Never use `VITE_OPENAI_API_KEY` or expose the key in React.
7. Confirm `GET /api/health` reports the service as available. If `ai_configured` is false, the API will not provide model-backed answers; the client should fall back to the deterministic assistant.
8. Test PDF preview with a small, non-sensitive, text-based sample. Confirm the response states `review_required: true` and `published: false`.

## Vercel frontend configuration

The current `vercel.json` specifies `npm run build`, output directory `dist`, and the Vite framework. On Vercel, import the intended public GitHub repository and use:

- Framework preset: Vite (usually detected automatically).
- Build command: `npm run build`.
- Output directory: `dist`.
- Root directory: project root containing `package.json`.
- Environment variable (Mode B only): `VITE_API_BASE_URL=https://<your-api-host>`.

Use the real URL supplied by your deployed API; do not commit an invented or placeholder production URL.

## API deployment requirements

- Runtime: supported Python version, install `api/requirements.txt`.
- Start: Uvicorn bound to `0.0.0.0` and the host-provided port.
- Environment: `CORS_ORIGINS`, and optional server-side model variables.
- Health check: `/api/health`.
- Upload limits: current API caps PDF upload at 15 MB and 200 pages; this is not a substitute for malware scanning or full production security.
- Persistence: PDF preview is in-memory and does not retain files or publish extracted data.

## Release checklist

- [ ] `npm run build` succeeds from a clean checkout.
- [ ] Deployed frontend loads in a private/incognito window without developer tools.
- [ ] Map, district selection, rankings, profiles, language switch, theme, and charts work on desktop and a 375px mobile viewport.
- [ ] All public links and source links open.
- [ ] The data caveat is visible and no missing value is rendered as zero.
- [ ] If API is enabled, `/api/health`, model-backed chat, fallback behavior, CORS, and PDF preview are tested against the deployed services.
- [ ] No API key, `.env`, `.venv`, `node_modules`, or raw private files are committed.
- [ ] PDF upload shows candidates with page references and does not claim to update the dashboard.
- [ ] Record the actual public GitHub URL, live application URL, release commit, and demo-video URL in the submission notes.
- [ ] Test the exact public link from a second browser/device and from a person who is not signed into the deployment account.

## Why not deploy everything as static files?

The competitor's app is static and explicitly documents that it needs no server code. Mutegurire's map and rule-based assistant can be served as static assets, but the optional model key must stay server-side and PDF parsing runs in the Python API. Do not try to hide an API secret in frontend JavaScript. If a stable API deployment cannot be tested before the deadline, ship the reliable frontend-only mode and disclose that the API workflow is optional/not yet deployed.
