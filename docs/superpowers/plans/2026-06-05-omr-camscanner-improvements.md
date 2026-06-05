# OMR CamScanner Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CamScanner-style paper detection with auto-capture + perspective warp preview to the OMR scanner, fix results persistence to use DB instead of sessionStorage, and add scan history + export.

**Architecture:** Client-side brightness-gradient edge detection draws a real-time overlay on the camera feed and triggers auto-capture when stable; captured image is sent to a new `/api/teacher/omr/warp` proxy which calls a new Python `/warp` endpoint for precise perspective correction; teacher confirms the warped preview then existing `/grade` flow runs unchanged. Results page reads from existing `/api/teacher/omr/result` via URL params. New history page reads from `stg_omr_scans`.

**Tech Stack:** Next.js 16 (App Router), TypeScript, React 19, Supabase, Python FastAPI (OMR service), jspdf + jspdf-autotable (PDF export), xlsx (Excel export — needs install), Tailwind CSS, shadcn/ui

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `hooks/use-document-detection.ts` | Edge detection loop, stability tracking, overlay draw |
| Create | `app/api/teacher/omr/warp/route.ts` | Proxy captured image to Python `/warp` |
| Create | `app/api/teacher/omr/history/route.ts` | Return paginated scan list for teacher |
| Create | `app/teacher/omr/history/page.tsx` | Scan history UI with filters |
| Modify | `app/teacher/omr/page.tsx` | Add detection overlay, new UI states, warp preview |
| Modify | `app/teacher/omr/results/page.tsx` | Read from DB via URL params, add export buttons |
| Modify | `app/globals.css` | Add `@media print` styles for results page |
| Python (external) | `<omr-service>/routers/warp.py` | OpenCV perspective warp endpoint |

---

## Task 1: Python OMR Service — `/warp` Endpoint

**Files:**
- Create: `<omr-service>/routers/warp.py` (in the Python OMR service repo)
- Modify: `<omr-service>/main.py` — register the router

> **Note:** This task is in the Python OMR service (runs at port 8001), not the Next.js repo. Complete this before any frontend tasks.

- [ ] **Step 1: Install opencv-python if not present**

In the Python OMR service directory:
```bash
pip install opencv-python-headless
```
Verify: `python -c "import cv2; print(cv2.__version__)"` — should print a version number.

- [ ] **Step 2: Create `routers/warp.py`**

```python
import base64
import io
import numpy as np
import cv2
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

TARGET_W = 955
TARGET_H = 1280


class WarpRequest(BaseModel):
    image_base64: str


class WarpResponse(BaseModel):
    warped_image_base64: str
    corners_found: bool


def _decode_image(image_base64: str) -> np.ndarray:
    header, _, data = image_base64.partition(",")
    raw = base64.b64decode(data if data else image_base64)
    arr = np.frombuffer(raw, np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


def _encode_image(image: np.ndarray) -> str:
    _, buf = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 92])
    return "data:image/jpeg;base64," + base64.b64encode(buf).decode()


def _order_corners(pts: np.ndarray) -> np.ndarray:
    """Order corners as [TL, TR, BR, BL]."""
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]   # TL: smallest sum
    rect[2] = pts[np.argmax(s)]   # BR: largest sum
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]  # TR: smallest diff
    rect[3] = pts[np.argmax(diff)]  # BL: largest diff
    return rect


def _find_document_corners(image: np.ndarray):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 75, 200)

    contours, _ = cv2.findContours(edged, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)

    for contour in contours[:5]:
        peri = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
        if len(approx) == 4:
            return approx.reshape(4, 2).astype("float32")
    return None


@router.post("/warp", response_model=WarpResponse)
async def warp_document(body: WarpRequest):
    image = _decode_image(body.image_base64)
    if image is None:
        return WarpResponse(warped_image_base64=body.image_base64, corners_found=False)

    corners = _find_document_corners(image)
    if corners is None:
        return WarpResponse(warped_image_base64=_encode_image(image), corners_found=False)

    ordered = _order_corners(corners)
    dst = np.array(
        [[0, 0], [TARGET_W - 1, 0], [TARGET_W - 1, TARGET_H - 1], [0, TARGET_H - 1]],
        dtype="float32",
    )
    M = cv2.getPerspectiveTransform(ordered, dst)
    warped = cv2.warpPerspective(image, M, (TARGET_W, TARGET_H))
    return WarpResponse(warped_image_base64=_encode_image(warped), corners_found=True)
```

- [ ] **Step 3: Register router in `main.py`**

In the Python service's `main.py`, add:
```python
from routers.warp import router as warp_router
app.include_router(warp_router)
```

- [ ] **Step 4: Manually verify the endpoint**

Start the Python service, then run:
```bash
curl -X POST http://127.0.0.1:8001/warp \
  -H "Content-Type: application/json" \
  -d '{"image_base64":"data:image/jpeg;base64,/9j/4AAQ..."}' \
  | python -m json.tool
```
Expected: `{ "warped_image_base64": "data:image/jpeg;base64,...", "corners_found": true }` (or `false` if test image has no clear document).

- [ ] **Step 5: Commit in Python service repo**

```bash
git add routers/warp.py main.py
git commit -m "feat: add /warp endpoint for perspective correction"
```

---

## Task 2: Next.js Warp Proxy API Route

**Files:**
- Create: `app/api/teacher/omr/warp/route.ts`

