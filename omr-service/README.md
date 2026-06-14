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

## Deploy to Fly.io

Fly.io runs the service from `Dockerfile` and uses `fly.toml` for its machine,
health-check, region, and auto-stop configuration.

Install `flyctl`, authenticate, and deploy:

```powershell
winget install Fly-IO.flyctl
fly auth login
cd C:\stg-penanti\omr-service
fly launch --no-deploy
fly config validate
fly deploy
```

If `stg-smk-penanti-omr` is unavailable, change `app` in `fly.toml` to a unique
name before running `fly launch`.

Test and inspect the deployment:

```powershell
fly status
fly checks list
fly logs
curl.exe https://stg-smk-penanti-omr.fly.dev/health
```

Optional JamAI secrets:

```powershell
fly secrets set JAMAI_PROJECT_ID="..." JAMAI_PAT="..." JAMAI_SYMPTOM_TABLE_ID="std_report"
```

Set the Fly URL in the Next.js Vercel project's environment variables, then
redeploy the Next.js project:

```env
OMR_SERVICE_URL=https://stg-smk-penanti-omr.fly.dev
REPORT_AI_SERVICE_URL=https://stg-smk-penanti-omr.fly.dev
```

The configured machine uses `shared-cpu-1x` with 1 GB RAM. It stops when idle
and starts when a request arrives. Fly.io still charges for actual usage and
stopped-machine root filesystem storage.

### Fly.io GitHub deployment settings

The repository root also contains `Dockerfile.fly` and `fly.toml` specifically
for Fly.io's GitHub deployment flow. Use:

```text
Working directory: ./
Config path: fly.toml
Internal port: 8080
Memory: 1GB
```

The root `fly.toml` explicitly selects `Dockerfile.fly`, which copies and builds
only the Python OMR service. This prevents Fly's GitHub launcher from generating
and building a Next.js Dockerfile.

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
