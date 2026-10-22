# Live demo deployment

The GitHub Pages frontend and the hosted API are separate. Updating `docs/` alone does not start the AI backend.

## Current hosted demo

The backend is hosted through Sites at `https://synaptiq-class-demo.swoonyspice130.chatgpt.site`, independently of Railway. The same host also serves A, B and C as a backup demo link. GitHub Pages uses that backend through the public URL in `src/config.js`.

The cloud API source is in `cloud/worker-api.js`; its schema is in `cloud/schema.sql`. The hosted Worker uses persistent D1 records and R2 for binary uploads. The Sites project ID is `appgprj_6ad950e54b2c819184a7659c165dd477`. Its managed source repository contains the bundled Worker, frontend pages and migrations. Update and publish that existing Site for backend changes; do not create a second Site or put the API key in Git.

The Python server below remains useful for local development or deployment to a Docker host. Local Python and the hosted Worker implement the same HTTP API, but are separate runtimes and separate databases.

## Optional Docker hosting

1. Deploy this GitHub repository to Railway using the included Dockerfile. Choose the branch containing the live-demo changes.
2. In the service Variables, set `GEMINI_API_KEY` to your key and `GEMINI_MODEL` to `gemini-3.5-flash-lite` (or another model available to your Gemini project).
3. Attach a persistent volume at `/data`; the Dockerfile sets `DATA_DIR=/data`. Use one service instance. Without a persistent volume, redeploying the backend may erase uploaded files and published answers.
4. Generate a public HTTPS domain for the service. `/api/health` should return `ok: true` and `ai_configured: true`.
5. Put that origin in `src/config.js` as `window.SYNAPTIQ_API_BASE`, run `python3 build.py`, and publish the generated `docs/` files to the GitHub Pages branch. This configuration contains only a public URL, never a key.
6. Open A from a fresh browser on another laptop. Confirm the live connection indicator and test an answer. No local server should be needed.

The backend also serves the entire frontend at its own domain, so that domain is a useful alternative demo link. If using a custom frontend domain, add its exact origin to the comma-separated `ALLOWED_ORIGINS` environment variable.

This intentionally uses one public classroom workspace. Anyone with the demo access can add knowledge, publish an answer as a fictional expert, and reset the demo. Use fictional files only. It does not implement enterprise authentication or access controls. An application-wide limit of 12 model calls per minute reduces accidental use; provider quotas still apply.

## Local preview

Create `.env` from `.env.example`, insert the API key privately, and use a local writable `DATA_DIR` (omit it for `.demo-data`). Do not use `/data` on a local Windows machine. Then run:

```sh
python3 build.py
python3 server.py
```

Open `http://localhost:8000/a/`. On Windows, keep SQLite data on a local Windows disk or run the server in WSL; SQLite locking across a Windows-to-WSL file share can fail.

## Rehearsal

1. Reset the shared demo. This clears prior expert answers and uploaded files, keeping the four seed documents.
2. Ask A: “How do I run payments-retry tests locally?” It should answer with a source.
3. Ask A: “Why does payments-retry stop after three retries?” It should identify missing rationale.
4. Route the question to its expert. Open B. Write the reason: “The limit protects ledger-gw v1 from burst overload. Keep it until PAY-1410 ships.” Scope it to `payments-retry only` and publish.
5. Return to A and ask in different words: “Why is the retry limit three?” It should use the saved expert answer.
6. Ask where the office bathrooms are. The seed documents do not include this information.
7. Upload `demo-files/office-guide.txt` using the drop zone or file picker. Ask again. It should describe the east hallway opposite Cedar and cite the uploaded guide.
8. Optionally upload your own clearly labeled PDF/image floor plan. The model reads the visual content; it is not a hardcoded location lookup.
9. Open C and generate a current Bluewater briefing. It should name recorded changes and identify the missing reason behind PR #311.

Warm the site up before presenting, and rehearse using the venue network. If Gemini returns a quota error, the UI shows the error and supports retry; it never substitutes a secretly scripted AI answer.
