from __future__ import annotations

import base64
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field, model_validator

try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv() -> bool:
        return False

try:
    from jamaibase import JamAI, types as p
except ImportError:
    JamAI = None
    p = None

load_dotenv()

app = FastAPI(title="STG OMR Service", version="0.1.0")

JAMAI_PROJECT_ID = os.getenv("JAMAI_PROJECT_ID", "").strip()
JAMAI_PAT = os.getenv("JAMAI_PAT", "").strip()
JAMAI_REPORT_TABLE_ID = os.getenv("JAMAI_SYMPTOM_TABLE_ID", "std_report").strip() or "std_report"
JAMAI_TABLE_TYPE_ACTION = p.TableType.ACTION if p is not None else None
jamai_client = (
    JamAI(project_id=JAMAI_PROJECT_ID, token=JAMAI_PAT)
    if JamAI is not None and JAMAI_PROJECT_ID and JAMAI_PAT
    else None
)


class BubblePoint(BaseModel):
    x: int = Field(ge=0)
    y: int = Field(ge=0)
    r: int = Field(default=10, ge=3, le=40)


class QuestionTemplate(BaseModel):
    A: BubblePoint
    B: BubblePoint
    C: BubblePoint
    D: BubblePoint


class AnswerRegion(BaseModel):
    x: int = Field(ge=0)
    y: int = Field(ge=0)
    width: int = Field(ge=1)
    height: int = Field(ge=1)


class OMRGradeRequest(BaseModel):
    image_base64: str
    template_width: int = Field(default=1400, ge=800, le=4000)
    template_height: int = Field(default=2000, ge=800, le=5000)
    already_warped: bool = False
    processing_profile: str = "upload"
    corners: dict[str, list[int]] | None = None
    answer_region: AnswerRegion | None = None
    template: dict[str, QuestionTemplate]
    answer_key: dict[str, str]
    min_mark_threshold: float = Field(default=0.30, ge=0.05, le=0.95)
    ambiguity_gap: float = Field(default=0.06, ge=0.01, le=0.95)
    search_radius: int = Field(default=6, ge=0, le=40)

    @model_validator(mode="after")
    def check_coords_within_bounds(self) -> "OMRGradeRequest":
        for q_id, q in self.template.items():
            for option, pt in [("A", q.A), ("B", q.B), ("C", q.C), ("D", q.D)]:
                if pt.x >= self.template_width or pt.y >= self.template_height:
                    raise ValueError(
                        f"Q{q_id} option {option} coords ({pt.x},{pt.y}) exceed "
                        f"template size {self.template_width}x{self.template_height}"
                    )
        return self


class WarpRequest(BaseModel):
    image_base64: str


class WarpResponse(BaseModel):
    warped_image_base64: str
    corners_found: bool


class ReportCommentRequest(BaseModel):
    prompt_input: str = Field(min_length=2)


class ReportCommentResponse(BaseModel):
    ai_comment: str
    source: str


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


