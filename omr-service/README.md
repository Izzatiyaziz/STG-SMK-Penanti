# OMR Service (FastAPI)

This folder contains a standalone OMR grading service for STG.

## Why a separate folder?

Yes, recommended. Image processing dependencies (`opencv-python-headless`, `numpy`) are isolated from your Next.js runtime, easier to deploy, and easier to tune independently.

## Run locally

```bash
cd omr-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Health check:

```bash
curl http://127.0.0.1:8000/health
```

## Deploy manually to Vercel

Deploy this folder as its own Vercel project, separate from the Next.js app:

```powershell
cd C:\stg-penanti\omr-service
npx vercel@latest login
npx vercel@latest
```

Test the preview URL returned by Vercel:

```powershell
curl.exe https://YOUR-PREVIEW-URL.vercel.app/health
```

Deploy the tested version to production:

```powershell
npx vercel@latest --prod
```

Set the production URL in the Next.js Vercel project's environment variables,
then redeploy the Next.js project:

```env
OMR_SERVICE_URL=https://YOUR-OMR-PROJECT.vercel.app
REPORT_AI_SERVICE_URL=https://YOUR-OMR-PROJECT.vercel.app
```

Useful deployment diagnostics:

```powershell
npx vercel@latest ls
npx vercel@latest inspect YOUR-DEPLOYMENT-URL --logs
npx vercel@latest logs YOUR-DEPLOYMENT-URL
```

Vercel Functions limit request and response payloads to 4.5 MB. Keep uploaded
images below approximately 3 MB before base64 encoding.

## Endpoint

- `POST /grade`
- `POST /grade-file` (multipart upload)
- `GET /demo` (simple upload page)

Input fields:

- `image_base64`: base64 image string (`data:image/...;base64,...` accepted)
- `template_width`, `template_height`: canonical warped sheet size
- `template`: map of question bubbles (`A/B/C/D` with `x,y,r`)
- `answer_key`: map of question no -> correct option
- `min_mark_threshold`: default `0.30`
- `ambiguity_gap`: default `0.06`

Output fields:

- `correct`, `wrong`, `blank`, `ambiguous`
- `score_percent`
- `results[]`: per-question option ratios and status

## Upload Test (No Base64 Needed)

Run the server, then open:

```bash
http://127.0.0.1:8000/demo
```

Upload a scanned/photo sheet image. Optionally paste a template bundle JSON (same shape as `template.sample.json`).

## Integration with Next.js

App route added:

- `POST /api/teacher/omr/grade`

This route:

1. Verifies teacher session/authorization.
2. Loads answer scheme from `stg_answer_schema`.
3. Calls FastAPI OMR service.
4. Returns grading results.

Set env var in Next app:

```env
OMR_SERVICE_URL=http://127.0.0.1:8000
```

## Template calibration

Use `template.sample.json` only as shape reference. You must calibrate `x,y,r` coordinates for your real printed layout after perspective warp.
