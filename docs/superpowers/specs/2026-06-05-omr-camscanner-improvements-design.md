# OMR Service Improvements — CamScanner-Style Detection + History + Export

**Date:** 2026-06-05  
**Status:** Approved  
**Scope:** `app/teacher/omr/`, `app/api/teacher/omr/`, Python OMR service

---

## Overview

Improve the OMR scanning service with three capabilities:

1. **CamScanner-style paper detection** — real-time edge detection overlay in camera feed, auto-capture when stable, server-side perspective warp with preview before grading
2. **Scan history** — persistent scan list readable from DB (fix sessionStorage-only results)
3. **Export** — Excel and PDF export from results page

---

## 1. Architecture & Data Flow

```
Camera feed (video element)
    │
    ▼
[Client] Canvas loop @ 15fps
    ├─ Brightness gradient edge detection (~50 lines, no library)
    ├─ Draw quad outline overlay on video
    └─ Stable for 1.5s? → auto-capture (or teacher taps manually)
         │
         ▼
    [State: "captured"]
         │
         POST /api/teacher/omr/warp  { image_base64 }
         │
         ▼
    Python OMR service /warp (new endpoint)
         ├─ Grayscale → Canny edges → findContours
         ├─ Largest quad → getPerspectiveTransform → warpPerspective
         └─ Returns { warped_image_base64, corners_found }
         │
         ▼
    [State: "preview"] — show warped image
         ├─ "Confirm" → existing /grade flow (unchanged)
         └─ "Retake" → back to camera
         │
         ▼
    POST /api/teacher/omr/grade (unchanged)
         │
         ▼
    Results → DB (stg_omr_scans, stg_omr_scan_answers — already works)
         │
         ▼
    Results page reads from DB via scan_id
         ├─ Export Excel (client-side xlsx)
         └─ Export PDF (window.print)

New page: /teacher/omr/history
    └─ Reads stg_omr_scans + joins student/subject/exam
```

---

## 2. Client-Side Edge Detection & UI States

### Edge Detection Algorithm (no library, ~50 lines)

- `requestAnimationFrame` loop at 15fps draws video frame to offscreen canvas
- Sample pixels along 4 search lines (top/bottom/left/right margins of frame)
- Find sharpest brightness jump per line → 4 corner candidates
- Paper detected when: quad area > 40% of frame AND aspect ratio ≈ A4 (1:√2 ≈ 0.707)
- Track corners across 30 frames (~1.5s) — if std deviation < 5px → stable → trigger auto-capture

### UI States

```
idle → detecting → stable(countdown) → captured → warping → preview → processing → results
```

| State | Teacher sees |
|---|---|
| `detecting` | Camera feed + animated dashed quad outline (yellow) |
| `stable` | Quad turns green + 3-2-1 countdown ring |
| `captured` | Frozen frame + "Correcting..." spinner |
| `warping` | Brief loading (~0.5s warp API call) |
| `preview` | Warped image + "Confirm" / "Retake" buttons |
| `processing` | Existing spinner ("Memproses OMR...") |
| `results` | Redirect to /teacher/omr/results?scan_id=xxx |

### Overlay Canvas

- Absolute-positioned transparent `<canvas>` over video element
- Draws quad with bracket corner markers (CamScanner style)
- Green when stable, yellow when detecting, hidden when no paper found

### Auto-Capture Toggle

- Toggle chip in camera toolbar: "Auto" (default on) / "Manual"
- Persisted in `localStorage` key `stg_omr_autocapture`
- Manual mode: detection overlay still shows but no auto-trigger

---

## 3. New API Endpoints

### `POST /api/teacher/omr/warp` (Next.js — new file)

**Request:**
```json
{ "image_base64": "data:image/png;base64,..." }
```

**Response (corners found):**
```json
{ "success": true, "warped_image_base64": "...", "corners_found": true }
```

**Response (no corners):**
```json
{
  "success": true,
  "warped_image_base64": "...",
  "corners_found": false,
  "warning": "Sudut kertas tidak dikesan, imej asal digunakan"
}
```

- Auth: `requireApiRole("teacher")` — same pattern as grade route
- If Python `/warp` call fails: return original image + `corners_found: false` (never block the scan)
- No DB writes — stateless