def _build_spm_80_template_bundle() -> dict[str, Any]:
    """
    Built-in preset for the SPM-style 80-question sheet shown in the app.

    Coordinates are defined in the canonical warped sheet space and assume:
    - sheet width = 955
    - sheet height = 1280
    - four answer columns
    - twenty questions per column
    """

    template_width = 955
    template_height = 1280

    answer_region = {
        "x": 350,
        "y": 300,
        "width": 580,
        "height": 900,
    }

    # Real SPM objective area layout from the provided sheet:
    # - left major column: 1..30
    # - middle major column: 31..60
    # - right major column: 61..80
    option_x = {
        0: {"A": 389, "B": 429, "C": 469, "D": 508},
        1: {"A": 592, "B": 633, "C": 673, "D": 713},
        2: {"A": 795, "B": 835, "C": 877, "D": 917},
    }
    base_y = [411, 432, 453, 475, 496]
    # The five-row groups are separated by roughly 135 px on the canonical
    # full-page SPM sheet. Larger offsets drift progressively onto the next
    # printed row, causing later marked answers to be reported as blank/wrong.
    group_offsets = [0, 135, 270, 405, 540, 675]
    row_y = [base_y[row] + group_offsets[group] for group in range(6) for row in range(5)]

    template: dict[str, Any] = {}
    answer_key: dict[str, str] = {}
    radius = 11

    for question_no in range(1, 81):
        if question_no <= 30:
            col = 0
            row = question_no - 1
        elif question_no <= 60:
            col = 1
            row = question_no - 31
        else:
            col = 2
            row = question_no - 61
        y = row_y[row]
        template[str(question_no)] = {
            opt: {"x": x, "y": y, "r": radius}
            for opt, x in option_x[col].items()
        }
        answer_key[str(question_no)] = "A"

    return {
        "template_width": template_width,
        "template_height": template_height,
        "answer_region": answer_region,
        "template": template,
        "answer_key": answer_key,
    }


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
    # Local dev convenience: prefer a checked-in JSON file, but fall back to the
    # built-in SPM preset so the service still works out of the box.
    path = Path(__file__).with_name("template.sample.json")
    try:
        bundle = json.loads(path.read_text(encoding="utf-8"))
        template = bundle.get("template")
        if isinstance(template, dict) and len(template) >= 80:
            return bundle
        return _build_spm_80_template_bundle()
    except FileNotFoundError as exc:
        return _build_spm_80_template_bundle()
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


def _validate_quad(pts: np.ndarray, image_shape: tuple[int, int]) -> bool:
    """Reject degenerate quads that cannot represent an OMR sheet."""
    img_h, img_w = image_shape
    img_area = float(img_h * img_w)
    area = float(cv2.contourArea(pts.reshape(-1, 1, 2).astype(np.float32)))
    if area < img_area * 0.10:
        return False
    x, y, w, h = cv2.boundingRect(pts.astype(np.int32))
    # Reject near-degenerate aspect ratios (e.g. a vertical/horizontal stripe)
    if max(w, h) / max(min(w, h), 1) > 5.0:
        return False

    ordered = _order_points(pts.astype(np.float32))
    top_width = float(np.linalg.norm(ordered.top_right - ordered.top_left))
    bottom_width = float(np.linalg.norm(ordered.bottom_right - ordered.bottom_left))
    left_height = float(np.linalg.norm(ordered.bottom_left - ordered.top_left))
    right_height = float(np.linalg.norm(ordered.bottom_right - ordered.top_right))
    average_width = (top_width + bottom_width) / 2.0
    average_height = (left_height + right_height) / 2.0
    sheet_ratio = average_width / max(average_height, 1.0)

    # This preset only supports portrait SPM/A4-style sheets. Without this gate,
    # the large form border below the page heading can be mistaken for the paper
    # edge, shifting every answer bubble after the perspective warp.
    if not 0.55 <= sheet_ratio <= 0.82:
        return False
    return True


def _check_warp_quality(warped: np.ndarray, min_std: float = 8.0) -> bool:
    """Return False when warped image has near-zero contrast (degenerate transform)."""
    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY) if warped.ndim == 3 else warped
    return float(gray.std()) >= min_std