- [ ] **Step 1: Create `app/api/teacher/omr/warp/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth";

export const runtime = "nodejs";

type WarpServiceResponse = {
  warped_image_base64: string;
  corners_found: boolean;
};

export async function POST(req: Request) {
  try {
    const guard = await requireApiRole("teacher");
    if ("response" in guard) return guard.response;

    const body = await req.json();
    const image_base64 = String(body?.image_base64 ?? "").trim();
    if (!image_base64) {
      return NextResponse.json({ message: "image_base64 diperlukan" }, { status: 400 });
    }

    const omrServiceUrl = process.env.OMR_SERVICE_URL || "http://127.0.0.1:8001";

    let serviceData: WarpServiceResponse;
    try {
      const res = await fetch(`${omrServiceUrl}/warp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64 }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`Service error ${res.status}`);
      serviceData = await res.json() as WarpServiceResponse;
    } catch {
      // Service unavailable or timeout — return original image, never block scan
      return NextResponse.json({
        success: true,
        warped_image_base64: image_base64,
        corners_found: false,
        warning: "Perkhidmatan warp tidak tersedia, imej asal digunakan",
      });
    }

    return NextResponse.json({
      success: true,
      warped_image_base64: serviceData.warped_image_base64,
      corners_found: serviceData.corners_found,
      ...(!serviceData.corners_found && {
        warning: "Sudut kertas tidak dikesan, imej asal digunakan",
      }),
    });
  } catch (err) {
    console.error("POST teacher/omr/warp FAILED:", err);
    return NextResponse.json({ message: "Ralat pelayan" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors related to `app/api/teacher/omr/warp/route.ts`.

- [ ] **Step 3: Commit**

```bash
git add app/api/teacher/omr/warp/route.ts
git commit -m "feat: add /api/teacher/omr/warp proxy route"
```

---

## Task 3: Next.js History API Route

**Files:**
- Create: `app/api/teacher/omr/history/route.ts`

- [ ] **Step 1: Create `app/api/teacher/omr/history/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth";
import supabaseAdmin from "@/lib/supabase-admin";

export const runtime = "nodejs";

function toId(v: unknown) {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

export async function GET(req: Request) {
  try {
    const guard = await requireApiRole("teacher");
    if ("response" in guard) return guard.response;

    const { searchParams } = new URL(req.url);
    const exam_id = toId(searchParams.get("exam_id"));
    const class_id = toId(searchParams.get("class_id"));
    const subject_id = toId(searchParams.get("subject_id"));

    // Get teacher's allowed class+subject combinations
    const { data: assignments, error: assignErr } = await supabaseAdmin
      .from("stg_teacher_subject")
      .select("class_id, subject_id")
      .eq("teacher_id", guard.session.user_id);

    if (assignErr) return NextResponse.json({ message: assignErr.message }, { status: 500 });
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const allowedSubjectIds = [...new Set(assignments.map((a) => String(a.subject_id)))];

    let query = supabaseAdmin
      .from("stg_omr_scans")
      .select(
        `omr_scan_id, objective_total_mark, scan_date,
         student_id,
         stg_students!inner(name, identifier, class_id,
           stg_classes!inner(class_name, grade)),
         stg_subjects!inner(subject_name),
         stg_exams!inner(exam_name, year)`
      )
      .in("subject_id", allowedSubjectIds)
      .order("scan_date", { ascending: false })
      .limit(200);

    if (exam_id) query = query.eq("exam_id", exam_id);
    if (subject_id) query = query.eq("subject_id", subject_id);

    const { data: scans, error: scansErr } = await query;
    if (scansErr) return NextResponse.json({ message: scansErr.message }, { status: 500 });

    type ScanRow = {
      omr_scan_id: string;
      objective_total_mark: number;
      scan_date: string;
      student_id: string;
      subject_id: string;
      exam_id: string;
      stg_students: { name: string; identifier: string; class_id: string; stg_classes: { class_name: string; grade: number } };
      stg_subjects: { subject_name: string };
      stg_exams: { exam_name: string; year: string };
    };

    const rows = (Array.isArray(scans) ? scans : []) as unknown as ScanRow[];

    const data = rows
      .filter((row) => {
        const studentClassId = String(row.stg_students?.class_id ?? "");
        const rowSubjectId = String(row.subject_id ?? "");
        const allowed = assignments.some(
          (a) => String(a.class_id) === studentClassId && String(a.subject_id) === rowSubjectId
        );
        if (!allowed) return false;
        if (class_id && studentClassId !== class_id) return false;
        return true;
      })
      .map((row) => ({
        omr_scan_id: String(row.omr_scan_id),
        student_id: String(row.student_id),
        student_name: String(row.stg_students?.name ?? ""),
        student_identifier: String(row.stg_students?.identifier ?? ""),
        class_id: String(row.stg_students?.class_id ?? ""),
        class_name: String(row.stg_students?.stg_classes?.class_name ?? ""),
        grade: Number(row.stg_students?.stg_classes?.grade ?? 0),
        subject_id: String(row.subject_id),
        subject_name: String(row.stg_subjects?.subject_name ?? ""),
        exam_id: String(row.exam_id),
        exam_name: `${row.stg_exams?.exam_name ?? ""} (${row.stg_exams?.year ?? ""})`,
        scan_date: String(row.scan_date),
        objective_total_mark: Number(row.objective_total_mark ?? 0),
      }));

    return NextResponse.json({ data });
  } catch (err) {
    console.error("GET teacher/omr/history FAILED:", err);
    return NextResponse.json({ message: "Ralat pelayan" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/teacher/omr/history/route.ts
git commit -m "feat: add /api/teacher/omr/history route"
```

---

## Task 4: `useDocumentDetection` Hook

**Files:**
- Create: `hooks/use-document-detection.ts`

- [ ] **Step 1: Create `hooks/use-document-detection.ts`**

```typescript
import { useCallback, useEffect, useRef, useState } from "react";

export type DetectedQuad = {
  tl: { x: number; y: number };
  tr: { x: number; y: number };
  br: { x: number; y: number };
  bl: { x: number; y: number };
};

export type DocumentDetectionState = "idle" | "detecting" | "stable";

interface UseDocumentDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement>;
  overlayCanvasRef: React.RefObject<HTMLCanvasElement>;
  enabled: boolean;
  onStable: () => void;
}

const FPS = 15;
const STABILITY_FRAMES = 22; // ~1.5s at 15fps
const STABILITY_THRESHOLD = 8; // px max std deviation
const EDGE_THRESHOLD = 22; // min brightness delta to count as edge
const MIN_COVERAGE = 0.35; // paper must cover 35% of frame area
const SAMPLES = 14; // scan lines per edge

function sampleBrightness(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number
): number {
  const ix = Math.max(0, Math.min(width - 1, Math.floor(x)));
  const iy = Math.max(0, Math.min(Math.floor(data.length / 4 / width) - 1, Math.floor(y)));
  const i = (iy * width + ix) * 4;
  return data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
}

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
}

function detectBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number
): DetectedQuad | null {
  const leftEdges: number[] = [];
  const rightEdges: number[] = [];
  const topEdges: number[] = [];
  const bottomEdges: number[] = [];

  for (let s = 0; s < SAMPLES; s++) {
    const yFrac = 0.15 + (s / SAMPLES) * 0.7;
    const y = height * yFrac;

    // Left edge: scan right
    for (let x = 2; x < width * 0.65; x += 2) {
      if (Math.abs(sampleBrightness(data, width, x, y) - sampleBrightness(data, width, x - 2, y)) > EDGE_THRESHOLD) {
        leftEdges.push(x);
        break;
      }
    }
    // Right edge: scan left
    for (let x = width - 2; x > width * 0.35; x -= 2) {
      if (Math.abs(sampleBrightness(data, width, x, y) - sampleBrightness(data, width, x + 2, y)) > EDGE_THRESHOLD) {
        rightEdges.push(x);
        break;
      }
    }
  }

  for (let s = 0; s < SAMPLES; s++) {
    const xFrac = 0.15 + (s / SAMPLES) * 0.7;
    const x = width * xFrac;

    // Top edge: scan down
    for (let y = 2; y < height * 0.65; y += 2) {
      if (Math.abs(sampleBrightness(data, width, x, y) - sampleBrightness(data, width, x, y - 2)) > EDGE_THRESHOLD) {
        topEdges.push(y);
        break;
      }
    }
    // Bottom edge: scan up
    for (let y = height - 2; y > height * 0.35; y -= 2) {
      if (Math.abs(sampleBrightness(data, width, x, y) - sampleBrightness(data, width, x, y + 2)) > EDGE_THRESHOLD) {
        bottomEdges.push(y);
        break;
      }
    }
  }

  const minHits = Math.floor(SAMPLES * 0.4);
  if (leftEdges.length < minHits || rightEdges.length < minHits ||
      topEdges.length < minHits || bottomEdges.length < minHits) {
    return null;
  }

  const median = (arr: number[]) => {
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };

  const l = median(leftEdges);
  const r = median(rightEdges);
  const t = median(topEdges);
  const b = median(bottomEdges);

  if (r - l < width * 0.2 || b - t < height * 0.2) return null;
  const coverage = ((r - l) * (b - t)) / (width * height);
  if (coverage < MIN_COVERAGE) return null;

  return {
    tl: { x: l, y: t },
    tr: { x: r, y: t },
    br: { x: r, y: b },
    bl: { x: l, y: b },
  };
}

function drawOverlay(
  canvas: HTMLCanvasElement,
  quad: DetectedQuad,
  color: string,
  dashed: boolean
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.setLineDash(dashed ? [10, 5] : []);
  ctx.beginPath();
  ctx.moveTo(quad.tl.x, quad.tl.y);
  ctx.lineTo(quad.tr.x, quad.tr.y);
  ctx.lineTo(quad.br.x, quad.br.y);
  ctx.lineTo(quad.bl.x, quad.bl.y);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  // Corner brackets
  const B = 22;
  const corners: Array<{ x: number; y: number; dx: number; dy: number }> = [
    { ...quad.tl, dx: 1, dy: 1 },
    { ...quad.tr, dx: -1, dy: 1 },
    { ...quad.br, dx: -1, dy: -1 },
    { ...quad.bl, dx: 1, dy: -1 },
  ];
  ctx.lineWidth = 4;
  corners.forEach(({ x, y, dx, dy }) => {
    ctx.beginPath();
    ctx.moveTo(x + dx * B, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * B);
    ctx.stroke();
  });
}

export function useDocumentDetection({
  videoRef,
  overlayCanvasRef,
  enabled,
  onStable,
}: UseDocumentDetectionOptions) {
  const [detectionState, setDetectionState] = useState<DocumentDetectionState>("idle");
  const [detectedQuad, setDetectedQuad] = useState<DetectedQuad | null>(null);
  const quadHistory = useRef<DetectedQuad[]>([]);
  const stableFiredRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);

  const clearOverlay = useCallback(() => {
    const overlay = overlayCanvasRef.current;
    if (overlay) {
      const ctx = overlay.getContext("2d");
      ctx?.clearRect(0, 0, overlay.width, overlay.height);
    }
  }, [overlayCanvasRef]);

  const resetDetection = useCallback(() => {
    quadHistory.current = [];
    stableFiredRef.current = false;
    setDetectionState("idle");
    setDetectedQuad(null);
    clearOverlay();
  }, [clearOverlay]);

  useEffect(() => {
    if (!enabled) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      resetDetection();
      return;
    }

    const interval = 1000 / FPS;
    let lastTime = 0;

    function loop(time: number) {
      rafRef.current = requestAnimationFrame(loop);
      if (time - lastTime < interval) return;
      lastTime = time;

      const video = videoRef.current;
      const overlay = overlayCanvasRef.current;
      if (!video || !overlay || video.readyState < 2 || !video.videoWidth) return;

      if (!offscreenRef.current) {
        offscreenRef.current = document.createElement("canvas");
      }
      const offscreen = offscreenRef.current;
      const scale = 0.3;
      offscreen.width = Math.floor(video.videoWidth * scale);
      offscreen.height = Math.floor(video.videoHeight * scale);
      overlay.width = video.videoWidth;
      overlay.height = video.videoHeight;

      const offCtx = offscreen.getContext("2d", { willReadFrequently: true });
      if (!offCtx) return;
      offCtx.drawImage(video, 0, 0, offscreen.width, offscreen.height);
      const imageData = offCtx.getImageData(0, 0, offscreen.width, offscreen.height);

      const rawQuad = detectBounds(imageData.data, offscreen.width, offscreen.height);

      if (!rawQuad) {
        quadHistory.current = [];
        stableFiredRef.current = false;
        setDetectionState("detecting");
        setDetectedQuad(null);
        clearOverlay();
        return;
      }

      // Scale quad back to full video dimensions
      const sx = video.videoWidth / offscreen.width;
      const sy = video.videoHeight / offscreen.height;
      const scaledQuad: DetectedQuad = {
        tl: { x: rawQuad.tl.x * sx, y: rawQuad.tl.y * sy },
        tr: { x: rawQuad.tr.x * sx, y: rawQuad.tr.y * sy },
        br: { x: rawQuad.br.x * sx, y: rawQuad.br.y * sy },
        bl: { x: rawQuad.bl.x * sx, y: rawQuad.bl.y * sy },
      };

      quadHistory.current = [...quadHistory.current.slice(-(STABILITY_FRAMES - 1)), scaledQuad];
      setDetectedQuad(scaledQuad);

      const isStable =
        quadHistory.current.length >= STABILITY_FRAMES &&
        stdDev(quadHistory.current.map((q) => q.tl.x)) < STABILITY_THRESHOLD &&
        stdDev(quadHistory.current.map((q) => q.tl.y)) < STABILITY_THRESHOLD &&
        stdDev(quadHistory.current.map((q) => q.br.x)) < STABILITY_THRESHOLD &&
        stdDev(quadHistory.current.map((q) => q.br.y)) < STABILITY_THRESHOLD;

      if (isStable) {
        setDetectionState("stable");
        drawOverlay(overlay, scaledQuad, "#22c55e", false);
        if (!stableFiredRef.current) {
          stableFiredRef.current = true;
          onStable();
        }
      } else {
        stableFiredRef.current = false;
        setDetectionState("detecting");
        drawOverlay(overlay, scaledQuad, "#eab308", true);
      }
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, videoRef, overlayCanvasRef, onStable, clearOverlay, resetDetection]);

  return { detectionState, detectedQuad, resetDetection, clearOverlay };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add hooks/use-document-detection.ts
git commit -m "feat: add useDocumentDetection hook for camera edge detection"
```

---

## Task 5: Update OMR Scan Page

**Files:**
- Modify: `app/teacher/omr/page.tsx`

This task adds the overlay canvas, detection states, warp preview flow, and auto-capture toggle to the existing scan page. The upload tab and all details form logic remain unchanged.

- [ ] **Step 1: Add new imports at top of `app/teacher/omr/page.tsx`**

Replace the existing import block (lines 1–37) with:

```typescript
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Camera,
  CameraOff,
  RotateCw,
  Upload,
  Scan,
  AlertCircle,
  BookOpen,
  ClipboardList,
  ImageUp,
  Smartphone,
  UserRound,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Loader2,
  History,
  Zap,
  ZapOff,
} from "lucide-react";
import { useDocumentDetection } from "@/hooks/use-document-detection";
```

- [ ] **Step 2: Add new state variables after existing state declarations**

After `const [advancedOpen, setAdvancedOpen] = useState(false);` (around line 161), add:

```typescript
  type ScanFlowState = "idle" | "warping" | "preview";
  const [scanFlowState, setScanFlowState] = useState<ScanFlowState>("idle");
  const [warpedImage, setWarpedImage] = useState<string | null>(null);
  const [cornersFound, setCornersFound] = useState(false);
  const [autoCapture, setAutoCapture] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("stg_omr_autocapture") !== "false";
  });
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const captureInProgressRef = useRef(false);
```

- [ ] **Step 3: Add the warp call function after `processOMR`**

After the closing brace of `processOMR` (around line 452), add:

```typescript
  async function callWarp(imageBase64: string): Promise<{ warped: string; cornersFound: boolean }> {
    try {
      const res = await fetch("/api/teacher/omr/warp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: imageBase64 }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) return { warped: imageBase64, cornersFound: false };
      if (!json.corners_found) toast.warning(json.warning || "Sudut kertas tidak dikesan");
      return { warped: json.warped_image_base64, cornersFound: !!json.corners_found };
    } catch {
      return { warped: imageBase64, cornersFound: false };
    }
  }

  async function handleCaptureAndWarp(rawImage: string, label: string) {
    if (captureInProgressRef.current) return;
    captureInProgressRef.current = true;
    setCapturedImage(rawImage);
    setImageSourceLabel(label);
    stopCamera();
    setScanFlowState("warping");
    try {
      const { warped, cornersFound: cf } = await callWarp(rawImage);
      setWarpedImage(warped);
      setCornersFound(cf);
      setScanFlowState("preview");
    } catch {
      toast.error("Gagal memproses imej");
      setScanFlowState("idle");
      setCapturedImage(null);
    } finally {
      captureInProgressRef.current = false;
    }
  }

  function confirmWarp() {
    if (!warpedImage) return;
    setCapturedImage(warpedImage);
    setScanFlowState("idle");
  }

  function retakeCapture() {
    setScanFlowState("idle");
    setCapturedImage(null);
    setWarpedImage(null);
    captureInProgressRef.current = false;
    startCamera();
  }

  function toggleAutoCapture() {
    setAutoCapture((prev) => {
      const next = !prev;
      localStorage.setItem("stg_omr_autocapture", String(next));
      return next;
    });
  }
```

- [ ] **Step 4: Replace the `captureImage` function**

Find and replace the existing `captureImage` function:

```typescript
  function captureImage() {
    if (!videoRef.current || !canvasRef.current) { toast.error("Kamera belum bersedia"); return; }
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");
    if (!video.videoWidth || !video.videoHeight) { toast.error("Tunggu pratonton kamera muncul dahulu"); return; }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const raw = canvas.toDataURL("image/png");
    handleCaptureAndWarp(raw, "Diambil melalui pratonton kamera");
  }
```

- [ ] **Step 5: Replace `handleFileChange` to route through warp**

Find and replace `handleFileChange`:

```typescript
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Sila pilih fail imej sahaja"); e.currentTarget.value = ""; return; }
    const isCameraFile = e.currentTarget === cameraInputRef.current;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) { toast.error("Gagal membaca fail imej"); return; }
      stopCamera();
      handleCaptureAndWarp(
        result,
        isCameraFile ? "Diambil melalui kamera telefon" : "Dimuat naik daripada fail"
      );
    };
    reader.onerror = () => { toast.error("Gagal membaca fail imej"); };
    reader.readAsDataURL(file);
    e.currentTarget.value = "";
  }
```

- [ ] **Step 6: Wire up `useDocumentDetection` hook**

Add this after the `stopCamera` declaration (after the `useCallback` for `stopCamera`):

```typescript
  const onStableCapture = useCallback(() => {
    if (!autoCapture || captureInProgressRef.current) return;
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) return;
    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const raw = canvas.toDataURL("image/png");
    handleCaptureAndWarp(raw, "Diambil automatik — kertas dikesan");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCapture]);

  const { detectionState } = useDocumentDetection({
    videoRef,
    overlayCanvasRef,
    enabled: isCameraActive && activeTab === "scan" && !capturedImage,
    onStable: onStableCapture,
  });
```

- [ ] **Step 7: Add overlay canvas + auto-capture toggle to the camera viewport JSX**

In the camera viewport section (the `<div className="relative bg-black ...">` block), add the overlay canvas and auto-capture toggle inside the `{!capturedImage ? (<>` block, right after the `<video>` element:

```tsx
                  {/* Detection overlay canvas */}
                  <canvas
                    ref={overlayCanvasRef}
                    className="pointer-events-none absolute inset-0 w-full h-full"
                  />

                  {/* Auto-capture toggle */}
                  {isCameraActive && (
                    <button
                      onClick={toggleAutoCapture}
                      className={`absolute top-3 right-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold shadow backdrop-blur-sm transition-colors ${
                        autoCapture
                          ? "bg-green-500/80 text-white"
                          : "bg-black/50 text-white/70"
                      }`}
                    >
                      {autoCapture ? <Zap className="h-3 w-3" /> : <ZapOff className="h-3 w-3" />}
                      {autoCapture ? "Auto" : "Manual"}
                    </button>
                  )}

                  {/* Detection state indicator */}
                  {isCameraActive && detectionState === "stable" && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-green-500/90 px-3 py-1 text-[11px] font-semibold text-white shadow">
                      Kertas dikesan ✓
                    </div>
                  )}
```

- [ ] **Step 8: Add warp preview overlay**

Replace the `{capturedImage ? (/* Captured image view */) : null}` section at the bottom of the camera panel with:

```tsx
              ) : scanFlowState === "warping" ? (
                /* Warping state */
                <div
                  className="flex flex-col items-center justify-center gap-3 bg-black"
                  style={{ minHeight: "min(70dvh, 520px)" }}
                >
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm font-medium text-white">Membetulkan perspektif...</p>
                </div>
              ) : scanFlowState === "preview" ? (
                /* Warp preview */
                <div className="relative" style={{ minHeight: "min(70dvh, 520px)" }}>
                  <Image
                    src={warpedImage ?? capturedImage ?? ""}
                    alt="Pratonton kertas OMR — perspektif dibetulkan"
                    width={955}
                    height={1280}
                    unoptimized
                    className="w-full object-contain bg-black"
                    style={{ maxHeight: "min(70dvh, 520px)" }}
                  />
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-semibold text-white shadow backdrop-blur-sm bg-black/60">
                    {cornersFound ? "Perspektif dibetulkan — sahkan?" : "Sudut tidak dikesan — guna imej asal"}
                  </div>
                  <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-3 pb-5 pt-10 bg-gradient-to-t from-black/70 to-transparent">
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                      onClick={retakeCapture}
                    >
                      <RotateCw className="mr-1.5 h-4 w-4" />
                      Ambil Semula
                    </Button>
                    <Button size="sm" onClick={confirmWarp} className="gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      Guna Imej Ini
                    </Button>
                  </div>
                </div>
              ) : (
```

> **Note:** This replaces the opening `{capturedImage ? (` condition. After the existing captured-image view closing `</div>`, add `)` to close the ternary properly.

- [ ] **Step 9: Add History link button in page header**

In the page header section (the `hidden md:flex` header div), add a button next to the heading:

```tsx
        <div className="flex items-center gap-3">
          <h1 className="!text-[36px] font-black leading-tight text-foreground">Pengimbas OMR</h1>
          <Button variant="outline" size="sm" onClick={() => router.push("/teacher/omr/history")} className="gap-1.5">
            <History className="h-4 w-4" />
            Sejarah Imbasan
          </Button>
        </div>
```

- [ ] **Step 10: Update grade result redirect to pass params in URL**

In `processOMR`, replace:
```typescript
      sessionStorage.setItem("stg_omr_last_result", JSON.stringify(json));
      toast.success("OMR berjaya diproses!");
      router.push("/teacher/omr/results");
```
With:
```typescript
      sessionStorage.setItem("stg_omr_last_result", JSON.stringify(json));
      toast.success("OMR berjaya diproses!");
      const params = new URLSearchParams({
        student_id,
        class_id,
        subject_id,
        exam_id,
      });
      router.push(`/teacher/omr/results?${params.toString()}`);
```

- [ ] **Step 11: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 12: Manually test the scan page**

```
npm run dev
```
1. Open `/teacher/omr` as a teacher.
2. Hold a piece of paper in front of camera — yellow dashed outline should appear around paper.
3. Hold still — outline turns green, page auto-captures after ~1.5s.
4. Warp preview screen shows corrected image.
5. "Guna Imej Ini" proceeds to details form.
6. "Ambil Semula" returns to camera.
7. Toggle "Auto" chip to "Manual" — auto-capture stops, manual button still works.

- [ ] **Step 13: Commit**

```bash
git add app/teacher/omr/page.tsx hooks/use-document-detection.ts
git commit -m "feat: add CamScanner-style document detection and warp preview to OMR scan page"
```

---

## Task 6: Fix Results Page — DB Source + Export

**Files:**
- Modify: `app/teacher/omr/results/page.tsx`
- Install: `xlsx` package

- [ ] **Step 1: Install xlsx**

```bash
npm install xlsx
```
Expected: `xlsx` appears in `dependencies` in `package.json`.

- [ ] **Step 2: Replace `app/teacher/omr/results/page.tsx` entirely**

```typescript
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardList, Download, Printer, XCircle } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type OMRResultRow = {
  question_no?: number | string;
  detected_option?: string | null;
  expected_option?: string | null;
  status?: string | null;
};

type OMRResultPayload = {
  total_questions?: number | string;
  correct?: number | string;
  wrong?: number | string;
  blank?: number | string;
  warning?: string;
  results?: OMRResultRow[];
  student_name?: string;
  exam_name?: string;
};

function toNumber(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getStatusMeta(status: string, detectedOption: string) {
  if (!detectedOption || status === "blank") {
    return { label: "Kosong", mark: 0, className: "border-slate-200 bg-slate-100 text-slate-700", icon: AlertTriangle };
  }
  if (status === "correct") {
    return { label: "Betul", mark: 1, className: "border-emerald-200 bg-emerald-100 text-emerald-700", icon: CheckCircle2 };
  }
  return { label: "Salah", mark: 0, className: "border-rose-200 bg-rose-100 text-rose-700", icon: XCircle };
}

function SummaryBadge({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <Badge variant="outline" className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${className}`}>
      {label}: {value}
    </Badge>
  );
}