### `POST /omr-service/warp` (Python OMR service — new endpoint)

**Input:**
```json
{ "image_base64": "..." }
```

**Processing:**
```
decode base64 → cv2.cvtColor(GRAY) → GaussianBlur(5,5)
→ Canny(75, 200) → findContours
→ largest approxPolyDP with 4 points
→ order corners (TL, TR, BR, BL)
→ getPerspectiveTransform → warpPerspective to 955×1280
→ encode result as base64
```

- Target output size: `955×1280` (matches existing SPM template dimensions)
- If no 4-point contour found: return original image, `corners_found: false`

### `GET /api/teacher/omr/history` (Next.js — new file)

**Query params:** `exam_id`, `class_id`, `subject_id` (all optional filters)

**Response:**
```json
{
  "data": [
    {
      "omr_scan_id": "...",
      "student_name": "...",
      "student_identifier": "...",
      "class_name": "...",
      "subject_name": "...",
      "exam_name": "...",
      "scan_date": "...",
      "objective_total_mark": 35
    }
  ]
}
```

- Joins `stg_omr_scans` → `stg_students`, `stg_subjects`, `stg_exams`, `stg_classes`
- Filtered to teacher's assigned classes only (security — same teacher_subject check)

---

## 4. Results Page Changes

### Primary data source: DB via scan_id

- Read `?scan_id=xxx` from URL query param
- If present: fetch `GET /api/teacher/omr/result?scan_id=xxx`
- If absent: fall back to `sessionStorage.getItem("stg_omr_last_result")` (preserves current post-scan flow)
- After grade completes, redirect to `/teacher/omr/results?scan_id={omr_scan_id}`

### Export row (below summary badges)

```
[ ↓ Export Excel ]   [ 🖨 Export PDF ]
```

**Export Excel** — `xlsx` package (client-side):
- Columns: No. | Jawapan Pelajar | Skema | Status | Markah
- Footer: Betul / Salah / Kosong / Jumlah
- Filename: `OMR_{StudentName}_{ExamName}_{YYYY-MM-DD}.xlsx`

**Export PDF** — `window.print()`:
- `@media print` CSS: hide nav/sidebar/buttons, show student info header
- Print-optimized table, fits one page

---

## 5. Scan History Page (`/teacher/omr/history`)

**Table columns:** Student | Class | Subject | Exam | Date | Score | Actions

**Filters (top):** Exam dropdown, Class/Subject dropdown (reuse existing assignment selects)

**Actions per row:**
- "Lihat" → `/teacher/omr/results?scan_id=xxx`
- "Imbas Semula" → `/teacher/omr` with localStorage `stg_marks_context` pre-filled

**Empty state:** shown when no scans for selected filters

**No new DB tables** — reads existing `stg_omr_scans`

---

## 6. Files Changed / Created

### New files
- `app/api/teacher/omr/warp/route.ts`
- `app/api/teacher/omr/history/route.ts`
- `app/teacher/omr/history/page.tsx`
- Python OMR service: `routers/warp.py` (or new endpoint in existing `main.py`)

### Modified files
- `app/teacher/omr/page.tsx` — add edge detection loop, overlay canvas, new UI states, warp API call, preview state
- `app/teacher/omr/results/page.tsx` — read from DB via scan_id, add export buttons, print CSS
- `app/globals.css` — add `@media print` styles for results page

### No changes
- `app/api/teacher/omr/grade/route.ts` — unchanged
- `app/api/teacher/omr/template/route.ts` — unchanged
- `app/api/teacher/omr/assignments/route.ts` — unchanged
- All DB schema — no migrations needed

---

## 7. Error Handling

| Failure | Behaviour |
|---|---|
| Warp API timeout (>3s) | Use original captured image, `corners_found: false`, show warning toast |
| No paper detected after 10s | Show manual capture prompt: "Kertas tidak dikesan — ambil manual?" |
| Python warp service down | Next.js `/warp` catches error, returns original image |
| History API fails | Show error state with retry button |
| Export fails | Toast error: "Eksport gagal, cuba semula" |

---

## 8. Out of Scope

- Manual correction of detected answers (re-scan only)
- Batch scanning (multiple students in one session without selecting each)
- Custom OMR templates beyond SPM format
- Ambiguous answer review workflow