def _largest_quad_from_contours(
    contours: list[np.ndarray],
    image_shape: tuple[int, int],
) -> np.ndarray | None:
    """
    Return the best quadrilateral candidate for the sheet border.

    A thick border becomes a *stroke* after thresholding so its contour area
    can be small even though it spans most of the image. Score by bounding-rect area.
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
        if score < img_area * 0.10:
            continue

        hull = cv2.convexHull(contour)
        peri = cv2.arcLength(hull, True)
        approx = cv2.approxPolyDP(hull, 0.02 * peri, True)

        if len(approx) == 4:
            best = approx.reshape(4, 2).astype(np.float32)
            best_score = score
            continue

        rect = cv2.minAreaRect(hull)
        box = cv2.boxPoints(rect).astype(np.float32)
        best = box
        best_score = score

    return best


def _find_sheet_corners(image: np.ndarray) -> OrderedCorners:
    """
    Detect sheet border as a quadrilateral using a 4-strategy cascade.

    Order: CLAHE+Otsu → adaptive threshold → relaxed Canny → full-frame fallback.
    Each candidate is validated so a degenerate (stripe) warp cannot pass through.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # CLAHE improves contrast across varied lighting before thresholding.
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    blur = cv2.GaussianBlur(enhanced, (5, 5), 0)

    try:
        bright = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
        bright = cv2.morphologyEx(bright, cv2.MORPH_CLOSE, np.ones((13, 13), np.uint8), iterations=2)
        bright = cv2.morphologyEx(bright, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8), iterations=1)
        contours, _ = cv2.findContours(bright, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        page = _largest_quad_from_contours(contours, gray.shape)
        if page is not None and _validate_quad(page, gray.shape):
            return _order_points(page)
    except Exception:
        pass

    # 1) Otsu inverse on CLAHE image — best for thick black borders.
    try:
        thr = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
        thr = cv2.morphologyEx(thr, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8), iterations=2)
        contours, _ = cv2.findContours(thr, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        page = _largest_quad_from_contours(contours, gray.shape)
        if page is not None and _validate_quad(page, gray.shape):
            return _order_points(page)
    except Exception:
        pass

    # 2) Adaptive threshold — handles uneven / side lighting.
    try:
        adp = cv2.adaptiveThreshold(
            blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 21, 10
        )
        adp = cv2.morphologyEx(adp, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8), iterations=3)
        adp = cv2.morphologyEx(adp, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8), iterations=1)
        contours, _ = cv2.findContours(adp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        page = _largest_quad_from_contours(contours, gray.shape)
        if page is not None and _validate_quad(page, gray.shape):
            return _order_points(page)
    except Exception:
        pass

    # 3) Canny edge detection with relaxed thresholds.
    try:
        edges = cv2.Canny(blur, 30, 90)
        edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8), iterations=2)
        contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        page = _largest_quad_from_contours(contours, gray.shape)
        if page is not None and _validate_quad(page, gray.shape):
            return _order_points(page)
    except Exception:
        pass

    # 4) Full-frame fallback — when the sheet fills the entire camera frame.
    h, w = gray.shape
    margin = int(min(h, w) * 0.01)
    fallback = np.array(
        [
            [margin, margin],
            [w - margin, margin],
            [w - margin, h - margin],
            [margin, h - margin],
        ],
        dtype=np.float32,
    )
    return _order_points(fallback)


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

    inner_pixels = roi_blur[inner_mask]
    bg_pixels = roi_blur[bg_mask]
    inner_mean = float(inner_pixels.mean())  # 0..255
    bg_mean = float(bg_pixels.mean())  # 0..255
    if bg_mean <= 1.0:
        return 0.0

    # Empty circles still have a printed outline. Count how much of the inner area is
    # meaningfully darker than the nearby paper, then combine that with mean contrast.
    local_dark_threshold = max(0.0, bg_mean - max(18.0, bg_mean * 0.12))
    dark_fraction = float((inner_pixels < local_dark_threshold).mean())
    contrast_ratio = (bg_mean - inner_mean) / bg_mean

    score = (contrast_ratio * 0.6) + (dark_fraction * 0.4)
    return float(max(0.0, min(1.0, score)))