export default function OMRResultsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resultRaw, setResultRaw] = useState<OMRResultPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem("stg_session");
    if (!raw) { router.replace("/login"); return; }
    try {
      const session = JSON.parse(raw) as { userType?: string; role?: string };
      const role = String(session.role ?? "").toLowerCase().trim();
      if (session.userType !== "teacher" || !new Set(["subject teacher", "subject coordinator"]).has(role)) {
        toast.error("Anda tidak dibenarkan akses halaman ini");
        router.replace(role === "subject coordinator" ? "/coordinator/dashboard" : "/teacher/dashboard");
        return;
      }
    } catch { router.replace("/login"); return; }

    const student_id = searchParams.get("student_id");
    const class_id = searchParams.get("class_id");
    const subject_id = searchParams.get("subject_id");
    const exam_id = searchParams.get("exam_id");

    if (student_id && class_id && subject_id && exam_id) {
      // Primary: fetch from DB
      const params = new URLSearchParams({ student_id, class_id, subject_id, exam_id });
      fetch(`/api/teacher/omr/result?${params.toString()}`)
        .then((r) => r.json())
        .then((json) => {
          if (json?.success) setResultRaw(json as OMRResultPayload);
          else {
            // Fallback to sessionStorage
            const stored = sessionStorage.getItem("stg_omr_last_result");
            setResultRaw(stored ? JSON.parse(stored) as OMRResultPayload : null);
          }
        })
        .catch(() => {
          const stored = sessionStorage.getItem("stg_omr_last_result");
          setResultRaw(stored ? JSON.parse(stored) as OMRResultPayload : null);
        })
        .finally(() => setLoading(false));
    } else {
      // Fallback: sessionStorage (no URL params — old flow)
      const stored = sessionStorage.getItem("stg_omr_last_result");
      setResultRaw(stored ? JSON.parse(stored) as OMRResultPayload : null);
      setLoading(false);
    }
  }, [router, searchParams]);

  const summary = useMemo(() => {
    const results = Array.isArray(resultRaw?.results) ? resultRaw!.results : [];
    const totalMarks = results.reduce((total, row) => {
      const status = String(row.status ?? "").toLowerCase();
      const detected = String(row.detected_option ?? "").trim();
      return total + getStatusMeta(status, detected).mark;
    }, 0);
    return {
      correct: toNumber(resultRaw?.correct),
      wrong: toNumber(resultRaw?.wrong),
      blank: toNumber(resultRaw?.blank),
      totalMarks,
      totalQuestions: toNumber(resultRaw?.total_questions) || results.length,
      warning: typeof resultRaw?.warning === "string" ? resultRaw.warning : "",
      results,
    };
  }, [resultRaw]);

  function exportExcel() {
    const rows = summary.results.map((row) => {
      const status = String(row.status ?? "").toLowerCase();
      const detected = String(row.detected_option ?? "").trim();
      const meta = getStatusMeta(status, detected);
      return {
        "No.": row.question_no,
        "Jawapan Pelajar": detected || "-",
        "Skema": String(row.expected_option ?? "").trim() || "-",
        "Status": meta.label,
        "Markah": meta.mark,
      };
    });
    rows.push({ "No.": "", "Jawapan Pelajar": `Betul: ${summary.correct}  Salah: ${summary.wrong}  Kosong: ${summary.blank}`, "Skema": "", "Status": "Jumlah", "Markah": summary.totalMarks } as never);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Keputusan OMR");
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `OMR_${date}.xlsx`);
  }

  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Keputusan OMR", 14, 16);
    doc.setFontSize(10);
    doc.text(`Betul: ${summary.correct}  Salah: ${summary.wrong}  Kosong: ${summary.blank}  Jumlah: ${summary.totalMarks}/${summary.totalQuestions}`, 14, 24);

    autoTable(doc, {
      startY: 30,
      head: [["No.", "Jawapan Pelajar", "Skema", "Status", "Markah"]],
      body: summary.results.map((row) => {
        const status = String(row.status ?? "").toLowerCase();
        const detected = String(row.detected_option ?? "").trim();
        const meta = getStatusMeta(status, detected);
        return [row.question_no, detected || "-", String(row.expected_option ?? "").trim() || "-", meta.label, meta.mark];
      }),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`OMR_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Memuatkan keputusan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-6 md:p-8">
      <div className="flex flex-col gap-1 border-b border-border/40 pb-6">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary">Guru</p>
        <h1 className="!text-[36px] font-black leading-tight text-foreground">Keputusan OMR</h1>
        <p className="mt-1 text-sm text-muted-foreground">Paparan keputusan imbasan OMR pelajar.</p>
      </div>

      <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border px-6 py-5">
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Keputusan OMR
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {resultRaw ? (
            <div className="mx-auto max-w-5xl space-y-4 text-sm">
              {summary.warning && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {summary.warning}
                </div>
              )}

              {summary.results.length > 0 ? (
                <div className="mx-auto overflow-hidden rounded-lg border border-border">
                  <Table className="w-full table-fixed">
                    <TableHeader className="bg-muted/30">
                      <TableRow className="border-b border-border hover:bg-transparent">
                        <TableHead className="w-[10%] py-4 text-center font-semibold text-foreground">#</TableHead>
                        <TableHead className="w-[25%] py-4 text-center font-semibold text-foreground">Jawapan Pelajar</TableHead>
                        <TableHead className="w-[20%] py-4 text-center font-semibold text-foreground">Skema</TableHead>
                        <TableHead className="w-[25%] py-4 text-center font-semibold text-foreground">Status</TableHead>
                        <TableHead className="w-[20%] py-4 text-center font-semibold text-foreground">Markah</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.results.map((row) => {
                        const status = String(row.status ?? "").toLowerCase();
                        const detected = String(row.detected_option ?? "").trim();
                        const expected = String(row.expected_option ?? "").trim();
                        const meta = getStatusMeta(status, detected);
                        const StatusIcon = meta.icon;
                        return (
                          <TableRow key={String(row.question_no ?? "")} className="border-b border-border transition-colors last:border-0 hover:bg-muted/50">
                            <TableCell className="py-4 text-center font-medium text-muted-foreground">{row.question_no}</TableCell>
                            <TableCell className="py-4 text-center font-semibold text-foreground">{detected || "-"}</TableCell>
                            <TableCell className="py-4 text-center font-semibold text-foreground">{expected || "-"}</TableCell>
                            <TableCell className="py-4 text-center">
                              <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold ${meta.className}`}>
                                <StatusIcon className="h-4 w-4" />
                                {meta.label}
                              </span>
                            </TableCell>
                            <TableCell className="py-4 text-center font-semibold text-foreground">{meta.mark}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground">Tiada data keputusan dijumpai.</p>
              )}

              <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <SummaryBadge label="Betul" value={summary.correct} className="border-emerald-200 bg-emerald-100 text-emerald-700" />
                  <SummaryBadge label="Salah" value={summary.wrong} className="border-rose-200 bg-rose-100 text-rose-700" />
                  <SummaryBadge label="Kosong" value={summary.blank} className="border-slate-200 bg-slate-100 text-slate-700" />
                </div>
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-5 py-3 text-right shadow-xs">
                  <div className="text-xs font-medium text-muted-foreground">Jumlah Markah</div>
                  <div className="text-2xl font-bold text-primary">{summary.totalMarks}/{summary.totalQuestions}</div>
                </div>
              </div>

              {/* Export row */}
              <div className="flex gap-3 print:hidden">
                <Button variant="outline" size="sm" onClick={exportExcel} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export Excel
                </Button>
                <Button variant="outline" size="sm" onClick={exportPDF} className="gap-2">
                  <Printer className="h-4 w-4" />
                  Export PDF
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Tiada keputusan OMR dijumpai. Sila buat imbasan dahulu.
            </p>
          )}

          <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push("/teacher/omr")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali ke OMR
              </Button>
              <Button variant="outline" onClick={() => router.push("/teacher/omr/history")}>
                <ClipboardList className="mr-2 h-4 w-4" />
                Sejarah Imbasan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Manually test export**

