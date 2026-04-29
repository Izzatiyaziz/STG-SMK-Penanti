# OMR Service Setup on Another Local Machine

This service is a standalone Python API used to grade OMR answer sheets.

## Required Software

- Python `3.12.x`
- `pip` for Python package installation

Recommended:

- Use Python `3.12.10` if you want to match the current local setup exactly.
- On Windows, install Python from https://www.python.org/downloads/ and make sure the `py` launcher is available.

## Project Files Needed

Copy the full `omr-service` folder, including:

- `main.py`
- `requirements.txt`
- `template.sample.json`

Do not copy the local `.venv` folder from another machine. Create a fresh virtual environment instead.

## Windows Setup

Open PowerShell in the `omr-service` folder and run:

```powershell
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Start the API:

```powershell
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## macOS / Linux Setup

Open Terminal in the `omr-service` folder and run:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Start the API:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Verify It Is Running

Health check:

```bash
curl http://127.0.0.1:8000/health
```

Expected response:

```json
{"status":"ok"}
```

You can also open:

```text
http://127.0.0.1:8000/demo
http://127.0.0.1:8000/docs
```

## Python Packages Installed

These come from `requirements.txt`:

- `fastapi==0.115.6`
- `uvicorn==0.32.1`
- `opencv-python-headless==4.10.0.84`
- `numpy==2.1.3`
- `pydantic==2.10.3`
- `python-multipart==0.0.20`

## Notes

- `opencv-python-headless` is already included in `requirements.txt`, so no separate OpenCV install is needed.
- If `python` is not recognized on Windows, use `py -3.12` instead.
- If PowerShell blocks activation, run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
```

Then activate again:

```powershell
.venv\Scripts\Activate.ps1
```

## If This Service Is Called from the Next.js App

Set this environment variable in the Next.js project:

```env
OMR_SERVICE_URL=http://127.0.0.1:8000
```

## Quick Start

```powershell
cd omr-service
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Quick Start - after 
```powershell
.venv\Scripts\activate 
uvicorn main:app --reload
```