def _best_fill_ratio_near(gray: np.ndarray, center: BubblePoint, search_radius: int) -> float:
    """
    Phone photos often warp close enough for the sheet border to align, but leave
    individual bubbles shifted by a few pixels. Probe a small grid around the
    expected bubble center and keep the strongest fill score.
    """
    radius = max(0, int(search_radius))
    if radius == 0:
        return _fill_ratio(gray, center)

    step = max(2, min(6, int(round(center.r * 0.45))))
    offsets = [(0, 0)]
    for distance in range(step, radius + 1, step):
        offsets.extend(
            [
                (-distance, 0),
                (distance, 0),
                (0, -distance),
                (0, distance),
                (-distance, -distance),
                (distance, -distance),
                (-distance, distance),
                (distance, distance),
            ]
        )

    best = 0.0
    for dx, dy in offsets:
        shifted = BubblePoint(x=center.x + dx, y=center.y + dy, r=center.r)
        best = max(best, _fill_ratio(gray, shifted))
    return best


def _aligned_option_ratios(
    gray: np.ndarray,
    question: QuestionTemplate,
    search_radius: int,
) -> dict[str, float]:
    """
    Find one shared local offset for the whole answer row.

    Searching each option independently can make A/B/C/D drift onto nearby text
    or printed lines. A shared offset follows the physical row and keeps the four
    option scores comparable.
    """
    radius = max(0, int(search_radius))
    step = 2
    offsets = [(0, 0)]
    for dy in range(-radius, radius + 1, step):
        for dx in range(-radius, radius + 1, step):
            if dx or dy:
                offsets.append((dx, dy))

    best_ratios: dict[str, float] = {}
    best_score = float("-inf")
    for dx, dy in offsets:
        ratios = {
            option: _fill_ratio(
                gray,
                BubblePoint(x=point.x + dx, y=point.y + dy, r=point.r),
            )
            for option, point in [
                ("A", question.A),
                ("B", question.B),
                ("C", question.C),
                ("D", question.D),
            ]
        }
        ranked = sorted(ratios.values(), reverse=True)
        # Prefer an offset with one clearly marked option, while slightly
        # rewarding overall contrast to handle light pencil marks.
        score = (ranked[0] - ranked[1]) + (ranked[0] * 0.12)
        if score > best_score:
            best_score = score
            best_ratios = ratios

    return best_ratios


def _apply_answer_region_mask(gray: np.ndarray, region: AnswerRegion | None) -> np.ndarray:
    if region is None:
        return gray

    x0 = max(0, int(region.x))
    y0 = max(0, int(region.y))
    x1 = min(gray.shape[1], x0 + int(region.width))
    y1 = min(gray.shape[0], y0 + int(region.height))

    if x0 >= x1 or y0 >= y1:
        return gray

    masked = np.full_like(gray, 255)
    masked[y0:y1, x0:x1] = gray[y0:y1, x0:x1]
    return masked


_DEBUG_FILES = ["warped.png", "template-overlay.png"]


def _write_debug_images(
    warped: np.ndarray,
    template: dict[str, QuestionTemplate],
    answer_region: AnswerRegion | None,
) -> None:
    if os.getenv("OMR_DEBUG", "").strip() not in {"1", "true", "TRUE", "yes", "YES"}:
        return

    try:
        debug_dir = Path(__file__).parent / "debug"
        debug_dir.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(debug_dir / "warped.png"), warped)

        overlay = warped.copy()
        if answer_region is not None:
            x0 = int(answer_region.x)
            y0 = int(answer_region.y)
            x1 = x0 + int(answer_region.width)
            y1 = y0 + int(answer_region.height)
            cv2.rectangle(overlay, (x0, y0), (x1, y1), (255, 128, 0), 2)

        for question in template.values():
            for option in [question.A, question.B, question.C, question.D]:
                cv2.circle(overlay, (int(option.x), int(option.y)), int(option.r), (0, 0, 255), 1)
                cv2.circle(overlay, (int(option.x), int(option.y)), 2, (0, 255, 255), -1)

        cv2.imwrite(str(debug_dir / "template-overlay.png"), overlay)
    except Exception as exc:
        print(f"Failed to write OMR debug images: {exc}")


