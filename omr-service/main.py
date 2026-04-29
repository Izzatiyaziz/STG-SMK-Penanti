from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from fastapi.responses import HTMLResponse


app = FastAPI(title="STG OMR Service", version="0.1.0")


class BubblePoint(BaseModel):
    x: int
    y: int
    r: int = Field(default=10, ge=3, le=40)


class QuestionTemplate(BaseModel):
    A: BubblePoint
    B: BubblePoint
    C: BubblePoint
    D: BubblePoint


class OMRGradeRequest(BaseModel):
    image_base64: str
    template_width: int = Field(default=1400, ge=800, le=4000)
    template_height: int = Field(default=2000, ge=800, le=5000)
    corners: dict[str, list[int]] | None = None
    template: dict[str, QuestionTemplate]
    answer_key: dict[str, str]
    min_mark_threshold: float = Field(default=0.36, ge=0.05, le=0.95)
    ambiguity_gap: float = Field(default=0.10, ge=0.01, le=0.95)


class QuestionResult(BaseModel):
    question_no: int
    detected_option: str | None
    expected_option: str | None
    status: str
    confidence: float
    ratios: dict[str, float]


class OMRGradeResponse(BaseModel):
    total_questions: int
    correct: int
    wrong: int
    blank: int
    ambiguous: int
    score_percent: float
    results: list[QuestionResult]


@dataclass
class OrderedCorners:
    top_left: np.ndarray
    top_right: np.ndarray
    bottom_right: np.ndarray
    bottom_left: np.ndarray