```
npm run dev
```
1. Complete an OMR scan — results page should load from DB (check Network tab: `GET /api/teacher/omr/result?student_id=...` returns 200).
2. Click "Export Excel" — `.xlsx` file downloads, opens in Excel with correct columns.
3. Click "Export PDF" — `.pdf` downloads with table and summary line.
4. Navigate directly to `/teacher/omr/results` (no params) — falls back to sessionStorage gracefully, shows "Tiada keputusan" if empty.

- [ ] **Step 5: Commit**

```bash
git add app/teacher/omr/results/page.tsx package.json package-lock.json
git commit -m "feat: fix results page to read from DB, add Excel and PDF export"
```

---

## Task 7: Add Print CSS

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add print styles to `app/globals.css`**

At the end of `app/globals.css`, add:

```css
@media print {
  /* Hide everything except the results card */
  header,
  nav,
  aside,
  footer,
  .print\:hidden {
    display: none !important;
  }

  body {
    background: white;
  }

  .card,
  [class*="card"] {
    box-shadow: none !important;
    border: 1px solid #e5e7eb !important;
  }

  table {
    page-break-inside: auto;
  }

  tr {
    page-break-inside: avoid;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/globals.css
git commit -m "style: add print CSS for OMR results page"
```

---

## Task 8: Scan History Page