def _cleanup_debug_images() -> None:
    if os.getenv("OMR_DEBUG", "").strip() in {"1", "true", "TRUE", "yes", "YES"}:
        return
    try:
        debug_dir = Path(__file__).parent / "debug"
        for name in _DEBUG_FILES:
            p = debug_dir / name
            if p.exists():
                p.unlink(missing_ok=True)
    except Exception:
        pass


def _remove_shadow(gray: np.ndarray) -> np.ndarray:
    """
    Normalize uneven lighting and shadows using morphological background estimation.

    Dilating with a large kernel fills in the dark filled bubbles, leaving a smooth
    map of the paper's background illumination. Dividing each pixel by that map
    equalizes shadow gradients across the sheet before bubble fill measurement.
    """
    ksize = max(41, (min(gray.shape) // 20) | 1)  # odd; ~5 % of smallest dimension
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (ksize, ksize))
    background = cv2.morphologyEx(gray, cv2.MORPH_DILATE, kernel)
    norm = np.clip(
        (gray.astype(np.float32) / (background.astype(np.float32) + 1.0)) * 255.0,
        0,
        255,
    ).astype(np.uint8)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return clahe.apply(norm)


def _suppress_red_ink(bgr: np.ndarray) -> np.ndarray:
    """
    Set red-hued pixels (printed circle outlines on SPM answer sheets) to white
    so they don't interfere with pencil-fill detection after binarization.

    In HSV (OpenCV 0-180 hue scale), red ink wraps around 0/180.  Pencil graphite
    is near-neutral (low saturation) so the saturation gate (S >= 50) keeps it.
    A 3×3 dilation of the mask covers antialiased outline edges after JPEG
    compression or JPEG re-encoding from the perspective warp.
    """
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    mask_lo = cv2.inRange(hsv, np.array([0, 100, 80]), np.array([10, 255, 255]))
    mask_hi = cv2.inRange(hsv, np.array([170, 100, 80]), np.array([180, 255, 255]))
    red_mask = cv2.bitwise_or(mask_lo, mask_hi)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    red_mask = cv2.dilate(red_mask, kernel, iterations=1)
    out = bgr.copy()
    out[red_mask > 0] = (255, 255, 255)
    return out


def _binarize_fills(gray: np.ndarray) -> np.ndarray:
    """
    After shadow removal (background ≈ white), adaptively binarize so any pencil
    mark — light or heavy — becomes solid black (0) and paper stays white (255).

    blockSize must be odd and large enough to span several bubble spacings so the
    local mean is dominated by background, not by the bubble being thresholded.
    At 955px wide with ~40px bubble pitch, 101px captures ~2.5 spacings → reliable
    background estimate regardless of pencil pressure.
    """
    return cv2.adaptiveThreshold(
        gray,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,   # paper → 255 (bright), marks → 0 (dark)
        blockSize=101,
        C=12,
    )


def _normalize_option(value: str | None) -> str | None:
    if value is None:
        return None
    upper = value.strip().upper()
    return upper if upper in {"A", "B", "C", "D"} else None


def _extract_column_text(columns: dict[str, Any], name: str) -> str | None:
    value = columns.get(name)
    if value is None:
        return None
    if hasattr(value, "text"):
        text = str(value.text).strip()
        return text or None
    text = str(value).strip()
    return text or None


def _generate_report_comment_fallback(prompt_input: str) -> str:
    """
    Fallback generator when JamAI is not configured.
    Produces a short Bahasa Melayu comment (roughly 2 sentences) using the JSON payload.
    """
    try:
        payload = json.loads(prompt_input)
    except Exception:
        return (
            "Teruskan usaha dalam pembelajaran. Kenal pasti topik yang lemah dan buat ulang kaji secara konsisten."
        )

    student = payload.get("student") or {}
    performance = payload.get("performance") or {}

    average_mark = performance.get("average_mark")
    class_position = performance.get("class_position")
    total_students = performance.get("total_students_in_class")
    strongest = performance.get("strongest_subject")
    weakest = performance.get("weakest_subject")

    name = str(student.get("full_name") or "").strip()
    prefix = f"{name} " if name else ""

    # Sentence 1: performance summary
    perf_bits: list[str] = []
    if isinstance(average_mark, (int, float)):
        perf_bits.append(f"purata {average_mark:.1f}%")
    if isinstance(class_position, int) and class_position > 0 and isinstance(total_students, int) and total_students > 0:
        perf_bits.append(f"kedudukan {class_position}/{total_students}")

    if perf_bits:
        sentence1 = f"{prefix}Tahniah, prestasi menunjukkan {', '.join(perf_bits)}."
    else:
        sentence1 = f"{prefix}Tahniah atas usaha yang ditunjukkan dalam peperiksaan ini."

    # Sentence 2: strengths + focus
    focus_bits: list[str] = []
    if strongest and str(strongest).strip():
        focus_bits.append(f"kekalkan kekuatan dalam {str(strongest).strip()}")
    if weakest and str(weakest).strip():
        focus_bits.append(f"tingkatkan penguasaan {str(weakest).strip()} dengan latihan tambahan")

    if focus_bits:
        sentence2 = " ".join([focus_bits[0].capitalize() + ".", *(b.capitalize() + "." for b in focus_bits[1:])])
        # Ensure exactly one sentence if both exist by merging.
        sentence2 = sentence2.replace("..", ".")
    else:
        sentence2 = "Teruskan ulang kaji secara konsisten dan beri tumpuan kepada topik yang masih lemah."

    comment = f"{sentence1} {sentence2}".strip()
    return comment


def _generate_report_comment(prompt_input: str) -> str:
    if jamai_client is None or p is None or JAMAI_TABLE_TYPE_ACTION is None:
        return _generate_report_comment_fallback(prompt_input)

    try:
        response = jamai_client.table.add_table_rows(
            table_type=JAMAI_TABLE_TYPE_ACTION,
            request=p.RowAddRequest(
                table_id=JAMAI_REPORT_TABLE_ID,
                data=[{"prompt_input": prompt_input}],
                stream=False,
            ),
        )
        result = response[0] if isinstance(response, tuple) else response
        if not getattr(result, "rows", None):
            raise HTTPException(status_code=502, detail="JamAI returned no rows")

        row = result.rows[0]
        columns = getattr(row, "columns", {}) or {}
        ai_comment = _extract_column_text(columns, "ai_comment")
        if not ai_comment:
            raise HTTPException(status_code=502, detail="JamAI response missing ai_comment")
        return ai_comment
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"JamAI request failed: {exc}") from exc


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/report-comment", response_model=ReportCommentResponse)
def report_comment(req: ReportCommentRequest) -> Any:
    ai_comment = _generate_report_comment(req.prompt_input.strip())
    source = "jamai" if jamai_client is not None and p is not None and JAMAI_TABLE_TYPE_ACTION is not None else "fallback"
    return ReportCommentResponse(ai_comment=ai_comment, source=source)