def _decode_base64_image(image_b64: str) -> np.ndarray:
    payload = image_b64.split(",", 1)[1] if "," in image_b64 else image_b64
    try:
        binary = base64.b64decode(payload)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid base64 image") from exc

    arr = np.frombuffer(binary, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Unable to decode image")
    return image


def _decode_image_bytes(binary: bytes) -> np.ndarray:
    arr = np.frombuffer(binary, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Unable to decode image")
    return image


def _load_default_template_bundle() -> dict[str, Any]:
    # Local dev convenience: allow testing without manually crafting JSON payloads.
    path = Path(__file__).with_name("template.sample.json")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=500,
            detail="template.sample.json not found on server",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="template.sample.json is invalid JSON",
        ) from exc


def _order_points(pts: np.ndarray) -> OrderedCorners:
    s = pts.sum(axis=1)
    diff = np.diff(pts, axis=1)
    return OrderedCorners(
        top_left=pts[np.argmin(s)],
        bottom_right=pts[np.argmax(s)],
        top_right=pts[np.argmin(diff)],
        bottom_left=pts[np.argmax(diff)],
    )


def _find_sheet_corners(image: np.ndarray) -> OrderedCorners:
    """
    Try to detect the sheet/border as a quadrilateral.

    We first try a robust "dark border" approach (thresholding) which works well
    with thick black borders. If that fails, we fall back to an edge-based method.
    """

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5, 5), 0)

    def _largest_quad_from_contours(
        contours: list[np.ndarray],
        image_shape: tuple[int, int],
    ) -> np.ndarray | None:
        """
        Return the best quadrilateral candidate for the sheet border.

        Important: a thick border often becomes a *stroke* after thresholding,
        meaning its contour area can be small even though it spans most of the image.
        Because of that, we score contours by their *bounding rectangle area*.
        """

        if not contours:
            return None

        img_h, img_w = image_shape
        img_area = float(img_h * img_w)

        best: np.ndarray | None = None
        best_score = 0.0

        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            score = float(w * h)
            if score <= best_score:
                continue

            # Ignore tiny candidates.
            if score < img_area * 0.10:
                continue

            # Use convex hull, then approximate to 4 points.
            hull = cv2.convexHull(contour)
            peri = cv2.arcLength(hull, True)
            approx = cv2.approxPolyDP(hull, 0.02 * peri, True)

            if len(approx) == 4:
                best = approx.reshape(4, 2).astype(np.float32)
                best_score = score
                continue

            # Fallback: a rotated bounding box (always 4 points).
            rect = cv2.minAreaRect(hull)
            box = cv2.boxPoints(rect).astype(np.float32)
            best = box
            best_score = score

        return best

    # 1) Border-first: threshold dark pixels (great for thick black borders)
    try:
        thr = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
        thr = cv2.morphologyEx(
            thr,
            cv2.MORPH_CLOSE,
            np.ones((7, 7), np.uint8),
            iterations=2,
        )
        contours, _ = cv2.findContours(thr, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        page = _largest_quad_from_contours(contours, gray.shape)
        if page is not None:
            return _order_points(page)
    except Exception:
        pass

    # 2) Fallback: edge-based (works if thresholding is noisy)
    edges = cv2.Canny(blur, 60, 180)
    edges = cv2.morphologyEx(
        edges,
        cv2.MORPH_CLOSE,
        np.ones((5, 5), np.uint8),
        iterations=1,
    )
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    page = _largest_quad_from_contours(contours, gray.shape)

    if page is None:
        raise HTTPException(status_code=422, detail="Sheet contour not found")
    return _order_points(page)


def _warp_sheet(
    image: np.ndarray,
    corners: OrderedCorners,
    width: int,
    height: int,
) -> np.ndarray:
    src = np.array(
        [
            corners.top_left,
            corners.top_right,
            corners.bottom_right,
            corners.bottom_left,
        ],
        dtype=np.float32,
    )
    dst = np.array(
        [[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]],
        dtype=np.float32,
    )
    matrix = cv2.getPerspectiveTransform(src, dst)
    return cv2.warpPerspective(image, matrix, (width, height))


def _fill_ratio(gray: np.ndarray, center: BubblePoint) -> float:
    # Use a larger ROI than the bubble radius so we can sample background outside the printed circle.
    roi_radius = int(round(center.r * 1.60))
    x0 = max(0, center.x - roi_radius)
    y0 = max(0, center.y - roi_radius)
    x1 = min(gray.shape[1], center.x + roi_radius)
    y1 = min(gray.shape[0], center.y + roi_radius)
    roi = gray[y0:y1, x0:x1]
    if roi.size == 0:
        return 0.0

    # Measure "fill" as contrast between inner bubble region and a surrounding ring.
    # This is more stable across lighting than raw thresholding, and reduces false positives
    # from printed outlines.
    roi_blur = cv2.GaussianBlur(roi, (3, 3), 0)

    h, w = roi_blur.shape
    yy, xx = np.ogrid[:h, :w]
    # Bubble center relative to ROI (handles clipping at edges).
    cy = float(center.y - y0)
    cx = float(center.x - x0)
    dist2 = (xx - cx) ** 2 + (yy - cy) ** 2

    # Inner region: only the "fillable" part of the bubble.
    inner_r = float(center.r) * 0.55
    # Background ring: sample paper *outside* the printed bubble to avoid the outline.
    bg_r1 = float(center.r) * 1.25
    bg_r2 = float(center.r) * 1.55

    inner_mask = dist2 <= inner_r**2
    bg_mask = (dist2 >= bg_r1**2) & (dist2 <= bg_r2**2)

    if inner_mask.sum() == 0 or bg_mask.sum() == 0:
        return 0.0

    inner_mean = float(roi_blur[inner_mask].mean())  # 0..255
    bg_mean = float(roi_blur[bg_mask].mean())  # 0..255
    if bg_mean <= 1.0:
        return 0.0

    # 0 = same brightness as surrounding ring (empty), 1 = very dark (filled).
    ratio = (bg_mean - inner_mean) / bg_mean
    return float(max(0.0, min(1.0, ratio)))


def _normalize_option(value: str | None) -> str | None:
    if value is None:
        return None
    upper = value.strip().upper()
    return upper if upper in {"A", "B", "C", "D"} else None


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/demo", response_class=HTMLResponse)
def demo() -> str:
    # Minimal upload UI for manual testing.
    return """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>STG OMR Demo</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; margin: 24px; }
    .box { max-width: 860px; }
    label { display: block; margin: 12px 0 6px; font-weight: 600; }
    input[type="text"], input[type="number"], textarea { width: 100%; padding: 10px; }
    textarea { min-height: 180px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    button { margin-top: 14px; padding: 10px 14px; }
    .hint { color: #444; font-size: 13px; margin-top: 6px; }
    code { background: #f3f3f3; padding: 2px 6px; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="box">
    <h1>STG OMR Demo</h1>
    <p>Upload a scanned/photo sheet image and (optionally) a template bundle JSON.</p>
    <p class="hint">If you don't provide template JSON, the server will use <code>template.sample.json</code>.</p>
    <form method="post" action="/grade-file" enctype="multipart/form-data">
      <label>Sheet Image</label>
      <input type="file" name="image" accept="image/*" required />

      <label>Template Bundle JSON (optional)</label>
      <textarea name="template_json" placeholder='{"template_width":1400,"template_height":2000,"template":{...},"answer_key":{...}}'></textarea>

      <label>Min Mark Threshold</label>
      <input type="number" name="min_mark_threshold" value="0.36" step="0.01" min="0.05" max="0.95" />

      <label>Ambiguity Gap</label>
      <input type="number" name="ambiguity_gap" value="0.10" step="0.01" min="0.01" max="0.95" />

      <button type="submit">Grade</button>
    </form>
    <p class="hint">You can also use Swagger UI at <code>/docs</code>.</p>
  </div>
</body>
</html>"""


@app.post("/grade-file", response_model=OMRGradeResponse)
async def grade_file(
    image: UploadFile = File(...),
    template_json: str | None = Form(default=None),
    min_mark_threshold: float = Form(default=0.36),
    ambiguity_gap: float = Form(default=0.10),
) -> Any:
    binary = await image.read()
    # Validate early that the uploaded payload is actually an image OpenCV can decode.
    _decode_image_bytes(binary)

    if template_json and template_json.strip():
        try:
            bundle = json.loads(template_json)
        except Exception as exc:
            raise HTTPException(status_code=400, detail="Invalid template_json") from exc
    else:
        bundle = _load_default_template_bundle()

    # Build a regular /grade request to reuse the same logic/validation.
    try:
        req = OMRGradeRequest(
            image_base64=base64.b64encode(binary).decode("ascii"),
            template_width=int(bundle.get("template_width", 1400)),
            template_height=int(bundle.get("template_height", 2000)),
            template=bundle["template"],
            answer_key=bundle["answer_key"],
            min_mark_threshold=float(min_mark_threshold),
            ambiguity_gap=float(ambiguity_gap),
        )
    except KeyError as exc:
        raise HTTPException(
            status_code=400,
            detail="Template bundle must contain template and answer_key",
        ) from exc

    return grade(req)


@app.post("/grade", response_model=OMRGradeResponse)
def grade(req: OMRGradeRequest) -> Any:
    image = _decode_base64_image(req.image_base64)

    if req.corners:
        try:
            ordered = OrderedCorners(
                top_left=np.array(req.corners["top_left"], dtype=np.float32),
                top_right=np.array(req.corners["top_right"], dtype=np.float32),
                bottom_right=np.array(req.corners["bottom_right"], dtype=np.float32),
                bottom_left=np.array(req.corners["bottom_left"], dtype=np.float32),
            )
        except Exception as exc:
            raise HTTPException(status_code=400, detail="Invalid corners payload") from exc
    else:
        ordered = _find_sheet_corners(image)

    warped = _warp_sheet(image, ordered, req.template_width, req.template_height)
    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)

    total = 0
    correct = 0
    wrong = 0
    blank = 0
    ambiguous = 0
    results: list[QuestionResult] = []

    question_ids = sorted(req.template.keys(), key=lambda q: int(q))
    for qid in question_ids:
        total += 1
        q_template = req.template[qid]
        ratios = {
            "A": _fill_ratio(gray, q_template.A),
            "B": _fill_ratio(gray, q_template.B),
            "C": _fill_ratio(gray, q_template.C),
            "D": _fill_ratio(gray, q_template.D),
        }
        ranked = sorted(ratios.items(), key=lambda item: item[1], reverse=True)
        best_opt, best_val = ranked[0]
        second_val = ranked[1][1]
        gap = best_val - second_val

        expected = _normalize_option(req.answer_key.get(qid))
        status = "wrong"
        detected: str | None = None

        if best_val < req.min_mark_threshold:
            status = "blank"
            blank += 1
        elif gap < req.ambiguity_gap:
            status = "ambiguous"
            ambiguous += 1
        else:
            detected = best_opt
            if detected == expected:
                status = "correct"
                correct += 1
            else:
                wrong += 1

        if status in {"blank", "ambiguous"} and expected:
            # keep wrong count as explicit marked wrong only
            pass

        confidence = max(0.0, min(1.0, gap / max(req.ambiguity_gap, 1e-6)))
        results.append(
            QuestionResult(
                question_no=int(qid),
                detected_option=detected,
                expected_option=expected,
                status=status,
                confidence=float(round(confidence, 4)),
                ratios={k: float(round(v, 4)) for k, v in ratios.items()},
            )
        )

    score_percent = float(round((correct / total) * 100, 2)) if total else 0.0
    return OMRGradeResponse(
        total_questions=total,
        correct=correct,
        wrong=wrong,
        blank=blank,
        ambiguous=ambiguous,
        score_percent=score_percent,
        results=results,
    )
