# Hosted backend source

`worker-api.js` implements the same routes as `server.py` for the public demo's Cloudflare Worker runtime. `schema.sql` describes the D1 tables. Binary uploads are stored in the R2 `BUCKET` binding and records in the D1 `DB` binding. The API key is the server secret `GEMINI_API_KEY`.

The active Sites project is `appgprj_6ad950e54b2c819184a7659c165dd477`. Its managed source repository bundles this API with the frontend pages; editing this copy alone does not redeploy that Worker. Use the existing Sites project and its source workflow for backend updates, then verify the public endpoint. Frontend updates still build into `docs/` for GitHub Pages.