@app.get("/template/spm-80")
def spm_80_template() -> dict[str, Any]:
    return _build_spm_80_template_bundle()


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
      <input type="number" name="min_mark_threshold" value="0.30" step="0.01" min="0.05" max="0.95" />

      <label>Ambiguity Gap</label>
      <input type="number" name="ambiguity_gap" value="0.06" step="0.01" min="0.01" max="0.95" />

      <label>Search Radius</label>
      <input type="number" name="search_radius" value="12" step="1" min="0" max="40" />

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
    min_mark_threshold: float = Form(default=0.32),
    ambiguity_gap: float = Form(default=0.08),
    search_radius: int = Form(default=6),
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
            search_radius=int(search_radius),
        )
    except KeyError as exc:
        raise HTTPException(
            status_code=400,
            detail="Template bundle must contain template and answer_key",
        ) from exc

    return grade(req)


@app.post("/warp", response_model=WarpResponse)
def warp(req: WarpRequest) -> Any:
    image = _decode_base64_image(req.image_base64)
    corners = _find_sheet_corners(image)

    # Determine whether the corner finder actually found a real quad or fell back
    # to the full-frame fallback (which means no paper was detected).
    h, w = image.shape[:2]
    margin = int(min(h, w) * 0.01)
    fallback_pts = {(margin, margin), (w - margin, margin), (w - margin, h - margin), (margin, h - margin)}
    detected_pts = {
        tuple(corners.top_left.astype(int).tolist()),
        tuple(corners.top_right.astype(int).tolist()),
        tuple(corners.bottom_right.astype(int).tolist()),
        tuple(corners.bottom_left.astype(int).tolist()),
    }
    corners_found = detected_pts != fallback_pts

    warped = _warp_sheet(image, corners, 955, 1280)

    ok, buf = cv2.imencode(".jpg", warped, [cv2.IMWRITE_JPEG_QUALITY, 92])
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to encode warped image")

    warped_b64 = "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode("ascii")
    return WarpResponse(warped_image_base64=warped_b64, corners_found=corners_found)