**Files:**
- Create: `app/teacher/omr/history/page.tsx`

- [ ] **Step 1: Create `app/teacher/omr/history/page.tsx`**

```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Eye, RotateCw, ClipboardList, Loader2 } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ScanRow = {
  omr_scan_id: string;
  student_id: string;
  student_name: string;
  student_identifier: string;
  class_id: string;
  class_name: string;
  grade: number;
  subject_id: string;
  subject_name: string;
  exam_id: string;
  exam_name: string;
  scan_date: string;
  objective_total_mark: number;
};

type Exam = { id: string; name: string; year: string };
type Assignment = { id: string; class_id: string; class_name: string; subject_id: string; subject_name: string; grade: number | null };

function toId(v: unknown) {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

export default function OMRHistoryPage() {
  const router = useRouter();
  const [teacherId, setTeacherId] = useState("");
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filterExamId, setFilterExamId] = useState("all");
  const [filterAssignmentId, setFilterAssignmentId] = useState("all");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("stg_session");
    if (!raw) { router.replace("/login"); return; }
    try {
      const session = JSON.parse(raw) as { user_id?: string; userId?: string; id?: string; userType?: string; role?: string };
      const role = String(session.role ?? "").toLowerCase().trim();
      if (session.userType !== "teacher" || !new Set(["subject teacher", "subject coordinator"]).has(role)) {
        toast.error("Anda tidak dibenarkan akses halaman ini");
        router.replace("/teacher/dashboard");
        return;
      }
      setTeacherId(String(session.user_id ?? session.userId ?? session.id ?? "").trim());
    } catch { router.replace("/login"); }
  }, [router]);

  useEffect(() => {
    if (!teacherId) return;
    Promise.all([
      fetch("/api/teacher/exams").then((r) => r.json()),
      fetch(`/api/teacher/omr/assignments?teacher_id=${encodeURIComponent(teacherId)}&exam_id=all`).then((r) => r.json()).catch(() => ({ data: [] })),
    ]).then(([eJson, aJson]) => {
      setExams(Array.isArray(eJson?.data) ? eJson.data : []);
      setAssignments(Array.isArray(aJson?.data) ? aJson.data : []);
    });
  }, [teacherId]);

  useEffect(() => {
    if (!teacherId) return;
    setLoading(true);
    const params = new URLSearchParams();
    const assignment = assignments.find((a) => a.id === filterAssignmentId);
    if (filterExamId !== "all") params.set("exam_id", filterExamId);
    if (assignment?.class_id) params.set("class_id", assignment.class_id);
    if (assignment?.subject_id) params.set("subject_id", assignment.subject_id);

    fetch(`/api/teacher/omr/history?${params.toString()}`)
      .then((r) => r.json())
      .then((json) => setScans(Array.isArray(json?.data) ? json.data : []))
      .catch(() => { toast.error("Gagal memuatkan sejarah imbasan"); setScans([]); })
      .finally(() => setLoading(false));
  }, [teacherId, filterExamId, filterAssignmentId, assignments]);

  function viewResult(scan: ScanRow) {
    const params = new URLSearchParams({
      student_id: scan.student_id,
      class_id: scan.class_id,
      subject_id: scan.subject_id,
      exam_id: scan.exam_id,
    });
    router.push(`/teacher/omr/results?${params.toString()}`);
  }

  function rescan(scan: ScanRow) {
    localStorage.setItem("stg_marks_context", JSON.stringify({
      class_id: scan.class_id,
      subject_id: scan.subject_id,
      exam_id: scan.exam_id,
      student_id: scan.student_id,
    }));
    router.push("/teacher/omr");
  }

  return (
    <div className="flex flex-col gap-8 p-6 md:p-8">
      <div className="flex flex-col gap-1 border-b border-border/40 pb-6">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-primary">Guru Subjek</p>
        <h1 className="!text-[36px] font-black leading-tight text-foreground">Sejarah Imbasan OMR</h1>
        <p className="mt-1 text-sm text-muted-foreground">Semua imbasan OMR yang telah dijalankan.</p>
      </div>

      <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
              <ClipboardList className="h-5 w-5 text-primary" />
              Rekod Imbasan
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={filterExamId} onValueChange={setFilterExamId}>
                <SelectTrigger className="h-9 w-48 text-sm">
                  <SelectValue placeholder="Semua Peperiksaan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Peperiksaan</SelectItem>
                  {exams.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name} ({e.year})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterAssignmentId} onValueChange={setFilterAssignmentId}>
                <SelectTrigger className="h-9 w-52 text-sm">
                  <SelectValue placeholder="Semua Kelas/Subjek" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelas/Subjek</SelectItem>
                  {assignments.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.grade ?? "-"} {a.class_name} • {a.subject_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : scans.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Tiada rekod imbasan dijumpai.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="py-4 font-semibold text-foreground">Pelajar</TableHead>
                    <TableHead className="py-4 font-semibold text-foreground">Kelas</TableHead>
                    <TableHead className="py-4 font-semibold text-foreground">Subjek</TableHead>
                    <TableHead className="py-4 font-semibold text-foreground">Peperiksaan</TableHead>
                    <TableHead className="py-4 text-center font-semibold text-foreground">Markah</TableHead>
                    <TableHead className="py-4 font-semibold text-foreground">Tarikh</TableHead>
                    <TableHead className="py-4 text-center font-semibold text-foreground">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scans.map((scan) => (
                    <TableRow key={scan.omr_scan_id} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <TableCell className="py-3">
                        <div className="font-semibold text-foreground">{scan.student_name}</div>
                        <div className="text-xs text-muted-foreground">{scan.student_identifier}</div>
                      </TableCell>
                      <TableCell className="py-3 text-sm text-foreground">
                        {scan.grade} {scan.class_name}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-foreground">{scan.subject_name}</TableCell>
                      <TableCell className="py-3 text-sm text-foreground">{scan.exam_name}</TableCell>
                      <TableCell className="py-3 text-center font-bold text-primary">{scan.objective_total_mark}</TableCell>
                      <TableCell className="py-3 text-sm text-muted-foreground">
                        {(() => { try { return format(new Date(scan.scan_date), "dd/MM/yyyy HH:mm"); } catch { return scan.scan_date; } })()}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => viewResult(scan)} className="gap-1.5 h-8 text-xs">
                            <Eye className="h-3.5 w-3.5" />
                            Lihat
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => rescan(scan)} className="gap-1.5 h-8 text-xs">
                            <RotateCw className="h-3.5 w-3.5" />
                            Imbas Semula
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <Button variant="outline" onClick={() => router.push("/teacher/omr")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke OMR
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Manually test history page**

```
npm run dev
```
1. Open `/teacher/omr/history` as teacher.
2. Table shows past scans with student name, class, subject, exam, mark, date.
3. Filter by Exam — table filters correctly.
4. "Lihat" → opens results page with correct data loaded from DB.
5. "Imbas Semula" → opens `/teacher/omr` with context pre-filled (correct exam/class/student selected).

- [ ] **Step 4: Commit**

```bash
git add app/teacher/omr/history/page.tsx
git commit -m "feat: add OMR scan history page with filters and view/rescan actions"
```

---

## Self-Review Checklist

- [x] **Python `/warp` endpoint** → Task 1
- [x] **Next.js warp proxy** → Task 2
- [x] **Client edge detection + overlay** → Task 4 + Task 5 Steps 6–7
- [x] **Auto-capture toggle (localStorage persist)** → Task 5 Steps 2, 6
- [x] **Warp preview state (confirm / retake)** → Task 5 Steps 3, 8
- [x] **Warp failure = return original image** → Task 2 (never blocks scan)
- [x] **Results from DB via URL params** → Task 6
- [x] **sessionStorage fallback preserved** → Task 6
- [x] **Export Excel** → Task 6 (`xlsx`)
- [x] **Export PDF** → Task 6 (`jspdf`)
- [x] **Print CSS** → Task 7
- [x] **History page with filters** → Task 8
- [x] **"Lihat" links with correct params** → Task 8
- [x] **"Imbas Semula" pre-fills context** → Task 8
- [x] **Security: history filtered to teacher's classes** → Task 3
- [x] **Warp output 955×1280 matches SPM template** → Task 1
- [x] **`onStable` only fires when `autoCapture === true`** → Task 5 Step 6
- [x] **`captureInProgressRef` prevents double-fire** → Task 5 Steps 2, 6