@app.post("/grade", response_model=OMRGradeResponse)
def grade(req: OMRGradeRequest) -> Any:
    image = _decode_base64_image(req.image_base64)

    if req.already_warped:
        warped = cv2.resize(image, (req.template_width, req.template_height), interpolation=cv2.INTER_AREA)
    elif req.corners:
        try:
            ordered = OrderedCorners(
                top_left=np.array(req.corners["top_left"], dtype=np.float32),
                top_right=np.array(req.corners["top_right"], dtype=np.float32),
                bottom_right=np.array(req.corners["bottom_right"], dtype=np.float32),
                bottom_left=np.array(req.corners["bottom_left"], dtype=np.float32),
            )
        except Exception as exc:
            raise HTTPException(status_code=400, detail="Invalid corners payload") from exc
        warped = _warp_sheet(image, ordered, req.template_width, req.template_height)
    else:
        ordered = _find_sheet_corners(image)
        warped = _warp_sheet(image, ordered, req.template_width, req.template_height)
    if not _check_warp_quality(warped):
        raise HTTPException(
            status_code=422,
            detail=(
                "Sheet alignment failed: warped image has insufficient contrast. "
                "Ensure the full sheet border is visible, lighting is even, and "
                "the sheet is not heavily folded or glare-affected."
            ),
        )
    _write_debug_images(warped, req.template, req.answer_region)
    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    gray = _remove_shadow(gray)
    gray = _apply_answer_region_mask(gray, req.answer_region)

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
        is_camera_profile = req.processing_profile == "camera"
        effective_search_radius = (
            0 if is_camera_profile and req.already_warped else req.search_radius
        )
        ratios = _aligned_option_ratios(gray, q_template, effective_search_radius)
        ranked = sorted(ratios.items(), key=lambda item: item[1], reverse=True)
        best_opt, best_val = ranked[0]
        second_val = ranked[1][1]
        gap = best_val - second_val
        min_mark_threshold = (
            min(req.min_mark_threshold, 0.20)
            if is_camera_profile
            else req.min_mark_threshold
        )
        ambiguity_gap = (
            min(req.ambiguity_gap, 0.025)
            if is_camera_profile
            else req.ambiguity_gap
        )

        expected = _normalize_option(req.answer_key.get(qid))
        status = "wrong"
        detected: str | None = None

        if best_val < min_mark_threshold:
            status = "blank"
            blank += 1
        elif gap < ambiguity_gap:
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

        confidence = max(0.0, min(1.0, gap / max(ambiguity_gap, 1e-6)))
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
    _cleanup_debug_images()
    return OMRGradeResponse(
        total_questions=total,
        correct=correct,
        wrong=wrong,
        blank=blank,
        ambiguous=ambiguous,
        score_percent=score_percent,
        results=results,
    )
